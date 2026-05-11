let bookingHistory = [];
let selectedCancelBookingId = null;

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

function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("vi-VN");
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("vi-VN") + " VNĐ";
}
async function loadBookingHistory() {
  try {
    const response = await fetch("http://localhost:3000/api/bookings/history", {
      headers: {
        Authorization: "Bearer " + localStorage.getItem("accessToken"),
      },
    });
    const result = await response.json();

    if (!result.success) {
      console.error(result.message || "Không lấy được lịch sử booking");
      return;
    }

    bookingHistory = result.data || [];
    updateHistory();
  } catch (error) {
    console.error("Lỗi loadBookingHistory:", error);
  }
}
function getHiddenPrice(price) {
  return "••••••••";
}

function renderHistory(data) {
  const historyList = document.getElementById("historyList");
  if (!historyList) return;

  if (!data.length) {
    historyList.innerHTML = `
      <div class="empty-state">
        Không tìm thấy booking phù hợp.
      </div>
    `;
    return;
  }

  historyList.innerHTML = data
    .map(
      (booking) => `
      <div class="history-card">
        <div class="history-content">
          <div class="history-main">
            <div class="history-top">
              <div>
                <h3 class="history-title">${booking.tourName}</h3>
                <div class="history-meta">
                  <div class="meta-item">
                    <span>📍</span>
                    <span>${booking.destination}</span>
                  </div>
                  <div class="meta-item">
                    <span>⏰</span>
                    <span>${booking.duration}</span>
                  </div>
                </div>
              </div>

              <span class="status-chip ${booking.statusClass}">${booking.status}</span>
            </div>

            <div class="history-grid">
              <div class="info-tile">
                <div class="tile-label">Ngày đặt</div>
                <div class="tile-value">
                  <span>📅</span>
                  <span>${formatDate(booking.bookingDate)}</span>
                </div>
              </div>

              <div class="info-tile">
                <div class="tile-label">Ngày khởi hành</div>
                <div class="tile-value">
                  <span>📅</span>
                  <span>${formatDate(booking.travelDate)}</span>
                </div>
              </div>

              <div class="info-tile price-tile">
                <div class="tile-label">Tổng tiền</div>
                <div class="tile-price-row">
                 <div
  class="tile-price"
  id="price-${booking.id}"
  data-price="${formatCurrency(booking.price)}"
  data-hidden="true"
>
  ${getHiddenPrice(booking.price)}
</div>

                  <button
                    type="button"
                    class="price-toggle-btn"
                    data-action="toggle-price"
                    data-target="price-${booking.id}"
                    aria-label="Ẩn hoặc hiện tổng tiền"
                    title="Ẩn/hiện tổng tiền"
                  >
                    👁
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div class="history-actions">
            <button class="history-btn history-btn-primary" data-action="detail" data-id="${booking.id}">
              Chi tiết
            </button>

            ${
              ["pending_payment", "confirmed"].includes(booking.statusRaw)
                ? `
              <button class="history-btn history-btn-danger" data-action="cancel" data-id="${booking.id}">
                Hủy tour
              </button>
            `
                : ""
            }

            ${
              booking.status === "Hoàn thành"
                ? `
              <button class="history-btn history-btn-outline" data-action="rebook" data-id="${booking.id}">
                Đặt lại
              </button>
            `
                : ""
            }
          </div>
        </div>
      </div>
    `,
    )
    .join("");
}

function getFilteredHistory() {
  const statusFilterEl = document.getElementById("statusFilter");
  const searchInputEl = document.getElementById("searchInput");

  const statusValue = statusFilterEl ? statusFilterEl.value : "all";
  const searchValue = searchInputEl
    ? searchInputEl.value.trim().toLowerCase()
    : "";

  return bookingHistory.filter((item) => {
    const matchStatus = statusValue === "all" || item.status === statusValue;
    const matchSearch =
      item.tourName.toLowerCase().includes(searchValue) ||
      item.destination.toLowerCase().includes(searchValue);

    return matchStatus && matchSearch;
  });
}

function updateHistory() {
  renderHistory(getFilteredHistory());
}

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

function togglePrice(targetId, buttonEl) {
  const priceEl = document.getElementById(targetId);
  if (!priceEl) return;

  const isHidden = priceEl.dataset.hidden === "true";
  const realPrice = priceEl.dataset.price || "";

  if (isHidden) {
    priceEl.textContent = realPrice;
    priceEl.dataset.hidden = "false";
    if (buttonEl) buttonEl.textContent = "👁";
  } else {
    priceEl.textContent = getHiddenPrice(realPrice);
    priceEl.dataset.hidden = "true";
    if (buttonEl) buttonEl.textContent = "🙈";
  }
}

