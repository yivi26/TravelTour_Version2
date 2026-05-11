let revenueChartInstance = null;
let bookingChartInstance = null;

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("vi-VN") + " đ";
}

function formatDate(dateString) {
  if (!dateString) return "--/--/----";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return dateString;
  }

  return date.toLocaleDateString("vi-VN");
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}

function renderStats(stats) {
  setText("totalTours", stats.totalTours ?? 0);
  setText("bookingsToday", stats.bookingsToday ?? 0);
  setText("activeTours", stats.activeTours ?? 0);
  setText("revenueMonth", formatCurrency(stats.revenueMonth ?? 0));

  setText("totalToursTrend", "Dữ liệu thực từ database");
  setText("bookingsTodayTrend", "Dữ liệu thực từ database");
  setText("activeToursTrend", "Dữ liệu thực từ database");
  setText("revenueMonthTrend", "Dữ liệu thực từ database");
}

function renderRecentBookings(recentBookings) {
  const container = document.getElementById("recentBookingList");
  if (!container) return;

  if (!Array.isArray(recentBookings) || recentBookings.length === 0) {
    container.innerHTML = `
      <div class="list-item">
        <div class="book-left">
          <div class="name">Chưa có booking</div>
          <div class="tour">Hiện chưa có dữ liệu booking gần đây</div>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = recentBookings
    .map(
      (item) => `
        <div class="list-item">
          <div class="book-left">
            <div class="name">${item.customer || "Khách hàng"}</div>
            <div class="tour">${item.tour || "Chưa có tên tour"}</div>
          </div>
          <div class="book-right">
            <div class="date">${formatDate(item.date)}</div>
            <div class="status ${item.statusClass || "pending"}">
              ${item.status || "Không xác định"}
            </div>
          </div>
        </div>
      `
    )
    .join("");
}

function renderUpcomingTours(upcomingTours) {
  const container = document.getElementById("upcomingTourList");
  if (!container) return;

  if (!Array.isArray(upcomingTours) || upcomingTours.length === 0) {
    container.innerHTML = `
      <div class="list-item">
        <div class="tour-item-left">
          <div class="tour-icon"><i class="fa-regular fa-clock"></i></div>
          <div class="tour-info">
            <div class="t-name">Chưa có tour</div>
            <div class="t-guide">Hiện chưa có dữ liệu tour</div>
          </div>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = upcomingTours
    .map(
      (item) => `
        <div class="list-item">
          <div class="tour-item-left">
            <div class="tour-icon"><i class="fa-regular fa-clock"></i></div>
            <div class="tour-info">
              <div class="t-name">${item.name || "Chưa có tên tour"}</div>
              <div class="t-guide">${item.guide || "Chưa có thông tin"}</div>
            </div>
          </div>
          <div class="tour-right">
            <div class="date">${formatDate(item.date)}</div>
            <div class="guests">
              <i class="fa-solid fa-users"></i> ${item.guests || "0 khách"}
            </div>
          </div>
        </div>
      `
    )
    .join("");
}

function renderCharts(charts) {
  Chart.defaults.font.family = "'Inter', sans-serif";
  Chart.defaults.color = "#9ca3af";

  const labels = charts?.labels || ["T1", "T2", "T3", "T4", "T5", "T6"];
  const revenueData = charts?.revenue || [0, 0, 0, 0, 0, 0];
  const bookingData = charts?.bookings || [0, 0, 0, 0, 0, 0];

  const barCanvas = document.getElementById("barChart");
  const lineCanvas = document.getElementById("lineChart");

  if (revenueChartInstance) {
    revenueChartInstance.destroy();
  }

  if (bookingChartInstance) {
    bookingChartInstance.destroy();
  }

  if (barCanvas) {
    const ctxBar = barCanvas.getContext("2d");

    revenueChartInstance = new Chart(ctxBar, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Doanh thu",
            data: revenueData,
            backgroundColor: "#10b981",
            borderRadius: 4,
            barPercentage: 0.6
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
                return value + "M";
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

  if (lineCanvas) {
    const ctxLine = lineCanvas.getContext("2d");

    bookingChartInstance = new Chart(ctxLine, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Booking",
            data: bookingData,
            borderColor: "#3b82f6",
            backgroundColor: "rgba(59, 130, 246, 0.14)",
            borderWidth: 2,
            pointBackgroundColor: "#ffffff",
            pointBorderColor: "#3b82f6",
            pointBorderWidth: 2,
            pointRadius: 4,
            tension: 0.35,
            fill: true
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { intersect: false, mode: "index" },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label(ctx) {
                const n = Number(ctx.parsed.y) || 0;
                return `${n} booking`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              precision: 0,
              callback: (v) => (Number.isFinite(v) ? String(Math.round(v)) : v)
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
}

async function fetchDashboardData() {
  const response = await fetch("http://localhost:3000/api/provider/dashboard");

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Không thể lấy dữ liệu dashboard");
  }

  const result = await response.json();
  return result.data;
}

async function initDashboard() {
  try {
    const dashboardData = await fetchDashboardData();

    renderStats(dashboardData.stats || {});
    renderRecentBookings(dashboardData.recentBookings || []);
    renderUpcomingTours(dashboardData.upcomingTours || []);
    renderCharts(dashboardData.charts || {});
  } catch (error) {
    console.error("Lỗi tải dashboard:", error);

    renderStats({
      totalTours: 0,
      bookingsToday: 0,
      activeTours: 0,
      revenueMonth: 0
    });
    renderRecentBookings([]);
    renderUpcomingTours([]);
    renderCharts({
      labels: ["T1", "T2", "T3", "T4", "T5", "T6"],
      revenue: [0, 0, 0, 0, 0, 0],
      bookings: [0, 0, 0, 0, 0, 0]
    });
  }
}

document.addEventListener("DOMContentLoaded", initDashboard);