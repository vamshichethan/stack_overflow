import user from "../models/auth.js";

export const POINTS = {
  ANSWER_CREATED: 5,
  ANSWER_UPVOTE_BONUS: 5,
  ANSWER_DOWNVOTE_PENALTY: 1,
};

const POINTS_HISTORY_LIMIT = Number(process.env.POINTS_HISTORY_LIMIT || 100);

const buildHistoryEntry = ({ type, points, description, meta = {} }) => ({
  type,
  points,
  description,
  questionId: meta.questionId,
  answerId: meta.answerId,
  relatedUser: meta.relatedUser,
  createdAt: new Date(),
});

export const applyUserPointDelta = async ({
  userId,
  delta,
  type,
  description,
  meta,
}) => {
  if (!userId || !Number.isFinite(delta) || delta === 0) {
    return { user: null, appliedDelta: 0 };
  }

  const foundUser = await user.findById(userId);

  if (!foundUser) {
    return { user: null, appliedDelta: 0 };
  }

  const currentPoints = Number(foundUser.points || 0);
  const nextPoints = Math.max(0, currentPoints + delta);
  const appliedDelta = nextPoints - currentPoints;

  if (appliedDelta === 0) {
    return { user: foundUser, appliedDelta };
  }

  foundUser.points = nextPoints;
  foundUser.pointsHistory = [
    buildHistoryEntry({
      type,
      points: appliedDelta,
      description,
      meta,
    }),
    ...(foundUser.pointsHistory || []),
  ].slice(0, POINTS_HISTORY_LIMIT);

  await foundUser.save();

  return { user: foundUser, appliedDelta };
};
