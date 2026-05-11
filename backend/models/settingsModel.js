import db from "../config/db.js";

const TABLE_NAME = "system_settings";

const DEFAULT_SETTINGS = Object.freeze({
  platform_name: "TravelTour",
  slogan: "Khám phá Việt Nam cùng TravelTour",
  timezone: "Asia/Ho_Chi_Minh",

  email_from: "noreply@traveltour.vn",
  email_support: "support@traveltour.vn",
  send_booking_confirmation_email: true,

  notify_new_booking: true,
  notify_new_review: true,
  /** Bật: đánh giá mới từ khách = approved ngay; Tắt: chờ admin duyệt (pending). */
  auto_approve_reviews: true,
  notify_new_provider: true,
  notify_pending_tour: true,

  theme_primary_color: "#00a63e",
  logo_url: null
});

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function normalizeString(value, { maxLen = 255, allowEmpty = false } = {}) {
  const s = String(value ?? "").trim();
  if (!allowEmpty && !s) return null;
  return s.length > maxLen ? s.slice(0, maxLen) : s;
}

function normalizeBool(value) {
  if (typeof value === "boolean") return value;
  if (value === 1 || value === "1" || value === "true") return true;
  if (value === 0 || value === "0" || value === "false") return false;
  return null;
}

function normalizeHexColor(value) {
  const s = normalizeString(value, { maxLen: 16, allowEmpty: false });
  if (!s) return null;
  const ok = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/.test(s);
  return ok ? s : null;
}

export async function ensureSettingsTable() {
  await db.query(
    `
    CREATE TABLE IF NOT EXISTS ${TABLE_NAME} (
      \`key\` VARCHAR(128) NOT NULL,
      \`value_json\` LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (\`key\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `
  );
}

export function getDefaultSettings() {
  return { ...DEFAULT_SETTINGS };
}

export async function getAllSettings() {
  await ensureSettingsTable();

  const [rows] = await db.query(
    `
    SELECT \`key\`, value_json
    FROM ${TABLE_NAME}
    `
  );

  const result = { ...DEFAULT_SETTINGS };

  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.value_json);
      result[row.key] = parsed;
    } catch {
      // ignore invalid JSON, keep default
    }
  }

  return result;
}

export async function updateSettings(partial = {}) {
  if (!isPlainObject(partial)) {
    const err = new Error("Payload settings không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  await ensureSettingsTable();

  const allowedKeys = new Set(Object.keys(DEFAULT_SETTINGS));
  const updates = {};

  for (const [k, v] of Object.entries(partial)) {
    if (!allowedKeys.has(k)) continue;
    updates[k] = v;
  }

  if (Object.keys(updates).length === 0) {
    return await getAllSettings();
  }

  const normalized = {};

  normalized.platform_name =
    "platform_name" in updates
      ? normalizeString(updates.platform_name, { maxLen: 120 })
      : undefined;
  normalized.slogan =
    "slogan" in updates ? normalizeString(updates.slogan, { maxLen: 200 }) : undefined;
  normalized.timezone =
    "timezone" in updates ? normalizeString(updates.timezone, { maxLen: 64 }) : undefined;

  normalized.email_from =
    "email_from" in updates ? normalizeString(updates.email_from, { maxLen: 180 }) : undefined;
  normalized.email_support =
    "email_support" in updates
      ? normalizeString(updates.email_support, { maxLen: 180 })
      : undefined;

  normalized.send_booking_confirmation_email =
    "send_booking_confirmation_email" in updates
      ? normalizeBool(updates.send_booking_confirmation_email)
      : undefined;

  normalized.notify_new_booking =
    "notify_new_booking" in updates ? normalizeBool(updates.notify_new_booking) : undefined;
  normalized.notify_new_review =
    "notify_new_review" in updates ? normalizeBool(updates.notify_new_review) : undefined;
  normalized.auto_approve_reviews =
    "auto_approve_reviews" in updates ? normalizeBool(updates.auto_approve_reviews) : undefined;
  normalized.notify_new_provider =
    "notify_new_provider" in updates ? normalizeBool(updates.notify_new_provider) : undefined;
  normalized.notify_pending_tour =
    "notify_pending_tour" in updates ? normalizeBool(updates.notify_pending_tour) : undefined;

  normalized.theme_primary_color =
    "theme_primary_color" in updates ? normalizeHexColor(updates.theme_primary_color) : undefined;

  if ("logo_url" in updates) {
    const url = normalizeString(updates.logo_url, { maxLen: 500, allowEmpty: true });
    normalized.logo_url = url ? url : null;
  } else {
    normalized.logo_url = undefined;
  }

  for (const [k, v] of Object.entries(normalized)) {
    if (v === undefined) continue;
    if (v === null && DEFAULT_SETTINGS[k] !== null) {
      // for non-nullable defaults, ignore null updates
      continue;
    }

    await db.query(
      `
      INSERT INTO ${TABLE_NAME} (\`key\`, value_json)
      VALUES (?, ?)
      ON DUPLICATE KEY UPDATE value_json = VALUES(value_json)
      `,
      [k, JSON.stringify(v)]
    );
  }

  return await getAllSettings();
}

