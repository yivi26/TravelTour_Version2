import { getAdminDashboardData } from "../models/adminDashboardModel.js";

export async function getAdminDashboardController(req, res) {
  try {
    const data = await getAdminDashboardData({
      limitBookings: Number(req.query.limitBookings || 8),
      limitPopular: Number(req.query.limitPopular || 5)
    });

    return res.status(200).json({
      message: "Lấy dữ liệu tổng quan admin thành công",
      data
    });
  } catch (err) {
    console.error("❌ ADMIN DASHBOARD ERROR:", err);
    return res.status(500).json({
      message: "Lỗi lấy dữ liệu tổng quan admin",
      error: err.sqlMessage || err.message
    });
  }
}

