import db from "../config/db.js";
import { buildPages, normalizeKeyword, toNumber } from "../utils/modelHelpers.js";

function formatVnd(value) {
  return toNumber(value).toLocaleString("vi-VN");
}

function mapBookingStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s === "pending_payment") return { label: "Thanh toán đang chờ xử lý", key: "pending" };
  if (s === "pending" || s === "cancel_requested")
    return { label: "Chờ xử lý", key: "pending" };
  if (s === "confirmed" || s === "paid")
    return { label: "Thành công", key: "confirmed" };
  if (s === "in_progress") return { label: "Đang thực hiện", key: "confirmed" };
  if (s === "completed") return { label: "Đã hoàn thành", key: "completed" };
  if (s === "cancelled" || s === "refunded") return { label: "Đã hủy", key: "cancelled" };
  return { label: "Chờ xử lý", key: "pending" };
}

export async function getBookingStats() {
  const [[totalRow]] = await db.query(`SELECT COUNT(*) AS total FROM bookings`);
  const [[pendingRow]] = await db.query(
    `SELECT COUNT(*) AS total FROM bookings WHERE status IN ('pending','pending_payment','cancel_requested')`
  );
  const [[confirmedRow]] = await db.query(
    `SELECT COUNT(*) AS total FROM bookings WHERE status IN ('confirmed','paid','in_progress')`
  );
  const [[completedRow]] = await db.query(
    `SELECT COUNT(*) AS total FROM bookings WHERE status = 'completed'`
  );

  return {
    total: toNumber(totalRow?.total),
    pending: toNumber(pendingRow?.total),
    confirmed: toNumber(confirmedRow?.total),
    completed: toNumber(completedRow?.total)
  };
}

export async function listBookings({ page = 1, pageSize = 7, q = "" } = {}) {
  const safePageSize = Math.max(5, Math.min(50, toNumber(pageSize, 7)));
  const safePage = Math.max(1, toNumber(page, 1));
  const keyword = normalizeKeyword(q);

  let where = "";
  const params = [];
  if (keyword) {
    where = `
      WHERE (
        b.booking_code LIKE ?
        OR u.full_name LIKE ?
        OR u.email LIKE ?
        OR t.title LIKE ?
      )
    `;
    const like = `%${keyword}%`;
    params.push(like, like, like, like);
  }

  const [[countRow]] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM bookings b
    LEFT JOIN users u ON u.id = b.user_id
    JOIN tours t ON t.id = b.tour_id
    LEFT JOIN tour_schedules s ON s.id = b.schedule_id
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
      b.id,
      b.booking_code,
      b.status,
      b.contact_name,
      b.num_adults,
      b.num_children,
      b.num_infants,
      b.final_price,
      b.booked_at,
      u.full_name AS customer_name,
      t.title AS tour_title,
      s.departure_date
    FROM bookings b
    LEFT JOIN users u ON u.id = b.user_id
    JOIN tours t ON t.id = b.tour_id
    LEFT JOIN tour_schedules s ON s.id = b.schedule_id
    ${where}
    ORDER BY b.booked_at DESC, b.id DESC
    LIMIT ? OFFSET ?
    `,
    [...params, safePageSize, offset]
  );

  const items = (rows || []).map((r) => {
    const status = mapBookingStatus(r.status);
    const people =
      toNumber(r.num_adults) + toNumber(r.num_children) + toNumber(r.num_infants);
    return {
      id: toNumber(r.id),
      code: r.booking_code,
      customerName: r.customer_name || r.contact_name || "",
      tourTitle: r.tour_title || "",
      departureDate: r.departure_date || null,
      people,
      amount: `${formatVnd(r.final_price)} VND`,
      status: status.label,
      statusKey: status.key,
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
      text: `Hiển thị ${from}–${to} trong ${total.toLocaleString("vi-VN")} booking`,
      pages: buildPages(currentPage, totalPages)
    }
  };
}

export async function getBookingDetail(bookingId) {
  const id = toNumber(bookingId, 0);
  if (!id) {
    const err = new Error("ID booking không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const [rows] = await db.query(
    `
    SELECT
      b.*,
      u.full_name AS customer_name,
      u.email AS customer_email,
      u.phone AS customer_phone,
      t.title AS tour_title,
      t.location AS tour_location,
      p.company_name AS provider_name,
      s.departure_date,
      s.return_date
    FROM bookings b
    JOIN users u ON u.id = b.user_id
    JOIN tours t ON t.id = b.tour_id
    LEFT JOIN providers p ON p.id = t.provider_id
    LEFT JOIN tour_schedules s ON s.id = b.schedule_id
    WHERE b.id = ?
    LIMIT 1
    `,
    [id]
  );

  if (!rows.length) {
    const err = new Error("Không tìm thấy booking");
    err.statusCode = 404;
    throw err;
  }

  const r = rows[0];
  const status = mapBookingStatus(r.status);
  return {
    id: toNumber(r.id),
    booking_code: r.booking_code,
    status: r.status,
    statusLabel: status.label,
    customer: {
      name: r.customer_name || "",
      email: r.customer_email || "",
      phone: r.customer_phone || ""
    },
    tour: {
      title: r.tour_title || "",
      location: r.tour_location || "",
      provider: r.provider_name || ""
    },
    schedule: {
      departure_date: r.departure_date || null,
      return_date: r.return_date || null
    },
    people: {
      adults: toNumber(r.num_adults),
      children: toNumber(r.num_children),
      infants: toNumber(r.num_infants)
    },
    prices: {
      total_price: toNumber(r.total_price),
      discount_amount: toNumber(r.discount_amount),
      final_price: toNumber(r.final_price)
    },
    contact: {
      name: r.contact_name || "",
      phone: r.contact_phone || "",
      email: r.contact_email || ""
    },
    booked_at: r.booked_at || null,
    updated_at: r.updated_at || null
  };
}

export async function updateBookingStatusAdmin(bookingId, status) {
  const id = toNumber(bookingId, 0);
  if (!id) {
    const err = new Error("ID booking không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const allowed = new Set([
    "pending",
    "confirmed",
    "paid",
    "in_progress",
    "completed",
    "cancelled",
    "refunded"
  ]);
  const s = String(status || "").toLowerCase();
  if (!allowed.has(s)) {
    const err = new Error("Trạng thái booking không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const [[exists]] = await db.query(`SELECT id FROM bookings WHERE id = ? LIMIT 1`, [id]);
  if (!exists) {
    const err = new Error("Không tìm thấy booking");
    err.statusCode = 404;
    throw err;
  }

  await db.query(`UPDATE bookings SET status = ? WHERE id = ?`, [s, id]);
  const mapped = mapBookingStatus(s);
  return { id, status: s, statusLabel: mapped.label, statusKey: mapped.key };
}

