import db from "../config/db.js";

export async function getGuideDashboardData(guideId) {
  const [[activeToursRow]] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM tours
    WHERE guide_id = ?
      AND status IN ('active', 'paused', 'full')
    `,
    [guideId]
  );

  const [[completedToursRow]] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM tours
    WHERE guide_id = ?
      AND status = 'archived'
    `,
    [guideId]
  );

  const [[customersRow]] = await db.query(
    `
    SELECT COALESCE(SUM(max_capacity), 0) AS total
    FROM tours
    WHERE guide_id = ?
      AND status IN ('active', 'paused', 'full', 'archived')
    `,
    [guideId]
  );

  const [[incomeRow]] = await db.query(
    `
    SELECT COALESCE(SUM(COALESCE(final_price, 0)), 0) AS total
    FROM tours
    WHERE guide_id = ?
      AND start_date IS NOT NULL
      AND MONTH(start_date) = MONTH(CURDATE())
      AND YEAR(start_date) = YEAR(CURDATE())
      AND status = 'archived'
    `,
    [guideId]
  );

  const [upcomingTours] = await db.query(
    `
    SELECT
      id,
      title,
      start_date,
      max_capacity,
      status,
      location
    FROM tours
    WHERE guide_id = ?
      AND start_date IS NOT NULL
      AND start_date >= CURDATE()
      AND status IN ('active', 'paused', 'full')
    ORDER BY start_date ASC
    LIMIT 10
    `,
    [guideId]
  );

  return {
    stats: {
      activeTours: Number(activeToursRow?.total || 0),
      totalCustomers: Number(customersRow?.total || 0),
      monthlyIncome: Number(incomeRow?.total || 0),
      completedTours: Number(completedToursRow?.total || 0)
    },
    upcomingTours
  };
}

export async function getGuideSchedules(guideId, filter = "all") {
  let sql = `
    SELECT
      t.id,
      t.title,
      t.location,
      t.start_date,
      t.end_date,
      t.status,
      t.max_capacity
    FROM tours t
    WHERE t.guide_id = ?
  `;

  const params = [guideId];

  if (filter === "upcoming") {
    sql += `
      AND t.start_date IS NOT NULL
      AND DATE(t.start_date) > CURDATE()
      AND t.status IN ('active', 'paused', 'full')
    `;
  }

  if (filter === "running") {
    sql += `
      AND t.start_date IS NOT NULL
      AND t.end_date IS NOT NULL
      AND CURDATE() BETWEEN DATE(t.start_date) AND DATE(t.end_date)
      AND t.status IN ('active', 'paused', 'full')
    `;
  }

  if (filter === "done") {
    sql += `
      AND (
        t.status = 'archived'
        OR (t.end_date IS NOT NULL AND DATE(t.end_date) < CURDATE())
      )
    `;
  }

  sql += `
    ORDER BY
      CASE WHEN t.start_date IS NULL THEN 1 ELSE 0 END,
      t.start_date ASC,
      t.id DESC
  `;

  const [rows] = await db.query(sql, params);
  return rows;
}

export async function getCurrentToursByGuide(guideId, keyword = "") {
  let sql = `
    SELECT
      t.id,
      t.title,
      t.location,
      t.start_date,
      t.end_date,
      t.duration_text,
      t.max_capacity,
      t.status
    FROM tours t
    WHERE t.guide_id = ?
      AND t.status IN ('active', 'paused', 'full')
  `;

  const params = [guideId];

  if (keyword && String(keyword).trim() !== "") {
    sql += `
      AND (
        t.title LIKE ?
        OR t.location LIKE ?
        OR t.duration_text LIKE ?
      )
    `;
    const likeKeyword = `%${String(keyword).trim()}%`;
    params.push(likeKeyword, likeKeyword, likeKeyword);
  }

  sql += `
    ORDER BY
      CASE WHEN t.start_date IS NULL THEN 1 ELSE 0 END,
      t.start_date ASC,
      t.id DESC
  `;

  const [rows] = await db.query(sql, params);
  return rows;
}

