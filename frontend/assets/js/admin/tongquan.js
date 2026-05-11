(async function () {
  const DEFAULT_NAV = [
    { label: "Tổng quan", href: "tongquan.html", active: true },
    { label: "Quản lý người dùng", href: "qlinguoidung.html" },
    { label: "Quản lý nhà cung cấp tour", href: "qlinhacungcap.html" },
    { label: "Quản lý hướng dẫn viên", href: "hdv.html" },
    { label: "Quản lý tour", href: "qlitour.html" },
    { label: "Quản lý booking", href: "qlibooking.html" },
    { label: "Quản lý đánh giá", href: "qlidanhgia.html" },
    { label: "Báo cáo & thống kê", href: "baocao.html" },
    { label: "Cài đặt hệ thống", href: "caidat.html" }
  ];

  const DEFAULT_USER = {
    name: "Admin User",
    email: "admin@traveltour.vn",
    initials: "AD"
  };

  async function fetchDashboardData() {
    const res = await fetch("/api/admin/dashboard", { method: "GET" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || "Không tải được dữ liệu tổng quan");
    return json?.data || {};
  }

  let data = {};
  try {
    data = await fetchDashboardData();
  } catch (err) {
    console.error("Không lấy được dashboard:", err?.message || err);
    data = window.tongQuanData || {};
  }

  if (!Array.isArray(data.nav)) data.nav = DEFAULT_NAV;
  if (!data.user) data.user = DEFAULT_USER;

  const navIcons = {
    grid: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 2.5H3.333A.833.833 0 0 0 2.5 3.333v5.834c0 .46.373.833.833.833H7.5c.46 0 .833-.373.833-.833V3.333A.833.833 0 0 0 7.5 2.5Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.667 2.5H12.5a.833.833 0 0 0-.833.833v2.5c0 .46.373.834.833.834h4.167c.46 0 .833-.373.833-.834v-2.5a.833.833 0 0 0-.833-.833Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.667 10h-4.167a.833.833 0 0 0-.833.833v5.834c0 .46.373.833.833.833h4.167c.46 0 .833-.373.833-.833v-5.834A.833.833 0 0 0 16.667 10Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.5 13.333H3.333A.833.833 0 0 0 2.5 14.167v2.5c0 .46.373.833.833.833H7.5c.46 0 .833-.373.833-.833v-2.5a.833.833 0 0 0-.833-.834Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    user: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M7.5 9.167A3.333 3.333 0 1 0 7.5 2.5a3.333 3.333 0 0 0 0 6.667Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.333 17.5V15.833c0-.884-.351-1.732-.976-2.357a3.333 3.333 0 0 0-2.357-.976H5a3.333 3.333 0 0 0-2.357.976A3.333 3.333 0 0 0 1.667 15.833V17.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    building:
      '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 18.333V3.333a1.667 1.667 0 0 1 1.667-1.667h6.666A1.667 1.667 0 0 1 15 3.333v15H5Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 10H3.333c-.92 0-1.666.747-1.666 1.667v5c0 .92.746 1.666 1.666 1.666H5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 7.5h1.667c.92 0 1.666.747 1.666 1.667v7.5c0 .92-.746 1.666-1.666 1.666H15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    compass:
      '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.604 1.913a.417.417 0 0 1 .792 0l1.925 3.899a1.667 1.667 0 0 0 1.333.91l4.305.63a.417.417 0 0 1 .233.71l-3.113 3.032a1.667 1.667 0 0 0-.447 1.412l.735 4.283a.417.417 0 0 1-.604.438l-3.848-2.023a1.666 1.666 0 0 0-1.49 0l-3.847 2.023a.417.417 0 0 1-.604-.438l.734-4.283a1.667 1.667 0 0 0-.447-1.412L1.8 8.163a.417.417 0 0 1 .234-.71l4.304-.63a1.667 1.667 0 0 0 1.333-.91l1.934-3.9Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    map: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16.667 8.333c0 4.16-4.616 8.494-6.167 9.833a.833.833 0 0 1-1.166 0C7.783 16.827 3.167 12.494 3.167 8.333c0-1.768.702-3.463 1.952-4.714A6.667 6.667 0 0 1 10 1.667c1.768 0 3.464.702 4.714 1.952a6.666 6.666 0 0 1 1.953 4.714Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 10.833a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    calendar:
      '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M6.667 1.667V5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M13.333 1.667V5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.833 3.333H4.167A1.667 1.667 0 0 0 2.5 5v11.667A1.667 1.667 0 0 0 4.167 18.333h11.666A1.667 1.667 0 0 0 17.5 16.667V5A1.667 1.667 0 0 0 15.833 3.333Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M2.5 8.333h15" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    star: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M9.604 1.913a.417.417 0 0 1 .792 0l1.925 3.899a1.667 1.667 0 0 0 1.333.91l4.305.63a.417.417 0 0 1 .233.71l-3.113 3.032a1.667 1.667 0 0 0-.447 1.412l.735 4.283a.417.417 0 0 1-.604.438l-3.848-2.023a1.666 1.666 0 0 0-1.49 0l-3.847 2.023a.417.417 0 0 1-.604-.438l.734-4.283a1.667 1.667 0 0 0-.447-1.412L1.8 8.163a.417.417 0 0 1 .234-.71l4.304-.63a1.667 1.667 0 0 0 1.333-.91l1.934-3.9Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    chart:
      '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M2.5 2.5v13.333c0 .442.176.866.489 1.178.313.313.737.489 1.178.489H17.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 14.167V7.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.833 14.167V4.167" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.667 14.167V11.667" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    settings:
      '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.183 1.667H9.817a1.667 1.667 0 0 0-1.667 1.667v.15a1.667 1.667 0 0 1-.833 1.442l-.358.209a1.666 1.666 0 0 1-1.7 0l-.125-.067a1.667 1.667 0 0 0-1.786.143 1.667 1.667 0 0 0-.417 2.108l.184.316a1.667 1.667 0 0 1-.3 1.974l-.125.125a1.667 1.667 0 0 0-.417 2.108 1.667 1.667 0 0 0 1.786.143l.125-.067a1.666 1.666 0 0 1 1.7 0l.358.209a1.667 1.667 0 0 1 .833 1.442v.15a1.667 1.667 0 0 0 1.667 1.667h.366a1.667 1.667 0 0 0 1.667-1.667v-.15a1.667 1.667 0 0 1 .833-1.442l.358-.209a1.666 1.666 0 0 1 1.7 0l.125.067a1.667 1.667 0 0 0 1.786-.143 1.667 1.667 0 0 0 .417-2.108l-.184-.316a1.667 1.667 0 0 1 .3-1.974l.125-.125a1.667 1.667 0 0 0 .417-2.108 1.667 1.667 0 0 0-1.786-.143l-.125.067a1.666 1.666 0 0 1-1.7 0l-.358-.209a1.667 1.667 0 0 1-.833-1.442v-.15a1.667 1.667 0 0 0-1.667-1.667Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  };

  const statIcons = {
    booking: navIcons.calendar,
    money:
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2v20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M17 5H9.5A3.5 3.5 0 0 0 6 8.5c0 .929.369 1.819 1.025 2.475A3.5 3.5 0 0 0 9.5 12H14.5A3.5 3.5 0 0 1 18 15.5 3.5 3.5 0 0 1 14.5 19H6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    tour: navIcons.map,
    users: navIcons.user,
    default: navIcons.grid,
  };

  const sidebarNav = document.getElementById("sidebarNav");
  if (sidebarNav) {
    const navItems = Array.isArray(data.nav) ? data.nav : [];
    const iconKeys = [
      "grid",
      "user",
      "building",
      "compass",
      "map",
      "calendar",
      "star",
      "chart",
      "settings",
    ];
    sidebarNav.innerHTML = navItems
      .map((item, index) => {
        const iconKey = iconKeys[index] || "grid";
        return (
          `<a class="nav-item ${item.active ? "active" : ""}" href="${item.href || "#"}">` +
          `<span class="nav-icon">${navIcons[iconKey] || navIcons.grid}</span>` +
          `<span>${item.label}</span>` +
          `</a>`
        );
      })
      .join("");
    const current = window.location.pathname.split("/").pop();
    sidebarNav.querySelectorAll(".nav-item").forEach((a) => {
      const hrefFile = (a.getAttribute("href") || "").split("/").pop();
      a.classList.toggle("active", hrefFile === current);
    });
  }

  const user = data.user || {};
  const avatarEl = document.querySelector(".user-avatar");
  const nameEl = document.querySelector(".user-info .name");
  const emailEl = document.querySelector(".user-info .email");
  if (avatarEl && user.initials) avatarEl.textContent = user.initials;
  if (nameEl && user.name) nameEl.textContent = user.name;
  if (emailEl && user.email) emailEl.textContent = user.email;

  const statsGrid = document.getElementById("statsGrid");
  if (statsGrid && Array.isArray(data.stats)) {
    statsGrid.innerHTML = data.stats
      .map((item) => {
        const negative = (item.change || "").trim().startsWith("-");
        const arrow = negative ? "↓" : "↑";
        const changeClass = negative ? "negative" : "positive";
        const hasChange = Boolean((item.change || "").trim());
        return `<div class="stat-card">
              <div class="stat-header">
                <div>
                  <p class="stat-label">${item.title || ""}</p>
                  <div class="stat-value">${item.value || ""}</div>
                </div>
                <div class="stat-icon ${item.icon || ""}">${statIcons[item.icon] || statIcons.default}</div>
              </div>
              ${
                hasChange
                  ? `<div class="stat-change ${changeClass}">
                      <span>${arrow}</span>
                      <span>${item.change || ""}</span>
                      <small>so với tháng trước</small>
                    </div>`
                  : `<div class="stat-change muted"><small>&nbsp;</small></div>`
              }
            </div>`;
      })
      .join("");
  }

  const highlightGrid = document.getElementById("highlightGrid");
  if (highlightGrid && Array.isArray(data.highlights)) {
    highlightGrid.innerHTML = data.highlights
      .map(
        (item) => `<div class="highlight-card ${item.tone || ""}">
            <div class="highlight-title">${item.title || ""}</div>
            <div class="highlight-value">${item.value || ""}</div>
            <div class="highlight-note">${item.note || ""}</div>
          </div>`,
      )
      .join("");
  }

  const bookingList = document.getElementById("bookingList");
  if (bookingList && Array.isArray(data.bookings)) {
    bookingList.innerHTML = data.bookings
      .map((item) => {
        const initials = (item.name || "")
          .split(" ")
          .filter(Boolean)
          .map((word) => word[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        return `<div class="list-row">
              <div class="person">
                <div class="avatar">${initials}</div>
                <div>
                  <div class="title">${item.name || ""}</div>
                  <div class="subtitle">${item.tour || ""}</div>
                </div>
              </div>
              <div class="list-meta">
                <div class="date">${item.date || ""}</div>
                <div class="badge ${item.statusType || "info"}">${item.status || ""}</div>
              </div>
            </div>`;
      })
      .join("");
  }

  const toursList = document.getElementById("popularTours");
  if (toursList && Array.isArray(data.popularTours)) {
    toursList.innerHTML = data.popularTours
      .map(
        (item) => `<div class="tour-row">
            <div class="rank">${item.rank ?? ""}</div>
            <div class="tour-info">
              <div class="title">${item.name || ""}</div>
              <div class="subtitle">${item.bookings || 0} bookings</div>
            </div>
            <div class="amount">${item.revenue || ""} VNĐ</div>
          </div>`,
      )
      .join("");
  }
})();