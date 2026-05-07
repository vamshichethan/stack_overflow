import mongoose from "mongoose";

const loginHistorySchema = mongoose.Schema(
  {
    browser: { type: String, default: "Unknown" },
    os: { type: String, default: "Unknown" },
    device: {
      type: String,
      enum: ["desktop", "laptop", "mobile"],
      default: "desktop",
    },
    ipAddress: { type: String, default: "Unknown" },
    loginAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const pointsHistorySchema = mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "earned_answer",
        "earned_bonus",
        "deducted_downvote",
        "restored_downvote",
        "deducted_deleted_answer",
        "transfer_sent",
        "transfer_received",
      ],
      required: true,
    },
    points: { type: Number, required: true },
    description: { type: String, required: true },
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: "question" },
    answerId: { type: mongoose.Schema.Types.ObjectId },
    relatedUser: { type: mongoose.Schema.Types.ObjectId, ref: "user" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const userschema = mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  password: { type: String, required: true },
  phone: { type: String, default: "" },
  about: { type: String },
  tags: { type: [String] },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
  joinDate: { type: Date, default: Date.now },
  lastForgotPasswordRequestDate: { type: Date, default: null },
  preferredLanguage: {
    type: String,
    enum: ["en", "es", "hi", "pt", "zh", "fr"],
    default: "en",
  },
  languageOtp: { type: String, default: null },
  languageOtpExpiry: { type: Date, default: null },
  pendingLanguage: {
    type: String,
    enum: ["en", "es", "hi", "pt", "zh", "fr", null],
    default: null,
  },
  languageOtpChannel: {
    type: String,
    enum: ["email", "mobile", null],
    default: null,
  },
  loginHistory: { type: [loginHistorySchema], default: [] },
  pendingLoginOtp: { type: String, default: null, select: false },
  pendingLoginOtpExpiry: { type: Date, default: null, select: false },
  points: { type: Number, default: 0, min: 0 },
  pointsHistory: { type: [pointsHistorySchema], default: [] },
  subscription: {
    plan: { type: String, default: "Free" }, // Free, Bronze, Silver, Gold
    startDate: { type: Date },
    expiryDate: { type: Date },
    active: { type: Boolean, default: true },
    paymentId: { type: String },
    orderId: { type: String },
  },
});
export default mongoose.model("user", userschema);
