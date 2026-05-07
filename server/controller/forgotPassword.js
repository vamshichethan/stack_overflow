import bcrypt from "bcryptjs";
import { randomInt } from "crypto";
import nodemailer from "nodemailer";
import user from "../models/auth.js";

const PASSWORD_LENGTH = 10;
const PASSWORD_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const LIMIT_MESSAGE = "You can use this option only one time per day.";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+?\d{7,15}$/;
const DEFAULT_DAY_OFFSET_MINUTES = 330;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const generatePassword = () => {
  let password = "";

  for (let index = 0; index < PASSWORD_LENGTH; index += 1) {
    password += PASSWORD_CHARS[randomInt(PASSWORD_CHARS.length)];
  }

  return password;
};

const getDayOffsetMinutes = () => {
  const configuredOffset = Number(
    process.env.FORGOT_PASSWORD_DAY_OFFSET_MINUTES
  );

  return Number.isFinite(configuredOffset)
    ? configuredOffset
    : DEFAULT_DAY_OFFSET_MINUTES;
};

const getDailyLimitWindow = (date = new Date()) => {
  const offsetMs = getDayOffsetMinutes() * 60 * 1000;
  const shiftedDate = new Date(date.getTime() + offsetMs);
  const start = new Date(
    Date.UTC(
      shiftedDate.getUTCFullYear(),
      shiftedDate.getUTCMonth(),
      shiftedDate.getUTCDate()
    ) - offsetMs
  );
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end };
};

const isDateInWindow = (date, { start, end }) =>
  Boolean(date) && date >= start && date < end;

const normalizePhone = (value) => value.replace(/[\s().-]/g, "");

const parseIdentifier = (identifier, type) => {
  if (typeof identifier !== "string" || !identifier.trim()) {
    return {
      error: "Please provide your registered email address or phone number.",
    };
  }

  if (type === "email") {
    const email = identifier.trim().toLowerCase();

    if (!EMAIL_REGEX.test(email)) {
      return { error: "Please enter a valid email address." };
    }

    return { value: email };
  }

  const phone = normalizePhone(identifier.trim());

  if (!PHONE_REGEX.test(phone)) {
    return { error: "Please enter a valid phone number." };
  }

  return { value: phone };
};

const buildUserQuery = (type, value) => {
  if (type === "email") {
    return { email: new RegExp(`^${escapeRegExp(value)}$`, "i") };
  }

  const withoutPlus = value.replace(/^\+/, "");
  const candidates = Array.from(new Set([value, withoutPlus, `+${withoutPlus}`]));

  return { phone: { $in: candidates } };
};

const getMailConfig = () => {
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER || process.env.EMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.EMAIL_PASS;
  const smtpSecure = process.env.SMTP_SECURE === "true";
  const smtpPort = Number(process.env.SMTP_PORT || (smtpSecure ? 465 : 587));
  const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || smtpUser;

  if (!smtpUser || !smtpPass || !from) {
    throw new Error("Password reset email credentials are not configured.");
  }

  if (smtpHost) {
    return {
      from,
      transport: {
        host: smtpHost,
        port: smtpPort,
        secure: smtpSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      },
    };
  }

  return {
    from,
    transport: {
      service: process.env.EMAIL_SERVICE || "gmail",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    },
  };
};

