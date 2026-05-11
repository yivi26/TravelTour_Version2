import {
  getBookingStats,
  listBookings,
  getBookingDetail,
  updateBookingStatusAdmin
} from "../models/adminBookingsModel.js";

export async function getAdminBookingsController(req, res) {
  try {
    const page = req.query.page ?? 1;
    const pageSize = req.query.pageSize ?? 7;
    const q = req.query.q ?? "";

    const [stats, list] = await Promise.all([
      getBookingStats(),
      listBookings({ page, pageSize, q })
    ]);

    res.json({
      stats,
      bookings: list.items,
      paging: list.paging
    });
  } catch (err) {
    res.status(err?.statusCode || 500).json({
      message: err?.message || "Không tải được danh sách booking"
    });
  }
}

export async function getAdminBookingDetailController(req, res) {
  try {
    const bookingId = req.params.id;
    const item = await getBookingDetail(bookingId);
    res.json({ item });
  } catch (err) {
    res.status(err?.statusCode || 500).json({
      message: err?.message || "Không tải được chi tiết booking"
    });
  }
}

export async function patchAdminBookingStatusController(req, res) {
  try {
    const bookingId = req.params.id;
    const status = req.body?.status;
    const updated = await updateBookingStatusAdmin(bookingId, status);
    res.json({ item: updated });
  } catch (err) {
    res.status(err?.statusCode || 500).json({
      message: err?.message || "Cập nhật trạng thái booking thất bại"
    });
  }
}

