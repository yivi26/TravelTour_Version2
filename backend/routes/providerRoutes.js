import express from "express";
import {
  getDashboardData,
  getTours,
  getTourDetailController,
  createNewTour,
  updateTourController,
  deleteTourController,
  updateTourStatusController,
  getBookings,
  updateBooking,
  getAllGuides,
  assignGuideController,
  getPublicFeaturedToursController,
  getPublicToursController,
  getPublicDiscountedToursController,
  getPublicTourDetailController,
  getProfile,
  updateProfile,
  getProviderReportOverviewController,
  getProviderNotificationsController,
} from "../controllers/providerController.js";

const router = express.Router();

/* =========================
   PUBLIC ROUTES
========================= */
router.get("/public/featured-tours", getPublicFeaturedToursController);
router.get("/public/tours", getPublicToursController);
router.get("/public/discounted-tours", getPublicDiscountedToursController);
router.get("/public/tours/:id", getPublicTourDetailController);

/* =========================
   PROVIDER PROFILE
========================= */
router.get("/profile", getProfile);
router.put("/profile", updateProfile);

/* =========================
   PROVIDER DASHBOARD
========================= */
router.get("/dashboard", getDashboardData);
router.get("/notifications", getProviderNotificationsController);

/* =========================
   PROVIDER REPORT
========================= */
router.get("/report", getProviderReportOverviewController);

/* =========================
   PROVIDER TOURS
========================= */
router.get("/tours", getTours);
router.get("/tours/:id", getTourDetailController);
router.post("/tours", createNewTour);
router.put("/tours/:id", updateTourController);
router.patch("/tours/:id/status", updateTourStatusController);
router.delete("/tours/:id", deleteTourController);

/* =========================
   PROVIDER BOOKINGS
========================= */
router.get("/bookings", getBookings);
router.put("/bookings/:id", updateBooking);

/* =========================
   PROVIDER GUIDES
========================= */
router.get("/guides", getAllGuides);
router.post("/assign-guide", assignGuideController);

export default router;