import db from "../config/db.js";
import { getAllSettings } from "./settingsModel.js";
import { toNumber } from "../utils/modelHelpers.js";

function safeDateIso(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

async function tryQuery(sql, params = []) {
  try {
    const [rows] = await db.query(sql, params);
    return Array.isArray(rows) ? rows : [];
  } catch {
    return [];
  }
}

export async function getAdminNotifications({ limit = 12 } = {}) {
  const settings = await getAllSettings();

  const notifications = [];
  const safeLimit = Math.max(1, Math.min(50, toNumber(limit) || 12));

  if (settings.notify_new_booking) {
    const rows = await tryQuery(
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
      [safeLimit]
    );

    for (const r of rows) {
      notifications.push({
        id: `booking-${r.id}`,
        type: "booking",
        title: `Booking mới: ${r.customer_name || "Khách hàng"}`,
        subtitle: r.tour_title || "Tour",
        date: safeDateIso(r.booked_at),
        href: "qlibooking.html",
        tone: "green"
      });
    }
  }

  if (settings.notify_pending_tour) {
    const rows = await tryQuery(
      `
      SELECT id, title, created_at
      FROM tours
      WHERE status IN ('pending', 'draft')
      ORDER BY created_at DESC, id DESC
      LIMIT ?
      `,
      [safeLimit]
    );

    for (const r of rows) {
      notifications.push({
        id: `tour-${r.id}`,
        type: "pending_tour",
        title: "Tour cần phê duyệt",
        subtitle: r.title || "Tour",
        date: safeDateIso(r.created_at),
        href: "qlitour.html",
        tone: "orange"
      });
    }
  }

  if (settings.notify_new_provider) {
    const rows = await tryQuery(
      `
      SELECT id, company_name, created_at, status
      FROM providers
      ORDER BY created_at DESC, id DESC
      LIMIT ?
      `,
      [safeLimit]
    );

    for (const r of rows) {
      const status = String(r.status || "").toLowerCase();
      notifications.push({
        id: `provider-${r.id}`,
        type: "provider",
        title: "Nhà cung cấp mới",
        subtitle: r.company_name || "Nhà cung cấp",
        date: safeDateIso(r.created_at),
        href: "qlinhacungcap.html",
        tone: status === "active" ? "blue" : "purple"
      });
    }
  }

  if (settings.notify_new_review) {
    // Best-effort: if there's a reviews table, show latest. If not, return empty.
    const rows = await tryQuery(
      `
      SELECT id, rating, content, created_at
      FROM reviews
      ORDER BY created_at DESC, id DESC
      LIMIT ?
      `,
      [safeLimit]
    );

    for (const r of rows) {
      notifications.push({
        id: `review-${r.id}`,
        type: "review",
        title: "Đánh giá mới",
        subtitle:
          (r.content && String(r.content).trim().slice(0, 60)) ||
          (r.rating ? `Rating: ${r.rating}/5` : "Có đánh giá mới"),
        date: safeDateIso(r.created_at),
        href: "qlidanhgia.html",
        tone: "purple"
      });
    }
  }

  // sort newest first by date string then stable
  notifications.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  return {
    enabled: {
      notify_new_booking: Boolean(settings.notify_new_booking),
      notify_new_review: Boolean(settings.notify_new_review),
      notify_new_provider: Boolean(settings.notify_new_provider),
      notify_pending_tour: Boolean(settings.notify_pending_tour)
    },
    total: notifications.length,
    items: notifications.slice(0, safeLimit)
  };
}