const sendPasswordEmail = async ({
  toEmail,
  userName,
  newPassword,
  mailConfig,
}) => {
  const transporter = nodemailer.createTransport(mailConfig.transport);
  const safeName = escapeHtml(userName || "there");
  const safePassword = escapeHtml(newPassword);

  await transporter.sendMail({
    from: mailConfig.from,
    to: toEmail,
    subject: "Your new Stack Overflow Clone password",
    text: [
      `Hi ${userName || "there"},`,
      "",
      "Your password has been reset.",
      `New password: ${newPassword}`,
      "",
      "Please log in with this password and keep it private.",
      "If you did not request this reset, contact support immediately.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;border:1px solid #e4e6e8;border-radius:8px;padding:28px;color:#232629;">
        <h2 style="margin:0 0 18px;color:#f48024;">Stack<span style="color:#232629;">overflow</span></h2>
        <p>Hi <strong>${safeName}</strong>,</p>
        <p>Your password has been reset.</p>
        <div style="background:#f6f6f6;border:1px solid #d6d9dc;border-radius:6px;padding:14px;text-align:center;font-size:22px;font-weight:bold;letter-spacing:4px;color:#232629;">
          ${safePassword}
        </div>
        <p style="margin-top:20px;">Please log in with this password and keep it private.</p>
        <p style="color:#6a737c;font-size:12px;margin-top:24px;">If you did not request this reset, contact support immediately.</p>
      </div>
    `,
  });
};

const rollbackPasswordReset = async ({
  userId,
  newHashedPassword,
  resetDate,
  previousHashedPassword,
  previousRequestDate,
}) => {
  try {
    await user.findOneAndUpdate(
      {
        _id: userId,
        password: newHashedPassword,
        lastForgotPasswordRequestDate: resetDate,
      },
      {
        $set: {
          password: previousHashedPassword,
          lastForgotPasswordRequestDate: previousRequestDate || null,
        },
      }
    );
  } catch (rollbackError) {
    console.error("Forgot Password Rollback Error:", rollbackError);
  }
};

export const forgotPassword = async (req, res) => {
  const requestType =
    typeof req.body.type === "string" ? req.body.type.trim().toLowerCase() : "";

  if (!["email", "phone"].includes(requestType)) {
    return res
      .status(400)
      .json({ message: "Please choose email or phone reset." });
  }

  const parsed = parseIdentifier(req.body.identifier, requestType);

  if (parsed.error) {
    return res.status(400).json({ message: parsed.error });
  }

  try {
    const foundUser = await user.findOne(
      buildUserQuery(requestType, parsed.value)
    );

    if (!foundUser) {
      return res.status(404).json({
        message: "No account found with that email or phone number.",
      });
    }

    if (!foundUser.email) {
      return res.status(400).json({
        message:
          "This account does not have a registered email address for password reset.",
      });
    }

    const { start, end } = getDailyLimitWindow();

    if (
      isDateInWindow(foundUser.lastForgotPasswordRequestDate, { start, end })
    ) {
      return res.status(429).json({ message: LIMIT_MESSAGE });
    }

    let mailConfig;

    try {
      mailConfig = getMailConfig();
    } catch (configError) {
      console.error("Forgot Password Email Config Error:", configError.message);
      return res.status(500).json({
        message:
          "Password reset email is not configured. Please contact support.",
      });
    }

    const resetDate = new Date();
    const newPassword = generatePassword();
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    const previousHashedPassword = foundUser.password;
    const previousRequestDate = foundUser.lastForgotPasswordRequestDate || null;

    const updatedUser = await user.findOneAndUpdate(
      {
        _id: foundUser._id,
        $or: [
          { lastForgotPasswordRequestDate: null },
          { lastForgotPasswordRequestDate: { $exists: false } },
          { lastForgotPasswordRequestDate: { $lt: start } },
          { lastForgotPasswordRequestDate: { $gte: end } },
        ],
      },
      {
        $set: {
          password: hashedPassword,
          lastForgotPasswordRequestDate: resetDate,
        },
      },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(429).json({ message: LIMIT_MESSAGE });
    }

    try {
      await sendPasswordEmail({
        toEmail: foundUser.email,
        userName: foundUser.name,
        newPassword,
        mailConfig,
      });
    } catch (emailError) {
      console.error("Forgot Password Email Error:", emailError);
      await rollbackPasswordReset({
        userId: foundUser._id,
        newHashedPassword: hashedPassword,
        resetDate,
        previousHashedPassword,
        previousRequestDate,
      });

      return res.status(500).json({
        message: "Unable to send reset email. Please try again later.",
      });
    }

    return res.status(200).json({
      message: "A new password has been sent to your registered email address.",
    });
  } catch (error) {
    console.error("Forgot Password Error:", error);
    return res
      .status(500)
      .json({ message: "Something went wrong. Please try again later." });
  }
};
