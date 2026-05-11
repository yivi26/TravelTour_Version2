import nodemailer from "nodemailer";
import db from "../config/db.js";

/** Hỗ trợ cả SMTP_* và EMAIL_* (project đang dùng EMAIL_* trong .env). */
function getMailConfig() {
  const host = String(
    process.env.SMTP_HOST || process.env.EMAIL_HOST || "",
  ).trim();
  const user = String(
    process.env.SMTP_USER || process.env.EMAIL_USER || "",
  ).trim();
  const pass = String(
    process.env.SMTP_PASS || process.env.EMAIL_PASS || "",
  ).trim();
  const port = Number(process.env.SMTP_PORT || process.env.EMAIL_PORT || 587);
  const secureRaw =
    process.env.SMTP_SECURE || process.env.EMAIL_SECURE || "";
  const secure =
    String(secureRaw).toLowerCase() === "true" || port === 465;
  const from = String(
    process.env.SMTP_FROM || process.env.EMAIL_FROM || "",
  ).trim();
  return { host, user, pass, port, secure, from };
}

function createMailTransport() {
  const { host, user, pass, port, secure } = getMailConfig();
  if (!host || !user || !pass) return null;
  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
}

function resolveFromAddress() {
  const { from, user } = getMailConfig();
  if (from) return from;
  return user ? `"TravelTour" <${user}>` : user;
}

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatMoneyVnd(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return new Intl.NumberFormat("vi-VN").format(Math.round(num)) + " đ";
}

function formatDateVi(d) {
  if (!d) return "—";
  const dt = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(dt.getTime())) return escapeHtml(String(d));
  return dt.toLocaleDateString("vi-VN", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function buildPaymentSuccessHtml(data) {
  const brand = escapeHtml(process.env.MAIL_BRAND_NAME || "TravelTour");
  const {
    fullName,
    bookingCode,
    tourName,
    departureDate,
    amount,
    paymentLabel,
  } = data;

  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Thanh toán thành công</title>
</head>
<body style="margin:0;padding:0;background:#0f1419;font-family:'Segoe UI',Tahoma,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0f1419;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:560px;background:#1a2332;border-radius:16px;overflow:hidden;box-shadow:0 24px 48px rgba(0,0,0,.35);">
          <tr>
            <td style="background:linear-gradient(135deg,#1e8bc3 0%,#0d5f8a 50%,#0a4a6d 100%);padding:28px 28px 32px;text-align:center;">
              <div style="display:inline-block;width:56px;height:56px;background:rgba(255,255,255,.15);border-radius:14px;line-height:56px;font-size:28px;margin-bottom:12px;">✓</div>
              <h1 style="margin:0;color:#fff;font-size:22px;font-weight:700;letter-spacing:-.02em;">Thanh toán thành công</h1>
              <p style="margin:10px 0 0;color:rgba(255,255,255,.88);font-size:14px;">Cảm ơn bạn đã tin tưởng ${brand}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 28px 8px;">
              <p style="margin:0 0 16px;color:#c8d4e6;font-size:15px;line-height:1.6;">
                Xin chào <strong style="color:#fff;">${escapeHtml(fullName)}</strong>,<br>
                Đơn đặt tour của bạn đã được thanh toán qua <strong style="color:#4ecdc4;">${escapeHtml(paymentLabel)}</strong> và đang được xác nhận trong hệ thống.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#243044;border-radius:12px;border:1px solid rgba(255,255,255,.06);">
                <tr>
                  <td style="padding:18px 20px;">
                    <p style="margin:0 0 12px;color:#8fa3bf;font-size:11px;text-transform:uppercase;letter-spacing:.12em;">Chi tiết booking</p>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;color:#e8eef5;">
                      <tr><td style="padding:6px 0;color:#8fa3bf;width:42%;">Mã đặt tour</td><td style="padding:6px 0;font-weight:600;color:#fff;">${escapeHtml(bookingCode)}</td></tr>
                      <tr><td style="padding:6px 0;color:#8fa3bf;">Tour</td><td style="padding:6px 0;">${escapeHtml(tourName)}</td></tr>
                      <tr><td style="padding:6px 0;color:#8fa3bf;">Khởi hành</td><td style="padding:6px 0;">${departureDate}</td></tr>
                      <tr><td style="padding:6px 0;color:#8fa3bf;">Số tiền</td><td style="padding:6px 0;font-weight:700;color:#4ecdc4;font-size:16px;">${escapeHtml(amount)}</td></tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin:22px 0 0;color:#7a8fa3;font-size:13px;line-height:1.55;">
                Bạn có thể xem lại lịch sử đặt tour trong tài khoản. Nếu cần hỗ trợ, hãy liên hệ đội ngũ ${brand}.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:0 28px 28px;">
              <p style="margin:0;padding-top:20px;border-top:1px solid rgba(255,255,255,.08);color:#5c6d82;font-size:12px;text-align:center;">
                Đây là email tự động, vui lòng không trả lời trực tiếp.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function loadBookingMailContext(bookingId) {
  const [rows] = await db.execute(
    `
    SELECT
      b.booking_code,
      b.final_price,
      b.contact_name,
      u.email,
      u.full_name,
      t.title AS tour_name,
      ts.departure_date
    FROM bookings b
    JOIN users u ON u.id = b.user_id
    JOIN tours t ON t.id = b.tour_id
    LEFT JOIN tour_schedules ts ON ts.id = b.schedule_id
    WHERE b.id = ?
    LIMIT 1
    `,
    [bookingId],
  );
  return rows[0] || null;
}

/**
 * Gửi email xác nhận thanh toán MoMo (HTML).
 * Cần cấu hình mail: SMTP_* hoặc EMAIL_* (HOST, PORT, USER, PASS).
 * Tùy chọn: SMTP_FROM / EMAIL_FROM, SMTP_SECURE, MAIL_BRAND_NAME.
 */
export async function sendMomoPaymentSuccessEmail(bookingId) {
  const transport = createMailTransport();
  if (!transport) {
    console.warn(
      "[momo mail] Bỏ qua gửi email: thiếu SMTP_HOST/EMAIL_HOST hoặc USER/PASS",
    );
    return { sent: false, reason: "no_smtp" };
  }

  const row = await loadBookingMailContext(bookingId);
  if (!row?.email) {
    console.warn("[momo mail] Không có email user cho booking", bookingId);
    return { sent: false, reason: "no_email" };
  }

  const fullName = row.full_name || row.contact_name || "Quý khách";
  const html = buildPaymentSuccessHtml({
    fullName,
    bookingCode: row.booking_code,
    tourName: row.tour_name || "Tour",
    departureDate: formatDateVi(row.departure_date),
    amount: formatMoneyVnd(row.final_price),
    paymentLabel: "Ví MoMo",
  });

  const from = resolveFromAddress();
  if (!from) {
    console.warn("[momo mail] Thiếu địa chỉ người gửi (FROM / USER)");
    return { sent: false, reason: "no_from" };
  }

  await transport.sendMail({
    from,
    to: row.email,
    subject: `Thanh toán MoMo thành công — ${row.booking_code}`,
    html,
    text: `Xin chào ${fullName}. Thanh toán MoMo cho mã ${row.booking_code} đã thành công. Tour: ${row.tour_name}. Số tiền: ${formatMoneyVnd(row.final_price)}.`,
  });

  return { sent: true };
}
