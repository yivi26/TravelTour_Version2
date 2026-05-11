export default function requireCustomerRole(req, res, next) {
  const role = String(req.user?.role || "").toLowerCase();
  if (role !== "customer") {
    return res.status(403).json({
      success: false,
      message: "Chỉ tài khoản khách hàng được thực hiện thao tác này.",
    });
  }
  next();
}
