const API_URL = "http://localhost:3000/api/provider/public/tours";

let allTours = [];
let filteredTours = [];
let currentPage = 1;

const toursPerPage = 6;
const FAVORITE_KEY = "favoriteTours";

const tourGrid = document.querySelector(".tour-grid");
const resultsTitle = document.querySelector(".results-title");
const sortSelect = document.getElementById("tour-sort");
const pagination = document.querySelector(".pagination");

const priceSlider =
  document.getElementById("price-range") ||
  document.querySelector(".price-range__slider");

const resetButton = document.querySelector(".filters-reset");

/** Dropdown “Loại tour” (#tour-type) — giá trị option là category_id khớp với taotour.js */
const tourTypeSelect = document.getElementById("tour-type");

const destinationInput =
  document.querySelector('.search-box input[type="text"]') ||
  document.querySelector('input[name="destination"]');

const searchButton = document.querySelector(".btn-search");

let priceValue = document.getElementById("price-value");

if (!priceValue && priceSlider) {
  const valuesBox = document.querySelector(".price-range__values");
  if (valuesBox) {
    const spans = valuesBox.querySelectorAll("span");
    priceValue = spans[1] || null;
    if (priceValue) priceValue.id = "price-value";
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN").format(Number(value || 0)) + "đ";
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function updatePriceLabel() {
  if (!priceSlider || !priceValue) return;
  priceValue.textContent = `Tối đa: ${formatCurrency(priceSlider.value)}`;
}

function getFavoriteIds() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITE_KEY) || "[]").map(String);
  } catch {
    return [];
  }
}

function setFavoriteIds(ids) {
  localStorage.setItem(FAVORITE_KEY, JSON.stringify(ids.map(String)));
}

function isFavoriteTour(tourId) {
  return getFavoriteIds().includes(String(tourId));
}

function toggleFavoriteTour(tourId) {
  const id = String(tourId);
  const ids = getFavoriteIds();

  const next = ids.includes(id)
    ? ids.filter((item) => item !== id)
    : [id, ...ids];

  setFavoriteIds(next);
  applyFilters(false);
}

function getAppliedPrice(tour) {
  const basePrice = Number(tour.base_price || 0);
  const salePrice = Number(tour.sale_price || 0);

  if (salePrice > 0 && salePrice < basePrice) return salePrice;
  return basePrice;
}

function getTourPrice(tour) {
  const displayPrice = Number(tour.display_price || 0);
  if (displayPrice > 0) return displayPrice;

  const finalPrice = Number(tour.final_price || 0);
  if (finalPrice > 0) return finalPrice;

  const appliedPrice = getAppliedPrice(tour);
  const taxPercent = Number(tour.tax_percent || 0);
  const tax = Number(tour.tax || 0);

  if (tax > 0) return appliedPrice + tax;
  if (taxPercent > 0) return Math.round(appliedPrice * (1 + taxPercent / 100));

  return appliedPrice;
}

function getDurationText(tour) {
  if (tour.duration_text) return tour.duration_text;

  const days = Number(tour.duration_days || 1);
  if (days <= 1) return "1 ngày";
  return `${days} ngày ${days - 1} đêm`;
}

function getTourImage(tour) {
  if (tour.thumbnail_url) return tour.thumbnail_url;

  return "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80";
}

function getCheckedValues(name) {
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(
    (input) => input.value
  );
}

function getTourLocationText(tour) {
  return normalizeText(
    `${tour.location || ""} ${tour.province_name || ""} ${tour.destination_name || ""}`
  );
}

function matchDuration(tour, selectedDurations) {
  if (selectedDurations.length === 0) return true;

  const days = Number(tour.duration_days || 1);

  return selectedDurations.some((value) => {
    if (value === "1-3 ngày") return days >= 1 && days <= 3;
    if (value === "4-7 ngày") return days >= 4 && days <= 7;
    if (value === "Trên 7 ngày") return days > 7;
    return true;
  });
}

