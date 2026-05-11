(function () {
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

  function getLastBooking() {
    try {
      return (
        JSON.parse(sessionStorage.getItem(getLastBookingStorageKey())) || {}
      );
    } catch (error) {
      return {};
    }
  }

  var data = getLastBooking();

  var bookingCode = document.getElementById("booking-code");
  var customerName = document.getElementById("customer-name");
  var customerEmail = document.getElementById("customer-email");
  var paymentMethod = document.getElementById("payment-method");
  var officeNote = document.getElementById("office-note");
  var successTitle = document.getElementById("success-title");
  var successDesc = document.getElementById("success-desc");

  if (bookingCode) {
    bookingCode.textContent = data.booking_code || "---";
  }

  if (customerName) {
    customerName.textContent = data.customer?.name || "---";
  }

  if (customerEmail) {
    customerEmail.textContent = data.customer?.email || "---";
  }

  if (paymentMethod) {
    paymentMethod.textContent =
      data.payment_method === "office"
        ? "Thanh toán tại văn phòng"
        : "Ví điện tử";
  }

  if (officeNote && data.payment_method === "office") {
    officeNote.style.display = "block";
  }
  if (data.payment_method === "office") {
    if (successTitle) {
      successTitle.textContent = "Đặt tour thành công - Thanh toán đang chờ xử lý!";
    }

    if (successDesc) {
      successDesc.textContent = "Booking của bạn đã được ghi nhận.";
    }

    if (officeNote) {
      officeNote.textContent =
        "Vui lòng đến văn phòng TravelTour để hoàn tất thanh toán.";
      officeNote.style.display = "block";
    }
  } else {
    if (successTitle) {
      successTitle.textContent = "Thanh toán thành công!";
    }

    if (successDesc) {
      successDesc.textContent = "Cảm ơn bạn đã thanh toán qua ví điện tử.";
    }

    if (officeNote) {
      officeNote.style.display = "none";
    }
  }
})();
