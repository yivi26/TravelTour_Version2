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
  var BASE_PRICE = 8500000;
  var optionForm = document.getElementById("option-form");

  var summaryGuestLine = document.getElementById("summary-guest-line");
  var summaryTourPrice = document.getElementById("summary-tour-price");
  var summaryGrandTotal = document.getElementById("summary-grand-total");
  var goBackButton = document.querySelector(".js-go-back");
  var goNextButton = document.querySelector(".js-go-next");
  var toastTimer = null;

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
    return new Intl.NumberFormat("vi-VN").format(value) + " \u20ab";
  }
  function getBookingMeta() {
    var storedData = getStoredData();
    return storedData.bookingMeta || {};
  }

  function getBasePrice() {
    var meta = getBookingMeta();

    if (Number(meta.grandTotal || 0) > 0) {
      return Number(meta.grandTotal);
    }

    return BASE_PRICE;
  }

  function getTotalGuests() {
    var meta = getBookingMeta();

    if (Number(meta.totalGuests || 0) > 0) {
      return Number(meta.totalGuests);
    }

    return 1;
  }

  function formatCurrencyMultiline(value) {
    var parts = new Intl.NumberFormat("vi-VN").format(value).split(".");

    if (parts.length >= 2) {
      return (
        parts.slice(0, parts.length - 1).join(".") +
        ".<br>" +
        parts[parts.length - 1] +
        " \u20ab"
      );
    }

    return formatCurrency(value);
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

  function refreshSelectedState() {
    document.querySelectorAll(".option-card").forEach(function (card) {
      var input = card.querySelector("input");
      card.classList.toggle("is-selected", Boolean(input && input.checked));
    });
  }

  function collectOptions() {
    var options = {};
    var extraPrice = 0;

    document
      .querySelectorAll('.option-card input[type="radio"]:checked')
      .forEach(function (input) {
        var price = Number(input.dataset.price || 0);
        options[input.name] = {
          value: input.value,
          price: price,
        };
        extraPrice += price;
      });

    return {
      selections: options,
      extraPrice: extraPrice,
    };
  }

  function persistOptions() {
    var storedData = getStoredData();
    storedData.options = collectOptions();
    setStoredData(storedData);
  }

  function updateTotal() {
    var optionData = collectOptions();

    var basePrice = getBasePrice();
    var totalGuests = getTotalGuests();

    var finalTotal = basePrice + optionData.extraPrice;

    if (summaryGuestLine) {
      summaryGuestLine.innerHTML = `Giá tour ×<br />${totalGuests} khách`;
    }

    if (summaryTourPrice) {
      summaryTourPrice.textContent = formatCurrency(basePrice);
    }

    if (summaryGrandTotal) {
      summaryGrandTotal.textContent = formatCurrency(finalTotal);
    }
  }

  function formatDate(dateStr) {
    if (!dateStr) return "";
    var d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return String(dateStr);
    return d.toLocaleDateString("vi-VN");
  }

  function renderTourCardFromMetaStep2() {
    var meta = getBookingMeta();
    var options = getStoredData().options || {};

    var img = document.getElementById("step2-tour-image");
    var title = document.getElementById("step2-tour-title");
    var locationEl = document.getElementById("step2-tour-location");
    var dateEl = document.getElementById("step2-tour-date");
    var guestsEl = document.getElementById("step2-tour-guests");
    var pricePerEl = document.getElementById("step2-tour-price-per-person");
    var totalEl = document.getElementById("step2-tour-total-price");

    var optionExtra = Number(options.extraPrice || 0);
    // Ưu tiên extra theo trạng thái form hiện tại (để đổi lựa chọn là thấy ngay)
    if (optionForm) {
      try {
        var currentOptionData = collectOptions();
        optionExtra = Number(currentOptionData.extraPrice || 0);
      } catch (e) {
        // bỏ qua, dùng options.extraPrice
      }
    }

    var pricePerPerson = Number(meta.pricePerPerson || 0) || BASE_PRICE;
    var tourTotal = Number(meta.tourTotal || 0);
    if (tourTotal <= 0) tourTotal = Number(meta.grandTotal || 0) || BASE_PRICE;

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
      guestsEl.textContent = `${meta.totalGuests || 0} khách`;
    }
    if (pricePerEl) {
      pricePerEl.textContent = formatCurrency(pricePerPerson);
    }
    if (totalEl) {
      totalEl.textContent = formatCurrency(tourTotal + optionExtra);
    }
  }

  function validateSelections() {
    var groups = ["room", "pickup", "meal"];

    for (var i = 0; i < groups.length; i += 1) {
      if (
        !optionForm.querySelector('input[name="' + groups[i] + '"]:checked')
      ) {
        showToast(
          "Vui l\u00f2ng ch\u1ecdn \u0111\u1ea7y \u0111\u1ee7 c\u00e1c t\u00f9y ch\u1ecdn c\u1ee7a tour.",
        );
        return false;
      }
    }

    return true;
  }

  function hydrateOptions() {
    var storedData = getStoredData();
    var selections =
      storedData.options && storedData.options.selections
        ? storedData.options.selections
        : {};

    Object.keys(selections).forEach(function (groupName) {
      var selectedInput = optionForm.querySelector(
        'input[name="' +
          groupName +
          '"][value="' +
          selections[groupName].value +
          '"]',
      );

      if (selectedInput) {
        selectedInput.checked = true;
      }
    });
  }

  if (optionForm) {
    optionForm.addEventListener("change", function () {
      refreshSelectedState();
      updateTotal();
      persistOptions();
    });

    optionForm.addEventListener("submit", function (event) {
      event.preventDefault();

      if (!validateSelections()) {
        return;
      }

      persistOptions();
      window.location.href = "./thanhtoan.html";
    });
  }

  if (goBackButton) {
    goBackButton.addEventListener("click", function () {
      persistOptions();
      window.location.href = "./ttkhachhang.html";
    });
  }

  if (goNextButton) {
    goNextButton.addEventListener("click", function (event) {
      if (!validateSelections()) {
        event.preventDefault();
        return;
      }

      persistOptions();
      window.location.href = "./thanhtoan.html";
    });
  }

  hydrateOptions();
  refreshSelectedState();
  updateTotal();
  renderTourCardFromMetaStep2();
})();
