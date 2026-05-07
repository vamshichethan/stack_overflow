import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import twilio from "twilio";
import user from "../models/auth.js";
import { sendTransactionalEmail } from "../utils/email.js";

const OTP_EXPIRY_MINUTES = Number(process.env.LANGUAGE_OTP_EXPIRY_MINUTES || 5);
const OTP_DIGITS = 6;
const SUPPORTED_LANGUAGES = {
  en: "English",
  es: "Spanish",
  hi: "Hindi",
  pt: "Portuguese",
  zh: "Chinese",
  fr: "French",
};
const EMAIL_LANGUAGE = "fr";
const OTP_SENT_MESSAGE = "OTP sent successfully.";
const INVALID_OTP_MESSAGE = "Invalid or expired OTP.";
const SUCCESS_MESSAGE = "Language changed successfully.";

const getOtp = () =>
  String(randomInt(10 ** (OTP_DIGITS - 1), 10 ** OTP_DIGITS));

const maskEmail = (email = "") => {
  const [name, domain] = email.split("@");

  if (!name || !domain) {
    return "";
  }

  return `${name.slice(0, 2)}***@${domain}`;
};

const maskPhone = (phone = "") =>
  phone.length > 4 ? `***${phone.slice(-4)}` : "***";

const getLanguage = (language) => SUPPORTED_LANGUAGES[language] || "";

const sendEmailOtp = async ({ toEmail, otp, selectedLanguage }) => {
  const languageName = getLanguage(selectedLanguage);

  await sendTransactionalEmail({
    to: toEmail,
    subject: "Language change verification OTP",
    text: [
      `Your OTP to switch language to ${languageName} is ${otp}.`,
      `This OTP expires in ${OTP_EXPIRY_MINUTES} minutes.`,
      "If you did not request this, you can ignore this email.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e4e6e8;border-radius:8px;padding:28px;color:#232629;">
        <h2 style="margin:0 0 18px;color:#f48024;">Stack<span style="color:#232629;">overflow</span></h2>
        <p>Your OTP to switch language to <strong>${languageName}</strong> is:</p>
        <div style="background:#f6f6f6;border:1px solid #d6d9dc;border-radius:6px;padding:14px;text-align:center;font-size:24px;font-weight:bold;letter-spacing:6px;color:#232629;">
          ${otp}
        </div>
        <p style="margin-top:20px;">This OTP expires in ${OTP_EXPIRY_MINUTES} minutes.</p>
      </div>
    `,
    context: "Language OTP",
  });
};

const sendSmsOtp = async ({ toPhone, otp, selectedLanguage }) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromPhone = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromPhone) {
    throw new Error("Mobile OTP is not configured. Add Twilio credentials.");
  }

  const client = twilio(accountSid, authToken);
  const defaultCountryCode = process.env.DEFAULT_SMS_COUNTRY_CODE || "+91";
  const normalizedPhone = toPhone.startsWith("+")
    ? toPhone
    : `${defaultCountryCode}${toPhone}`;

  await client.messages.create({
    from: fromPhone,
    to: normalizedPhone,
    body: `Your Stack Overflow Clone OTP to switch language to ${getLanguage(
      selectedLanguage
    )} is ${otp}. It expires in ${OTP_EXPIRY_MINUTES} minutes.`,
  });
};

export const getLanguagePreference = async (req, res) => {
  try {
    const foundUser = await user
      .findById(req.userid)
      .select("preferredLanguage pendingLanguage languageOtpExpiry");

    if (!foundUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      data: {
        preferredLanguage: foundUser.preferredLanguage || "en",
        pendingLanguage: foundUser.pendingLanguage || null,
        languageOtpExpiry: foundUser.languageOtpExpiry || null,
      },
    });
  } catch (error) {
    console.error("Get language preference error:", error);
    return res
      .status(500)
      .json({ message: "Unable to fetch language preference." });
  }
};

export const requestLanguageOtp = async (req, res) => {
  const selectedLanguage =
    typeof req.body.language === "string" ? req.body.language.trim() : "";

  if (!SUPPORTED_LANGUAGES[selectedLanguage]) {
    return res.status(400).json({ message: "Unsupported language selected." });
  }

  try {
    const foundUser = await user.findById(req.userid);

    if (!foundUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const channel = selectedLanguage === EMAIL_LANGUAGE ? "email" : "mobile";
    const otp = getOtp();
    const hashedOtp = await bcrypt.hash(otp, 12);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    if (channel === "email") {
      if (!foundUser.email) {
        return res
          .status(400)
          .json({ message: "Registered email is required for French OTP." });
      }

      await sendEmailOtp({
        toEmail: foundUser.email,
        otp,
        selectedLanguage,
      });
    } else {
      if (!foundUser.phone) {
        return res.status(400).json({
          message: "Registered mobile number is required for language OTP.",
        });
      }

      await sendSmsOtp({
        toPhone: foundUser.phone,
        otp,
        selectedLanguage,
      });
    }

    foundUser.languageOtp = hashedOtp;
    foundUser.languageOtpExpiry = expiresAt;
    foundUser.pendingLanguage = selectedLanguage;
    foundUser.languageOtpChannel = channel;
    await foundUser.save();

    return res.status(200).json({
      message: OTP_SENT_MESSAGE,
      data: {
        channel,
        maskedDestination:
          channel === "email"
            ? maskEmail(foundUser.email)
            : maskPhone(foundUser.phone),
        expiresInMinutes: OTP_EXPIRY_MINUTES,
        pendingLanguage: selectedLanguage,
      },
    });
  } catch (error) {
    console.error("Request language OTP error:", error);
    return res.status(500).json({
      message:
        error.message === "Mobile OTP is not configured. Add Twilio credentials."
          ? error.message
          : "Unable to send language OTP.",
    });
  }
};

export const verifyLanguageOtp = async (req, res) => {
  const otp = typeof req.body.otp === "string" ? req.body.otp.trim() : "";

  if (!/^\d{6}$/.test(otp)) {
    return res.status(400).json({ message: INVALID_OTP_MESSAGE });
  }

  try {
    const foundUser = await user.findById(req.userid);

    if (
      !foundUser ||
      !foundUser.languageOtp ||
      !foundUser.languageOtpExpiry ||
      !foundUser.pendingLanguage ||
      !SUPPORTED_LANGUAGES[foundUser.pendingLanguage]
    ) {
      return res.status(400).json({ message: INVALID_OTP_MESSAGE });
    }

    if (foundUser.languageOtpExpiry.getTime() < Date.now()) {
      foundUser.languageOtp = null;
      foundUser.languageOtpExpiry = null;
      foundUser.pendingLanguage = null;
      foundUser.languageOtpChannel = null;
      await foundUser.save();

      return res.status(400).json({ message: INVALID_OTP_MESSAGE });
    }

    const otpMatches = await bcrypt.compare(otp, foundUser.languageOtp);

    if (!otpMatches) {
      return res.status(400).json({ message: INVALID_OTP_MESSAGE });
    }

    foundUser.preferredLanguage = foundUser.pendingLanguage;
    foundUser.languageOtp = null;
    foundUser.languageOtpExpiry = null;
    foundUser.pendingLanguage = null;
    foundUser.languageOtpChannel = null;
    await foundUser.save();

    return res.status(200).json({
      message: SUCCESS_MESSAGE,
      data: {
        preferredLanguage: foundUser.preferredLanguage,
        languageName: getLanguage(foundUser.preferredLanguage),
      },
    });
  } catch (error) {
    console.error("Verify language OTP error:", error);
    return res.status(500).json({ message: "Unable to verify language OTP." });
  }
};
