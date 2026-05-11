const registerForm = document.getElementById("registerForm");
const formMessage = document.getElementById("formMessage");
const toggleButtons = document.querySelectorAll(".toggle-password");

function showMessage(message, type) {
  formMessage.textContent = message;
  formMessage.className = "form-message " + type;
}

/**
 * Gọi API và parse JSON an toàn.
 * - Tránh lỗi khi backend trả về không phải JSON (VD: HTML 404).
 */
async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

toggleButtons.forEach((button) => {
  button.addEventListener("click", function () {
    const targetId = this.getAttribute("data-target");
    const input = document.getElementById(targetId);

    if (!input) return;

    if (input.type === "password") {
      input.type = "text";
      this.textContent = "🙈";
      this.setAttribute("aria-label", "Ẩn mật khẩu");
    } else {
      input.type = "password";
      this.textContent = "👁️";
      this.setAttribute("aria-label", "Hiện mật khẩu");
    }
  });
});

registerForm.addEventListener("submit", function (e) {
  e.preventDefault();

  const fullName = document.getElementById("fullname").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const password = document.getElementById("password").value.trim();
  const confirmPassword = document
    .getElementById("confirm-password")
    .value.trim();
  const terms = document.getElementById("terms").checked;

  if (!fullName || !email || !phone || !password || !confirmPassword) {
    showMessage("Vui lòng nhập đầy đủ thông tin.", "error");
    return;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(email)) {
    showMessage("Email không đúng định dạng.", "error");
    return;
  }

  const phonePattern = /^[0-9\s+]{9,15}$/;
  if (!phonePattern.test(phone)) {
    showMessage("Số điện thoại không hợp lệ.", "error");
    return;
  }

  if (password.length < 6) {
    showMessage("Mật khẩu phải có ít nhất 6 ký tự.", "error");
    return;
  }

  if (password !== confirmPassword) {
    showMessage("Mật khẩu xác nhận không khớp.", "error");
    return;
  }

  if (!terms) {
    showMessage("Bạn cần đồng ý với điều khoản dịch vụ.", "error");
    return;
  }

  // Đăng ký phải đi qua backend để ghi DB.
  // Tuyệt đối không lưu mật khẩu ở localStorage.
  (async () => {
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, phone, password }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        showMessage(data.message || "Đăng ký thất bại.", "error");
        return;
      }

      // Lưu thông tin user tối thiểu (nếu backend trả về) để dùng ở UI.
      if (data.user?.id) {
        localStorage.setItem(
          "traveltour_user",
          JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            fullName: data.user.full_name || data.user.fullName,
            phone: data.user.phone,
            avatarUrl: data.user.avatar_url,
            role: data.user.role || "customer",
            isActive: data.user.is_active ?? true,
            emailVerified: data.user.email_verified ?? false,
            google: false,
          })
        );
      }

      showMessage("Đăng ký thành công!", "success");
      registerForm.reset();

      // Điều hướng về trang đăng nhập (server.js đang map /login).
      setTimeout(() => {
        window.location.href = "/login";
      }, 1200);
    } catch (error) {
      console.error("Register error:", error);
      showMessage("Lỗi kết nối máy chủ.", "error");
    }
  })();
});