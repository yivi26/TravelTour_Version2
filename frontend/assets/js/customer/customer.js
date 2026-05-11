const DEFAULT_AVATAR = "https://via.placeholder.com/120?text=Avatar";
function setSafeAvatar(imgElement, avatarUrl) {
  if (!imgElement) return;

  const safeUrl =
    avatarUrl && String(avatarUrl).trim() !== "" ? avatarUrl : DEFAULT_AVATAR;

  imgElement.src = safeUrl;
  imgElement.onerror = function () {
    this.onerror = null;
    this.src = DEFAULT_AVATAR;
  };
}
function goToLogin() {
  window.location.href = "../dangnhap/login.html";
}

function goToChangePassword() {
  window.location.href = "changepass.html";
}

function goToHistory() {
  window.location.href = "history.html";
}

async function loadCustomerProfile() {
  try {
    const response = await fetch("http://localhost:3000/api/customer/profile", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("accessToken"),
      },
    });
    const result = await response.json();

    if (!result.success) {
      showToast(result.message || "Không tải được thông tin", "error");
      return;
    }

    const user = result.data;

    try {
      const rawCache = localStorage.getItem("traveltour_user");
      if (rawCache && user) {
        const cache = JSON.parse(rawCache);
        localStorage.setItem(
          "traveltour_user",
          JSON.stringify({
            ...cache,
            fullName: user.full_name ?? cache.fullName,
            phone: user.phone ?? cache.phone,
            email: user.email ?? cache.email,
            avatarUrl: user.avatar_url ?? cache.avatarUrl,
          }),
        );
      }
    } catch (_) {
      /* ignore */
    }

    // ===== TOPBAR =====
    const topbarUserName = document.getElementById("topbarUserName");
    const topbarUserRole = document.getElementById("topbarUserRole");
    const topbarUserAvatar = document.getElementById("topbarUserAvatar");

    if (topbarUserName) {
      topbarUserName.textContent = user.full_name || "Chưa cập nhật";
    }

    if (topbarUserRole) {
      topbarUserRole.textContent = "Khách hàng";
    }

    if (topbarUserAvatar) {
      setSafeAvatar(topbarUserAvatar, user.avatar_url);
    }

    // ===== PROFILE =====
    const profileAvatar = document.getElementById("profileAvatar");
    const profileFullName = document.getElementById("profileFullName");
    const profileEmail = document.getElementById("profileEmail");
    const profilePhone = document.getElementById("profilePhone");
    const profileAddress = document.getElementById("profileAddress");

    if (profileAvatar) {
      setSafeAvatar(profileAvatar, user.avatar_url);
    }

    if (profileFullName) {
      profileFullName.textContent = user.full_name || "Chưa cập nhật";
    }

    if (profileEmail) {
      profileEmail.textContent = user.email || "Chưa cập nhật";
    }

    if (profilePhone) {
      profilePhone.textContent = user.phone || "Chưa cập nhật";
    }

    if (profileAddress) {
      profileAddress.textContent = user.address || "Chưa cập nhật";
    }
  } catch (error) {
    console.error("Lỗi loadCustomerProfile:", error);
    showToast("Không thể kết nối server", "error");
  }
}

function toggleSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  if (!sidebar || !overlay) return;

  sidebar.classList.toggle("open");
  overlay.classList.toggle("show");
}

