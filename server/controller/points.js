import mongoose from "mongoose";
import user from "../models/auth.js";

const MIN_TRANSFER_POINTS_BALANCE = 10;
const POINTS_HISTORY_LIMIT = Number(process.env.POINTS_HISTORY_LIMIT || 100);

const getLimitedHistory = (pointsHistory = []) =>
  [...pointsHistory]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, POINTS_HISTORY_LIMIT);

const createTransferHistory = ({
  type,
  points,
  description,
  relatedUser,
}) => ({
  type,
  points,
  description,
  relatedUser,
  createdAt: new Date(),
});

export const getMyPoints = async (req, res) => {
  try {
    const foundUser = await user.findById(req.userid).select("points pointsHistory");

    if (!foundUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      data: {
        points: Number(foundUser.points || 0),
        pointsHistory: getLimitedHistory(foundUser.pointsHistory || []),
      },
    });
  } catch (error) {
    console.error("Get points error:", error);
    return res.status(500).json({ message: "Unable to fetch points." });
  }
};

export const transferPoints = async (req, res) => {
  const { recipientId } = req.body;
  const transferAmount = Number(req.body.points);

  if (!mongoose.Types.ObjectId.isValid(recipientId)) {
    return res.status(400).json({ message: "Recipient user unavailable" });
  }

  if (!Number.isInteger(transferAmount) || transferAmount <= 0) {
    return res.status(400).json({ message: "Transfer amount must be positive." });
  }

  if (String(recipientId) === String(req.userid)) {
    return res.status(400).json({ message: "You cannot transfer points to yourself." });
  }

  try {
    const [sender, recipient] = await Promise.all([
      user.findById(req.userid).select("name points pointsHistory"),
      user.findById(recipientId).select("name points pointsHistory"),
    ]);

    if (!sender || !recipient) {
      return res.status(404).json({ message: "User not found" });
    }

    if (Number(sender.points || 0) <= MIN_TRANSFER_POINTS_BALANCE) {
      return res
        .status(403)
        .json({ message: "You need more than 10 points to transfer." });
    }

    if (Number(sender.points || 0) < transferAmount) {
      return res.status(400).json({ message: "Insufficient points." });
    }

    sender.points = Math.max(0, Number(sender.points || 0) - transferAmount);
    recipient.points = Number(recipient.points || 0) + transferAmount;

    sender.pointsHistory = [
      createTransferHistory({
        type: "transfer_sent",
        points: -transferAmount,
        description: `Transferred ${transferAmount} points to ${recipient.name}.`,
        relatedUser: recipient._id,
      }),
      ...(sender.pointsHistory || []),
    ].slice(0, POINTS_HISTORY_LIMIT);

    recipient.pointsHistory = [
      createTransferHistory({
        type: "transfer_received",
        points: transferAmount,
        description: `Received ${transferAmount} points from ${sender.name}.`,
        relatedUser: sender._id,
      }),
      ...(recipient.pointsHistory || []),
    ].slice(0, POINTS_HISTORY_LIMIT);

    await Promise.all([sender.save(), recipient.save()]);

    return res.status(200).json({
      message: "Points transferred successfully.",
      data: {
        points: sender.points,
        pointsHistory: getLimitedHistory(sender.pointsHistory || []),
      },
    });
  } catch (error) {
    console.error("Transfer points error:", error);
    return res.status(500).json({ message: "Unable to transfer points." });
  }
};
