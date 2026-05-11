import { getGuideStats, listGuides, setGuideActive } from "../models/adminGuidesModel.js";

export async function getAdminGuidesController(req, res) {
  try {
    const page = req.query.page ?? 1;
    const pageSize = req.query.pageSize ?? 7;
    const q = req.query.q ?? "";

    const [stats, list] = await Promise.all([
      getGuideStats(),
      listGuides({ page, pageSize, q })
    ]);

    res.json({
      stats,
      guides: list.guides,
      paging: list.paging
    });
  } catch (err) {
    res.status(err?.statusCode || 500).json({
      message: err?.message || "Không tải được danh sách hướng dẫn viên"
    });
  }
}

export async function patchAdminGuideActiveController(req, res) {
  try {
    const guideId = req.params.id;
    const isActive = req.body?.is_active;
    if (typeof isActive !== "boolean") {
      return res.status(400).json({ message: "Thiếu is_active (boolean)" });
    }

    const updated = await setGuideActive(guideId, isActive);
    res.json({ item: updated });
  } catch (err) {
    res.status(err?.statusCode || 500).json({
      message: err?.message || "Cập nhật trạng thái hướng dẫn viên thất bại"
    });
  }
}