function closeSidebar() {
  const sidebar = document.getElementById("sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  if (!sidebar || !overlay) return;

  sidebar.classList.remove("open");
  overlay.classList.remove("show");
}

function bindBookingDetail() {
  document.addEventListener("click", function (event) {
    const detailButton = event.target.closest(".btn-detail");
    if (!detailButton) return;

    const bookingId = detailButton.getAttribute("data-id");
    if (!bookingId) return;

    window.location.href = `../tours/chitiet.html?booking_id=${bookingId}`;
  });
}

function bindLogout() {
  const logoutBtn = document.querySelector(".logout-btn");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", function () {
    const modal = document.getElementById("logoutModal");
    modal.classList.add("active");
  });
}
function handleLogoutModal() {
  const modal = document.getElementById("logoutModal");
  const cancelBtn = document.getElementById("cancelLogout");
  const confirmBtn = document.getElementById("confirmLogout");

  cancelBtn.addEventListener("click", () => {
    modal.classList.remove("active");
  });

  confirmBtn.addEventListener("click", () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("traveltour_user");

    window.location.href = "../dangnhap/login.html";
  });
}
function enterInlineEditMode() {
  const fullNameText = document.getElementById("profileFullName");
  const phoneText = document.getElementById("profilePhone");
  const addressText = document.getElementById("profileAddress");

  const fullNameInput = document.getElementById("editInlineFullName");
  const phoneInput = document.getElementById("editInlinePhone");
  const addressInput = document.getElementById("editInlineAddress");

  const updateInfoBtn = document.getElementById("updateInfoBtn");
  const saveInfoBtn = document.getElementById("saveInfoBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const changePasswordBtn = document.getElementById("changePasswordBtn");

  if (fullNameInput) {
    fullNameInput.value = fullNameText?.textContent?.trim() || "";
    fullNameInput.classList.remove("hidden");
    fullNameText?.classList.add("hidden");
    fullNameInput.closest(".info-box")?.classList.add("editing");
  }

  if (phoneInput) {
    const currentPhone = phoneText?.textContent?.trim() || "";
    phoneInput.value = currentPhone === "Chưa cập nhật" ? "" : currentPhone;
    phoneInput.classList.remove("hidden");
    phoneText?.classList.add("hidden");
    phoneInput.closest(".info-box")?.classList.add("editing");
  }

  if (addressInput) {
    const currentAddress = addressText?.textContent?.trim() || "";
    addressInput.value =
      currentAddress === "Chưa cập nhật" ? "" : currentAddress;
    addressInput.classList.remove("hidden");
    addressText?.classList.add("hidden");
    addressInput.closest(".info-box")?.classList.add("editing");
  }

  updateInfoBtn?.classList.add("hidden");
  saveInfoBtn?.classList.remove("hidden");
  cancelEditBtn?.classList.remove("hidden");
  changePasswordBtn?.classList.add("hidden");
}

function exitInlineEditMode() {
  const fullNameText = document.getElementById("profileFullName");
  const phoneText = document.getElementById("profilePhone");
  const addressText = document.getElementById("profileAddress");

  const fullNameInput = document.getElementById("editInlineFullName");
  const phoneInput = document.getElementById("editInlinePhone");
  const addressInput = document.getElementById("editInlineAddress");

  const updateInfoBtn = document.getElementById("updateInfoBtn");
  const saveInfoBtn = document.getElementById("saveInfoBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");
  const changePasswordBtn = document.getElementById("changePasswordBtn");

  fullNameInput?.classList.add("hidden");
  phoneInput?.classList.add("hidden");
  addressInput?.classList.add("hidden");

  fullNameText?.classList.remove("hidden");
  phoneText?.classList.remove("hidden");
  addressText?.classList.remove("hidden");

  fullNameInput?.closest(".info-box")?.classList.remove("editing");
  phoneInput?.closest(".info-box")?.classList.remove("editing");
  addressInput?.closest(".info-box")?.classList.remove("editing");

  updateInfoBtn?.classList.remove("hidden");
  saveInfoBtn?.classList.add("hidden");
  cancelEditBtn?.classList.add("hidden");
  changePasswordBtn?.classList.remove("hidden");
}

async function saveInlineProfile() {
  try {
    const full_name =
      document.getElementById("editInlineFullName")?.value.trim() || "";
    const phone =
      document.getElementById("editInlinePhone")?.value.trim() || "";
    const address =
      document.getElementById("editInlineAddress")?.value.trim() || "";

    if (!full_name || !phone || !address) {
      showToast(
        "Vui lòng nhập đầy đủ họ tên, số điện thoại và địa chỉ",
        "error",
      );
      return;
    }
    if (full_name.length < 2) {
      showToast("Họ tên phải có ít nhất 2 ký tự", "error");
      return;
    }
    const phoneRegex = /^(0\d{9})$/;

    if (!phoneRegex.test(phone)) {
      showToast(
        "Số điện thoại không hợp lệ. Vui lòng nhập 10 số và bắt đầu bằng số 0",
        "error",
      );
      return;
    }
    if (address.length < 5) {
      showToast("Địa chỉ phải có ít nhất 5 ký tự", "error");
      return;
    }

    const response = await fetch("http://localhost:3000/api/customer/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + localStorage.getItem("accessToken"),
      },
      body: JSON.stringify({
        full_name,
        phone,
        address,
      }),
    });

    const result = await response.json();

    if (!result.success) {
      showToast(result.message || "Cập nhật thất bại", "error");
      return;
    }

    await loadCustomerProfile();
    exitInlineEditMode();
    showToast("Cập nhật thông tin thành công");
  } catch (error) {
    console.error("saveInlineProfile error:", error);
    showToast("Không thể cập nhật thông tin", "error");
  }
}
async function uploadCustomerAvatar(file) {
  try {
    if (!file) return;

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      showToast("Chỉ chấp nhận ảnh JPG, PNG hoặc WEBP", "error");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      showToast("Ảnh không được vượt quá 2MB", "error");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    const response = await fetch("http://localhost:3000/api/customer/avatar", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + localStorage.getItem("accessToken"),
      },
      body: formData,
    });

    const result = await response.json();

    if (!result.success) {
      showToast(result.message || "Upload ảnh thất bại", "error");
      return;
    }

    await loadCustomerProfile();
    showToast("Cập nhật ảnh đại diện thành công");
  } catch (error) {
    console.error("uploadCustomerAvatar error:", error);
    showToast("Không thể upload ảnh đại diện", "error");
  }
}
function showToast(message, type = "success") {
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toastMessage");

  if (!toast || !toastMessage) return;

  toastMessage.textContent = message;

  toast.classList.remove("hidden", "error");

  if (type === "error") {
    toast.classList.add("error");
  }

  setTimeout(() => {
    toast.classList.add("show");
  }, 10);

  setTimeout(() => {
    toast.classList.remove("show");

    setTimeout(() => {
      toast.classList.add("hidden");
    }, 300);
  }, 3000);
}
function bindEvents() {
  const menuToggle = document.getElementById("menuToggle");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const changeAvatarBtn = document.getElementById("changeAvatarBtn");
  const avatarInput = document.getElementById("avatarInput");
  const updateInfoBtn = document.getElementById("updateInfoBtn");
  const changePasswordBtn = document.getElementById("changePasswordBtn");
  const viewAllBtn = document.getElementById("viewAllBtn");

  const saveInfoBtn = document.getElementById("saveInfoBtn");
  const cancelEditBtn = document.getElementById("cancelEditBtn");

  if (menuToggle) {
    menuToggle.addEventListener("click", toggleSidebar);
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", closeSidebar);
  }

  if (changeAvatarBtn && avatarInput) {
    changeAvatarBtn.addEventListener("click", function () {
      avatarInput.click();
    });
  }
  if (avatarInput) {
    avatarInput.addEventListener("change", async function () {
      const file = this.files?.[0];
      if (!file) return;

      await uploadCustomerAvatar(file);
      this.value = "";
    });
  }

  if (updateInfoBtn) {
    updateInfoBtn.addEventListener("click", function () {
      enterInlineEditMode();
    });
  }

  if (saveInfoBtn) {
    saveInfoBtn.addEventListener("click", function () {
      saveInlineProfile();
    });
  }

  if (cancelEditBtn) {
    cancelEditBtn.addEventListener("click", function () {
      exitInlineEditMode();
    });
  }

  if (changePasswordBtn) {
    changePasswordBtn.addEventListener("click", function () {
      goToChangePassword();
    });
  }

  if (viewAllBtn) {
    viewAllBtn.addEventListener("click", function () {
      goToHistory();
    });
  }

  window.addEventListener("resize", function () {
    if (window.innerWidth >= 1024) {
      closeSidebar();
    }
  });

  bindLogout();
  bindBookingDetail();
}
async function loadRecentBookings() {
  try {
    const response = await fetch("http://localhost:3000/api/bookings/recent", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("accessToken"),
      },
    });
    const result = await response.json();

    if (!result.success) {
      console.error("Không lấy được booking gần đây");
      return;
    }

    renderRecentBookings(result.data);
  } catch (error) {
    console.error("Lỗi khi gọi API recent bookings:", error);
  }
}

