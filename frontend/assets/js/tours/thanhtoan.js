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

  function getLastBookingStorageKey() {
    try {
      var rawUser = localStorage.getItem("traveltour_user");
      var user = rawUser ? JSON.parse(rawUser) : null;
      var userId = user && (user.id || user.email);
      return "traveltour-last-booking:" + (userId || "guest");
    } catch (error) {
      return "traveltour-last-booking:guest";
    }
  }

  var STORAGE_KEY = getBookingStorageKey();
  var BASE_PRICE = 8500000;

  var paymentForm = document.getElementById("payment-form");
  var cardForm = document.getElementById("card-form");
  var agreeTerms = document.getElementById("agree-terms");
  var confirmButton = document.querySelector(".js-confirm-booking");
  var goBackButton = document.querySelector(".js-go-back");
  var payTotal = document.getElementById("pay-total");
  var toastTimer = null;
  var officeInfo = document.getElementById("office-info");

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

  function formatCurrency(value) {
    return new Intl.NumberFormat("vi-VN").format(value) + " ₫";
  }

  function formatCurrencyMultiline(value) {
    var parts = new Intl.NumberFormat("vi-VN").format(value).split(".");

    if (parts.length >= 2) {
      return (
        parts.slice(0, parts.length - 1).join(".") +
        ".<br>" +
        parts[parts.length - 1] +
        " ₫"
      );
    }

    return formatCurrency(value);
  }

  function normalizeGender(value) {
    if (!value) return "other";

    var text = String(value).trim().toLowerCase();

    if (text === "nam" || text === "male") return "male";
    if (text === "nữ" || text === "nu" || text === "female") return "female";

    return "other";
  }

  function normalizeDate(value) {
    if (!value) return "";

    var text = String(value).trim();

    if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      return text;
    }

    var match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      var day = match[1].padStart(2, "0");
      var month = match[2].padStart(2, "0");
      var year = match[3];
      return year + "-" + month + "-" + day;
    }

    return "";
  }

  function getTravelerTypeFromBirthDate(birthDate) {
    if (!birthDate) return "adult";

    var dob = new Date(birthDate);
    var today = new Date();

    var age = today.getFullYear() - dob.getFullYear();
    var monthDiff = today.getMonth() - dob.getMonth();

    if (
      monthDiff < 0 ||
      (monthDiff === 0 && today.getDate() < dob.getDate())
    ) {
      age--;
    }

    if (age < 2) return "infant";
    if (age < 12) return "child";
    return "adult";
  }

  function getSelectedMethod() {
    return document.querySelector('input[name="payment-method"]:checked');
  }

  function buildRequestData() {
    var data = getStoredData();
    var meta = data.bookingMeta || {};
    var options = data.options || {};
    var selected = getSelectedMethod();
  
    var finalPrice =
      Number(meta.grandTotal || 0) + Number(options.extraPrice || 0);
  
    return {
      tour_id: meta.tourId || meta.tour_id || 0,
      schedule_id: meta.scheduleId || meta.schedule_id || null,
      departure_date: meta.departureDate || meta.departure_date || null,
  
      contact_name: data.customer?.name || "",
      contact_phone: data.customer?.phone || "",
      contact_email: data.customer?.email || "",
      special_requests: data.customer?.note || "",
  
      payment_method:
        selected && selected.value === "wallet" ? "momo" : "office",
  
      final_price: finalPrice,
  
      travelers: (data.guests || []).map(function (g) {
        var normalizedBirthDate = normalizeDate(g.birthday);
  
        return {
          full_name: g.name || "",
          birth_date: normalizedBirthDate,
          gender: normalizeGender(g.gender),
          id_number: g.documentId || null,
          traveler_type: getTravelerTypeFromBirthDate(normalizedBirthDate),
        };
      }),
    };
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    var d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("vi-VN");
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

  function renderSummary() {
    var data = getStoredData();
    var meta = data.bookingMeta || {};
    var options = data.options || {};

    var basePrice = Number(meta.grandTotal || 0);
    var totalGuests = Number(meta.totalGuests || 1);
    var extraPrice = Number(options.extraPrice || 0);

    var finalTotal = basePrice + extraPrice;

    var guestLine = document.getElementById("summary-guest-line");
    var tourPrice = document.getElementById("summary-tour-price");
    var grandTotal = document.getElementById("summary-grand-total");

    if (guestLine) {
      guestLine.innerHTML = "Giá tour ×<br />" + totalGuests + " khách";
    }

    if (tourPrice) {
      tourPrice.textContent = formatCurrency(basePrice);
    }

    if (grandTotal) {
      grandTotal.textContent = formatCurrency(finalTotal);
    }
  }

  function renderTourCardFromMetaStep3() {
    var data = getStoredData();
    var meta = data.bookingMeta || {};
    var options = data.options || {};

    var img = document.getElementById("step3-tour-image");
    var title = document.getElementById("step3-tour-title");
    var locationEl = document.getElementById("step3-tour-location");
    var dateEl = document.getElementById("step3-tour-date");
    var guestsEl = document.getElementById("step3-tour-guests");
    var pricePerEl = document.getElementById("step3-tour-price-per-person");
    var totalEl = document.getElementById("step3-tour-total-price");

    var optionExtra = Number(options.extraPrice || 0);

    var pricePerPerson = Number(meta.pricePerPerson || 0) || BASE_PRICE;
    var tourTotal = Number(meta.tourTotal || 0);

    if (tourTotal <= 0) {
      tourTotal = Number(meta.grandTotal || 0) || BASE_PRICE;
    }

    if (img && meta.thumbnailUrl) {
      img.src = meta.thumbnailUrl;
    }

    if (title) {
      title.textContent = meta.tourTitle || "Chưa có tên tour";
    }

    if (locationEl) {
      locationEl.textContent = meta.location || "Chưa cập nhật";
    }

    if (dateEl) {
      dateEl.textContent = meta.departureDate
        ? formatDate(meta.departureDate)
        : "Chưa có ngày";
    }

    if (guestsEl) {
      guestsEl.textContent = (meta.totalGuests || 0) + " khách";
    }

    if (pricePerEl) {
      pricePerEl.textContent = formatCurrency(pricePerPerson);
    }

    if (totalEl) {
      totalEl.textContent = formatCurrency(tourTotal + optionExtra);
    }
  }

  function bindPaymentMethodClick() {
    document.querySelectorAll(".payment-method").forEach(function (method) {
      method.addEventListener("click", function () {
        var input = method.querySelector('input[name="payment-method"]');

        if (input) {
          input.checked = true;
          refreshSelectedMethod();
          updateTotal();
          persistPayment();
        }
      });
    });
  }

  function refreshSelectedMethod() {
    var selected = getSelectedMethod();

    document.querySelectorAll(".payment-method").forEach(function (method) {
      var input = method.querySelector("input");

      method.classList.toggle(
        "is-selected",
        Boolean(selected && input === selected),
      );
    });

    if (cardForm) {
      cardForm.style.display = "none";
    }

    if (officeInfo) {
      officeInfo.style.display =
        selected && selected.value === "office" ? "block" : "none";
    }
  }

  function updateTotal() {
    var storedData = getStoredData();
    var meta = storedData.bookingMeta || {};
    var options = storedData.options || {};

    var basePrice = Number(meta.grandTotal || 0);
    if (basePrice <= 0) {
      basePrice = BASE_PRICE;
    }

    var optionExtra = Number(options.extraPrice || 0);
    var finalTotal = basePrice + optionExtra;

    if (payTotal) {
      payTotal.innerHTML = formatCurrencyMultiline(finalTotal);
    }
  }

  function persistPayment() {
    var storedData = getStoredData();
    var selected = getSelectedMethod();

    storedData.payment = {
      method: selected ? selected.value : "wallet",
      agreed: Boolean(agreeTerms && agreeTerms.checked),
    };

    setStoredData(storedData);
  }

  function hydratePayment() {
    var storedData = getStoredData();
    var payment = storedData.payment || {};

    if (payment.method) {
      var methodInput = document.querySelector(
        'input[name="payment-method"][value="' + payment.method + '"]',
      );

      if (methodInput) {
        methodInput.checked = true;
      }
    }

    if (agreeTerms) {
      agreeTerms.checked = Boolean(payment.agreed);
    }
  }

  function updateConfirmState() {
    var enabled = Boolean(agreeTerms && agreeTerms.checked);

    if (!confirmButton) return;

    confirmButton.disabled = !enabled;
    confirmButton.classList.toggle("action-button--disabled", !enabled);
  }

  function validatePayment() {
    var selected = getSelectedMethod();

    if (!selected) {
      showToast("Vui lòng chọn phương thức thanh toán.");
      return false;
    }

    if (!agreeTerms || !agreeTerms.checked) {
      showToast("Vui lòng đồng ý với điều khoản và điều kiện.");
      return false;
    }

    var token = localStorage.getItem("accessToken");
    if (!token) {
      showToast("Bạn cần đăng nhập trước khi đặt tour.");
      return false;
    }

    return true;
  }

  async function submitBooking() {
    var payload = buildRequestData();

    console.log("SEND DATA:", payload);

    try {
      var res = await fetch("http://localhost:3000/api/bookings/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + localStorage.getItem("accessToken"),
        },
        body: JSON.stringify(payload),
      });

      var result = await res.json();

      console.log("RESULT:", result);

      if (!res.ok || !result.success) {
        showToast(result.message || "Đặt tour thất bại");
        return;
      }

      var selected = getSelectedMethod();
      var paymentMethod = selected ? selected.value : "wallet";

      sessionStorage.setItem(
        getLastBookingStorageKey(),
        JSON.stringify({
          booking_id: result.booking_id,
          booking_code: result.booking_code,
          payment_method: paymentMethod,
          customer: getStoredData().customer || {},
        }),
      );

      if (paymentMethod === "wallet") {
        var paymentRes = await fetch(
          "http://localhost:3000/api/payments/momo/" +
            result.booking_id +
            "/create",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: "Bearer " + localStorage.getItem("accessToken"),
            },
          },
        );

        var paymentResult = await paymentRes.json();

        console.log("MOMO RESULT:", paymentResult);

        if (!paymentRes.ok || !paymentResult.success) {
          showToast(paymentResult.message || "Không thể tạo thanh toán MoMo");
          return;
        }

        window.location.href = paymentResult.payUrl;
        return;
      }

      if (paymentMethod === "office") {
        showToast(
          "Đặt tour thành công. Vui lòng đến văn phòng TravelTour để thanh toán.",
        );

        window.location.href = "./success.html";
        return;
      }

      window.location.href = "./success.html";
    } catch (error) {
      console.error("PAYMENT ERROR:", error);
      showToast("Lỗi kết nối server");
    }
  }

  if (paymentForm) {
    paymentForm.addEventListener("change", function () {
      refreshSelectedMethod();
      updateTotal();
      persistPayment();
      updateConfirmState();
    });

    paymentForm.addEventListener("input", persistPayment);

    paymentForm.addEventListener("submit", async function (event) {
      event.preventDefault();

      if (!validatePayment()) {
        return;
      }

      persistPayment();
      await submitBooking();
    });
  }

  if (agreeTerms) {
    agreeTerms.addEventListener("change", function () {
      updateConfirmState();
      persistPayment();
    });
  }

  if (goBackButton) {
    goBackButton.addEventListener("click", function () {
      persistPayment();
      window.location.href = "./tuychon.html";
    });
  }

  hydratePayment();
  bindPaymentMethodClick();
  refreshSelectedMethod();
  updateTotal();
  updateConfirmState();
  renderSummary();
  renderTourCardFromMetaStep3();
})();