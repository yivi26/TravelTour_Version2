Chart.defaults.font.family = "'Inter', sans-serif";
Chart.defaults.color = "#9ca3af";

let revenueChartInstance = null;
let bookingChartInstance = null;
let pieChartInstance = null;

let reportData = {
  stats: {},
  monthlyRevenue: [],
  monthlyBookings: [],
  topTours: [],
  revenueTable: [],
  popularTours: []
};

const chartColors = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1"
];

function formatCurrencyVND(value) {
  return new Intl.NumberFormat("vi-VN").format(Number(value || 0)) + " đ";
}

function formatCompactMoney(value) {
  const amount = Number(value || 0);

  if (amount >= 1000000000) {
    return `${(amount / 1000000000).toFixed(2)} B đ`;
  }

  if (amount >= 1000000) {
    return `${Math.round(amount / 1000000)} M đ`;
  }

  return formatCurrencyVND(amount);
}

function fetchJsonSafe(response) {
  return response.json().catch(() => ({}));
}

async function fetchReportData() {
  const response = await fetch("/api/provider/report", {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  });

  const data = await fetchJsonSafe(response);

  if (!response.ok) {
    throw new Error(data.message || "Không thể tải báo cáo doanh thu");
  }

  return data;
}

function renderStats(stats) {
  const totalRevenue6MonthsEl = document.getElementById("totalRevenue6Months");
  const totalBookingsEl = document.getElementById("totalBookings");
  const avgRevenuePerMonthEl = document.getElementById("avgRevenuePerMonth");
  const totalCustomersEl = document.getElementById("totalCustomers");

  const totalRevenueTrendEl = document.getElementById("totalRevenueTrend");
  const totalBookingsTrendEl = document.getElementById("totalBookingsTrend");
  const avgRevenueTrendEl = document.getElementById("avgRevenueTrend");
  const totalCustomersTrendEl = document.getElementById("totalCustomersTrend");

  const totalRevenue = Number(stats.totalRevenue6Months || 0);
  const totalBookings = Number(stats.totalBookings || 0);
  const avgRevenue = Number(stats.avgRevenuePerMonth || 0);
  const totalCustomers = Number(stats.totalCustomers || 0);

  if (totalRevenue6MonthsEl) {
    totalRevenue6MonthsEl.textContent = formatCompactMoney(totalRevenue);
  }

  if (totalBookingsEl) {
    totalBookingsEl.textContent = new Intl.NumberFormat("vi-VN").format(totalBookings);
  }

  if (avgRevenuePerMonthEl) {
    avgRevenuePerMonthEl.textContent = formatCompactMoney(avgRevenue);
  }

  if (totalCustomersEl) {
    totalCustomersEl.textContent = new Intl.NumberFormat("vi-VN").format(totalCustomers);
  }

  if (totalRevenueTrendEl) {
    totalRevenueTrendEl.textContent = "Tổng doanh thu của 6 tháng gần nhất";
  }

  if (totalBookingsTrendEl) {
    totalBookingsTrendEl.textContent = "Tổng booking phát sinh trong 6 tháng gần nhất";
  }

  if (avgRevenueTrendEl) {
    avgRevenueTrendEl.textContent = "Doanh thu trung bình mỗi tháng";
  }

  if (totalCustomersTrendEl) {
    totalCustomersTrendEl.textContent = "Số khách hàng phát sinh booking";
  }
}

function renderTopTours(topTours) {
  const container = document.getElementById("topTours");
  if (!container) return;

  if (!Array.isArray(topTours) || topTours.length === 0) {
    container.innerHTML = `
      <div class="empty-state">Chưa có dữ liệu top tour.</div>
    `;
    return;
  }

  container.innerHTML = topTours
    .map((item, index) => {
      const rank = index + 1;
      return `
        <div class="top-item">
          <div class="ti-number num-${rank}">${rank}</div>
          <div class="ti-info">
            <div class="ti-name">${item.name || "Chưa có tên tour"}</div>
            <div class="ti-bookings">${item.bookings || 0} booking</div>
          </div>
          <div class="ti-revenue">${formatCurrencyVND(item.revenue || 0)}</div>
        </div>
      `;
    })
    .join("");
}

function renderRevenueTable(rows) {
  const tbody = document.getElementById("revenueTableBody");
  if (!tbody) return;

  if (!Array.isArray(rows) || rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center;">Chưa có dữ liệu doanh thu theo tour.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = rows
    .map((item, index) => {
      const color = chartColors[index % chartColors.length];

      return `
        <tr>
          <td class="td-name">
            <span class="color-dot" style="background:${color}"></span>
            ${item.name || "Chưa có tên tour"}
          </td>
          <td>${item.bookings || 0} booking</td>
          <td class="td-revenue">${formatCurrencyVND(item.revenue || 0)}</td>
          <td>${item.rate || "0%"}</td>
        </tr>
      `;
    })
    .join("");
}

function renderBarChart(monthlyRevenue) {
  const ctx = document.getElementById("barChart");
  if (!ctx) return;

  if (revenueChartInstance) {
    revenueChartInstance.destroy();
  }

  const labels =
    Array.isArray(monthlyRevenue) && monthlyRevenue.length > 0
      ? monthlyRevenue.map((item) => item.label)
      : ["T1", "T2", "T3", "T4", "T5", "T6"];

  const data =
    Array.isArray(monthlyRevenue) && monthlyRevenue.length > 0
      ? monthlyRevenue.map((item) => Number(item.value || 0))
      : [0, 0, 0, 0, 0, 0];

  revenueChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Doanh thu",
          data,
          backgroundColor: "#10b981",
          borderRadius: 4,
          barPercentage: 0.7
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback(value) {
              return `${value}M`;
            }
          },
          border: { display: false },
          grid: {
            color: "#f3f4f6",
            drawTicks: false
          }
        },
        x: {
          grid: { display: false },
          border: { display: false }
        }
      }
    }
  });
}

