(() => {
  const API_URL = "/api/provider/notifications?limit=12";

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

  function fmtDate(iso) {
    if (!iso) return "";
    const d = new Date(`${iso}T12:00:00`);
    if (Number.isNaN(d.getTime())) return String(iso);
    return d.toLocaleDateString("vi-VN");
  }

  function ensureStyles() {
    if (document.getElementById("provider-noti-styles")) return;
    const style = document.createElement("style");
    style.id = "provider-noti-styles";
    style.textContent = `
      .provider-noti-wrap{position:relative;display:inline-flex;align-items:center}
      .provider-noti-panel{
        position:absolute;right:0;top:calc(100% + 10px);
        width:min(360px, calc(100vw - 32px));
        background:#fff;border:1px solid rgba(15,23,42,.12);
        border-radius:14px;box-shadow:0 18px 40px rgba(15,23,42,.14);
        overflow:hidden;z-index:9999;
      }
      .provider-noti-panel[hidden]{display:none}
      .provider-noti-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(15,23,42,.08)}
      .provider-noti-title{font-weight:800;font-size:14px;color:#0f172a}
      .provider-noti-sub{font-size:12px;color:#64748b}
      .provider-noti-list{max-height:360px;overflow:auto}
      .provider-noti-item{display:flex;gap:10px;padding:12px 14px;border-bottom:1px solid rgba(15,23,42,.06);text-decoration:none;color:inherit}
      .provider-noti-item:hover{background:#f8fafc}
      .provider-noti-dot{width:10px;height:10px;border-radius:999px;margin-top:4px;flex:0 0 auto}
      .provider-noti-dot.green{background:#16a34a}
      .provider-noti-dot.blue{background:#2563eb}
      .provider-noti-dot.purple{background:#7c3aed}
      .provider-noti-dot.orange{background:#f97316}
      .provider-noti-dot.red{background:#ef4444}
      .provider-noti-main{min-width:0;flex:1}
      .provider-noti-line1{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
      .provider-noti-text{font-size:13px;font-weight:700;color:#0f172a;line-height:1.25;flex:1;min-width:0}
      .provider-noti-date{font-size:11px;color:#94a3b8;white-space:nowrap}
      .provider-noti-desc{margin-top:3px;font-size:12px;color:#64748b;line-height:1.3;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
      .provider-noti-empty{padding:16px 14px;color:#64748b;font-size:13px}
      .provider-noti-foot{padding:10px 14px;background:#fbfdff}
      .provider-noti-foot a{font-size:12px;color:#0ea5e9;text-decoration:none;font-weight:700}
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
    return qsa(".user-area > .bell");
  }

  function ensureWrapper(btn) {
    if (!btn || btn.closest(".provider-noti-wrap")) return btn?.closest(".provider-noti-wrap");
    const wrap = document.createElement("div");
    wrap.className = "provider-noti-wrap";
    btn.parentNode.insertBefore(wrap, btn);
    wrap.appendChild(btn);
    return wrap;
  }

  function ensurePanel(wrap) {
    let panel = qs(".provider-noti-panel", wrap);
    if (panel) return panel;
    panel = document.createElement("div");
    panel.className = "provider-noti-panel";
    panel.hidden = true;
    panel.innerHTML = `
      <div class="provider-noti-head">
        <div>
          <div class="provider-noti-title">Thông báo</div>
          <div class="provider-noti-sub">Tài khoản, tour & booking</div>
        </div>
      </div>
      <div class="provider-noti-list" data-role="list"></div>
      <div class="provider-noti-foot"><a href="booking_management.html">Quản lý booking</a></div>
    `;
    panel.addEventListener("click", (e) => e.stopPropagation());
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
      list.innerHTML = `<div class="provider-noti-empty">Chưa có thông báo.</div>`;
      return;
    }

    list.innerHTML = items
      .map((it) => {
        const href = it.href ? String(it.href) : "#";
        const tone = it.tone || "blue";
        return `
          <a class="provider-noti-item" href="${escapeHtml(href)}">
            <span class="provider-noti-dot ${escapeHtml(tone)}"></span>
            <div class="provider-noti-main">
              <div class="provider-noti-line1">
                <div class="provider-noti-text">${escapeHtml(it.title)}</div>
                <div class="provider-noti-date">${escapeHtml(fmtDate(it.date))}</div>
              </div>
              <div class="provider-noti-desc">${escapeHtml(it.subtitle || "")}</div>
            </div>
          </a>
        `;
      })
      .join("");
  }

  function closeAllPanels(exceptPanel = null) {
    for (const p of qsa(".provider-noti-panel")) {
      if (exceptPanel && p === exceptPanel) continue;
      p.hidden = true;
    }
  }

  async function attachBell(btn) {
    const wrap = ensureWrapper(btn);
    const panel = ensurePanel(wrap);

    try {
      const data = await fetchNotifications();
      setDotVisible(btn, (data?.items || []).length > 0);
    } catch {
      /* bỏ qua */
    }

    btn.setAttribute("role", "button");
    btn.setAttribute("tabindex", "0");
    btn.setAttribute("aria-label", "Mở thông báo");

    btn.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        btn.click();
      }
    });

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
      if (btn.dataset.providerNotiBound === "1") continue;
      btn.dataset.providerNotiBound = "1";
      await attachBell(btn);
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
