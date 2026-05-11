let toursData = [];

// =========================================
// 📦 LOAD DANH SÁCH TOUR
// =========================================
async function loadTours() {
  try {
    const res = await fetch("/api/provider/tours");
    const result = await res.json();

    console.log("TOURS:", result);

    if (!res.ok) {
      console.error("API lỗi:", result);
      alert(result.message || "Không tải được danh sách tour");
      return;
    }

    // ✅ FIX Ở ĐÂY
    const tours = Array.isArray(result.data) ? result.data : [];

    if (!Array.isArray(result.data)) {
      console.error("Dữ liệu tours không hợp lệ:", result);
      return;
    }

    toursData = tours;

    renderTable(tours);
    renderStats(tours);
  } catch (err) {
    console.error("Lỗi load tours:", err);
    alert("Có lỗi xảy ra khi tải danh sách tour");
  }
}

// =========================================
// 📊 HIỂN THỊ TABLE
// =========================================
function renderTable(data) {
  const tbody = document.getElementById("tourTableBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (!Array.isArray(data) || data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center;">Không có tour nào</td>
      </tr>
    `;
    return;
  }

  data.forEach(t => {
    tbody.innerHTML += `
      <tr>
        <td>${escapeHtml(t.title || "")}</td>
        <td>${escapeHtml(t.location || "")}</td>
        <td>${formatMoney(t.display_price ?? t.final_price ?? t.base_price)}</td>
        <td>${Number(t.max_capacity || 0)}</td>
        <td>${renderStatus(t.status)}</td>
        <td>
          <button type="button" onclick="editTour(${t.id})" title="Chỉnh sửa">✏️</button>
          <button type="button" onclick="deleteTour(${t.id})" title="Xóa">🗑️</button>
          <button type="button" onclick="toggleStatus(${t.id}, '${String(t.status || "").replace(/'/g, "\\'")}')" title="Đổi trạng thái">🔄</button>
        </td>
      </tr>
    `;
  });
}

// =========================================
// ✏️ CHỈNH SỬA TOUR
// =========================================
function editTour(id) {
  if (!id) return;
  window.location.href = `./taotour.html?id=${id}`;
}

// =========================================
// 📊 STATS
// =========================================
function renderStats(data) {
  const totalTours = document.getElementById("totalTours");
  const activeTours = document.getElementById("activeTours");
  const fullTours = document.getElementById("fullTours");
  const stoppedTours = document.getElementById("stoppedTours");

  if (totalTours) totalTours.innerText = data.length;

  const active = data.filter(t => t.status === "active").length;
  const full = data.filter(t => t.status === "full").length;
  const stopped = data.filter(t => t.status === "paused").length;

  if (activeTours) activeTours.innerText = active;
  if (fullTours) fullTours.innerText = full;
  if (stoppedTours) stoppedTours.innerText = stopped;
}

// =========================================
// 🔍 SEARCH
// =========================================
const searchInput = document.getElementById("searchInput");

if (searchInput) {
  searchInput.addEventListener("input", e => {
    const keyword = String(e.target.value || "").toLowerCase().trim();

    const filtered = toursData.filter(t =>
      String(t.title || "").toLowerCase().includes(keyword) ||
      String(t.location || "").toLowerCase().includes(keyword)
    );

    renderTable(filtered);
  });
}

// =========================================
// ➕ CLICK TẠO TOUR
// =========================================
const createBtn = document.getElementById("createTourBtn");

if (createBtn) {
  createBtn.addEventListener("click", () => {
    window.location.href = "./taotour.html";
  });
}

// =========================================
// 🗑 XOÁ TOUR
// =========================================
async function deleteTour(id) {
  const confirmDelete = confirm("Bạn có chắc muốn xoá tour?");
  if (!confirmDelete) return;

  try {
    const res = await fetch(`/api/provider/tours/${id}`, {
      method: "DELETE"
    });

    const result = await res.json();

    if (!res.ok) {
      alert(result.message || "Xóa tour thất bại");
      return;
    }

    alert("Xóa tour thành công");
    loadTours();
  } catch (err) {
    console.error("Lỗi deleteTour:", err);
    alert("Có lỗi xảy ra khi xóa tour");
  }
}

// =========================================
// 🔄 ĐỔI TRẠNG THÁI
// =========================================
async function toggleStatus(id, currentStatus) {
  let newStatus = "active";

  if (currentStatus === "active") {
    newStatus = "paused";
  } else if (currentStatus === "paused") {
    newStatus = "active";
  } else if (currentStatus === "draft") {
    newStatus = "active";
  } else if (currentStatus === "archived") {
    newStatus = "active";
  }

  try {
    const res = await fetch(`/api/provider/tours/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus })
    });

    const result = await res.json();

    if (!res.ok) {
      alert(result.message || "Cập nhật trạng thái thất bại");
      return;
    }

    loadTours();
  } catch (err) {
    console.error("Lỗi toggleStatus:", err);
    alert("Có lỗi xảy ra khi cập nhật trạng thái");
  }
}

// =========================================
// 🎨 HIỂN THỊ STATUS
// =========================================
function renderStatus(status) {
  const map = {
    active: "🟢 Đang hoạt động",
    paused: "🟡 Tạm dừng",
    draft: "⚪ Nháp",
    archived: "🔴 Ngưng",
    full: "🔵 Đã đầy"
  };

  return map[status] || escapeHtml(String(status || ""));
}

// =========================================
// 💰 FORMAT TIỀN
// =========================================
function formatMoney(value) {
  return Number(value || 0).toLocaleString("vi-VN") + " đ";
}

// =========================================
// 🛡 ESCAPE HTML
// =========================================
function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// =========================================
// 🚀 INIT
// =========================================
loadTours();