async function fetchTourDetailById(tourId) {
  const response = await fetch(
    `http://localhost:3000/api/provider/public/tours/${tourId}`,
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Không lấy được chi tiết tour.");
  }

  const result = await response.json();
  return result.data;
}
async function fetchBookingSummary(params) {
  const query = new URLSearchParams({
    tour_id: params.tourId || "",
    departure_date: params.departureDate || "",
    adults: String(params.adults || 0),
    children: String(params.children || 0),
  });

  const response = await fetch(
    `http://localhost:3000/api/bookings/summary?${query.toString()}`,
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Không lấy được tổng kết đặt tour.");
  }

  const result = await response.json();
  return result.data;
}
(function () {
  function getBookingStorageKey() {
    try {
      var rawUser = localStorage.getItem("traveltour_user");
      var user = rawUser ? JSON.parse(rawUser) : null;
      var userId = user && (user.id || user.email);
      return "traveltour-booking:" + (userId || "guest");
    } catch (error) {
      return "traveltour-booking:guest";
    }
  }

  var STORAGE_KEY = getBookingStorageKey();
  var bookingForm = document.getElementById("booking-form");
  var guestList = document.getElementById("guest-list");
  var guestTemplate = document.getElementById("guest-card-template");
  var addGuestButton = document.querySelector(".js-add-guest");
  var backTourButton = document.querySelector(".js-back-tour");
  var toastTimer = null;

  function formatCurrency(value) {
    return new Intl.NumberFormat("vi-VN").format(value) + " ₫";
  }

  function formatDate(dateStr) {
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN");
  }

  function getStoredData() {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
    } catch (error) {
      return {};
    }
  }

  function setStoredData(nextData) {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(nextData));
  }

  function persistTourBookingMeta(meta) {
    var storedData = getStoredData();
    storedData.bookingMeta = meta;
    setStoredData(storedData);
  }

  function showToast(message) {
    var toast = document.querySelector(".page-toast");

    if (!toast) {
      toast = document.createElement("div");
      toast.className = "page-toast";
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("is-visible");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toast.classList.remove("is-visible");
    }, 2200);
  }

  function createGuestCard() {
    if (!guestTemplate) {
      return null;
    }

    return guestTemplate.content.firstElementChild.cloneNode(true);
  }

  function updateGuestIndexes() {
    var guestCards = guestList.querySelectorAll(".guest-card");

    guestCards.forEach(function (card, index) {
      var cardIndex = index + 1;
      var heading = card.querySelector("h3");
      var guestNameInput =
        card.querySelector('input[name^="guest-name-"]') ||
        card.querySelector(".form-field input");
      var guestBirthdayInput =
        card.querySelector('input[name^="guest-birthday-"]') ||
        card.querySelector(".form-grid .form-field:first-child input");
      var genderSelect =
        card.querySelector('select[name^="guest-gender-"]') ||
        card.querySelector(".form-grid .form-field:last-child select");
      var guestPhoneInput =
        card.querySelector('input[name^="guest-phone-"]') ||
        card.querySelector('input[type="tel"]');
      var guestDocumentInput =
        card.querySelector('input[name^="guest-id-"]') ||
        card.querySelectorAll(".form-field input")[3];
      var removeButton = card.querySelector(".guest-card__remove");

      card.dataset.guestIndex = String(cardIndex);

      if (heading) {
        heading.textContent = "Khách #" + cardIndex;
      }

      if (guestNameInput) {
        guestNameInput.id = "guest-name-" + cardIndex;
        guestNameInput.name = "guest-name-" + cardIndex;
        var guestNameLabel =
          card.querySelector('label[for^="guest-name-"]') ||
          guestNameInput.closest(".form-field")?.querySelector("label");
        if (guestNameLabel) {
          guestNameLabel.setAttribute("for", guestNameInput.id);
        }
      }

      if (guestBirthdayInput) {
        guestBirthdayInput.id = "guest-birthday-" + cardIndex;
        guestBirthdayInput.name = "guest-birthday-" + cardIndex;
        var guestBirthdayLabel = card.querySelector(
          'label[for^="guest-birthday-"]',
        ) || guestBirthdayInput.closest(".form-field")?.querySelector("label");
        if (guestBirthdayLabel) {
          guestBirthdayLabel.setAttribute("for", guestBirthdayInput.id);
        }
      }

      if (genderSelect) {
        genderSelect.id = "guest-gender-" + cardIndex;
        genderSelect.name = "guest-gender-" + cardIndex;
        var guestGenderLabel =
          card.querySelector('label[for^="guest-gender-"]') ||
          genderSelect.closest(".form-field")?.querySelector("label");
        if (guestGenderLabel) {
          guestGenderLabel.setAttribute("for", genderSelect.id);
        }
      }

      if (guestPhoneInput) {
        guestPhoneInput.id = "guest-phone-" + cardIndex;
        guestPhoneInput.name = "guest-phone-" + cardIndex;
        var guestPhoneLabel =
          card.querySelector('label[for^="guest-phone-"]') ||
          guestPhoneInput.closest(".form-field")?.querySelector("label");
        if (guestPhoneLabel) {
          guestPhoneLabel.setAttribute("for", guestPhoneInput.id);
        }
      }

      if (guestDocumentInput) {
        guestDocumentInput.id = "guest-id-" + cardIndex;
        guestDocumentInput.name = "guest-id-" + cardIndex;
        var guestDocumentLabel =
          card.querySelector('label[for^="guest-id-"]') ||
          guestDocumentInput.closest(".form-field")?.querySelector("label");
        if (guestDocumentLabel) {
          guestDocumentLabel.setAttribute("for", guestDocumentInput.id);
        }
      }

      if (removeButton) {
        removeButton.hidden = guestCards.length === 1;
      }
    });
  }

  function fillGuestCard(card, guest) {
    var guestNameInput =
      card.querySelector('input[name^="guest-name-"]') ||
      card.querySelector(".form-field input");
    var guestBirthdayInput =
      card.querySelector('input[name^="guest-birthday-"]') ||
      card.querySelector(".form-grid .form-field:first-child input");
    var genderSelect =
      card.querySelector('select[name^="guest-gender-"]') ||
      card.querySelector(".form-grid .form-field:last-child select");
    var guestPhoneInput =
      card.querySelector('input[name^="guest-phone-"]') ||
      card.querySelector('input[type="tel"]');
    var guestDocumentInput =
      card.querySelector('input[name^="guest-id-"]') ||
      card.querySelectorAll(".form-field input")[3];

    if (guestNameInput) {
      guestNameInput.value = guest.name || "";
    }
    if (guestBirthdayInput) {
      guestBirthdayInput.value = guest.birthday || "";
    }
    if (genderSelect) {
      genderSelect.value = guest.gender || "";
    }
    if (guestPhoneInput) {
      guestPhoneInput.value = guest.phone || "";
    }
    if (guestDocumentInput) {
      guestDocumentInput.value = normalizeDocumentId(guest.documentId || "");
    }
  }

  function addGuestCard(guest) {
    var newCard = createGuestCard();

    if (!newCard) {
      return;
    }

    guestList.appendChild(newCard);

    if (guest) {
      fillGuestCard(newCard, guest);
    }

    updateGuestIndexes();
  }

  function removeGuestCard(button) {
    var card = button.closest(".guest-card");

    if (!card) {
      return;
    }

    card.remove();
    updateGuestIndexes();
    persistBookingData();
    updateAddGuestButtonState();
    showToast("Đã xóa khách tham gia.");
  }

  function collectBookerData() {
    return {
      name: document.getElementById("booker-name")
        ? document.getElementById("booker-name").value.trim()
        : "",
      email: document.getElementById("booker-email")
        ? document.getElementById("booker-email").value.trim()
        : "",
      phone: document.getElementById("booker-phone")
        ? document.getElementById("booker-phone").value.trim()
        : "",
      country: document.getElementById("booker-country")
        ? document.getElementById("booker-country").value
        : "",
      note: document.getElementById("booker-note")
        ? document.getElementById("booker-note").value.trim()
        : "",
    };
  }

  function collectGuestsData() {
    return Array.prototype.map.call(
      guestList.querySelectorAll(".guest-card"),
      function (card) {
        var guestNameInput =
          card.querySelector('input[name^="guest-name-"]') ||
          card.querySelector(".form-field input");
        var guestBirthdayInput =
          card.querySelector('input[name^="guest-birthday-"]') ||
          card.querySelector(".form-grid .form-field:first-child input");
        var genderSelect =
          card.querySelector('select[name^="guest-gender-"]') ||
          card.querySelector(".form-grid .form-field:last-child select");
        var guestPhoneInput =
          card.querySelector('input[name^="guest-phone-"]') ||
          card.querySelector('input[type="tel"]');
        var guestDocumentInput =
          card.querySelector('input[name^="guest-id-"]') ||
          card.querySelectorAll(".form-field input")[3];

        return {
          name: guestNameInput ? guestNameInput.value.trim() : "",
          birthday: guestBirthdayInput ? guestBirthdayInput.value.trim() : "",
          gender: genderSelect ? genderSelect.value : "",
          phone: guestPhoneInput ? guestPhoneInput.value.trim() : "",
          documentId: guestDocumentInput ? guestDocumentInput.value.trim() : "",
        };
      },
    );
  }

  function persistBookingData() {
    var storedData = getStoredData();

    storedData.customer = collectBookerData();
    storedData.guests = collectGuestsData();
    setStoredData(storedData);
  }
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  /** Chuẩn hóa SĐT VN: thiếu số 0 đầu (9 số 3x–9x) → thêm 0; 849… → +849… */
  function normalizeVietnamPhone(phone) {
    if (phone == null || phone === "") {
      return "";
    }
    var raw = String(phone).replace(/\s/g, "").trim();
    if (!raw) {
      return "";
    }
    if (raw.startsWith("+84")) {
      var rest = raw.slice(3).replace(/\D/g, "").slice(0, 9);
      return "+84" + rest;
    }
    var d = raw.replace(/\D/g, "");
    if (/^84(3|5|7|8|9)\d{8}$/.test(d)) {
      return "+84" + d.slice(2);
    }
    if (/^(3|5|7|8|9)\d{8}$/.test(d)) {
      return "0" + d;
    }
    if (/^0(3|5|7|8|9)\d{0,8}$/.test(d)) {
      return d.slice(0, 10);
    }
    if (d.startsWith("84")) {
      return d.slice(0, 12);
    }
    return d.slice(0, 11);
  }

  function isValidVietnamPhone(phone) {
    return /^(0|\+84)(3|5|7|8|9)\d{8}$/.test(normalizeVietnamPhone(phone));
  }

  function isValidFullName(name) {
    if (!name) return false;

    var normalized = name.trim().replace(/\s+/g, " ");

    if (normalized.length < 2 || normalized.length > 80) {
      return false;
    }

    try {
      if (!/^[\p{L}\s]+$/u.test(normalized)) {
        return false;
      }
    } catch (e) {
      if (!/^[a-zA-ZÀ-ỹĐđ\s]+$/.test(normalized)) {
        return false;
      }
    }

    return true;
  }

  /** Chỉ giữ số; 9–11 số (Excel hay mất số 0 đầu) → pad trái thành đủ 12 số */
  function normalizeDocumentId(raw) {
    if (raw == null || raw === "") {
      return "";
    }
    var s;
    if (typeof raw === "number" && Number.isFinite(raw)) {
      s = String(Math.trunc(raw));
      if (s === "NaN" || s === "Infinity") {
        return "";
      }
    } else {
      s = String(raw).replace(/\D/g, "");
    }
    if (s.length > 12) {
      s = s.slice(0, 12);
    }
    if (/^\d{9,11}$/.test(s)) {
      s = s.padStart(12, "0");
    }
    return s.slice(0, 12);
  }

  function isValidDocumentId(value) {
    if (!value) return false;

    return /^\d{12}$/.test(normalizeDocumentId(value));
  }

  function parseDateDDMMYYYY(dateStr) {
    if (!dateStr) return null;

    var match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(dateStr.trim());
    if (!match) return null;

    var day = Number(match[1]);
    var month = Number(match[2]);
    var year = Number(match[3]);

    var date = new Date(year, month - 1, day);

    if (
      date.getFullYear() !== year ||
      date.getMonth() !== month - 1 ||
      date.getDate() !== day
    ) {
      return null;
    }

    return date;
  }

  function getAgeYearsFromBirthDate(birthDate) {
    if (!(birthDate instanceof Date) || isNaN(birthDate.getTime())) {
      return null;
    }
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var b = new Date(birthDate);
    b.setHours(0, 0, 0, 0);
    var age = today.getFullYear() - b.getFullYear();
    var m = today.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < b.getDate())) {
      age -= 1;
    }
    return age;
  }

  function isFutureDate(date) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);

    return compareDate > today;
  }

  function focusAndToast(element, message) {
    if (element && typeof element.focus === "function") {
      element.focus();
    }
    showToast(message);
  }
  function validateForm() {
    // =========================
    // 1. THÔNG TIN NGƯỜI ĐẶT TOUR
    // =========================
    var bookerName = document.getElementById("booker-name");
    var bookerEmail = document.getElementById("booker-email");
    var bookerPhone = document.getElementById("booker-phone");
    var bookerCountry = document.getElementById("booker-country");

    var nameValue = bookerName ? bookerName.value.trim() : "";
    var emailValue = bookerEmail ? bookerEmail.value.trim() : "";
    var phoneValue = bookerPhone ? bookerPhone.value.trim() : "";
    var countryValue = bookerCountry ? bookerCountry.value.trim() : "";

    if (bookerPhone) {
      phoneValue = normalizeVietnamPhone(phoneValue);
      bookerPhone.value = phoneValue;
    }

    if (!nameValue) {
      focusAndToast(bookerName, "Vui lòng nhập họ và tên người đặt tour.");
      return false;
    }

    if (!isValidFullName(nameValue)) {
      focusAndToast(
        bookerName,
        "Họ và tên: 2–80 ký tự, chỉ chữ Latin/tiếng Việt và khoảng trắng, không số hay ký tự đặc biệt (vd: Nguyễn Văn A).",
      );
      return false;
    }

    if (!emailValue) {
      focusAndToast(bookerEmail, "Vui lòng nhập email.");
      return false;
    }

    if (!isValidEmail(emailValue)) {
      focusAndToast(bookerEmail, "Email không đúng định dạng.");
      return false;
    }

    if (!phoneValue) {
      focusAndToast(bookerPhone, "Vui lòng nhập số điện thoại.");
      return false;
    }

    if (!isValidVietnamPhone(phoneValue)) {
      focusAndToast(
        bookerPhone,
        "Số điện thoại: 10 số bắt đầu bằng 0, hoặc +84 và 9 số tiếp theo; không khoảng trắng (vd: 0912345678 hoặc +84912345678).",
      );
      return false;
    }

    if (!countryValue) {
      focusAndToast(bookerCountry, "Vui lòng chọn quốc tịch.");
      return false;
    }

    // =========================
    // 2. THÔNG TIN KHÁCH THAM GIA
    // =========================
    var guestCards = guestList ? guestList.querySelectorAll(".guest-card") : [];

    for (var i = 0; i < guestCards.length; i += 1) {
      var card = guestCards[i];
      var guestIndex = i + 1;

      var guestNameInput =
        card.querySelector('input[name^="guest-name-"]') ||
        card.querySelector(".form-field input");
      var guestBirthdayInput =
        card.querySelector('input[name^="guest-birthday-"]') ||
        card.querySelector(".form-grid .form-field:first-child input");
      var genderSelect =
        card.querySelector('select[name^="guest-gender-"]') ||
        card.querySelector(".form-grid .form-field:last-child select");
      var guestPhoneInput =
        card.querySelector('input[name^="guest-phone-"]') ||
        card.querySelector('input[type="tel"]');
      var guestDocumentInput =
        card.querySelector('input[name^="guest-id-"]') ||
        card.querySelectorAll(".form-field input")[3];

      var guestName = guestNameInput ? guestNameInput.value.trim() : "";
      var guestBirthday = guestBirthdayInput
        ? guestBirthdayInput.value.trim()
        : "";
      var guestGender = genderSelect ? genderSelect.value.trim() : "";
      var guestDocument = guestDocumentInput
        ? guestDocumentInput.value.trim()
        : "";
      var guestPhone = guestPhoneInput ? guestPhoneInput.value.trim() : "";
      if (guestPhoneInput) {
        guestPhone = normalizeVietnamPhone(guestPhone);
        guestPhoneInput.value = guestPhone;
      }

      if (!guestName) {
        focusAndToast(
          guestNameInput,
          `Vui lòng nhập họ và tên cho khách #${guestIndex}.`,
        );
        return false;
      }

      if (!isValidFullName(guestName)) {
        focusAndToast(
          guestNameInput,
          `Khách #${guestIndex}: họ tên 2–80 ký tự, chỉ chữ và khoảng trắng, không số/ký tự đặc biệt (vd: Nguyễn Văn A).`,
        );
        return false;
      }

      if (!guestBirthday) {
        focusAndToast(
          guestBirthdayInput,
          `Vui lòng nhập ngày sinh cho khách #${guestIndex}.`,
        );
        return false;
      }

      var parsedBirthday = parseDateDDMMYYYY(guestBirthday);

      if (!parsedBirthday) {
        focusAndToast(
          guestBirthdayInput,
          `Khách #${guestIndex}: ngày sinh đúng định dạng dd/mm/yyyy (2 chữ số ngày, 2 chữ số tháng, 4 chữ số năm), vd: 15/08/1998.`,
        );
        return false;
      }

      if (isFutureDate(parsedBirthday)) {
        focusAndToast(
          guestBirthdayInput,
          `Khách #${guestIndex}: ngày sinh không được lớn hơn ngày hiện tại.`,
        );
        return false;
      }

      var guestAge = getAgeYearsFromBirthDate(parsedBirthday);
      if (guestAge == null || guestAge < 0 || guestAge > 120) {
        focusAndToast(
          guestBirthdayInput,
          `Khách #${guestIndex}: tuổi phải từ 0 đến 120 (theo ngày sinh đã nhập).`,
        );
        return false;
      }

      if (!/^(male|female|other)$/.test(guestGender)) {
        focusAndToast(
          genderSelect,
          `Khách #${guestIndex}: chọn một trong Nam, Nữ hoặc Khác.`,
        );
        return false;
      }

      if (!guestPhone) {
        focusAndToast(
          guestPhoneInput,
          `Vui lòng nhập số điện thoại cho khách #${guestIndex}.`,
        );
        return false;
      }

      if (!isValidVietnamPhone(guestPhone)) {
        focusAndToast(
          guestPhoneInput,
          `Khách #${guestIndex}: SĐT 10 số bắt đầu 0 hoặc +84 và 9 số tiếp; không khoảng trắng (vd: 0912345678 hoặc +84912345678).`,
        );
        return false;
      }

      if (guestDocumentInput) {
        guestDocument = normalizeDocumentId(guestDocument);
        guestDocumentInput.value = guestDocument;
      }

      if (!guestDocument) {
        focusAndToast(
          guestDocumentInput,
          `Vui lòng nhập số CCCD cho khách #${guestIndex}.`,
        );
        return false;
      }

      if (!isValidDocumentId(guestDocument)) {
        focusAndToast(
          guestDocumentInput,
          `Khách #${guestIndex}: số CCCD đúng 12 chữ số, không chữ hay ký tự khác (vd: 012345678901).`,
        );
        return false;
      }
    }

    return true;
  }
  function hydrateFromStorage() {
    var storedData = getStoredData();
    var customer = storedData.customer || {};
    var guests = storedData.guests || [];
    var firstGuestCard = guestList.querySelector(".guest-card");

    if (document.getElementById("booker-name")) {
      document.getElementById("booker-name").value = customer.name || "";
    }
    if (document.getElementById("booker-email")) {
      document.getElementById("booker-email").value = customer.email || "";
    }
    if (document.getElementById("booker-phone")) {
      document.getElementById("booker-phone").value = customer.phone || "";
    }
    if (document.getElementById("booker-country")) {
      document.getElementById("booker-country").value = customer.country || "";
    }
    if (document.getElementById("booker-note")) {
      document.getElementById("booker-note").value = customer.note || "";
    }

    if (guests.length > 0 && firstGuestCard) {
      fillGuestCard(firstGuestCard, guests[0]);

      for (var i = 1; i < guests.length; i += 1) {
        addGuestCard(guests[i]);
      }
    }

    updateGuestIndexes();
  }

  function getBookingParamsFromURL() {
    const params = new URLSearchParams(window.location.search);

    return {
      tourId: params.get("tour_id"),
      departureDate: params.get("departure_date"),
      adults: Number(params.get("adults") || 0),
      children: Number(params.get("children") || 0),
    };
  }

  function getRequiredGuestCount() {
    var storedData = getStoredData();
    var bookingMeta = storedData.bookingMeta || {};
    return Number(bookingMeta.totalGuests || 0);
  }

  function validateGuestCountMatchBooking() {
    var requiredGuests = getRequiredGuestCount();
    var actualGuests = guestList
      ? guestList.querySelectorAll(".guest-card").length
      : 0;

    if (requiredGuests <= 0) {
      showToast("Không xác định được số lượng khách từ bước trước.");
      return false;
    }

    if (actualGuests !== requiredGuests) {
      showToast(
        `Bạn đã chọn ${requiredGuests} khách, vui lòng nhập đủ thông tin cho ${requiredGuests} khách.`,
      );
      return false;
    }

    return true;
  }

  function updateAddGuestButtonState() {
    if (!addGuestButton || !guestList) return;

    var requiredGuests = getRequiredGuestCount();
    var currentGuests = guestList.querySelectorAll(".guest-card").length;

    if (requiredGuests <= 0) {
      addGuestButton.style.opacity = "0.6";
      addGuestButton.title = "Không xác định được số lượng khách.";
      return;
    }

    if (currentGuests >= requiredGuests) {
      addGuestButton.style.opacity = "0.6";
      addGuestButton.title = `Đã đủ ${requiredGuests} khách`;
    } else {
      addGuestButton.style.opacity = "1";
      addGuestButton.title = "Thêm khách";
    }
  }

  var guestExcelInput = document.getElementById("guest-excel-input");
  var importGuestExcelBtn = document.querySelector(".js-import-guest-excel");

  function normalizeGuestExcelHeader(value) {
    if (value == null || value === "") return "";
    var s = String(value)
      .trim()
      .toLowerCase()
      .replace(/\*/g, "")
      .trim()
      .replace(/đ/g, "d");
    try {
      s = s
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ");
    } catch (e) {
      s = s.replace(/\s+/g, " ");
    }
    return s;
  }

  function mapGenderFromExcel(raw) {
    if (raw == null) return "";
    var g = String(raw).trim().toLowerCase();
    if (g === "nam" || g === "male") return "male";
    if (g === "nữ" || g === "nu" || g === "female") return "female";
    if (g === "khác" || g === "khac" || g === "other") return "other";
    return "";
  }

  function normalizePhoneFromExcel(value) {
    if (value == null || value === "") return "";
    if (typeof value === "number" && Number.isFinite(value)) {
      var s = String(Math.round(value));
      if (s.length === 9 && /^[35789]/.test(s)) {
        s = "0" + s;
      }
      return normalizeVietnamPhone(s);
    }
    return normalizeVietnamPhone(
      String(value).replace(/\s/g, "").trim(),
    );
  }

  function pad2(n) {
    return String(Math.floor(n)).padStart(2, "0");
  }

  function isValidCalendarDay(day, month, year) {
    if (
      !Number.isFinite(day) ||
      !Number.isFinite(month) ||
      !Number.isFinite(year)
    ) {
      return false;
    }
    if (month < 1 || month > 12 || day < 1 || day > 31) {
      return false;
    }
    var dt = new Date(year, month - 1, day);
    return (
      dt.getFullYear() === year &&
      dt.getMonth() === month - 1 &&
      dt.getDate() === day
    );
  }

  function formatDateAsDDMMYYYY(dt) {
    if (!(dt instanceof Date) || isNaN(dt.getTime())) {
      return "";
    }
    return (
      pad2(dt.getDate()) +
      "/" +
      pad2(dt.getMonth() + 1) +
      "/" +
      dt.getFullYear()
    );
  }

  /** Chuỗi / Date / serial Excel → luôn dd/mm/yyyy (VN), tránh M/D/YY của locale US */
  function formatBirthdayFromExcelCell(value) {
    if (value == null || value === "") {
      return "";
    }

    if (typeof value === "number" && window.XLSX && XLSX.SSF) {
      var parsed = XLSX.SSF.parse_date_code(value);
      if (parsed && parsed.y) {
        var dNum = Math.floor(parsed.d || 0);
        var mNum = Math.floor(parsed.m || 0);
        var yNum = parsed.y;
        if (mNum >= 1 && mNum <= 12 && dNum >= 1 && dNum <= 31) {
          return pad2(dNum) + "/" + pad2(mNum) + "/" + yNum;
        }
      }
    }

    if (value instanceof Date && !isNaN(value.getTime())) {
      return formatDateAsDDMMYYYY(value);
    }

    var s = String(value).trim();
    if (!s) {
      return "";
    }

    var iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
    if (iso) {
      var yIso = +iso[1];
      var moIso = +iso[2];
      var dIso = +iso[3];
      if (isValidCalendarDay(dIso, moIso, yIso)) {
        return pad2(dIso) + "/" + pad2(moIso) + "/" + yIso;
      }
    }

    var slash = /^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/.exec(s);
    if (slash) {
      var a = +slash[1];
      var b = +slash[2];
      var ys = slash[3];
      var y =
        ys.length === 2
          ? +ys <= 29
            ? 2000 + +ys
            : 1900 + +ys
          : +ys;
      var asDayFirst = isValidCalendarDay(a, b, y);
      var asMonthFirst = isValidCalendarDay(b, a, y);
      if (asDayFirst && !asMonthFirst) {
        return pad2(a) + "/" + pad2(b) + "/" + y;
      }
      if (!asDayFirst && asMonthFirst) {
        return pad2(b) + "/" + pad2(a) + "/" + y;
      }
      if (asDayFirst && asMonthFirst) {
        return pad2(a) + "/" + pad2(b) + "/" + y;
      }
    }

    return s;
  }

  function rowToGuest(row) {
    var norm = {};
    Object.keys(row).forEach(function (key) {
      var nk = normalizeGuestExcelHeader(
        String(key).replace(/\u00a0/g, " ").trim(),
      );
      if (nk) {
        norm[nk] = row[key];
      }
    });

    function pickExact(keys) {
      for (var i = 0; i < keys.length; i += 1) {
        var k = keys[i];
        if (Object.prototype.hasOwnProperty.call(norm, k)) {
          var v = norm[k];
          if (v !== undefined && v !== null && String(v).trim() !== "") {
            return v;
          }
        }
      }
      return "";
    }

    function pickFuzzy(substrings) {
      var keys = Object.keys(norm);
      for (var s = 0; s < substrings.length; s += 1) {
        var sub = substrings[s];
        for (var ki = 0; ki < keys.length; ki += 1) {
          if (keys[ki] === sub || keys[ki].indexOf(sub) !== -1) {
            var v2 = norm[keys[ki]];
            if (
              v2 !== undefined &&
              v2 !== null &&
              String(v2).trim() !== ""
            ) {
              return v2;
            }
          }
        }
      }
      return "";
    }

    var nameRaw =
      pickExact(["ho va ten", "ho ten", "ten"]) ||
      pickFuzzy(["ho va ten", "ho ten"]);
    var birthRaw =
      pickExact(["ngay sinh", "sinh nhat"]) || pickFuzzy(["ngay sinh"]);
    var genderRaw =
      pickExact(["gioi tinh"]) || pickFuzzy(["gioi tinh"]);
    var phoneRaw =
      pickExact(["so dien thoai", "dien thoai", "sdt"]) ||
      pickFuzzy(["dien thoai", "so dien thoai"]);
    var docRaw =
      pickExact(["so cccd", "cccd", "cmnd"]) ||
      pickFuzzy(["so cccd", "cccd"]);

    return {
      name: String(nameRaw).trim().slice(0, 80),
      birthday: formatBirthdayFromExcelCell(birthRaw),
      gender: mapGenderFromExcel(genderRaw),
      phone: normalizePhoneFromExcel(phoneRaw),
      documentId: normalizeDocumentId(docRaw),
    };
  }

  function parseGuestSheet(ws) {
    var matrix = XLSX.utils.sheet_to_json(ws, {
      header: 1,
      defval: "",
      raw: false,
    });
    if (!matrix || !matrix.length) {
      return [];
    }

    var headerRowIdx = -1;
    var scanRows = Math.min(matrix.length, 30);
    var r;
    var c;
    for (r = 0; r < scanRows; r += 1) {
      var row = matrix[r];
      if (!row || !row.length) {
        continue;
      }
      for (c = 0; c < row.length; c += 1) {
        var cellNorm = normalizeGuestExcelHeader(
          String(row[c]).replace(/\u00a0/g, " "),
        );
        if (
          cellNorm === "ho va ten" ||
          cellNorm.indexOf("ho va ten") !== -1 ||
          cellNorm === "ho ten"
        ) {
          headerRowIdx = r;
          break;
        }
      }
      if (headerRowIdx !== -1) {
        break;
      }
    }

    if (headerRowIdx === -1) {
      return [];
    }

    var headers = matrix[headerRowIdx].map(function (h) {
      return String(h == null ? "" : h)
        .replace(/\u00a0/g, " ")
        .trim();
    });

    var guests = [];
    var i;
    for (i = headerRowIdx + 1; i < matrix.length; i += 1) {
      var dataRow = matrix[i];
      if (!dataRow) {
        continue;
      }
      var obj = {};
      var j;
      for (j = 0; j < headers.length; j += 1) {
        if (headers[j] !== "") {
          obj[headers[j]] = dataRow[j] != null ? dataRow[j] : "";
        }
      }
      var g = rowToGuest(obj);
      if (g.name) {
        guests.push(g);
      }
    }
    return guests;
  }

  function parseGuestRowsFromWorkbook(workbook) {
    var si;
    for (si = 0; si < workbook.SheetNames.length; si += 1) {
      var ws = workbook.Sheets[workbook.SheetNames[si]];
      var guests = parseGuestSheet(ws);
      if (guests.length) {
        return guests;
      }
    }
    return [];
  }

  function ensureGuestCardCount(target) {
    if (!guestList) return;
    while (guestList.querySelectorAll(".guest-card").length < target) {
      addGuestCard();
    }
    while (guestList.querySelectorAll(".guest-card").length > target) {
      var last = guestList.querySelector(".guest-card:last-of-type");
      if (last) {
        last.remove();
      } else {
        break;
      }
    }
    updateGuestIndexes();
    updateAddGuestButtonState();
  }

  function applyImportedGuests(rows) {
    var required = getRequiredGuestCount();
    var usedGuestCountFallback = false;
    if (required <= 0 && rows.length > 0) {
      var sd = getStoredData();
      var meta = sd.bookingMeta || {};
      meta.totalGuests = rows.length;
      sd.bookingMeta = meta;
      setStoredData(sd);
      required = rows.length;
      usedGuestCountFallback = true;
      var totalGuestsEl = document.getElementById("tour-total-guests");
      if (totalGuestsEl) {
        totalGuestsEl.textContent = required + " khách";
      }
      var summaryGuestLineEl = document.getElementById("summary-guest-line");
      if (summaryGuestLineEl) {
        summaryGuestLineEl.innerHTML =
          "Giá tour ×<br />" + required + " khách";
      }
    }

    if (required <= 0) {
      showToast(
        "Không đọc được dữ liệu khách trong file. Kiểm tra sheet có cột Họ và tên.",
      );
      return;
    }

    ensureGuestCardCount(required);

    var cards = guestList.querySelectorAll(".guest-card");
    var n = Math.min(required, rows.length);
    var i;
    for (i = 0; i < n; i += 1) {
      fillGuestCard(cards[i], rows[i]);
    }
    for (; i < cards.length; i += 1) {
      fillGuestCard(cards[i], {
        name: "",
        birthday: "",
        gender: "",
        phone: "",
        documentId: "",
      });
    }

    persistBookingData();

    if (rows.length < required) {
      showToast(
        "Đã đổ " +
          rows.length +
          "/" +
          required +
          " khách từ file. Vui lòng kiểm tra và bổ sung.",
      );
    } else if (rows.length > required) {
      showToast(
        "File có " +
          rows.length +
          " dòng; chỉ đổ " +
          required +
          " khách theo số tour đã chọn.",
      );
    } else if (usedGuestCountFallback) {
      showToast(
        "Đã đổ đủ " +
          required +
          " khách lên form (số khách lấy theo file). Nên quay lại chọn tour nếu cần khớp đặt chỗ.",
      );
    } else {
      showToast("Đã import và hiển thị đủ " + required + " khách trên form.");
    }
  }

  function isZipXlsxMagic(bytes) {
    return (
      bytes &&
      bytes.length >= 4 &&
      bytes[0] === 0x50 &&
      bytes[1] === 0x4b &&
      (bytes[2] === 0x03 || bytes[2] === 0x05 || bytes[2] === 0x07) &&
      (bytes[3] === 0x04 || bytes[3] === 0x06 || bytes[3] === 0x08)
    );
  }

  function looksLikeHtmlDownload(bytes) {
    var head = new TextDecoder("utf-8", { fatal: false }).decode(
      bytes.subarray(0, Math.min(256, bytes.length)),
    );
    var t = head.trim().toLowerCase();
    return t.startsWith("<!doctype") || t.startsWith("<html");
  }

  function decodeCsvText(u8) {
    var t = new TextDecoder("utf-8", { fatal: false }).decode(u8);
    if (t.charCodeAt(0) === 0xfeff) {
      t = t.slice(1);
    }
    if (/[\u0000-\u0008]/.test(t.slice(0, 4000))) {
      try {
        t = new TextDecoder("utf-16le", { fatal: false }).decode(u8);
      } catch (e) {
        /* keep utf-8 */
      }
    }
    return t;
  }

  function handleGuestExcelFile(file) {
    if (!file) return;
    if (typeof window.XLSX === "undefined") {
      showToast("Chưa tải được thư viện đọc Excel. Tải lại trang và thử lại.");
      return;
    }
    if (!file.size) {
      showToast(
        "File rỗng hoặc chưa tải xong. Hãy tải lại: Google Sheet → Tệp → Tải xuống → Microsoft Excel (.xlsx).",
      );
      return;
    }
    var reader = new FileReader();
    reader.onerror = function () {
      showToast("Không đọc được file trên máy (quyền truy cập hoặc file đang mở chỗ khác).");
    };
    reader.onload = function (e) {
      try {
        var buf = e.target.result;
        var u8 = new Uint8Array(buf);
        var fname = (file.name || "").toLowerCase();
        var workbook;
        var isCsvName =
          fname.endsWith(".csv") ||
          fname.endsWith(".tsv") ||
          (file.type && file.type.indexOf("csv") !== -1);

        if (isCsvName) {
          workbook = XLSX.read(decodeCsvText(u8), { type: "string" });
        } else if (isZipXlsxMagic(u8)) {
          workbook = XLSX.read(u8, { type: "array", cellDates: true });
        } else if (looksLikeHtmlDownload(u8)) {
          showToast(
            "File bạn chọn là trang web (.html), không phải Excel. Trong Google Sheet: Tệp → Tải xuống → Microsoft Excel (.xlsx), rồi chọn đúng file .xlsx vừa lưu.",
          );
          return;
        } else if (fname.endsWith(".xls")) {
          workbook = XLSX.read(u8, { type: "array", cellDates: true });
        } else {
          var asText = decodeCsvText(u8);
          if (
            asText.indexOf(",") !== -1 &&
            (/họ\s+và\s+tên|ho\s*va\s*ten|stt/i.test(asText) ||
              /ngày\s*sinh|gioi\s*tinh|cccd/i.test(asText))
          ) {
            try {
              workbook = XLSX.read(asText, { type: "string" });
            } catch (e2) {
              workbook = null;
            }
          }
          if (!workbook) {
            showToast(
              "File không phải Excel .xlsx hợp lệ (thường do tải nhầm hoặc file shortcut). Mở Google Sheet → Tệp → Tải xuống → Microsoft Excel (.xlsx).",
            );
            return;
          }
        }

        var guests = parseGuestRowsFromWorkbook(workbook);
        if (!guests.length) {
          showToast(
            "Không tìm thấy dữ liệu: cần sheet có hàng tiêu đề gồm cột Họ và tên (giống mẫu Google Sheet).",
          );
          return;
        }
        applyImportedGuests(guests);
      } catch (err) {
        console.error(err);
        showToast(
          (err && err.message
            ? "Lỗi đọc file: " + err.message + ". "
            : "") +
            "Thử tải lại .xlsx từ Google Sheet (Tệp → Tải xuống → Microsoft Excel).",
        );
      }
    };
    reader.readAsArrayBuffer(file);
  }

  if (importGuestExcelBtn && guestExcelInput) {
    importGuestExcelBtn.addEventListener("click", function () {
      guestExcelInput.click();
    });
    guestExcelInput.addEventListener("change", function (ev) {
      var file = ev.target.files && ev.target.files[0];
      if (file) {
        handleGuestExcelFile(file);
      }
      guestExcelInput.value = "";
    });
  }

  if (addGuestButton) {
    addGuestButton.addEventListener("click", function () {
      var requiredGuests = getRequiredGuestCount();
      var currentGuests = guestList
        ? guestList.querySelectorAll(".guest-card").length
        : 0;

      if (requiredGuests <= 0) {
        showToast("Không xác định được số lượng khách.");
        return;
      }

      if (currentGuests >= requiredGuests) {
        showToast(`Bạn đã thêm đủ ${requiredGuests} khách.`);
        return;
      }

      addGuestCard();
      persistBookingData();
      updateGuestIndexes();
      updateAddGuestButtonState();

      var updatedGuests = guestList.querySelectorAll(".guest-card").length;
      if (updatedGuests >= requiredGuests) {
        showToast(`Đã thêm đủ ${requiredGuests} khách.`);
        return;
      }

      showToast("Đã thêm khách tham gia mới.");
    });
  }

  if (guestList) {
    guestList.addEventListener("click", function (event) {
      if (event.target.classList.contains("guest-card__remove")) {
        removeGuestCard(event.target);
      }
    });
  }
  var bookerPhoneInput = document.getElementById("booker-phone");

  if (bookerPhoneInput) {
    bookerPhoneInput.addEventListener("input", function () {
      this.value = this.value.replace(/[^\d+]/g, "");

      if (this.value.startsWith("+84")) {
        this.value = "+84" + this.value.slice(3).replace(/\D/g, "").slice(0, 9);
      } else {
        this.value = normalizeVietnamPhone(this.value.replace(/\D/g, ""));
      }
    });
  }
  if (bookingForm) {
    bookingForm.addEventListener("input", function (event) {
      var target = event.target;
      if (!(target instanceof HTMLInputElement)) {
        return;
      }

      if (target.id.startsWith("guest-id-")) {
        var idDigits = target.value.replace(/\D/g, "");
        target.value = normalizeDocumentId(idDigits);
        return;
      }

      if (target.id.startsWith("guest-phone-")) {
        target.value = target.value.replace(/[^\d+]/g, "");
        if (target.value.startsWith("+84")) {
          target.value =
            "+84" + target.value.slice(3).replace(/\D/g, "").slice(0, 9);
        } else {
          target.value = normalizeVietnamPhone(
            target.value.replace(/\D/g, ""),
          );
        }
      }
    });
  }
  if (bookingForm) {
    bookingForm.addEventListener("input", persistBookingData);
    bookingForm.addEventListener("change", persistBookingData);
    bookingForm.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!validateGuestCountMatchBooking()) {
        return;
      }

      if (!validateForm()) {
        return;
      }

      persistBookingData();
      window.location.href = "./tuychon.html";
    });
  }

  if (backTourButton) {
    backTourButton.addEventListener("click", function () {
      persistBookingData();

      var params = getBookingParamsFromURL();
      if (params.tourId) {
        window.location.href = `./chitiet.html?id=${params.tourId}`;
        return;
      }

      window.location.href = "./dstour.html";
    });
  }

  async function hydrateBookerFromCustomerProfile() {
    var token = localStorage.getItem("accessToken");
    if (!token) return;
    try {
      var res = await fetch("http://localhost:3000/api/customer/profile", {
        headers: { Authorization: "Bearer " + token },
      });
      var json = await res.json().catch(function () {
        return {};
      });
      if (!res.ok || !json.success || !json.data) return;
      var u = json.data;
      var nameEl = document.getElementById("booker-name");
      var emailEl = document.getElementById("booker-email");
      var phoneEl = document.getElementById("booker-phone");
      if (nameEl && u.full_name)
        nameEl.value = String(u.full_name).trim();
      if (emailEl && u.email) emailEl.value = String(u.email).trim();
      if (phoneEl && u.phone) phoneEl.value = String(u.phone).trim();
      persistBookingData();
      try {
        var raw = localStorage.getItem("traveltour_user");
        if (raw && u) {
          var cache = JSON.parse(raw);
          localStorage.setItem(
            "traveltour_user",
            JSON.stringify({
              ...cache,
              fullName: u.full_name || cache.fullName,
              phone: u.phone || cache.phone,
              email: u.email || cache.email,
              avatarUrl: u.avatar_url || cache.avatarUrl,
            }),
          );
        }
      } catch (e2) {
        /* ignore */
      }
    } catch (e) {
      console.warn("Không tải hồ sơ để điền người đặt tour:", e);
    }
  }

  async function renderBookingSummaryFromURL() {
  const data = getBookingParamsFromURL();
  const storedData = getStoredData();
  const bookingMeta = storedData.bookingMeta || {};

  const hasUrlParams =
    data.tourId && Number(data.adults || 0) + Number(data.children || 0) > 0;

  try {
    let summary = null;
    let tour = null;

    if (hasUrlParams) {
      [tour, summary] = await Promise.all([
        fetchTourDetailById(data.tourId),
        fetchBookingSummary(data),
      ]);

      persistTourBookingMeta({
        tourId: summary.tour_id,
        departureDate: summary.departure_date,
        adults: summary.adults,
        children: summary.children,
        totalGuests: summary.total_guests,
        pricePerPerson: summary.price_per_person,
        tourTotal: summary.tour_total,
        serviceFee: summary.service_fee || 0,
        grandTotal: summary.grand_total,
        tourTitle: summary.tour_title || "",
        location: summary.location || "",
        thumbnailUrl: summary.thumbnail_url || "",
      });
    } else if (bookingMeta.tourId) {
      summary = {
        tour_id: bookingMeta.tourId,
        departure_date: bookingMeta.departureDate,
        adults: bookingMeta.adults || 0,
        children: bookingMeta.children || 0,
        total_guests: bookingMeta.totalGuests || 0,
        price_per_person: bookingMeta.pricePerPerson || 0,
        tour_total: bookingMeta.tourTotal || 0,
        service_fee: bookingMeta.serviceFee || 0,
        grand_total: bookingMeta.grandTotal || 0,
        tour_title: bookingMeta.tourTitle || "",
        location: bookingMeta.location || "",
        thumbnail_url: bookingMeta.thumbnailUrl || "",
      };

      tour = {
        title: bookingMeta.tourTitle || "",
        location: bookingMeta.location || "",
      };
    } else {
      showToast("Không tìm thấy dữ liệu đặt tour.");
      return;
    }

    // Đồng bộ giá với trang chi tiết tour (ưu tiên giá cuối cùng từ tour)
    if (tour && summary) {
      var basePrice = Number(tour.base_price || 0);
      var salePrice = Number(tour.sale_price || 0);
      var finalPriceField = Number(tour.final_price || 0);

      var effectivePrice =
        (Number.isFinite(finalPriceField) && finalPriceField > 0
          ? finalPriceField
          : 0) ||
        (salePrice > 0 && salePrice < basePrice ? salePrice : basePrice);

      var totalGuests =
        Number(summary.total_guests || 0) ||
        Number(summary.adults || 0) + Number(summary.children || 0) ||
        1;

      if (effectivePrice > 0) {
        summary.price_per_person = effectivePrice;
        summary.tour_total = effectivePrice * totalGuests;
      }

      if (summary.service_fee == null) {
        summary.service_fee = 0;
      }

      summary.total_guests = totalGuests;
      summary.grand_total =
        Number(summary.tour_total || 0) + Number(summary.service_fee || 0);
    }

    // Cập nhật lại các link "Chi tiết tour" để luôn kèm đúng id
    if (summary && summary.tour_id) {
      var detailHref = "./chitiet.html?id=" + encodeURIComponent(summary.tour_id);
      document
        .querySelectorAll('a[href="./chitiet.html"]')
        .forEach(function (link) {
          link.href = detailHref;
        });
    }

    const titleEl = document.getElementById("tour-title");
    const locationEl = document.getElementById("tour-location");
    const departureDateEl = document.getElementById("tour-departure-date");
    const totalGuestsEl = document.getElementById("tour-total-guests");
    const pricePerPersonEl = document.getElementById("tour-price-per-person");
    const totalPriceEl = document.getElementById("tour-total-price");

    const summaryGuestLineEl = document.getElementById("summary-guest-line");
    const summaryTourPriceEl = document.getElementById("summary-tour-price");
    const summaryServiceFeeEl = document.getElementById("summary-service-fee");
    const summaryGrandTotalEl = document.getElementById("summary-grand-total");

    const tourImageEl = document.querySelector(".tour-card__media img");

    if (titleEl) {
      titleEl.textContent =
        summary.tour_title || tour.title || "Chưa có tên tour";
    }

    if (locationEl) {
      locationEl.textContent =
        summary.location || tour.location || "Chưa cập nhật";
    }

    if (departureDateEl) {
      departureDateEl.textContent = summary.departure_date
        ? formatDate(summary.departure_date)
        : "Chưa có ngày";
    }

    if (totalGuestsEl) {
      totalGuestsEl.textContent = `${summary.total_guests} khách`;
    }

    if (pricePerPersonEl) {
      pricePerPersonEl.textContent = formatCurrency(summary.price_per_person);
    }

    if (totalPriceEl) {
      totalPriceEl.textContent = formatCurrency(summary.tour_total);
    }

    if (summaryGuestLineEl) {
      summaryGuestLineEl.innerHTML = `Giá tour ×<br />${summary.total_guests} khách`;
    }

    if (summaryTourPriceEl) {
      summaryTourPriceEl.textContent = formatCurrency(summary.tour_total);
    }

    if (summaryServiceFeeEl) {
      summaryServiceFeeEl.textContent = formatCurrency(summary.service_fee || 0);

      const serviceFeeRow = summaryServiceFeeEl.closest(".summary-card__row");
      if (serviceFeeRow) {
        serviceFeeRow.style.display =
          Number(summary.service_fee || 0) > 0 ? "" : "none";
      }
    }

    if (summaryGrandTotalEl) {
      summaryGrandTotalEl.textContent = formatCurrency(summary.grand_total);
    }

    if (tourImageEl) {
      tourImageEl.src =
        summary.thumbnail_url ||
        "../../assets/images/tours/chitiet/hero-vinh-ha-long.png";

      tourImageEl.alt = summary.tour_title || "Ảnh tour";

      tourImageEl.onerror = function () {
        this.onerror = null;
        this.src = "../../assets/images/tours/chitiet/hero-vinh-ha-long.png";
      };
    }
  } catch (error) {
    console.error(error);
    showToast(error.message || "Không tải được thông tin tour.");
  }
}
  (async function initPage() {
    await renderBookingSummaryFromURL();
    hydrateFromStorage();
    await hydrateBookerFromCustomerProfile();
    updateGuestIndexes();
    updateAddGuestButtonState();
  })();
})();