function matchRegion(tour, selectedRegions) {
  if (selectedRegions.length === 0) return true;

  const location = getTourLocationText(tour);

  const regionMap = {
    "Miền Bắc": [
      "ha noi",
      "hai phong",
      "quang ninh",
      "ninh binh",
      "lao cai",
      "sapa",
      "lai chau",
      "dien bien",
      "son la",
      "phu tho",
      "thai nguyen",
      "tuyen quang",
      "cao bang",
      "lang son",
      "bac ninh",
      "hung yen",
      "ha giang"
    ],
    "Miền Trung": [
      "thanh hoa",
      "nghe an",
      "ha tinh",
      "quang tri",
      "hue",
      "da nang",
      "hoi an",
      "quang ngai",
      "gia lai",
      "dak lak",
      "khanh hoa",
      "nha trang",
      "lam dong",
      "da lat"
    ],
    "Miền Nam": [
      "ho chi minh",
      "tp.hcm",
      "tp hcm",
      "sai gon",
      "dong nai",
      "tay ninh",
      "can tho",
      "vinh long",
      "dong thap",
      "ca mau",
      "an giang",
      "phu quoc",
      "vung tau",
      "kien giang"
    ],
    "Quốc tế": [
      "thai lan",
      "singapore",
      "malaysia",
      "dubai",
      "uae",
      "han quoc",
      "nhat ban",
      "trung quoc"
    ]
  };

  return selectedRegions.some((region) => {
    const keywords = regionMap[region] || [];
    return keywords.some((keyword) => location.includes(keyword));
  });
}

function matchType(tour, selectedTypes) {
  if (selectedTypes.length === 0) return true;

  const text = normalizeText(
    `${tour.title || ""} ${tour.description || ""} ${tour.category_name || ""} ${tour.location || ""}`
  );

  return selectedTypes.some((type) => text.includes(normalizeText(type)));
}

/**
 * Đánh giá dùng cho lọc: ưu tiên số từ API (trung bình review), không có thì null.
 */
function getTourRatingForFilter(tour) {
  const raw = tour.rating ?? tour.rating_avg;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return n;
  return null;
}

/**
 * Checkbox Đánh giá: "5" (≈5★), "4+"…"1+" (ngưỡng điểm TB tương ứng sao).
 * Nhiều ô được chọn thì OR — tour chỉ cần thỏa một điều kiện.
 */
function matchRating(tour, selectedRatings) {
  if (!selectedRatings.length) return true;

  const rating = getTourRatingForFilter(tour);
  if (rating == null) return false;

  return selectedRatings.some((val) => {
    if (val === "5") return rating >= 4.8;
    if (val === "4+") return rating >= 4;
    if (val === "3+") return rating >= 3;
    if (val === "2+") return rating >= 2;
    if (val === "1+") return rating >= 1;
    return false;
  });
}

/**
 * Lọc theo danh mục đã chọn trên select (ưu tiên category_id từ API).
 * Khi không chọn (-- Chọn danh mục --) thì không lọc theo danh mục.
 */
function matchCategoryBySelect(tour, selectedCategoryId) {
  if (!selectedCategoryId) return true;

  const id = Number(selectedCategoryId);
  if (!Number.isFinite(id)) return true;

  const tourCat = Number(tour.category_id);
  if (Number.isFinite(tourCat) && tourCat === id) return true;

  // Fallback: tour chưa gán danh mục trong DB — gợi ý khớp theo từ khóa (đã normalize)
  const fragmentsById = {
    1: ["rung nhiet doi"],
    2: ["bien dao"],
    3: ["nui cao", "trekking"],
    4: ["lang nghe truyen thong"],
    5: ["nong nghiep sinh thai"],
    6: ["du lich cong dong"]
  };
  const haystack = normalizeText(
    `${tour.title || ""} ${tour.description || ""} ${tour.category_name || ""}`
  );
  const fragments = fragmentsById[id];
  return Array.isArray(fragments)
    ? fragments.some((frag) => haystack.includes(frag))
    : false;
}

