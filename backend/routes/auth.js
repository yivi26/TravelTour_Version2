import express from "express";
import {
  login,
  register,
  googleLogin,
  getGoogleClientId
} from "../controllers/authController.js";

const router = express.Router();

router.get("/google-client-id", getGoogleClientId);
router.post("/register", register);
router.post("/login", login);
router.post("/google-login", googleLogin);

export default router;