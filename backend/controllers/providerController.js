import db from "../config/db.js";

import {
  getToursByProvider,
  getTourById,
  createTour,
  updateTour,
  deleteTour,
  updateTourStatus,
  getBookingsByProvider,
  updateBookingStatus,
  getGuides,
  getToursForGuideAssignment,
  assignGuideToTour,
  getProviderProfile,
  updateProviderProfile,
  getDashboardDataByProvider,
  getProviderNotifications,
  getPublicFeaturedTours,
  getPublicTours,
  getPublicDiscountedTours,
  getPublicTourById,
} from "../models/providerModel.js";
import { getProviderReportOverview } from "../models/providerReportsModel.js";

const PROVIDER_ID = 1;

function normalizeTourPayload(body = {}) {
  return {
    title: String(body.title || "").trim(),
    slug: String(body.slug || "").trim(),
    code: String(body.code || "").trim(),
    description: String(body.description || body.short_description || "").trim(),
    short_description: String(
      body.short_description || body.description || "",
    ).trim(),
    location: String(body.location || "").trim(),
    meeting_point: String(body.meeting_point || "").trim(),

    latitude:
      body.latitude === "" ||
      body.latitude == null ||
      Number.isNaN(Number(body.latitude))
        ? null
        : Number(body.latitude),

    longitude:
      body.longitude === "" ||
      body.longitude == null ||
      Number.isNaN(Number(body.longitude))
        ? null
        : Number(body.longitude),

    base_price: Number(body.base_price || 0),
    sale_price: Number(body.sale_price || 0),
    tax_percent: Math.max(0, Number(body.tax_percent ?? 0)),
    tax: Math.max(0, Number(body.tax ?? 0)),
    final_price: Math.max(0, Number(body.final_price ?? 0)),
    duration_days: Number(body.duration_days || 1),
    duration_text: String(body.duration_text || "").trim(),
    max_capacity: Number(body.max_capacity || 0),

    thumbnail_url: String(body.thumbnail_url || "").trim() || null,
    includes: Array.isArray(body.includes) ? body.includes : [],
    excludes: Array.isArray(body.excludes) ? body.excludes : [],
    status: String(body.status || "draft").trim(),
    category_id: body.category_id ? Number(body.category_id) : null,
    itinerary: Array.isArray(body.itinerary) ? body.itinerary : [],
    gallery_images: Array.isArray(body.gallery_images)
      ? body.gallery_images
      : [],
    highlights: Array.isArray(body.highlights) ? body.highlights : [],
    start_date: body.start_date || null,
    end_date: body.end_date || null,
    hotel_info: String(body.hotel_info || "").trim(),
    transport_info: String(body.transport_info || "").trim(),
    cancel_policy: String(body.cancel_policy || "").trim(),
    terms_conditions: String(body.terms_conditions || "").trim(),
    other_notes: String(body.other_notes || "").trim(),
  };
}

function validateTourPayload(payload) {
  if (!payload.title) return "Vui lòng nhập tên tour";
  if (!payload.category_id) return "Vui lòng chọn danh mục";
  if (!payload.location) return "Vui lòng nhập điểm đến";

  if (!Number.isFinite(payload.max_capacity) || payload.max_capacity <= 0) {
    return "Số người tối đa không hợp lệ";
  }

  if (!Number.isFinite(payload.base_price) || payload.base_price <= 0) {
    return "Giá tour không hợp lệ";
  }

  if (!Number.isFinite(payload.sale_price) || payload.sale_price < 0) {
    return "Giá khuyến mãi không hợp lệ";
  }

  if (payload.sale_price > 0 && payload.sale_price >= payload.base_price) {
    return "Giá khuyến mãi phải nhỏ hơn giá tour";
  }

  if (!payload.short_description) {
    return "Vui lòng nhập mô tả ngắn";
  }

  if (payload.status === "active") {
    if (!payload.thumbnail_url) {
      return "Vui lòng chọn ảnh bìa chính";
    }

    if (!Array.isArray(payload.itinerary) || payload.itinerary.length === 0) {
      return "Vui lòng nhập ít nhất 1 ngày lịch trình";
    }
  }

  if (payload.start_date && payload.end_date) {
    const start = new Date(payload.start_date);
    const end = new Date(payload.end_date);

    if (
      !Number.isNaN(start.getTime()) &&
      !Number.isNaN(end.getTime()) &&
      start > end
    ) {
      return "Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu";
    }
  }

  return null;
}

