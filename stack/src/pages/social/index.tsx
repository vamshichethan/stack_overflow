import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Mainlayout from "@/layout/Mainlayout";
import { useAuth } from "@/lib/AuthContext";
import axiosInstance from "@/lib/axiosinstance";
import {
  Check,
  Image,
  MessageCircle,
  Share2,
  ThumbsUp,
  Trash2,
  UserPlus,
  UserX,
  Video,
  X,
} from "lucide-react";
import Link from "next/link";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "react-toastify";

const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);
const maxFileSizeBytes = 25 * 1024 * 1024;

const getInitials = (name = "") =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "U";

const formatDate = (date: string) =>
  new Date(date).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

export default function SocialPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [hasMounted, setHasMounted] = useState(false);
  const [posts, setPosts] = useState<any[]>([]);
  const [people, setPeople] = useState<any[]>([]);
  const [friendCount, setFriendCount] = useState(0);
  const [postText, setPostText] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>(
    {}
  );
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [posting, setPosting] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const currentUser = hasMounted ? user : null;

  const canPostToday = useMemo(() => {
    if (!currentUser) return false;
    if (friendCount === 0) return false;
    if (friendCount > 10) return true;
    return true;
  }, [currentUser, friendCount]);

  const fetchPosts = async () => {
    setLoadingPosts(true);

    try {
      const response = await axiosInstance.get("/social/posts");
      setPosts(response.data.data || []);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Unable to load posts");
    } finally {
      setLoadingPosts(false);
    }
  };

  const fetchPeople = async () => {
    if (!currentUser) {
      setPeople([]);
      setFriendCount(0);
      return;
    }

    setLoadingPeople(true);

    try {
      const response = await axiosInstance.get("/social/people");
      setPeople(response.data.data?.people || []);
      setFriendCount(response.data.data?.friendCount || 0);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Unable to load people");
    } finally {
      setLoadingPeople(false);
    }
  };

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (hasMounted) {
      fetchPeople();
    }
  }, [hasMounted, user]);

  const handleFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    if (files.length > 4) {
      toast.error("You can upload up to 4 media files per post.");
      event.target.value = "";
      return;
    }

    const invalidFile = files.find(
      (file) =>
        !allowedMimeTypes.has(file.type) || file.size > maxFileSizeBytes
    );

    if (invalidFile) {
      toast.error("Use JPG, PNG, WEBP, GIF, MP4, WEBM, or MOV under 25MB.");
      event.target.value = "";
      return;
    }

    setSelectedFiles(files);
  };

  const clearPostForm = () => {
    setPostText("");
    setSelectedFiles([]);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCreatePost = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage("");

    if (!currentUser) {
      toast.error(t("language.loginRequired"));
      return;
    }

    if (!postText.trim() && selectedFiles.length === 0) {
      toast.error("Add text, a photo, or a video before posting.");
      return;
    }

    const formData = new FormData();
    formData.append("text", postText);
    selectedFiles.forEach((file) => formData.append("media", file));
    setPosting(true);

    try {
      const response = await axiosInstance.post("/social/posts", formData);
      setPosts((currentPosts) => [response.data.data, ...currentPosts]);
      clearPostForm();
      toast.success(t("social.postPublished"));
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || "Unable to create post";
      setMessage(errorMessage);
      toast.warn(errorMessage);
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (postId: string) => {
    if (!currentUser) {
      toast.error(t("social.loginToInteract"));
      return;
    }

    try {
      const response = await axiosInstance.patch(`/social/posts/${postId}/like`);
      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post._id === postId
            ? {
                ...post,
                likeCount: response.data.data.likeCount,
                likedByCurrentUser: response.data.data.liked,
              }
            : post
        )
      );
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Unable to update like");
    }
  };

  const handleComment = async (
    event: React.FormEvent<HTMLFormElement>,
    postId: string
  ) => {
    event.preventDefault();

    if (!currentUser) {
      toast.error(t("social.loginToComment"));
      return;
    }

    const text = commentDrafts[postId]?.trim();

    if (!text) {
      return;
    }

    try {
      const response = await axiosInstance.post(
        `/social/posts/${postId}/comments`,
        { text }
      );
      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post._id === postId
            ? {
                ...post,
                comments: [...post.comments, response.data.data.comment],
                commentCount: response.data.data.commentCount,
              }
            : post
        )
      );
      setCommentDrafts((drafts) => ({ ...drafts, [postId]: "" }));
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Unable to add comment");
    }
  };

  const handleShare = async (postId: string) => {
    if (!currentUser) {
      toast.error(t("social.loginToInteract"));
      return;
    }

    try {
      const response = await axiosInstance.post(`/social/posts/${postId}/share`);
      const shareUrl = `${window.location.origin}/social?post=${postId}`;

      if (navigator.clipboard) {
        try {
          await navigator.clipboard.writeText(shareUrl);
        } catch (clipboardError) {
          console.log(clipboardError);
        }
      }

      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post._id === postId
            ? { ...post, shareCount: response.data.data.shareCount }
            : post
        )
      );
      toast.success(t("social.postLinkCopied"));
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Unable to share post");
    }
  };

  const refreshSocialState = async () => {
    await Promise.all([fetchPeople(), fetchPosts()]);
  };

  const handleSendRequest = async (recipientId: string) => {
    try {
      await axiosInstance.post("/social/friends/request", { recipientId });
      toast.success(t("social.friendRequestSent"));
      refreshSocialState();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Unable to send request");
    }
  };

  const handleRespondRequest = async (
    requestId: string,
    action: "accept" | "reject"
  ) => {
    try {
      await axiosInstance.patch(`/social/friends/request/${requestId}`, {
        action,
      });
      toast.success(
        action === "accept"
          ? t("social.friendAdded")
          : t("social.requestRejected")
      );
      refreshSocialState();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Unable to update request");
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      await axiosInstance.delete(`/social/friends/${friendId}`);
      toast.success(t("social.friendRemoved"));
      refreshSocialState();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Unable to remove friend");
    }
  };

  const renderFriendAction = (person: any) => {
    if (person.relationshipStatus === "friend") {
      return (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="bg-white text-gray-700"
          onClick={() => handleRemoveFriend(person._id)}
        >
          <Trash2 className="w-4 h-4" />
          {t("common.remove")}
        </Button>
      );
    }

    if (person.relationshipStatus === "request-sent") {
      return (
        <Button type="button" size="sm" variant="outline" disabled>
          {t("common.sent")}
        </Button>
      );
    }

    if (person.relationshipStatus === "request-received") {
      return (
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => handleRespondRequest(person.requestId, "accept")}
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="bg-white text-gray-700"
            onClick={() => handleRespondRequest(person.requestId, "reject")}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      );
    }

    return (
      <Button
        type="button"
        size="sm"
        className="bg-blue-600 hover:bg-blue-700"
        onClick={() => handleSendRequest(person._id)}
      >
        <UserPlus className="w-4 h-4" />
        {t("common.add")}
      </Button>
    );
  };

  return (
    <Mainlayout>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row gap-6">
          <div className="flex-1 min-w-0 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl lg:text-2xl font-semibold text-gray-800">
                  {t("social.title")}
                </h1>
                <p className="text-sm text-gray-600">
                  {posts.length}{" "}
                  {posts.length === 1
                    ? t("social.publicPost")
                    : t("social.publicPosts")}
                </p>
              </div>
              {hasMounted && !currentUser && (
                <Link
                  href="/auth"
                  className="text-sm font-medium text-blue-600 hover:underline"
                >
                  {t("social.loginToInteract")}
                </Link>
              )}
            </div>

            {currentUser && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {t("social.postAs", { name: currentUser.name })}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleCreatePost} className="space-y-4">
                    <Textarea
                      value={postText}
                      onChange={(event) => setPostText(event.target.value)}
                      placeholder={t("social.sharePlaceholder")}
                      className="min-h-28"
                    />

                    <div className="space-y-2">
                      <Label htmlFor="media" className="text-sm">
                        {t("social.photoOrVideo")}
                      </Label>
                      <Input
                        ref={fileInputRef}
                        id="media"
                        type="file"
                        accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
                        multiple
                        onChange={handleFilesChange}
                      />
                      {selectedFiles.length > 0 && (
                        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
                          {selectedFiles.map((file) => (
                            <span
                              key={`${file.name}-${file.size}`}
                              className="rounded border border-gray-200 px-2 py-1"
                            >
                              {file.type.startsWith("video/") ? (
                                <Video className="mr-1 inline h-3 w-3" />
                              ) : (
                                <Image className="mr-1 inline h-3 w-3" />
                              )}
                              {file.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    {message && (
                      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                        {message}
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <p className="text-sm text-gray-600">
                        Friends: {friendCount}
                      </p>
                      <Button
                        type="submit"
                        disabled={posting || !canPostToday}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        {posting ? t("common.loading") : t("common.post")}
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {loadingPosts ? (
              <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
            ) : posts.length === 0 ? (
              <div className="rounded-md border border-gray-200 bg-white p-6 text-center text-sm text-gray-600">
                {t("social.noPosts")}
              </div>
            ) : (
              posts.map((post) => (
                <Card key={post._id}>
                  <CardContent className="space-y-4 pt-6">
                    <div className="flex items-center gap-3">
                      <Link href={`/users/${post.author._id}`}>
                        <Avatar className="w-10 h-10">
                          <AvatarFallback>
                            {getInitials(post.author.name)}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="min-w-0">
                        <Link
                          href={`/users/${post.author._id}`}
                          className="font-semibold text-blue-600 hover:text-blue-800"
                        >
                          {post.author.name}
                        </Link>
                        <p className="text-xs text-gray-500">
                          {formatDate(post.createdAt)}
                        </p>
                      </div>
                    </div>

                    {post.text && (
                      <p className="whitespace-pre-line text-sm leading-relaxed text-gray-800">
                        {post.text}
                      </p>
                    )}

                    {post.media?.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {post.media.map((media: any) =>
                          media.type === "video" ? (
                            <video
                              key={media.url}
                              src={media.url}
                              controls
                              className="w-full rounded-md border border-gray-200 bg-black"
                            />
                          ) : (
                            <img
                              key={media.url}
                              src={media.url}
                              alt=""
                              className="w-full rounded-md border border-gray-200 object-cover"
                            />
                          )
                        )}
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-2 border-t border-b border-gray-100 py-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className={
                          post.likedByCurrentUser
                            ? "text-blue-600"
                            : "text-gray-700"
                        }
                        onClick={() => handleLike(post._id)}
                      >
                        <ThumbsUp className="w-4 h-4" />
                        {post.likeCount}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-gray-700"
                      >
                        <MessageCircle className="w-4 h-4" />
                        {post.commentCount}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-gray-700"
                        onClick={() => handleShare(post._id)}
                      >
                        <Share2 className="w-4 h-4" />
                        {post.shareCount}
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {post.comments.map((comment: any) => (
                        <div
                          key={comment._id}
                          className="flex items-start gap-2 text-sm"
                        >
                          <Avatar className="w-7 h-7">
                            <AvatarFallback className="text-xs">
                              {getInitials(comment.author.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1 rounded-md bg-gray-50 px-3 py-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium text-gray-800">
                                {comment.author.name}
                              </span>
                              <span className="text-xs text-gray-500">
                                {formatDate(comment.createdAt)}
                              </span>
                            </div>
                            <p className="whitespace-pre-line text-gray-700">
                              {comment.text}
                            </p>
                          </div>
                        </div>
                      ))}

                      <form
                        onSubmit={(event) => handleComment(event, post._id)}
                        className="flex gap-2"
                      >
                        <Input
                          value={commentDrafts[post._id] || ""}
                          onChange={(event) =>
                            setCommentDrafts((drafts) => ({
                              ...drafts,
                              [post._id]: event.target.value,
                            }))
                          }
                          placeholder={
                            currentUser
                              ? t("social.writeComment")
                              : t("social.loginToComment")
                          }
                          disabled={!currentUser}
                        />
                        <Button
                          type="submit"
                          disabled={
                            !currentUser || !commentDrafts[post._id]?.trim()
                          }
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          {t("common.send")}
                        </Button>
                      </form>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          <aside className="w-full lg:w-80 space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("social.people")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {hasMounted && !currentUser ? (
                  <Link
                    href="/auth"
                    className="text-sm font-medium text-blue-600 hover:underline"
                  >
                    {t("social.loginToAddFriends")}
                  </Link>
                ) : !hasMounted ? (
                  <p className="text-sm text-gray-600">{t("common.loading")}</p>
                ) : loadingPeople ? (
                  <p className="text-sm text-gray-600">{t("common.loading")}</p>
                ) : people.length === 0 ? (
                  <p className="text-sm text-gray-600">{t("social.noPeople")}</p>
                ) : (
                  people.map((person) => (
                    <div
                      key={person._id}
                      className="flex items-center justify-between gap-3 border-b border-gray-100 pb-3 last:border-0 last:pb-0"
                    >
                      <Link
                        href={`/users/${person._id}`}
                        className="flex min-w-0 items-center gap-2"
                      >
                        <Avatar className="w-9 h-9">
                          <AvatarFallback>
                            {getInitials(person.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-blue-600">
                            {person.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {person.friendsCount} {t("common.friends")}
                          </p>
                        </div>
                      </Link>
                      {renderFriendAction(person)}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>

            {currentUser && friendCount === 0 && (
              <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                {t("social.noFriendsWarning")}
              </div>
            )}

            {currentUser && friendCount > 0 && friendCount <= 10 && (
              <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
                {t("social.dailyPostLimit", { count: friendCount })}
              </div>
            )}

            {currentUser && friendCount > 10 && (
              <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
                {t("social.unlimitedPosting")}
              </div>
            )}

            {currentUser && people.length === 0 && !loadingPeople && (
              <div className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
                <UserX className="mr-1 inline h-4 w-4" />
                {t("social.noFriendActions")}
              </div>
            )}
          </aside>
        </div>
      </div>
    </Mainlayout>
  );
}
