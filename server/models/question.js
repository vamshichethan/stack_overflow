import mongoose from "mongoose";

const questionschema = mongoose.Schema(
  {
    questiontitle: { type: String, required: true },
    questionbody: { type: String, required: true },
    questiontags: { type: [String], required: true },
    noofanswer: { type: Number, default: 0 },
    upvote: { type: [String], default: [] },
    downvote: { type: [String], default: [] },
    userposted: { type: String },
    userid: { type: String },
    askedon: { type: Date, default: Date.now },
    answer: [
      {
        answerbody: String,
        useranswered: String,
        userid: String,
        upvote: { type: [String], default: [] },
        downvote: { type: [String], default: [] },
        bonusAwarded: { type: Boolean, default: false },
        earnedPoints: { type: Number, default: 5, min: 0 },
        answeredon: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamp: true }
);
export default mongoose.model("question", questionschema);
