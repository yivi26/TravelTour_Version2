const fallbackFeatures = [
  {
    icon: "🛡️",
    title: "Uy tín",
    description: "Đảm bảo chất lượng dịch vụ tốt nhất"
  },
  {
    icon: "🧭",
    title: "Đa dạng tour",
    description: "Hàng trăm điểm đến hấp dẫn"
  },
  {
    icon: "🏆",
    title: "Hướng dẫn viên chuyên nghiệp",
    description: "Đội ngũ HDV giàu kinh nghiệm"
  },
  {
    icon: "💵",
    title: "Giá tốt",
    description: "Cam kết giá cạnh tranh nhất"
  }
];

const fallbackPromotions = [
  {
    id: 1,
    title: "Ưu đãi đặt sớm",
    description: "Đặt tour sớm để nhận nhiều khuyến mãi hấp dẫn",
    discount: "10%",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80",
    validUntil: "30/12/2026"
  },
  {
    id: 2,
    title: "Ưu đãi nhóm khách",
    description: "Áp dụng ưu đãi tốt hơn cho nhóm từ 4 khách trở lên",
    discount: "15%",
    image:
      "https://images.unsplash.com/photo-1527631746610-bca00a040d60?auto=format&fit=crop&w=1200&q=80",
    validUntil: "31/12/2026"
  }
];

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("vi-VN") + "đ";
}

function getDurationText(days) {
  const totalDays = Number(days || 1);
  if (totalDays <= 1) return "1 ngày";
  return `${totalDays} ngày ${Math.max(totalDays - 1, 0)} đêm`;
}

function getTourImage(tour) {
  const rawUrl = String(tour.thumbnail_url || "").trim();

  if (!rawUrl) {
    return "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80";
  }

  if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) {
    return rawUrl;
  }

  if (rawUrl.startsWith("/assets/") || rawUrl.startsWith("/uploads/")) {
    return rawUrl;
  }

  if (rawUrl.startsWith("assets/") || rawUrl.startsWith("uploads/")) {
    return "/" + rawUrl;
  }

  return `/uploads/${rawUrl}`;
}

function getAppliedPrice(tour) {
  const basePrice = Number(tour?.base_price || 0);
  const salePrice = Number(tour?.sale_price || 0);

  if (salePrice > 0 && salePrice < basePrice) {
    return salePrice;
  }

  return basePrice;
}

function getTaxPercent(tour) {
  const p = Number(tour?.tax_percent);
  return Number.isFinite(p) && p > 0 ? p : 0;
}

function getTaxAmount(tour) {
  const taxPercent = getTaxPercent(tour);
  if (taxPercent <= 0) return 0;

  const tax = Number(tour?.tax || 0);
  if (tax > 0) return tax;

  const appliedPrice = getAppliedPrice(tour);
  return Math.round(appliedPrice * (taxPercent / 100));
}

function getDisplayPrice(tour) {
  const finalPrice = Number(tour?.final_price || 0);
  if (finalPrice > 0) return finalPrice;

  const appliedPrice = getAppliedPrice(tour);
  const tax = getTaxAmount(tour);

  return appliedPrice + tax;
}

function goToTourList(query = "") {
  const baseUrl = "./pages/tours/dstour.html";
  window.location.href = query ? `${baseUrl}?${query}` : baseUrl;
}

function goToTourDetail(tourId) {
  window.location.href = `./pages/tours/chitiet.html?id=${tourId}`;
}

async function fetchFeaturedTours() {
  const response = await fetch(
    "http://localhost:3000/api/provider/public/featured-tours?limit=6"
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Không thể lấy tour nổi bật");
  }

  const result = await response.json();
  return result.data || [];
}

async function fetchDiscountedTours(limit = 6) {
  const response = await fetch(
    `http://localhost:3000/api/provider/public/discounted-tours?limit=${encodeURIComponent(
      String(limit)
    )}`
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Không thể lấy tour ưu đãi");
  }

  const result = await response.json();
  return result.data || [];
}

function computeDiscountPercent(basePrice, salePrice) {
  const base = Number(basePrice) || 0;
  const sale = Number(salePrice) || 0;
  if (base <= 0 || sale <= 0 || sale >= base) return 0;
  return Math.round(((base - sale) / base) * 100);
}

