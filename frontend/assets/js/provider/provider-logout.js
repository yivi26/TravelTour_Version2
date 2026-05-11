document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll(".provider-logout-action").forEach(function (el) {
    el.addEventListener("click", function () {
      localStorage.removeItem("traveltour_user");
      localStorage.removeItem("traveltour_remember");
      window.location.href = "/login";
    });
  });
});
