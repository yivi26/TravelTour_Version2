let customers = [];
/** Khi mở từ Tour đang dẫn → Liên hệ khách (?tourId=), lọc theo tour; đổi "Tất cả tour" sẽ tải lại full danh sách. */
let urlTourIdAtInit = null;

function getInitial(name) {
  return String(name || "").trim().charAt(0).toUpperCase() || "?";
}

function formatDateVN(dateString) {
  if (!dateString) return "--/--/----";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "--/--/----";
  return date.toLocaleDateString("vi-VN");
}

function renderCustomerCount(count) {
  const customerCountText = document.getElementById("customerCountText");
  if (!customerCountText) return;
  customerCountText.textContent = `Tổng số ${count} khách hàng`;
}

async function fetchCustomers(keyword = "", selectedTour = "all", tourId = null) {
  let url = `/api/guide/customers?keyword=${encodeURIComponent(keyword)}&tour=${encodeURIComponent(selectedTour)}`;
  if (tourId != null && !Number.isNaN(Number(tourId))) {
    url += `&tourId=${encodeURIComponent(String(tourId))}`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || "Không thể tải danh sách khách hàng");
  }

  return Array.isArray(result.data) ? result.data : [];
}

function fillTourFilterFromData(data, preferredTourName, ensureTourName) {
  const tourFilter = document.getElementById("tourFilter");
  if (!tourFilter) return;

  const currentValue = tourFilter.value || "all";
  const uniqueTours = [...new Set(data.map((item) => item.tour).filter(Boolean))];
  if (ensureTourName && !uniqueTours.includes(ensureTourName)) {
    uniqueTours.push(ensureTourName);
  }

  tourFilter.innerHTML = `
    <option value="all">Tất cả tour</option>
    ${uniqueTours
      .map((tour) => `<option value="${tour}">${tour}</option>`)
      .join("")}
  `;

  if (preferredTourName && uniqueTours.includes(preferredTourName)) {
    tourFilter.value = preferredTourName;
    return;
  }

  const hasOldValue = uniqueTours.includes(currentValue);
  tourFilter.value = hasOldValue ? currentValue : "all";
}

function renderCustomers(keyword = "", selectedTour = "all") {
  const tableBody = document.getElementById("customerTableBody");
  if (!tableBody) return;

  const normalizedKeyword = keyword.trim().toLowerCase();

  const filteredCustomers = customers.filter((customer) => {
    const phoneStr = String(customer.phone ?? "").toLowerCase();
    const matchKeyword =
      String(customer.name ?? "").toLowerCase().includes(normalizedKeyword) ||
      phoneStr.includes(normalizedKeyword) ||
      String(customer.email ?? "").toLowerCase().includes(normalizedKeyword) ||
      String(customer.tour ?? "").toLowerCase().includes(normalizedKeyword);

    const matchTour =
      selectedTour === "all" || customer.tour === selectedTour;

    return matchKeyword && matchTour;
  });

  renderCustomerCount(filteredCustomers.length);

  if (!filteredCustomers.length) {
    tableBody.innerHTML = `
      <tr class="empty-state-row">
        <td colspan="6">Không tìm thấy khách hàng phù hợp.</td>
      </tr>
    `;
    return;
  }

  tableBody.innerHTML = filteredCustomers
    .map(
      (customer) => `
        <tr>
          <td>
            <div class="customer-name-wrap">
              <div class="customer-avatar">${getInitial(customer.name)}</div>
              <span class="customer-name">${customer.name}</span>
            </div>
          </td>

          <td>
            <div class="customer-info-inline">
              <span class="info-icon">📞</span>
              <span>${String(customer.phone ?? "").trim()}</span>
            </div>
          </td>

          <td>
            <div class="customer-info-inline">
              <span class="info-icon">✉️</span>
              <span>${customer.email}</span>
            </div>
          </td>

          <td>
            <div class="customer-info-inline">
              <span class="info-icon">📍</span>
              <span>${customer.tour}</span>
            </div>
          </td>

          <td>
            <span class="customer-info-inline">${formatDateVN(customer.tourDate)}</span>
          </td>

          <td>
            <button class="contact-btn" data-id="${customer.id}">
              Liên hệ
            </button>
          </td>
        </tr>
      `
    )
    .join("");
}

function bindEvents() {
  const searchInput = document.getElementById("customerSearchInput");
  const tourFilter = document.getElementById("tourFilter");
  const logoutBtn = document.getElementById("logoutBtn");

  function applyFilters() {
    const keyword = searchInput ? searchInput.value : "";
    const selectedTour = tourFilter ? tourFilter.value : "all";
    renderCustomers(keyword, selectedTour);
  }

  if (searchInput) {
    searchInput.addEventListener("input", applyFilters);
  }

  if (tourFilter) {
    tourFilter.addEventListener("change", async function () {
      if (this.value === "all" && urlTourIdAtInit != null) {
        urlTourIdAtInit = null;
        try {
          customers = await fetchCustomers("", "all", null);
          fillTourFilterFromData(customers, null);
          this.value = "all";
        } catch (e) {
          console.error("Lỗi tải lại khách hàng:", e);
        }
      }
      applyFilters();
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
    const contactBtn = event.target.closest(".contact-btn");
    if (!contactBtn) return;

    const id = contactBtn.getAttribute("data-id");
    alert("Chức năng liên hệ khách sẽ làm ở bước tiếp theo. Booking ID: " + id);
  });
}

async function initPage() {
  try {
    const params = new URLSearchParams(window.location.search);
    const tourIdRaw = params.get("tourId");
    const tourNameHint = params.get("tourName");
    const tourIdNum =
      tourIdRaw != null && String(tourIdRaw).trim() !== ""
        ? Number(tourIdRaw)
        : NaN;

    urlTourIdAtInit = Number.isNaN(tourIdNum) ? null : tourIdNum;

    customers = await fetchCustomers("", "all", urlTourIdAtInit);

    let preferredTourName;
    let ensureTourName;
    if (urlTourIdAtInit != null) {
      if (customers.length) {
        preferredTourName = customers[0].tour;
      } else if (tourNameHint && String(tourNameHint).trim() !== "") {
        preferredTourName = String(tourNameHint).trim();
        ensureTourName = preferredTourName;
      }
    }

    fillTourFilterFromData(customers, preferredTourName, ensureTourName);
    const tourFilterEl = document.getElementById("tourFilter");
    const initialTour = tourFilterEl?.value || "all";
    renderCustomers("", initialTour);
    bindEvents();
  } catch (error) {
    console.error("Lỗi tải khách hàng:", error);

    const tableBody = document.getElementById("customerTableBody");
    const customerCountText = document.getElementById("customerCountText");

    if (customerCountText) {
      customerCountText.textContent = "Không tải được dữ liệu khách hàng";
    }

    if (tableBody) {
      tableBody.innerHTML = `
        <tr class="empty-state-row">
          <td colspan="6">Không tải được danh sách khách hàng.</td>
        </tr>
      `;
    }
  }
}

document.addEventListener("DOMContentLoaded", initPage);