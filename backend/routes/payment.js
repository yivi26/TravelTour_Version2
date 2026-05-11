import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  createMomoPayment,
  momoReturn,
  momoIpn,
} from "../controllers/paymentController.js";

const router = express.Router();

router.post("/momo/:bookingId/create", authMiddleware, createMomoPayment);
router.get("/momo/return", momoReturn);
router.post("/momo/ipn", momoIpn);
export default router;
