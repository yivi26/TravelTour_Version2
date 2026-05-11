let profileData = null;

function formatDateVN(dateString) {
  if (!dateString) return "Chưa cập nhật";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Chưa cập nhật";
  return date.toLocaleDateString("vi-VN");
}

function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return "HĐV";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function formatRating(value) {
  const num = Number(value || 0);
  return num > 0 ? num.toFixed(1) : "0.0";
}

async function fetchGuideProfile() {
  const response = await fetch("/api/guide/profile", {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  });

  const result = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(result.message || "Không thể tải hồ sơ hướng dẫn viên");
  }

  return result.data || null;
}

function renderHeader(data) {
  const fullName = data.fullName || data.full_name || "Chưa cập nhật";
  const role = data.role || "Hướng dẫn viên du lịch";

  const topbarUserName = document.getElementById("topbarUserName");
  const topbarUserRole = document.getElementById("topbarUserRole");
  const topbarUserAvatar = document.getElementById("topbarUserAvatar");

  const profileAvatarText = document.getElementById("profileAvatarText");
  const profileFullName = document.getElementById("profileFullName");
  const profileRole = document.getElementById("profileRole");
  const profileBadgeText = document.getElementById("profileBadgeText");
  const profileRatingText = document.getElementById("profileRatingText");

  if (topbarUserName) topbarUserName.textContent = fullName;
  if (topbarUserRole) topbarUserRole.textContent = role;

  if (topbarUserAvatar) {
    topbarUserAvatar.src =
      data.avatarUrl ||
      `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=16a34a&color=fff`;
    topbarUserAvatar.alt = fullName;
  }

  if (profileAvatarText) {
    profileAvatarText.textContent = getInitials(fullName);
  }

  if (profileFullName) {
    profileFullName.textContent = fullName;
  }

  if (profileRole) {
    profileRole.textContent = role;
  }

  if (profileBadgeText) {
    profileBadgeText.textContent =
      data.badgeText || "Hướng dẫn viên chuyên nghiệp";
  }

  if (profileRatingText) {
    profileRatingText.textContent = `⭐ ${formatRating(data.rating)}/5.0 (${
      data.reviewCount || 0
    } đánh giá)`;
  }
}

function renderPersonalInfo(data) {
  const infoFullName = document.getElementById("infoFullName");
  const infoPhone = document.getElementById("infoPhone");
  const infoEmail = document.getElementById("infoEmail");
  const infoBirthDate = document.getElementById("infoBirthDate");
  const infoAddress = document.getElementById("infoAddress");

  if (infoFullName) infoFullName.textContent = data.fullName || "Chưa cập nhật";
  if (infoPhone) infoPhone.textContent = data.phone || "Chưa cập nhật";
  if (infoEmail) infoEmail.textContent = data.email || "Chưa cập nhật";
  if (infoBirthDate) infoBirthDate.textContent = formatDateVN(data.birthDate);
  if (infoAddress) infoAddress.textContent = data.address || "Chưa cập nhật";
}

function renderProfessionalInfo(data) {
  const infoExperience = document.getElementById("infoExperience");
  const certificateList = document.getElementById("certificateList");
  const specialtyTagList = document.getElementById("specialtyTagList");
  const languageList = document.getElementById("languageList");

  if (infoExperience) {
    infoExperience.textContent = `${data.experienceYears || 0} năm kinh nghiệm hướng dẫn viên du lịch`;
  }

  if (certificateList) {
    const certificates = Array.isArray(data.certificates) ? data.certificates : [];
    certificateList.innerHTML = certificates.length
      ? certificates
          .map(
            (item) => `
              <div class="certificate-item">
                <span class="dot green-dot"></span>
                <span>${typeof item === "string" ? item : item.name || "Chứng chỉ"}</span>
              </div>
            `
          )
          .join("")
      : `<div class="certificate-item"><span>Chưa cập nhật chứng chỉ</span></div>`;
  }

  if (specialtyTagList) {
    const specialties = Array.isArray(data.specialties) ? data.specialties : [];
    const colorClasses = ["green-tag", "blue-tag", "purple-tag", "yellow-tag"];

    specialtyTagList.innerHTML = specialties.length
      ? specialties
          .map((item, index) => {
            const text = typeof item === "string" ? item : item.name || "Chuyên môn";
            const className = colorClasses[index % colorClasses.length];
            return `<span class="tag ${className}">${text}</span>`;
          })
          .join("")
      : `<span class="tag green-tag">Chưa cập nhật</span>`;
  }

  if (languageList) {
    const languages = Array.isArray(data.languages) ? data.languages : [];
    languageList.innerHTML = languages.length
      ? languages
          .map((item) => {
            const name = typeof item === "string" ? item : item.name || "Ngôn ngữ";
            const level = typeof item === "string" ? "Chưa cập nhật" : item.level || "Chưa cập nhật";
            const levelClass =
              level.toLowerCase().includes("bản ngữ") || level.toLowerCase().includes("thành thạo")
                ? "green-text"
                : "yellow-text";

            return `
              <div class="language-row">
                <span>${name}</span>
                <span class="lang-level ${levelClass}">${level}</span>
              </div>
            `;
          })
          .join("")
      : `<div class="language-row"><span>Chưa cập nhật</span><span class="lang-level yellow-text">--</span></div>`;
  }
}

function renderProfileStats(data) {
  const container = document.getElementById("profileStatsGrid");
  if (!container) return;

  const stats = [
    {
      value: String(data?.stats?.totalTours || 0),
      label: "Tour đã dẫn",
      className: "value-green"
    },
    {
      value: formatRating(data?.stats?.averageRating || 0),
      label: "Đánh giá trung bình",
      className: "value-blue"
    },
    {
      value: String(data?.stats?.experienceYears || 0),
      label: "Năm kinh nghiệm",
      className: "value-purple"
    },
    {
      value: `${data?.stats?.satisfactionRate || 0}%`,
      label: "Khách hài lòng",
      className: "value-yellow"
    }
  ];

  container.innerHTML = stats
    .map(
      (item) => `
        <div class="profile-stat-card">
          <p class="profile-stat-value ${item.className}">${item.value}</p>
          <p class="profile-stat-label">${item.label}</p>
        </div>
      `
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
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      window.location.href = "http://localhost:3000/login";
    });
  }
}

async function initPage() {
  try {
    profileData = await fetchGuideProfile();

    if (!profileData) {
      throw new Error("Không có dữ liệu hồ sơ");
    }

    renderHeader(profileData);
    renderPersonalInfo(profileData);
    renderProfessionalInfo(profileData);
    renderProfileStats(profileData);
    bindEvents();
  } catch (error) {
    console.error("Lỗi tải hồ sơ guide:", error);

    const profileStatsGrid = document.getElementById("profileStatsGrid");
    if (profileStatsGrid) {
      profileStatsGrid.innerHTML = `
        <div class="empty-state">Không tải được dữ liệu hồ sơ.</div>
      `;
    }
  }
}

document.addEventListener("DOMContentLoaded", initPage);