function bindEvents() {
  const menuToggle = document.getElementById("menuToggle");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  const statusFilter = document.getElementById("statusFilter");
  const searchInput = document.getElementById("searchInput");

  if (menuToggle) {
    menuToggle.addEventListener("click", toggleSidebar);
  }

  if (sidebarOverlay) {
    sidebarOverlay.addEventListener("click", closeSidebar);
  }

  if (statusFilter) {
    statusFilter.addEventListener("change", updateHistory);
  }

  if (searchInput) {
    searchInput.addEventListener("input", updateHistory);
  }
  const cancelReason = document.getElementById("cancelReason");
  const confirmCancelBtn = document.getElementById("confirmCancelBtn");

  if (cancelReason) {
    cancelReason.addEventListener("change", function () {
      const reasonOther = document.getElementById("cancelReasonOther");
      if (!reasonOther) return;

      reasonOther.style.display = this.value === "Khác" ? "block" : "none";
    });
  }

  if (confirmCancelBtn) {
    confirmCancelBtn.addEventListener("click", function () {
      const modal = document.getElementById("confirmCancelModal");
      if (modal) modal.classList.add("active");
    });
  }

  document.querySelectorAll("[data-cancel-close]").forEach(function (el) {
    el.addEventListener("click", closeCancelModal);
  });
  document.addEventListener("click", async function (event) {
    const target = event.target.closest("[data-action]");
    if (!target) return;

    const action = target.dataset.action;

    if (action === "toggle-price") {
      togglePrice(target.dataset.target, target);
      return;
    }

    if (action === "detail") {
      window.location.href = `../tours/chitiet.html?booking_id=${target.dataset.id}`;
      return;
    }

    if (action === "cancel") {
      openCancelModal(target.dataset.id);
      return;
    }
    if (action === "rebook") {
      showMessageModal("Đặt lại booking ID: " + target.dataset.id);
    }
  });

  window.addEventListener("resize", function () {
    if (window.innerWidth >= 1024) {
      closeSidebar();
    }
  });
}
function openCancelModal(bookingId) {
  selectedCancelBookingId = bookingId;

  const modal = document.getElementById("cancelModal");
  const reasonSelect = document.getElementById("cancelReason");
  const reasonOther = document.getElementById("cancelReasonOther");

  if (reasonSelect) reasonSelect.value = "";
  if (reasonOther) {
    reasonOther.value = "";
    reasonOther.style.display = "none";
  }

  if (modal) modal.classList.add("is-open");
}

function closeCancelModal() {
  selectedCancelBookingId = null;

  const modal = document.getElementById("cancelModal");
  if (modal) modal.classList.remove("is-open");
}

async function submitCancelBooking() {
  const reasonSelect = document.getElementById("cancelReason");
  const reasonOther = document.getElementById("cancelReasonOther");

  let reason = reasonSelect ? reasonSelect.value : "";

  if (reason === "Khác") {
    reason = reasonOther ? reasonOther.value.trim() : "";
  }

  if (!reason) {
    showMessageModal("Vui lòng chọn hoặc nhập lý do hủy tour.");
    return;
  }

  if (!selectedCancelBookingId) {
    showMessageModal("Không tìm thấy booking cần hủy.");
    return;
  }

  try {
    const response = await fetch(
      `http://localhost:3000/api/bookings/${selectedCancelBookingId}/cancel`,
      {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("accessToken"),
        },
        body: JSON.stringify({ reason }),
      },
    );

    const result = await response.json();

    if (!result.success) {
      showMessageModal(result.message || "Hủy tour thất bại");
      return;
    }

    showMessageModal("Hủy tour thành công");
    closeCancelModal();
    loadBookingHistory();
  } catch (error) {
    console.error(error);
    showMessageModal("Lỗi kết nối server");
  }
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
function bindConfirmCancelModal() {
  const modal = document.getElementById("confirmCancelModal");
  const cancelBtn = document.getElementById("cancelConfirmCancel");
  const confirmBtn = document.getElementById("confirmCancelFinal");

  if (!modal) return;

  if (cancelBtn) {
    cancelBtn.addEventListener("click", () => {
      modal.classList.remove("active");
    });
  }

  if (confirmBtn) {
    confirmBtn.addEventListener("click", async () => {
      modal.classList.remove("active");
      await submitCancelBooking(); // gọi API ở đây
    });
  }
}
function showMessageModal(message) {
  const modal = document.getElementById("messageModal");
  const text = document.getElementById("messageModalText");
  const okBtn = document.getElementById("messageModalOk");

  if (!modal || !text || !okBtn) {
    console.error(message);
    return;
  }

  text.textContent = message;
  modal.classList.add("active");

  okBtn.onclick = function () {
    modal.classList.remove("active");
  };
}
document.addEventListener("DOMContentLoaded", function () {
  syncTopbarUserName();
  bindEvents();
  loadBookingHistory();

  bindLogout();
  handleLogoutModal();
  bindConfirmCancelModal();
});
