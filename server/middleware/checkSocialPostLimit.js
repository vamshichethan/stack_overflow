import SocialPost from "../models/socialPost.js";
import User from "../models/auth.js";

const DEFAULT_DAY_OFFSET_MINUTES = 330;
const NO_FRIENDS_MESSAGE =
  "You need at least one friend to post on the public page.";
const DAILY_LIMIT_MESSAGE =
  "Daily posting limit reached. Add more friends to increase your posting limit.";

const getDayOffsetMinutes = () => {
  const configuredOffset = Number(process.env.SOCIAL_DAY_OFFSET_MINUTES);

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

const checkSocialPostLimit = async (req, res, next) => {
  try {
    const currentUser = await User.findById(req.userid).select("friends");

    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    const friendCount = currentUser.friends?.length || 0;

    if (friendCount === 0) {
      return res.status(403).json({ message: NO_FRIENDS_MESSAGE });
    }

    if (friendCount > 10) {
      req.socialPostingLimit = { friendCount, limit: null, usedToday: 0 };
      return next();
    }

    const { start, end } = getDailyLimitWindow();
    const usedToday = await SocialPost.countDocuments({
      author: req.userid,
      createdAt: { $gte: start, $lt: end },
    });

    if (usedToday >= friendCount) {
      return res.status(403).json({ message: DAILY_LIMIT_MESSAGE });
    }

    req.socialPostingLimit = {
      friendCount,
      limit: friendCount,
      usedToday,
    };

    return next();
  } catch (error) {
    console.error("Social post limit error:", error);
    return res
      .status(500)
      .json({ message: "Unable to verify posting limit." });
  }
};

export default checkSocialPostLimit;
