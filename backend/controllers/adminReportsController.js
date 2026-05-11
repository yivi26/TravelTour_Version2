import { getAdminReportOverview } from "../models/adminReportsModel.js";

export async function getAdminReportsOverviewController(req, res) {
  try {
    const months = req.query?.months;
    const topLimit = req.query?.top;
    const data = await getAdminReportOverview({ months, topLimit });
    return res.json(data);
  } catch (err) {
    console.error("getAdminReportsOverviewController error:", err);
    return res.status(500).json({ message: "Không thể tải dữ liệu báo cáo." });
  }
}

