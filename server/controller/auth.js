import mongoose from "mongoose";
import user from "../models/auth.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomInt } from "crypto";
import { UAParser } from "ua-parser-js";
import { sendTransactionalEmail } from "../utils/email.js";

const PHONE_REGEX = /^\+?\d{7,15}$/;
const normalizePhone = (value) => value.replace(/[\s().-]/g, "");
const LOGIN_OTP_EXPIRY_MINUTES = Number(
  process.env.LOGIN_OTP_EXPIRY_MINUTES || 5
);
const LOGIN_HISTORY_LIMIT = Number(process.env.LOGIN_HISTORY_LIMIT || 50);
const IST_OFFSET_MINUTES = 330;
const MOBILE_LOGIN_START_MINUTES = 10 * 60;
const MOBILE_LOGIN_END_MINUTES = 13 * 60;
const MOBILE_LOGIN_RESTRICTED_MESSAGE =
  "Mobile login is allowed only between 10:00 AM and 1:00 PM IST.";
const LOGIN_OTP_REQUIRED_MESSAGE =
  "OTP sent successfully. Please verify the OTP sent to your registered email.";
const INVALID_LOGIN_OTP_MESSAGE = "Invalid or expired OTP.";

const getOtp = () => String(randomInt(100000, 1000000));

