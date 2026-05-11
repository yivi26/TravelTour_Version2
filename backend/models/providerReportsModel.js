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
  return `T${String(month).padStart(2, "0")}/${year}`;
}

function buildLastNMonths(n = 6) {
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
  return ["confirmed", "paid", "in_progress", "completed"];
}

/**
 * Dữ liệu trả về KHỚP với frontend `frontend/assets/js/provider/report.js`.
 */
export async function getProviderReportOverview({
  providerId,
  months = 6,
  topLimit = 5
} = {}) {
  const nMonths = clampInt(months, 3, 24, 6);
  const safeTopLimit = clampInt(topLimit, 3, 10, 5);

  const monthBuckets = buildLastNMonths(nMonths);
  const monthKeys = monthBuckets.map((m) => m.key);
  const revenueStatuses = allowedRevenueStatuses();

  const [[totalRevenueRow]] = await db.query(
    `
    SELECT COALESCE(SUM(COALESCE(b.final_price, 0)), 0) AS total
    FROM bookings b
    JOIN tours t ON t.id = b.tour_id
    WHERE t.provider_id = ?
      AND b.booked_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      AND b.status IN (?)
    `,
    [providerId, nMonths, revenueStatuses]
  );

  const [[totalBookingsRow]] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM bookings b
    JOIN tours t ON t.id = b.tour_id
    WHERE t.provider_id = ?
      AND b.booked_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
    `,
    [providerId, nMonths]
  );

  const [[totalCustomersRow]] = await db.query(
    `
    SELECT COUNT(DISTINCT b.user_id) AS total
    FROM bookings b
    JOIN tours t ON t.id = b.tour_id
    WHERE t.provider_id = ?
      AND b.booked_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
    `,
    [providerId, nMonths]
  );

  const totalRevenueVnd = toNumber(totalRevenueRow?.total);
  const totalBookings = toNumber(totalBookingsRow?.total);
  const totalCustomers = toNumber(totalCustomersRow?.total);
  const avgRevenuePerMonthVnd = nMonths > 0 ? totalRevenueVnd / nMonths : 0;

  // Monthly revenue (frontend chart tick đang append "M" -> render triệu VND)
  const [revRows] = await db.query(
    `
    SELECT
      DATE_FORMAT(b.booked_at, '%Y-%m') AS ym,
      COALESCE(SUM(COALESCE(b.final_price, 0)), 0) AS total
    FROM bookings b
    JOIN tours t ON t.id = b.tour_id
    WHERE t.provider_id = ?
      AND b.booked_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
      AND b.status IN (?)
    GROUP BY DATE_FORMAT(b.booked_at, '%Y-%m')
    ORDER BY ym ASC
    `,
    [providerId, nMonths, revenueStatuses]
  );

  const revMap = new Map((revRows || []).map((r) => [String(r.ym), toNumber(r.total)]));

  const monthlyRevenue = monthBuckets.map((m) => {
    const vnd = revMap.get(m.key) || 0;
    const valueMillion = toNumber(Number((vnd / 1_000_000).toFixed(2)));
    return { label: m.label, value: valueMillion };
  });

  // Monthly bookings
  const [bookRows] = await db.query(
    `
    SELECT
      DATE_FORMAT(b.booked_at, '%Y-%m') AS ym,
      COUNT(*) AS total
    FROM bookings b
    JOIN tours t ON t.id = b.tour_id
    WHERE t.provider_id = ?
      AND b.booked_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
    GROUP BY DATE_FORMAT(b.booked_at, '%Y-%m')
    ORDER BY ym ASC
    `,
    [providerId, nMonths]
  );

  const bookMap = new Map((bookRows || []).map((r) => [String(r.ym), toNumber(r.total)]));

  const monthlyBookings = monthBuckets.map((m) => ({
    label: m.label,
    value: bookMap.get(m.key) || 0
  }));

  // Top tours by booking count (kèm revenue theo tour để render bảng)
  const [topRows] = await db.query(
    `
    SELECT
      t.id,
      t.title,
      COUNT(*) AS bookings,
      COALESCE(SUM(CASE WHEN b.status IN (?) THEN COALESCE(b.final_price, 0) ELSE 0 END), 0) AS revenue_vnd
    FROM bookings b
    JOIN tours t ON t.id = b.tour_id
    WHERE t.provider_id = ?
      AND b.booked_at >= DATE_SUB(CURDATE(), INTERVAL ? MONTH)
    GROUP BY t.id, t.title
    ORDER BY bookings DESC, t.id DESC
    LIMIT ?
    `,
    [revenueStatuses, providerId, nMonths, safeTopLimit]
  );

  const topTours = (topRows || []).map((r) => ({
    id: toNumber(r.id),
    name: r.title || "Không tên",
    bookings: toNumber(r.bookings),
    revenue: toNumber(r.revenue_vnd)
  }));

  const rateDenom = totalRevenueVnd > 0 ? totalRevenueVnd : 1;

  const revenueTable = topTours.map((t) => {
    const ratePct = (t.revenue / rateDenom) * 100;
    return {
      id: t.id,
      name: t.name,
      bookings: t.bookings,
      revenue: t.revenue,
      rate: `${ratePct.toFixed(0)}%`
    };
  });

  const popularTours = topTours.map((t) => ({
    name: t.name,
    value: t.bookings
  }));

  return {
    stats: {
      totalRevenue6Months: totalRevenueVnd,
      totalBookings,
      avgRevenuePerMonth: avgRevenuePerMonthVnd,
      totalCustomers
    },
    monthlyRevenue,
    monthlyBookings,
    topTours,
    revenueTable,
    popularTours
  };
}

