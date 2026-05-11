const profileStats = [
  {
    value: "342",
    label: "Tour đã dẫn",
    className: "value-green",
  },
  {
    value: "4.9",
    label: "Đánh giá trung bình",
    className: "value-blue",
  },
  {
    value: "8",
    label: "Năm kinh nghiệm",
    className: "value-purple",
  },
  {
    value: "98%",
    label: "Khách hài lòng",
    className: "value-yellow",
  },
];

function renderProfileStats() {
  const container = document.getElementById("profileStatsGrid");
  if (!container) return;

  container.innerHTML = profileStats
    .map(
      (item) => `
    <div class="profile-stat-card">
      <p class="profile-stat-value ${item.className}">${item.value}</p>
      <p class="profile-stat-label">${item.label}</p>
    </div>
  `,
    )
    .join("");
}

function bindEvents() {
  const editBtn = document.getElementById("editBtn");
  const cameraBtn = document.getElementById("cameraBtn");
  const logoutBtn = document.getElementById("logoutBtn");

  if (editBtn) {
    editBtn.addEventListener("click", function () {
      alert("Chức năng chỉnh sửa hồ sơ sẽ làm tiếp sau.");
    });
  }

  if (cameraBtn) {
    cameraBtn.addEventListener("click", function () {
      alert("Chức năng đổi ảnh đại diện sẽ làm tiếp sau.");
    });
  }

  if (logoutBtn) {
    logoutBtn.addEventListener("click", function () {
      alert("Đăng xuất");
    });
  }
}

document.addEventListener("DOMContentLoaded", function () {
  renderProfileStats();
  bindEvents();
});
