import mongoose from "mongoose";

const socialShareSchema = mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SocialPost",
    required: true,
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  createdAt: { type: Date, default: Date.now },
});

socialShareSchema.index({ post: 1, createdAt: -1 });

export default mongoose.model("SocialShare", socialShareSchema);