function renderLineChart(monthlyBookings) {
  const ctx = document.getElementById("lineChart");
  if (!ctx) return;

  if (bookingChartInstance) {
    bookingChartInstance.destroy();
  }

  const labels =
    Array.isArray(monthlyBookings) && monthlyBookings.length > 0
      ? monthlyBookings.map((item) => item.label)
      : ["T1", "T2", "T3", "T4", "T5", "T6"];

  const data =
    Array.isArray(monthlyBookings) && monthlyBookings.length > 0
      ? monthlyBookings.map((item) => Number(item.value || 0))
      : [0, 0, 0, 0, 0, 0];

  bookingChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Booking",
          data,
          borderColor: "#3b82f6",
          backgroundColor: "#ffffff",
          borderWidth: 3,
          pointBackgroundColor: "#3b82f6",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2,
          pointRadius: 5,
          tension: 0.1
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          },
          border: { display: false },
          grid: {
            color: "#f3f4f6",
            drawTicks: false
          }
        },
        x: {
          grid: {
            color: "#f3f4f6",
            drawTicks: false
          },
          border: { display: false }
        }
      }
    }
  });
}

function renderPieChart(popularTours) {
  const ctx = document.getElementById("pieChart");
  if (!ctx) return;

  if (pieChartInstance) {
    pieChartInstance.destroy();
  }

  const labels =
    Array.isArray(popularTours) && popularTours.length > 0
      ? popularTours.map((item) => item.name || "Không tên")
      : ["Chưa có dữ liệu"];

  const data =
    Array.isArray(popularTours) && popularTours.length > 0
      ? popularTours.map((item) => Number(item.value || 0))
      : [1];

  const backgroundColor =
    Array.isArray(popularTours) && popularTours.length > 0
      ? popularTours.map((_, index) => chartColors[index % chartColors.length])
      : ["#d1d5db"];

  pieChartInstance = new Chart(ctx, {
    type: "pie",
    data: {
      labels,
      datasets: [
        {
          data,
          backgroundColor,
          borderWidth: 1,
          borderColor: "#ffffff"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom"
        }
      }
    }
  });
}

function getFilteredReport(keyword) {
  const normalizedKeyword = keyword.trim().toLowerCase();

  if (!normalizedKeyword) {
    return {
      topTours: reportData.topTours,
      revenueTable: reportData.revenueTable,
      popularTours: reportData.popularTours
    };
  }

  return {
    topTours: reportData.topTours.filter((item) =>
      String(item.name || "").toLowerCase().includes(normalizedKeyword)
    ),
    revenueTable: reportData.revenueTable.filter((item) =>
      String(item.name || "").toLowerCase().includes(normalizedKeyword)
    ),
    popularTours: reportData.popularTours.filter((item) =>
      String(item.name || "").toLowerCase().includes(normalizedKeyword)
    )
  };
}

function updateFilteredView() {
  const input = document.getElementById("globalSearchInput");
  const keyword = input ? input.value : "";

  const filtered = getFilteredReport(keyword);

  renderTopTours(filtered.topTours);
  renderRevenueTable(filtered.revenueTable);
  renderPieChart(filtered.popularTours);
}

function bindEvents() {
  const input = document.getElementById("globalSearchInput");
  if (!input) return;

  input.addEventListener("input", updateFilteredView);
}

function renderAll(data) {
  reportData = {
    stats: data.stats || {},
    monthlyRevenue: data.monthlyRevenue || [],
    monthlyBookings: data.monthlyBookings || [],
    topTours: data.topTours || [],
    revenueTable: data.revenueTable || [],
    popularTours: data.popularTours || []
  };

  renderStats(reportData.stats);
  renderBarChart(reportData.monthlyRevenue);
  renderLineChart(reportData.monthlyBookings);
  updateFilteredView();
}

function renderErrorState(message) {
  const topTours = document.getElementById("topTours");
  const revenueTableBody = document.getElementById("revenueTableBody");

  if (topTours) {
    topTours.innerHTML = `<div class="empty-state">${message}</div>`;
  }

  if (revenueTableBody) {
    revenueTableBody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align:center;">${message}</td>
      </tr>
    `;
  }

  renderBarChart([]);
  renderLineChart([]);
  renderPieChart([]);
}

async function initPage() {
  try {
    bindEvents();
    const data = await fetchReportData();
    renderAll(data);
  } catch (error) {
    console.error("Lỗi tải báo cáo doanh thu:", error);
    renderErrorState("Không tải được dữ liệu báo cáo thực.");
  }
}

document.addEventListener("DOMContentLoaded", initPage);