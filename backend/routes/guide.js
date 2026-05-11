import express from "express";
import {
  getGuideDashboardController,
  getGuideSchedulesController,
  getCurrentToursController,
  getGuideCustomersController,
  getGuideIncomeController,
  getGuideProfileController
} from "../controllers/guideController.js";

const router = express.Router();

router.get("/dashboard", getGuideDashboardController);
router.get("/schedules", getGuideSchedulesController);
router.get("/current-tours", getCurrentToursController);
router.get("/customers", getGuideCustomersController);
router.get("/income", getGuideIncomeController);
router.get("/profile", getGuideProfileController);

export default router;