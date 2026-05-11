import db from "../config/db.js";
import { buildPages, normalizeKeyword, toNumber } from "../utils/modelHelpers.js";

function mapStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s === "approved") return { label: "Đã duyệt", key: "published" };
  if (s === "pending") return { label: "Chờ duyệt", key: "pending" };
  if (s === "hidden") return { label: "Đã ẩn", key: "hidden" };
  if (s === "rejected") return { label: "Từ chối", key: "hidden" };
  return { label: s, key: "pending" };
}

function safeDateDdMmYyyy(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

export async function getReviewStats() {
  const [[totalRow]] = await db.query(`SELECT COUNT(*) AS total FROM reviews`);
  const [[avgRow]] = await db.query(`SELECT COALESCE(AVG(rating),0) AS avg_rating FROM reviews`);
  const [[pendingRow]] = await db.query(
    `SELECT COUNT(*) AS total FROM reviews WHERE status = 'pending'`
  );
  const [[flaggedRow]] = await db.query(
    `SELECT COUNT(*) AS total FROM reviews WHERE rating <= 2 AND status <> 'hidden'`
  );

  return {
    total: toNumber(totalRow?.total),
    avg: Number(avgRow?.avg_rating || 0),
    pending: toNumber(pendingRow?.total),
    flagged: toNumber(flaggedRow?.total)
  };
}

export async function listReviews({ page = 1, pageSize = 6, q = "" } = {}) {
  const safePageSize = Math.max(5, Math.min(50, toNumber(pageSize, 6)));
  const safePage = Math.max(1, toNumber(page, 1));
  const keyword = normalizeKeyword(q);

  let where = "";
  const params = [];
  if (keyword) {
    where = `
      WHERE (
        u.full_name LIKE ?
        OR u.email LIKE ?
        OR t.title LIKE ?
        OR r.comment LIKE ?
        OR r.title LIKE ?
      )
    `;
    const like = `%${keyword}%`;
    params.push(like, like, like, like, like);
  }

  const [[countRow]] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    JOIN tours t ON t.id = r.tour_id
    ${where}
    `,
    params
  );

  const total = toNumber(countRow?.total);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const currentPage = Math.min(safePage, totalPages);
  const offset = (currentPage - 1) * safePageSize;

  const [rows] = await db.query(
    `
    SELECT
      r.id,
      r.rating,
      r.comment,
      r.status,
      r.created_at,
      u.full_name AS customer_name,
      u.email AS customer_email,
      t.title AS tour_title
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    JOIN tours t ON t.id = r.tour_id
    ${where}
    ORDER BY r.created_at DESC, r.id DESC
    LIMIT ? OFFSET ?
    `,
    [...params, safePageSize, offset]
  );

  const items = (rows || []).map((r) => {
    const st = mapStatus(r.status);
    return {
      id: toNumber(r.id),
      customer: {
        name: r.customer_name || "",
        email: r.customer_email || ""
      },
      tour: { title: r.tour_title || "" },
      rating: toNumber(r.rating),
      comment: r.comment || "",
      dateText: safeDateDdMmYyyy(r.created_at),
      status: st.label,
      statusKey: st.key,
      rawStatus: r.status || ""
    };
  });

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + safePageSize, total);

  return {
    items,
    paging: {
      page: currentPage,
      pageSize: safePageSize,
      total,
      totalPages,
      text: `Hiển thị ${from}–${to} trong tổng số ${total.toLocaleString("vi-VN")} đánh giá`,
      pages: buildPages(currentPage, totalPages)
    }
  };
}

export async function getReviewDetail(reviewId) {
  const id = toNumber(reviewId, 0);
  if (!id) {
    const err = new Error("ID đánh giá không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const [rows] = await db.query(
    `
    SELECT
      r.*,
      u.full_name AS customer_name,
      u.email AS customer_email,
      u.phone AS customer_phone,
      t.title AS tour_title,
      t.location AS tour_location
    FROM reviews r
    JOIN users u ON u.id = r.user_id
    JOIN tours t ON t.id = r.tour_id
    WHERE r.id = ?
    LIMIT 1
    `,
    [id]
  );

  if (!rows.length) {
    const err = new Error("Không tìm thấy đánh giá");
    err.statusCode = 404;
    throw err;
  }

  const r = rows[0];
  const st = mapStatus(r.status);
  return {
    id: toNumber(r.id),
    booking_id: toNumber(r.booking_id),
    rating: toNumber(r.rating),
    title: r.title || "",
    comment: r.comment || "",
    status: r.status,
    statusLabel: st.label,
    created_at: r.created_at || null,
    customer: {
      name: r.customer_name || "",
      email: r.customer_email || "",
      phone: r.customer_phone || ""
    },
    tour: {
      title: r.tour_title || "",
      location: r.tour_location || ""
    },
    photos: r.photos || null,
    admin_note: r.admin_note || ""
  };
}

export async function updateReviewStatus(reviewId, status, admin_note = null) {
  const id = toNumber(reviewId, 0);
  if (!id) {
    const err = new Error("ID đánh giá không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const allowed = new Set(["pending", "approved", "rejected", "hidden"]);
  const s = String(status || "").toLowerCase();
  if (!allowed.has(s)) {
    const err = new Error("Trạng thái đánh giá không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const [[exists]] = await db.query(`SELECT id FROM reviews WHERE id = ? LIMIT 1`, [id]);
  if (!exists) {
    const err = new Error("Không tìm thấy đánh giá");
    err.statusCode = 404;
    throw err;
  }

  await db.query(`UPDATE reviews SET status = ?, admin_note = ? WHERE id = ?`, [s, admin_note, id]);
  const mapped = mapStatus(s);
  return { id, status: s, statusLabel: mapped.label, statusKey: mapped.key };
}

export async function deleteReview(reviewId) {
  const id = toNumber(reviewId, 0);
  if (!id) {
    const err = new Error("ID đánh giá không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const [[exists]] = await db.query(`SELECT id FROM reviews WHERE id = ? LIMIT 1`, [id]);
  if (!exists) {
    const err = new Error("Không tìm thấy đánh giá");
    err.statusCode = 404;
    throw err;
  }

  await db.query(`DELETE FROM reviews WHERE id = ?`, [id]);
  return { id };
}

