const loginForm = document.getElementById("loginForm");
const formMessage = document.getElementById("formMessage");
const toggleButtons = document.querySelectorAll(".toggle-password");

function showMessage(message, type) {
  if (!formMessage) return;
  formMessage.textContent = message;
  formMessage.className = "form-message " + type;
}

function redirectByRole(user) {
  const role = user?.role;
  const params = new URLSearchParams(window.location.search);
  const returnToRaw = params.get("return_to");
  const returnTo =
    returnToRaw && returnToRaw.startsWith("/")
      ? returnToRaw
      : returnToRaw && returnToRaw.startsWith("./")
        ? returnToRaw
        : null;

  if (returnTo) {
    window.location.href = returnTo;
    return;
  }

  if (role === "admin") {
    window.location.href = "/pages/admin/tongquan.html";
    return;
  }

  if (role === "provider") {
    window.location.href = "/pages/provider/dashboard.html";
    return;
  }

  if (role === "guide") {
    window.location.href = "/pages/guide/tongquan.html";
    return;
  }

  if (role === "customer") {
    window.location.href = "/index.html";
    return;
  }

  window.location.href = "/index.html";
}

function cleanupLegacySessionKeys() {
  // Chi xoa key cu dung chung de tranh lam mat du lieu booking theo user.
  sessionStorage.removeItem("traveltour-booking");
  sessionStorage.removeItem("traveltour-last-booking");
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

if (loginForm) {
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("email")?.value.trim();
    const password = document.getElementById("password")?.value.trim();
    const remember = document.getElementById("remember")?.checked;

    if (!email || !password) {
      showMessage("Vui lòng nhập đầy đủ email và mật khẩu.", "error");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(email)) {
      showMessage("Email không đúng định dạng.", "error");
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      let data = {};
      try {
        data = await res.json();
      } catch {
        data = {};
      }

      if (!res.ok) {
        showMessage(data.message || "Đăng nhập thất bại.", "error");
        return;
      }
      localStorage.removeItem("accessToken");
      localStorage.removeItem("traveltour_user");
      cleanupLegacySessionKeys();

      localStorage.setItem("accessToken", data.accessToken || data.token);
      if (data.user) {
        localStorage.setItem(
          "traveltour_user",
          JSON.stringify({
            id: data.user.id,
            email: data.user.email,
            fullName: data.user.full_name,
            phone: data.user.phone,
            avatarUrl: data.user.avatar_url,
            role: data.user.role,
            isActive: data.user.is_active,
            emailVerified: data.user.email_verified,
            google: false,
          }),
        );
      }

      if (remember) {
        localStorage.setItem("traveltour_remember", "true");
      } else {
        localStorage.removeItem("traveltour_remember");
      }

      showMessage("Đăng nhập thành công!", "success");

      setTimeout(() => {
        redirectByRole(data.user);
      }, 800);
    } catch (error) {
      console.error("Login error:", error);
      showMessage("Lỗi kết nối máy chủ.", "error");
    }
  });
}

async function handleGoogleCredential(response) {
  if (!response?.credential) {
    showMessage("Đăng nhập Google không thành công.", "error");
    return;
  }

  try {
    const res = await fetch("/api/auth/google-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: response.credential }),
    });

    let data = {};
    try {
      data = await res.json();
    } catch {
      data = {};
    }

    if (!res.ok) {
      showMessage(data.message || "Đăng nhập Google thất bại.", "error");
      return;
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("traveltour_user");
    cleanupLegacySessionKeys();

    localStorage.setItem("accessToken", data.accessToken || data.token);
    if (data.user) {
      localStorage.setItem(
        "traveltour_user",
        JSON.stringify({
          id: data.user.id,
          email: data.user.email,
          fullName: data.user.full_name,
          avatarUrl: data.user.avatar_url,
          role: data.user.role,
          isActive: data.user.is_active,
          emailVerified: data.user.email_verified,
          google: true,
        }),
      );
    }

    const remember = document.getElementById("remember");
    if (remember?.checked) {
      localStorage.setItem("traveltour_remember", "true");
    } else {
      localStorage.removeItem("traveltour_remember");
    }

    showMessage("Đăng nhập thành công!", "success");

    setTimeout(() => {
      redirectByRole(data.user);
    }, 800);
  } catch (error) {
    console.error("Google login error:", error);
    showMessage("Lỗi kết nối máy chủ.", "error");
  }
}

function setupGoogleSignIn() {
  const slot = document.getElementById("googleSignInSlot");
  const host = document.getElementById("googleSignInHost");
  if (!slot) return;

  fetch("/api/auth/google-client-id")
    .then(async (r) => {
      let data = {};
      try {
        data = await r.json();
      } catch {
        data = {};
      }
      return { ok: r.ok, data };
    })
    .then(({ ok, data }) => {
      if (!ok || !data.clientId) {
        if (host) {
          host.innerHTML =
            '<p class="google-signin-error">Đăng nhập Google chưa được cấu hình (GOOGLE_CLIENT_ID).</p>';
        }
        return;
      }

      window.google.accounts.id.initialize({
        client_id: data.clientId,
        callback: handleGoogleCredential,
        auto_select: false,
      });

      const measureWidth = () => {
        const row = host?.querySelector(".google-signin-row");
        return Math.max(
          280,
          (row?.offsetWidth || host?.offsetWidth || 400) | 0,
        );
      };

      const render = () => {
        slot.innerHTML = "";
        const w = measureWidth();
        window.google.accounts.id.renderButton(slot, {
          type: "standard",
          theme: "filled_blue",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          width: w,
          locale: "vi",
        });
      };

      requestAnimationFrame(() => {
        requestAnimationFrame(render);
      });
    })
    .catch(() => {
      const h = document.getElementById("googleSignInHost");
      if (h) {
        h.innerHTML =
          '<p class="google-signin-error">Không tải được cấu hình Google.</p>';
      }
    });
}

function waitForGoogleAndInit() {
  if (window.google?.accounts?.id) {
    setupGoogleSignIn();
    return;
  }

  let tries = 0;
  const maxTries = 200;
  const timer = setInterval(() => {
    tries += 1;
    if (window.google?.accounts?.id) {
      clearInterval(timer);
      setupGoogleSignIn();
    } else if (tries >= maxTries) {
      clearInterval(timer);
      const h = document.getElementById("googleSignInHost");
      if (h) {
        h.innerHTML =
          '<p class="google-signin-error">Không tải được Google Sign-In.</p>';
      }
    }
  }, 50);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", waitForGoogleAndInit);
} else {
  waitForGoogleAndInit();
}
