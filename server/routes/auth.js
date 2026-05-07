import express from "express";
import {
  getallusers,
  Login,
  Signup,
  updateprofile,
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
router.post("/forgot-password", requestForgotPassword);
router.get("/language", auth, getLanguagePreference);
router.post("/language/request-otp", auth, requestLanguageOtp);
router.post("/language/verify-otp", auth, verifyLanguageOtp);
router.get("/getalluser", getallusers);
router.patch("/update/:id", auth, updateprofile);
export default router;
