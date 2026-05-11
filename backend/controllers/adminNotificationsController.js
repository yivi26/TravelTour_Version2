import { getAdminNotifications } from "../models/adminNotificationsModel.js";

export async function getAdminNotificationsController(req, res) {
  try {
    const data = await getAdminNotifications({
      limit: Number(req.query.limit || 12)
    });

    return res.status(200).json({
      message: "Lấy danh sách thông báo thành công",
      data
    });
  } catch (err) {
    console.error("❌ ADMIN NOTIFICATIONS ERROR:", err);
    return res.status(500).json({
      message: "Lỗi lấy danh sách thông báo",
      error: err.sqlMessage || err.message
    });
  }
}

