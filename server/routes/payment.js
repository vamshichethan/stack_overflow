import express from "express";
import { createOrder, verifyPayment } from "../controller/payment.js";
import auth from "../middleware/auth.js";

const router = express.Router();

router.post("/create-order", auth, createOrder);
router.post("/verify-payment", auth, verifyPayment);

export default router;
