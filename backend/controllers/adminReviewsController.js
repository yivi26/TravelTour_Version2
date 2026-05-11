import {
  getReviewStats,
  listReviews,
  getReviewDetail,
  updateReviewStatus,
  deleteReview
} from "../models/adminReviewsModel.js";

export async function getAdminReviewsController(req, res) {
  try {
    const page = req.query.page ?? 1;
    const pageSize = req.query.pageSize ?? 6;
    const q = req.query.q ?? "";

    const [stats, list] = await Promise.all([
      getReviewStats(),
      listReviews({ page, pageSize, q })
    ]);

    res.json({
      stats,
      reviews: list.items,
      paging: list.paging
    });
  } catch (err) {
    res.status(err?.statusCode || 500).json({
      message: err?.message || "Không tải được danh sách đánh giá"
    });
  }
}

export async function getAdminReviewDetailController(req, res) {
  try {
    const reviewId = req.params.id;
    const item = await getReviewDetail(reviewId);
    res.json({ item });
  } catch (err) {
    res.status(err?.statusCode || 500).json({
      message: err?.message || "Không tải được chi tiết đánh giá"
    });
  }
}

export async function patchAdminReviewStatusController(req, res) {
  try {
    const reviewId = req.params.id;
    const status = req.body?.status;
    const admin_note = req.body?.admin_note ?? null;
    const updated = await updateReviewStatus(reviewId, status, admin_note);
    res.json({ item: updated });
  } catch (err) {
    res.status(err?.statusCode || 500).json({
      message: err?.message || "Cập nhật trạng thái đánh giá thất bại"
    });
  }
}

export async function deleteAdminReviewController(req, res) {
  try {
    const reviewId = req.params.id;
    const deleted = await deleteReview(reviewId);
    res.json({ deleted });
  } catch (err) {
    res.status(err?.statusCode || 500).json({
      message: err?.message || "Xóa đánh giá thất bại"
    });
  }
}