function sortTours(tours) {
  const selectedIndex = sortSelect ? sortSelect.selectedIndex : 0;
  const sorted = [...tours];

  sorted.sort((a, b) => {
    const aFav = isFavoriteTour(a.id) ? 1 : 0;
    const bFav = isFavoriteTour(b.id) ? 1 : 0;

    if (aFav !== bFav) return bFav - aFav;

    if (selectedIndex === 1) return getTourPrice(a) - getTourPrice(b);
    if (selectedIndex === 2) return getTourPrice(b) - getTourPrice(a);

    return new Date(b.created_at || 0) - new Date(a.created_at || 0);
  });

  return sorted;
}

function updateSliderFill(slider) {
  if (!slider) return;

  const min = Number(slider.min || 0);
  const max = Number(slider.max || 50000000);
  const value = Number(slider.value || max);
  const percent = ((value - min) / (max - min)) * 100;

  slider.style.background =
    "linear-gradient(to right, var(--primary) 0%, var(--primary) " +
    percent +
    "%, #e5e5e5 " +
    percent +
    "%, #e5e5e5 100%)";
}

function applyFilters(resetPage = true) {
  if (resetPage) currentPage = 1;

  // Ghép từ ô tìm kiếm + slider giá + checkbox thời gian/khu vực + select loại tour
  const keyword = normalizeText(destinationInput?.value || "");
  const maxPrice = Number(priceSlider?.value || 50000000);

  const selectedDurations = getCheckedValues("duration");
  const selectedTypes = getCheckedValues("type");
  const selectedRegions = getCheckedValues("region");
  const selectedRatings = getCheckedValues("rating");
  const selectedCategoryId = (tourTypeSelect && tourTypeSelect.value) || "";

  filteredTours = allTours.filter((tour) => {
    const tourText = normalizeText(
      `${tour.title || ""} ${tour.location || ""} ${tour.province_name || ""} ${tour.destination_name || ""} ${tour.provider_name || ""}`
    );

    const price = getTourPrice(tour);

    return (
      (!keyword || tourText.includes(keyword)) &&
      price <= maxPrice &&
      matchDuration(tour, selectedDurations) &&
      matchType(tour, selectedTypes) &&
      matchCategoryBySelect(tour, selectedCategoryId) &&
      matchRegion(tour, selectedRegions) &&
      matchRating(tour, selectedRatings)
    );
  });

  filteredTours = sortTours(filteredTours);
  renderCurrentPage();
}

function renderCurrentPage() {
  const totalPages = Math.ceil(filteredTours.length / toursPerPage) || 1;

  if (currentPage > totalPages) currentPage = totalPages;
  if (currentPage < 1) currentPage = 1;

  const start = (currentPage - 1) * toursPerPage;
  const end = start + toursPerPage;
  const pageTours = filteredTours.slice(start, end);

  renderTours(pageTours);
  renderPagination();
}

function getPaginationPages(totalPages, page) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (page <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }

  if (page >= totalPages - 3) {
    return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "...", page - 1, page, page + 1, "...", totalPages];
}

