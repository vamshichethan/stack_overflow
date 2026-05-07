import mongoose from "mongoose";
import question from "../models/question.js";
import user from "../models/auth.js";
import { applyUserPointDelta, POINTS } from "../utils/points.js";

const FIVE_UPVOTE_BONUS_THRESHOLD = 5;

const findAnswer = (questionDoc, answerId) =>
  questionDoc.answer.id(answerId) ||
  questionDoc.answer.find((answer) => String(answer._id) === String(answerId));

const getVoteScore = (answerDoc) =>
  (answerDoc.upvote || []).length - (answerDoc.downvote || []).length;

export const Askanswer = async (req, res) => {
  const { id: _id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(404).json({ message: "question unavailable" });
  }
  const { answerbody } = req.body;

  if (!answerbody || !answerbody.trim()) {
    return res.status(400).json({ message: "Answer body is required" });
  }

  try {
    const [questionDoc, foundUser] = await Promise.all([
      question.findById(_id),
      user.findById(req.userid).select("name points pointsHistory"),
    ]);

    if (!questionDoc) {
      return res.status(404).json({ message: "question unavailable" });
    }

    if (!foundUser) {
      return res.status(404).json({ message: "User not found" });
    }

    questionDoc.answer.push({
      answerbody: answerbody.trim(),
      useranswered: foundUser.name,
      userid: String(foundUser._id),
      earnedPoints: POINTS.ANSWER_CREATED,
    });
    questionDoc.noofanswer += 1;

    const createdAnswer = questionDoc.answer[questionDoc.answer.length - 1];

    await questionDoc.save();
    await applyUserPointDelta({
      userId: foundUser._id,
      delta: POINTS.ANSWER_CREATED,
      type: "earned_answer",
      description: "Earned 5 points for posting an answer.",
      meta: {
        questionId: questionDoc._id,
        answerId: createdAnswer._id,
      },
    });

    const updatedQuestion = await question.findById(_id);

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
    const questionDoc = await question.findById(_id);

    if (!questionDoc) {
      return res.status(404).json({ message: "question unavailable" });
    }

    const answerDoc = findAnswer(questionDoc, answerid);

    if (!answerDoc) {
      return res.status(404).json({ message: "answer unavailable" });
    }

    const isAnswerOwner = String(answerDoc.userid) === String(req.userid);
    const isQuestionOwner = String(questionDoc.userid) === String(req.userid);

    if (!isAnswerOwner && !isQuestionOwner) {
      return res.status(403).json({ message: "You cannot delete this answer" });
    }

    const pointsToDeduct = Math.max(0, Number(answerDoc.earnedPoints || 0));

    if (pointsToDeduct > 0) {
      await applyUserPointDelta({
        userId: answerDoc.userid,
        delta: -pointsToDeduct,
        type: "deducted_deleted_answer",
        description: "Deducted points because an answer was deleted.",
        meta: {
          questionId: questionDoc._id,
          answerId: answerDoc._id,
        },
      });
    }

    questionDoc.answer.pull({ _id: answerid });
    questionDoc.noofanswer = Math.max(0, Number(questionDoc.noofanswer || 0) - 1);
    const updatedQuestion = await questionDoc.save();

    res.status(200).json({ data: updatedQuestion });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "something went wrong.." });
  }
};

