document.addEventListener("DOMContentLoaded", () => {
  const params = new URLSearchParams(window.location.search);
  const tourId = params.get("id");
  const isEditMode = !!tourId;

  const categoryOptions = [
    { id: 1, name: "Rừng nhiệt đới" },
    { id: 2, name: "Biển đảo" },
    { id: 3, name: "Núi cao – Trekking" },
    { id: 4, name: "Làng nghề truyền thống" },
    { id: 5, name: "Nông nghiệp sinh thái" },
    { id: 6, name: "Du lịch cộng đồng" }
  ];

  const includedServices = [
    "Xe đưa đón",
    "Khách sạn",
    "Ăn sáng",
    "Ăn trưa",
    "Vé tham quan",
    "Hướng dẫn viên",
    "Bảo hiểm du lịch",
    "Nước uống"
  ];

  const excludedServices = [
    "Chi phí cá nhân",
    "Thuế VAT",
    "Vé máy bay",
    "Tiền tip",
    "Phí phát sinh",
    "Đồ uống ngoài chương trình"
  ];

  const categorySelect = document.getElementById("categorySelect");
  const includedServicesList = document.getElementById("includedServicesList");
  const excludedServicesList = document.getElementById("excludedServicesList");
  const highlightList = document.getElementById("highlightList");
  const itineraryList = document.getElementById("itineraryList");

  const addHighlightBtn = document.getElementById("addHighlightBtn");
  const addDayBtn = document.getElementById("addDayBtn");

  const coverUploadBox = document.getElementById("coverUploadBox");
  const coverImageInput = document.getElementById("coverImageInput");
  const coverPreview = document.getElementById("coverPreview");

  const galleryAddBtn = document.getElementById("galleryAddBtn");
  const galleryGrid = document.getElementById("galleryGrid");
  const galleryImageInput = document.getElementById("galleryImageInput");

  const publishTourBtn = document.getElementById("publishTourBtn");
  const saveDraftBtn = document.getElementById("saveDraftBtn");
  const cancelCreateTourBtn = document.getElementById("cancelCreateTourBtn");

  const requiredBasicInfo = document.getElementById("requiredBasicInfo");
  const requiredCoverImage = document.getElementById("requiredCoverImage");
  const requiredDescription = document.getElementById("requiredDescription");
  const requiredItinerary = document.getElementById("requiredItinerary");

  const basePriceInput = document.getElementById("tourBasePrice");
  const salePriceInput = document.getElementById("tourSalePrice");
  const discountPercentInput = document.getElementById("discountPercent");
  const taxPercentInput = document.getElementById("tourTaxPercent");
  const taxInput = document.getElementById("tourTax");
  const finalPriceInput = document.getElementById("tourFinalPrice");

  const meetingPointInput = document.getElementById("meetingPoint");

  const pageTitle = document.getElementById("pageTitle");
  const pageDesc = document.getElementById("pageDesc");

  const showCancelPolicyBtn = document.getElementById("showCancelPolicyBtn");
  const showTermsBtn = document.getElementById("showTermsBtn");

  const importExcelBtn = document.getElementById("importExcelBtn");
  const excelFileInput = document.getElementById("excelFileInput");

  let selectedCoverImage = null;
  let selectedGalleryImages = [];

  let map = null;
  let marker = null;
  let selectedLatitude = null;
  let selectedLongitude = null;

  let excelImportedData = null;

  init();

  async function init() {
    renderCategories();
    renderServiceCheckboxes();
    bindEvents();
    initLeafletMap();

    if (isEditMode) {
      updatePageMode();
      await loadTourDetail(tourId);
    } else {
      addHighlightRow();
      addItineraryDay();
    }

    renderGalleryPreview();
    calculateTaxAndFinalPrice();
    updateFormProgress();
  }

  function updatePageMode() {
    if (pageTitle) pageTitle.textContent = "Chỉnh sửa tour";
    if (pageDesc) pageDesc.textContent = "Cập nhật thông tin tour đã tạo";

    if (publishTourBtn) {
      publishTourBtn.textContent = "Cập nhật và xuất bản";
    }

    if (saveDraftBtn) {
      saveDraftBtn.textContent = "Lưu cập nhật";
    }
  }

  function bindEvents() {
    addHighlightBtn?.addEventListener("click", () => addHighlightRow());
    addDayBtn?.addEventListener("click", addItineraryDay);

    coverUploadBox?.addEventListener("click", () => {
      coverImageInput?.click();
    });

    coverImageInput?.addEventListener("change", handleCoverImageChange);

    galleryAddBtn?.addEventListener("click", () => {
      galleryImageInput?.click();
    });

    galleryImageInput?.addEventListener("change", handleGalleryImagesChange);

    publishTourBtn?.addEventListener("click", async () => {
      await submitTour("active");
    });

    saveDraftBtn?.addEventListener("click", async () => {
      await submitTour("draft");
    });

    cancelCreateTourBtn?.addEventListener("click", () => {
      const isConfirmed = confirm("Bạn có chắc muốn hủy?");
      if (!isConfirmed) return;
      window.location.href = "./tour_management.html";
    });

    basePriceInput?.addEventListener("input", () => {
      calculateSalePriceFromDiscount();
      calculateTaxAndFinalPrice();
    });

    discountPercentInput?.addEventListener("input", () => {
      calculateSalePriceFromDiscount();
      calculateTaxAndFinalPrice();
    });

    salePriceInput?.addEventListener("input", () => {
      syncDiscountFromSalePrice();
      calculateTaxAndFinalPrice();
    });

    document.addEventListener("input", updateFormProgress);
    document.addEventListener("change", updateFormProgress);

    meetingPointInput?.addEventListener(
      "input",
      debounce(function () {
        searchAddress(this.value);
      }, 500)
    );
    taxPercentInput?.addEventListener("input", () => {
      calculateTaxAndFinalPrice();
    });

    importExcelBtn?.addEventListener("click", () => {
      excelFileInput?.click();
    });

    excelFileInput?.addEventListener("change", handleExcelFileChange);

    showCancelPolicyBtn?.addEventListener("click", () => {
      const cancelPolicyInput = document.getElementById("cancelPolicy");
      if (!cancelPolicyInput) return;

      if (cancelPolicyInput.value.trim() !== "") {
        cancelPolicyInput.value = "";
      } else {
        cancelPolicyInput.value = `- Hủy trước 7 ngày: hoàn 100% giá tour
- Hủy trước 3 - 6 ngày: hoàn 50% giá tour
- Hủy trước 1 - 2 ngày: hoàn 30% giá tour
- Hủy trong ngày khởi hành: không hoàn phí`;
      }

      updateFormProgress();
    });

    showTermsBtn?.addEventListener("click", () => {
      const termsConditionsInput = document.getElementById("termsConditions");
      if (!termsConditionsInput) return;

      if (termsConditionsInput.value.trim() !== "") {
        termsConditionsInput.value = "";
      } else {
        termsConditionsInput.value = `- Quý khách cần cung cấp thông tin cá nhân chính xác khi đăng ký tour
- Công ty không chịu trách nhiệm nếu khách đến trễ giờ khởi hành
- Lịch trình có thể thay đổi tùy theo điều kiện thời tiết hoặc tình hình thực tế
- Quý khách tự bảo quản tư trang cá nhân trong suốt chuyến đi`;
      }

      updateFormProgress();
    });
  }

  function renderCategories() {
    if (!categorySelect) return;

    categorySelect.innerHTML = `
      <option value="">-- Chọn danh mục --</option>
      ${categoryOptions
        .map(category => `<option value="${category.id}">${category.name}</option>`)
        .join("")}
    `;
  }

  function renderServiceCheckboxes() {
    if (includedServicesList) {
      includedServicesList.innerHTML = includedServices
        .map(
          (service, index) => `
            <label class="checkbox-item">
              <input type="checkbox" name="includedServices" value="${service}" id="includedService${index}" />
              <span>${service}</span>
            </label>
          `
        )
        .join("");
    }

    if (excludedServicesList) {
      excludedServicesList.innerHTML = excludedServices
        .map(
          (service, index) => `
            <label class="checkbox-item">
              <input type="checkbox" name="excludedServices" value="${service}" id="excludedService${index}" />
              <span>${service}</span>
            </label>
          `
        )
        .join("");
    }
  }

  async function loadTourDetail(id) {
    try {
      const response = await fetch(`/api/provider/tours/${id}`);
      const result = await response.json();

      if (!response.ok) {
        alert(result.message || "Không tải được dữ liệu tour.");
        return;
      }

      const tour = result.data;

      setValue("tourTitle", tour.title);
      setValue("tourCode", tour.code);
      setValue("categorySelect", tour.category_id);
      setValue("tourLocation", tour.location);
      setValue("tourDurationText", tour.duration_text);
      setValue("tourStartDate", formatDateForInput(tour.start_date));
      setValue("tourEndDate", formatDateForInput(tour.end_date));
      setValue("tourMaxCapacity", tour.max_capacity);
      setValue("tourBasePrice", tour.base_price);
      setValue("tourSalePrice", tour.sale_price);
      setValue(
        "tourTaxPercent",
        tour.tax_percent != null && String(tour.tax_percent).trim() !== ""
          ? tour.tax_percent
          : 10
      );
      setValue("tourTax", tour.tax || 0);
      setValue("tourFinalPrice", tour.final_price || 0);
      setValue("tourShortDescription", tour.short_description || tour.description);
      setValue("meetingPoint", tour.meeting_point);
      setValue("hotelInfo", tour.hotel_info);
      setValue("transportInfo", tour.transport_info);
      setValue("cancelPolicy", tour.cancel_policy);
      setValue("termsConditions", tour.terms_conditions);
      setValue("otherNotes", tour.other_notes);

      syncDiscountFromSalePrice();
      calculateTaxAndFinalPrice();

      if (highlightList) {
        highlightList.innerHTML = "";
        if (Array.isArray(tour.highlights) && tour.highlights.length > 0) {
          tour.highlights.forEach(item => addHighlightRow(item));
        } else {
          addHighlightRow();
        }
      }

      if (itineraryList) {
        itineraryList.innerHTML = "";
        if (Array.isArray(tour.itinerary) && tour.itinerary.length > 0) {
          tour.itinerary.forEach(day => addItineraryDay(day));
        } else {
          addItineraryDay();
        }
      }

      if (Array.isArray(tour.includes)) {
        document
          .querySelectorAll('input[name="includedServices"]')
          .forEach(input => {
            input.checked = tour.includes.includes(input.value);
          });
      }

      if (Array.isArray(tour.excludes)) {
        document
          .querySelectorAll('input[name="excludedServices"]')
          .forEach(input => {
            input.checked = tour.excludes.includes(input.value);
          });
      }

      if (tour.thumbnail_url && coverPreview) {
        selectedCoverImage = {
          name: getFileNameFromUrl(tour.thumbnail_url),
          existing: true,
          url: tour.thumbnail_url
        };

        coverPreview.innerHTML = `
          <div class="image-preview-item">
            <img src="${tour.thumbnail_url}" alt="Ảnh bìa tour" style="max-width: 100%; border-radius: 12px;" />
            <p style="margin-top: 8px;">${getFileNameFromUrl(tour.thumbnail_url)}</p>
          </div>
        `;
      }

      if (Array.isArray(tour.gallery_images)) {
        selectedGalleryImages = tour.gallery_images.map(url => ({
          name: getFileNameFromUrl(url),
          existing: true,
          url
        }));
        renderGalleryPreview();
      }

      if (tour.latitude != null && tour.longitude != null) {
        selectedLatitude = Number(tour.latitude);
        selectedLongitude = Number(tour.longitude);

        if (map && marker) {
          map.setView([selectedLatitude, selectedLongitude], 15);
          marker
            .setLatLng([selectedLatitude, selectedLongitude])
            .bindPopup(tour.meeting_point || "Điểm gặp")
            .openPopup();
        }
      }

      updateFormProgress();
    } catch (error) {
      console.error("Lỗi loadTourDetail:", error);
      alert("Có lỗi xảy ra khi tải thông tin tour.");
    }
  }

  function addHighlightRow(value = "") {
    if (!highlightList) return;

    const row = document.createElement("div");
    row.className = "dynamic-row";
    row.innerHTML = `
      <input type="text" class="highlight-input" placeholder="Ví dụ: Khám phá vịnh bằng du thuyền" value="${escapeHtml(value)}" />
      <button type="button" class="remove-row-btn">Xóa</button>
    `;

    row.querySelector(".remove-row-btn")?.addEventListener("click", () => {
      row.remove();
      updateFormProgress();
    });

    highlightList.appendChild(row);
    updateFormProgress();
  }

  function addItineraryDay(dayData = null) {
    if (!itineraryList) return;

    const currentDay = itineraryList.children.length + 1;

    const block = document.createElement("div");
    block.className = "itinerary-day-card";
    block.innerHTML = `
      <div class="itinerary-day-header">
        <h4>Ngày ${currentDay}</h4>
        <button type="button" class="remove-day-btn">Xóa ngày</button>
      </div>

      <div class="form-group">
        <label>Tiêu đề ngày</label>
        <input
          type="text"
          class="itinerary-title"
          placeholder="Ví dụ: Khởi hành đến Hạ Long"
          value="${escapeHtml(dayData?.title || "")}"
        />
      </div>

      <div class="form-group">
        <label>Nội dung chi tiết</label>
        <textarea
          rows="4"
          class="itinerary-description"
          placeholder="Nhập hoạt động trong ngày..."
        >${escapeHtml(dayData?.description || "")}</textarea>
      </div>
    `;

    block.querySelector(".remove-day-btn")?.addEventListener("click", () => {
      if (itineraryList.children.length === 1) {
        alert("Lịch trình phải có ít nhất 1 ngày.");
        return;
      }
      block.remove();
      reindexItineraryDays();
      updateFormProgress();
    });

    itineraryList.appendChild(block);
    updateFormProgress();
  }

  function reindexItineraryDays() {
    const dayCards = itineraryList?.querySelectorAll(".itinerary-day-card") || [];
    dayCards.forEach((card, index) => {
      const title = card.querySelector(".itinerary-day-header h4");
      if (title) title.textContent = `Ngày ${index + 1}`;
    });
  }

  function handleCoverImageChange(event) {
    const file = event.target.files?.[0];
    if (!file || !coverPreview) return;

    selectedCoverImage = file;

    const fileReader = new FileReader();
    fileReader.onload = e => {
      coverPreview.innerHTML = `
        <div class="image-preview-item">
          <img src="${e.target?.result}" alt="Ảnh bìa tour" style="max-width: 100%; border-radius: 12px;" />
          <p style="margin-top: 8px;">${file.name}</p>
        </div>
      `;
      updateFormProgress();
    };
    fileReader.readAsDataURL(file);
  }

  function handleGalleryImagesChange(event) {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const totalAfterAdd = selectedGalleryImages.length + files.length;
    if (totalAfterAdd > 10) {
      alert("Chỉ được chọn tối đa 10 ảnh thư viện.");
      return;
    }

    selectedGalleryImages = [...selectedGalleryImages, ...files];
    renderGalleryPreview();
    updateFormProgress();
    event.target.value = "";
  }

  function renderGalleryPreview() {
    if (!galleryGrid || !galleryAddBtn) return;

    const oldItems = galleryGrid.querySelectorAll(".gallery-preview-item");
    oldItems.forEach(item => item.remove());

    selectedGalleryImages.forEach((file, index) => {
      if (file?.existing && file?.url) {
        const item = document.createElement("div");
        item.className = "gallery-preview-item";
        item.innerHTML = `
          <img src="${file.url}" alt="Gallery Image" style="width: 100%; height: 100px; object-fit: cover; border-radius: 10px;" />
          <button type="button" class="remove-gallery-btn" data-index="${index}">×</button>
        `;

        galleryGrid.insertBefore(item, galleryAddBtn);

        item.querySelector(".remove-gallery-btn")?.addEventListener("click", () => {
          selectedGalleryImages.splice(index, 1);
          renderGalleryPreview();
          updateFormProgress();
        });
        return;
      }

      const fileReader = new FileReader();
      fileReader.onload = e => {
        const item = document.createElement("div");
        item.className = "gallery-preview-item";
        item.innerHTML = `
          <img src="${e.target?.result}" alt="Gallery Image" style="width: 100%; height: 100px; object-fit: cover; border-radius: 10px;" />
          <button type="button" class="remove-gallery-btn" data-index="${index}">×</button>
        `;

        galleryGrid.insertBefore(item, galleryAddBtn);

        item.querySelector(".remove-gallery-btn")?.addEventListener("click", () => {
          selectedGalleryImages.splice(index, 1);
          renderGalleryPreview();
          updateFormProgress();
        });
      };
      fileReader.readAsDataURL(file);
    });
  }

  function getAppliedPrice() {
    const basePrice = Number(basePriceInput?.value || 0);
    const salePrice = Number(salePriceInput?.value || 0);

    if (salePrice > 0 && salePrice < basePrice) {
      return salePrice;
    }

    return basePrice;
  }

  function calculateSalePriceFromDiscount() {
    if (!discountPercentInput || !salePriceInput) return;

    const basePrice = Number(basePriceInput?.value || 0);
    const discountPercent = Number(discountPercentInput?.value || 0);

    if (!basePrice || basePrice <= 0) {
      salePriceInput.value = "";
      calculateTaxAndFinalPrice();
      return;
    }

    if (!discountPercentInput.value.trim()) {
      calculateTaxAndFinalPrice();
      return;
    }

    const normalizedPercent = Math.min(Math.max(discountPercent, 0), 100);
    discountPercentInput.value = normalizedPercent;

    const salePrice = Math.round(basePrice * (1 - normalizedPercent / 100));
    salePriceInput.value = salePrice >= 0 ? salePrice : 0;

    calculateTaxAndFinalPrice();
  }

  function syncDiscountFromSalePrice() {
    if (!discountPercentInput || !salePriceInput) return;

    const basePrice = Number(basePriceInput?.value || 0);
    const salePrice = Number(salePriceInput?.value || 0);

    if (!basePrice || basePrice <= 0 || !salePriceInput.value.trim()) {
      discountPercentInput.value = "";
      calculateTaxAndFinalPrice();
      return;
    }

    if (salePrice > basePrice) {
      calculateTaxAndFinalPrice();
      return;
    }

    const discountPercent = ((basePrice - salePrice) / basePrice) * 100;
    discountPercentInput.value = Number(discountPercent.toFixed(2));

    calculateTaxAndFinalPrice();
  }

  function calculateTaxAndFinalPrice() {
    if (!taxInput || !finalPriceInput) return;

    const appliedPrice = getAppliedPrice();
    const rawPct = taxPercentInput?.value;
    const taxPercent =
      rawPct === "" || rawPct == null ? 10 : Number(rawPct);

    if (!appliedPrice || appliedPrice <= 0) {
      taxInput.value = 0;
      finalPriceInput.value = 0;
      return;
    }

    const tax = Math.round(appliedPrice * (taxPercent / 100));
    const finalPrice = appliedPrice + tax;

    taxInput.value = tax;
    finalPriceInput.value = finalPrice;
  }

  function getInputValue(id) {
    const element = document.getElementById(id);
    return element ? element.value.trim() : "";
  }

  function setValue(id, value) {
    const element = document.getElementById(id);
    if (element) element.value = value ?? "";
  }

  function getCheckedValues(name) {
    return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(
      input => input.value
    );
  }

  function getHighlights() {
    return Array.from(document.querySelectorAll(".highlight-input"))
      .map(input => input.value.trim())
      .filter(Boolean);
  }

  function getItineraryItems() {
    return Array.from(document.querySelectorAll(".itinerary-day-card"))
      .map((card, index) => {
        const title = card.querySelector(".itinerary-title")?.value.trim() || "";
        const description = card.querySelector(".itinerary-description")?.value.trim() || "";

        return {
          day: index + 1,
          title,
          description
        };
      })
      .filter(item => item.title || item.description);
  }

  function parseDurationDays(durationText) {
    const matched = durationText.match(/(\d+)/);
    if (!matched) return 1;
    return Number(matched[1]) || 1;
  }

  function createSlug(title) {
    return title
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/[^a-z0-9\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  }

  function getFileNameFromUrl(url) {
    if (!url) return "";
    return url.split("/").pop().split("?")[0];
  }

  function formatDateForInput(dateString) {
    if (!dateString) return "";
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().split("T")[0];
  }

  function collectFormData() {
    const title = getInputValue("tourTitle");
    const code = getInputValue("tourCode");
    const categoryId = getInputValue("categorySelect");
    const location = getInputValue("tourLocation");
    const durationText = getInputValue("tourDurationText");
    const startDate = getInputValue("tourStartDate");
    const endDate = getInputValue("tourEndDate");
    const maxCapacity = Number(getInputValue("tourMaxCapacity"));
    const basePrice = Number(getInputValue("tourBasePrice"));
    const salePrice = Number(getInputValue("tourSalePrice"));
    const taxPercentRaw = getInputValue("tourTaxPercent");
    const taxPercent =
      taxPercentRaw === "" ? 10 : Number(taxPercentRaw);
    const tax = Number(getInputValue("tourTax"));
    const finalPrice = Number(getInputValue("tourFinalPrice"));
    const shortDescription = getInputValue("tourShortDescription");
    const meetingPoint = getInputValue("meetingPoint");
    const hotelInfo = getInputValue("hotelInfo");
    const transportInfo = getInputValue("transportInfo");
    const cancelPolicy = getInputValue("cancelPolicy");
    const termsConditions = getInputValue("termsConditions");
    const otherNotes = getInputValue("otherNotes");

    const highlights = getHighlights();
    const included = getCheckedValues("includedServices");
    const excluded = getCheckedValues("excludedServices");
    const itineraryItems = getItineraryItems();

    return {
      title,
      code,
      category_id: categoryId ? Number(categoryId) : null,
      location,
      duration_text: durationText,
      duration_days: parseDurationDays(durationText),
      start_date: startDate || null,
      end_date: endDate || null,
      max_capacity: Number.isFinite(maxCapacity) ? maxCapacity : 0,
      base_price: Number.isFinite(basePrice) ? basePrice : 0,
      sale_price: Number.isFinite(salePrice) && salePrice > 0 ? salePrice : 0,
      tax_percent: Number.isFinite(taxPercent) ? Math.max(0, taxPercent) : 10,
      tax: Number.isFinite(tax) ? tax : 0,
      final_price: Number.isFinite(finalPrice) ? finalPrice : 0,
      short_description: shortDescription,
      description: shortDescription,
      meeting_point: meetingPoint,
      latitude: selectedLatitude,
      longitude: selectedLongitude,
      hotel_info: hotelInfo,
      transport_info: transportInfo,
      cancel_policy: cancelPolicy,
      terms_conditions: termsConditions,
      other_notes: otherNotes,
      highlights,
      includes: included,
      excludes: excluded,
      itinerary: itineraryItems,
      thumbnail_url: selectedCoverImage
        ? (selectedCoverImage.existing
            ? selectedCoverImage.url
            : `/uploads/${selectedCoverImage.name}`)
        : null,
      gallery_images: selectedGalleryImages.map(file =>
        file.existing ? file.url : `/uploads/${file.name}`
      ),
      slug: createSlug(title)
    };
  }

  function validateFormData(data, submitMode) {
    if (!data.title) {
      alert("Vui lòng nhập tên tour.");
      return false;
    }

    if (!data.code) {
      alert("Vui lòng nhập mã tour.");
      return false;
    }

    if (!data.category_id) {
      alert("Vui lòng chọn danh mục.");
      return false;
    }

    if (!data.location) {
      alert("Vui lòng nhập điểm đến.");
      return false;
    }

    if (!data.duration_text) {
      alert("Vui lòng nhập thời gian tour.");
      return false;
    }

    if (!data.max_capacity || data.max_capacity <= 0) {
      alert("Vui lòng nhập số người tối đa hợp lệ.");
      return false;
    }

    if (!data.base_price || data.base_price <= 0) {
      alert("Vui lòng nhập giá tour hợp lệ.");
      return false;
    }

    if (data.sale_price < 0) {
      alert("Giá khuyến mãi không được nhỏ hơn 0.");
      return false;
    }

    if (data.sale_price > 0 && data.sale_price >= data.base_price) {
      alert("Giá khuyến mãi phải nhỏ hơn giá tour.");
      return false;
    }

    if (data.tax < 0) {
      alert("Thuế không hợp lệ.");
      return false;
    }

    if (data.final_price < 0) {
      alert("Giá cuối cùng không hợp lệ.");
      return false;
    }

    if (!data.short_description) {
      alert("Vui lòng nhập mô tả ngắn.");
      return false;
    }

    if (submitMode === "active") {
      if (!selectedCoverImage) {
        alert("Vui lòng chọn ảnh bìa chính.");
        return false;
      }

      if (data.itinerary.length === 0) {
        alert("Vui lòng nhập ít nhất 1 ngày lịch trình.");
        return false;
      }
    }

    return true;
  }

  async function submitTour(status) {
  try {
    const formData = collectFormData();

    if (!validateFormData(formData, status)) {
      return;
    }

    const payload = {
      ...formData,
      status
    };

    console.log(isEditMode ? "Payload cập nhật tour:" : "Payload tạo tour:", payload);

    const url = isEditMode
      ? `/api/provider/tours/${tourId}`
      : "/api/provider/tours";

    const method = isEditMode ? "PUT" : "POST";

    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const text = await response.text();
    let result = {};

    try {
      result = text ? JSON.parse(text) : {};
    } catch {
      result = { message: text || "Response không phải JSON" };
    }

    if (!response.ok) {
      console.error("CREATE/UPDATE TOUR ERROR:", result);
      alert(result.error || result.message || "Lưu tour thất bại.");
      return;
    }

    alert(
      isEditMode
        ? (status === "draft" ? "Lưu cập nhật nháp thành công!" : "Cập nhật tour thành công!")
        : (status === "draft" ? "Lưu nháp thành công!" : "Xuất bản tour thành công!")
    );

    const savedTourId =
  result?.data?.id ||
  result?.tourId ||
  result?.id ||
  tourId;

if (status === "active" && savedTourId) {
  window.location.href = `./guide_assignment.html?tourId=${savedTourId}`;
} else {
  window.location.href = "./tour_management.html";
}
  } catch (error) {
    console.error("Lỗi submit tour:", error);
    alert(isEditMode ? "Có lỗi xảy ra khi cập nhật tour." : "Có lỗi xảy ra khi tạo tour.");
  }
}

  function updateRequiredStatus(element, isDone) {
    if (!element) return;
    if (isDone) element.classList.add("done");
    else element.classList.remove("done");
  }

  function updateFormProgress() {
    const data = collectFormData();

    const basicInfoDone =
      !!data.title &&
      !!data.code &&
      !!data.category_id &&
      !!data.location &&
      !!data.duration_text &&
      data.max_capacity > 0 &&
      data.base_price > 0;

    const coverDone = !!selectedCoverImage;
    const descriptionDone = !!data.short_description;
    const itineraryDone = data.itinerary.length > 0;

    updateRequiredStatus(requiredBasicInfo, basicInfoDone);
    updateRequiredStatus(requiredCoverImage, coverDone);
    updateRequiredStatus(requiredDescription, descriptionDone);
    updateRequiredStatus(requiredItinerary, itineraryDone);
  }

  function initLeafletMap() {
    const mapElement = document.getElementById("map");
    if (!mapElement || typeof L === "undefined") return;

    const defaultLat = 21.0285;
    const defaultLng = 105.8542;

    map = L.map("map").setView([defaultLat, defaultLng], 13);

    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: "&copy; OpenStreetMap"
    }).addTo(map);

    marker = L.marker([defaultLat, defaultLng])
      .addTo(map)
      .bindPopup("Chọn địa điểm")
      .openPopup();

    selectedLatitude = defaultLat;
    selectedLongitude = defaultLng;

    map.on("click", async function (e) {
      const { lat, lng } = e.latlng;

      selectedLatitude = Number(lat.toFixed(7));
      selectedLongitude = Number(lng.toFixed(7));

      marker
        .setLatLng([lat, lng])
        .bindPopup(`Lat: ${lat.toFixed(5)}, Lng: ${lng.toFixed(5)}`)
        .openPopup();

      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
        );
        const data = await response.json();

        if (meetingPointInput && data?.display_name) {
          meetingPointInput.value = data.display_name;
          updateFormProgress();
        }
      } catch (error) {
        console.error("Lỗi reverse geocoding:", error);
      }
    });
  }

  async function searchAddress(address) {
    if (!map || !marker || !address || address.length < 3) return;

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`
      );

      const data = await response.json();

      if (!Array.isArray(data) || data.length === 0) {
        return;
      }

      const { lat, lon, display_name } = data[0];

      selectedLatitude = Number(lat);
      selectedLongitude = Number(lon);

      map.setView([selectedLatitude, selectedLongitude], 15);

      marker
        .setLatLng([selectedLatitude, selectedLongitude])
        .bindPopup(display_name)
        .openPopup();
    } catch (error) {
      console.error("Lỗi tìm địa chỉ:", error);
    }
  }

  function debounce(fn, delay = 300) {
    let timeout = null;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function escapeHtml(text) {
    return String(text)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function normalizeExcelHeader(value) {
    return String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/\s+/g, " ");
  }

  function pickRowValue(row, keys) {
    if (!row) return "";
    const normalizedMap = new Map();
    Object.keys(row).forEach(k => {
      normalizedMap.set(normalizeExcelHeader(k), row[k]);
    });
    for (const k of keys) {
      const v = normalizedMap.get(normalizeExcelHeader(k));
      if (v != null && String(v).trim() !== "") return v;
    }
    return "";
  }

  function toNumberOrEmpty(value) {
    const n = Number(String(value ?? "").replaceAll(",", "").trim());
    return Number.isFinite(n) ? n : "";
  }

  function splitList(value) {
    if (value == null) return [];
    return String(value)
      .split(/[,;|]/)
      .map(s => s.trim())
      .filter(Boolean);
  }

  function applyExcelToForm(parsed) {
    if (!parsed) return;

    const { mainRow, itineraryRows = [], highlightRows = [], includes = [], excludes = [] } = parsed;

    if (mainRow) {
      const title = pickRowValue(mainRow, ["title", "ten tour", "ten", "tour name"]);
      const code = pickRowValue(mainRow, ["code", "ma tour", "tour code"]);
      const location = pickRowValue(mainRow, ["location", "diem den", "dia diem", "noi den"]);
      const durationText = pickRowValue(mainRow, ["duration_text", "thoi gian", "thoi gian tour", "duration"]);
      const startDate = pickRowValue(mainRow, ["start_date", "ngay khoi hanh", "start date"]);
      const endDate = pickRowValue(mainRow, ["end_date", "ngay ket thuc", "end date"]);
      const maxCapacity = toNumberOrEmpty(pickRowValue(mainRow, ["max_capacity", "so nguoi", "so cho", "capacity"]));
      const basePrice = toNumberOrEmpty(pickRowValue(mainRow, ["base_price", "gia goc", "gia tour", "base price"]));
      const salePrice = toNumberOrEmpty(pickRowValue(mainRow, ["sale_price", "gia khuyen mai", "sale price"]));
      const taxPercent = toNumberOrEmpty(pickRowValue(mainRow, ["tax_percent", "vat", "thue", "vat percent"]));
      const shortDescription = pickRowValue(mainRow, ["short_description", "mo ta ngan", "mo ta", "description"]);
      const meetingPoint = pickRowValue(mainRow, ["meeting_point", "diem gap", "meeting point"]);
      const hotelInfo = pickRowValue(mainRow, ["hotel_info", "khach san", "hotel"]);
      const transportInfo = pickRowValue(mainRow, ["transport_info", "phuong tien", "transport"]);
      const cancelPolicy = pickRowValue(mainRow, ["cancel_policy", "chinh sach huy", "cancel policy"]);
      const termsConditions = pickRowValue(mainRow, ["terms_conditions", "dieu khoan", "terms"]);
      const otherNotes = pickRowValue(mainRow, ["other_notes", "ghi chu", "note"]);

      if (title) setValue("tourTitle", title);
      if (code) setValue("tourCode", code);
      if (location) setValue("tourLocation", location);
      if (durationText) setValue("tourDurationText", durationText);
      if (startDate) setValue("tourStartDate", formatDateForInput(startDate));
      if (endDate) setValue("tourEndDate", formatDateForInput(endDate));
      if (maxCapacity !== "") setValue("tourMaxCapacity", maxCapacity);
      if (basePrice !== "") setValue("tourBasePrice", basePrice);
      if (salePrice !== "") setValue("tourSalePrice", salePrice);
      if (taxPercent !== "") setValue("tourTaxPercent", taxPercent);
      if (shortDescription) setValue("tourShortDescription", shortDescription);
      if (meetingPoint) setValue("meetingPoint", meetingPoint);
      if (hotelInfo) setValue("hotelInfo", hotelInfo);
      if (transportInfo) setValue("transportInfo", transportInfo);
      if (cancelPolicy) setValue("cancelPolicy", cancelPolicy);
      if (termsConditions) setValue("termsConditions", termsConditions);
      if (otherNotes) setValue("otherNotes", otherNotes);

      const categoryRaw = pickRowValue(mainRow, ["category_id", "danh muc id", "category", "danh muc"]);
      if (categoryRaw) {
        const categoryId = Number(categoryRaw);
        if (Number.isFinite(categoryId)) {
          setValue("categorySelect", categoryId);
        } else {
          const normalized = normalizeExcelHeader(categoryRaw);
          const found = categoryOptions.find(c => normalizeExcelHeader(c.name) === normalized);
          if (found) setValue("categorySelect", found.id);
        }
      }
    }

    const highlightFromMain = mainRow
      ? splitList(pickRowValue(mainRow, ["highlights", "diem noi bat", "highlight"]))
      : [];

    const highlightValues = [
      ...highlightFromMain,
      ...highlightRows
        .map(r => String(pickRowValue(r, ["highlight", "diem noi bat", "noi bat", "value"]) || ""))
        .map(s => s.trim())
        .filter(Boolean)
    ];

    if (highlightList && highlightValues.length > 0) {
      highlightList.innerHTML = "";
      highlightValues.forEach(v => addHighlightRow(v));
    }

    if (itineraryList && itineraryRows.length > 0) {
      itineraryList.innerHTML = "";
      itineraryRows
        .map(r => {
          const day = toNumberOrEmpty(pickRowValue(r, ["day", "ngay", "so ngay"]));
          const title = pickRowValue(r, ["title", "tieu de", "ten ngay"]);
          const description = pickRowValue(r, ["description", "noi dung", "chi tiet"]);
          return {
            day: day === "" ? null : Number(day),
            title: String(title || "").trim(),
            description: String(description || "").trim()
          };
        })
        .filter(d => d.title || d.description)
        .forEach(d => addItineraryDay(d));
      reindexItineraryDays();
    }

    const includesFromMain = mainRow ? splitList(pickRowValue(mainRow, ["includes", "dich vu bao gom", "included"])) : [];
    const excludesFromMain = mainRow ? splitList(pickRowValue(mainRow, ["excludes", "dich vu khong bao gom", "excluded"])) : [];
    const includesAll = [...includesFromMain, ...includes].map(s => normalizeExcelHeader(s));
    const excludesAll = [...excludesFromMain, ...excludes].map(s => normalizeExcelHeader(s));

    if (includesAll.length > 0) {
      document.querySelectorAll('input[name="includedServices"]').forEach(input => {
        input.checked = includesAll.includes(normalizeExcelHeader(input.value));
      });
    }

    if (excludesAll.length > 0) {
      document.querySelectorAll('input[name="excludedServices"]').forEach(input => {
        input.checked = excludesAll.includes(normalizeExcelHeader(input.value));
      });
    }

    syncDiscountFromSalePrice();
    calculateTaxAndFinalPrice();
    updateFormProgress();
  }

  function parseExcelWorkbook(workbook) {
    const sheetNames = workbook.SheetNames || [];
    const warnings = [];
    const sheets = [];

    const parsedSheets = sheetNames.map(name => {
      const ws = workbook.Sheets[name];
      const rows = XLSX.utils.sheet_to_json(ws, { defval: "" });
      const headers = rows.length > 0 ? Object.keys(rows[0]) : [];
      const normalizedName = normalizeExcelHeader(name);
      return { name, normalizedName, rows, headers };
    });

    parsedSheets.forEach(s => sheets.push({ name: s.name, rows: s.rows, headers: s.headers }));

    const findSheet = candidates => {
      for (const c of candidates) {
        const norm = normalizeExcelHeader(c);
        const found = parsedSheets.find(s => s.normalizedName === norm);
        if (found) return found;
      }
      return null;
    };

    const mainSheet =
      findSheet(["tour", "thong tin tour", "thong tin", "main"]) ||
      parsedSheets[0] ||
      null;

    const itinerarySheet = findSheet(["itinerary", "lich trinh", "schedule"]);
    const highlightSheet = findSheet(["highlights", "diem noi bat", "highlight"]);
    const servicesSheet = findSheet(["services", "dich vu", "service"]);

    const mainRow = mainSheet?.rows?.[0] || null;

    let itineraryRows = [];
    if (itinerarySheet?.rows?.length) {
      itineraryRows = itinerarySheet.rows;
    } else if (mainSheet?.rows?.length) {
      const hasItineraryCols = mainSheet.headers.some(h =>
        ["day", "ngay", "tieu de", "title", "description", "noi dung"].includes(normalizeExcelHeader(h))
      );
      if (hasItineraryCols && mainSheet.rows.length > 1) itineraryRows = mainSheet.rows;
    }

    const highlightRows = highlightSheet?.rows || [];

    let includes = [];
    let excludes = [];
    if (servicesSheet?.rows?.length) {
      servicesSheet.rows.forEach(r => {
        const includeVal = pickRowValue(r, ["include", "included", "bao gom", "includedServices"]);
        const excludeVal = pickRowValue(r, ["exclude", "excluded", "khong bao gom", "excludedServices"]);
        includes.push(...splitList(includeVal));
        excludes.push(...splitList(excludeVal));
      });
    }

    if (!mainRow) warnings.push("Không tìm thấy dòng dữ liệu chính (main row) để đổ vào form.");
    if (!window.XLSX) warnings.push("Thiếu thư viện XLSX trên trang (SheetJS).");

    return {
      sheets,
      warnings,
      mainRow,
      itineraryRows,
      highlightRows,
      includes,
      excludes
    };
  }

  async function handleExcelFileChange(event) {
    try {
      const file = event.target.files?.[0];
      if (!file) return;

      if (typeof XLSX === "undefined") {
        alert("Chưa load được thư viện đọc Excel (XLSX).");
        return;
      }

      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });

      const parsed = parseExcelWorkbook(workbook);
      excelImportedData = parsed;

      applyExcelToForm(parsed);

      event.target.value = "";
    } catch (error) {
      console.error("Lỗi import Excel:", error);
      alert("Có lỗi xảy ra khi đọc file Excel. Vui lòng kiểm tra định dạng file.");
    }
  }
});