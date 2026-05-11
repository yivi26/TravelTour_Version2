// assets/js/guide/guideTopbar.js

function getGuideAvatarUrl(fullName) {
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(
    fullName || "User"
  )}&background=16a34a&color=fff`;
}

async function loadGuideTopbar() {
  try {
    const response = await fetch("/api/guide/profile", {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    const result = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(result.message || "Không thể tải thông tin guide");
    }

    const profile = result.data || {};
    const fullName = profile.fullName || profile.full_name || "Chưa cập nhật";
    const role = profile.role || "Hướng dẫn viên";

    const topbarUserName = document.getElementById("topbarUserName");
    const topbarUserRole = document.getElementById("topbarUserRole");
    const topbarUserAvatar = document.getElementById("topbarUserAvatar");

    if (topbarUserName) topbarUserName.textContent = fullName;
    if (topbarUserRole) topbarUserRole.textContent = role;

    if (topbarUserAvatar) {
      topbarUserAvatar.src = profile.avatarUrl || getGuideAvatarUrl(fullName);
      topbarUserAvatar.alt = fullName;
    }
  } catch (error) {
    console.error("Không tải được topbar guide:", error);

    const topbarUserName = document.getElementById("topbarUserName");
    const topbarUserRole = document.getElementById("topbarUserRole");
    const topbarUserAvatar = document.getElementById("topbarUserAvatar");

    if (topbarUserName) topbarUserName.textContent = "Chưa cập nhật";
    if (topbarUserRole) topbarUserRole.textContent = "Hướng dẫn viên";

    if (topbarUserAvatar) {
      topbarUserAvatar.src = getGuideAvatarUrl("User");
      topbarUserAvatar.alt = "Guide Avatar";
    }
  }
}

document.addEventListener("DOMContentLoaded", loadGuideTopbar);