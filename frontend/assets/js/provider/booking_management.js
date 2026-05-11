// booking_management.js

const STATUS_LABEL = {
  pending:          "Chờ xử lý",
  pending_payment:  "Thanh toán đang chờ xử lý",
  confirmed:        "Đã xác nhận",
  paid:             "Đã thanh toán",
  in_progress:      "Đang diễn ra",
  completed:        "Hoàn thành",
  cancelled:        "Đã hủy",
  refunded:         "Đã hoàn tiền",
};

const STATUS_BADGE = {
  pending:         "badge-warning",
  pending_payment: "badge-warning",
  confirmed:       "badge-success",
  paid:            "badge-success",
  in_progress:     "badge-info",
  completed:       "badge-success",
  cancelled:       "badge-danger",
  refunded:        "badge-danger",
};

const PAYMENT_STATUS_LABEL = {
  pending: "Chờ thanh toán",
  success: "Đã thanh toán",
  paid: "Đã thanh toán",
  failed: "Thanh toán thất bại",
  cancelled: "Đã hủy thanh toán",
  refunded: "Đã hoàn tiền",
};

const PAYMENT_METHOD_LABEL = {
  cash: "Tiền mặt",
  cod: "Thanh toán trực tiếp",
  bank_transfer: "Chuyển khoản ngân hàng",
  transfer: "Chuyển khoản ngân hàng",
  momo: "Ví MoMo",
  zalopay: "ZaloPay",
  vnpay: "VNPay",
  card: "Thẻ ngân hàng",
  credit_card: "Thẻ tín dụng",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("vi-VN").format(Number(value || 0)) + " đ";
}

function formatDate(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d)) return value;
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function badgeHtml(status) {
  const cls  = STATUS_BADGE[status]  || "badge-warning";
  const text = STATUS_LABEL[status]  || status || "—";
  return `<span class="badge ${cls}">${text}</span>`;
}

function resolvePaymentStatus(b) {
  if (b.payment_status) {
    return PAYMENT_STATUS_LABEL[b.payment_status] || b.payment_status;
  }

  if (b.booking_status === "pending_payment") return "Thanh toán đang chờ xử lý";
  if (["paid", "in_progress", "completed"].includes(b.booking_status)) return "Đã thanh toán";
  if (["cancelled", "refunded"].includes(b.booking_status)) return "Không thanh toán";
  return "Chưa ghi nhận giao dịch";
}

function resolvePaymentMethod(b) {
  if (!b.payment_method) return "Chưa cập nhật";
  return PAYMENT_METHOD_LABEL[b.payment_method] || b.payment_method;
}

function resolvePaidAt(b) {
  if (b.paid_at) return formatDate(b.paid_at);
  if (["paid", "in_progress", "completed"].includes(b.booking_status)) return "Chưa cập nhật thời gian";
  return "Chưa thanh toán";
}

function actionHtml(b) {
  const st = b.booking_status;
  let btns = `
    <button class="action-btn btn-view" title="Xem chi tiết" onclick="viewBooking(${b.booking_id})">
      <i class="fa-solid fa-eye"></i>
    </button>`;

  if (st === "pending" || st === "pending_payment") {
    btns += `
   <button class="action-btn btn-approve" title="Đã thanh toán" onclick="changeStatus(${b.booking_id},'paid')">
      <i class="fa-solid fa-check"></i>
    </button>
    <button class="action-btn btn-reject" title="Hủy booking" onclick="changeStatus(${b.booking_id},'cancelled')">
      <i class="fa-solid fa-xmark"></i>
    </button>`;
  }

  return `<div class="actions">${btns}</div>`;
}

// ───── State ─────
let allBookings = [];

