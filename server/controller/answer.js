import mongoose from "mongoose";
import question from "../models/question.js";

export const Askanswer = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).json({ message: "question unavailable" });
  }
  const { answerbody, useranswered, userid } = req.body;

  if (!answerbody) {
    return res.status(400).json({ message: "Answer body is required" });
  }

  try {
    const updatedQuestion = await question.findByIdAndUpdate(
      _id,
      {
        $push: { answer: { answerbody, useranswered, userid } },
        $inc: { noofanswer: 1 },
      },
      { new: true }
    );
    res.status(200).json({ data: updatedQuestion });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "something went wrong.." });
  }
};

export const deleteanswer = async (req, res) => {
  const { id: _id } = req.params;
  const { answerid } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).json({ message: "question unavailable" });
  }
  if (!mongoose.Types.ObjectId.isValid(answerid)) {
    return res.status(400).json({ message: "answer unavailable" });
  }

  try {
    const updatedQuestion = await question.findByIdAndUpdate(
      _id,
      {
        $pull: { answer: { _id: answerid } },
        $inc: { noofanswer: -1 },
      },
      { new: true }
    );
    res.status(200).json({ data: updatedQuestion });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "something went wrong.." });
  }
};