/* =========================
   PUBLIC API CHO KHÁCH HÀNG
========================= */
export async function getPublicFeaturedToursController(req, res) {
  try {
    const limit = Number(req.query.limit || 6);
    const tours = await getPublicFeaturedTours(limit);

    return res.status(200).json({
      message: "Lấy danh sách tour nổi bật thành công",
      data: tours,
    });
  } catch (err) {
    console.error("❌ PUBLIC FEATURED TOURS ERROR:", err);
    return res.status(500).json({
      message: "Lỗi lấy tour nổi bật",
      error: err.sqlMessage || err.message,
    });
  }
}

export async function getPublicToursController(req, res) {
  try {
    const tours = await getPublicTours({
      destination: req.query.destination || "",
      limit: Number(req.query.limit || 20),
    });

    return res.status(200).json({
      message: "Lấy danh sách tour thành công",
      data: tours,
    });
  } catch (err) {
    console.error("❌ PUBLIC TOURS ERROR:", err);
    return res.status(500).json({
      message: "Lỗi lấy danh sách tour",
      error: err.sqlMessage || err.message,
    });
  }
}

export async function getPublicDiscountedToursController(req, res) {
  try {
    const limit = Number(req.query.limit || 6);
    const tours = await getPublicDiscountedTours(limit);

    return res.status(200).json({
      message: "Lấy danh sách tour ưu đãi thành công",
      data: tours,
    });
  } catch (err) {
    console.error("❌ PUBLIC DISCOUNTED TOURS ERROR:", err);
    return res.status(500).json({
      message: "Lỗi lấy tour ưu đãi",
      error: err.sqlMessage || err.message,
    });
  }
}

export async function getPublicTourDetailController(req, res) {
  try {
    const tourId = Number(req.params.id);

    if (!tourId) {
      return res.status(400).json({
        message: "ID tour không hợp lệ",
      });
    }

    const tour = await getPublicTourById(tourId);

    if (!tour) {
      return res.status(404).json({
        message: "Không tìm thấy tour",
      });
    }

    const [schedules] = await db.execute(
      `
      SELECT
        id,
        departure_date,
        return_date,
        available_slots,
        booked_slots,
        status
      FROM tour_schedules
      WHERE tour_id = ?
      ORDER BY departure_date ASC
      `,
      [tourId],
    );
    
    console.log("SCHEDULES FROM DB:", schedules);

    return res.status(200).json({
      message: "Lấy chi tiết tour thành công",
      data: {
        ...tour,
        schedules,
      },
    });
  } catch (err) {
    console.error("❌ PUBLIC TOUR DETAIL ERROR:", err);
    return res.status(500).json({
      message: "Lỗi lấy chi tiết tour",
      error: err.sqlMessage || err.message,
    });
  }
}

/* =========================
   PROVIDER DASHBOARD
========================= */
export async function getDashboardData(req, res) {
  try {
    const dashboardData = await getDashboardDataByProvider(PROVIDER_ID);

    return res.status(200).json({
      message: "Lấy dữ liệu dashboard thành công",
      data: dashboardData,
    });
  } catch (err) {
    console.error("❌ DASHBOARD ERROR:", err);
    return res.status(500).json({
      message: "Lỗi lấy dữ liệu dashboard",
      error: err.sqlMessage || err.message,
    });
  }
}

export async function getProviderNotificationsController(req, res) {
  try {
    const limit = Number(req.query.limit || 12);
    const data = await getProviderNotifications(PROVIDER_ID, limit);

    return res.status(200).json({
      message: "Lấy danh sách thông báo thành công",
      data,
    });
  } catch (err) {
    console.error("❌ PROVIDER NOTIFICATIONS ERROR:", err);
    return res.status(500).json({
      message: "Lỗi lấy danh sách thông báo",
      error: err.sqlMessage || err.message,
    });
  }
}

