import User from "../models/auth.js";
import Question from "../models/question.js";

const checkSubscription = async (req, res, next) => {
  const userId = req.userid;

  try {
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const plan = user.subscription?.plan || "Free";
    
    // Check if subscription is expired
    if (user.subscription?.expiryDate && new Date() > new Date(user.subscription.expiryDate)) {
        // Automatically downgrade to free if expired
        user.subscription.plan = "Free";
        user.subscription.active = true;
        await user.save();
    }

    const limits = {
      Free: 1,
      Bronze: 5,
      Silver: 10,
      Gold: Infinity,
    };

    const limit = limits[plan];

    // Count questions posted today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const questionCount = await Question.countDocuments({
      userid: userId,
      askedon: { $gte: startOfDay, $lte: endOfDay },
    });

    if (questionCount >= limit) {
      return res.status(403).json({
        message: "Daily question limit reached. Please upgrade your plan.",
      });
    }

    next();
  } catch (error) {
    res.status(500).json({ message: "Error checking subscription limits" });
  }
};

export default checkSubscription;
