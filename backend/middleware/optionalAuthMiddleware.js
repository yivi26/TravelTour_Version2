import jwt from "jsonwebtoken";

/** Gắn req.user nếu có Bearer hợp lệ; không trả 401 khi thiếu token */
export default function optionalAuthMiddleware(req, res, next) {
  req.user = null;
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }
  try {
    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET || "traveltour_dev_secret";
    const decoded = jwt.verify(token, secret);
    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
    };
  } catch {
    req.user = null;
  }
  next();
}