function renderPagination() {
  if (!pagination) return;

  const totalPages = Math.ceil(filteredTours.length / toursPerPage);

  if (totalPages <= 1) {
    pagination.innerHTML = "";
    return;
  }

  const pages = getPaginationPages(totalPages, currentPage);

  pagination.innerHTML = `
    <button
      class="page-btn page-btn--icon"
      type="button"
      data-page="prev"
      ${currentPage === 1 ? "disabled" : ""}
      aria-label="Trang trước"
    >
      ‹
    </button>

    ${pages
      .map((page) => {
        if (page === "...") {
          return `<span class="page-ellipsis">...</span>`;
        }

        return `
          <button
            class="page-btn ${Number(page) === currentPage ? "is-active" : ""}"
            type="button"
            data-page="${page}"
            ${Number(page) === currentPage ? 'aria-current="page"' : ""}
          >
            ${page}
          </button>
        `;
      })
      .join("")}

    <button
      class="page-btn page-btn--icon"
      type="button"
      data-page="next"
      ${currentPage === totalPages ? "disabled" : ""}
      aria-label="Trang sau"
    >
      ›
    </button>
  `;

  pagination.querySelectorAll(".page-btn").forEach((button) => {
    button.addEventListener("click", () => {
      if (button.disabled) return;

      const page = button.dataset.page;

      if (page === "prev") {
        currentPage -= 1;
      } else if (page === "next") {
        currentPage += 1;
      } else {
        currentPage = Number(page);
      }

      renderCurrentPage();

      document.querySelector(".results-section")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  });
}

function renderTours(tours) {
  if (!tourGrid) return;

  if (resultsTitle) {
    const total = filteredTours.length || tours.length;
    resultsTitle.textContent = `Tìm thấy ${total} tours`;
  }

  if (!Array.isArray(tours) || tours.length === 0) {
    tourGrid.innerHTML = `
      <div style="grid-column: 1 / -1; padding: 32px; text-align: center; background: #fff; border-radius: 16px;">
        <h3>Không tìm thấy tour phù hợp</h3>
        <p>Hãy thử đổi điểm đến, khoảng giá hoặc bộ lọc.</p>
      </div>
    `;
    return;
  }

  tourGrid.innerHTML = tours
    .map((tour) => {
      const price = getTourPrice(tour);
      const oldPrice = Number(tour.base_price || 0);
      const salePrice = Number(tour.sale_price || 0);
      const hasDiscount = salePrice > 0 && salePrice < oldPrice;
      const isFavorite = isFavoriteTour(tour.id);

      return `
        <article class="tour-card ${isFavorite ? "is-favorite-card" : ""}">
          <div class="tour-card__media">
            <img
              src="${getTourImage(tour)}"
              alt="${tour.title || "Tour du lịch"}"
              onerror="this.src='https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80'"
            />

            <button
              class="heart-btn ${isFavorite ? "is-active" : ""}"
              type="button"
              data-tour-id="${tour.id}"
              aria-label="Yêu thích ${tour.title || "tour"}"
              aria-pressed="${isFavorite ? "true" : "false"}"
            >
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="M10 17.5L3.75 11.6898C2.65524 10.673 1.875 9.24603 1.875 7.7508V7.63359C1.875 5.12277 3.66104 2.96803 6.12943 2.49694C7.53323 2.22631 8.96964 2.55021 10.1146 3.35614C10.4355 3.58427 10.7352 3.84814 11.0066 4.15166C11.1569 3.98019 11.318 3.82316 11.4892 3.67642C11.6208 3.56203 11.7564 3.45499 11.8999 3.35614C13.0449 2.55021 14.4814 2.22631 15.8852 2.4933C18.3536 2.96439 20.1396 5.12277 20.1396 7.63359V7.7508C20.1396 9.24603 19.3594 10.673 18.2646 11.6898L12.0146 17.4964C11.7219 17.7677 11.336 17.9212 10.9361 17.9212C10.5361 17.9212 10.1503 17.7714 9.85755 17.5H10Z"
                  transform="translate(-1.007 -0.9) scale(0.86)"
                  stroke="currentColor"
                  stroke-width="1.8"
                  stroke-linejoin="round"
                />
              </svg>
            </button>

            ${hasDiscount ? `<span class="tour-card__badge">Giảm giá</span>` : ""}
            ${isFavorite ? `<span class="tour-card__pin">Đã yêu thích</span>` : ""}
          </div>

          <div class="tour-card__body">
            <div class="tour-card__meta">
              <span class="tour-card__location">
                📍 ${tour.destination_name || tour.province_name || tour.location || "Đang cập nhật"}
              </span>

              <span class="tour-card__rating">
                ⭐ <strong>${tour.rating || "4.9"}</strong>
              </span>
            </div>

            <h3>${tour.title || "Chưa có tên tour"}</h3>

            <p>${tour.description || "Chưa có mô tả tour."}</p>

            <p style="font-size: 13px; color: #6b7280; margin-top: 8px;">
              Nhà cung cấp: <strong>${tour.provider_name || "Đang cập nhật"}</strong>
            </p>

            <div class="tour-card__pricing">
              <div>
                <div class="tour-card__price">${formatCurrency(price)}</div>
                ${
                  hasDiscount
                    ? `<div class="tour-card__old-price">${formatCurrency(oldPrice)}</div>`
                    : `<div class="tour-card__unit">/ người</div>`
                }
                <div class="tour-card__vat">Đã gồm VAT/phí bắt buộc</div>
              </div>

              <div class="tour-card__duration">
                ⏱ ${getDurationText(tour)}
              </div>
            </div>

            <button
              class="detail-btn"
              type="button"
              onclick="window.location.href='./chitiet.html?id=${tour.id}'"
            >
              Xem chi tiết
            </button>
          </div>
        </article>
      `;
    })
    .join("");

  bindHeartButtons();
}

function bindHeartButtons() {
  document.querySelectorAll(".heart-btn").forEach((button) => {
    button.addEventListener("click", () => {
      toggleFavoriteTour(button.dataset.tourId);
    });
  });
}

async function loadTours() {
  try {
    if (tourGrid) {
      tourGrid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 32px; text-align: center;">
          Đang tải danh sách tour...
        </div>
      `;
    }

    updateSliderFill(priceSlider);
    updatePriceLabel();

    // Lấy nhiều tour hơn mặc định API để lọc phía trang dstour đủ dữ liệu
    const response = await fetch(`${API_URL}?limit=500`);

    if (!response.ok) {
      throw new Error("Không tải được danh sách tour");
    }

    const result = await response.json();

    allTours = Array.isArray(result.data)
      ? result.data
      : Array.isArray(result)
        ? result
        : [];

    applyFilters(true);
  } catch (error) {
    console.error("Lỗi tải danh sách tour:", error);

    if (tourGrid) {
      tourGrid.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 32px; text-align: center; background: #fff; border-radius: 16px;">
          <h3>Không tải được danh sách tour</h3>
          <p>Vui lòng kiểm tra backend hoặc API public tours.</p>
        </div>
      `;
    }
  }
}

if (priceSlider) {
  updateSliderFill(priceSlider);
  updatePriceLabel();

  priceSlider.addEventListener("input", () => {
    updateSliderFill(priceSlider);
    updatePriceLabel();
    applyFilters(true);
  });
}

if (searchButton) {
  searchButton.addEventListener("click", () => applyFilters(true));
}

if (destinationInput) {
  destinationInput.addEventListener("input", () => applyFilters(true));
}

if (sortSelect) {
  sortSelect.addEventListener("change", () => applyFilters(true));
}

document.querySelectorAll(".filters-card input").forEach((input) => {
  input.addEventListener("change", () => applyFilters(true));
});

if (tourTypeSelect) {
  tourTypeSelect.addEventListener("change", () => applyFilters(true));
}

if (resetButton) {
  resetButton.addEventListener("click", () => {
    document
      .querySelectorAll('.filters-card input[type="checkbox"]')
      .forEach((input) => {
        input.checked = false;
      });

    if (priceSlider) {
      priceSlider.value = priceSlider.max || "50000000";
      updateSliderFill(priceSlider);
      updatePriceLabel();
    }

    if (destinationInput) {
      destinationInput.value = "";
    }

    if (sortSelect) {
      sortSelect.selectedIndex = 0;
    }

    if (tourTypeSelect) {
      tourTypeSelect.value = "";
    }

    currentPage = 1;
    applyFilters(true);
  });
}

document.addEventListener("DOMContentLoaded", loadTours);