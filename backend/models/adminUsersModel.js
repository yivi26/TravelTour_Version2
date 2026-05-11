import db from "../config/db.js";
import { buildPages, normalizeKeyword, toNumber } from "../utils/modelHelpers.js";

function mapRole(role) {
  const r = String(role || "").toLowerCase();
  if (r === "provider") return { label: "Nhà cung cấp", key: "supplier" };
  if (r === "guide") return { label: "Hướng dẫn viên", key: "guide" };
  if (r === "admin") return { label: "Admin", key: "admin" };
  return { label: "Khách hàng", key: "customer" };
}

function mapStatus(isActive) {
  const active = Boolean(isActive);
  return active
    ? { label: "Hoạt động", key: "active" }
    : { label: "Đã khóa", key: "locked" };
}

export async function getUserStats() {
  const [[totalRow]] = await db.query(`SELECT COUNT(*) AS total FROM users`);
  const [[customerRow]] = await db.query(
    `SELECT COUNT(*) AS total FROM users WHERE role = 'customer'`
  );
  const [[providerRow]] = await db.query(
    `SELECT COUNT(*) AS total FROM users WHERE role = 'provider'`
  );
  const [[guideRow]] = await db.query(`SELECT COUNT(*) AS total FROM users WHERE role = 'guide'`);

  return [
    { label: "Tổng người dùng", value: toNumber(totalRow?.total).toLocaleString("vi-VN") },
    {
      label: "Khách hàng",
      value: toNumber(customerRow?.total).toLocaleString("vi-VN"),
      badge: "customer"
    },
    {
      label: "Nhà cung cấp",
      value: toNumber(providerRow?.total).toLocaleString("vi-VN"),
      badge: "supplier"
    },
    {
      label: "Hướng dẫn viên",
      value: toNumber(guideRow?.total).toLocaleString("vi-VN"),
      badge: "guide"
    }
  ];
}

export async function listUsers({ page = 1, pageSize = 8, q = "" } = {}) {
  const safePageSize = Math.max(5, Math.min(50, toNumber(pageSize, 8)));
  const safePage = Math.max(1, toNumber(page, 1));
  const keyword = normalizeKeyword(q);

  let where = "";
  const params = [];

  if (keyword) {
    where = `WHERE (u.full_name LIKE ? OR u.email LIKE ? OR u.phone LIKE ?)`;
    const like = `%${keyword}%`;
    params.push(like, like, like);
  }

  const [[countRow]] = await db.query(
    `SELECT COUNT(*) AS total FROM users u ${where}`,
    params
  );
  const total = toNumber(countRow?.total);
  const totalPages = Math.max(1, Math.ceil(total / safePageSize));
  const currentPage = Math.min(safePage, totalPages);
  const offset = (currentPage - 1) * safePageSize;

  const [rows] = await db.query(
    `
    SELECT
      u.id,
      u.full_name,
      u.email,
      u.phone,
      u.role,
      u.is_active,
      u.created_at
    FROM users u
    ${where}
    ORDER BY u.created_at DESC, u.id DESC
    LIMIT ? OFFSET ?
    `,
    [...params, safePageSize, offset]
  );

  const items = (rows || []).map((row) => {
    const role = mapRole(row.role);
    const status = mapStatus(row.is_active);
    return {
      id: toNumber(row.id),
      name: row.full_name || "Chưa có tên",
      email: row.email || "",
      role: role.label,
      roleKey: role.key,
      status: status.label,
      statusKey: status.key,
      is_active: Boolean(row.is_active)
    };
  });

  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + safePageSize, total);

  return {
    users: items,
    paging: {
      page: currentPage,
      pageSize: safePageSize,
      total,
      totalPages,
      text: `Hiển thị ${from}-${to} trong ${total.toLocaleString("vi-VN")} người dùng`,
      pages: buildPages(currentPage, totalPages)
    }
  };
}

export async function setUserActive(userId, isActive) {
  const id = toNumber(userId, 0);
  if (!id) {
    const err = new Error("ID người dùng không hợp lệ");
    err.statusCode = 400;
    throw err;
  }

  const active = Boolean(isActive);

  await db.query(`UPDATE users SET is_active = ? WHERE id = ?`, [active ? 1 : 0, id]);

  const [[row]] = await db.query(
    `
    SELECT id, full_name, email, role, is_active
    FROM users
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  if (!row) {
    const err = new Error("Không tìm thấy người dùng");
    err.statusCode = 404;
    throw err;
  }

  const role = mapRole(row.role);
  const status = mapStatus(row.is_active);

  return {
    id: toNumber(row.id),
    name: row.full_name || "Chưa có tên",
    email: row.email || "",
    role: role.label,
    roleKey: role.key,
    status: status.label,
    statusKey: status.key,
    is_active: Boolean(row.is_active)
  };
}

