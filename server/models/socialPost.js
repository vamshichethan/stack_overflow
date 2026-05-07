import mongoose from "mongoose";

const mediaSchema = mongoose.Schema(
  {
    url: { type: String, required: true },
    type: { type: String, enum: ["image", "video"], required: true },
    filename: { type: String, required: true },
    mimetype: { type: String, required: true },
    size: { type: Number, required: true },
  },
  { _id: false }
);

const socialPostSchema = mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "user", required: true },
  text: { type: String, trim: true, maxlength: 2000, default: "" },
  media: { type: [mediaSchema], default: [] },
  createdAt: { type: Date, default: Date.now },
});

socialPostSchema.index({ createdAt: -1 });
socialPostSchema.index({ author: 1, createdAt: -1 });

export default mongoose.model("SocialPost", socialPostSchema);
