let stats = [];
let upcomingTours = [];

function formatDateVN(dateString) {
  if (!dateString) return "--/--/----";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "--/--/----";
  return date.toLocaleDateString("vi-VN");
}

function formatMoneyShort(value) {
  const num = Number(value || 0);
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  return new Intl.NumberFormat("vi-VN").format(num);
}

function mapTourStatus(status) {
  const map = {
    active: "Sắp diễn ra",
    paused: "Tạm dừng",
    full: "Đã đủ khách",
    archived: "Hoàn thành"
  };
  return map[status] || status || "Không xác định";
}

async function fetchGuideDashboard() {
  const response = await fetch("/api/guide/dashboard", {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || "Không thể tải dashboard guide");
  }

  return result.data || {};
}

function renderStats() {
  const statsGrid = document.getElementById("statsGrid");
  if (!statsGrid) return;

  statsGrid.innerHTML = stats
    .map(
      (stat) => `
        <div class="stat-card ${stat.colorClass}">
          <div class="stat-inner">
            <div>
              <p class="stat-title">${stat.title}</p>
              <p class="stat-value">${stat.value}</p>
            </div>
            <div class="stat-icon-box">
              <span class="stat-icon">${stat.icon}</span>
            </div>
          </div>
        </div>
      `
    )
    .join("");
}

function renderUpcomingTours() {
  const upcomingToursList = document.getElementById("upcomingToursList");
  if (!upcomingToursList) return;

  if (!Array.isArray(upcomingTours) || upcomingTours.length === 0) {
    upcomingToursList.innerHTML = `
      <div class="empty-state">Hiện chưa có tour sắp diễn ra.</div>
    `;
    return;
  }

  upcomingToursList.innerHTML = upcomingTours
    .map(
      (tour) => `
        <div class="upcoming-item">
          <div class="upcoming-left">
            <h4 class="upcoming-name">${tour.name}</h4>
            <div class="upcoming-meta">
              <span>📅 ${tour.date}</span>
              <span>🕐 ${tour.time}</span>
              <span>👥 ${tour.customers} khách</span>
              <span>📍 ${tour.location}</span>
            </div>
          </div>
          <span class="upcoming-status">${tour.status}</span>
        </div>
      `
    )
    .join("");
}

function renderQuickActions() {
  const quickActionsGrid = document.getElementById("quickActionsGrid");
  if (!quickActionsGrid) return;

  const quickActions = [
    {
      title: "Lịch trình của tôi",
      desc: `Bạn có ${upcomingTours.length} tour sắp tới`,
      btnText: "Xem chi tiết",
      cardClass: "action-green",
      action: "today-schedule"
    },
    {
      title: "Tour đang dẫn",
      desc: "Theo dõi các tour đã được phân công",
      btnText: "Xem tour",
      cardClass: "action-blue",
      action: "my-tours"
    },
    {
      title: "Hồ sơ cá nhân",
      desc: "Cập nhật thông tin hướng dẫn viên",
      btnText: "Cập nhật",
      cardClass: "action-yellow",
      action: "profile"
    }
  ];

  quickActionsGrid.innerHTML = quickActions
    .map(
      (item) => `
        <div class="action-card ${item.cardClass}">
          <h4>${item.title}</h4>
          <p>${item.desc}</p>
          <button class="action-btn" data-action="${item.action}">
            ${item.btnText}
          </button>
        </div>
      `
    )
    .join("");
}

function bindEvents() {
  const logoutBtn = document.getElementById("logoutBtn");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      window.location.href = "http://localhost:3000/login";
    });
  }

  document.addEventListener("click", function (event) {
    const button = event.target.closest("[data-action]");
    if (!button) return;

    const action = button.getAttribute("data-action");

    if (action === "today-schedule") {
      window.location.href = "lichtrinh.html";
    }

    if (action === "my-tours") {
      window.location.href = "tourdangdan.html";
    }

    if (action === "profile") {
      window.location.href = "hosocanhan.html";
    }
  });
}

async function initPage() {
  try {
    const data = await fetchGuideDashboard();
    const dashboardStats = data.stats || {};
    const dashboardUpcomingTours = Array.isArray(data.upcomingTours) ? data.upcomingTours : [];

    stats = [
      {
        title: "Tour đang dẫn",
        value: String(dashboardStats.activeTours || 0),
        icon: "📍",
        colorClass: "stat-blue"
      },
      {
        title: "Tổng số khách",
        value: String(dashboardStats.totalCustomers || 0),
        icon: "👥",
        colorClass: "stat-green"
      },
      {
        title: "Thu nhập tháng",
        value: formatMoneyShort(dashboardStats.monthlyIncome || 0),
        icon: "💰",
        colorClass: "stat-yellow"
      },
      {
        title: "Tour đã hoàn thành",
        value: String(dashboardStats.completedTours || 0),
        icon: "✅",
        colorClass: "stat-purple"
      }
    ];

    upcomingTours = dashboardUpcomingTours.map((tour) => {
      const startDate = new Date(tour.start_date);
      const validDate = !Number.isNaN(startDate.getTime());

      return {
        id: tour.id,
        name: tour.title || "Chưa có tên tour",
        date: validDate ? startDate.toLocaleDateString("vi-VN") : "--/--/----",
        time: validDate
          ? startDate.toLocaleTimeString("vi-VN", {
              hour: "2-digit",
              minute: "2-digit"
            })
          : "--:--",
        customers: Number(tour.max_capacity || 0),
        location: tour.location || "Chưa cập nhật",
        status: mapTourStatus(tour.status)
      };
    });

    renderStats();
    renderUpcomingTours();
    renderQuickActions();
    bindEvents();
  } catch (error) {
    console.error("Lỗi tải dashboard guide:", error);

    const statsGrid = document.getElementById("statsGrid");
    const upcomingToursList = document.getElementById("upcomingToursList");
    const quickActionsGrid = document.getElementById("quickActionsGrid");

    if (statsGrid) {
      statsGrid.innerHTML = `<div class="empty-state">Không tải được thống kê.</div>`;
    }

    if (upcomingToursList) {
      upcomingToursList.innerHTML = `<div class="empty-state">Không tải được tour sắp diễn ra.</div>`;
    }

    if (quickActionsGrid) {
      quickActionsGrid.innerHTML = `<div class="empty-state">Không tải được thao tác nhanh.</div>`;
    }
  }
}

document.addEventListener("DOMContentLoaded", initPage);