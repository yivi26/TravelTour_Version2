import db from "../config/db.js";
import { toNumber } from "../utils/modelHelpers.js";

function formatShortVnd(value) {
  const n = toNumber(value);
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)} tỷ`;
  if (n >= 1_000_000) return `${Math.round(n / 1_000_000)} triệu`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${Math.round(n)}`;
}

async function safeScalarQuery(sql, params = [], fallback = 0) {
  try {
    const [[row]] = await db.query(sql, params);
    const firstKey = row ? Object.keys(row)[0] : null;
    return firstKey ? row[firstKey] : fallback;
  } catch {
    return fallback;
  }
}

export async function getAdminDashboardData({ limitBookings = 8, limitPopular = 5 } = {}) {
  const totalBookings = await safeScalarQuery(`SELECT COUNT(*) AS total FROM bookings`, [], 0);
  const totalTours = await safeScalarQuery(`SELECT COUNT(*) AS total FROM tours`, [], 0);
  const totalUsers = await safeScalarQuery(`SELECT COUNT(*) AS total FROM users`, [], 0);

  // Revenue: prefer sum of tour.final_price for confirmed/completed bookings; fallback to base_price
  const revenueMonth = await safeScalarQuery(
    `
    SELECT COALESCE(SUM(COALESCE(t.final_price, t.base_price, 0)), 0) AS total
    FROM bookings b
    JOIN tours t ON t.id = b.tour_id
    WHERE b.status IN ('confirmed', 'completed')
      AND MONTH(b.booked_at) = MONTH(CURDATE())
      AND YEAR(b.booked_at) = YEAR(CURDATE())
    `,
    [],
    0
  );

  // Khớp qlinhacungcap / adminProvidersModel: NCC "đã phê duyệt" lưu approved (active được normalize -> approved)
  const providersCount = await safeScalarQuery(
    `SELECT COUNT(*) AS total FROM providers WHERE LOWER(TRIM(status)) IN ('active','approved')`,
    [],
    0
  );

  const guidesCount = await safeScalarQuery(`SELECT COUNT(*) AS total FROM guides`, [], 0);

  // Avg rating + total reviews (best-effort). If reviews table doesn't exist, use guides.rating_avg as proxy.
  const avgRating = await safeScalarQuery(
    `SELECT COALESCE(AVG(COALESCE(rating_avg, 0)), 0) AS avg_rating FROM guides`,
    [],
    0
  );
  const totalReviews = await safeScalarQuery(
    `SELECT COALESCE(SUM(CASE WHEN rating_avg IS NOT NULL AND rating_avg > 0 THEN 1 ELSE 0 END), 0) AS total FROM guides`,
    [],
    0
  );

  let recentBookings = [];
  try {
    const [rows] = await db.query(
      `
      SELECT
        b.id,
        b.status,
        b.booked_at,
        u.full_name AS customer_name,
        t.title AS tour_title
      FROM bookings b
      LEFT JOIN users u ON u.id = b.user_id
      LEFT JOIN tours t ON t.id = b.tour_id
      ORDER BY b.booked_at DESC, b.id DESC
      LIMIT ?
      `,
      [toNumber(limitBookings)]
    );
    recentBookings = rows || [];
  } catch {
    recentBookings = [];
  }

  let popularTours = [];
  try {
    const [rows] = await db.query(
      `
      SELECT
        t.id,
        t.title,
        COUNT(*) AS total_bookings,
        COALESCE(SUM(COALESCE(t.final_price, t.base_price, 0)), 0) AS revenue
      FROM bookings b
      JOIN tours t ON t.id = b.tour_id
      WHERE b.status IN ('confirmed', 'completed')
      GROUP BY t.id, t.title
      ORDER BY total_bookings DESC, revenue DESC
      LIMIT ?
      `,
      [toNumber(limitPopular)]
    );
    popularTours = rows || [];
  } catch {
    popularTours = [];
  }

  const mapBookingStatus = (status) => {
    const s = String(status || "").toLowerCase();
    if (s.includes("confirm")) return { label: "Đã xác nhận", type: "success" };
    if (s.includes("complete")) return { label: "Đã hoàn thành", type: "info" };
    if (s.includes("cancel")) return { label: "Đã hủy", type: "negative" };
    if (s.includes("pend") || s.includes("wait")) return { label: "Chờ xử lý", type: "warning" };
    return { label: status || "Không rõ", type: "info" };
  };

  return {
    stats: [
      {
        title: "Tổng số booking",
        value: toNumber(totalBookings).toLocaleString("vi-VN"),
        change: "",
        icon: "booking"
      },
      {
        title: "Doanh thu tháng",
        value: `${formatShortVnd(revenueMonth)} VNĐ`,
        change: "",
        icon: "money"
      },
      {
        title: "Tổng số tour",
        value: toNumber(totalTours).toLocaleString("vi-VN"),
        change: "",
        icon: "tour"
      },
      {
        title: "Tổng số người dùng",
        value: toNumber(totalUsers).toLocaleString("vi-VN"),
        change: "",
        icon: "users"
      }
    ],
    highlights: [
      {
        title: "Nhà cung cấp đang hoạt động",
        value: toNumber(providersCount).toLocaleString("vi-VN"),
        note: "",
        tone: "green"
      },
      {
        title: "Hướng dẫn viên hoạt động",
        value: toNumber(guidesCount).toLocaleString("vi-VN"),
        note: "",
        tone: "blue"
      },
      {
        title: "Đánh giá trung bình",
        value: `${toNumber(avgRating).toFixed(1)}/5.0`,
        note: totalReviews ? `Từ ${toNumber(totalReviews).toLocaleString("vi-VN")} đánh giá` : "",
        tone: "purple"
      }
    ],
    bookings: recentBookings.map((b) => {
      const mapped = mapBookingStatus(b.status);
      const d = b.booked_at ? new Date(b.booked_at) : null;
      const date = d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : "";
      return {
        name: b.customer_name || "Khách hàng",
        tour: b.tour_title || "Tour",
        date,
        status: mapped.label,
        statusType: mapped.type
      };
    }),
    popularTours: popularTours.map((t, idx) => ({
      rank: idx + 1,
      name: t.title || "Tour",
      bookings: toNumber(t.total_bookings),
      revenue: formatShortVnd(t.revenue)
    }))
  };
}

