import express from "express";
import { getMyPoints, transferPoints } from "../controller/points.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.get("/me", auth, getMyPoints);
router.post("/transfer", auth, transferPoints);

export default router;
