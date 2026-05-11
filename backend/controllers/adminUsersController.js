import { getUserStats, listUsers, setUserActive } from "../models/adminUsersModel.js";

export async function getAdminUsersController(req, res) {
  try {
    const [stats, list] = await Promise.all([
      getUserStats(),
      listUsers({
        page: Number(req.query.page || 1),
        pageSize: Number(req.query.pageSize || 8),
        q: req.query.q || ""
      })
    ]);

    return res.status(200).json({
      message: "Lấy danh sách người dùng thành công",
      data: {
        stats,
        users: list.users,
        paging: list.paging
      }
    });
  } catch (err) {
    console.error("❌ ADMIN USERS ERROR:", err);
    return res.status(500).json({
      message: "Lỗi lấy danh sách người dùng",
      error: err.sqlMessage || err.message
    });
  }
}

export async function patchAdminUserActiveController(req, res) {
  try {
    const updated = await setUserActive(req.params.id, req.body?.is_active);
    return res.status(200).json({
      message: "Cập nhật trạng thái người dùng thành công",
      data: updated
    });
  } catch (err) {
    console.error("❌ ADMIN USER ACTIVE ERROR:", err);
    const status = Number(err?.statusCode || 500);
    return res.status(status).json({
      message: err.message || "Lỗi cập nhật trạng thái người dùng",
      error: err.sqlMessage || err.message
    });
  }
}

