import {
  getTourStats,
  listTours,
  updateTourStatus,
  deleteTourAdmin
} from "../models/adminToursModel.js";

export async function getAdminToursController(req, res) {
  try {
    const page = req.query.page ?? 1;
    const pageSize = req.query.pageSize ?? 7;
    const q = req.query.q ?? "";

    const [stats, list] = await Promise.all([getTourStats(), listTours({ page, pageSize, q })]);

    res.json({
      stats,
      tours: list.tours,
      paging: list.paging
    });
  } catch (err) {
    res.status(err?.statusCode || 500).json({
      message: err?.message || "Không tải được danh sách tour"
    });
  }
}

export async function patchAdminTourStatusController(req, res) {
  try {
    const tourId = req.params.id;
    const status = req.body?.status;
    const updated = await updateTourStatus(tourId, status);
    res.json({ item: updated });
  } catch (err) {
    res.status(err?.statusCode || 500).json({
      message: err?.message || "Cập nhật trạng thái tour thất bại"
    });
  }
}

export async function deleteAdminTourController(req, res) {
  try {
    const tourId = req.params.id;
    const result = await deleteTourAdmin(tourId);
    res.json({ deleted: result });
  } catch (err) {
    res.status(err?.statusCode || 500).json({
      message: err?.message || "Xóa tour thất bại"
    });
  }
}