/* =========================
   PROVIDER PROFILE
========================= */
export async function getProfile(req, res) {
  try {
    const profile = await getProviderProfile(PROVIDER_ID);

    if (!profile) {
      return res.status(404).json({
        message: "Không tìm thấy hồ sơ provider",
      });
    }

    return res.status(200).json({ profile });
  } catch (err) {
    console.error("❌ GET PROFILE ERROR:", err);
    return res.status(500).json({
      message: "Lỗi lấy hồ sơ provider",
      error: err.sqlMessage || err.message,
    });
  }
}

export async function updateProfile(req, res) {
  try {
    const profile = await updateProviderProfile(PROVIDER_ID, req.body);

    return res.status(200).json({
      message: "Cập nhật hồ sơ provider thành công",
      profile,
    });
  } catch (err) {
    console.error("❌ UPDATE PROFILE ERROR:", err);
    return res.status(500).json({
      message: "Lỗi cập nhật hồ sơ provider",
      error: err.sqlMessage || err.message,
    });
  }
}

/* =========================
   PROVIDER REPORT
========================= */
export async function getProviderReportOverviewController(req, res) {
  try {
    const months = req.query?.months;
    const top = req.query?.top;

    const data = await getProviderReportOverview({
      providerId: PROVIDER_ID,
      months,
      topLimit: top
    });

    return res.json(data);
  } catch (err) {
    console.error("❌ PROVIDER REPORT ERROR:", err);
    return res.status(500).json({
      message: "Không thể tải dữ liệu báo cáo doanh thu",
      error: err?.sqlMessage || err?.message || "Unknown error"
    });
  }
}

/* =========================
   PROVIDER TOURS
========================= */
export async function getTours(req, res) {
  try {
    const tours = await getToursByProvider(PROVIDER_ID);

    return res.status(200).json({
      message: "Lấy danh sách tour thành công",
      data: tours,
    });
  } catch (err) {
    console.error("❌ TOUR ERROR:", err);
    return res.status(500).json({
      message: "Lỗi lấy tour",
      error: err.sqlMessage || err.message,
    });
  }
}

export async function getTourDetailController(req, res) {
  try {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "ID tour không hợp lệ",
      });
    }

    const tour = await getTourById(PROVIDER_ID, id);

    if (!tour) {
      return res.status(404).json({
        message: "Không tìm thấy tour",
      });
    }

    return res.status(200).json({
      message: "Lấy chi tiết tour thành công",
      data: tour,
    });
  } catch (err) {
    console.error("❌ GET TOUR DETAIL ERROR:", err);
    return res.status(500).json({
      message: "Lỗi lấy chi tiết tour",
      error: err.sqlMessage || err.message,
    });
  }
}

export async function createNewTour(req, res) {
  try {
    const payload = normalizeTourPayload(req.body);
    const validationError = validateTourPayload(payload);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    const tourId = await createTour(PROVIDER_ID, payload);

    return res.status(201).json({
      message: "Tạo tour thành công",
      data: {
        id: tourId,
      },
    });
  } catch (err) {
    console.error("❌ CREATE TOUR ERROR:", err);
    console.error("❌ SQL MESSAGE:", err.sqlMessage);
    console.error("❌ SQL CODE:", err.code);

    if (err?.code === "ER_NO_REFERENCED_ROW_2") {
      return res.status(400).json({
        message:
          "Không thể tạo tour vì provider_id không tồn tại trong bảng providers. Hãy tạo dữ liệu provider trước (hoặc đăng nhập provider để lấy đúng provider_id).",
        error: err.sqlMessage || err.message,
      });
    }

    return res.status(500).json({
      message: "Lỗi tạo tour",
      error: err.sqlMessage || err.message || "Unknown error",
    });
  }
}

export async function updateTourController(req, res) {
  try {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "ID tour không hợp lệ",
      });
    }

    const existedTour = await getTourById(PROVIDER_ID, id);

    if (!existedTour) {
      return res.status(404).json({
        message: "Không tìm thấy tour để cập nhật",
      });
    }

    const payload = normalizeTourPayload(req.body);
    const validationError = validateTourPayload(payload);

    if (validationError) {
      return res.status(400).json({
        message: validationError,
      });
    }

    await updateTour(PROVIDER_ID, id, payload);

    return res.status(200).json({
      message: "Cập nhật tour thành công",
    });
  } catch (err) {
    console.error("❌ UPDATE TOUR ERROR:", err);
    return res.status(500).json({
      message: "Lỗi cập nhật tour",
      error: err.sqlMessage || err.message,
    });
  }
}