export async function getGuideCustomers(
  guideId,
  keyword = "",
  tourFilter = "all",
  tourIdFilter = null
) {
  let sql = `
    SELECT
      b.id,
      t.id AS tour_id,
      COALESCE(NULLIF(TRIM(b.contact_name), ''), u.full_name) AS customer_name,
      COALESCE(NULLIF(TRIM(b.contact_phone), ''), NULLIF(TRIM(u.phone), '')) AS phone,
      COALESCE(NULLIF(TRIM(b.contact_email), ''), NULLIF(TRIM(u.email), ''), '') AS email,
      t.title AS tour_name,
      t.start_date AS tour_date
    FROM bookings b
    JOIN tours t ON t.id = b.tour_id
    JOIN users u ON u.id = b.user_id
    WHERE t.guide_id = ?
  `;

  const params = [guideId];

  const tourIdNum =
    tourIdFilter != null && String(tourIdFilter).trim() !== ""
      ? Number(tourIdFilter)
      : NaN;
  if (!Number.isNaN(tourIdNum)) {
    sql += ` AND t.id = ? `;
    params.push(tourIdNum);
  }

  if (keyword && String(keyword).trim() !== "") {
    sql += `
      AND (
        u.full_name LIKE ?
        OR u.phone LIKE ?
        OR u.email LIKE ?
        OR b.contact_name LIKE ?
        OR b.contact_phone LIKE ?
        OR b.contact_email LIKE ?
        OR t.title LIKE ?
      )
    `;
    const likeKeyword = `%${String(keyword).trim()}%`;
    params.push(
      likeKeyword,
      likeKeyword,
      likeKeyword,
      likeKeyword,
      likeKeyword,
      likeKeyword,
      likeKeyword
    );
  }

  if (
    Number.isNaN(tourIdNum) &&
    tourFilter &&
    tourFilter !== "all"
  ) {
    sql += ` AND t.title LIKE ? `;
    params.push(`%${String(tourFilter).trim()}%`);
  }

  sql += `
    ORDER BY
      CASE WHEN t.start_date IS NULL THEN 1 ELSE 0 END,
      t.start_date ASC,
      b.id DESC
  `;

  const [rows] = await db.query(sql, params);
  return rows;
}

