import db from "../config/db.js";
import { buildPages, normalizeKeyword, toNumber } from "../utils/modelHelpers.js";

function formatShortVnd(value) {
  const n = toNumber(value, 0);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}K`;
  return String(n);
}

function mapTourStatus(status) {
  const s = String(status || "").toLowerCase();
  // tours.status in schema: draft/active/paused/archived/full
  if (s === "draft") return { label: "Chờ duyệt", key: "pending" };
  if (s === "archived") return { label: "Đã lưu trữ", key: "archived" };
  return { label: "Đã duyệt", key: "approved" };
}

function resolveTourFinalPrice(row) {
  const basePrice = toNumber(row?.base_price, 0);
  const salePrice = toNumber(row?.sale_price, 0);
  const appliedPrice = salePrice > 0 && salePrice < basePrice ? salePrice : basePrice;
  const taxPercent = Math.max(0, toNumber(row?.tax_percent, 0));
  const taxValue = Math.max(0, toNumber(row?.tax, 0));
  const finalPriceValue = Math.max(0, toNumber(row?.final_price, 0));

  if (taxPercent <= 0) {
    return finalPriceValue > 0 ? finalPriceValue : appliedPrice;
  }

  if (finalPriceValue > 0) {
    return finalPriceValue;
  }

  if (taxValue > 0) {
    return appliedPrice + taxValue;
  }

  return appliedPrice + Math.round(appliedPrice * (taxPercent / 100));
}

export async function getTourStats() {
  const [[totalRow]] = await db.query(`SELECT COUNT(*) AS total FROM tours`);
  const [[approvedRow]] = await db.query(
    `SELECT COUNT(*) AS total FROM tours WHERE status <> 'draft'`
  );
  const [[pendingRow]] = await db.query(`SELECT COUNT(*) AS total FROM tours WHERE status = 'draft'`);
  const [[avgPriceRow]] = await db.query(
    `SELECT COALESCE(AVG(base_price), 0) AS avg_price FROM tours`
  );

  const total = toNumber(totalRow?.total);
  const approved = toNumber(approvedRow?.total);
  const pending = toNumber(pendingRow?.total);
  const avgPrice = toNumber(avgPriceRow?.avg_price);

  return [
    { label: "Tổng số tour", value: total.toLocaleString("vi-VN"), tone: "default" },
    { label: "Đã duyệt", value: approved.toLocaleString("vi-VN"), tone: "approved" },
    { label: "Chờ duyệt", value: pending.toLocaleString("vi-VN"), tone: "pending" },
    { label: "Giá trung bình", value: formatShortVnd(avgPrice), tone: "price" }
  ];
}

export async function listTours({ page = 1, pageSize = 7, q = "" } = {}) {
  const safePageSize = Math.max(5, Math.min(50, toNumber(pageSize, 7)));
  const safePage = Math.max(1, toNumber(page, 1));
  const keyword = normalizeKeyword(q);

  let where = "";
  const params = [];
  if (keyword) {
    where = `
      WHERE (
        t.title LIKE ?
        OR t.location LIKE ?
        OR p.company_name LIKE ?
      )
    `;
    const like = `%${keyword}%`;
    params.push(like, like, like);
  }

  const [[countRow]] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM tours t
    LEFT JOIN providers p ON p.id = t.provider_id
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
      t.id,
      t.title,
      t.location,
      t.status,
      t.base_price,
      t.sale_price,
      t.tax_percent,
      t.tax,
      t.final_price,
      t.max_capacity,
      p.company_name AS provider_name,
      (
        SELECT COUNT(*)
        FROM bookings b
        WHERE b.tour_id = t.id
          AND b.status IN ('confirmed','completed','pending')
      ) AS booked_count
    FROM tours t
    LEFT JOIN providers p ON p.id = t.provider_id
    ${where}
    ORDER BY t.created_at DESC, t.id DESC
    LIMIT ? OFFSET ?
    `,
    [...params, safePageSize, offset]
  );

  const tours = (rows || []).map((r) => {
    const mapped = mapTourStatus(r.status);
    const booked = toNumber(r.booked_count);
    const cap = Math.max(0, toNumber(r.max_capacity));
    const finalPrice = resolveTourFinalPrice(r);
    return {
      id: toNumber(r.id),
      name: r.title || "Tour",
      supplier: r.provider_name || "",
      guide: "",
      slots: `${Math.min(booked, cap)}/${cap}`,
      price: finalPrice.toLocaleString("vi-VN"),
      status: mapped.label,
      statusKey: mapped.key,
      location: r.location || "",
      rawStatus: r.status || ""
    };
  });

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + safePageSize, total);

  return {
    tours,
    paging: {
      page: currentPage,
      pageSize: safePageSize,
      total,
      totalPages,
      text: `Hiển thị ${from}-${to} trong ${total.toLocaleString("vi-VN")} tour`,
      pages: buildPages(currentPage, totalPages)
    }
  };
}

export async function updateTourStatus(tourId, status) {
  const id = toNumber(tourId, 0);
  if (!id) {
    const err = new Error("ID tour không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const allowed = new Set(["draft", "active", "paused", "archived", "full"]);
  const s = String(status || "").toLowerCase();
  if (!allowed.has(s)) {
    const err = new Error("Trạng thái tour không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  await db.query(`UPDATE tours SET status = ? WHERE id = ?`, [s, id]);
  const [[row]] = await db.query(
    `SELECT id, title, status, location FROM tours WHERE id = ? LIMIT 1`,
    [id]
  );
  if (!row) {
    const err = new Error("Không tìm thấy tour");
    err.statusCode = 404;
    throw err;
  }
  const mapped = mapTourStatus(row.status);
  return { id: toNumber(row.id), name: row.title || "", status: mapped.label, statusKey: mapped.key };
}

export async function deleteTourAdmin(tourId) {
  const id = toNumber(tourId, 0);
  if (!id) {
    const err = new Error("ID tour không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const [[exists]] = await db.query(`SELECT id FROM tours WHERE id = ? LIMIT 1`, [id]);
  if (!exists) {
    const err = new Error("Không tìm thấy tour");
    err.statusCode = 404;
    throw err;
  }

  // Hard delete with child cleanup.
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`DELETE FROM tour_images WHERE tour_id = ?`, [id]);
    await conn.query(`DELETE FROM tour_category_map WHERE tour_id = ?`, [id]);
    await conn.query(`DELETE FROM bookings WHERE tour_id = ?`, [id]);
    await conn.query(`DELETE FROM tours WHERE id = ?`, [id]);
    await conn.commit();
    return { id };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

