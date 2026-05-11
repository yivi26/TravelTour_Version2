let guidesData = [];
let toursData = [];
let selectedTourIdFromUrl = null;

function formatDateVN(dateString) {
  if (!dateString) return "--/--/----";

  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "--/--/----";

  return date.toLocaleDateString("vi-VN");
}

function getTourStatusText(status) {
  const map = {
    draft: "Nháp",
    active: "Đang mở bán",
    paused: "Tạm dừng",
    archived: "Lưu trữ",
    full: "Đã đủ chỗ"
  };

  return map[status] || status || "Không xác định";
}

function normalizeGuide(guide) {
  return {
    id: Number(guide.id),
    name: guide.full_name || "Chưa có tên",
    rating: guide.rating || "N/A",
    experience:
      guide.experience_years != null
        ? `${guide.experience_years} năm`
        : guide.experience || "Chưa cập nhật",
    languages: guide.languages || "Chưa cập nhật"
  };
}

function normalizeTour(tour) {
  return {
    id: Number(tour.id),
    title: tour.title || "Chưa có tên tour",
    destination: tour.location || "Chưa cập nhật",
    departureDate: tour.start_date || null,
    guests: Number(tour.max_capacity || 0),
    assignedGuideName: tour.guide_name || "",
    status: tour.status || "",
    guideId: tour.guide_id != null ? Number(tour.guide_id) : null
  };
}

async function fetchGuides() {
  const response = await fetch("/api/provider/guides", {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  });

  const data = await response.json().catch(() => []);

  if (!response.ok) {
    throw new Error(data.message || "Không thể tải danh sách HDV");
  }

  return Array.isArray(data) ? data.map(normalizeGuide) : [];
}