function formatDateVi(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = String(date.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

function renderDestinationsFromTours(tours) {
  const container = document.getElementById("destinations-list");
  if (!container) return;

  if (!Array.isArray(tours) || tours.length === 0) {
    container.innerHTML = `
      <div class="destination-card">
        <div class="destination-content">
          <h3>Chưa có dữ liệu</h3>
          <p class="location">Hiện chưa có điểm đến nào</p>
        </div>
      </div>
    `;
    return;
  }

  const uniqueLocations = [];
  const seen = new Set();

  tours.forEach((tour) => {
    const location = (tour.location || "Chưa cập nhật").trim();

    if (!seen.has(location)) {
      seen.add(location);
      uniqueLocations.push({
        id: tour.id,
        name: location,
        location,
        image: getTourImage(tour),
        price: formatCurrency(getDisplayPrice(tour))
      });
    }
  });

  container.innerHTML = uniqueLocations
    .slice(0, 4)
    .map(
      (dest) => `
      <div class="destination-card" data-destination="${dest.location}">
        <img
          src="${dest.image}"
          alt="${dest.name}"
          onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80';"
        >
        <div class="destination-content">
          <div class="destination-top">
            <h3>${dest.name}</h3>
            <span class="rating">📍</span>
          </div>

          <p class="location">${dest.location}</p>

          <div class="destination-bottom">
            <div class="price-wrap">
              <span class="price-label">Từ</span>
              <span class="price">${dest.price}</span>
            </div>
            <span class="reviews">Điểm đến nổi bật</span>
          </div>
        </div>
      </div>
    `
    )
    .join("");
}

function renderTours(tours) {
  const container = document.getElementById("featured-tours-list");
  if (!container) return;

  if (!Array.isArray(tours) || tours.length === 0) {
    container.innerHTML = `
      <div class="tour-card">
        <div class="tour-content">
          <h3>Chưa có tour</h3>
          <p class="muted">Hiện chưa có tour nào đang hoạt động.</p>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = tours
    .slice(0, 6)
    .map((tour) => {
      const appliedPrice = getAppliedPrice(tour);
      const tax = getTaxAmount(tour);
      const finalPrice = getDisplayPrice(tour);
      const vatDetailLine =
        getTaxPercent(tour) > 0 && tax > 0
          ? `<p class="muted" style="font-size:12px;margin-top:4px;">
                Giá áp dụng ${formatCurrency(appliedPrice)} + VAT ${formatCurrency(tax)}
              </p>`
          : "";

      return `
      <div class="tour-card">
        <img
          src="${getTourImage(tour)}"
          alt="${tour.title || "Tour du lịch"}"
          onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80';"
        >
        <div class="tour-content">
          <h3>${tour.title || "Chưa có tên tour"}</h3>
          <p class="muted">${tour.description || "Tour du lịch hấp dẫn từ TravelTour"}</p>

          <div class="tour-rating">
            <span>📍 ${tour.location || "Chưa cập nhật"}</span>
            <span class="reviews">${getDurationText(tour.duration_days)}</span>
          </div>

          <div class="tour-bottom">
            <div>
              <p class="muted">Giá từ</p>
              <p class="price">${formatCurrency(finalPrice)}</p>
              ${vatDetailLine}
            </div>

            <button
              type="button"
              class="btn btn-primary btn-detail"
              data-tour-id="${tour.id}"
            >
              Xem chi tiết
            </button>
          </div>
        </div>
      </div>
    `;
    })
    .join("");
}

function renderFeatures() {
  const container = document.getElementById("features-list");
  if (!container) return;

  container.innerHTML = fallbackFeatures
    .map(
      (feature) => `
      <div class="feature-card">
        <div class="feature-icon">${feature.icon}</div>
        <h3>${feature.title}</h3>
        <p>${feature.description}</p>
      </div>
    `
    )
    .join("");
}

function renderPromotions() {
  const container = document.getElementById("promotions-list");
  if (!container) return;

  container.innerHTML = fallbackPromotions
    .map(
      (promo) => `
      <div class="promo-card">
        <div class="promo-badge">-${promo.discount}</div>
        <img src="${promo.image}" alt="${promo.title}">
        <div class="promo-content">
          <h3>${promo.title}</h3>
          <p>${promo.description}</p>
          <p class="muted">Có hiệu lực đến: ${promo.validUntil}</p>
          <button
            type="button"
            class="btn btn-primary btn-book-now"
            data-promo-id="${promo.id}"
            style="margin-top:16px;"
          >
            Đặt tour ngay
          </button>
        </div>
      </div>
    `
    )
    .join("");
}

function renderPromotionsFromTours(tours) {
  const container = document.getElementById("promotions-list");
  if (!container) return;

  if (!Array.isArray(tours) || tours.length === 0) {
    renderPromotions();
    return;
  }

  container.innerHTML = tours
    .slice(0, 2)
    .map((tour) => {
      const discountPercent = computeDiscountPercent(tour.base_price, tour.sale_price);
      const validUntil = formatDateVi(tour.end_date);
      const description =
        (tour.description || "").trim() || "Tour du lịch ưu đãi hấp dẫn từ TravelTour";
      const image = getTourImage(tour);
      const finalPrice = getDisplayPrice(tour);

      return `
      <div class="promo-card" data-tour-id="${tour.id}">
        <div class="promo-badge">-${discountPercent || 0}%</div>
        <img
          src="${image}"
          alt="${tour.title || "Ưu đãi tour"}"
          onerror="this.onerror=null;this.src='https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80';"
        >
        <div class="promo-content">
          <h3>${tour.title || "Ưu đãi tour"}</h3>
          <p>${description}</p>
          <p style="font-weight:700;color:#10a669;margin-top:8px;">
            Giá sau điều chỉnh: ${formatCurrency(finalPrice)}
          </p>
          ${
            validUntil
              ? `<p class="muted">Có hiệu lực đến: ${validUntil}</p>`
              : `<p class="muted">Số lượng ưu đãi có hạn</p>`
          }
          <button
            type="button"
            class="btn btn-primary btn-book-now"
            data-tour-id="${tour.id}"
            style="margin-top:16px;"
          >
            Xem chi tiết
          </button>
        </div>
      </div>
    `;
    })
    .join("");
}

function bindNavbarBookingButton() {
  const bookingButton = document.querySelector(".nav-actions .btn.btn-primary");
  if (!bookingButton) return;

  bookingButton.addEventListener("click", () => {
    goToTourList();
  });
}

function bindDestinationCards() {
  const destinationCards = document.querySelectorAll(".destination-card");

  destinationCards.forEach((card) => {
    card.style.cursor = "default";
  });
}

function bindTourDetailButtons() {
  document.addEventListener("click", function (e) {
    const btn = e.target.closest(".btn-detail");
    if (!btn) return;

    const tourId = btn.dataset.tourId;
    if (!tourId) return;

    goToTourDetail(tourId);
  });
}

function bindPromotionButtons() {
  document.addEventListener("click", function (e) {
    const bookNowBtn = e.target.closest(".btn-book-now");
    if (bookNowBtn) {
      e.preventDefault();
      e.stopPropagation();

      const tourId = bookNowBtn.dataset.tourId;
      if (tourId) {
        goToTourDetail(tourId);
        return;
      }

      goToTourList();
      return;
    }

    const promoCard = e.target.closest(".promo-card");
    if (!promoCard) return;

    const tourId = promoCard.dataset.tourId;
    if (tourId) {
      goToTourDetail(tourId);
      return;
    }
  });

  const promoCards = document.querySelectorAll(".promo-card");
  promoCards.forEach((card) => {
    card.style.cursor = "pointer";
  });
}

function bindSearchForm() {
  const searchBox = document.querySelector(".search-box");
  const searchButton = document.querySelector(".btn-search");

  if (!searchBox || !searchButton) return;

  const destinationInput = searchBox.querySelector('input[type="text"]');
  const dateInput = searchBox.querySelector('input[type="date"]');
  const passengerSelect = searchBox.querySelector("select");

  searchButton.addEventListener("click", () => {
    const destination = destinationInput?.value.trim() || "";
    const departureDate = dateInput?.value || "";
    const passengers = passengerSelect?.value || "";

    const params = new URLSearchParams();

    if (destination) params.append("destination", destination);
    if (departureDate) params.append("date", departureDate);
    if (passengers) params.append("passengers", passengers);

    goToTourList(params.toString());
  });
}

function bindHeaderMenu() {
  const menuLinks = document.querySelectorAll(".nav-menu a");

  menuLinks.forEach((link) => {
    const text = link.textContent.trim().toLowerCase();

    link.addEventListener("click", (event) => {
      event.preventDefault();

      if (text.includes("trang chủ")) {
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      if (text.includes("giới thiệu")) {
        document.querySelector(".why-section")?.scrollIntoView({
          behavior: "smooth"
        });
        return;
      }

      if (text.includes("điểm đến")) {
        document.querySelector("#destinations-list")?.scrollIntoView({
          behavior: "smooth"
        });
      }
    });
  });
}

function bindUserIcon() {
  const userIcon = document.querySelector(".user-icon");
  if (!userIcon) return;

  userIcon.addEventListener("click", (event) => {
    event.preventDefault();

    const savedUser = localStorage.getItem("traveltour_user");

    if (savedUser) {
      window.location.href = "./pages/customer/customer.html";
      return;
    }

    window.location.href = "/login";
  });
}

function getCurrentUser() {
  const accessToken = localStorage.getItem("accessToken");
  if (!accessToken) {
    localStorage.removeItem("traveltour_user");
    return null;
  }

  const savedUser = localStorage.getItem("traveltour_user");
  if (!savedUser) return null;

  try {
    const user = JSON.parse(savedUser);
    if (!user || typeof user !== "object") {
      localStorage.removeItem("traveltour_user");
      return null;
    }

    return user;
  } catch (error) {
    console.warn("Không đọc được thông tin người dùng:", error);
    localStorage.removeItem("traveltour_user");
    return null;
  }
}

function bindAuthButton() {
  const btnAuth = document.getElementById("btnAuth");
  if (!btnAuth) return;

  const currentUser = getCurrentUser();
  const isLoggedIn = !!currentUser;
  btnAuth.textContent = isLoggedIn ? "Đăng xuất" : "Đăng nhập";

  btnAuth.addEventListener("click", () => {
    if (!getCurrentUser()) {
      window.location.href = "/login";
      return;
    }

    localStorage.removeItem("accessToken");
    localStorage.removeItem("traveltour_user");
    localStorage.removeItem("traveltour_remember");
    btnAuth.textContent = "Đăng nhập";
    window.location.href = "/index.html";
  });
}

async function initHomePage() {
  try {
    const [tours, discountedTours] = await Promise.all([
      fetchFeaturedTours(),
      fetchDiscountedTours(6).catch(() => [])
    ]);

    renderDestinationsFromTours(tours);
    renderTours(tours);
    renderFeatures();
    renderPromotionsFromTours(discountedTours);

    bindNavbarBookingButton();
    bindDestinationCards();
    bindTourDetailButtons();
    bindPromotionButtons();
    bindSearchForm();
    bindHeaderMenu();
    bindUserIcon();
    bindAuthButton();
    bindChatbot();
  } catch (error) {
    console.error("Lỗi tải dữ liệu trang chủ:", error);

    renderDestinationsFromTours([]);
    renderTours([]);
    renderFeatures();
    renderPromotions();

    bindNavbarBookingButton();
    bindDestinationCards();
    bindTourDetailButtons();
    bindPromotionButtons();
    bindSearchForm();
    bindHeaderMenu();
    bindUserIcon();
    bindAuthButton();
    bindChatbot();
  }
}

document.addEventListener("DOMContentLoaded", initHomePage);

function addChatMessage(role, content) {
  const messages = document.getElementById("chatbotMessages");
  if (!messages) return;

  const messageEl = document.createElement("div");
  messageEl.className = `chatbot-message ${role}`;
  messageEl.textContent = content;
  messages.appendChild(messageEl);

  messages.scrollTop = messages.scrollHeight;
}

async function callChatbotApi(message) {
  const response = await fetch("http://localhost:3000/api/chatbot", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      message: message,
      userId: "guest_user"
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Không gọi được chatbot API");
  }

  const result = await response.json();
  return result.reply || result.message || result.data || "Xin lỗi, tôi chưa có phản hồi.";
}

function bindChatbot() {
  const chatbotToggle = document.getElementById("chatbotToggle");
  const chatbotClose = document.getElementById("chatbotClose");
  const chatbotBox = document.getElementById("chatbotBox");
  const chatbotSend = document.getElementById("chatbotSend");
  const chatbotInput = document.getElementById("chatbotInput");

  if (!chatbotToggle || !chatbotClose || !chatbotBox || !chatbotSend || !chatbotInput) {
    return;
  }

  chatbotToggle.addEventListener("click", () => {
    chatbotBox.classList.toggle("open");
  });

  chatbotClose.addEventListener("click", () => {
    chatbotBox.classList.remove("open");
  });

  async function handleSendMessage() {
    const userMessage = chatbotInput.value.trim();
    if (!userMessage) return;

    addChatMessage("user", userMessage);
    chatbotInput.value = "";

    addChatMessage("bot", "Đang trả lời...");

    try {
      const messages = document.getElementById("chatbotMessages");
      const loadingMessage = messages.lastElementChild;

      const botReply = await callChatbotApi(userMessage);

      if (loadingMessage) {
        loadingMessage.textContent = botReply;
      }
    } catch (error) {
      console.error("Chatbot error:", error);

      const messages = document.getElementById("chatbotMessages");
      const loadingMessage = messages.lastElementChild;

      if (loadingMessage) {
        loadingMessage.textContent = "Xin lỗi, hệ thống chatbot đang bận. Vui lòng thử lại sau.";
      }
    }
  }

  chatbotSend.addEventListener("click", handleSendMessage);

  chatbotInput.addEventListener("keypress", (event) => {
    if (event.key === "Enter") {
      handleSendMessage();
    }
  });
}