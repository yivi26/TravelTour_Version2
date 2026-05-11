import { getAllSettings, updateSettings } from "../models/settingsModel.js";

export async function getSettingsController(req, res) {
  try {
    const settings = await getAllSettings();
    return res.status(200).json({
      message: "Lấy cài đặt hệ thống thành công",
      data: settings
    });
  } catch (err) {
    console.error("❌ GET SETTINGS ERROR:", err);
    return res.status(500).json({
      message: "Lỗi lấy cài đặt hệ thống",
      error: err.sqlMessage || err.message
    });
  }
}

export async function updateSettingsController(req, res) {
  try {
    const updated = await updateSettings(req.body);
    return res.status(200).json({
      message: "Cập nhật cài đặt hệ thống thành công",
      data: updated
    });
  } catch (err) {
    console.error("❌ UPDATE SETTINGS ERROR:", err);
    const status = Number(err?.statusCode || 500);
    return res.status(status).json({
      message:
        status === 400 ? err.message || "Dữ liệu cài đặt không hợp lệ" : "Lỗi cập nhật cài đặt",
      error: err.sqlMessage || err.message
    });
  }
}

