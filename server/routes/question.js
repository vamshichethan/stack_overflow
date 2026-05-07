import express from "express";
import {
  Askquestion,
  deletequestion,
  getallquestion,
  votequestion,
} from "../controller/question.js";

const router = express.Router();
import auth from "../middleware/auth.js";
import checkSubscription from "../middleware/checkSubscription.js";
router.post("/ask", auth, checkSubscription, Askquestion);
router.get("/getallquestion", getallquestion);
router.delete("/delete/:id", auth, deletequestion);
router.patch("/vote/:id", auth, votequestion);

export default router;
