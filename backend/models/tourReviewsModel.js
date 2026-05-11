import db from "../config/db.js";
import { toNumber } from "../utils/modelHelpers.js";
import { getAllSettings } from "./settingsModel.js";

const ELIGIBLE_BOOKING_STATUSES = ["confirmed", "paid", "in_progress", "completed"];

function formatDdMmYyyy(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export async function getTourReviewSummaryAndList(tourId, { limit = 50 } = {}) {
  const tid = toNumber(tourId, 0);
  if (!tid) {
    const err = new Error("ID tour không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const [[exists]] = await db.query(`SELECT id FROM tours WHERE id = ? LIMIT 1`, [tid]);
  if (!exists) {
    const err = new Error("Không tìm thấy tour");
    err.statusCode = 404;
    throw err;
  }

  const [[agg]] = await db.query(
    `
    SELECT
      COUNT(*) AS total,
      COALESCE(AVG(rating), 0) AS avg_rating
    FROM reviews
    WHERE tour_id = ? AND status = 'approved'
    `,
    [tid]
  );

  const total = toNumber(agg?.total);
  const avgRating = total > 0 ? Math.round(Number(agg.avg_rating) * 10) / 10 : 0;

  const [distRows] = await db.query(
    `
    SELECT rating, COUNT(*) AS cnt
    FROM reviews
    WHERE tour_id = ? AND status = 'approved'
    GROUP BY rating
    `,
    [tid]
  );

  const distMap = Object.fromEntries((distRows || []).map((r) => [toNumber(r.rating), toNumber(r.cnt)]));
  const distribution = [5, 4, 3, 2, 1].map((stars) => {
    const count = distMap[stars] || 0;
    const pct = total > 0 ? Math.round((count / total) * 1000) / 10 : 0;
    return { stars, count, percent: pct };
  });

  const safeLimit = Math.min(100, Math.max(1, toNumber(limit, 50)));
  const [reviewRows] = await db.query(
    `
    SELECT
      r.id,
      r.rating,
      r.comment,
      r.created_at,
      u.full_name,
      u.avatar_url
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    WHERE r.tour_id = ? AND r.status = 'approved'
    ORDER BY r.created_at DESC, r.id DESC
    LIMIT ?
    `,
    [tid, safeLimit]
  );

  const reviews = (reviewRows || []).map((r) => ({
    id: toNumber(r.id),
    rating: toNumber(r.rating),
    comment: r.comment || "",
    dateText: formatDdMmYyyy(r.created_at),
    userName: r.full_name || "Khách hàng",
    userAvatarUrl: r.avatar_url || "",
  }));

  return {
    tourId: tid,
    summary: {
      average: avgRating,
      total,
      distribution,
    },
    reviews,
  };
}

export async function findEligibleBookingForReview(userId, tourId) {
  const uid = toNumber(userId, 0);
  const tid = toNumber(tourId, 0);
  if (!uid || !tid) return null;

  const placeholders = ELIGIBLE_BOOKING_STATUSES.map(() => "?").join(", ");
  const [rows] = await db.query(
    `
    SELECT b.id
    FROM bookings b
    WHERE b.user_id = ?
      AND b.tour_id = ?
      AND b.status IN (${placeholders})
      AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.booking_id = b.id)
    ORDER BY (b.status = 'completed') DESC, b.id DESC
    LIMIT 1
    `,
    [uid, tid, ...ELIGIBLE_BOOKING_STATUSES]
  );

  if (!rows?.length) return null;
  return toNumber(rows[0].id);
}

export async function countPendingReviewsOnTour(userId, tourId) {
  const uid = toNumber(userId, 0);
  const tid = toNumber(tourId, 0);
  if (!uid || !tid) return 0;
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS c FROM reviews WHERE user_id = ? AND tour_id = ? AND status = 'pending'`,
    [uid, tid]
  );
  return toNumber(row?.c);
}

export async function getMyLatestReviewOnTour(userId, tourId) {
  const uid = toNumber(userId, 0);
  const tid = toNumber(tourId, 0);
  if (!uid || !tid) return null;

  const [rows] = await db.query(
    `
    SELECT id, rating, comment, status, created_at
    FROM reviews
    WHERE user_id = ? AND tour_id = ?
    ORDER BY created_at DESC, id DESC
    LIMIT 1
    `,
    [uid, tid]
  );

  if (!rows?.length) return null;
  const r = rows[0];
  const st = String(r.status || "").toLowerCase();
  return {
    id: toNumber(r.id),
    rating: toNumber(r.rating),
    comment: r.comment || "",
    status: st,
    dateText: formatDdMmYyyy(r.created_at),
  };
}

export async function createTourReview({ userId, tourId, rating, comment }) {
  const uid = toNumber(userId, 0);
  const tid = toNumber(tourId, 0);
  const stars = toNumber(rating, 0);
  const text = String(comment ?? "").trim();

  if (!uid || !tid) {
    const err = new Error("Thiếu thông tin người dùng hoặc tour");
    err.statusCode = 400;
    throw err;
  }
  if (stars < 1 || stars > 5) {
    const err = new Error("Điểm đánh giá từ 1 đến 5 sao");
    err.statusCode = 400;
    throw err;
  }
  if (text.length < 10) {
    const err = new Error("Nội dung đánh giá ít nhất 10 ký tự");
    err.statusCode = 400;
    throw err;
  }
  if (text.length > 2000) {
    const err = new Error("Nội dung đánh giá tối đa 2000 ký tự");
    err.statusCode = 400;
    throw err;
  }

  const pendingCount = await countPendingReviewsOnTour(uid, tid);
  if (pendingCount > 0) {
    const err = new Error("Bạn đang có đánh giá chờ duyệt cho tour này");
    err.statusCode = 409;
    throw err;
  }

  const bookingId = await findEligibleBookingForReview(uid, tid);
  if (!bookingId) {
    const err = new Error("Bạn cần có booking đã xác nhận/thanh toán cho tour này và chưa đánh giá");
    err.statusCode = 403;
    throw err;
  }

  const [[dup]] = await db.query(
    `SELECT id FROM reviews WHERE booking_id = ? LIMIT 1`,
    [bookingId]
  );
  if (dup) {
    const err = new Error("Booking này đã được đánh giá");
    err.statusCode = 409;
    throw err;
  }

  const settings = await getAllSettings();
  const autoApprove = settings.auto_approve_reviews !== false;
  const status = autoApprove ? "approved" : "pending";

  const [result] = await db.query(
    `
    INSERT INTO reviews (user_id, tour_id, booking_id, rating, title, comment, status, created_at)
    VALUES (?, ?, ?, ?, '', ?, ?, NOW())
    `,
    [uid, tid, bookingId, stars, text, status]
  );

  return { id: toNumber(result.insertId), status, bookingId, autoApproved: autoApprove };
}

export async function deleteOwnTourReview(userId, reviewId) {
  const uid = toNumber(userId, 0);
  const rid = toNumber(reviewId, 0);
  if (!uid || !rid) {
    const err = new Error("Thông tin không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const [rows] = await db.query(
    `SELECT id, status FROM reviews WHERE id = ? AND user_id = ? LIMIT 1`,
    [rid, uid]
  );
  if (!rows?.length) {
    const err = new Error("Không tìm thấy đánh giá");
    err.statusCode = 404;
    throw err;
  }
  const st = String(rows[0].status || "").toLowerCase();
  if (st !== "pending") {
    const err = new Error("Chỉ có thể xóa đánh giá đang chờ duyệt");
    err.statusCode = 403;
    throw err;
  }

  await db.query(`DELETE FROM reviews WHERE id = ?`, [rid]);
  return { id: rid };
}
