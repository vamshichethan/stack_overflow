import mongoose from "mongoose";

const socialLikeSchema = mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SocialPost",
    required: true,
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  createdAt: { type: Date, default: Date.now },
});

socialLikeSchema.index({ post: 1, user: 1 }, { unique: true });

export default mongoose.model("SocialLike", socialLikeSchema);