export async function deleteTourController(req, res) {
  try {
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "ID tour không hợp lệ",
      });
    }

    const existedTour = await getTourById(PROVIDER_ID, id);

    if (!existedTour) {
      return res.status(404).json({
        message: "Không tìm thấy tour để xóa",
      });
    }

    await deleteTour(id);

    return res.status(200).json({
      message: "Xóa tour thành công",
    });
  } catch (err) {
    console.error("❌ DELETE TOUR ERROR:", err);
    return res.status(500).json({
      message: "Lỗi xóa tour",
      error: err.sqlMessage || err.message,
    });
  }
}

export async function updateTourStatusController(req, res) {
  try {
    const { status } = req.body;
    const id = Number(req.params.id);

    if (!id) {
      return res.status(400).json({
        message: "ID tour không hợp lệ",
      });
    }

    if (!status) {
      return res.status(400).json({
        message: "Thiếu trạng thái tour",
      });
    }

    const allowedStatuses = ["draft", "active", "paused", "archived", "full"];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Trạng thái tour không hợp lệ",
      });
    }

    const existedTour = await getTourById(PROVIDER_ID, id);

    if (!existedTour) {
      return res.status(404).json({
        message: "Không tìm thấy tour",
      });
    }

    await updateTourStatus(id, status);

    return res.status(200).json({
      message: "Cập nhật trạng thái tour thành công",
    });
  } catch (err) {
    console.error("❌ UPDATE TOUR STATUS ERROR:", err);
    return res.status(500).json({
      message: "Lỗi cập nhật trạng thái tour",
      error: err.sqlMessage || err.message,
    });
  }
}

export async function getToursForGuideAssignmentController(req, res) {
  try {
    const tours = await getToursForGuideAssignment(PROVIDER_ID);

    return res.status(200).json({
      message: "Lấy danh sách tour để phân công HDV thành công",
      data: tours,
    });
  } catch (err) {
    console.error("❌ GET TOURS FOR GUIDE ASSIGNMENT ERROR:", err);
    return res.status(500).json({
      message: "Lỗi lấy danh sách tour để phân công HDV",
      error: err.sqlMessage || err.message,
    });
  }
}

/* =========================
   PROVIDER BOOKINGS
========================= */
export async function getBookings(req, res) {
  try {
    const bookings = await getBookingsByProvider(PROVIDER_ID);
    return res.status(200).json(bookings);
  } catch (err) {
    console.error("❌ BOOKING ERROR:", err);
    return res.status(500).json({
      message: "Lỗi booking",
      error: err.sqlMessage || err.message,
    });
  }
}

export async function updateBooking(req, res) {
  try {
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({
        message: "Thiếu trạng thái booking",
      });
    }

    await updateBookingStatus(req.params.id, status);

    return res.status(200).json({
      message: "Cập nhật booking thành công",
    });
  } catch (err) {
    console.error("❌ UPDATE BOOKING ERROR:", err);
    return res.status(500).json({
      message: "Lỗi update booking",
      error: err.sqlMessage || err.message,
    });
  }
}

/* =========================
   PROVIDER GUIDES
========================= */
export async function getAllGuides(req, res) {
  try {
    const guides = await getGuides(PROVIDER_ID);
    return res.status(200).json(guides);
  } catch (err) {
    console.error("❌ GUIDE ERROR:", err);
    return res.status(500).json({
      message: "Lỗi guide",
      error: err.sqlMessage || err.message,
    });
  }
}

export async function assignGuideToTourController(req, res) {
  try {
    const { tourId, guideId } = req.body;

    if (!tourId || !guideId) {
      return res.status(400).json({
        message: "Thiếu tourId hoặc guideId",
      });
    }

    const updatedTour = await assignGuideToTour(
      PROVIDER_ID,
      Number(tourId),
      Number(guideId),
    );

    return res.status(200).json({
      message: "Phân công thành công",
      data: updatedTour,
    });
  } catch (err) {
    console.error("❌ ASSIGN GUIDE TO TOUR ERROR:", err);
    return res.status(500).json({
      message: err.message || "Lỗi phân công guide cho tour",
      error: err.sqlMessage || err.message,
    });
  }
}