// ───── Render ─────
function renderTable(list) {
  const tbody = document.getElementById("bookingTableBody");
  if (!tbody) return;

  if (!list.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" class="empty-state">Không có dữ liệu booking.</td>
      </tr>`;
    return;
  }

  tbody.innerHTML = list.map(b => `
    <tr>
      <td class="td-code">${b.booking_code || "—"}</td>
      <td class="td-customer">
        <div class="name">${b.customer_name || "—"}</div>
        <div class="phone">${b.customer_phone || ""}</div>
      </td>
      <td class="td-tour">${b.tour_title || "—"}</td>
      <td>${formatDate(b.departure_date)}</td>
      <td>${b.total_pax ?? "—"}</td>
      <td class="td-price">${formatCurrency(b.final_price)}</td>
      <td>${badgeHtml(b.booking_status)}</td>
      <td>${actionHtml(b)}</td>
    </tr>
  `).join("");
}

function renderStats(list) {
  const total     = list.length;
  const pending   = list.filter(b => b.booking_status === "pending" || b.booking_status === "pending_payment").length;
  const confirmed = list.filter(b => ["confirmed","paid","in_progress","completed"].includes(b.booking_status)).length;
  const cancelled = list.filter(b => ["cancelled","refunded"].includes(b.booking_status)).length;

  const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
  set("totalBookings",     total);
  set("pendingBookings",   pending);
  set("confirmedBookings", confirmed);
  set("cancelledBookings", cancelled);
}

// ───── Search ─────
function bindSearch() {
  const input = document.getElementById("bookingCodeSearchInput");
  const global = document.getElementById("globalSearchInput");

  function doFilter() {
    const kw = ((input ? input.value : "") + " " + (global ? global.value : "")).toLowerCase().trim();
    if (!kw) { renderTable(allBookings); return; }
    const filtered = allBookings.filter(b =>
      (b.booking_code    || "").toLowerCase().includes(kw) ||
      (b.customer_name   || "").toLowerCase().includes(kw) ||
      (b.tour_title      || "").toLowerCase().includes(kw) ||
      (b.customer_phone  || "").toLowerCase().includes(kw)
    );
    renderTable(filtered);
  }

  if (input)  input.addEventListener("input",  doFilter);
  if (global) global.addEventListener("input", doFilter);
}

// ───── API helpers ─────
async function changeStatus(bookingId, status) {
  const labels = { confirmed: "xác nhận", cancelled: "hủy" };
  if (!confirm(`Bạn có chắc muốn ${labels[status] || status} booking này không?`)) return;

  try {
    const res = await fetch(`/api/provider/bookings/${bookingId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Cập nhật thất bại");
    alert("✅ " + (data.message || "Cập nhật thành công"));
    loadBookings();
  } catch (err) {
    alert("❌ " + err.message);
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val || "—";
}

function closeModal() {
  const modal = document.getElementById("bookingDetailModal");
  if (modal) modal.style.display = "none";
  document.body.style.overflow = "";
}

function viewBooking(bookingId) {
  const b = allBookings.find(x => x.booking_id === bookingId);
  if (!b) return;

  setText("mdCode",      b.booking_code);
  setText("mdName",      b.customer_name);
  setText("mdEmail",     b.customer_email);
  setText("mdPhone",     b.customer_phone);
  setText("mdTour",      b.tour_title);
  setText("mdDepart",    formatDate(b.departure_date));
  setText("mdReturn",    formatDate(b.return_date));
  setText("mdPax",       b.total_pax != null ? b.total_pax + " khách" : null);
  setText("mdBookedAt",  formatDate(b.booked_at));
  setText("mdPayAmount", formatCurrency(b.final_price));
  setText("mdPayStatus", resolvePaymentStatus(b));
  setText("mdPayMethod", resolvePaymentMethod(b));
  setText("mdPaidAt",    resolvePaidAt(b));

  const priceEl = document.getElementById("mdPrice");
  if (priceEl) priceEl.textContent = formatCurrency(b.final_price);

  const badgeEl = document.getElementById("mdBadge");
  if (badgeEl) badgeEl.innerHTML = badgeHtml(b.booking_status);

  // Footer: nút hành động nếu còn chờ
  const footer = document.getElementById("mdFooter");
  if (footer) {
    const st = b.booking_status;
    if (st === "pending" || st === "pending_payment") {
      footer.innerHTML = `
        <button class="modal-btn modal-btn-close" onclick="closeModal()">
          <i class="fa-solid fa-xmark"></i> Đóng
        </button>
        <button class="modal-btn modal-btn-cancel" onclick="changeStatus(${b.booking_id},'cancelled');closeModal()">
          <i class="fa-solid fa-ban"></i> Hủy booking
        </button>
        <button class="modal-btn modal-btn-confirm" onclick="changeStatus(${b.booking_id},'paid');closeModal()">
          <i class="fa-solid fa-check"></i> Xác nhận
        </button>`;
    } else {
      footer.innerHTML = `
        <button class="modal-btn modal-btn-close" onclick="closeModal()">
          <i class="fa-solid fa-xmark"></i> Đóng
        </button>`;
    }
  }

  const modal = document.getElementById("bookingDetailModal");
  modal.style.display = "flex";
  document.body.style.overflow = "hidden";
}

// Đóng modal khi click ra ngoài
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("bookingDetailModal");
  if (modal) {
    modal.addEventListener("click", e => {
      if (e.target === modal) closeModal();
    });
  }
});

// ───── Load ─────
async function loadBookings() {
  try {
    const res  = await fetch("/api/provider/bookings");
    const data = await res.json();

    if (!res.ok || !Array.isArray(data)) {
      console.error("API lỗi:", data);
      document.getElementById("bookingTableBody").innerHTML =
        `<tr><td colspan="8" class="empty-state">Không thể tải dữ liệu.</td></tr>`;
      return;
    }

    allBookings = data;
    renderStats(allBookings);
    renderTable(allBookings);
  } catch (err) {
    console.error("Lỗi tải booking:", err);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadBookings();
  bindSearch();
});
