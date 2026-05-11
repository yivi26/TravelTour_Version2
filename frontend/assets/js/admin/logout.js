document.addEventListener("DOMContentLoaded", function () {
  const logoutBtn = document.getElementById("logoutBtn");
  if (!logoutBtn) return;

  logoutBtn.addEventListener("click", function () {
    const ok = confirm("Bạn có chắc muốn đăng xuất không?");
    if (!ok) return;

    try {
      localStorage.clear();
    } catch (_) {}
    try {
      sessionStorage.clear();
    } catch (_) {}

    window.location.href = "../dangnhap/login.html";
  });
});

