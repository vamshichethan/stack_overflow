import express from "express";
import {
  addComment,
  createPost,
  getPeople,
  getPublicPosts,
  getSocialMessages,
  removeFriend,
  respondToFriendRequest,
  sendFriendRequest,
  sharePost,
  toggleLikePost,
} from "../controller/social.js";
import auth from "../middleware/auth.js";
import checkSocialPostLimit from "../middleware/checkSocialPostLimit.js";
import optionalAuth from "../middleware/optionalAuth.js";
import {
  handleUploadErrors,
  socialMediaUpload,
} from "../middleware/socialUpload.js";

const router = express.Router();

router.get("/posts", optionalAuth, getPublicPosts);
router.get("/messages", getSocialMessages);
router.post(
  "/posts",
  auth,
  checkSocialPostLimit,
  socialMediaUpload.array("media", 4),
  handleUploadErrors,
  createPost
);
router.patch("/posts/:id/like", auth, toggleLikePost);
router.post("/posts/:id/comments", auth, addComment);
router.post("/posts/:id/share", auth, sharePost);
router.get("/people", auth, getPeople);
router.post("/friends/request", auth, sendFriendRequest);
router.patch("/friends/request/:requestId", auth, respondToFriendRequest);
router.delete("/friends/:friendId", auth, removeFriend);

export default router;
