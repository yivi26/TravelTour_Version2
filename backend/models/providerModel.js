import db from "../config/db.js";
import { getProviderReportOverview } from "./providerReportsModel.js";

function safeJsonParse(value, fallback = []) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function createSlug(text = "") {
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function resolvePublicTourPricing(row) {
  const basePrice = Number(row.base_price || 0);
  const salePrice = Number(row.sale_price || 0);
  const appliedPrice = salePrice > 0 && salePrice < basePrice ? salePrice : basePrice;
  const taxPercent = Math.max(0, Number(row.tax_percent ?? 0));
  const hasVat = taxPercent > 0;

  let tax = Math.max(0, Number(row.tax ?? 0));
  let finalPrice = Math.max(0, Number(row.final_price ?? 0));

  if (!hasVat) {
    return {
      tax_percent: 0,
      tax: 0,
      final_price: finalPrice > 0 ? finalPrice : appliedPrice
    };
  }

  if (!tax) {
    tax = Math.round(appliedPrice * (taxPercent / 100));
  }

  if (!finalPrice) {
    finalPrice = appliedPrice + tax;
  }

  return {
    tax_percent: taxPercent,
    tax,
    final_price: finalPrice
  };
}

async function isTourCodeExists(providerId, code, excludeId = null) {
  if (!code) return false;

  let sql = `
    SELECT id
    FROM tours
    WHERE provider_id = ?
      AND code = ?
  `;
  const params = [providerId, code];

  if (excludeId) {
    sql += ` AND id <> ? `;
    params.push(excludeId);
  }

  sql += ` LIMIT 1 `;

  const [rows] = await db.query(sql, params);
  return rows.length > 0;
}

async function isTourSlugExists(providerId, slug, excludeId = null) {
  if (!slug) return false;

  let sql = `
    SELECT id
    FROM tours
    WHERE provider_id = ?
      AND slug = ?
  `;
  const params = [providerId, slug];

  if (excludeId) {
    sql += ` AND id <> ? `;
    params.push(excludeId);
  }

  sql += ` LIMIT 1 `;

  const [rows] = await db.query(sql, params);
  return rows.length > 0;
}

export async function getToursByProvider(providerId) {
  const [rows] = await db.query(
    `
    SELECT *
    FROM tours
    WHERE provider_id = ?
    ORDER BY created_at DESC
    `,
    [providerId]
  );

  return rows.map(row => {
    const pricing = resolvePublicTourPricing(row);

    return {
      ...row,
      display_price: pricing.final_price,     // giá cuối cùng để hiển thị
      applied_price:
        row.sale_price > 0 && row.sale_price < row.base_price
          ? Number(row.sale_price)
          : Number(row.base_price || 0),
      tax_resolved: pricing.tax,
      final_price_resolved: pricing.final_price
    };
  });
}

export async function getTourById(providerId, id) {
  const [rows] = await db.query(
    `
    SELECT
      t.*,
      g.full_name AS guide_name
    FROM tours t
    LEFT JOIN users g ON g.id = t.guide_id
    WHERE t.provider_id = ?
      AND t.id = ?
    LIMIT 1
    `,
    [providerId, id]
  );

  if (!rows.length) return null;

  const tour = rows[0];

  const [categoryRows] = await db.query(
    `
    SELECT category_id
    FROM tour_category_map
    WHERE tour_id = ?
    LIMIT 1
    `,
    [id]
  );

  const [imageRows] = await db.query(
    `
    SELECT image_url, is_cover, display_order
    FROM tour_images
    WHERE tour_id = ?
    ORDER BY is_cover DESC, display_order ASC, id ASC
    `,
    [id]
  );

  const coverImage = imageRows.find(item => Number(item.is_cover) === 1) || null;
  const galleryImages = imageRows
    .filter(item => Number(item.is_cover) !== 1)
    .map(item => item.image_url);

  return {
    ...tour,
    category_id: categoryRows.length ? Number(categoryRows[0].category_id) : null,
    short_description: tour.description || "",
    hotel_info: tour.hotel_info || "",
    transport_info: tour.transport_info || "",
    cancel_policy: tour.cancel_policy || "",
    terms_conditions: tour.terms_conditions || "",
    other_notes: tour.other_notes || "",
    highlights: safeJsonParse(tour.highlights, []),
    includes: safeJsonParse(tour.includes, []),
    excludes: safeJsonParse(tour.excludes, []),
    itinerary: safeJsonParse(tour.itinerary, []),
    thumbnail_url: coverImage ? coverImage.image_url : tour.thumbnail_url || null,
    gallery_images: galleryImages
  };
}

export async function createTour(providerId, data) {
  const {
    title,
    slug,
    description,
    short_description,
    location,
    meeting_point,
    latitude,
    longitude,
    base_price,
    sale_price,
    tax_percent,
    tax,
    final_price,
    duration_days,
    duration_text,
    max_capacity,
    thumbnail_url,
    includes,
    excludes,
    status,
    category_id,
    itinerary,
    gallery_images,
    highlights,
    start_date,
    end_date,
    code,
    hotel_info,
    transport_info,
    cancel_policy,
    terms_conditions,
    other_notes
  } = data;

  const finalStatus = ["draft", "active", "paused", "archived", "full"].includes(status)
    ? status
    : "draft";

  let finalSlug = slug || createSlug(title);
  if (!finalSlug) {
    finalSlug = `tour-${Date.now()}`;
  }

  if (await isTourCodeExists(providerId, code)) {
    throw new Error("Mã tour đã tồn tại");
  }

  if (await isTourSlugExists(providerId, finalSlug)) {
    finalSlug = `${finalSlug}-${Date.now()}`;
  }

  const finalItinerary =
    Array.isArray(itinerary) && itinerary.length > 0 ? JSON.stringify(itinerary) : null;

  const finalIncludes =
    Array.isArray(includes) && includes.length > 0 ? JSON.stringify(includes) : null;

  const finalExcludes =
    Array.isArray(excludes) && excludes.length > 0 ? JSON.stringify(excludes) : null;

  const finalHighlights =
    Array.isArray(highlights) && highlights.length > 0 ? JSON.stringify(highlights) : null;

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `
      INSERT INTO tours (
        provider_id,
        title,
        slug,
        code,
        description,
        highlights,
        itinerary,
        location,
        meeting_point,
        latitude,
        longitude,
        base_price,
        sale_price,
        tax_percent,
        tax,
        final_price,
        duration_days,
        duration_text,
        max_capacity,
        thumbnail_url,
        includes,
        excludes,
        start_date,
        end_date,
        hotel_info,
        transport_info,
        cancel_policy,
        terms_conditions,
        other_notes,
        status,
        guide_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        providerId,
        title || null,
        finalSlug,
        code || null,
        short_description || description || null,
        finalHighlights,
        finalItinerary,
        location || null,
        meeting_point || null,
        latitude ?? null,
        longitude ?? null,
        base_price || 0,
        sale_price || 0,
        Number(tax_percent) >= 0 ? Number(tax_percent) : 0,
        Number(tax) >= 0 ? Number(tax) : 0,
        Number(final_price) >= 0 ? Number(final_price) : 0,
        duration_days || 1,
        duration_text || null,
        max_capacity || 1,
        thumbnail_url || null,
        finalIncludes,
        finalExcludes,
        start_date || null,
        end_date || null,
        hotel_info || null,
        transport_info || null,
        cancel_policy || null,
        terms_conditions || null,
        other_notes || null,
        finalStatus,
        null
      ]
    );

    const tourId = result.insertId;

    if (category_id) {
      await conn.query(
        `INSERT INTO tour_category_map (tour_id, category_id) VALUES (?, ?)`,
        [tourId, category_id]
      );
    }

    const insertedUrls = new Set();

    if (thumbnail_url) {
      const normalizedCover = String(thumbnail_url).trim();
      await conn.query(
        `
        INSERT INTO tour_images (tour_id, image_url, display_order, is_cover)
        VALUES (?, ?, 0, 1)
        `,
        [tourId, normalizedCover]
      );
      insertedUrls.add(normalizedCover);
    }

    if (Array.isArray(gallery_images) && gallery_images.length > 0) {
      let displayOrder = 1;

      for (const imageUrl of gallery_images) {
        const normalizedUrl = String(imageUrl || "").trim();
        if (!normalizedUrl || insertedUrls.has(normalizedUrl)) continue;

        await conn.query(
          `
          INSERT INTO tour_images (tour_id, image_url, display_order, is_cover)
          VALUES (?, ?, ?, 0)
          `,
          [tourId, normalizedUrl, displayOrder]
        );

        insertedUrls.add(normalizedUrl);
        displayOrder += 1;
      }
    }

    await conn.commit();
    return tourId;
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function updateTour(providerId, id, data) {
  const {
    title,
    slug,
    description,
    short_description,
    location,
    meeting_point,
    latitude,
    longitude,
    base_price,
    sale_price,
    tax_percent,
    tax,
    final_price,
    duration_days,
    duration_text,
    max_capacity,
    thumbnail_url,
    includes,
    excludes,
    status,
    category_id,
    itinerary,
    gallery_images,
    highlights,
    start_date,
    end_date,
    code,
    hotel_info,
    transport_info,
    cancel_policy,
    terms_conditions,
    other_notes
  } = data;

  const finalStatus = ["draft", "active", "paused", "archived", "full"].includes(status)
    ? status
    : "draft";

  let finalSlug = slug || createSlug(title);
  if (!finalSlug) {
    finalSlug = `tour-${id}`;
  }

  if (await isTourCodeExists(providerId, code, id)) {
    throw new Error("Mã tour đã tồn tại");
  }

  if (await isTourSlugExists(providerId, finalSlug, id)) {
    finalSlug = `${finalSlug}-${id}`;
  }

  const finalItinerary =
    Array.isArray(itinerary) && itinerary.length > 0 ? JSON.stringify(itinerary) : null;

  const finalIncludes =
    Array.isArray(includes) && includes.length > 0 ? JSON.stringify(includes) : null;

  const finalExcludes =
    Array.isArray(excludes) && excludes.length > 0 ? JSON.stringify(excludes) : null;

  const finalHighlights =
    Array.isArray(highlights) && highlights.length > 0 ? JSON.stringify(highlights) : null;

  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    await conn.query(
      `
      UPDATE tours
      SET
        title = ?,
        slug = ?,
        code = ?,
        description = ?,
        highlights = ?,
        itinerary = ?,
        location = ?,
        meeting_point = ?,
        latitude = ?,
        longitude = ?,
        base_price = ?,
        sale_price = ?,
        tax_percent = ?,
        tax = ?,
        final_price = ?,
        duration_days = ?,
        duration_text = ?,
        max_capacity = ?,
        thumbnail_url = ?,
        includes = ?,
        excludes = ?,
        start_date = ?,
        end_date = ?,
        hotel_info = ?,
        transport_info = ?,
        cancel_policy = ?,
        terms_conditions = ?,
        other_notes = ?,
        status = ?
      WHERE provider_id = ?
        AND id = ?
      `,
      [
        title || null,
        finalSlug,
        code || null,
        short_description || description || null,
        finalHighlights,
        finalItinerary,
        location || null,
        meeting_point || null,
        latitude ?? null,
        longitude ?? null,
        base_price || 0,
        sale_price || 0,
        Number(tax_percent) >= 0 ? Number(tax_percent) : 0,
        Number(tax) >= 0 ? Number(tax) : 0,
        Number(final_price) >= 0 ? Number(final_price) : 0,
        duration_days || 1,
        duration_text || null,
        max_capacity || 1,
        thumbnail_url || null,
        finalIncludes,
        finalExcludes,
        start_date || null,
        end_date || null,
        hotel_info || null,
        transport_info || null,
        cancel_policy || null,
        terms_conditions || null,
        other_notes || null,
        finalStatus,
        providerId,
        id
      ]
    );

    await conn.query(`DELETE FROM tour_category_map WHERE tour_id = ?`, [id]);

    if (category_id) {
      await conn.query(
        `INSERT INTO tour_category_map (tour_id, category_id) VALUES (?, ?)`,
        [id, category_id]
      );
    }

    await conn.query(`DELETE FROM tour_images WHERE tour_id = ?`, [id]);

    const insertedUrls = new Set();

    if (thumbnail_url) {
      const normalizedCover = String(thumbnail_url).trim();

      await conn.query(
        `
        INSERT INTO tour_images (tour_id, image_url, display_order, is_cover)
        VALUES (?, ?, 0, 1)
        `,
        [id, normalizedCover]
      );

      insertedUrls.add(normalizedCover);
    }

    if (Array.isArray(gallery_images) && gallery_images.length > 0) {
      let displayOrder = 1;

      for (const imageUrl of gallery_images) {
        const normalizedUrl = String(imageUrl || "").trim();
        if (!normalizedUrl || insertedUrls.has(normalizedUrl)) continue;

        await conn.query(
          `
          INSERT INTO tour_images (tour_id, image_url, display_order, is_cover)
          VALUES (?, ?, ?, 0)
          `,
          [id, normalizedUrl, displayOrder]
        );

        insertedUrls.add(normalizedUrl);
        displayOrder += 1;
      }
    }

    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function deleteTour(id) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`DELETE FROM tour_images WHERE tour_id = ?`, [id]);
    await conn.query(`DELETE FROM tour_category_map WHERE tour_id = ?`, [id]);
    await conn.query(`DELETE FROM tours WHERE id = ?`, [id]);
    await conn.commit();
  } catch (error) {
    await conn.rollback();
    throw error;
  } finally {
    conn.release();
  }
}

export async function updateTourStatus(id, status) {
  await db.query(`UPDATE tours SET status = ? WHERE id = ?`, [status, id]);
}

export async function getBookingsByProvider(providerId) {
  const [rows] = await db.query(
    `
    SELECT b.*
    FROM v_booking_detail b
    JOIN providers p ON b.provider_name = p.company_name
    WHERE p.id = ?
    ORDER BY b.booked_at DESC
    `,
    [providerId]
  );
  return rows;
}

export async function updateBookingStatus(bookingId, status) {
  await db.query(`UPDATE bookings SET status = ? WHERE id = ?`, [status, bookingId]);
}

export async function getGuides(providerId) {
  const [rows] = await db.query(
    `
    SELECT
      g.*,
      u.full_name
    FROM guides g
    JOIN users u ON g.user_id = u.id
    WHERE g.provider_id = ?
    `,
    [providerId]
  );
  return rows;
}

export async function getToursForGuideAssignment(providerId) {
  const [rows] = await db.query(
    `
    SELECT
      t.id,
      t.title,
      t.location,
      t.start_date,
      t.max_capacity,
      t.status,
      t.guide_id,
      u.full_name AS guide_name
    FROM tours t
    LEFT JOIN guides g ON g.id = t.guide_id
    LEFT JOIN users u ON u.id = g.user_id
    WHERE t.provider_id = ?
      AND t.status IN ('draft', 'active', 'paused', 'full')
    ORDER BY
      CASE WHEN t.start_date IS NULL THEN 1 ELSE 0 END,
      t.start_date ASC,
      t.id DESC
    `,
    [providerId]
  );

  return rows;
}

export async function assignGuideToTour(providerId, tourId, guideId) {
  const [tourRows] = await db.query(
    `
    SELECT id
    FROM tours
    WHERE id = ?
      AND provider_id = ?
    LIMIT 1
    `,
    [tourId, providerId]
  );

  if (!tourRows.length) {
    throw new Error("Không tìm thấy tour");
  }

  const [guideRows] = await db.query(
    `
    SELECT id
    FROM guides
    WHERE id = ?
      AND provider_id = ?
    LIMIT 1
    `,
    [guideId, providerId]
  );

  if (!guideRows.length) {
    throw new Error("Không tìm thấy hướng dẫn viên");
  }

  await db.query(
    `
    UPDATE tours
    SET guide_id = ?
    WHERE id = ?
      AND provider_id = ?
    `,
    [guideId, tourId, providerId]
  );

  const [rows] = await db.query(
    `
    SELECT
      t.id,
      t.title,
      t.location,
      t.start_date,
      t.max_capacity,
      t.status,
      t.guide_id,
      u.full_name AS guide_name
    FROM tours t
    LEFT JOIN guides g ON g.id = t.guide_id
    LEFT JOIN users u ON u.id = g.user_id
    WHERE t.id = ?
      AND t.provider_id = ?
    LIMIT 1
    `,
    [tourId, providerId]
  );

  return rows[0] || null;
}

export async function getProviderProfile(providerId) {
  const [rows] = await db.query(
    `
    SELECT
      p.id,
      p.user_id,
      p.company_name,
      p.description,
      p.address,
      p.website_url,
      p.license_number,
      p.tax_code,
      p.phone,
      p.hotline,
      p.email,
      p.logo_url,
      p.bank_name,
      p.bank_branch,
      p.bank_account_number,
      p.bank_account_name,
      p.status,
      p.created_at,
      p.updated_at,
      u.full_name AS account_name,
      u.email AS account_email
    FROM providers p
    LEFT JOIN users u ON p.user_id = u.id
    WHERE p.id = ?
    LIMIT 1
    `,
    [providerId]
  );

  if (!rows.length) return null;

  const provider = rows[0];

  const [[tourStats]] = await db.query(
    `SELECT COUNT(*) AS total_tours FROM tours WHERE provider_id = ?`,
    [providerId]
  );

  const [[customerStats]] = await db.query(
    `
    SELECT COUNT(DISTINCT b.user_id) AS total_customers
    FROM bookings b
    JOIN tours t ON b.tour_id = t.id
    WHERE t.provider_id = ?
    `,
    [providerId]
  );

  return {
    companyName: provider.company_name || "",
    companyShortName: provider.company_name || "",
    companyDisplayName: provider.company_name || "",
    providerType: "Nhà cung cấp tour du lịch",
    taxCode: provider.tax_code || "",
    businessLicense: provider.license_number || "",
    companyDescription: provider.description || "",
    phone: provider.phone || "",
    hotline: provider.hotline || provider.phone || "",
    contactEmail: provider.email || provider.account_email || "",
    address: provider.address || "",
    website: provider.website_url || "",
    bankName: provider.bank_name || "",
    bankBranch: provider.bank_branch || "",
    bankAccountNumber: provider.bank_account_number || "",
    bankAccountName: provider.bank_account_name || "",
    logoUrl: provider.logo_url || "",
    rating: 4.9,
    totalTours: Number(tourStats?.total_tours || 0),
    totalReviews: 0,
    totalCustomers: Number(customerStats?.total_customers || 0),
    memberSince: provider.created_at || null,
    accountName: provider.account_name || "Provider",
    accountEmail: provider.account_email || provider.email || "",
    certificates: [
      {
        name: "Giấy phép kinh doanh",
        status: provider.license_number ? "Đã xác minh" : "Chưa cập nhật"
      }
    ]
  };
}

export async function updateProviderProfile(providerId, data) {
  const {
    companyName,
    taxCode,
    businessLicense,
    companyDescription,
    phone,
    hotline,
    contactEmail,
    address,
    website,
    bankName,
    bankBranch,
    bankAccountNumber,
    bankAccountName,
    logoUrl
  } = data;

  await db.query(
    `
    UPDATE providers
    SET
      company_name = ?,
      tax_code = ?,
      license_number = ?,
      description = ?,
      phone = ?,
      hotline = ?,
      email = ?,
      address = ?,
      website_url = ?,
      bank_name = ?,
      bank_branch = ?,
      bank_account_number = ?,
      bank_account_name = ?,
      logo_url = ?
    WHERE id = ?
    `,
    [
      companyName || null,
      taxCode || null,
      businessLicense || null,
      companyDescription || null,
      phone || null,
      hotline || null,
      contactEmail || null,
      address || null,
      website || null,
      bankName || null,
      bankBranch || null,
      bankAccountNumber || null,
      bankAccountName || null,
      logoUrl || null,
      providerId
    ]
  );

  return getProviderProfile(providerId);
}

function mapProviderDashboardBookingStatus(status) {
  const s = String(status || "").toLowerCase();
  if (["confirmed", "paid", "in_progress"].includes(s)) {
    return { label: "Đã xác nhận", statusClass: "confirmed" };
  }
  if (s === "completed") {
    return { label: "Hoàn thành", statusClass: "confirmed" };
  }
  if (s === "cancelled" || s === "canceled") {
    return { label: "Đã hủy", statusClass: "pending" };
  }
  if (s === "pending_payment") {
    return { label: "Thanh toán đang chờ xử lý", statusClass: "pending" };
  }
  if (s === "pending") {
    return { label: "Chờ xử lý", statusClass: "pending" };
  }
  if (s === "refunded") {
    return { label: "Đã hoàn tiền", statusClass: "pending" };
  }
  return { label: status || "Không xác định", statusClass: "pending" };
}

export async function getDashboardDataByProvider(providerId) {
  const [[totalToursRow]] = await db.query(
    `SELECT COUNT(*) AS totalTours FROM tours WHERE provider_id = ?`,
    [providerId]
  );

  const [[activeToursRow]] = await db.query(
    `SELECT COUNT(*) AS activeTours FROM tours WHERE provider_id = ? AND status = 'active'`,
    [providerId]
  );

  const [[bookingsTodayRow]] = await db.query(
    `
    SELECT COUNT(*) AS bookingsToday
    FROM bookings b
    JOIN tours t ON b.tour_id = t.id
    WHERE t.provider_id = ?
      AND DATE(b.booked_at) = CURDATE()
    `,
    [providerId]
  );

  const [[revenueMonthRow]] = await db.query(
    `
    SELECT COALESCE(SUM(COALESCE(b.final_price, 0)), 0) AS revenueMonth
    FROM bookings b
    JOIN tours t ON b.tour_id = t.id
    WHERE t.provider_id = ?
      AND b.status IN ('confirmed', 'paid', 'in_progress', 'completed')
      AND MONTH(b.booked_at) = MONTH(CURDATE())
      AND YEAR(b.booked_at) = YEAR(CURDATE())
    `,
    [providerId]
  );

  const defaultCharts = {
    labels: ["T1", "T2", "T3", "T4", "T5", "T6"],
    revenue: [0, 0, 0, 0, 0, 0],
    bookings: [0, 0, 0, 0, 0, 0]
  };

  let charts = { ...defaultCharts };
  try {
    const overview = await getProviderReportOverview({ providerId, months: 6, topLimit: 5 });
    if (overview?.monthlyBookings?.length) {
      charts = {
        labels: overview.monthlyBookings.map((m) => m.label),
        revenue: overview.monthlyRevenue.map((m) => Number(m.value) || 0),
        bookings: overview.monthlyBookings.map((m) => Number(m.value) || 0)
      };
    }
  } catch {
    /* giữ defaultCharts */
  }

  let recentBookings = [];
  try {
    const [rows] = await db.query(
      `
      SELECT
        b.status,
        b.booked_at,
        u.full_name AS customer_name,
        t.title AS tour_title
      FROM bookings b
      JOIN tours t ON t.id = b.tour_id
      LEFT JOIN users u ON u.id = b.user_id
      WHERE t.provider_id = ?
      ORDER BY b.booked_at DESC, b.id DESC
      LIMIT 8
      `,
      [providerId]
    );
    recentBookings = (rows || []).map((b) => {
      const m = mapProviderDashboardBookingStatus(b.status);
      return {
        customer: b.customer_name || "Khách hàng",
        tour: b.tour_title || "Tour",
        date: b.booked_at,
        status: m.label,
        statusClass: m.statusClass
      };
    });
  } catch {
    recentBookings = [];
  }

  let upcomingTours = [];
  try {
    const [rows] = await db.query(
      `
      SELECT
        t.title,
        t.start_date,
        t.max_capacity,
        COALESCE(u.full_name, 'Chưa phân công') AS guide_name
      FROM tours t
      LEFT JOIN guides g ON g.id = t.guide_id
      LEFT JOIN users u ON u.id = g.user_id
      WHERE t.provider_id = ?
        AND t.start_date IS NOT NULL
        AND DATE(t.start_date) >= CURDATE()
        AND t.status IN ('active', 'paused', 'full')
      ORDER BY t.start_date ASC
      LIMIT 8
      `,
      [providerId]
    );
    upcomingTours = (rows || []).map((t) => ({
      name: t.title || "Tour",
      guide: `HDV: ${t.guide_name || "Chưa phân công"}`,
      date: t.start_date,
      guests: t.max_capacity != null ? `${Number(t.max_capacity)} chỗ` : "—"
    }));
  } catch {
    upcomingTours = [];
  }

  return {
    stats: {
      totalTours: Number(totalToursRow?.totalTours || 0),
      bookingsToday: Number(bookingsTodayRow?.bookingsToday || 0),
      activeTours: Number(activeToursRow?.activeTours || 0),
      revenueMonth: Number(revenueMonthRow?.revenueMonth || 0)
    },
    charts,
    recentBookings,
    upcomingTours
  };
}

function toIsoDate(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

export async function getProviderNotifications(providerId, limit = 12) {
  const safeLimit = Math.max(1, Math.min(50, Number(limit) || 12));
  const notifications = [];

  const [providerRows] = await db.query(
    `
    SELECT status, updated_at
    FROM providers
    WHERE id = ?
    LIMIT 1
    `,
    [providerId]
  );

  if (providerRows.length > 0) {
    const provider = providerRows[0];
    const status = String(provider.status || "").toLowerCase();
    let subtitle = "Tài khoản nhà cung cấp của bạn có cập nhật mới từ admin.";
    let tone = "blue";

    if (status === "active") {
      subtitle = "Admin đã duyệt tài khoản nhà cung cấp của bạn.";
      tone = "green";
    } else if (status === "pending") {
      subtitle = "Tài khoản đang chờ admin phê duyệt.";
      tone = "orange";
    } else if (status === "blocked" || status === "inactive") {
      subtitle = "Tài khoản nhà cung cấp đang bị tạm khóa bởi admin.";
      tone = "red";
    }

    notifications.push({
      id: "provider-status",
      type: "admin_provider_status",
      title: "Thông báo từ Admin",
      subtitle,
      date: toIsoDate(provider.updated_at),
      href: "profile.html",
      tone
    });
  }

  const [tourRows] = await db.query(
    `
    SELECT id, title, status, updated_at
    FROM tours
    WHERE provider_id = ?
      AND status IN ('active', 'paused', 'archived', 'full')
    ORDER BY updated_at DESC, id DESC
    LIMIT 20
    `,
    [providerId]
  );

  for (const row of tourRows) {
    const status = String(row.status || "").toLowerCase();
    let subtitle = `${row.title || "Tour"} có cập nhật trạng thái mới.`;
    let tone = "blue";

    if (status === "active") {
      subtitle = `Admin đã duyệt tour "${row.title || "Tour"}".`;
      tone = "green";
    } else if (status === "paused") {
      subtitle = `Tour "${row.title || "Tour"}" đang bị tạm dừng bởi admin.`;
      tone = "orange";
    } else if (status === "archived") {
      subtitle = `Tour "${row.title || "Tour"}" đã bị ẩn bởi admin.`;
      tone = "red";
    } else if (status === "full") {
      subtitle = `Tour "${row.title || "Tour"}" đã đủ chỗ.`;
      tone = "purple";
    }

    notifications.push({
      id: `tour-${row.id}`,
      type: "admin_tour_status",
      title: "Thông báo từ Admin",
      subtitle,
      date: toIsoDate(row.updated_at),
      href: "tour_management.html",
      tone
    });
  }

  const [bookingRows] = await db.query(
    `
    SELECT
      b.id,
      b.booked_at,
      b.status,
      t.title AS tour_title,
      u.full_name AS customer_name
    FROM bookings b
    JOIN tours t ON t.id = b.tour_id
    LEFT JOIN users u ON u.id = b.user_id
    WHERE t.provider_id = ?
    ORDER BY b.booked_at DESC, b.id DESC
    LIMIT 12
    `,
    [providerId]
  );

  for (const row of bookingRows || []) {
    notifications.push({
      id: `booking-${row.id}`,
      type: "booking",
      title: "Hoạt động booking",
      subtitle: `${row.customer_name || "Khách hàng"} · ${row.tour_title || "Tour"}`,
      date: toIsoDate(row.booked_at),
      href: "booking_management.html",
      tone: "blue"
    });
  }

  notifications.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  return {
    total: notifications.length,
    items: notifications.slice(0, safeLimit)
  };
}

export async function getPublicFeaturedTours(limit = 6) {
  const [rows] = await db.query(
    `
    SELECT
      t.id,
      t.title,
      t.slug,
      t.description,
      t.location,
      t.meeting_point,
      t.latitude,
      t.longitude,
      t.base_price,
      t.sale_price,
      t.tax_percent,
      t.tax,
      t.final_price,
      t.duration_days,
      t.max_capacity,
      t.thumbnail_url,
      t.status,
      t.created_at,
      p.company_name AS provider_name
    FROM tours t
    LEFT JOIN providers p ON t.provider_id = p.id
    WHERE t.status = 'active'
    ORDER BY t.created_at DESC
    LIMIT ?
    `,
    [Number(limit)]
  );

  return rows.map(row => {
    const pricing = resolvePublicTourPricing(row);
    return { ...row, ...pricing };
  });
}

export async function getPublicTours(filters = {}) {
  const { destination = "", limit = 20 } = filters;

  let sql = `
    SELECT
      t.id,
      t.title,
      t.slug,
      t.description,
      t.location,
      t.meeting_point,
      t.latitude,
      t.longitude,

      t.base_price,
      t.sale_price,
      t.tax_percent,
      t.tax,
      t.final_price,

      t.duration_days,
      t.duration_text,
      t.max_capacity,
      t.thumbnail_url,
      t.status,
      t.created_at,
      p.company_name AS provider_name,
      tcm.category_id,
      tr.rating_avg
    FROM tours t
    LEFT JOIN providers p ON t.provider_id = p.id
    LEFT JOIN (
      SELECT tour_id, MIN(category_id) AS category_id
      FROM tour_category_map
      GROUP BY tour_id
    ) tcm ON tcm.tour_id = t.id
    LEFT JOIN (
      SELECT
        r.tour_id,
        AVG(r.rating) AS rating_avg
      FROM reviews r
      WHERE COALESCE(r.status, '') NOT IN ('hidden', 'rejected', 'pending')
      GROUP BY r.tour_id
    ) tr ON tr.tour_id = t.id
    WHERE t.status = 'active'
  `;

  const params = [];

  if (destination) {
    sql += ` AND t.location LIKE ? `;
    params.push(`%${destination}%`);
  }

  sql += ` ORDER BY t.created_at DESC LIMIT ? `;
  params.push(Number(limit));

  const [rows] = await db.query(sql, params);

  return rows.map((row) => {
    const pricing = resolvePublicTourPricing(row);
    const avg = row.rating_avg != null ? Number(row.rating_avg) : null;

    return {
      ...row,
      tax_percent: pricing.tax_percent,
      tax: pricing.tax,
      final_price: pricing.final_price,
      display_price: pricing.final_price,
      rating:
        avg != null && Number.isFinite(avg) ? Math.round(avg * 10) / 10 : null
    };
  });
}
export async function getPublicDiscountedTours(limit = 6) {
  const [rows] = await db.query(
    `
    SELECT
      t.id,
      t.title,
      t.slug,
      t.description,
      t.location,
      t.base_price,
      t.sale_price,
      t.tax_percent,
      t.tax,
      t.final_price,
      t.thumbnail_url,
      t.start_date,
      t.end_date,
      t.status,
      t.created_at,
      p.company_name AS provider_name
    FROM tours t
    LEFT JOIN providers p ON t.provider_id = p.id
    WHERE t.status = 'active'
      AND t.sale_price > 0
      AND t.sale_price < t.base_price
    ORDER BY t.created_at DESC
    LIMIT ?
    `,
    [Number(limit)]
  );

  return rows.map(row => {
    const pricing = resolvePublicTourPricing(row);
    return { ...row, ...pricing };
  });
}

export async function getPublicTourById(tourId) {
  const [rows] = await db.query(
    `
    SELECT
      t.id,
      t.title,
      t.slug,
      t.description,
      t.location,
      t.meeting_point,
      t.latitude,
      t.longitude,
      t.base_price,
      t.sale_price,
      t.tax_percent,
      t.tax,
      t.final_price,
      t.duration_days,
      t.duration_text,
      t.max_capacity,
      t.thumbnail_url,
      t.includes,
      t.excludes,
      t.itinerary,
      t.start_date,
      t.end_date,
      t.hotel_info,
      t.transport_info,
      t.cancel_policy,
      t.terms_conditions,
      t.other_notes,
      t.status,
      t.created_at,
      p.company_name AS provider_name
    FROM tours t
    LEFT JOIN providers p ON t.provider_id = p.id
    WHERE t.id = ?
      AND t.status = 'active'
    LIMIT 1
    `,
    [tourId]
  );

  if (!rows.length) return null;

  const tour = rows[0];
  const pricing = resolvePublicTourPricing(tour);

  const [imageRows] = await db.query(
    `
    SELECT image_url, is_cover, display_order
    FROM tour_images
    WHERE tour_id = ?
    ORDER BY is_cover DESC, display_order ASC, id ASC
    `,
    [tourId]
  );

  return {
    ...tour,
    ...pricing,
    cancel_policy: tour.cancel_policy || "",
    terms_conditions: tour.terms_conditions || "",
    other_notes: tour.other_notes || "",
    hotel_info: tour.hotel_info || "",
    transport_info: tour.transport_info || "",
    images: imageRows || []
  };
}