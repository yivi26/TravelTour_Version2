(function () {
  const API_BASE = "http://localhost:3000";
  let TOUR_PRICE = 0;
  let currentTour = null;
  let meetingMap = null;
  let meetingMarker = null;
  let reviewsTourId = null;

  const bookingForm = document.getElementById("booking-form");
  const dateInput = document.getElementById("departure-date");
  const endDateInput = document.getElementById("tour-end-date");
  const adultSelect = document.getElementById("adult-count");
  const childSelect = document.getElementById("child-count");
  const lineLabel = document.getElementById("booking-line-label");
  const lineTotal = document.getElementById("booking-line-total");
  const grandTotal = document.getElementById("booking-grand-total");

  const FALLBACK_IMAGE =
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80";

  function formatCurrency(value) {
    return new Intl.NumberFormat("vi-VN").format(Number(value || 0)) + "đ";
  }

  function escapeHtml(text) {
    return String(text ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function formatMultilineText(text) {
    return escapeHtml(text).replace(/\n/g, "<br>");
  }

  function hasText(value) {
    return String(value ?? "").trim() !== "";
  }

  function getTourIdFromURL() {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
  }

  function getCurrentUser() {
    const accessToken = localStorage.getItem("accessToken");
    if (!accessToken) {
      return null;
    }

    const rawUser = localStorage.getItem("traveltour_user");
    if (!rawUser) {
      return null;
    }

    try {
      return JSON.parse(rawUser);
    } catch (error) {
      return null;
    }
  }

  function getDurationText(days, durationText) {
    if (hasText(durationText)) return durationText;
    const totalDays = Number(days || 1);
    if (totalDays <= 1) return "1 ngày";
    return `${totalDays} ngày ${Math.max(totalDays - 1, 0)} đêm`;
  }

  function safeParseJsonArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      return [];
    }
  }

  function normalizeImageUrl(url) {
    const rawUrl = String(url || "").trim();
    if (!rawUrl) return FALLBACK_IMAGE;
    if (rawUrl.startsWith("http://") || rawUrl.startsWith("https://")) return rawUrl;
    if (rawUrl.startsWith("/")) return rawUrl;
    return "/" + rawUrl.replace(/^\/+/, "");
  }

  function getMainImage(tour) {
    if (Array.isArray(tour.images) && tour.images.length > 0) {
      const firstImage = tour.images[0]?.image_url || "";
      if (firstImage) return normalizeImageUrl(firstImage);
    }
    return normalizeImageUrl(tour.thumbnail_url);
  }

  function getGalleryImages(tour) {
    const gallery = [];

    if (tour.thumbnail_url) {
      gallery.push(normalizeImageUrl(tour.thumbnail_url));
    }

    if (Array.isArray(tour.images)) {
      tour.images.forEach((item) => {
        const imageUrl = item?.image_url || item;
        if (imageUrl) gallery.push(normalizeImageUrl(imageUrl));
      });
    }

    return [...new Set(gallery.filter(Boolean))];
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

    const appliedPrice = getAppliedPrice(tour);
    const taxValue = Number(tour?.tax || 0);

    if (taxValue > 0) return taxValue;

    return Math.round(appliedPrice * (taxPercent / 100));
  }

  function getFinalPrice(tour) {
    const finalPrice = Number(tour?.final_price || 0);
    if (finalPrice > 0) return finalPrice;

    return getAppliedPrice(tour) + getTaxAmount(tour);
  }

  function getAuthHeaders(includeJson) {
    const headers = { Accept: "application/json" };
    if (includeJson) headers["Content-Type"] = "application/json";
    const token = localStorage.getItem("accessToken");
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  }

  function renderStarChars(n) {
    const r = Math.max(0, Math.min(5, Math.round(Number(n) || 0)));
    return "★".repeat(r) + "☆".repeat(5 - r);
  }

  function reviewerInitials(name) {
    const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return "?";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  async function fetchTourDetail(id) {
    const response = await fetch(`${API_BASE}/api/provider/public/tours/${id}`);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || "Lỗi lấy chi tiết tour");
    }

    const result = await response.json();
    return result.data;
  }

  function renderList(elementId, items, emptyText) {
    const container = document.getElementById(elementId);
    if (!container) return;

    if (!Array.isArray(items) || items.length === 0) {
      container.innerHTML = `<li>${escapeHtml(emptyText)}</li>`;
      return;
    }

    container.innerHTML = items
      .map((item) => `<li>${escapeHtml(item)}</li>`)
      .join("");
  }

  function renderItinerary(itinerary) {
    const container = document.getElementById("tour-itinerary");
    if (!container) return;

    if (!Array.isArray(itinerary) || itinerary.length === 0) {
      container.innerHTML = '<p class="detail-itinerary-empty">Chưa có lịch trình.</p>';
      return;
    }

    const daysHtml = itinerary
      .map((day, idx) => {
        const dayNum = escapeHtml(
          day.day !== undefined && day.day !== null && String(day.day).trim() !== ""
            ? String(day.day)
            : String(idx + 1)
        );
        const title = escapeHtml(day.title || "Chưa có tiêu đề");
        const raw = (day.description || "").trim();
        const lines = raw
          ? raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
          : [];
        const slots = lines.length ? lines : [raw || "Chưa có mô tả cho ngày này."];

        const slotsHtml = slots
          .map((line) => {
            const m = line.match(/^(\d{1,2}:\d{2})\s*-\s*(.*)$/);
            const body = m
              ? `<span class="detail-itinerary-slot__time">${escapeHtml(m[1])}</span><span class="detail-itinerary-slot__dash"> - </span><span class="detail-itinerary-slot__text">${escapeHtml(m[2])}</span>`
              : `<span class="detail-itinerary-slot__text">${escapeHtml(line)}</span>`;
            return `<li class="detail-itinerary-slot"><span class="detail-itinerary-slot__pin ui-icon ui-icon--pin" aria-hidden="true"></span><div class="detail-itinerary-slot__line">${body}</div></li>`;
          })
          .join("");

        return `
          <article class="detail-itinerary-day">
            <div class="detail-itinerary-day__track" aria-hidden="true">
              <span class="detail-itinerary-day__badge">${dayNum}</span>
              <span class="detail-itinerary-day__vline"></span>
            </div>
            <div class="detail-itinerary-day__panel">
              <header class="detail-itinerary-day__head">
                <span class="detail-itinerary-day__cal ui-icon ui-icon--calendar" aria-hidden="true"></span>
                <div class="detail-itinerary-day__head-text">
                  <h3 class="detail-itinerary-day__name">Ngày ${dayNum}</h3>
                  <p class="detail-itinerary-day__route">${title}</p>
                </div>
              </header>
              <ul class="detail-itinerary-slots">${slotsHtml}</ul>
            </div>
          </article>`;
      })
      .join("");

    container.innerHTML = `<div class="detail-itinerary">${daysHtml}</div>`;
  }

  function renderGallery(tour) {
    const mainImage = document.getElementById("tour-main-image");
    const thumbsContainer = document.getElementById("tour-thumbs");
    if (!mainImage || !thumbsContainer) return;

    const images = getGalleryImages(tour);
    const activeMainImage = getMainImage(tour);

    mainImage.src = activeMainImage;
    mainImage.alt = tour.title || "Ảnh tour";
    mainImage.onerror = function () {
      this.onerror = null;
      this.src = FALLBACK_IMAGE;
    };

    if (images.length <= 1) {
      thumbsContainer.innerHTML = "";
      return;
    }

    thumbsContainer.innerHTML = images
      .map(
        (imageUrl, index) => `
          <button
            type="button"
            class="tour-thumb ${imageUrl === activeMainImage ? "active" : ""}"
            data-image="${imageUrl}"
            aria-label="Xem ảnh tour ${index + 1}"
          >
            <img src="${imageUrl}" alt="Ảnh tour ${index + 1}" />
          </button>
        `
      )
      .join("");

    const thumbButtons = thumbsContainer.querySelectorAll(".tour-thumb");

    thumbButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const imageUrl = button.getAttribute("data-image") || FALLBACK_IMAGE;
        mainImage.src = imageUrl;

        thumbButtons.forEach((item) => item.classList.remove("active"));
        button.classList.add("active");
      });
    });
  }

  function setMeetingPointText(meetingPoint) {
    const meetingPointElement = document.getElementById("tour-meeting-point");
    if (!meetingPointElement) return;

    if (!hasText(meetingPoint)) {
      meetingPointElement.textContent = "Chưa cập nhật điểm tập trung.";
      meetingPointElement.classList.add("meeting-point-empty");
      return;
    }

    meetingPointElement.textContent = meetingPoint;
    meetingPointElement.classList.remove("meeting-point-empty");
  }

  function destroyMeetingMap() {
    if (meetingMap) {
      meetingMap.remove();
      meetingMap = null;
      meetingMarker = null;
    }
  }

  function renderMapEmpty(message) {
    const mapContainer = document.getElementById("tour-meeting-map");
    if (!mapContainer) return;

    destroyMeetingMap();
    mapContainer.innerHTML = `<div class="map-empty-box">${escapeHtml(message)}</div>`;
  }

  function clearMapFallback() {
    const mapContainer = document.getElementById("tour-meeting-map");
    if (!mapContainer) return;
    mapContainer.innerHTML = "";
  }

  function renderMeetingPointMap(tour) {
    const meetingPoint = tour.meeting_point || tour.location || "";
    const lat = Number(tour.latitude);
    const lng = Number(tour.longitude);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      renderMapEmpty("Chưa có dữ liệu bản đồ cho điểm tập trung.");
      return;
    }

    if (typeof L === "undefined") {
      renderMapEmpty("Không tải được bản đồ.");
      return;
    }

    destroyMeetingMap();
    clearMapFallback();

    meetingMap = L.map("tour-meeting-map").setView([lat, lng], 15);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap"
    }).addTo(meetingMap);

    meetingMarker = L.marker([lat, lng])
      .addTo(meetingMap)
      .bindPopup(meetingPoint || "Điểm tập trung")
      .openPopup();

    setTimeout(() => {
      meetingMap.invalidateSize();
    }, 200);
  }

  function renderPolicySection(tour) {
    const policySection = document.getElementById("tour-policy-section");
    const cancelPolicyWrap = document.getElementById("cancel-policy-wrap");
    const termsConditionsWrap = document.getElementById("terms-conditions-wrap");
    const otherNotesWrap = document.getElementById("other-notes-wrap");

    const cancelPolicyEl = document.getElementById("tour-cancel-policy");
    const termsConditionsEl = document.getElementById("tour-terms-conditions");
    const otherNotesEl = document.getElementById("tour-other-notes");

    if (
      !policySection ||
      !cancelPolicyWrap ||
      !termsConditionsWrap ||
      !otherNotesWrap ||
      !cancelPolicyEl ||
      !termsConditionsEl ||
      !otherNotesEl
    ) {
      return;
    }

    const cancelPolicy = tour.cancel_policy || "";
    const termsConditions = tour.terms_conditions || "";
    const otherNotes = tour.other_notes || "";

    const hasCancelPolicy = hasText(cancelPolicy);
    const hasTermsConditions = hasText(termsConditions);
    const hasOtherNotes = hasText(otherNotes);

    policySection.style.display = "none";
    cancelPolicyWrap.style.display = "none";
    termsConditionsWrap.style.display = "none";
    otherNotesWrap.style.display = "none";

    cancelPolicyEl.innerHTML = "";
    termsConditionsEl.innerHTML = "";
    otherNotesEl.innerHTML = "";

    if (!hasCancelPolicy && !hasTermsConditions && !hasOtherNotes) {
      return;
    }

    policySection.style.display = "block";

    if (hasCancelPolicy) {
      cancelPolicyWrap.style.display = "block";
      cancelPolicyEl.innerHTML = formatMultilineText(cancelPolicy);
    }

    if (hasTermsConditions) {
      termsConditionsWrap.style.display = "block";
      termsConditionsEl.innerHTML = formatMultilineText(termsConditions);
    }

    if (hasOtherNotes) {
      otherNotesWrap.style.display = "block";
      otherNotesEl.innerHTML = formatMultilineText(otherNotes);
    }
  }

  function renderExtraInfo(tour) {
    const section = document.getElementById("tour-extra-info-section");
    const hotelWrap = document.getElementById("hotel-info-wrap");
    const transportWrap = document.getElementById("transport-info-wrap");

    const hotelEl = document.getElementById("tour-hotel-info");
    const transportEl = document.getElementById("tour-transport-info");

    if (!section || !hotelWrap || !transportWrap || !hotelEl || !transportEl) return;

    const hasHotel = hasText(tour.hotel_info);
    const hasTransport = hasText(tour.transport_info);

    section.style.display = "none";
    hotelWrap.style.display = "none";
    transportWrap.style.display = "none";

    if (!hasHotel && !hasTransport) return;

    section.style.display = "block";

    if (hasHotel) {
      hotelWrap.style.display = "block";
      hotelEl.innerHTML = formatMultilineText(tour.hotel_info);
    }

    if (hasTransport) {
      transportWrap.style.display = "block";
      transportEl.innerHTML = formatMultilineText(tour.transport_info);
    }
  }

  function renderTourDetail(tour) {
    currentTour = tour;

    const appliedPrice = getAppliedPrice(tour);
    const taxPercent = getTaxPercent(tour);
    const taxAmount = getTaxAmount(tour);
    const finalPrice = getFinalPrice(tour);

    TOUR_PRICE = finalPrice;

    const title = tour.title || "Chưa có tên tour";
    const location = tour.location || "Chưa cập nhật";
    const provider = tour.provider_name || "Nhà cung cấp";
    const description = tour.description || tour.short_description || "Chưa có mô tả";
    const meetingPoint = tour.meeting_point || "";
    const duration = getDurationText(tour.duration_days, tour.duration_text);
    const capacity = `${Number(tour.max_capacity || 0)} khách`;

    const appliedPriceText = formatCurrency(appliedPrice);
    const taxAmountText = formatCurrency(taxAmount);
    const finalPriceText = formatCurrency(finalPrice);

    document.title = `${title} - TravelTour`;

    const breadcrumbTitle = document.getElementById("breadcrumb-title");
    const tourTitle = document.getElementById("tour-title");
    const tourLocation = document.getElementById("tour-location");
    const tourProvider = document.getElementById("tour-provider");
    const tourDescription = document.getElementById("tour-description");
    const tourDescriptionFull = document.getElementById("tour-description-full");
    const tourDuration = document.getElementById("tour-duration");
    const tourCapacity = document.getElementById("tour-capacity");
    const tourPrice = document.getElementById("tour-price");
    const bookingTourPrice = document.getElementById("booking-tour-price");

    const tourBasePriceEl = document.getElementById("tour-base-price");
    const tourTaxPercentEl = document.getElementById("tour-tax-percent");
    const tourTaxEl = document.getElementById("tour-tax");
    const tourFinalPriceEl = document.getElementById("tour-final-price");

    const bookingBasePriceEl = document.getElementById("booking-base-price");
    const bookingTaxPercentEl = document.getElementById("booking-tax-percent");
    const bookingTaxEl = document.getElementById("booking-tax");
    const bookingFinalPriceEl = document.getElementById("booking-final-price");

    if (breadcrumbTitle) breadcrumbTitle.textContent = title;
    if (tourTitle) tourTitle.textContent = title;
    if (tourLocation) tourLocation.textContent = location;
    if (tourProvider) tourProvider.textContent = provider;
    if (tourDescription) tourDescription.textContent = description;
    if (tourDescriptionFull) tourDescriptionFull.textContent = description;
    if (tourDuration) tourDuration.textContent = duration;
    if (tourCapacity) tourCapacity.textContent = capacity;
    if (tourPrice) tourPrice.textContent = finalPriceText;
    if (bookingTourPrice) bookingTourPrice.textContent = finalPriceText;

    if (tourBasePriceEl) tourBasePriceEl.textContent = appliedPriceText;
    if (tourTaxPercentEl) tourTaxPercentEl.textContent = `${taxPercent}%`;
    if (tourTaxEl) tourTaxEl.textContent = taxAmountText;
    if (tourFinalPriceEl) tourFinalPriceEl.textContent = finalPriceText;

    if (bookingBasePriceEl) bookingBasePriceEl.textContent = appliedPriceText;
    if (bookingTaxPercentEl) bookingTaxPercentEl.textContent = `${taxPercent}%`;
    if (bookingTaxEl) bookingTaxEl.textContent = taxAmountText;
    if (bookingFinalPriceEl) bookingFinalPriceEl.textContent = finalPriceText;

    const includes = safeParseJsonArray(tour.includes);
    const excludes = safeParseJsonArray(tour.excludes);
    const itinerary = safeParseJsonArray(tour.itinerary);

    renderGallery(tour);
    renderList("tour-includes-list", includes, "Chưa có thông tin bao gồm");
    renderList("tour-excludes-list", excludes, "Chưa có thông tin không bao gồm");
    renderItinerary(itinerary);
    setMeetingPointText(meetingPoint);
    renderMeetingPointMap(tour);
    renderExtraInfo(tour);
    renderPolicySection(tour);
    updateBookingSummary();
  }

  function setReviewsMessage(el, text, ok) {
    if (!el) return;
    el.textContent = text || "";
    el.classList.toggle("reviews-compose-msg--ok", Boolean(ok));
  }

  async function loadAndRenderReviews(tourId) {
    reviewsTourId = tourId;
    const root = document.getElementById("reviews-summary-root");
    const listEl = document.getElementById("reviews-list");
    const hintEl = document.getElementById("reviews-viewer-hint");
    const compose = document.getElementById("reviews-compose");
    const msgEl = document.getElementById("reviews-compose-msg");
    const delBtn = document.getElementById("review-delete-btn");

    if (!root || !listEl) return;

    root.innerHTML = "<p class=\"meeting-point-empty\">Đang tải đánh giá...</p>";
    listEl.innerHTML = "";
    if (hintEl) {
      hintEl.hidden = true;
      hintEl.textContent = "";
    }
    if (compose) compose.style.display = "none";
    if (delBtn) delBtn.style.display = "none";
    setReviewsMessage(msgEl, "", false);

    try {
      const res = await fetch(`${API_BASE}/api/provider/public/tours/${encodeURIComponent(tourId)}/reviews`, {
        headers: getAuthHeaders(false),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload.message || "Không tải được đánh giá");

      const data = payload.data || {};
      const summary = data.summary || { average: 0, total: 0, distribution: [] };
      const reviews = data.reviews || [];
      const viewer = data.viewer || { role: "guest" };
      const role = String(viewer.role || "guest");

      const total = Number(summary.total || 0);
      const avg = total > 0 ? Number(summary.average || 0) : null;
      const avgText = avg != null ? avg.toFixed(1) : "—";

      const distHtml = (summary.distribution || [])
        .map(
          (row) => `
          <div class="rating-row">
            <span>${row.stars} sao</span>
            <div class="rating-row__bar"><span style="width:${Math.min(100, Number(row.percent) || 0)}%"></span></div>
            <span>${row.count}</span>
          </div>
        `
        )
        .join("");

      root.innerHTML = `
        <div class="reviews-summary">
          <div class="score-card">
            <div class="score-card__value">${escapeHtml(avgText)}</div>
            <div class="score-card__stars" aria-hidden="true">${renderStarChars(avg != null ? Math.round(avg) : 0)}</div>
            <span>${total} đánh giá</span>
          </div>
          <div class="rating-breakdown">${distHtml}</div>
        </div>
      `;

      if (!reviews.length) {
        listEl.innerHTML = "<p class=\"meeting-point-empty\">Chưa có đánh giá đã duyệt nào.</p>";
      } else {
        listEl.innerHTML = reviews
          .map((r) => {
            const avatarUrl = normalizeImageUrl(r.userAvatarUrl);
            const useImg = r.userAvatarUrl && String(r.userAvatarUrl).trim() !== "";
            const avatarBlock = useImg
              ? `<img class="review-card__avatar review-card__avatar--img" src="${escapeHtml(avatarUrl)}" alt="" />`
              : `<div class="review-card__avatar">${escapeHtml(reviewerInitials(r.userName))}</div>`;
            return `
              <article class="review-card">
                ${avatarBlock}
                <div class="review-card__content">
                  <div class="review-card__header">
                    <div>
                      <h3>${escapeHtml(r.userName)}</h3>
                      <time>${escapeHtml(r.dateText)}</time>
                    </div>
                    <div class="review-card__stars" aria-label="${r.rating} sao">${renderStarChars(r.rating)}</div>
                  </div>
                  <p>${formatMultilineText(r.comment)}</p>
                </div>
              </article>
            `;
          })
          .join("");
      }

      if (hintEl) {
        if (role === "guest" && viewer.postBlockedReason) {
          hintEl.hidden = false;
          hintEl.textContent = viewer.postBlockedReason;
        } else if (role !== "customer" && role !== "guest") {
          hintEl.hidden = false;
          hintEl.textContent =
            viewer.postBlockedReason ||
            "Bạn đang đăng nhập với vai trò nhà cung cấp / quản trị / HDV — chỉ xem đánh giá; không gửi đánh giá tại trang công khai này.";
        } else if (role === "customer" && viewer.postBlockedReason && !viewer.canPost) {
          hintEl.hidden = false;
          hintEl.textContent = viewer.postBlockedReason;
        } else {
          hintEl.hidden = true;
        }
      }

      const user = getCurrentUser();
      const showCompose = role === "customer" && viewer.canPost;
      if (compose) {
        compose.style.display = showCompose ? "block" : "none";
        if (showCompose) {
          const ta = document.getElementById("review-comment-input");
          const sel = document.getElementById("review-rating-input");
          if (ta) ta.value = "";
          if (sel) sel.value = "5";
          setReviewsMessage(msgEl, "", false);
        }
      }

      if (delBtn && user && String(user.role || "").toLowerCase() === "customer") {
        const st = viewer.myReview && String(viewer.myReview.status || "").toLowerCase();
        delBtn.style.display = st === "pending" ? "inline-block" : "none";
      }
    } catch (e) {
      console.error(e);
      root.innerHTML = `<p class="meeting-point-empty">${escapeHtml(e.message || "Lỗi tải đánh giá")}</p>`;
    }
  }

  function bindReviewActionsOnce() {
    const submitBtn = document.getElementById("review-submit-btn");
    const delBtn = document.getElementById("review-delete-btn");
    const msgEl = document.getElementById("reviews-compose-msg");

    if (submitBtn && !submitBtn.dataset.bound) {
      submitBtn.dataset.bound = "1";
      submitBtn.addEventListener("click", async () => {
        if (!reviewsTourId) return;
        const user = getCurrentUser();
        if (!user || String(user.role || "").toLowerCase() !== "customer") {
          alert("Chỉ khách hàng đã đăng nhập mới gửi được đánh giá.");
          return;
        }
        const token = localStorage.getItem("accessToken");
        if (!token) {
          alert("Phiên đăng nhập hết hạn.");
          return;
        }
        const rating = Number(document.getElementById("review-rating-input")?.value || 5);
        const comment = String(document.getElementById("review-comment-input")?.value || "").trim();
        setReviewsMessage(msgEl, "Đang gửi...", false);
        try {
          const res = await fetch(`${API_BASE}/api/customer/tours/${encodeURIComponent(reviewsTourId)}/reviews`, {
            method: "POST",
            headers: getAuthHeaders(true),
            body: JSON.stringify({ rating, comment }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.message || "Gửi thất bại");
          setReviewsMessage(msgEl, data.message || "Đã gửi.", true);
          await loadAndRenderReviews(reviewsTourId);
        } catch (err) {
          setReviewsMessage(msgEl, err.message || "Lỗi", false);
        }
      });
    }

    if (delBtn && !delBtn.dataset.bound) {
      delBtn.dataset.bound = "1";
      delBtn.addEventListener("click", async () => {
        if (!reviewsTourId) return;
        const user = getCurrentUser();
        if (!user || String(user.role || "").toLowerCase() !== "customer") return;
        const token = localStorage.getItem("accessToken");
        if (!token) return;
        const resList = await fetch(`${API_BASE}/api/provider/public/tours/${encodeURIComponent(reviewsTourId)}/reviews`, {
          headers: getAuthHeaders(false),
        });
        const payload = await resList.json().catch(() => ({}));
        const myId = payload.data?.viewer?.myReview?.id;
        if (!myId) {
          alert("Không tìm thấy đánh giá chờ duyệt.");
          return;
        }
        if (!confirm("Xóa đánh giá đang chờ duyệt?")) return;
        try {
          const res = await fetch(`${API_BASE}/api/customer/reviews/${encodeURIComponent(myId)}`, {
            method: "DELETE",
            headers: getAuthHeaders(false),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.message || "Xóa thất bại");
          await loadAndRenderReviews(reviewsTourId);
        } catch (err) {
          alert(err.message || "Lỗi");
        }
      });
    }
  }

  function updateBookingSummary() {
    if (!adultSelect || !childSelect || !lineLabel || !lineTotal || !grandTotal) return;

    const adults = Number(adultSelect.value) || 0;
    const children = Number(childSelect.value) || 0;
    const totalGuests = Math.max(adults + children, 1);
    const totalPrice = TOUR_PRICE * totalGuests;

    lineLabel.textContent = `${formatCurrency(TOUR_PRICE)} x ${totalGuests} khách`;
    lineTotal.textContent = formatCurrency(totalPrice);
    grandTotal.textContent = formatCurrency(totalPrice);
  }

  function toDateInputValue(value) {
    if (!value) return "";
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().slice(0, 10);
    }

    const text = String(value).trim();
    if (!text) return "";

    const isoMatch = text.match(/^(\d{4}-\d{2}-\d{2})/);
    if (isoMatch) return isoMatch[1];

    const parsed = new Date(text);
    if (Number.isNaN(parsed.getTime())) return "";
    return parsed.toISOString().slice(0, 10);
  }

  function getAvailableSchedules(schedules = []) {
    if (!Array.isArray(schedules)) return [];

    return schedules
      .map((item) => {
        const departureDate = toDateInputValue(item?.departure_date);
        const availableSlots = Number(item?.available_slots);
        const bookedSlots = Number(item?.booked_slots);
        const remainingSlots =
          Number.isFinite(availableSlots) && Number.isFinite(bookedSlots)
            ? availableSlots - bookedSlots
            : null;
        const status = String(item?.status || "").toLowerCase();
        const isClosed = ["cancelled", "closed", "full", "inactive"].includes(status);

        return {
          departureDate,
          remainingSlots,
          isClosed,
        };
      })
      .filter((item) => {
        if (!item.departureDate || item.isClosed) return false;
        if (item.remainingSlots == null) return true;
        return item.remainingSlots > 0;
      })
      .sort((a, b) => a.departureDate.localeCompare(b.departureDate));
  }

  function setupDepartureDate(tour) {
    const endDate = toDateInputValue(tour?.end_date);
    if (endDateInput) {
      endDateInput.value = endDate || "";
    }
    if (!dateInput) return;

    const startDate = toDateInputValue(tour?.start_date);
    const schedules = getAvailableSchedules(tour?.schedules);
    const nextAvailable = schedules.find((item) => {
      if (!item.departureDate) return false;
      if (startDate && item.departureDate < startDate) return false;
      if (endDate && item.departureDate > endDate) return false;
      return true;
    });

    dateInput.min = startDate || "";
    if (endDate) dateInput.max = endDate;
    dateInput.value = nextAvailable?.departureDate || startDate || "";
  }

  async function init() {
    try {
      const tourId = getTourIdFromURL();

      if (!tourId) {
        throw new Error("Không tìm thấy id tour trên URL");
      }

      const tour = await fetchTourDetail(tourId);
      console.log("TOUR DATA:", tour);

      renderTourDetail(tour);
      setupDepartureDate(tour);
      bindReviewActionsOnce();
      await loadAndRenderReviews(tourId);
    } catch (error) {
      console.error("Lỗi tải chi tiết tour:", error);
    }
  }

  if (adultSelect) {
    adultSelect.addEventListener("change", updateBookingSummary);
  }

  if (childSelect) {
    childSelect.addEventListener("change", updateBookingSummary);
  }

 if (bookingForm) {
  bookingForm.addEventListener("submit", function (event) {
    event.preventDefault();

    if (!currentTour) {
      alert("Chưa có dữ liệu tour");
      return;
    }

    updateBookingSummary();

    // Truyền dữ liệu qua URL để bước tiếp theo có thể gọi API summary
    const tourId = getTourIdFromURL();
    if (!tourId) {
      alert("Không tìm thấy id tour để đặt.");
      return;
    }

    const departureDate = dateInput ? dateInput.value : "";
    const adults = adultSelect ? adultSelect.value : "0";
    const children = childSelect ? childSelect.value : "0";

    if (!departureDate) {
      alert("Vui lòng chọn ngày khởi hành.");
      return;
    }

    const qs = new URLSearchParams({
      tour_id: tourId,
      departure_date: departureDate,
      adults: adults,
      children: children,
    });
    const nextBookingUrl = `./ttkhachhang.html?${qs.toString()}`;

    if (!getCurrentUser()) {
      const loginParams = new URLSearchParams({
        return_to: nextBookingUrl,
      });
      window.location.href = `/login?${loginParams.toString()}`;
      return;
    }

    window.location.href = nextBookingUrl;
  });
}

  document.addEventListener("DOMContentLoaded", init);
})();