async function fetchToursForAssignment() {
  const response = await fetch("/api/provider/tours/guide-assignment", {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Không thể tải danh sách tour");
  }

  const rows = Array.isArray(data?.data) ? data.data : [];
  return rows.map(normalizeTour);
}

async function assignGuideToTour(tourId, guideId) {
  const response = await fetch("/api/provider/assign-guide-to-tour", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      tourId,
      guideId
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Phân công hướng dẫn viên thất bại");
  }

  return data;
}

function renderGuides(data) {
  const container = document.getElementById("guideList");
  if (!container) return;

  if (!Array.isArray(data) || data.length === 0) {
    container.innerHTML = `
      <div class="empty-state">Không tìm thấy hướng dẫn viên.</div>
    `;
    return;
  }

  container.innerHTML = data
    .map(
      (guide) => `
        <div class="guide-card">
          <div class="gc-avatar"><i class="fa-solid fa-user"></i></div>
          <div class="gc-info">
            <div class="gc-header">
              <span class="gc-name">${guide.name}</span>
              <span class="gc-rating"><i class="fa-solid fa-star"></i> ${guide.rating}</span>
            </div>
            <div class="gc-exp">${guide.experience}</div>
            <div class="gc-lang">${guide.languages}</div>
          </div>
        </div>
      `
    )
    .join("");
}

function renderTours(data) {
  const container = document.getElementById("tourList");
  if (!container) return;

  if (!Array.isArray(data) || data.length === 0) {
    container.innerHTML = `
      <div class="empty-state">Không tìm thấy tour phù hợp.</div>
    `;
    return;
  }

  container.innerHTML = data
    .map((tour) => {
      const isAssigned = Boolean(tour.assignedGuideName);
      const isFocused = selectedTourIdFromUrl && Number(selectedTourIdFromUrl) === Number(tour.id);

      return `
        <div class="tour-card ${isFocused ? "tour-card-focus" : ""}">
          <div class="tc-title">${tour.title}</div>

          <div class="tc-details">
            <p><i class="fa-solid fa-location-dot"></i> ${tour.destination}</p>
            <p><i class="fa-regular fa-calendar"></i> Khởi hành: ${formatDateVN(tour.departureDate)}</p>
            <p><i class="fa-solid fa-users"></i> Tối đa: ${tour.guests} khách</p>
            <p><i class="fa-solid fa-ticket"></i> Trạng thái tour: ${getTourStatusText(tour.status)}</p>
          </div>

          <div class="tc-assign-label">Hướng dẫn viên</div>

          <div class="tc-assign-row">
            <select class="tc-select" data-tour-id="${tour.id}">
              <option value="">Chọn hướng dẫn viên</option>
              ${guidesData
                .map(
                  (guide) => `
                    <option value="${guide.id}" ${tour.guideId === guide.id ? "selected" : ""}>
                      ${guide.name}
                    </option>
                  `
                )
                .join("")}
            </select>

            <button
              class="btn-action"
              data-action="assign-tour"
              data-tour-id="${tour.id}"
            >
              ${isAssigned ? "Cập nhật" : "Phân công"}
            </button>
          </div>

          <div class="tc-status ${isAssigned ? "" : "hidden"}">
            <i class="fa-solid fa-check"></i>
            <span>Đã phân công: ${isAssigned ? tour.assignedGuideName : ""}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

function getFilteredData() {
  const input = document.getElementById("globalSearchInput");
  const keyword = (input?.value || "").trim().toLowerCase();

  let filteredGuides = guidesData.filter((guide) => {
    return (
      guide.name.toLowerCase().includes(keyword) ||
      String(guide.languages).toLowerCase().includes(keyword) ||
      String(guide.experience).toLowerCase().includes(keyword) ||
      String(guide.rating).toLowerCase().includes(keyword)
    );
  });

  let filteredTours = toursData.filter((tour) => {
    return (
      tour.title.toLowerCase().includes(keyword) ||
      tour.destination.toLowerCase().includes(keyword) ||
      formatDateVN(tour.departureDate).toLowerCase().includes(keyword) ||
      String(tour.guests).includes(keyword) ||
      String(tour.assignedGuideName).toLowerCase().includes(keyword) ||
      getTourStatusText(tour.status).toLowerCase().includes(keyword)
    );
  });

  if (selectedTourIdFromUrl) {
    const selectedId = Number(selectedTourIdFromUrl);
    filteredTours = filteredTours.sort((a, b) => {
      if (a.id === selectedId) return -1;
      if (b.id === selectedId) return 1;
      return 0;
    });
  }

  return { filteredGuides, filteredTours };
}

function updateView() {
  const { filteredGuides, filteredTours } = getFilteredData();
  renderGuides(filteredGuides);
  renderTours(filteredTours);
}

async function handleAssign(tourId) {
  const select = document.querySelector(`select[data-tour-id="${tourId}"]`);
  if (!select) return;

  const guideId = Number(select.value);

  if (!guideId) {
    alert("Vui lòng chọn hướng dẫn viên.");
    return;
  }

  try {
    await assignGuideToTour(tourId, guideId);
    await loadPageData();
    alert("Phân công hướng dẫn viên cho tour thành công.");
  } catch (error) {
    console.error("Lỗi phân công:", error);
    alert(error.message || "Có lỗi xảy ra khi phân công.");
  }
}

function bindEvents() {
  const searchInput = document.getElementById("globalSearchInput");

  if (searchInput) {
    searchInput.addEventListener("input", updateView);
  }

  document.addEventListener("click", function (event) {
    const button = event.target.closest("[data-action='assign-tour']");
    if (!button) return;

    const tourId = Number(button.getAttribute("data-tour-id"));
    if (!tourId) return;

    handleAssign(tourId);
  });
}

async function loadPageData() {
  const [guides, tours] = await Promise.all([
    fetchGuides(),
    fetchToursForAssignment()
  ]);

  guidesData = guides;
  toursData = tours.filter((item) => item.status !== "archived");

  updateView();
}

function readTourIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  selectedTourIdFromUrl = params.get("tourId");
}

async function initPage() {
  try {
    readTourIdFromUrl();
    await loadPageData();
    bindEvents();
  } catch (error) {
    console.error("Lỗi tải dữ liệu trang phân công guide:", error);

    const guideList = document.getElementById("guideList");
    const tourList = document.getElementById("tourList");

    if (guideList) {
      guideList.innerHTML = `
        <div class="empty-state">Không tải được danh sách hướng dẫn viên.</div>
      `;
    }

    if (tourList) {
      tourList.innerHTML = `
        <div class="empty-state">Không tải được danh sách tour.</div>
      `;
    }
  }
}

document.addEventListener("DOMContentLoaded", initPage);