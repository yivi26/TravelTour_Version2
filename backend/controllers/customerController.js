import bcrypt from "bcrypt";
import db from "../config/db.js";
import {
  getUserProfileById,
  updateUserProfileById,
  getUserPasswordById,
  updateUserPasswordById,
} from "../models/userModel.js";
import { createTourReview, deleteOwnTourReview } from "../models/tourReviewsModel.js";

export const getCustomerProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const user = await getUserProfileById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy thông tin khách hàng",
      });
    }

    const userData = {
      ...user,
      avatar_url: user.avatar_url
        ? `http://localhost:3000${user.avatar_url}`
        : "",
    };

    return res.status(200).json({
      success: true,
      data: userData,
    });
  } catch (error) {
    next(error);
  }
};

export const updateCustomerProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { full_name, phone } = req.body;
    if (!full_name || !phone) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ họ tên và số điện thoại",
      });
    }

    const phoneRegex = /^(0\d{9})$/;

    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: "Số điện thoại không hợp lệ",
      });
    }

    const currentUser = await getUserProfileById(userId);

    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy khách hàng",
      });
    }

    await updateUserProfileById(userId, {
      full_name,
      phone,
    });

    const updatedUser = await getUserProfileById(userId);

    return res.status(200).json({
      success: true,
      message: "Cập nhật thông tin thành công",
      data: updatedUser,
    });
  } catch (error) {
    next(error);
  }
};
export const updateCustomerAvatar = async (req, res) => {
  try {
    const userId = req.user.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "Không tìm thấy user",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng chọn ảnh đại diện",
      });
    }

    const avatarPath = `/uploads/avatars/${req.file.filename}`;

    await db.execute("UPDATE users SET avatar_url = ? WHERE id = ?", [
      avatarPath,
      userId,
    ]);

    return res.status(200).json({
      success: true,
      message: "Cập nhật ảnh đại diện thành công",
      data: {
        avatar_url: `http://localhost:3000${avatarPath}`,
      },
    });
  } catch (error) {
    console.error("updateCustomerAvatar error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi cập nhật ảnh đại diện",
    });
  }
};
export const changePassword = async (req, res) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng nhập đầy đủ thông tin.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "Xác nhận mật khẩu mới không khớp.",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu mới không được trùng mật khẩu hiện tại.",
      });
    }

    const hasMinLength = newPassword.length >= 8;
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /[0-9]/.test(newPassword);
    const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);

    if (
      !hasMinLength ||
      !hasUpperCase ||
      !hasLowerCase ||
      !hasNumber ||
      !hasSpecialChar
    ) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu mới chưa đúng yêu cầu bảo mật.",
      });
    }

    const user = await getUserPasswordById(userId);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy người dùng.",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password_hash);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Mật khẩu hiện tại không đúng.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await updateUserPasswordById(userId, hashedPassword);

    return res.status(200).json({
      success: true,
      message: "Cập nhật mật khẩu thành công.",
    });
  } catch (error) {
    console.error("changePassword error:", error);
    return res.status(500).json({
      success: false,
      message: "Lỗi server khi đổi mật khẩu.",
    });
  }
};

export const postCustomerTourReview = async (req, res) => {
  try {
    const tourId = req.params.tourId;
    const { rating, comment } = req.body || {};
    const created = await createTourReview({
      userId: req.user.id,
      tourId,
      rating,
      comment,
    });
    const message =
      created.status === "approved"
        ? "Đánh giá đã được đăng và hiển thị công khai."
        : "Đã gửi đánh giá. Vui lòng chờ admin duyệt trước khi hiển thị công khai.";
    return res.status(201).json({
      success: true,
      message,
      data: created,
    });
  } catch (err) {
    const code = err.statusCode || 500;
    return res.status(code).json({
      success: false,
      message: err.message || "Không gửi được đánh giá",
    });
  }
};

export const deleteCustomerTourReview = async (req, res) => {
  try {
    const reviewId = req.params.reviewId;
    const result = await deleteOwnTourReview(req.user.id, reviewId);
    return res.status(200).json({
      success: true,
      message: "Đã xóa đánh giá",
      data: result,
    });
  } catch (err) {
    const code = err.statusCode || 500;
    return res.status(code).json({
      success: false,
      message: err.message || "Không xóa được đánh giá",
    });
  }
};
