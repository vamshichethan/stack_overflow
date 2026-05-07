import Razorpay from "razorpay";
import crypto from "crypto";
import User from "../models/auth.js";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const createOrder = async (req, res) => {
  const { plan, amount } = req.body;

  // Time-Restricted Payments: 10:00 AM to 11:00 AM IST
  // IST is UTC+5:30
  const now = new Date();
  const utcHours = now.getUTCHours();
  const utcMinutes = now.getUTCMinutes();
  
  // IST hours = (UTC hours + 5) + (UTC minutes + 30) / 60
  let istHours = (utcHours + 5) % 24;
  let istMinutes = utcMinutes + 30;
  if (istMinutes >= 60) {
    istHours = (istHours + 1) % 24;
    istMinutes -= 60;
  }

  console.log(`Current IST Time: ${istHours}:${istMinutes}`);

  // Temporarily bypassed for testing
  // if (istHours < 10 || istHours >= 11) {
  //   return res.status(403).json({
  //     message: "Payments are allowed only between 10:00 AM and 11:00 AM IST.",
  //   });
  // }

  const options = {
    amount: amount * 100, // amount in the smallest currency unit
    currency: "INR",
    receipt: `receipt_${Date.now()}`,
  };

  try {
    const order = await razorpay.orders.create(options);
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: "Something went wrong" });
  }
};

export const verifyPayment = async (req, res) => {
  const { razorpay_order_id, razorpay_payment_id, razorpay_signature, plan, userId } = req.body;

  const shasum = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET);
  shasum.update(`${razorpay_order_id}|${razorpay_payment_id}`);
  const digest = shasum.digest("hex");

  if (digest !== razorpay_signature) {
    return res.status(400).json({ message: "Transaction not legit!" });
  }

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const startDate = new Date();
    const expiryDate = new Date();
    expiryDate.setMonth(expiryDate.getMonth() + 1); // 1 month subscription

    user.subscription = {
      plan,
      startDate,
      expiryDate,
      active: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
    };

    await user.save();

    // Send Email
    await sendInvoiceEmail(user, plan, razorpay_payment_id);

    res.status(200).json({ message: "Subscription activated successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Error updating subscription" });
  }
};

const sendInvoiceEmail = async (user, plan, paymentId) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: user.email,
    subject: "Subscription Invoice - CodeQuest",
    html: `
      <h1>Invoice</h1>
      <p>Hello ${user.name},</p>
      <p>Thank you for subscribing to the <strong>${plan} Plan</strong>.</p>
      <p><strong>Payment ID:</strong> ${paymentId}</p>
      <p><strong>Amount Paid:</strong> ${getAmount(plan)}</p>
      <p><strong>Start Date:</strong> ${new Date().toLocaleDateString()}</p>
      <p><strong>Expiry Date:</strong> ${new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString()}</p>
      <p>Happy coding!</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("Email error:", error);
  }
};

const getAmount = (plan) => {
  switch (plan) {
    case "Bronze": return "₹100";
    case "Silver": return "₹300";
    case "Gold": return "₹1000";
    default: return "₹0";
  }
};
