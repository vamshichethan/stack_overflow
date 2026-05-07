import mongoose from "mongoose";
import FriendRequest from "../models/friendRequest.js";
import SocialComment from "../models/socialComment.js";
import SocialLike from "../models/socialLike.js";
import SocialPost from "../models/socialPost.js";
import SocialShare from "../models/socialShare.js";
import User from "../models/auth.js";

const NO_FRIENDS_MESSAGE =
  "You need at least one friend to post on the public page.";
const DAILY_LIMIT_MESSAGE =
  "Daily posting limit reached. Add more friends to increase your posting limit.";

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const getMediaType = (mimetype) =>
  mimetype.startsWith("video/") ? "video" : "image";

const getMediaUrl = (req, filename) =>
  `${req.protocol}://${req.get("host")}/uploads/social/${filename}`;

const toId = (value) => String(value?._id || value);

const formatUser = (user) => ({
  _id: user?._id,
  name: user?.name || "Unknown user",
  email: user?.email || "",
  about: user?.about || "",
  tags: user?.tags || [],
  joinDate: user?.joinDate,
  friendsCount: user?.friends?.length || 0,
});

const countByPost = (documents) =>
  documents.reduce((acc, document) => {
    const postId = toId(document.post || document._id);
    acc[postId] = (acc[postId] || 0) + (document.count || 1);
    return acc;
  }, {});

const formatComment = (comment) => ({
  _id: comment._id,
  text: comment.text,
  createdAt: comment.createdAt,
  author: formatUser(comment.author),
});

const decoratePosts = async (posts, viewerId) => {
  const postIds = posts.map((post) => post._id);
  const viewerIdString = String(viewerId || "");

  const [likes, comments, shares] = await Promise.all([
    SocialLike.find({ post: { $in: postIds } }),
    SocialComment.find({ post: { $in: postIds } })
      .populate("author", "name email about tags joinDate friends")
      .sort({ createdAt: 1 }),
    SocialShare.aggregate([
      { $match: { post: { $in: postIds } } },
      { $group: { _id: "$post", count: { $sum: 1 } } },
    ]),
  ]);

  const likeCounts = countByPost(likes);
  const shareCounts = shares.reduce((acc, share) => {
    acc[String(share._id)] = share.count;
    return acc;
  }, {});
  const commentsByPost = comments.reduce((acc, comment) => {
    const postId = toId(comment.post);
    acc[postId] = [...(acc[postId] || []), formatComment(comment)];
    return acc;
  }, {});
  const likedPostIds = new Set(
    likes
      .filter((like) => toId(like.user) === viewerIdString)
      .map((like) => toId(like.post))
  );

  return posts.map((post) => {
    const postId = toId(post._id);

    return {
      _id: post._id,
      text: post.text,
      media: post.media,
      createdAt: post.createdAt,
      author: formatUser(post.author),
      likeCount: likeCounts[postId] || 0,
      commentCount: commentsByPost[postId]?.length || 0,
      shareCount: shareCounts[postId] || 0,
      likedByCurrentUser: likedPostIds.has(postId),
      comments: commentsByPost[postId] || [],
    };
  });
};

const getPostWithCounts = async (postId, viewerId) => {
  const post = await SocialPost.findById(postId).populate(
    "author",
    "name email about tags joinDate friends"
  );

  if (!post) {
    return null;
  }

  const [decoratedPost] = await decoratePosts([post], viewerId);
  return decoratedPost;
};

export const createPost = async (req, res) => {
  const text = typeof req.body.text === "string" ? req.body.text.trim() : "";
  const files = req.files || [];

  if (!text && files.length === 0) {
    return res
      .status(400)
      .json({ message: "Add text, a photo, or a video before posting." });
  }

  if (text.length > 2000) {
    return res
      .status(400)
      .json({ message: "Post text must be 2000 characters or fewer." });
  }

  try {
    const media = files.map((file) => ({
      url: getMediaUrl(req, file.filename),
      type: getMediaType(file.mimetype),
      filename: file.filename,
      mimetype: file.mimetype,
      size: file.size,
    }));

    const post = await SocialPost.create({
      author: req.userid,
      text,
      media,
    });
    const decoratedPost = await getPostWithCounts(post._id, req.userid);

    return res.status(201).json({
      data: decoratedPost,
      limit: req.socialPostingLimit || null,
    });
  } catch (error) {
    console.error("Create social post error:", error);
    return res.status(500).json({ message: "Unable to create post." });
  }
};

