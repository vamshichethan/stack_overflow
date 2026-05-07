import express from "express";
import {
  getallusers,
  getLoginHistory,
  Login,
  Signup,
  updateprofile,
  verifyChromeLoginOtp,
} from "../controller/auth.js";
import { forgotPassword as requestForgotPassword } from "../controller/forgotPassword.js";
import {
  getLanguagePreference,
  requestLanguageOtp,
  verifyLanguageOtp,
} from "../controller/language.js";
import auth from "../middleware/auth.js";

const router = express.Router();
router.post("/signup", Signup);
router.post("/login", Login);
router.post("/login/verify-otp", verifyChromeLoginOtp);
router.post("/forgot-password", requestForgotPassword);
router.get("/language", auth, getLanguagePreference);
router.post("/language/request-otp", auth, requestLanguageOtp);
router.post("/language/verify-otp", auth, verifyLanguageOtp);
router.get("/login-history", auth, getLoginHistory);
router.get("/getalluser", getallusers);
router.patch("/update/:id", auth, updateprofile);
export default router;