export async function getGuideIncomeData(guideId, monthRange = 6) {
  const safeMonthRange = [3, 6, 12].includes(Number(monthRange))
    ? Number(monthRange)
    : 6;

  const fromDate = new Date();
  fromDate.setHours(0, 0, 0, 0);
  fromDate.setMonth(fromDate.getMonth() - safeMonthRange);

  const fromDateString = `${fromDate.getFullYear()}-${String(
    fromDate.getMonth() + 1
  ).padStart(2, "0")}-${String(fromDate.getDate()).padStart(2, "0")}`;

  const [[totalIncomeRow]] = await db.query(
    `
    SELECT COALESCE(SUM(COALESCE(final_price, 0)), 0) AS total
    FROM tours
    WHERE guide_id = ?
      AND status = 'archived'
    `,
    [guideId]
  );

  const [[monthIncomeRow]] = await db.query(
    `
    SELECT COALESCE(SUM(COALESCE(final_price, 0)), 0) AS total
    FROM tours
    WHERE guide_id = ?
      AND start_date IS NOT NULL
      AND MONTH(start_date) = MONTH(CURDATE())
      AND YEAR(start_date) = YEAR(CURDATE())
      AND status = 'archived'
    `,
    [guideId]
  );

  const [[completedToursRow]] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM tours
    WHERE guide_id = ?
      AND status = 'archived'
    `,
    [guideId]
  );

  const [[avgIncomeRow]] = await db.query(
    `
    SELECT COALESCE(AVG(COALESCE(final_price, 0)), 0) AS avg_income
    FROM tours
    WHERE guide_id = ?
      AND start_date IS NOT NULL
      AND start_date >= ?
      AND status = 'archived'
    `,
    [guideId, fromDateString]
  );

  const [monthlyRows] = await db.query(
    `
    SELECT
      temp.year_number,
      temp.month_number,
      CONCAT(LPAD(temp.month_number, 2, '0'), '/', temp.year_number) AS month_key,
      temp.income
    FROM (
      SELECT
        YEAR(start_date) AS year_number,
        MONTH(start_date) AS month_number,
        COALESCE(SUM(COALESCE(final_price, 0)), 0) AS income
      FROM tours
      WHERE guide_id = ?
        AND start_date IS NOT NULL
        AND start_date >= ?
        AND status = 'archived'
      GROUP BY YEAR(start_date), MONTH(start_date)
    ) AS temp
    ORDER BY temp.year_number ASC, temp.month_number ASC
    `,
    [guideId, fromDateString]
  );

  const [recentTransactions] = await db.query(
    `
    SELECT
      id,
      title,
      start_date,
      final_price,
      status
    FROM tours
    WHERE guide_id = ?
      AND status = 'archived'
    ORDER BY start_date DESC, id DESC
    LIMIT 10
    `,
    [guideId]
  );

  return {
    stats: {
      totalIncome: Number(totalIncomeRow?.total || 0),
      monthlyIncome: Number(monthIncomeRow?.total || 0),
      averageIncomePerTour: Number(avgIncomeRow?.avg_income || 0),
      completedTours: Number(completedToursRow?.total || 0)
    },
    monthlyIncome: Array.isArray(monthlyRows)
      ? monthlyRows.map((row) => ({
          monthKey: row.month_key,
          monthNumber: Number(row.month_number || 0),
          yearNumber: Number(row.year_number || 0),
          income: Number(row.income || 0)
        }))
      : [],
    recentTransactions: Array.isArray(recentTransactions)
      ? recentTransactions.map((row) => ({
          id: Number(row.id),
          tour: row.title || "Chưa có tên tour",
          date: row.start_date || null,
          amount: Number(row.final_price || 0),
          status: row.status || ""
        }))
      : []
  };
}

export async function getGuideProfileData(guideId) {
  const [[guideRow]] = await db.query(
    `
    SELECT
      g.id,
      g.provider_id,
      g.user_id,
      g.experience_years,
      g.languages,
      g.rating_avg,
      g.bio,
      g.certification,
      g.specialty,
      u.full_name,
      u.email,
      u.phone
    FROM guides g
    JOIN users u ON u.id = g.user_id
    WHERE g.id = ?
    LIMIT 1
    `,
    [guideId]
  );

  if (!guideRow) return null;

  const [[tourCountRow]] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM tours
    WHERE guide_id = ?
    `,
    [guideId]
  );

  const [[completedRow]] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM tours
    WHERE guide_id = ?
      AND status = 'archived'
    `,
    [guideId]
  );

  const languages = guideRow.languages
    ? guideRow.languages.split(",").map((item) => ({
        name: item.trim(),
        level: "Chưa cập nhật"
      }))
    : [];

  const specialties = guideRow.specialty
    ? guideRow.specialty.split(",").map((item) => item.trim())
    : [];

  const certificates = guideRow.certification
    ? guideRow.certification.split(",").map((item) => item.trim())
    : [];

  return {
    id: guideRow.id,
    fullName: guideRow.full_name,
    email: guideRow.email,
    phone: guideRow.phone,
    address: "Chưa cập nhật",
    birthDate: null,
    avatarUrl: "",
    role: "Hướng dẫn viên du lịch",
    badgeText: "Hướng dẫn viên chuyên nghiệp",
    rating: Number(guideRow.rating_avg || 0),
    reviewCount: Number(guideRow.rating_count || 0),
    experienceYears: Number(guideRow.experience_years || 0),
    bio: guideRow.bio || "",
    certificates,
    specialties,
    languages,
    stats: {
      totalTours: Number(tourCountRow?.total || 0),
      averageRating: Number(guideRow.rating_avg || 0),
      experienceYears: Number(guideRow.experience_years || 0),
      satisfactionRate: 98,
      completedTours: Number(completedRow?.total || 0)
    }
  };
}