export const getPublicPosts = async (req, res) => {
  try {
    const posts = await SocialPost.find()
      .populate("author", "name email about tags joinDate friends")
      .sort({ createdAt: -1 });
    const decoratedPosts = await decoratePosts(posts, req.userid);

    return res.status(200).json({ data: decoratedPosts });
  } catch (error) {
    console.error("Fetch social posts error:", error);
    return res.status(500).json({ message: "Unable to fetch posts." });
  }
};

export const toggleLikePost = async (req, res) => {
  const { id: postId } = req.params;

  if (!isValidObjectId(postId)) {
    return res.status(400).json({ message: "Post unavailable" });
  }

  try {
    const postExists = await SocialPost.exists({ _id: postId });

    if (!postExists) {
      return res.status(404).json({ message: "Post not found" });
    }

    const existingLike = await SocialLike.findOneAndDelete({
      post: postId,
      user: req.userid,
    });
    const liked = !existingLike;

    if (liked) {
      try {
        await SocialLike.create({ post: postId, user: req.userid });
      } catch (error) {
        if (error.code !== 11000) {
          throw error;
        }
      }
    }

    const likeCount = await SocialLike.countDocuments({ post: postId });

    return res.status(200).json({
      data: {
        postId,
        liked,
        likeCount,
      },
    });
  } catch (error) {
    console.error("Like social post error:", error);
    return res.status(500).json({ message: "Unable to update like." });
  }
};

export const addComment = async (req, res) => {
  const { id: postId } = req.params;
  const text = typeof req.body.text === "string" ? req.body.text.trim() : "";

  if (!isValidObjectId(postId)) {
    return res.status(400).json({ message: "Post unavailable" });
  }

  if (!text) {
    return res.status(400).json({ message: "Comment cannot be empty." });
  }

  if (text.length > 1000) {
    return res
      .status(400)
      .json({ message: "Comment must be 1000 characters or fewer." });
  }

  try {
    const postExists = await SocialPost.exists({ _id: postId });

    if (!postExists) {
      return res.status(404).json({ message: "Post not found" });
    }

    const comment = await SocialComment.create({
      post: postId,
      author: req.userid,
      text,
    });
    const populatedComment = await SocialComment.findById(comment._id).populate(
      "author",
      "name email about tags joinDate friends"
    );
    const commentCount = await SocialComment.countDocuments({ post: postId });

    return res.status(201).json({
      data: {
        comment: formatComment(populatedComment),
        commentCount,
      },
    });
  } catch (error) {
    console.error("Comment social post error:", error);
    return res.status(500).json({ message: "Unable to add comment." });
  }
};

export const sharePost = async (req, res) => {
  const { id: postId } = req.params;

  if (!isValidObjectId(postId)) {
    return res.status(400).json({ message: "Post unavailable" });
  }

  try {
    const postExists = await SocialPost.exists({ _id: postId });

    if (!postExists) {
      return res.status(404).json({ message: "Post not found" });
    }

    await SocialShare.create({ post: postId, user: req.userid });
    const shareCount = await SocialShare.countDocuments({ post: postId });

    return res.status(201).json({
      data: {
        postId,
        shareCount,
      },
      message: "Post shared",
    });
  } catch (error) {
    console.error("Share social post error:", error);
    return res.status(500).json({ message: "Unable to share post." });
  }
};

export const getPeople = async (req, res) => {
  try {
    const [currentUser, users, requests] = await Promise.all([
      User.findById(req.userid).select("friends"),
      User.find({ _id: { $ne: req.userid } })
        .select("name email about tags joinDate friends")
        .sort({ name: 1 }),
      FriendRequest.find({
        status: "pending",
        $or: [{ requester: req.userid }, { recipient: req.userid }],
      }),
    ]);

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const friendIds = new Set((currentUser.friends || []).map(toId));

    const people = users.map((person) => {
      const personId = toId(person._id);
      const pendingRequest = requests.find(
        (request) =>
          [toId(request.requester), toId(request.recipient)].includes(
            personId
          )
      );
      let relationshipStatus = "none";

      if (friendIds.has(personId)) {
        relationshipStatus = "friend";
      } else if (pendingRequest) {
        relationshipStatus =
          toId(pendingRequest.requester) === String(req.userid)
            ? "request-sent"
            : "request-received";
      }

      return {
        ...formatUser(person),
        relationshipStatus,
        requestId: pendingRequest?._id || null,
      };
    });

    return res.status(200).json({
      data: {
        people,
        friendCount: friendIds.size,
      },
    });
  } catch (error) {
    console.error("Fetch people error:", error);
    return res.status(500).json({ message: "Unable to fetch people." });
  }
};

