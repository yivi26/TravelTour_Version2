import db from "../config/db.js";
import { buildPages, normalizeKeyword, toNumber } from "../utils/modelHelpers.js";

function mapProviderStatus(status) {
  const s = String(status || "").toLowerCase();
  if (s === "active" || s === "approved") return { label: "Đã phê duyệt", key: "approved" };
  if (s === "locked" || s === "inactive" || s === "suspended")
    return { label: "Đã khóa", key: "locked" };
  return { label: "Chờ phê duyệt", key: "pending" };
}

export async function getProviderStats() {
  const [[totalRow]] = await db.query(`SELECT COUNT(*) AS total FROM providers`);
  const [[approvedRow]] = await db.query(
    `SELECT COUNT(*) AS total FROM providers WHERE status IN ('active','approved')`
  );
  const [[pendingRow]] = await db.query(
    `SELECT COUNT(*) AS total FROM providers WHERE status NOT IN ('active','approved')`
  );

  const total = toNumber(totalRow?.total);
  const approved = toNumber(approvedRow?.total);
  const pending = toNumber(pendingRow?.total);

  return [
    { label: "Tổng nhà cung cấp", value: total.toLocaleString("vi-VN"), tone: "neutral" },
    {
      label: "Đã phê duyệt",
      value: approved.toLocaleString("vi-VN"),
      note: "",
      tone: "approved"
    },
    {
      label: "Chờ phê duyệt",
      value: pending.toLocaleString("vi-VN"),
      note: "",
      tone: "pending"
    }
  ];
}

export async function listProviders({ page = 1, pageSize = 7, q = "" } = {}) {
  const safePageSize = Math.max(5, Math.min(50, toNumber(pageSize, 7)));
  const safePage = Math.max(1, toNumber(page, 1));
  const keyword = normalizeKeyword(q);

  let where = "";
  const params = [];

  if (keyword) {
    where = `WHERE (p.company_name LIKE ? OR u.email LIKE ?)`;
    const like = `%${keyword}%`;
    params.push(like, like);
  }

  const [[countRow]] = await db.query(
    `SELECT COUNT(*) AS total FROM providers p LEFT JOIN users u ON u.id = p.user_id ${where}`,
    params
  );

  const total = toNumber(countRow?.total);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const currentPage = Math.min(safePage, totalPages);
  const offset = (currentPage - 1) * safePageSize;

  const [rows] = await db.query(
    `
    SELECT
      p.id,
      p.company_name,
      p.status,
      p.created_at,
      u.email AS account_email,
      (
        SELECT COUNT(*)
        FROM tours t
        WHERE t.provider_id = p.id
          AND t.status = 'active'
      ) AS active_tours
    FROM providers p
    LEFT JOIN users u ON u.id = p.user_id
    ${where}
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT ? OFFSET ?
    `,
    [...params, safePageSize, offset]
  );

  const suppliers = (rows || []).map((r) => {
    const status = mapProviderStatus(r.status);
    return {
      id: toNumber(r.id),
      name: r.company_name || "Nhà cung cấp",
      email: r.account_email || "",
      tours: toNumber(r.active_tours),
      status: status.label,
      statusKey: status.key,
      rawStatus: r.status || ""
    };
  });

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + safePageSize, total);

  return {
    suppliers,
    paging: {
      page: currentPage,
      pageSize: safePageSize,
      total,
      totalPages,
      text: `Hiển thị ${from}-${to} trong ${total.toLocaleString("vi-VN")} nhà cung cấp`,
      pages: buildPages(currentPage, totalPages)
    }
  };
}

export async function updateProviderStatus(providerId, status) {
  const id = toNumber(providerId, 0);
  if (!id) {
    const err = new Error("ID nhà cung cấp không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const allowed = new Set(["active", "approved", "pending", "inactive", "locked", "suspended"]);
  const s = String(status || "").toLowerCase();
  if (!allowed.has(s)) {
    const err = new Error("Trạng thái nhà cung cấp không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  // Current DB uses a limited enum; normalize to supported values.
  // - approve: active/approved -> approved
  // - lock/inactive/suspended -> pending (fallback)
  let finalStatus = s;
  if (finalStatus === "active") finalStatus = "approved";
  if (finalStatus === "locked" || finalStatus === "inactive" || finalStatus === "suspended")
    finalStatus = "pending";

  await db.query(`UPDATE providers SET status = ? WHERE id = ?`, [finalStatus, id]);

  const [[row]] = await db.query(
    `
    SELECT id, company_name, status, created_at
    FROM providers
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  if (!row) {
    const err = new Error("Không tìm thấy nhà cung cấp");
    err.statusCode = 404;
    throw err;
  }

  const mapped = mapProviderStatus(row.status);
  return {
    id: toNumber(row.id),
    name: row.company_name || "Nhà cung cấp",
    email: "",
    status: mapped.label,
    statusKey: mapped.key,
    rawStatus: row.status || ""
  };
}

