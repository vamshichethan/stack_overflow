import mongoose from "mongoose";

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
