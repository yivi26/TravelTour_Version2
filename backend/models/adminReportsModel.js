import db from "../config/db.js";
import { toNumber } from "../utils/modelHelpers.js";

function clampInt(value, min, max, fallback) {
  const n = Number.parseInt(String(value), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

function monthKey(year, month) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function monthLabel(year, month) {
  // e.g. "T04/2026"
  return `T${String(month).padStart(2, "0")}/${year}`;
}

function buildLastNMonths(n = 12) {
  const now = new Date();
  const months = [];
  const d = new Date(now.getFullYear(), now.getMonth(), 1);
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d.getFullYear(), d.getMonth() - i, 1);
    const y = x.getFullYear();
    const m = x.getMonth() + 1;
    months.push({ year: y, month: m, key: monthKey(y, m), label: monthLabel(y, m) });
  }
  return months;
}

function allowedRevenueStatuses() {
  // treat these as "revenue realized"
  return ["confirmed", "paid", "in_progress", "completed"];
}

export async function getAdminReportOverview({ months = 12, topLimit = 5 } = {}) {
  const nMonths = clampInt(months, 3, 24, 12);
  const safeTopLimit = clampInt(topLimit, 3, 10, 5);
  const monthBuckets = buildLastNMonths(nMonths);
  const monthKeys = monthBuckets.map((m) => m.key);

  const revenueStatuses = allowedRevenueStatuses();

  const [[totalRevenueRow]] = await db.query(
    `
    SELECT COALESCE(SUM(COALESCE(final_price, 0)), 0) AS total
    FROM bookings
    WHERE status IN (?)
    `,
    [revenueStatuses]
  );

  const [[totalBookingsRow]] = await db.query(`SELECT COUNT(*) AS total FROM bookings`);

  const [[newUsersRow]] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM users
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
    `,
    [nMonths]
  );

  // Growth: compare bookings in last N months vs previous N months
  const [[curBookingsRow]] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM bookings
    WHERE booked_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
    `,
    [nMonths]
  );
  const [[prevBookingsRow]] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM bookings
    WHERE booked_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      AND booked_at < DATE_SUB(CURDATE(), INTERVAL ? MONTH)
    `,
    [nMonths * 2, nMonths]
  );

  const curBookings = toNumber(curBookingsRow?.total);
  const prevBookings = toNumber(prevBookingsRow?.total);
  const growthPct = prevBookings > 0 ? ((curBookings - prevBookings) / prevBookings) * 100 : 0;

  // Monthly revenue series
  const [revRows] = await db.query(
    `
    SELECT
      DATE_FORMAT(booked_at, '%Y-%m') AS ym,
      COALESCE(SUM(COALESCE(final_price, 0)), 0) AS total
    FROM bookings
    WHERE booked_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      AND status IN (?)
    GROUP BY DATE_FORMAT(booked_at, '%Y-%m')
    ORDER BY ym ASC
    `,
    [nMonths, revenueStatuses]
  );
  const revMap = new Map((revRows || []).map((r) => [String(r.ym), toNumber(r.total)]));

  // Monthly bookings series
  const [bookRows] = await db.query(
    `
    SELECT
      DATE_FORMAT(booked_at, '%Y-%m') AS ym,
      COUNT(*) AS total
    FROM bookings
    WHERE booked_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
    GROUP BY DATE_FORMAT(booked_at, '%Y-%m')
    ORDER BY ym ASC
    `,
    [nMonths]
  );
  const bookMap = new Map((bookRows || []).map((r) => [String(r.ym), toNumber(r.total)]));

  const monthlyRevenue = monthBuckets.map((m) => {
    const vnd = revMap.get(m.key) || 0;
    // baocao.html shows unit "Tỷ VNĐ" -> return billions
    const value = Number((vnd / 1_000_000_000).toFixed(2));
    return { label: m.label, value };
  });

  const monthlyBookings = monthBuckets.map((m) => ({
    label: m.label,
    value: bookMap.get(m.key) || 0
  }));

  // Popular tours (for pie chart): top by booking count in last N months
  const [popularRows] = await db.query(
    `
    SELECT
      t.id,
      t.title,
      COUNT(*) AS total
    FROM bookings b
    JOIN tours t ON t.id = b.tour_id
    WHERE b.booked_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
    GROUP BY t.id, t.title
    ORDER BY total DESC, t.id DESC
    LIMIT ?
    `,
    [nMonths, safeTopLimit]
  );

  const popularTours = (popularRows || []).map((r) => ({
    id: toNumber(r.id),
    name: r.title || "Không tên",
    value: toNumber(r.total)
  }));

  // Top tour list: same as popular but include bookings
  const topTours = popularTours.map((p) => ({ id: p.id, name: p.name, bookings: p.value }));

  const stats = {
    totalRevenueVnd: toNumber(totalRevenueRow?.total),
    totalBookings: toNumber(totalBookingsRow?.total),
    newUsers: toNumber(newUsersRow?.total),
    growthPct: Number(growthPct.toFixed(1))
  };

  return {
    stats,
    monthlyRevenue,
    monthlyBookings,
    popularTours,
    topTours
  };
}

