import db from "../config/db.js";

export const createBooking = async (bookingData) => {
  const {
    user_id,
    tour_id,
    schedule_id,
    booking_code,
    num_adults,
    num_children,
    num_infants,
    total_price,
    discount_amount,
    final_price,
    status,
    contact_name,
    contact_phone,
    contact_email,
    special_requests,
    payment_method,
  } = bookingData;

  const sql = `
    INSERT INTO bookings (
      user_id,
      tour_id,
      schedule_id,
      booking_code,
      num_adults,
      num_children,
      num_infants,
      total_price,
      discount_amount,
      final_price,
      status,
      contact_name,
      contact_phone,
      contact_email,
      special_requests,
      payment_method,
      booked_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
  `;

  const [result] = await db.execute(sql, [
    user_id,
    tour_id,
    schedule_id,
    booking_code,
    num_adults,
    num_children,
    num_infants,
    total_price,
    discount_amount,
    final_price,
    status,
    contact_name,
    contact_phone,
    contact_email,
    special_requests,
    payment_method,
  ]);

  return result;
};

export const createBookingTravelers = async (bookingId, travelers) => {
  const sql = `
    INSERT INTO booking_travelers (
      booking_id,
      full_name,
      birth_date,
      gender,
      id_number,
      traveler_type
    )
    VALUES (?, ?, ?, ?, ?, ?)
  `;

  for (const traveler of travelers) {
    await db.execute(sql, [
      bookingId,
      traveler.full_name,
      traveler.birth_date,
      traveler.gender,
      traveler.id_number || null,
      traveler.traveler_type,
    ]);
  }
};

export const getTourPriceById = async (tourId) => {
  const sql = `
    SELECT id, base_price, sale_price
    FROM tours
    WHERE id = ?
    LIMIT 1
  `;

  const [rows] = await db.execute(sql, [tourId]);
  return rows[0] || null;
};

export const updateBookedSlots = async (scheduleId, totalGuests) => {
  const sql = `
    UPDATE tour_schedules
    SET booked_slots = booked_slots + ?
    WHERE id = ?
  `;

  const [result] = await db.execute(sql, [totalGuests, scheduleId]);
  return result;
};
export const getRecentBookingsByUser = async (userId) => {
  const sql = `
    SELECT 
      b.id AS booking_id,
      b.booking_code,
      b.status,
      b.final_price,
      b.booked_at,

      t.title AS tour_name,
      t.location,

      ts.departure_date

    FROM bookings b
    JOIN tours t ON b.tour_id = t.id
    JOIN tour_schedules ts ON b.schedule_id = ts.id

    WHERE b.user_id = ?
    ORDER BY b.booked_at DESC
    LIMIT 3
  `;

  const [rows] = await db.execute(sql, [userId]);
  return rows;
};
export const getBookingDetailById = async (bookingId, userId) => {
  const sql = `
    SELECT
      b.id AS booking_id,
      b.booking_code,
      b.status,
      b.num_adults,
      b.num_children,
      b.num_infants,
      b.total_price,
      b.discount_amount,
      b.final_price,
      b.contact_name,
      b.contact_phone,
      b.contact_email,
      b.special_requests,
      b.payment_method,
      b.booked_at,

      t.id AS tour_id,
      t.title AS tour_name,
      t.location,

      ts.departure_date

    FROM bookings b
    JOIN tours t ON b.tour_id = t.id
    JOIN tour_schedules ts ON b.schedule_id = ts.id
    WHERE b.id = ? AND b.user_id = ?
    LIMIT 1
  `;

  const [rows] = await db.execute(sql, [bookingId, userId]);
  return rows[0] || null;
};

export const getBookingTravelersByBookingId = async (bookingId) => {
  const sql = `
    SELECT
      id,
      full_name,
      birth_date,
      gender,
      id_number,
      traveler_type
    FROM booking_travelers
    WHERE booking_id = ?
    ORDER BY id ASC
  `;

  const [rows] = await db.execute(sql, [bookingId]);
  return rows;
};
export const getBookingHistoryByUser = async (userId) => {
  const sql = `
    SELECT
      b.id AS booking_id,
      b.booking_code,
      b.status,
      b.final_price,
      b.booked_at,

      t.title AS tour_name,
      t.location,
      t.duration_days,

      ts.departure_date

    FROM bookings b
    JOIN tours t ON b.tour_id = t.id
    JOIN tour_schedules ts ON b.schedule_id = ts.id

    WHERE b.user_id = ?
    ORDER BY b.booked_at DESC
  `;

  const [rows] = await db.execute(sql, [userId]);
  return rows;
};
export const getMyBookingsByUser = async (userId) => {
  const sql = `
    SELECT
      b.id AS booking_id,
      b.booking_code,
      b.status,
      b.payment_method,
      b.final_price,
      b.booked_at,
      b.num_adults,
      b.num_children,
      b.num_infants,

      t.title AS tour_name,
      t.location,
      t.duration_days,
      t.thumbnail_url,

      ts.departure_date

    FROM bookings b
    JOIN tours t ON b.tour_id = t.id
    JOIN tour_schedules ts ON b.schedule_id = ts.id
    WHERE b.user_id = ?
    ORDER BY ts.departure_date ASC
  `;

  const [rows] = await db.execute(sql, [userId]);
  return rows;
};
export async function countBookingsByUser(userId) {
  const [rows] = await db.query(
    "SELECT COUNT(*) AS total FROM bookings WHERE user_id = ?",
    [userId],
  );
  return Number(rows[0]?.total || 0);
}
export const getBookingSummaryData = async (tourId) => {
  const [rows] = await db.execute(
    `
    SELECT 
      id,
      title,
      location,
      base_price,
      sale_price,
      tax_percent,
      tax,
      final_price,
      thumbnail_url
    FROM tours
    WHERE id = ?
    LIMIT 1
    `,
    [tourId],
  );

  return rows[0] || null;
};
export const cancelBookingById = async (bookingId, userId, reason) => {
  const sql = `
    UPDATE bookings
    SET 
      status = 'cancelled',
      cancelled_reason = ?,
      cancelled_at = NOW(),
      updated_at = NOW()
    WHERE id = ?
      AND user_id = ?
      AND status IN ('pending', 'confirmed')
  `;

  const [result] = await db.execute(sql, [reason, bookingId, userId]);
  return result;
};
export const getCancelableBookingById = async (bookingId, userId) => {
  const sql = `
    SELECT
      b.id,
      b.user_id,
      b.status,
      b.final_price,
      b.cancelled_at,
      ts.departure_date
    FROM bookings b
    JOIN tour_schedules ts ON b.schedule_id = ts.id
    WHERE b.id = ?
      AND b.user_id = ?
    LIMIT 1
  `;

  const [rows] = await db.execute(sql, [bookingId, userId]);
  return rows[0] || null;
};
