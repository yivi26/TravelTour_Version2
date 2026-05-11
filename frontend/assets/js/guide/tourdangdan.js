let currentTours = [];
/** Từ `lichtrinh.html?tourId=` → tourdangdan: làm nổi bật đúng tour. */
let urlTourHighlightId = null;

function formatDateVN(dateString) {
  if (!dateString) return "--/--/----";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "--/--/----";
  return date.toLocaleDateString("vi-VN");
}

function renderTourCount(count) {
  const tourCountText = document.getElementById("tourCountText");
  if (!tourCountText) return;
  tourCountText.textContent = `Bạn đang có ${count} tour đang hoạt động`;
}

async function fetchCurrentTours(keyword = "") {
  const response = await fetch(
    `/api/guide/current-tours?keyword=${encodeURIComponent(keyword)}`,
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    }
  );

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || "Không thể tải danh sách tour");
  }

  return Array.isArray(result.data) ? result.data : [];
}

function renderTours(keyword = "") {
  const tourGrid = document.getElementById("tourGrid");
  if (!tourGrid) return;

  const normalizedKeyword = keyword.trim().toLowerCase();

  const filteredTours = currentTours.filter((tour) => {
    return (
      tour.name.toLowerCase().includes(normalizedKeyword) ||
      tour.location.toLowerCase().includes(normalizedKeyword) ||
      tour.duration.toLowerCase().includes(normalizedKeyword)
    );
  });

  renderTourCount(filteredTours.length);

  if (!filteredTours.length) {
    tourGrid.innerHTML = `
      <div class="empty-state">
        Không tìm thấy tour phù hợp.
      </div>
    `;
    return;
  }

  tourGrid.innerHTML = filteredTours
    .map(
      (tour) => {
        const focused =
          urlTourHighlightId != null && Number(tour.id) === urlTourHighlightId;
        return `
        <div class="tour-card${focused ? " tour-card--focused" : ""}" data-tour-id="${tour.id}">
          <div class="tour-card-top">
            <h4 class="tour-title">${tour.name}</h4>
            <span class="tour-status">${tour.statusText || "Đang hoạt động"}</span>
          </div>

          <div class="tour-info-list">
            <div class="tour-info-item">
              <span class="tour-info-icon">👥</span>
              <span><strong>${tour.customers}</strong> khách hàng</span>
            </div>

            <div class="tour-info-item">
              <span class="tour-info-icon">📅</span>
              <span>${formatDateVN(tour.startDate)} - ${formatDateVN(tour.endDate)}</span>
            </div>

            <div class="tour-info-item">
              <span class="tour-info-icon">🕒</span>
              <span>${tour.duration}</span>
            </div>

            <div class="tour-info-item">
              <span class="tour-info-icon">📍</span>
              <span>${tour.location}</span>
            </div>
          </div>

          <div class="tour-actions">
            <button class="btn-detail" data-action="detail" data-id="${tour.id}">
              Xem chi tiết
            </button>
            <button class="btn-contact" data-action="contact" data-id="${tour.id}" data-tour-name="${String(tour.name).replace(/"/g, "&quot;")}">
              Liên hệ khách
            </button>
          </div>
        </div>
      `;
      }
    )
    .join("");

  if (urlTourHighlightId != null) {
    requestAnimationFrame(() => {
      const el = tourGrid.querySelector(".tour-card--focused");
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }
}

function bindEvents() {
  const searchInput = document.getElementById("tourSearchInput");
  const logoutBtn = document.getElementById("logoutBtn");
  const searchBtn = document.getElementById("searchBtn");

  if (searchInput) {
    searchInput.addEventListener("input", function () {
      renderTours(this.value);
    });
  }

  if (searchBtn) {
    searchBtn.addEventListener("click", function () {
      const keyword = document.getElementById("tourSearchInput")?.value || "";
      renderTours(keyword);
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      window.location.href = "http://localhost:3000/login";
    });
  }

  document.addEventListener("click", function (event) {
    const target = event.target.closest("[data-action]");
    if (!target) return;

    const action = target.getAttribute("data-action");
    const id = target.getAttribute("data-id");

    if (action === "detail") {
      window.location.href = `lichtrinh.html?tourId=${id}`;
    }

    if (action === "contact" && id) {
      const tourName = target.getAttribute("data-tour-name") || "";
      const q = new URLSearchParams({
        tourId: String(id),
        tourName: tourName
      });
      window.location.href = `khachhang.html?${q.toString()}`;
    }
  });
}

async function initPage() {
  try {
    const raw = new URLSearchParams(window.location.search).get("tourId");
    const n =
      raw != null && String(raw).trim() !== "" ? Number(raw) : NaN;
    urlTourHighlightId = Number.isNaN(n) ? null : n;

    currentTours = await fetchCurrentTours("");
    renderTours("");
    bindEvents();
  } catch (error) {
    console.error("Lỗi tải tour đang dẫn:", error);

    const tourGrid = document.getElementById("tourGrid");
    const tourCountText = document.getElementById("tourCountText");

    if (tourCountText) {
      tourCountText.textContent = "Không tải được dữ liệu tour";
    }

    if (tourGrid) {
      tourGrid.innerHTML = `
        <div class="empty-state">
          Không tải được danh sách tour đang dẫn.
        </div>
      `;
    }
  }
}

document.addEventListener("DOMContentLoaded", initPage);