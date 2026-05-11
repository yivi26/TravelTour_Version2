import crypto from "crypto";
import axios from "axios";
import db from "../config/db.js";
import { sendMomoPaymentSuccessEmail } from "../utils/momoPaymentSuccessMail.js";

export const createMomoPayment = async (req, res) => {
  try {
    const bookingId = Number(req.params.bookingId);
    const userId = req.user.id;

    const [rows] = await db.execute(
      `
      SELECT id, booking_code, final_price, status
      FROM bookings
      WHERE id = ? AND user_id = ?
      LIMIT 1
      `,
      [bookingId, userId],
    );

    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy booking",
      });
    }

    const booking = rows[0];

    if (booking.status !== "pending_payment") {
      return res.status(400).json({
        success: false,
        message: "Booking không ở trạng thái thanh toán đang chờ xử lý",
      });
    }

    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey = process.env.MOMO_ACCESS_KEY;
    const secretKey = process.env.MOMO_SECRET_KEY;
    const endpoint = process.env.MOMO_ENDPOINT;

    const orderId = `TT_${booking.id}_${Date.now()}`;
    const requestId = orderId;
    const amount = String(Math.round(Number(booking.final_price)));
    const orderInfo = `Thanh toán booking ${booking.booking_code}`;
    const fallbackBaseUrl = `${req.protocol}://${req.get("host")}`;
    const preferredRedirectUrl = process.env.MOMO_REDIRECT_URL;
    // MoMo IPN thường không gọi được localhost, nên cần redirect về server để update DB.
    const redirectUrl =
      preferredRedirectUrl && preferredRedirectUrl.includes("/api/payments/momo/return")
        ? preferredRedirectUrl
        : `${fallbackBaseUrl}/api/payments/momo/return`;
    const ipnUrl = process.env.MOMO_IPN_URL;
    const extraData = "";
    const requestType = "payWithATM";
    const rawSignature =
      `accessKey=${accessKey}` +
      `&amount=${amount}` +
      `&extraData=${extraData}` +
      `&ipnUrl=${ipnUrl}` +
      `&orderId=${orderId}` +
      `&orderInfo=${orderInfo}` +
      `&partnerCode=${partnerCode}` +
      `&redirectUrl=${redirectUrl}` +
      `&requestId=${requestId}` +
      `&requestType=${requestType}`;

    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(rawSignature)
      .digest("hex");

    const requestBody = {
      partnerCode,
      accessKey,
      requestId,
      amount,
      orderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      extraData,
      requestType,
      signature,
      lang: "vi",
    };

    const momoRes = await axios.post(endpoint, requestBody, {
      headers: { "Content-Type": "application/json" },
    });

    if (momoRes.data.resultCode !== 0) {
      return res.status(400).json({
        success: false,
        message: momoRes.data.message,
      });
    }

    return res.json({
      success: true,
      payUrl: momoRes.data.payUrl,
    });
  } catch (error) {
    console.error("MOMO ERROR:", error.response?.data || error.message);

    return res.status(500).json({
      success: false,
      message: "Lỗi MoMo",
    });
  }
};

function parseBookingIdFromMomoOrderId(orderId) {
  const raw = String(orderId || "").trim();
  if (!raw) return 0;
  const m = raw.match(/^TT_(\d+)_/i);
  if (m) return Number(m[1]);
  const parts = raw.split("_");
  const n = Number(parts[1]);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Chỉ đổi trạng thái khi còn pending_payment — tránh gửi mail trùng (IPN + return). */
async function confirmBookingIfPendingPayment(bookingId) {
  const [result] = await db.execute(
    `
    UPDATE bookings
    SET status = 'confirmed',
        updated_at = NOW()
    WHERE id = ?
      AND status = 'pending_payment'
    `,
    [bookingId],
  );
  return Number(result?.affectedRows || 0) === 1;
}

export const momoReturn = async (req, res) => {
  try {
    console.log("MOMO RETURN QUERY:", req.query);

    const { orderId } = req.query;
    const resultCode = req.query.resultCode ?? req.query.resultcode;
    const bookingId = parseBookingIdFromMomoOrderId(orderId);

    if (!bookingId) {
      return res.redirect(
        "/pages/tours/thanhtoan.html?payment=missing_booking",
      );
    }

    if (Number(resultCode) === 0) {
      const firstConfirm = await confirmBookingIfPendingPayment(bookingId);
      if (firstConfirm) {
        void sendMomoPaymentSuccessEmail(bookingId).catch((err) =>
          console.error("sendMomoPaymentSuccessEmail:", err),
        );
      }

      return res.redirect(`/pages/tours/success.html?bookingId=${bookingId}`);
    }

    return res.redirect(`/pages/tours/thanhtoan.html?payment=failed`);
  } catch (error) {
    console.error("momoReturn error:", error);
    return res.redirect("/pages/tours/thanhtoan.html?payment=error");
  }
};

export const momoIpn = async (req, res) => {
  try {
    const { orderId, resultCode } = req.body || {};

    const bookingId = parseBookingIdFromMomoOrderId(orderId);

    if (Number(resultCode) === 0 && bookingId) {
      const firstConfirm = await confirmBookingIfPendingPayment(bookingId);
      if (firstConfirm) {
        void sendMomoPaymentSuccessEmail(bookingId).catch((err) =>
          console.error("sendMomoPaymentSuccessEmail (ipn):", err),
        );
      }
    }

    return res.json({
      resultCode: 0,
      message: "OK",
    });
  } catch (error) {
    return res.json({
      resultCode: 1,
      message: "ERROR",
    });
  }
};
