(() => {
  const API_URL = "/api/admin/notifications?limit=12";

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function escapeHtml(str) {
    return String(str ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function ensureStyles() {
    if (document.getElementById("admin-noti-styles")) return;
    const style = document.createElement("style");
    style.id = "admin-noti-styles";
    style.textContent = `
      .noti-wrap{position:relative;display:inline-flex;align-items:center}
      .noti-panel{
        position:absolute;right:0;top:calc(100% + 10px);
        width:min(360px, calc(100vw - 32px));
        background:#fff;border:1px solid rgba(15,23,42,.12);
        border-radius:14px;box-shadow:0 18px 40px rgba(15,23,42,.14);
        overflow:hidden;z-index:9999;
      }
      .noti-panel[hidden]{display:none}
      .noti-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(15,23,42,.08)}
      .noti-title{font-weight:800;font-size:14px;color:#0f172a}
      .noti-sub{font-size:12px;color:#64748b}
      .noti-list{max-height:360px;overflow:auto}
      .noti-item{display:flex;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(15,23,42,.06);text-decoration:none;color:inherit}
      .noti-item:hover{background:#f8fafc}
      .noti-dot{width:10px;height:10px;border-radius:999px;margin-top:4px;flex:0 0 auto}
      .noti-dot.green{background:#16a34a}
      .noti-dot.blue{background:#2563eb}
      .noti-dot.purple{background:#7c3aed}
      .noti-dot.orange{background:#f97316}
      .noti-main{min-width:0;flex:1}
      .noti-line1{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
      .noti-text{font-size:13px;font-weight:700;color:#0f172a;line-height:1.25;flex:1;min-width:0}
      .noti-date{font-size:11px;color:#94a3b8;white-space:nowrap}
      .noti-desc{margin-top:3px;font-size:12px;color:#64748b;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      .noti-empty{padding:16px 14px;color:#64748b;font-size:13px}
      .noti-foot{padding:10px 14px;background:#fbfdff}
      .noti-foot a{font-size:12px;color:#0ea5e9;text-decoration:none;font-weight:700}
    `;
    document.head.appendChild(style);
  }

  async function fetchNotifications() {
    const res = await fetch(API_URL, { method: "GET" });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(json?.message || "Không tải được thông báo");
    return json?.data || { total: 0, items: [] };
  }

  function getBellButtons() {
    // tongquan.html uses .bell; caidat.html uses .bell-btn
    return [
      ...qsa("button.bell"),
      ...qsa("button.bell-btn")
    ];
  }

  function ensureWrapper(btn) {
    if (!btn || btn.closest(".noti-wrap")) return btn?.closest(".noti-wrap");
    const wrap = document.createElement("div");
    wrap.className = "noti-wrap";
    btn.parentNode.insertBefore(wrap, btn);
    wrap.appendChild(btn);
    return wrap;
  }

  function ensurePanel(wrap) {
    let panel = qs(".noti-panel", wrap);
    if (panel) return panel;
    panel = document.createElement("div");
    panel.className = "noti-panel";
    panel.hidden = true;
    panel.innerHTML = `
      <div class="noti-head">
        <div>
          <div class="noti-title">Thông báo</div>
          <div class="noti-sub">Theo cài đặt hệ thống</div>
        </div>
      </div>
      <div class="noti-list" data-role="list"></div>
      <div class="noti-foot"><a href="qlibooking.html">Xem chi tiết</a></div>
    `;
    wrap.appendChild(panel);
    return panel;
  }

  function setDotVisible(btn, visible) {
    const dot = btn.querySelector(".dot") || btn.querySelector(".bell-dot");
    if (!dot) return;
    dot.style.display = visible ? "" : "none";
  }

  function renderPanel(panel, data) {
    const list = panel.querySelector('[data-role="list"]');
    if (!list) return;

    const items = Array.isArray(data?.items) ? data.items : [];
    if (items.length === 0) {
      list.innerHTML = `<div class="noti-empty">Không có thông báo phù hợp với cài đặt hiện tại.</div>`;
      return;
    }

    list.innerHTML = items
      .map((it) => {
        const href = it.href ? String(it.href) : "#";
        const tone = it.tone || "blue";
        return `
          <a class="noti-item" href="${escapeHtml(href)}">
            <span class="noti-dot ${escapeHtml(tone)}"></span>
            <div class="noti-main">
              <div class="noti-line1">
                <div class="noti-text">${escapeHtml(it.title)}</div>
                <div class="noti-date">${escapeHtml(it.date || "")}</div>
              </div>
              <div class="noti-desc">${escapeHtml(it.subtitle || "")}</div>
            </div>
          </a>
        `;
      })
      .join("");
  }

  function closeAllPanels(exceptPanel = null) {
    for (const p of qsa(".noti-panel")) {
      if (exceptPanel && p === exceptPanel) continue;
      p.hidden = true;
    }
  }

  async function attachBell(btn) {
    const wrap = ensureWrapper(btn);
    const panel = ensurePanel(wrap);

    // preload dot state
    try {
      const data = await fetchNotifications();
      setDotVisible(btn, (data?.items || []).length > 0);
    } catch {
      // ignore
    }

    btn.addEventListener("click", async (e) => {
      e.preventDefault();
      e.stopPropagation();

      const willOpen = panel.hidden;
      closeAllPanels(panel);
      panel.hidden = !willOpen;
      if (!willOpen) return;

      try {
        const data = await fetchNotifications();
        renderPanel(panel, data);
        setDotVisible(btn, (data?.items || []).length > 0);
      } catch (err) {
        renderPanel(panel, { items: [] });
        console.error(err);
      }
    });
  }

  function bindOutsideClose() {
    document.addEventListener("click", () => closeAllPanels(null));
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeAllPanels(null);
    });
  }

  async function init() {
    ensureStyles();
    bindOutsideClose();
    const bells = getBellButtons();
    for (const btn of bells) {
      // avoid double binding
      if (btn.dataset.notiBound === "1") continue;
      btn.dataset.notiBound = "1";
      await attachBell(btn);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();

