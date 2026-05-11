import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  confirmBooking,
  getRecentBookings,
  getBookingDetail,
  getBookingHistory,
  getMyBookings,
  getBookingSummary,
  cancelBooking,
} from "../controllers/bookingController.js";

const router = express.Router();

router.post("/confirm", authMiddleware, confirmBooking);
router.get("/recent", authMiddleware, getRecentBookings);
router.get("/history", authMiddleware, getBookingHistory);
router.get("/my-bookings", authMiddleware, getMyBookings);
router.get("/summary", getBookingSummary);
router.patch("/:id/cancel", authMiddleware, cancelBooking);
router.get("/:id", authMiddleware, getBookingDetail);

export default router;
