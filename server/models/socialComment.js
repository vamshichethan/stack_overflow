import mongoose from "mongoose";

const socialCommentSchema = mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "SocialPost",
    required: true,
  },
  author: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  text: { type: String, trim: true, maxlength: 1000, required: true },
  createdAt: { type: Date, default: Date.now },
});

socialCommentSchema.index({ post: 1, createdAt: 1 });

export default mongoose.model("SocialComment", socialCommentSchema);
