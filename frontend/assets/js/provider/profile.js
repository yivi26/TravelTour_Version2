let originalProfileData = null;
let selectedLogoFile = null;
let previewLogoUrl = "";

const formIds = {
  companyName: "companyName",
  companyShortName: "companyShortName",
  taxCode: "taxCode",
  businessLicense: "businessLicense",
  companyDescription: "companyDescription",
  phone: "phone",
  hotline: "hotline",
  contactEmail: "contactEmail",
  address: "address",
  website: "website",
  bankName: "bankName",
  bankBranch: "bankBranch",
  bankAccountNumber: "bankAccountNumber",
  bankAccountName: "bankAccountName"
};

function getElement(id) {
  return document.getElementById(id);
}

function formatNumber(value) {
  return new Intl.NumberFormat("vi-VN").format(Number(value || 0));
}

function formatMemberSince(value) {
  if (!value) return "--/----";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return `${month}/${year}`;
}

function escapeHtml(text) {
  return String(text || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function fetchProfile() {
  const response = await fetch("/api/provider/profile", {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Không thể tải hồ sơ nhà cung cấp");
  }

  return data;
}

async function updateProfile(payload) {
  const response = await fetch("/api/provider/profile", {
    method: "PUT",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Không thể lưu hồ sơ nhà cung cấp");
  }

  return data;
}

function setInputValue(id, value) {
  const element = getElement(id);
  if (!element) return;
  element.value = value ?? "";
}

function getInputValue(id) {
  const element = getElement(id);
  return element ? element.value.trim() : "";
}

function renderCertificates(certificates) {
  const container = getElement("certificateList");
  if (!container) return;

  if (!Array.isArray(certificates) || certificates.length === 0) {
    container.innerHTML = `
      <div class="cert-item">
        <div class="cert-icon"><i class="fa-solid fa-ribbon"></i></div>
        <div class="cert-info">
          <div class="c-name">Chưa có dữ liệu chứng nhận</div>
          <div class="c-status">Đang cập nhật</div>
        </div>
      </div>
    `;
    return;
  }

  container.innerHTML = certificates
    .map(
      (item) => `
        <div class="cert-item">
          <div class="cert-icon"><i class="fa-solid fa-ribbon"></i></div>
          <div class="cert-info">
            <div class="c-name">${escapeHtml(item.name || "Chứng nhận")}</div>
            <div class="c-status">${escapeHtml(item.status || "Đang cập nhật")}</div>
          </div>
        </div>
      `
    )
    .join("");
}

function renderLogo(logoUrl) {
  const logoContainer = getElement("providerLogoPreview");
  if (!logoContainer) return;

  if (logoUrl) {
    logoContainer.innerHTML = `
      <img
        src="${logoUrl}"
        alt="Logo nhà cung cấp"
        style="width:100%;height:100%;object-fit:cover;border-radius:50%;"
      />
    `;
    return;
  }

  logoContainer.innerHTML = `<i class="fa-solid fa-building"></i>`;
}

function renderProfile(profile) {
  setInputValue(formIds.companyName, profile.companyName);
  setInputValue(formIds.companyShortName, profile.companyShortName);
  setInputValue(formIds.taxCode, profile.taxCode);
  setInputValue(formIds.businessLicense, profile.businessLicense);
  setInputValue(formIds.companyDescription, profile.companyDescription);
  setInputValue(formIds.phone, profile.phone);
  setInputValue(formIds.hotline, profile.hotline);
  setInputValue(formIds.contactEmail, profile.contactEmail);
  setInputValue(formIds.address, profile.address);
  setInputValue(formIds.website, profile.website);
  setInputValue(formIds.bankName, profile.bankName);
  setInputValue(formIds.bankBranch, profile.bankBranch);
  setInputValue(formIds.bankAccountNumber, profile.bankAccountNumber);
  setInputValue(formIds.bankAccountName, profile.bankAccountName);

  const summaryCompanyName = getElement("summaryCompanyName");
  const summaryProviderType = getElement("summaryProviderType");
  const summaryRating = getElement("summaryRating");
  const summaryTotalTours = getElement("summaryTotalTours");
  const summaryTotalReviews = getElement("summaryTotalReviews");
  const summaryTotalCustomers = getElement("summaryTotalCustomers");
  const summaryMemberSince = getElement("summaryMemberSince");
  const headerUserName = getElement("headerUserName");
  const headerUserEmail = getElement("headerUserEmail");

  if (summaryCompanyName) {
    summaryCompanyName.textContent = profile.companyDisplayName || profile.companyName || "Tên công ty";
  }

  if (summaryProviderType) {
    summaryProviderType.textContent = profile.providerType || "Nhà cung cấp tour du lịch";
  }

  if (summaryRating) {
    summaryRating.textContent = `(${Number(profile.rating || 0).toFixed(1)}/5.0)`;
  }

  if (summaryTotalTours) {
    summaryTotalTours.textContent = `${formatNumber(profile.totalTours || 0)} tour`;
  }

  if (summaryTotalReviews) {
    summaryTotalReviews.textContent = `${formatNumber(profile.totalReviews || 0)} đánh giá`;
  }

  if (summaryTotalCustomers) {
    summaryTotalCustomers.textContent = `${formatNumber(profile.totalCustomers || 0)} khách`;
  }

  if (summaryMemberSince) {
    summaryMemberSince.textContent = formatMemberSince(profile.memberSince);
  }

  if (headerUserName) {
    headerUserName.textContent = profile.accountName || "Provider";
  }

  if (headerUserEmail) {
    headerUserEmail.textContent = profile.accountEmail || profile.contactEmail || "provider@traveltour.vn";
  }

  renderLogo(profile.logoUrl || "");
  renderCertificates(profile.certificates || []);
}

function collectFormData() {
  return {
    companyName: getInputValue(formIds.companyName),
    companyShortName: getInputValue(formIds.companyShortName),
    taxCode: getInputValue(formIds.taxCode),
    businessLicense: getInputValue(formIds.businessLicense),
    companyDescription: getInputValue(formIds.companyDescription),
    phone: getInputValue(formIds.phone),
    hotline: getInputValue(formIds.hotline),
    contactEmail: getInputValue(formIds.contactEmail),
    address: getInputValue(formIds.address),
    website: getInputValue(formIds.website),
    bankName: getInputValue(formIds.bankName),
    bankBranch: getInputValue(formIds.bankBranch),
    bankAccountNumber: getInputValue(formIds.bankAccountNumber),
    bankAccountName: getInputValue(formIds.bankAccountName),
    logoFileName: selectedLogoFile ? selectedLogoFile.name : null
  };
}

function validateForm(data) {
  if (!data.companyName) {
    throw new Error("Vui lòng nhập tên công ty.");
  }

  if (!data.contactEmail) {
    throw new Error("Vui lòng nhập email liên hệ.");
  }

  if (!data.phone) {
    throw new Error("Vui lòng nhập số điện thoại.");
  }
}

async function handleSave() {
  try {
    const payload = collectFormData();
    validateForm(payload);

    const result = await updateProfile(payload);

    originalProfileData = {
      ...(result.profile || payload),
      certificates: result.profile?.certificates || originalProfileData?.certificates || [],
      totalTours: result.profile?.totalTours ?? originalProfileData?.totalTours ?? 0,
      totalReviews: result.profile?.totalReviews ?? originalProfileData?.totalReviews ?? 0,
      totalCustomers: result.profile?.totalCustomers ?? originalProfileData?.totalCustomers ?? 0,
      memberSince: result.profile?.memberSince ?? originalProfileData?.memberSince ?? "",
      rating: result.profile?.rating ?? originalProfileData?.rating ?? 0,
      providerType: result.profile?.providerType ?? originalProfileData?.providerType ?? "Nhà cung cấp tour du lịch",
      accountName: result.profile?.accountName ?? originalProfileData?.accountName ?? "Provider",
      accountEmail: result.profile?.accountEmail ?? originalProfileData?.accountEmail ?? payload.contactEmail,
      logoUrl: previewLogoUrl || result.profile?.logoUrl || originalProfileData?.logoUrl || ""
    };

    renderProfile(originalProfileData);
    alert(result.message || "Đã lưu thông tin nhà cung cấp.");
  } catch (error) {
    console.error("Lỗi lưu hồ sơ:", error);
    alert(error.message || "Lưu thông tin thất bại.");
  }
}

function handleCancel() {
  if (!originalProfileData) return;

  if (previewLogoUrl) {
    URL.revokeObjectURL(previewLogoUrl);
    previewLogoUrl = "";
  }

  selectedLogoFile = null;
  const logoInput = getElement("logoInput");
  if (logoInput) {
    logoInput.value = "";
  }

  renderProfile(originalProfileData);
  alert("Đã khôi phục dữ liệu ban đầu.");
}

function handleChangeLogoClick() {
  const logoInput = getElement("logoInput");
  if (!logoInput) return;
  logoInput.click();
}

function handleLogoSelected(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  selectedLogoFile = file;

  if (previewLogoUrl) {
    URL.revokeObjectURL(previewLogoUrl);
  }

  previewLogoUrl = URL.createObjectURL(file);
  renderLogo(previewLogoUrl);
}

function bindEvents() {
  const saveBtn = getElement("saveBtn");
  const cancelBtn = getElement("cancelBtn");
  const changeLogoBtn = getElement("changeLogoBtn");
  const logoInput = getElement("logoInput");

  if (saveBtn) {
    saveBtn.addEventListener("click", handleSave);
  }

  if (cancelBtn) {
    cancelBtn.addEventListener("click", handleCancel);
  }

  if (changeLogoBtn) {
    changeLogoBtn.addEventListener("click", handleChangeLogoClick);
  }

  if (logoInput) {
    logoInput.addEventListener("change", handleLogoSelected);
  }
}

async function initPage() {
  try {
    bindEvents();
    const data = await fetchProfile();

    originalProfileData = data.profile || {};
    renderProfile(originalProfileData);
  } catch (error) {
    console.error("Lỗi tải hồ sơ nhà cung cấp:", error);
    alert(error.message || "Không tải được hồ sơ nhà cung cấp.");
  }
}

document.addEventListener("DOMContentLoaded", initPage);