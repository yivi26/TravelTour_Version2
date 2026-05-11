import db from "../config/db.js";
import { buildPages, normalizeKeyword, toNumber } from "../utils/modelHelpers.js";

async function tryQuery(sql, params = [], fallback = []) {
  try {
    const [rows] = await db.query(sql, params);
    return rows;
  } catch {
    return fallback;
  }
}

export async function getGuideStats() {
  const [[totalRow]] = await db.query(
    `SELECT COUNT(*) AS total FROM guides g JOIN users u ON u.id = g.user_id`
  );
  const [[activeRow]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM guides g
     JOIN users u ON u.id = g.user_id
     WHERE g.status = 'active' AND u.is_active = 1`
  );

  // Total tours assigned (best-effort; depends on DB schema having tours.guide_id)
  const tourRows = await tryQuery(`SELECT COUNT(*) AS total FROM tours WHERE guide_id IS NOT NULL`);
  const totalAssignedTours = toNumber(tourRows?.[0]?.total, 0);

  const ratingRows = await tryQuery(
    `SELECT COALESCE(AVG(rating_avg), 0) AS avg_rating FROM guides`,
    [],
    [{ avg_rating: 0 }]
  );
  const avgRating = Number(ratingRows?.[0]?.avg_rating || 0);

  return [
    {
      label: "Tổng hướng dẫn viên",
      value: toNumber(totalRow?.total).toLocaleString("vi-VN"),
      icon: "users",
      tone: "purple"
    },
    {
      label: "Đang hoạt động",
      value: toNumber(activeRow?.total).toLocaleString("vi-VN"),
      note: "",
      icon: "check",
      tone: "green"
    },
    {
      label: "Tour đang phụ trách",
      value: totalAssignedTours.toLocaleString("vi-VN"),
      icon: "compass",
      tone: "blue"
    },
    {
      label: "Đánh giá TB",
      value: avgRating ? avgRating.toFixed(1) : "0.0",
      icon: "star",
      tone: "yellow"
    }
  ];
}

export async function listGuides({ page = 1, pageSize = 7, q = "" } = {}) {
  const safePageSize = Math.max(5, Math.min(50, toNumber(pageSize, 7)));
  const safePage = Math.max(1, toNumber(page, 1));
  const keyword = normalizeKeyword(q);

  let where = `WHERE u.role = 'guide'`;
  const params = [];
  if (keyword) {
    where += ` AND (u.full_name LIKE ? OR u.phone LIKE ? OR u.email LIKE ?)`;
    const like = `%${keyword}%`;
    params.push(like, like, like);
  }

  const [[countRow]] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM guides g
    JOIN users u ON u.id = g.user_id
    ${where}
    `,
    params
  );

  const total = toNumber(countRow?.total);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const currentPage = Math.min(safePage, totalPages);
  const offset = (currentPage - 1) * safePageSize;

  const [rows] = await db.query(
    `
    SELECT
      g.id AS guide_id,
      g.user_id,
      g.status AS guide_status,
      g.rating_avg,
      u.full_name,
      u.phone,
      u.email,
      u.is_active
    FROM guides g
    JOIN users u ON u.id = g.user_id
    ${where}
    ORDER BY g.created_at DESC, g.id DESC
    LIMIT ? OFFSET ?
    `,
    [...params, safePageSize, offset]
  );

  // Best-effort: if tours.guide_id exists, populate tourCount + a few current tour titles.
  const guideIds = rows.map((r) => toNumber(r.guide_id)).filter(Boolean);

  const tourCountsRows = guideIds.length
    ? await tryQuery(
        `
        SELECT guide_id, COUNT(*) AS total
        FROM tours
        WHERE guide_id IN (?)
          AND status IN ('active','paused','full')
        GROUP BY guide_id
        `,
        [guideIds],
        []
      )
    : [];
  const tourCountsMap = new Map(tourCountsRows.map((r) => [toNumber(r.guide_id), toNumber(r.total)]));

  const tourTitlesRows = guideIds.length
    ? await tryQuery(
        `
        SELECT guide_id, title
        FROM tours
        WHERE guide_id IN (?)
          AND status IN ('active','paused','full')
        ORDER BY start_date IS NULL, start_date ASC, id DESC
        `,
        [guideIds],
        []
      )
    : [];
  const tourTitlesMap = new Map();
  for (const r of tourTitlesRows) {
    const id = toNumber(r.guide_id);
    if (!id) continue;
    const arr = tourTitlesMap.get(id) || [];
    if (arr.length < 3) arr.push(r.title);
    tourTitlesMap.set(id, arr);
  }

  const guides = (rows || []).map((r) => {
    const gid = toNumber(r.guide_id);
    return {
      id: gid,
      name: r.full_name || "Hướng dẫn viên",
      phone: r.phone || "",
      tours: tourTitlesMap.get(gid) || [],
      tourCount: tourCountsMap.get(gid) || 0,
      rating: String(r.rating_avg ?? "0.0"),
      is_active: toNumber(r.is_active) === 1,
      status: r.guide_status || "active"
    };
  });

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + safePageSize, total);

  return {
    guides,
    paging: {
      page: currentPage,
      pageSize: safePageSize,
      total,
      totalPages,
      text: `Hiển thị ${from}-${to} trong ${total.toLocaleString("vi-VN")} hướng dẫn viên`,
      pages: buildPages(currentPage, totalPages)
    }
  };
}

export async function setGuideActive(guideId, isActive) {
  const id = toNumber(guideId, 0);
  if (!id) {
    const err = new Error("ID hướng dẫn viên không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const active = Boolean(isActive);

  const [[row]] = await db.query(
    `
    SELECT g.id AS guide_id, g.user_id
    FROM guides g
    WHERE g.id = ?
    LIMIT 1
    `,
    [id]
  );

  if (!row) {
    const err = new Error("Không tìm thấy hướng dẫn viên");
    err.statusCode = 404;
    throw err;
  }

  await db.query(`UPDATE users SET is_active = ? WHERE id = ?`, [active ? 1 : 0, row.user_id]);
  await db.query(`UPDATE guides SET status = ? WHERE id = ?`, [active ? "active" : "inactive", id]);

  return { id, is_active: active };
}

