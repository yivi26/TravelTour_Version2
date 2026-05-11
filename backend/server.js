import express from "express";
import cors from "cors";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import { fileURLToPath } from "url";

dotenv.config();

import authRoutes from "./routes/auth.js";
import providerRoutes from "./routes/provider.js";
import { ensureDefaultAdmin } from "./models/userModel.js";
import chatbotRoutes from "./routes/chatbot.js";
import guideRoutes from "./routes/guide.js";
import bookingRoutes from "./routes/booking.js";
import customerRoutes from "./routes/customer.js";
import paymentRoutes from "./routes/payment.js";

// 👉 giữ debug của bạn
console.log("=== ENV DEBUG ===");
console.log("KEY EXISTS:", !!process.env.OPENROUTER_API_KEY);
console.log("=================");

// 👉 thêm từ Nhat (admin + settings)
import settingsRoutes from "./routes/settings.js";
import adminDashboardRoutes from "./routes/adminDashboard.js";

const app = express();

/* =========================
   FIX __dirname CHO ESM
========================= */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDirInBackend = path.join(__dirname, "uploads");
const uploadsDirOutsideBackend = path.join(__dirname, "../uploads");

const resolvedUploadsDir = fs.existsSync(uploadsDirOutsideBackend)
  ? uploadsDirOutsideBackend
  : uploadsDirInBackend;

if (!fs.existsSync(resolvedUploadsDir)) {
  fs.mkdirSync(resolvedUploadsDir, { recursive: true });
}

dotenv.config({ path: path.join(__dirname, ".env") });

/* =========================
   MIDDLEWARE
========================= */
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Tránh log lỗi 404 favicon trong trình duyệt
app.get("/favicon.ico", (req, res) => res.status(204).end());

/* =========================
   SERVE FILE TĨNH FRONTEND
========================= */
app.use(
  express.static(path.join(__dirname, "../frontend"), {
    index: false,
  }),
);

/* =========================
   SERVE FILE ẢNH UPLOAD
========================= */
app.use("/uploads", express.static(resolvedUploadsDir));

/* =========================
   ROUTE PAGE FRONTEND
========================= */
app.get("/", (req, res) => {
  return res.sendFile(path.join(__dirname, "../frontend/index.html"));
});

app.get("/login", (req, res) => {
  return res.sendFile(
    path.join(__dirname, "../frontend/pages/dangnhap/login.html"),
  );
});

app.get("/register", (req, res) => {
  return res.sendFile(
    path.join(__dirname, "../frontend/pages/dangnhap/register.html"),
  );
});

/* =========================
   API TEST
========================= */
app.get("/api/test", (req, res) => {
  return res.status(200).json({
    message: "API OK",
  });
});

app.get("/api/uploads/images", (req, res) => {
  try {
    const entries = fs.readdirSync(resolvedUploadsDir, { withFileTypes: true });

    const imageFiles = entries
      .filter((entry) => entry.isFile())
      .map((entry) => entry.name)
      .filter((name) => /\.(jpe?g|png|webp|gif|bmp|svg)$/i.test(name))
      .map((name) => ({
        name,
        url: `/uploads/${encodeURIComponent(name)}`,
      }));

    return res.status(200).json({
      message: "Lấy danh sách ảnh thành công",
      data: imageFiles,
    });
  } catch (error) {
    return res.status(500).json({
      message: "Không thể đọc danh sách ảnh upload",
      error: error?.message || "Unknown error",
    });
  }
});

/* =========================
   API ROUTES
========================= */
app.use("/api/auth", authRoutes);
app.use("/api/provider", providerRoutes);
app.use("/api/chatbot", chatbotRoutes);
app.use("/api/guide", guideRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/customer", customerRoutes);
app.use("/api/payments", paymentRoutes);

// 👉 thêm admin + settings
app.use("/api/settings", settingsRoutes);
app.use("/api/admin", adminDashboardRoutes);

/* =========================
   404 API
========================= */
app.use("/api", (req, res) => {
  return res.status(404).json({
    message: "API không tồn tại",
  });
});

/* =========================
   404 PAGE
========================= */
app.use((req, res) => {
  return res.status(404).send("Không tìm thấy trang");
});

/* =========================
   GLOBAL ERROR HANDLER
========================= */
app.use((err, req, res, next) => {
  console.error("❌ SERVER ERROR:", err);
  console.error("❌ SQL MESSAGE:", err?.sqlMessage);
  console.error("❌ SQL CODE:", err?.code);
  console.error("❌ SQL ERRNO:", err?.errno);

  return res.status(500).json({
    message: "Lỗi server nội bộ",
    error: err?.sqlMessage || err?.message || "Unknown error",
  });
});

/* =========================
   START SERVER
========================= */
const PORT = Number(process.env.PORT || 3000);

(async () => {
  try {
    await ensureDefaultAdmin();
  } catch (err) {
    console.warn("⚠️ Không seed được admin:", err?.message || err);
  }

  app.listen(PORT, () => {
    console.log(`✅ Server chạy tại: http://localhost:${PORT}`);
  });
})();