function renderRecentBookings(bookings) {
  const bookingList = document.getElementById("bookingList");

  if (!bookingList) {
    console.error("Không tìm thấy thẻ #bookingList");
    return;
  }

  if (!bookings || bookings.length === 0) {
    bookingList.innerHTML = `
      <div class="empty-booking">
        Bạn chưa có booking nào gần đây.
      </div>
    `;
    return;
  }

  bookingList.innerHTML = "";

  bookings.forEach((booking) => {
    const bookingItem = document.createElement("div");
    bookingItem.className = "booking-item";

    bookingItem.innerHTML = `
  <div class="booking-content">
    <div class="booking-main">
      <div class="booking-top">
        <h3 class="booking-title">${booking.tour_name}</h3>
        <span class="status-badge ${getStatusClass(booking.status)}">
          ${booking.statusLabel}
        </span>
      </div>

      <div class="booking-location">
        <span>📍</span>
        <span>${booking.location}</span>
      </div>

      <div class="booking-dates">
        <div>
          <span class="date-label">Ngày đặt</span>
          <span class="date-value">${formatDate(booking.booking_date)}</span>
        </div>
        <div>
          <span class="date-label">Ngày khởi hành</span>
          <span class="date-value">${formatDate(booking.departure_date)}</span>
        </div>
      </div>
    </div>

    <div class="booking-side">
      <div class="total-box">
        <p class="total-label">Tổng tiền</p>
        <p class="total-price">${formatCurrency(booking.total_price)}</p>
      </div>

      <button class="btn btn-detail" data-id="${booking.booking_id}">
  Chi tiết
</button>
    </div>
  </div>
`;

    bookingList.appendChild(bookingItem);
  });
}

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN");
}

function formatCurrency(value) {
  return Number(value).toLocaleString("vi-VN") + " VNĐ";
}

function getStatusClass(status) {
  if (status === "pending") return "status-pending";
  if (status === "confirmed") return "status-confirmed";
  if (status === "completed") return "status-completed";
  return "status-default";
}
document.addEventListener("DOMContentLoaded", function () {
  loadCustomerProfile();
  bindEvents();
  loadRecentBookings();
  bindLogout();
  handleLogoutModal();
});