const createAuthToken = (foundUser) =>
  jwt.sign(
    { email: foundUser.email, id: foundUser._id },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

const createLoginChallengeToken = (foundUser) =>
  jwt.sign(
    {
      id: foundUser._id,
      email: foundUser.email,
      purpose: "chrome_login_otp",
    },
    process.env.JWT_SECRET,
    { expiresIn: `${LOGIN_OTP_EXPIRY_MINUTES}m` }
  );

const sanitizeUser = (foundUser) => {
  const safeUser =
    typeof foundUser.toObject === "function" ? foundUser.toObject() : foundUser;

  delete safeUser.password;
  delete safeUser.pendingLoginOtp;
  delete safeUser.pendingLoginOtpExpiry;
  delete safeUser.languageOtp;
  delete safeUser.languageOtpExpiry;
  delete safeUser.pendingLanguage;
  delete safeUser.languageOtpChannel;
  delete safeUser.loginHistory;
  delete safeUser.pointsHistory;

  return safeUser;
};

const maskEmail = (email = "") => {
  const [name, domain] = email.split("@");

  if (!name || !domain) {
    return "";
  }

  return `${name.slice(0, 2)}***@${domain}`;
};

const normalizeIp = (ip = "") => {
  const cleaned = ip.replace("::ffff:", "").trim();
  return cleaned || "Unknown";
};

const getClientIp = (req) => {
  const trustProxy = process.env.TRUST_PROXY === "true";
  const forwardedFor = req.headers["x-forwarded-for"];

  if (trustProxy && forwardedFor) {
    const firstForwardedIp = Array.isArray(forwardedFor)
      ? forwardedFor[0]
      : forwardedFor.split(",")[0];

    return normalizeIp(firstForwardedIp);
  }

  return normalizeIp(req.socket?.remoteAddress || req.ip || "");
};

const getBrowserLabel = (result, userAgent) => {
  const browserName = result.browser.name || "";

  if (/EdgA?|EdgiOS|Edge/i.test(userAgent) || /edge/i.test(browserName)) {
    return "Microsoft Edge";
  }

  if (/Chrome|CriOS|Chromium/i.test(browserName)) {
    return "Google Chrome";
  }

  return browserName || "Unknown";
};

const getBrowserFamily = (result, userAgent) => {
  const browserName = result.browser.name || "";

  if (/EdgA?|EdgiOS|Edge/i.test(userAgent) || /edge/i.test(browserName)) {
    return "edge";
  }

  if (/Chrome|CriOS|Chromium/i.test(browserName)) {
    return "chrome";
  }

  return "other";
};

const getDeviceType = (result, userAgent) => {
  const detectedType = result.device.type || "";

  if (["mobile", "tablet", "wearable"].includes(detectedType)) {
    return "mobile";
  }

  if (/Macintosh|Windows NT|X11|Linux x86_64|CrOS/i.test(userAgent)) {
    return "laptop";
  }

  return "desktop";
};

const getRequestEnvironment = (req) => {
  const userAgent = req.headers["user-agent"] || "";
  const parser = new UAParser(userAgent);
  const result = parser.getResult();
  const os = [result.os.name, result.os.version].filter(Boolean).join(" ");

  return {
    browser: getBrowserLabel(result, userAgent),
    browserFamily: getBrowserFamily(result, userAgent),
    os: os || "Unknown",
    device: getDeviceType(result, userAgent),
    ipAddress: getClientIp(req),
  };
};

const isMobileLoginWindowOpen = () => {
  const now = new Date();
  const istNow = new Date(now.getTime() + IST_OFFSET_MINUTES * 60 * 1000);
  const istMinutes = istNow.getUTCHours() * 60 + istNow.getUTCMinutes();

  return (
    istMinutes >= MOBILE_LOGIN_START_MINUTES &&
    istMinutes < MOBILE_LOGIN_END_MINUTES
  );
};

const enforceMobileLoginWindow = (requestEnvironment, res) => {
  if (
    requestEnvironment.device === "mobile" &&
    !isMobileLoginWindowOpen()
  ) {
    res.status(403).json({ message: MOBILE_LOGIN_RESTRICTED_MESSAGE });
    return false;
  }

  return true;
};

const sendLoginOtpEmail = async ({ toEmail, otp }) => {
  await sendTransactionalEmail({
    to: toEmail,
    subject: "Chrome login verification OTP",
    text: [
      `Your OTP to complete Chrome login is ${otp}.`,
      `This OTP expires in ${LOGIN_OTP_EXPIRY_MINUTES} minutes.`,
      "If you did not try to log in, change your password immediately.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e4e6e8;border-radius:8px;padding:28px;color:#232629;">
        <h2 style="margin:0 0 18px;color:#f48024;">Stack<span style="color:#232629;">overflow</span></h2>
        <p>Your OTP to complete Chrome login is:</p>
        <div style="background:#f6f6f6;border:1px solid #d6d9dc;border-radius:6px;padding:14px;text-align:center;font-size:24px;font-weight:bold;letter-spacing:6px;color:#232629;">
          ${otp}
        </div>
        <p style="margin-top:20px;">This OTP expires in ${LOGIN_OTP_EXPIRY_MINUTES} minutes.</p>
      </div>
    `,
    context: "Login OTP",
  });
};

const appendLoginHistory = async (foundUser, requestEnvironment) => {
  const loginEntry = {
    browser: requestEnvironment.browser,
    os: requestEnvironment.os,
    device: requestEnvironment.device,
    ipAddress: requestEnvironment.ipAddress,
    loginAt: new Date(),
  };

  foundUser.loginHistory = [loginEntry, ...(foundUser.loginHistory || [])].slice(
    0,
    LOGIN_HISTORY_LIMIT
  );

  await foundUser.save();
};

const sendAuthResponse = async (res, foundUser, requestEnvironment) => {
  await appendLoginHistory(foundUser, requestEnvironment);
  const token = createAuthToken(foundUser);

  return res.status(200).json({ data: sanitizeUser(foundUser), token });
};

export const Signup = async (req, res) => {
  const { name, email, password, phone } = req.body;
  const phoneInput =
    typeof phone === "string" && phone.trim()
      ? normalizePhone(phone.trim())
      : "";

  if (phoneInput && !PHONE_REGEX.test(phoneInput)) {
    return res.status(400).json({ message: "Invalid phone number" });
  }

  try {
    const exisitinguser = await user.findOne({ email });
    if (exisitinguser) {
      return res.status(404).json({ message: "User already exist" });
    }

    if (phoneInput) {
      const existingPhoneUser = await user.findOne({ phone: phoneInput });

      if (existingPhoneUser) {
        return res
          .status(409)
          .json({ message: "Phone number already registered" });
      }
    }

    const hashpassword = await bcrypt.hash(password, 12);
    const newuser = await user.create({
      name,
      email,
      password: hashpassword,
      phone: phoneInput,
    });
    const token = createAuthToken(newuser);
    res.status(200).json({ data: sanitizeUser(newuser), token });
  } catch (error) {
    console.error("Signup Error:", error);
    res.status(500).json("something went wrong..");
    return;
  }
};
export const Login = async (req, res) => {
  const { email, password } = req.body;
  const requestEnvironment = getRequestEnvironment(req);

  if (!enforceMobileLoginWindow(requestEnvironment, res)) {
    return;
  }

  try {
    const exisitinguser = await user.findOne({ email });
    if (!exisitinguser) {
      return res.status(404).json({ message: "User does not exist" });
    }

    const ispasswordcrct = await bcrypt.compare(
      password,
      exisitinguser.password
    );
    if (!ispasswordcrct) {
      return res.status(400).json({ message: "Invalid password" });
    }

    if (requestEnvironment.browserFamily === "chrome") {
      const otp = getOtp();
      const hashedOtp = await bcrypt.hash(otp, 12);

      await sendLoginOtpEmail({ toEmail: exisitinguser.email, otp });

      exisitinguser.pendingLoginOtp = hashedOtp;
      exisitinguser.pendingLoginOtpExpiry = new Date(
        Date.now() + LOGIN_OTP_EXPIRY_MINUTES * 60 * 1000
      );
      await exisitinguser.save();

      return res.status(200).json({
        otpRequired: true,
        message: LOGIN_OTP_REQUIRED_MESSAGE,
        data: {
          challengeToken: createLoginChallengeToken(exisitinguser),
          maskedEmail: maskEmail(exisitinguser.email),
          expiresInMinutes: LOGIN_OTP_EXPIRY_MINUTES,
        },
      });
    }

    return sendAuthResponse(res, exisitinguser, requestEnvironment);
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ message: "something went wrong.." });
    return;
  }
};
export const verifyChromeLoginOtp = async (req, res) => {
  const otp = typeof req.body.otp === "string" ? req.body.otp.trim() : "";
  const challengeToken =
    typeof req.body.challengeToken === "string"
      ? req.body.challengeToken.trim()
      : "";
  const requestEnvironment = getRequestEnvironment(req);

  if (!enforceMobileLoginWindow(requestEnvironment, res)) {
    return;
  }

  if (!/^\d{6}$/.test(otp) || !challengeToken) {
    return res.status(400).json({ message: INVALID_LOGIN_OTP_MESSAGE });
  }

  try {
    const decoded = jwt.verify(challengeToken, process.env.JWT_SECRET);

    if (decoded?.purpose !== "chrome_login_otp" || !decoded?.id) {
      return res.status(400).json({ message: INVALID_LOGIN_OTP_MESSAGE });
    }

    const foundUser = await user
      .findById(decoded.id)
      .select("+pendingLoginOtp +pendingLoginOtpExpiry");

    if (
      !foundUser ||
      !foundUser.pendingLoginOtp ||
      !foundUser.pendingLoginOtpExpiry
    ) {
      return res.status(400).json({ message: INVALID_LOGIN_OTP_MESSAGE });
    }

    if (foundUser.pendingLoginOtpExpiry.getTime() < Date.now()) {
      foundUser.pendingLoginOtp = null;
      foundUser.pendingLoginOtpExpiry = null;
      await foundUser.save();

      return res.status(400).json({ message: INVALID_LOGIN_OTP_MESSAGE });
    }

    const otpMatches = await bcrypt.compare(otp, foundUser.pendingLoginOtp);

    if (!otpMatches) {
      return res.status(400).json({ message: INVALID_LOGIN_OTP_MESSAGE });
    }

    foundUser.pendingLoginOtp = null;
    foundUser.pendingLoginOtpExpiry = null;

    return sendAuthResponse(res, foundUser, requestEnvironment);
  } catch (error) {
    console.error("Chrome login OTP verification error:", error);
    return res.status(400).json({ message: INVALID_LOGIN_OTP_MESSAGE });
  }
};
export const getallusers = async (req, res) => {
  try {
    const alluser = await user
      .find()
      .select(
        "-password -pendingLoginOtp -pendingLoginOtpExpiry -languageOtp -languageOtpExpiry -languageOtpChannel -pendingLanguage -loginHistory -pointsHistory"
      );
    res.status(200).json({ data: alluser });
  } catch (error) {
    res.status(500).json("something went wrong..");
    return;
  }
};
export const getLoginHistory = async (req, res) => {
  try {
    const foundUser = await user.findById(req.userid).select("loginHistory");

    if (!foundUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const loginHistory = [...(foundUser.loginHistory || [])]
      .sort((a, b) => new Date(b.loginAt) - new Date(a.loginAt))
      .slice(0, LOGIN_HISTORY_LIMIT);

    return res.status(200).json({ data: loginHistory });
  } catch (error) {
    console.error("Get login history error:", error);
    return res.status(500).json({ message: "Unable to fetch login history." });
  }
};
export const updateprofile = async (req, res) => {
  const { id: _id } = req.params;
  const { name, about, tags } = req.body.editForm;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({ message: "User unavailable" });
  }
  try {
    const updateprofile = await user.findByIdAndUpdate(
      _id,
      { $set: { name: name, about: about, tags: tags } },
      { new: true }
    );
    res.status(200).json({ data: updateprofile });
  } catch (error) {
    console.log(error);
    res.status(500).json("something went wrong..");
    return;
  }
};
