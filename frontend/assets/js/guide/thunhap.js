let barChartInstance = null;
let lineChartInstance = null;
let incomeApiData = null;

function formatMoneyShort(value) {
  const num = Number(value || 0);
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  }
  return new Intl.NumberFormat("vi-VN").format(num);
}

function formatMoneyMillion(value) {
  return Number((Number(value || 0) / 1000000).toFixed(1));
}

function formatDateVN(dateString) {
  if (!dateString) return "--/--/----";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "--/--/----";
  return date.toLocaleDateString("vi-VN");
}

async function fetchIncomeData(range = 6) {
  const response = await fetch(`/api/guide/income?range=${encodeURIComponent(range)}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  });

  const result = await response.json().catch(() => ({}));

 if (!response.ok) {
  throw new Error(result.error || result.message || "Không thể tải dữ liệu thu nhập");
}
  return result.data || {};
}

function renderIncomeStats(data) {
  const container = document.getElementById("incomeStatsGrid");
  if (!container) return;

  const stats = [
    {
      icon: "💵",
      iconClass: "icon-green",
      label: "Tổng thu nhập",
      value: formatMoneyShort(data?.stats?.totalIncome || 0),
      note: "Tổng thu nhập từ các tour đã được giao",
      noteClass: ""
    },
    {
      icon: "📅",
      iconClass: "icon-blue",
      label: "Thu nhập tháng này",
      value: formatMoneyShort(data?.stats?.monthlyIncome || 0),
      note: `Từ ${data?.stats?.completedTours || 0} tour đã hoàn thành`,
      noteClass: ""
    },
    {
      icon: "💰",
      iconClass: "icon-yellow",
      label: "Thu nhập trung bình/tour",
      value: formatMoneyShort(data?.stats?.averageIncomePerTour || 0),
      note: "Dựa trên dữ liệu các tour gần đây",
      noteClass: ""
    }
  ];

  container.innerHTML = stats
    .map(
      (item) => `
        <div class="income-stat-card">
          <div class="income-stat-top">
            <div class="income-stat-icon-box ${item.iconClass}">
              ${item.icon}
            </div>
            <div>
              <p class="income-stat-label">${item.label}</p>
              <p class="income-stat-value">${item.value}</p>
            </div>
          </div>
          <p class="income-stat-note ${item.noteClass}">${item.note}</p>
        </div>
      `
    )
    .join("");
}

function renderTransactions(data) {
  const container = document.getElementById("transactionList");
  if (!container) return;

  const transactions = Array.isArray(data?.recentTransactions)
    ? data.recentTransactions
    : [];

  if (!transactions.length) {
    container.innerHTML = `
      <div class="empty-state">Chưa có giao dịch gần đây.</div>
    `;
    return;
  }

  container.innerHTML = transactions
    .map(
      (item) => `
        <div class="transaction-item">
          <div class="transaction-left">
            <p>${item.tour}</p>
            <p class="transaction-date">${formatDateVN(item.date)}</p>
          </div>
          <div class="transaction-right">
            <div class="transaction-amount">${formatMoneyShort(item.amount)}</div>
            <span class="transaction-status">${item.status}</span>
          </div>
        </div>
      `
    )
    .join("");
}

function buildCharts(data) {
  const monthlyIncome = Array.isArray(data?.monthlyIncome) ? data.monthlyIncome : [];

  const labels = monthlyIncome.map((item) => `T${item.monthNumber}`);
  const values = monthlyIncome.map((item) => formatMoneyMillion(item.income));

  const barCtx = document.getElementById("incomeBarChart");
  const lineCtx = document.getElementById("incomeLineChart");

  if (!barCtx || !lineCtx || typeof Chart === "undefined") return;

  if (barChartInstance) {
    barChartInstance.destroy();
  }

  if (lineChartInstance) {
    lineChartInstance.destroy();
  }

  barChartInstance = new Chart(barCtx, {
    type: "bar",
    data: {
      labels,
      datasets: [
        {
          label: "Thu nhập",
          data: values,
          backgroundColor: "#10b981",
          borderRadius: 8,
          maxBarThickness: 48
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.raw}M VNĐ`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return value + "M";
            }
          }
        }
      }
    }
  });

  lineChartInstance = new Chart(lineCtx, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Thu nhập",
          data: values,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.12)",
          fill: true,
          tension: 0.35,
          pointRadius: 5,
          pointBackgroundColor: "#10b981",
          pointBorderColor: "#ffffff",
          pointBorderWidth: 2
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `${context.raw}M VNĐ`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            callback: function (value) {
              return value + "M";
            }
          }
        }
      }
    }
  });
}

function bindEvents() {
  const rangeSelect = document.getElementById("rangeSelect");
  const logoutBtn = document.getElementById("logoutBtn");

  if (rangeSelect) {
    rangeSelect.addEventListener("change", async function () {
      try {
        incomeApiData = await fetchIncomeData(Number(this.value));
        renderIncomeStats(incomeApiData);
        renderTransactions(incomeApiData);
        buildCharts(incomeApiData);
      } catch (error) {
        console.error("Lỗi đổi khoảng thời gian:", error);
        alert(error.message || "Không thể tải dữ liệu thu nhập");
      }
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      window.location.href = "http://localhost:3000/login";
    });
  }
}

async function initPage() {
  try {
    incomeApiData = await fetchIncomeData(6);
    renderIncomeStats(incomeApiData);
    renderTransactions(incomeApiData);
    buildCharts(incomeApiData);
    bindEvents();
  } catch (error) {
    console.error("Lỗi tải dữ liệu thu nhập:", error);

    const statsGrid = document.getElementById("incomeStatsGrid");
    const transactionList = document.getElementById("transactionList");

    if (statsGrid) {
      statsGrid.innerHTML = `<div class="empty-state">Không tải được thống kê thu nhập.</div>`;
    }

    if (transactionList) {
      transactionList.innerHTML = `<div class="empty-state">Không tải được giao dịch gần đây.</div>`;
    }
  }
}

document.addEventListener("DOMContentLoaded", initPage);