export const voteanswer = async (req, res) => {
  const { id: _id } = req.params;
  const { answerid, value } = req.body;

  if (!mongoose.Types.ObjectId.isValid(_id)) {
    return res.status(400).json({ message: "question unavailable" });
  }

  if (!mongoose.Types.ObjectId.isValid(answerid)) {
    return res.status(400).json({ message: "answer unavailable" });
  }

  if (!["upvote", "downvote"].includes(value)) {
    return res.status(400).json({ message: "Invalid vote type" });
  }

  try {
    const questionDoc = await question.findById(_id);

    if (!questionDoc) {
      return res.status(404).json({ message: "question unavailable" });
    }

    const answerDoc = findAnswer(questionDoc, answerid);

    if (!answerDoc) {
      return res.status(404).json({ message: "answer unavailable" });
    }

    if (String(answerDoc.userid) === String(req.userid)) {
      return res.status(400).json({ message: "You cannot vote your own answer" });
    }

    answerDoc.upvote = answerDoc.upvote || [];
    answerDoc.downvote = answerDoc.downvote || [];

    const voterId = String(req.userid);
    const upIndex = answerDoc.upvote.findIndex((id) => id === voterId);
    const downIndex = answerDoc.downvote.findIndex((id) => id === voterId);

    if (value === "upvote") {
      if (downIndex !== -1) {
        answerDoc.downvote = answerDoc.downvote.filter((id) => id !== voterId);
        const { appliedDelta } = await applyUserPointDelta({
          userId: answerDoc.userid,
          delta: POINTS.ANSWER_DOWNVOTE_PENALTY,
          type: "restored_downvote",
          description: "Restored 1 point because a downvote was removed.",
          meta: {
            questionId: questionDoc._id,
            answerId: answerDoc._id,
            relatedUser: req.userid,
          },
        });
        answerDoc.earnedPoints = Math.max(
          0,
          Number(answerDoc.earnedPoints || 0) + Math.max(0, appliedDelta)
        );
      }

      if (upIndex === -1) {
        answerDoc.upvote.push(voterId);
      } else {
        answerDoc.upvote = answerDoc.upvote.filter((id) => id !== voterId);
      }
    }

    if (value === "downvote") {
      if (upIndex !== -1) {
        answerDoc.upvote = answerDoc.upvote.filter((id) => id !== voterId);
      }

      if (downIndex === -1) {
        answerDoc.downvote.push(voterId);

        if (Number(answerDoc.earnedPoints || 0) > 0) {
          const { appliedDelta } = await applyUserPointDelta({
            userId: answerDoc.userid,
            delta: -POINTS.ANSWER_DOWNVOTE_PENALTY,
            type: "deducted_downvote",
            description: "Deducted 1 point because an answer received a downvote.",
            meta: {
              questionId: questionDoc._id,
              answerId: answerDoc._id,
              relatedUser: req.userid,
            },
          });
          answerDoc.earnedPoints = Math.max(
            0,
            Number(answerDoc.earnedPoints || 0) + appliedDelta
          );
        }
      } else {
        answerDoc.downvote = answerDoc.downvote.filter((id) => id !== voterId);
        const { appliedDelta } = await applyUserPointDelta({
          userId: answerDoc.userid,
          delta: POINTS.ANSWER_DOWNVOTE_PENALTY,
          type: "restored_downvote",
          description: "Restored 1 point because a downvote was removed.",
          meta: {
            questionId: questionDoc._id,
            answerId: answerDoc._id,
            relatedUser: req.userid,
          },
        });
        answerDoc.earnedPoints = Math.max(
          0,
          Number(answerDoc.earnedPoints || 0) + Math.max(0, appliedDelta)
        );
      }
    }

    if (
      !answerDoc.bonusAwarded &&
      (answerDoc.upvote || []).length >= FIVE_UPVOTE_BONUS_THRESHOLD
    ) {
      const { appliedDelta } = await applyUserPointDelta({
        userId: answerDoc.userid,
        delta: POINTS.ANSWER_UPVOTE_BONUS,
        type: "earned_bonus",
        description: "Earned 5 bonus points because an answer reached 5 upvotes.",
        meta: {
          questionId: questionDoc._id,
          answerId: answerDoc._id,
        },
      });
      answerDoc.bonusAwarded = true;
      answerDoc.earnedPoints = Math.max(
        0,
        Number(answerDoc.earnedPoints || 0) + Math.max(0, appliedDelta)
      );
    }

    await questionDoc.save();
    const updatedQuestion = await question.findById(_id);

    res.status(200).json({
      data: updatedQuestion,
      answerScore: getVoteScore(answerDoc),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "something went wrong.." });
  }
};
