import mongoose from "mongoose";

const friendRequestSchema = mongoose.Schema({
  requester: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    required: true,
  },
  status: {
    type: String,
    enum: ["pending", "accepted", "rejected"],
    default: "pending",
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

friendRequestSchema.index(
  { requester: 1, recipient: 1 },
  { unique: true }
);
friendRequestSchema.index({ recipient: 1, status: 1 });

friendRequestSchema.pre("save", function setUpdatedAt(next) {
  this.updatedAt = new Date();
  next();
});

export default mongoose.model("FriendRequest", friendRequestSchema);
