function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  if (sidebar) sidebar.classList.toggle("open");
  if (overlay) overlay.classList.toggle("show");
}

function closeSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");
  if (sidebar) sidebar.classList.remove("open");
  if (overlay) overlay.classList.remove("show");
}

function getStoredUser() {
  try {
    return JSON.parse(localStorage.getItem("traveltour_user") || "{}");
  } catch (error) {
    return {};
  }
}

function setTopbarUserName(name) {
  const userNameEl = document.querySelector(".user-name");
  if (userNameEl && name) {
    userNameEl.textContent = name;
  }
}

async function syncTopbarUserName() {
  const storedUser = getStoredUser();
  const localName = storedUser.fullName || storedUser.full_name || "";

  if (localName) {
    setTopbarUserName(localName);
  }

  try {
    const response = await fetch("http://localhost:3000/api/customer/profile", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("accessToken"),
      },
    });
    const result = await response.json();

    if (!response.ok || !result.success || !result.data) return;

    const realName = result.data.full_name || result.data.fullName || "";
    if (!realName) return;

    setTopbarUserName(realName);

    localStorage.setItem(
      "traveltour_user",
      JSON.stringify({
        ...storedUser,
        fullName: realName,
      }),
    );
  } catch (error) {
    console.warn("Không đồng bộ được tên khách hàng:", error);
  }
}

function togglePassword(inputId, button) {
  const input = document.getElementById(inputId);
  if (!input) return;

  if (input.type === "password") {
    input.type = "text";
    button.textContent = "🙈";
  } else {
    input.type = "password";
    button.textContent = "👁";
  }
}

function validatePassword(newPassword) {
  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecialChar = /[^A-Za-z0-9]/.test(newPassword);

  return (
    hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar
  );
}

function bindEvents() {
  const menuToggle = document.getElementById("menuToggle");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const cancelPasswordBtn = document.getElementById("cancelPasswordBtn");
  const form = document.getElementById("changePasswordForm");
  const message = document.getElementById("passwordMessage");
  const toggleButtons = document.querySelectorAll(".toggle-password");

  if (menuToggle) {
    menuToggle.addEventListener("click", toggleSidebar);
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", closeSidebar);
  }

  toggleButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const targetId = this.getAttribute("data-target");
      togglePassword(targetId, this);
    });
  });

  if (cancelPasswordBtn) {
    cancelPasswordBtn.addEventListener("click", function () {
      form.reset();
      if (message) {
        message.textContent = "";
        message.className = "password-message";
      }

      document.getElementById("currentPassword").type = "password";
      document.getElementById("newPassword").type = "password";
      document.getElementById("confirmPassword").type = "password";

      toggleButtons.forEach((btn) => {
        btn.textContent = "👁";
      });
    });
  }

  if (form) {
    form.addEventListener("submit", async function (event) {
      event.preventDefault();

      const currentPassword = document
        .getElementById("currentPassword")
        .value.trim();
      const newPassword = document.getElementById("newPassword").value.trim();
      const confirmPassword = document
        .getElementById("confirmPassword")
        .value.trim();

      if (!currentPassword || !newPassword || !confirmPassword) {
        message.textContent = "Vui lòng nhập đầy đủ thông tin.";
        message.className = "password-message error";
        return;
      }

      const passwordErrors = validatePassword(newPassword);

      if (!validatePassword(newPassword)) {
        message.textContent = "Mật khẩu mới chưa đúng yêu cầu bảo mật.";
        message.className = "password-message error";
        return;
      }
      if (newPassword !== confirmPassword) {
        message.textContent = "Xác nhận mật khẩu mới không khớp.";
        message.className = "password-message error";
        return;
      }

      if (currentPassword === newPassword) {
        message.textContent =
          "Mật khẩu mới không được trùng mật khẩu hiện tại.";
        message.className = "password-message error";
        return;
      }

      try {
        const response = await fetch(
          "http://localhost:3000/api/customer/change-password",
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + localStorage.getItem("accessToken"),
            },
            body: JSON.stringify({
              currentPassword,
              newPassword,
              confirmPassword,
            }),
          },
        );

        const result = await response.json();

        if (!result.success) {
          message.textContent = result.message || "Đổi mật khẩu thất bại.";
          message.className = "password-message error";
          return;
        }

        message.textContent = result.message || "Cập nhật mật khẩu thành công.";
        message.className = "password-message success";
        form.reset();

        toggleButtons.forEach((btn) => {
          btn.textContent = "👁";
        });

        document.getElementById("currentPassword").type = "password";
        document.getElementById("newPassword").type = "password";
        document.getElementById("confirmPassword").type = "password";
      } catch (error) {
        console.error("changePassword error:", error);
        message.textContent = "Không thể kết nối server.";
        message.className = "password-message error";
      }
    });
  }

  window.addEventListener("resize", function () {
    if (window.innerWidth >= 1024) {
      closeSidebar();
    }
  });
}

document.addEventListener("DOMContentLoaded", function () {
  syncTopbarUserName();
  bindEvents();
});
