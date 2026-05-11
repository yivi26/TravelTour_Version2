import express from "express";
import uploadAvatar from "../middleware/uploadAvatar.js";
import authMiddleware from "../middleware/authMiddleware.js";
import requireCustomerRole from "../middleware/requireCustomerRole.js";
import {
  getCustomerProfile,
  updateCustomerProfile,
  changePassword,
  updateCustomerAvatar,
  postCustomerTourReview,
  deleteCustomerTourReview,
} from "../controllers/customerController.js";

const router = express.Router();
router.use(authMiddleware);

router.post("/tours/:tourId/reviews", requireCustomerRole, postCustomerTourReview);
router.delete("/reviews/:reviewId", requireCustomerRole, deleteCustomerTourReview);

router.get("/profile", getCustomerProfile);
router.put("/profile", updateCustomerProfile);
router.put("/change-password", changePassword);

router.post("/avatar", uploadAvatar.single("avatar"), updateCustomerAvatar);

export default router;