export const sendFriendRequest = async (req, res) => {
  const { recipientId } = req.body;

  if (!isValidObjectId(recipientId)) {
    return res.status(400).json({ message: "User unavailable" });
  }

  if (String(recipientId) === String(req.userid)) {
    return res
      .status(400)
      .json({ message: "You cannot send a friend request to yourself." });
  }

  try {
    const [currentUser, recipient] = await Promise.all([
      User.findById(req.userid).select("friends"),
      User.findById(recipientId).select("_id"),
    ]);

    if (!currentUser || !recipient) {
      return res.status(404).json({ message: "User not found" });
    }

    if ((currentUser.friends || []).map(toId).includes(String(recipientId))) {
      return res.status(409).json({ message: "You are already friends." });
    }

    const reversePendingRequest = await FriendRequest.findOne({
      requester: recipientId,
      recipient: req.userid,
      status: "pending",
    });

    if (reversePendingRequest) {
      return res.status(409).json({
        message: "This user already sent you a friend request.",
      });
    }

    const existingRequest = await FriendRequest.findOne({
      requester: req.userid,
      recipient: recipientId,
    });

    if (existingRequest?.status === "pending") {
      return res.status(409).json({ message: "Friend request already sent." });
    }

    if (existingRequest) {
      existingRequest.status = "pending";
      await existingRequest.save();
      return res.status(200).json({ data: existingRequest });
    }

    const friendRequest = await FriendRequest.create({
      requester: req.userid,
      recipient: recipientId,
    });

    return res.status(201).json({ data: friendRequest });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: "Friend request already exists." });
    }

    console.error("Send friend request error:", error);
    return res.status(500).json({ message: "Unable to send friend request." });
  }
};

export const respondToFriendRequest = async (req, res) => {
  const { requestId } = req.params;
  const { action } = req.body;

  if (!isValidObjectId(requestId)) {
    return res.status(400).json({ message: "Friend request unavailable" });
  }

  if (!["accept", "reject"].includes(action)) {
    return res.status(400).json({ message: "Invalid friend request action." });
  }

  try {
    const friendRequest = await FriendRequest.findOne({
      _id: requestId,
      recipient: req.userid,
      status: "pending",
    });

    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found." });
    }

    friendRequest.status = action === "accept" ? "accepted" : "rejected";
    await friendRequest.save();

    if (action === "accept") {
      await Promise.all([
        User.findByIdAndUpdate(friendRequest.requester, {
          $addToSet: { friends: friendRequest.recipient },
        }),
        User.findByIdAndUpdate(friendRequest.recipient, {
          $addToSet: { friends: friendRequest.requester },
        }),
      ]);
    }

    return res.status(200).json({ data: friendRequest });
  } catch (error) {
    console.error("Respond friend request error:", error);
    return res
      .status(500)
      .json({ message: "Unable to update friend request." });
  }
};

export const removeFriend = async (req, res) => {
  const { friendId } = req.params;

  if (!isValidObjectId(friendId)) {
    return res.status(400).json({ message: "User unavailable" });
  }

  if (String(friendId) === String(req.userid)) {
    return res.status(400).json({ message: "Invalid friend selection." });
  }

  try {
    await Promise.all([
      User.findByIdAndUpdate(req.userid, { $pull: { friends: friendId } }),
      User.findByIdAndUpdate(friendId, { $pull: { friends: req.userid } }),
      FriendRequest.updateMany(
        {
          $or: [
            { requester: req.userid, recipient: friendId },
            { requester: friendId, recipient: req.userid },
          ],
        },
        { $set: { status: "rejected", updatedAt: new Date() } }
      ),
    ]);

    return res.status(200).json({ message: "Friend removed." });
  } catch (error) {
    console.error("Remove friend error:", error);
    return res.status(500).json({ message: "Unable to remove friend." });
  }
};

export const getSocialMessages = (_req, res) =>
  res.status(200).json({
    data: {
      noFriendsMessage: NO_FRIENDS_MESSAGE,
      dailyLimitMessage: DAILY_LIMIT_MESSAGE,
    },
  });
