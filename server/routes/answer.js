import express from "express";
import { Askanswer, deleteanswer, voteanswer } from "../controller/answer.js";

import auth from "../middleware/auth.js";

const router = express.Router();

router.post("/postanswer/:id",auth, Askanswer);
router.patch("/vote/:id", auth, voteanswer);
router.delete("/delete/:id",auth,deleteanswer)


export default router;
