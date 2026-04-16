// ============================================
// BABCOCK UNIVERSITY PUBLISHING SYSTEM
// Consolidated JavaScript Application
// ============================================

// ============================================
// 1. CONFIGURATION & INITIALIZATION
// ============================================

const runtimeApiBase =
  (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL) ||
  localStorage.getItem("API_BASE_URL_OVERRIDE");

const API_BASE_URL = (
  runtimeApiBase ||
  (window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:3001/api"
    : "/api")
).replace(/\/+$/, "");

let currentUser = null;
let publications = [];
let currentPage = 1;
const itemsPerPage = 6;
const ADMIN_ROLES = ["admin", "editor", "reviewer"];
const DEFAULT_ADMIN_SECTION = "dashboard";
let pendingPasswordResetAudience = "author";
let pendingPasswordResetEmail = "";
const AUTHOR_WORKFLOW_STAGES = [
  { key: "manuscript_submission", label: "Submission" },
  { key: "initial_review", label: "Initial Review" },
  { key: "peer_review", label: "Peer Review" },
  { key: "revisions", label: "Revisions" },
  { key: "copyediting", label: "Copyediting" },
  { key: "proofreading", label: "Proofreading" },
  { key: "design", label: "Design" },
  { key: "printing", label: "Printing" },
  { key: "distribution", label: "Distribution" },
  { key: "marketing", label: "Marketing" },
];
let authorProfileState = null;
let authorDashboardState = null;
let adminAuthorsCache = [];
let adminBooksCache = [];
let adminSubmissionsCache = [];
let adminContractsCache = [];

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  initAuth();
  loadHomepageData();
  setupEventListeners();
  setupDashboardNavigation();
  setupAuthorWorkspaceListeners();
  initAdminLayout();
  loadAboutInfo();
  initAnimations();
  handlePasswordResetLinkState();
  initMobileOptimizations();
});

// ============================================
// Mobile Optimizations Module
// ============================================
function initMobileOptimizations() {
  // Detect if device is mobile
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  const isTouchDevice = () => {
    return (
      typeof window !== "undefined" &&
      ("ontouchstart" in window || navigator.maxTouchPoints > 0)
    );
  };

  // Add mobile body class
  if (isMobile || isTouchDevice()) {
    document.body.classList.add("is-mobile-device");
  }

  // Optimize viewport for notch-safe areas
  if (window.innerWidth < 768 && window.innerHeight < window.innerWidth) {
    // Landscape mode on mobile
    document.body.classList.add("mobile-landscape");
  }

  // Prevent double-tap zoom delay on buttons
  document.addEventListener("touchstart", function () {}, false);

  // Improve touch targets
  const touchTargets = document.querySelectorAll("a, button, .press-button");
  touchTargets.forEach((target) => {
    const rect = target.getBoundingClientRect();
    if (rect.height < 44 || rect.width < 44) {
      target.style.padding =
        Math.max(12, 44 - rect.height) / 2 +
        "px " +
        Math.max(12, 44 - rect.width) / 2 +
        "px";
    }
  });

  // Optimize images for mobile
  optimizeMobileImages();

  // Handle viewport changes
  let resizeTimer;
  window.addEventListener(
    "resize",
    () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        handleViewportChange();
      }, 250);
    },
    { passive: true },
  );

  // Reduce animations on low-power devices
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    document.body.classList.add("reduce-motion");
    document.documentElement.style.setProperty(
      "--press-transition",
      "0.1s ease",
    );
  }

  // Prevent scroll bounce on iOS
  document.addEventListener(
    "touchmove",
    function (e) {
      if (document.body.classList.contains("modal-open")) {
        e.preventDefault();
      }
    },
    { passive: false },
  );
}

function optimizeMobileImages() {
  // Use picture elements for responsive images
  const images = document.querySelectorAll("[data-mobile-src]");
  images.forEach((img) => {
    if (window.innerWidth < 768) {
      const mobileSrc = img.getAttribute("data-mobile-src");
      if (mobileSrc) img.src = mobileSrc;
    }
  });

  // Lazy load images
  if ("IntersectionObserver" in window) {
    const imageObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.getAttribute("data-lazy-src") || img.src;
            img.classList.add("loaded");
            observer.unobserve(img);
          }
        });
      },
      { rootMargin: "50px" },
    );

    document
      .querySelectorAll("img[data-lazy-src]")
      .forEach((img) => imageObserver.observe(img));
  }
}

function handleViewportChange() {
  const isMobileView = window.innerWidth < 768;

  // Update mobile class
  if (isMobileView) {
    document.body.classList.add("mobile-view");
  } else {
    document.body.classList.remove("mobile-view");
  }

  // Close mobile menu if resizing to desktop
  if (!isMobileView) {
    closeMobileMenu();
  }
}

// ============================================
// 2. AUTHENTICATION MODULE (FIXED)
// ============================================

async function initAuth() {
  const token = localStorage.getItem("authToken");
  if (token) {
    const isValid = await validateToken(token);
    if (!isValid) {
      localStorage.removeItem("authToken");
      currentUser = null;
    }
  }
  updateAuthUI();
  updateMobileMenu();

  if (!currentUser) return;

  const preferredView = localStorage.getItem("activeDashboardView");
  const hash = window.location.hash;

  if (ADMIN_ROLES.includes(currentUser.role)) {
    if (preferredView === "admin" || hash === "#admin") {
      showAdminDashboard();
    }
    return;
  }

  if (currentUser.role === "author") {
    if (preferredView === "author" || hash === "#author") {
      showAuthorDashboard();
    }
  }
}

async function validateToken(token) {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/verify`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json();
    if (data.success && data.user) {
      currentUser = data.user;
      return true;
    }
  } catch (error) {
    console.error("Token validation error:", error);
  }
  return false;
}

function updateAuthUI() {
  const authButtons = document.getElementById("authButtons");
  const mobileAuthButtons = document.getElementById("mobileAuthButtons");
  const portalAccessNotice = document.getElementById("portalAccessNotice");

  updatePortalAccessNotice(portalAccessNotice);

  if (!currentUser) {
    // Not logged in
    if (authButtons) {
      authButtons.innerHTML = `
                <button class="btn btn-outline" onclick="showLoginModal()">
                    <i class="fas fa-sign-in-alt"></i> Login
                </button>
                <button class="btn btn-primary" onclick="showRegisterModal()">
                    <i class="fas fa-user-plus"></i> Register
                </button>
            `;
    }
    if (mobileAuthButtons) {
      mobileAuthButtons.innerHTML = `
                <button class="btn btn-outline" onclick="showLoginModal()">
                    <i class="fas fa-sign-in-alt"></i> Login
                </button>
                <button class="btn btn-primary" onclick="showRegisterModal()">
                    <i class="fas fa-user-plus"></i> Register
                </button>
            `;
    }
  } else {
    // Logged in
    const displayName =
      currentUser.full_name?.split(" ")[0] ||
      currentUser.username ||
      currentUser.email ||
      "User";

    if (authButtons) {
      const dashboardButton = ADMIN_ROLES.includes(currentUser.role)
        ? '<button class="btn btn-primary" onclick="showAdminDashboard()"><i class="fas fa-columns"></i> Dashboard</button>'
        : currentUser.role === "author"
          ? '<button class="btn btn-primary" onclick="showAuthorDashboard()"><i class="fas fa-columns"></i> Dashboard</button>'
          : "";

      authButtons.innerHTML = `
                <div class="auth-actions">
                    ${dashboardButton}
                    <button class="btn btn-outline" onclick="logout()">
                        <i class="fas fa-sign-out-alt"></i> Logout
                    </button>
                </div>
            `;
    }

    if (mobileAuthButtons) {
      const dashboardButton = ADMIN_ROLES.includes(currentUser.role)
        ? '<button class="btn btn-primary" onclick="showAdminDashboard()"><i class="fas fa-columns"></i> Dashboard</button>'
        : currentUser.role === "author"
          ? '<button class="btn btn-primary" onclick="showAuthorDashboard()"><i class="fas fa-columns"></i> Dashboard</button>'
          : "";

      mobileAuthButtons.innerHTML = `
                ${dashboardButton}
                <button class="btn btn-outline" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </button>
            `;
    }

    // Update dashboard user names
    if (ADMIN_ROLES.includes(currentUser.role)) {
      const adminName = document.getElementById("adminUserName");
      if (adminName) adminName.textContent = displayName;

      const userName = document.getElementById("userName");
      const userRole = document.getElementById("userRole");
      const userAvatar = document.getElementById("userAvatar");

      if (userName) userName.textContent = displayName;
      if (userRole) userRole.textContent = "Administrator";
      if (userAvatar) {
        const initials = displayName
          .split(" ")
          .map((part) => part[0])
          .join("")
          .toUpperCase();
        userAvatar.textContent = initials || "A";
      }
    } else if (currentUser.role === "author") {
      const authorName = document.getElementById("authorUserName");
      if (authorName) authorName.textContent = displayName;
    }
  }
}

function updatePortalAccessNotice(portalAccessNotice) {
  if (!portalAccessNotice) return;

  let noticeText = "login / register to view admin and author portals";

  if (currentUser) {
    if (ADMIN_ROLES.includes(currentUser.role)) {
      noticeText = "Signed in. Use Dashboard to open the admin portal.";
    } else if (currentUser.role === "author") {
      noticeText = "Signed in. Use Dashboard to open the author portal.";
    } else {
      noticeText = "";
    }
  }

  portalAccessNotice.hidden = !noticeText;
  portalAccessNotice.textContent = noticeText;
}

function updateMobileMenu() {
  const mobileAuthButtons = document.getElementById("mobileAuthButtons");
  if (!mobileAuthButtons) return;

  if (currentUser) {
    const dashboardButton = ADMIN_ROLES.includes(currentUser.role)
      ? '<button class="btn btn-primary" onclick="showAdminDashboard()"><i class="fas fa-columns"></i> Dashboard</button>'
      : currentUser.role === "author"
        ? '<button class="btn btn-primary" onclick="showAuthorDashboard()"><i class="fas fa-columns"></i> Dashboard</button>'
        : "";

    mobileAuthButtons.innerHTML = `
            ${dashboardButton}
            <button class="btn btn-outline" onclick="logout()">
                <i class="fas fa-sign-out-alt"></i> Logout
            </button>
        `;
  } else {
    mobileAuthButtons.innerHTML = `
            <button class="btn btn-outline" onclick="showLoginModal()">
                <i class="fas fa-sign-in-alt"></i> Login
            </button>
            <button class="btn btn-primary" onclick="showRegisterModal()">
                <i class="fas fa-user-plus"></i> Register
            </button>
        `;
  }
}

// Login function with improved error handling
async function login(email, password, role) {
  try {
    showLoading("Logging in...");

    // Validate inputs
    if (!email || !password) {
      showNotification("Please enter email and password", "error");
      return;
    }

    let endpoint = "/users/login";
    if (role === "admin") endpoint = "/admin/login";
    if (role === "author") endpoint = "/authors/login";

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ email, password }),
    });

    let data;
    try {
      data = await response.json();
    } catch (error) {
      throw new Error("Invalid server response");
    }

    if (!response.ok) {
      showNotification(
        data.message || `Login failed: ${response.status}`,
        "error",
      );
      return;
    }

    if (data.success) {
      localStorage.setItem("authToken", data.token);
      currentUser = data.user;
      updateAuthUI();
      updateMobileMenu();
      closeModal("loginModal");
      document.body.style.overflow = "auto";
      showNotification("Login successful!", "success");

      // Redirect based on role
      if (ADMIN_ROLES.includes(currentUser.role) || role === "admin") {
        showAdminDashboard();
      } else if (currentUser.role === "author" || role === "author") {
        showAuthorDashboard();
      } else {
        showHomepage();
      }
    } else {
      showNotification(data.message || "Login failed", "error");
    }
  } catch (error) {
    console.error("Login error:", error);
    showNotification("Login failed: " + error.message, "error");
  } finally {
    hideLoading();
  }
}

// Logout function
async function logout() {
  try {
    const token = localStorage.getItem("authToken");
    if (token) {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }).catch(() => {}); // Ignore errors on logout
    }
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    localStorage.removeItem("authToken");
    currentUser = null;
    showHomepage();
    updateAuthUI();
    updateMobileMenu();
  }
}

// ============================================
// 3. MODAL MANAGEMENT
// ============================================

function toggleMobileMenu() {
  const hamburgerMenu = document.getElementById("hamburgerMenu");
  const mobileMenu = document.getElementById("mobileMenu");
  const overlay = document.getElementById("mobileMenuOverlay");

  hamburgerMenu.classList.toggle("active");
  mobileMenu.classList.toggle("active");
  overlay.classList.toggle("active");

  document.body.style.overflow = mobileMenu.classList.contains("active")
    ? "hidden"
    : "auto";
}

function closeMobileMenu() {
  const hamburgerMenu = document.getElementById("hamburgerMenu");
  const mobileMenu = document.getElementById("mobileMenu");
  const overlay = document.getElementById("mobileMenuOverlay");

  hamburgerMenu.classList.remove("active");
  mobileMenu.classList.remove("active");
  overlay.classList.remove("active");

  document.body.style.overflow = "auto";
}

function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove("active");
    document.body.style.overflow = "auto";
  }
}

function showLoginModal() {
  showModal("loginModal");
}

function showRegisterModal() {
  showModal("registerModal");
}

function showContactModal() {
  showModal("contactModal");
}

function showTrainingRegistration() {
  showModal("trainingModal");
}

function showAuthorLogin() {
  showModal("loginModal");
  setTimeout(() => {
    const authorTab = document.querySelector('[onclick*="authorLogin"]');
    if (authorTab) authorTab.click();
  }, 100);
}

function showAuthorRegistration() {
  showModal("registerModal");
  setTimeout(() => {
    const authorTab = document.querySelector('[onclick*="authorRegister"]');
    if (authorTab) authorTab.click();
  }, 100);
}

function showAdminLogin() {
  showModal("loginModal");
  setTimeout(() => {
    const adminTab = document.querySelector('[onclick*="adminLogin"]');
    if (adminTab) adminTab.click();
  }, 100);
}

function getLoginEmailFieldId(audience) {
  if (audience === "admin") return "adminLoginEmail";
  if (audience === "user") return "userLoginEmail";
  return "authorLoginEmail";
}

function clearPasswordResetUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("mode");
  url.searchParams.delete("reset_token");
  window.history.replaceState(
    {},
    document.title,
    `${url.pathname}${url.search}${url.hash}`,
  );
}

function handlePasswordResetLinkState() {
  const params = new URLSearchParams(window.location.search);
  const resetToken = params.get("reset_token");
  const mode = params.get("mode");

  if (resetToken) {
    showPasswordResetConfirm(resetToken);
    return;
  }

  if (mode === "reset-password") {
    showPasswordResetRequest("author");
  }
}

function showPasswordResetRequest(defaultAudience = "author") {
  pendingPasswordResetAudience = defaultAudience || "author";

  const emailField = document.getElementById(
    getLoginEmailFieldId(pendingPasswordResetAudience),
  );
  const requestEmail = document.getElementById("passwordResetEmail");
  const audienceSelect = document.getElementById("passwordResetAudience");

  if (requestEmail) {
    requestEmail.value = emailField?.value?.trim() || pendingPasswordResetEmail;
  }
  if (audienceSelect) {
    audienceSelect.value = pendingPasswordResetAudience;
  }

  closeModal("loginModal");
  showModal("passwordResetRequestModal");
}

function showPasswordResetConfirm(token = "") {
  const tokenInput = document.getElementById("passwordResetToken");
  if (tokenInput) {
    tokenInput.value = token || "";
  }

  closeModal("loginModal");
  closeModal("passwordResetRequestModal");
  showModal("passwordResetConfirmModal");
}

function switchAuthTab(tabName) {
  document
    .querySelectorAll(".auth-tab-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document
    .querySelectorAll(".auth-tab-content")
    .forEach((tab) => tab.classList.remove("active"));

  const activeBtn = document.querySelector(`[onclick*="${tabName}"]`);
  if (activeBtn) activeBtn.classList.add("active");

  const activeTab = document.getElementById(tabName);
  if (activeTab) activeTab.classList.add("active");
}

function switchRegisterTab(tabName) {
  document
    .querySelectorAll(".auth-tab-btn")
    .forEach((btn) => btn.classList.remove("active"));
  document
    .querySelectorAll(".auth-tab-content")
    .forEach((tab) => tab.classList.remove("active"));

  const activeBtn = document.querySelector(`[onclick*="${tabName}"]`);
  if (activeBtn) activeBtn.classList.add("active");

  const activeTab = document.getElementById(tabName);
  if (activeTab) activeTab.classList.add("active");
}

// ============================================
// 4. FORM HANDLERS (FIXED)
// ============================================

async function handleUserLogin(e) {
  e.preventDefault();
  const email = document.getElementById("userLoginEmail").value;
  const password = document.getElementById("userLoginPassword").value;
  await login(email, password, "user");
}

async function handleAuthorLogin(e) {
  e.preventDefault();
  const email = document.getElementById("authorLoginEmail").value;
  const password = document.getElementById("authorLoginPassword").value;
  await login(email, password, "author");
}

async function handleAdminLogin(e) {
  e.preventDefault();
  const email = document.getElementById("adminLoginEmail").value;
  const password = document.getElementById("adminLoginPassword").value;
  await login(email, password, "admin");
}

async function handlePasswordResetRequest(e) {
  e.preventDefault();

  try {
    showLoading("Preparing password reset...");

    const email = document.getElementById("passwordResetEmail").value.trim();
    const audience = document.getElementById("passwordResetAudience").value;

    if (!email) {
      showNotification("Please enter the account email address", "error");
      return;
    }

    pendingPasswordResetAudience = audience || "author";
    pendingPasswordResetEmail = email;

    const response = await fetch(
      `${API_BASE_URL}/auth/password-reset/request`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ email, audience: pendingPasswordResetAudience }),
      },
    );

    const data = await response.json();
    if (!response.ok || !data.success) {
      showNotification(
        data.message || "Failed to start password reset",
        "error",
      );
      return;
    }

    document.getElementById("passwordResetRequestForm").reset();

    if (data.reset_token) {
      showNotification(
        "Reset token generated locally. Choose your new password now.",
        "info",
      );
      showPasswordResetConfirm(data.reset_token);
      return;
    }

    closeModal("passwordResetRequestModal");
    showNotification(
      "If the email exists, reset instructions have been sent.",
      "success",
    );
  } catch (error) {
    console.error("Password reset request error:", error);
    showNotification("Failed to start password reset", "error");
  } finally {
    hideLoading();
  }
}

async function handlePasswordResetConfirm(e) {
  e.preventDefault();

  try {
    showLoading("Resetting password...");

    const token = document.getElementById("passwordResetToken").value.trim();
    const password = document
      .getElementById("passwordResetNewPassword")
      .value.trim();
    const confirmPassword = document
      .getElementById("passwordResetConfirmPassword")
      .value.trim();

    if (!token) {
      showNotification(
        "Reset token is missing. Request a new reset link.",
        "error",
      );
      return;
    }

    if (password.length < 6) {
      showNotification("Password must be at least 6 characters long", "error");
      return;
    }

    if (password !== confirmPassword) {
      showNotification("Passwords do not match", "error");
      return;
    }

    const response = await fetch(
      `${API_BASE_URL}/auth/password-reset/confirm`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          token,
          password,
          confirm_password: confirmPassword,
        }),
      },
    );

    const data = await response.json();
    if (!response.ok || !data.success) {
      showNotification(data.message || "Failed to reset password", "error");
      return;
    }

    document.getElementById("passwordResetConfirmForm").reset();
    closeModal("passwordResetConfirmModal");
    clearPasswordResetUrl();

    showNotification(
      data.message || "Password reset successful. Please log in.",
      "success",
    );

    showLoginModal();
    setTimeout(() => {
      if (pendingPasswordResetAudience === "admin") {
        switchAuthTab("adminLogin");
      } else if (pendingPasswordResetAudience === "user") {
        switchAuthTab("userLogin");
      } else {
        switchAuthTab("authorLogin");
      }

      const loginEmailField = document.getElementById(
        getLoginEmailFieldId(pendingPasswordResetAudience),
      );
      if (loginEmailField && pendingPasswordResetEmail) {
        loginEmailField.value = pendingPasswordResetEmail;
      }
    }, 100);
  } catch (error) {
    console.error("Password reset confirm error:", error);
    showNotification("Failed to reset password", "error");
  } finally {
    hideLoading();
  }
}

async function handleUserRegistration(e) {
  e.preventDefault();
  try {
    showLoading("Registering...");

    const userData = {
      full_name: document.getElementById("userRegFullName").value,
      email: document.getElementById("userRegEmail").value,
      username: document.getElementById("userRegUsername").value,
      password: document.getElementById("userRegPassword").value,
      phone: document.getElementById("userRegPhone").value || null,
    };

    const response = await fetch(`${API_BASE_URL}/users/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(userData),
    });

    const data = await response.json();

    if (data.success) {
      showNotification("Registration successful! Please login.", "success");
      closeModal("registerModal");
    } else {
      showNotification(data.message || "Registration failed", "error");
    }
  } catch (error) {
    console.error("Registration error:", error);
    showNotification("Registration failed. Please try again.", "error");
  } finally {
    hideLoading();
  }
}

async function handleAuthorRegistration(e) {
  e.preventDefault();
  try {
    showLoading("Registering author...");

    const formData = new FormData();
    formData.append("full_name", document.getElementById("regFullName").value);
    formData.append("email", document.getElementById("regEmail").value);
    formData.append("phone", document.getElementById("regPhone").value);
    formData.append("faculty", document.getElementById("regFaculty").value);
    formData.append(
      "department",
      document.getElementById("regDepartment").value,
    );
    formData.append("staff_id", document.getElementById("regStaffId").value);
    formData.append(
      "qualifications",
      document.getElementById("regHighestQualification").value,
    );
    formData.append(
      "areas_of_expertise",
      document.getElementById("regExpertise").value,
    );
    formData.append(
      "orcid_id",
      document.getElementById("regOrcidId").value || "",
    );
    formData.append(
      "google_scholar_id",
      document.getElementById("regGoogleScholarId").value || "",
    );
    formData.append("biography", document.getElementById("regBiography").value);
    formData.append("password", document.getElementById("regPassword").value);

    const profilePicture =
      document.getElementById("regProfilePicture").files[0];
    if (profilePicture) {
      if (!isSupportedImageFile(profilePicture)) {
        showNotification(
          "Profile picture must be a valid image file.",
          "error",
        );
        return;
      }
      formData.append("profile_image", profilePicture);
    }

    const response = await fetch(`${API_BASE_URL}/authors/register`, {
      method: "POST",
      headers: {
        Accept: "application/json",
      },
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      showNotification(
        "Author registration submitted for approval!",
        "success",
      );
      document.getElementById("authorRegisterForm").reset();
      closeModal("registerModal");
    } else {
      showNotification(data.message || "Registration failed", "error");
    }
  } catch (error) {
    console.error("Author registration error:", error);
    showNotification("Registration failed. Please try again.", "error");
  } finally {
    hideLoading();
  }
}

async function handleContactSubmit(e) {
  e.preventDefault();
  try {
    showLoading("Sending message...");

    const contactData = {
      name: document.getElementById("contactName").value,
      email: document.getElementById("contactEmail").value,
      phone: document.getElementById("contactPhone").value || null,
      subject: document.getElementById("contactSubject").value,
      message: document.getElementById("contactMessage").value,
      category: document.getElementById("contactCategory").value,
    };

    const response = await fetch(`${API_BASE_URL}/contact`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(contactData),
    });

    const data = await response.json();

    if (data.success) {
      showNotification("Message sent successfully!", "success");
      document.getElementById("contactForm").reset();
      closeModal("contactModal");
    } else {
      showNotification(data.message || "Failed to send message", "error");
    }
  } catch (error) {
    console.error("Contact form error:", error);
    showNotification("Failed to send message. Please try again.", "error");
  } finally {
    hideLoading();
  }
}

async function handleTrainingRegistration(e) {
  e.preventDefault();
  try {
    showLoading("Registering for training...");

    const trainingData = {
      full_name: document.getElementById("trainingName").value,
      email: document.getElementById("trainingEmail").value,
      student_id: document.getElementById("trainingStudentId").value || null,
      faculty: document.getElementById("trainingFaculty").value || null,
      department: document.getElementById("trainingDepartment").value || null,
      level: document.getElementById("trainingLevel").value || null,
      training_type: document.getElementById("trainingType").value,
      training_mode: document.getElementById("trainingMode").value,
      preferred_date: document.getElementById("trainingDate").value || null,
    };

    const response = await fetch(`${API_BASE_URL}/training/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(trainingData),
    });

    const data = await response.json();

    if (data.success) {
      showNotification(
        "Training registration submitted successfully!",
        "success",
      );
      document.getElementById("trainingForm").reset();
      closeModal("trainingModal");
    } else {
      showNotification(
        data.message || "Failed to register for training",
        "error",
      );
    }
  } catch (error) {
    console.error("Training registration error:", error);
    showNotification(
      "Failed to register for training. Please try again.",
      "error",
    );
  } finally {
    hideLoading();
  }
}

// ============================================
// 5. HOMEPAGE FUNCTIONALITY
// ============================================

function setupEventListeners() {
  // Mobile menu
  const hamburgerMenu = document.getElementById("hamburgerMenu");
  const mobileMenuOverlay = document.getElementById("mobileMenuOverlay");

  if (hamburgerMenu) hamburgerMenu.addEventListener("click", toggleMobileMenu);
  if (mobileMenuOverlay)
    mobileMenuOverlay.addEventListener("click", closeMobileMenu);

  // Publication filters
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      document
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
      const category = this.dataset.category;
      filterPublications(category);
    });
  });

  // Close modals on overlay click
  document.addEventListener("click", function (e) {
    if (e.target.classList.contains("modal")) {
      closeModal(e.target.id);
    }
  });

  // Close on escape key
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") {
      document
        .querySelectorAll(".modal")
        .forEach((modal) => modal.classList.remove("active"));
      closeMobileMenu();
      document.body.style.overflow = "auto";
    }
  });

  // Smooth scroll for anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      const href = this.getAttribute("href");
      if (href === "#" || href === "#!") return;

      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        const headerHeight =
          document.querySelector(".site-header").offsetHeight;
        const targetPosition = target.offsetTop - headerHeight;

        window.scrollTo({
          top: targetPosition,
          behavior: "smooth",
        });

        closeMobileMenu();
      }
    });
  });
}

async function loadHomepageData() {
  try {
    showLoading("Loading data...");

    // Load published books
    const booksResponse = await fetch(`${API_BASE_URL}/books/published`);
    const booksData = await booksResponse.json();

    if (booksData.success) {
      publications = booksData.books || [];
      displayPublications(publications.slice(0, itemsPerPage));
      document.getElementById("publishedBooks").textContent =
        booksData.count || "150+";
      document.getElementById("totalBooksPublished").textContent =
        booksData.count || "150+";
    }

    // Load authors count
    const authorsResponse = await fetch(`${API_BASE_URL}/authors/count`);
    const authorsData = await authorsResponse.json();

    if (authorsData.success) {
      document.getElementById("activeAuthors").textContent =
        authorsData.count || "85+";
      document.getElementById("authorsPublished").textContent =
        authorsData.count || "85+";
    }

    // Load training count
    const trainingResponse = await fetch(`${API_BASE_URL}/training/count`);
    const trainingData = await trainingResponse.json();

    if (trainingData.success) {
      document.getElementById("studentsTrained").textContent =
        trainingData.count || "1200+";
    }
  } catch (error) {
    console.error("Error loading homepage data:", error);
    // Fallback to sample data
    loadSampleData();
  } finally {
    hideLoading();
  }
}

function loadSampleData() {
  const sampleBooks = [
    {
      id: 1,
      title: "Introduction to Computer Science",
      author_name: "Dr. John Adebayo",
      category: "Textbook",
      description: "Comprehensive guide to computer science fundamentals",
      publication_date: "2023-01-15",
      price: "4500",
    },
    {
      id: 2,
      title: "Research Methods in Social Sciences",
      author_name: "Prof. Mary Johnson",
      category: "Research",
      description: "Advanced methodologies for social science research",
      publication_date: "2022-08-20",
      price: "5200",
    },
    {
      id: 3,
      title: "Business Ethics and Corporate Governance",
      author_name: "Dr. Samuel Ojo",
      category: "Textbook",
      description: "Ethical frameworks for modern business practices",
      publication_date: "2023-03-10",
      price: "3800",
    },
    {
      id: 4,
      title: "Advances in Medical Research",
      author_name: "Various Authors",
      category: "Journal",
      description: "Latest developments in medical science research",
      publication_date: "2024-01-05",
      price: "2800",
    },
  ];

  publications = sampleBooks;
  displayPublications(sampleBooks);
}

function displayPublications(books) {
  const grid = document.getElementById("publicationsGrid");
  if (!grid) return;

  grid.innerHTML = "";

  if (books.length === 0) {
    grid.innerHTML = `
            <div style="grid-column: 1 / -1; text-align: center; padding: 40px;">
                <i class="fas fa-book" style="font-size: 48px; color: var(--gray-400); margin-bottom: 20px;"></i>
                <h3 style="color: var(--gray-600); margin-bottom: 10px;">No publications found</h3>
                <p style="color: var(--gray-500);">Check back soon for new publications.</p>
            </div>
        `;
    return;
  }

  books.forEach((book) => {
    const card = document.createElement("div");
    card.className = "publication-card";

    const year = book.publication_date
      ? new Date(book.publication_date).getFullYear()
      : book.created_at
        ? new Date(book.created_at).getFullYear()
        : "2023";

    const price = book.price
      ? `₦${parseInt(book.price).toLocaleString()}`
      : "Available";

    card.innerHTML = `
            <div class="publication-image"><i class="fas fa-book"></i></div>
            <div class="publication-content">
                <span class="publication-category">${book.category || "Academic"}</span>
                <h3 class="publication-title">${book.title}</h3>
                <p class="publication-author"><i class="fas fa-user"></i> ${book.author_name || "Babcock Author"}</p>
                <p style="color: var(--gray-600); font-size: 0.9rem; margin-bottom: 15px;">
                    ${book.description ? book.description.substring(0, 100) + "..." : "Academic publication from Babcock University"}
                </p>
                <div class="publication-meta">
                    <span style="color: var(--gray-500); font-size: 0.9rem;">
                        <i class="far fa-calendar"></i> ${year}
                    </span>
                    <div class="publication-price">${price}</div>
                </div>
            </div>
        `;

    grid.appendChild(card);
  });
}

function filterPublications(category) {
  if (category === "all") {
    displayPublications(publications.slice(0, itemsPerPage));
  } else {
    const filtered = publications.filter(
      (book) =>
        book.category &&
        book.category.toLowerCase().includes(category.toLowerCase()),
    );
    displayPublications(filtered.slice(0, itemsPerPage));
  }
}

function loadMorePublications() {
  currentPage++;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const moreBooks = publications.slice(0, endIndex);
  displayPublications(moreBooks);

  // Hide button if no more books
  if (endIndex >= publications.length) {
    const loadMoreButton = document.querySelector(
      '.btn[onclick="loadMorePublications()"]',
    );
    if (loadMoreButton) {
      loadMoreButton.style.display = "none";
    }
  }
}

// ============================================
// 6. ABOUT US SECTION
// ============================================

async function loadAboutInfo() {
  try {
    const response = await fetch(`${API_BASE_URL}/about`);
    const data = await response.json();

    if (data.success) {
      // Update statistics if needed
      const stats = data.data.stats;
      if (stats) {
        const publishedBooks = document.getElementById("publishedBooks");
        const activeAuthors = document.getElementById("activeAuthors");
        const studentsTrained = document.getElementById("studentsTrained");
        const totalBooksPublished = document.getElementById(
          "totalBooksPublished",
        );
        const authorsPublished = document.getElementById("authorsPublished");

        if (publishedBooks)
          publishedBooks.textContent = `${stats.booksPublished}+`;
        if (activeAuthors)
          activeAuthors.textContent = `${stats.authorsPublished}+`;
        if (studentsTrained)
          studentsTrained.textContent = `${stats.studentsTrained}+`;
        if (totalBooksPublished)
          totalBooksPublished.textContent = `${stats.booksPublished}+`;
        if (authorsPublished)
          authorsPublished.textContent = `${stats.authorsPublished}+`;
      }
    }
  } catch (error) {
    console.error("Error loading about info:", error);
    // Use default values
  }
}

function initAdminLayout() {
  const sidebar = document.getElementById("sidebar");
  const mainContent = document.getElementById("mainContent");
  const toggleBtn = document.getElementById("toggleSidebar");
  const mobileToggle = document.getElementById("mobileMenuToggle");

  if (toggleBtn && sidebar && mainContent) {
    toggleBtn.addEventListener("click", () => {
      sidebar.classList.toggle("collapsed");
      mainContent.classList.toggle("expanded");

      const icon = toggleBtn.querySelector("i");
      if (icon) {
        icon.classList.toggle("fa-chevron-left");
        icon.classList.toggle("fa-chevron-right");
      }
    });
  }

  if (mobileToggle && sidebar) {
    mobileToggle.addEventListener("click", () => {
      sidebar.classList.toggle("active");
    });
  }
}

// ============================================
// 7. DASHBOARD MANAGEMENT
// ============================================

function setupDashboardNavigation() {
  const sidebarMenu = document.querySelector(".sidebar-menu");
  if (sidebarMenu) {
    sidebarMenu.addEventListener("click", function (e) {
      const navItem = e.target.closest("a.nav-item");
      if (!navItem || !sidebarMenu.contains(navItem)) return;
      e.preventDefault();

      if (!navItem.dataset.section) {
        return;
      }

      if (!currentUser || !ADMIN_ROLES.includes(currentUser.role)) {
        showNotification("Please login to access admin tools", "error");
        showAdminLogin();
        return;
      }

      if (
        navItem.dataset.section === localStorage.getItem("activeAdminSection")
      ) {
        showDashboardSection(navItem.dataset.section);
        return;
      }

      const section = navItem.dataset.section;
      showDashboardSection(section);
    });
  }
}

function setDashboardSectionVisibility(activeSectionId) {
  const sections = document.querySelectorAll(
    "#adminDashboard .content-section",
  );
  sections.forEach((section) => {
    const isActive = section.id === activeSectionId;
    section.classList.toggle("active", isActive);
    section.hidden = !isActive;
    section.setAttribute("aria-hidden", String(!isActive));
  });
}

function renderAdminTableMessage(tbody, colspan, message) {
  if (!tbody) return;
  tbody.innerHTML = `
    <tr>
      <td colspan="${colspan}" style="text-align: center; padding: 20px">
        ${message}
      </td>
    </tr>
  `;
}

function handleAdminSectionAuthFailure(message) {
  localStorage.removeItem("authToken");
  currentUser = null;
  updateAuthUI();
  updateMobileMenu();
  showNotification(message || "Please login again", "error");
  showAdminLogin();
}

function showDashboardSection(sectionId) {
  const targetSection = document.getElementById(sectionId);
  if (!targetSection) return;

  localStorage.setItem("activeAdminSection", sectionId);

  const navItems = document.querySelectorAll(
    "#adminDashboard .nav-item[data-section]",
  );
  navItems.forEach((nav) => {
    const isActive = nav.dataset.section === sectionId;
    nav.classList.toggle("active", isActive);
    nav.setAttribute("aria-current", isActive ? "page" : "false");
  });

  const activeNav = document.querySelector(
    `.nav-item[data-section="${sectionId}"] span`,
  );
  const pageTitle = document.getElementById("pageTitle");
  if (activeNav && pageTitle) {
    pageTitle.textContent = activeNav.textContent;
  }

  setDashboardSectionVisibility(sectionId);

  if (sectionId === "dashboard") {
    loadAdminDashboard();
  } else if (sectionId === "users") {
    loadRegisteredUsers();
  } else if (sectionId === "authors") {
    loadAuthors();
  } else if (sectionId === "books") {
    loadBooks();
  } else if (sectionId === "submissions") {
    loadSubmissions();
  } else if (sectionId === "contracts") {
    loadContracts();
  } else if (sectionId === "training") {
    loadTrainingRegistrations();
  }

  const sidebar = document.getElementById("sidebar");
  if (sidebar && sidebar.classList.contains("active")) {
    sidebar.classList.remove("active");
  }
}

async function loadAdminDashboard() {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      showNotification("Please login to access admin dashboard", "error");
      showLoginModal();
      return;
    }

    const response = await fetch(`${API_BASE_URL}/admin/dashboard/stats`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    let data = {};
    try {
      data = await response.json();
    } catch (error) {
      throw new Error("Invalid server response");
    }

    if (!response.ok) {
      if (response.status === 401) {
        localStorage.removeItem("authToken");
        currentUser = null;
        updateAuthUI();
        updateMobileMenu();
        showNotification(data.message || "Please login again", "error");
        showAdminLogin();
        return;
      }

      showNotification(
        data.message || `Failed to load dashboard stats (${response.status})`,
        "error",
      );
      return;
    }

    if (data.success && data.stats) {
      const stats = data.stats;

      // Update dashboard stats
      document.getElementById("pendingAuthorsCount").textContent =
        stats.authors.pending || 0;
      document.getElementById("totalBooksCount").textContent =
        stats.books.total || 0;
      document.getElementById("pendingSubmissionsCount").textContent =
        stats.submissions.pending || 0;
      document.getElementById("pendingTrainingCount").textContent =
        stats.training.pending || 0;
    } else {
      showNotification(
        data.message || "Failed to load dashboard stats",
        "error",
      );
    }
  } catch (error) {
    console.error("Error loading dashboard:", error);
    showNotification(error.message || "Failed to load dashboard", "error");
  }
}

async function loadAuthors() {
  const tbody = document.getElementById("authorsTableBody");

  try {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const response = await fetch(`${API_BASE_URL}/admin/authors`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const data = await response.json();
    if (!tbody) return;

    if (!response.ok || !data.success) {
      adminAuthorsCache = [];
      updateAuthorsSectionSummary([]);
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="admin-empty-state">
            ${escapeHtml(data.message || "Failed to load authors")}
          </td>
        </tr>
      `;
      return;
    }

    const authors = Array.isArray(data.authors) ? data.authors : [];
    adminAuthorsCache = authors;
    updateAuthorsSectionSummary(authors);

    if (authors.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="admin-empty-state">
            No author records found
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = authors
      .map((author) => {
        const displayStatus = formatDashboardLabel(
          author.user_status || "pending",
          "Pending",
        );
        const facultyLabel = author.faculty || "No faculty assigned";
        const departmentLabel = author.department || "Department not set";
        const staffIdLabel = author.staff_id || "No ID";
        const joinedDate = author.created_at
          ? new Date(author.created_at).toLocaleDateString()
          : "Unknown";

        return `
          <tr>
            <td>
              <div class="admin-author-primary">
                <strong class="admin-author-name">${escapeHtml(author.full_name || "N/A")}</strong>
                <span class="admin-author-meta">${escapeHtml(staffIdLabel)} • Joined ${escapeHtml(joinedDate)}</span>
              </div>
            </td>
            <td>
              <div class="admin-author-contact">
                <span>${escapeHtml(author.email || "N/A")}</span>
                <span class="admin-author-meta">${escapeHtml(author.phone || author.username || "No secondary contact")}</span>
              </div>
            </td>
            <td>
              <div class="admin-author-campus">
                <strong>${escapeHtml(facultyLabel)}</strong>
                <span class="admin-author-meta">${escapeHtml(departmentLabel)}</span>
              </div>
            </td>
            <td>
              <span class="status-badge status-${escapeHtml(author.user_status || "pending")}">${escapeHtml(displayStatus)}</span>
            </td>
            <td>
              <span class="admin-author-count">${escapeHtml(author.bookCount || 0)}</span>
            </td>
            <td>
              <div class="table-action-group">
                <button class="table-action-btn info" onclick="viewAuthor(${author.id})">View</button>
                ${
                  author.user_status === "pending"
                    ? `
                      <button class="table-action-btn success" onclick="approveAuthor(${author.id})">Approve</button>
                      <button class="table-action-btn danger" onclick="rejectAuthor(${author.id})">Reject</button>
                    `
                    : ""
                }
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Error loading authors:", error);
    adminAuthorsCache = [];
    updateAuthorsSectionSummary([]);
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="admin-empty-state">
            Failed to load authors
          </td>
        </tr>
      `;
    }
  }
}

function updateAuthorsSectionSummary(authors) {
  const list = Array.isArray(authors) ? authors : [];
  const totalAuthors = list.length;
  const pendingAuthors = list.filter(
    (author) => (author.user_status || "pending") === "pending",
  ).length;
  const approvedAuthors = list.filter(
    (author) => (author.user_status || "") === "active",
  ).length;
  const totalBooks = list.reduce(
    (sum, author) => sum + (Number(author.bookCount) || 0),
    0,
  );

  const totalNode = document.getElementById("authorsTotalCount");
  const pendingNode = document.getElementById("authorsPendingCount");
  const approvedNode = document.getElementById("authorsApprovedCount");
  const booksNode = document.getElementById("authorsBooksCount");

  if (totalNode) totalNode.textContent = totalAuthors;
  if (pendingNode) pendingNode.textContent = pendingAuthors;
  if (approvedNode) approvedNode.textContent = approvedAuthors;
  if (booksNode) booksNode.textContent = totalBooks;
}

async function loadRegisteredUsers() {
  const tbody = document.getElementById("usersTableBody");

  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      renderAdminTableMessage(tbody, 8, "Please login again");
      return;
    }

    const response = await fetch(`${API_BASE_URL}/admin/users?limit=100`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
    let data = {};
    try {
      data = await response.json();
    } catch (error) {
      throw new Error("Invalid server response");
    }

    if (!tbody) return;

    if (response.status === 401 || response.status === 403) {
      renderAdminTableMessage(tbody, 8, data.message || "Please login again");
      handleAdminSectionAuthFailure(data.message || "Please login again");
      return;
    }

    if (!response.ok || !data.success) {
      renderAdminTableMessage(
        tbody,
        8,
        escapeHtml(data.message || "Failed to load users"),
      );
      return;
    }

    if (!data.users || data.users.length === 0) {
      renderAdminTableMessage(tbody, 8, "No registered users found");
      return;
    }

    tbody.innerHTML = data.users
      .map((user) => {
        const userId = Number(user.id);
        const status = (user.status || "pending").toLowerCase();
        const statusLabel = formatDashboardLabel(status, "Pending");
        const lastLogin = user.last_login
          ? new Date(user.last_login).toLocaleString()
          : "Never";
        const registeredOn = user.created_at
          ? new Date(user.created_at).toLocaleDateString()
          : "N/A";
        const actionMarkup =
          status === "pending" && Number.isFinite(userId)
            ? `<button class="table-action-btn success" onclick="approveRegisteredUser(${userId})">Approve</button>`
            : `<span class="admin-author-meta">No approval needed</span>`;

        return `
          <tr>
            <td>${escapeHtml(user.full_name || "N/A")}</td>
            <td>${escapeHtml(user.email || "N/A")}</td>
            <td>${escapeHtml(user.username || "N/A")}</td>
            <td style="text-transform: capitalize;">${escapeHtml(formatDashboardLabel(user.role || "user", "User"))}</td>
            <td><span class="status-badge status-${escapeHtml(status)}">${escapeHtml(statusLabel)}</span></td>
            <td>${escapeHtml(lastLogin)}</td>
            <td>${escapeHtml(registeredOn)}</td>
            <td>${actionMarkup}</td>
          </tr>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Error loading registered users:", error);
    if (tbody) {
      renderAdminTableMessage(tbody, 8, "Error loading users");
    }
  }
}

async function updateRegisteredUserStatus(userId, status) {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      showNotification("Please login again", "error");
      return;
    }

    const response = await fetch(
      `${API_BASE_URL}/admin/users/${userId}/status`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ status }),
      },
    );

    let data = {};
    try {
      data = await response.json();
    } catch (error) {
      throw new Error("Invalid server response");
    }

    if (response.status === 401 || response.status === 403) {
      handleAdminSectionAuthFailure(data.message || "Please login again");
      return;
    }

    if (!response.ok || !data.success) {
      showNotification(data.message || "Failed to update user status", "error");
      return;
    }

    showNotification(
      data.message || "User status updated successfully",
      "success",
    );
    await loadRegisteredUsers();
    await loadAdminDashboard();
  } catch (error) {
    console.error("Update registered user status error:", error);
    showNotification("Failed to update user status", "error");
  }
}

function approveRegisteredUser(userId) {
  if (!confirm("Approve this user registration?")) return;
  updateRegisteredUserStatus(userId, "approved");
}

async function loadBooks() {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const response = await fetch(`${API_BASE_URL}/admin/books?limit=100`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
    const data = await response.json();
    const tbody = document.getElementById("booksTableBody");
    if (!tbody) return;

    if (!response.ok || !data.success) {
      adminBooksCache = [];
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 20px">
            Failed to load books
          </td>
        </tr>
      `;
      return;
    }

    if (!data.books || data.books.length === 0) {
      adminBooksCache = [];
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 20px">
            No books found
          </td>
        </tr>
      `;
      return;
    }

    adminBooksCache = data.books;
    tbody.innerHTML = data.books
      .map((book) => {
        const price =
          book.price !== null && book.price !== undefined
            ? `₦${Number(book.price).toLocaleString()}`
            : "N/A";
        return `
          <tr>
            <td>${book.title || "N/A"}</td>
            <td>${book.author_name || "N/A"}</td>
            <td>${book.category || "N/A"}</td>
            <td><span class="status-badge status-${book.status || "draft"}">${book.status || "draft"}</span></td>
            <td>${price}</td>
            <td>
              <div class="table-action-group">
                <button class="table-action-btn info" onclick="viewBook(${book.id})">View</button>
                <button class="table-action-btn success" onclick="openContractEditorForBook(${book.id})">Contract</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Error loading books:", error);
    adminBooksCache = [];
    const tbody = document.getElementById("booksTableBody");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 20px">
            Error loading books
          </td>
        </tr>
      `;
    }
  }
}

async function updateAuthorStatus(authorId, status) {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      showNotification("Please login again", "error");
      return;
    }

    const response = await fetch(
      `${API_BASE_URL}/admin/authors/${authorId}/status`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({ status }),
      },
    );

    const data = await response.json();
    if (!response.ok || !data.success) {
      showNotification(
        data.message || "Failed to update author status",
        "error",
      );
      return;
    }

    showNotification(
      data.message || `Author ${status} successfully`,
      "success",
    );
    await loadAuthors();
    await loadAdminDashboard();
  } catch (error) {
    console.error("Update author status error:", error);
    showNotification("Failed to update author status", "error");
  }
}

function approveAuthor(authorId) {
  if (!confirm("Approve this author registration?")) return;
  updateAuthorStatus(authorId, "approved");
}

function rejectAuthor(authorId) {
  if (!confirm("Reject this author registration?")) return;
  updateAuthorStatus(authorId, "rejected");
}

async function loadSubmissions() {
  const tbody = document.getElementById("submissionsTableBody");

  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      renderAdminTableMessage(tbody, 6, "Please login again");
      return;
    }

    const response = await fetch(
      `${API_BASE_URL}/admin/submissions?limit=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    );
    let data = {};
    try {
      data = await response.json();
    } catch (error) {
      throw new Error("Invalid server response");
    }

    if (!tbody) return;

    if (response.status === 401 || response.status === 403) {
      renderAdminTableMessage(tbody, 6, data.message || "Please login again");
      handleAdminSectionAuthFailure(data.message);
      return;
    }

    if (!response.ok || !data.success) {
      adminSubmissionsCache = [];
      renderAdminTableMessage(
        tbody,
        6,
        data.message || "Failed to load submissions",
      );
      return;
    }

    if (!data.submissions || data.submissions.length === 0) {
      adminSubmissionsCache = [];
      renderAdminTableMessage(tbody, 6, "No submissions found");
      return;
    }

    adminSubmissionsCache = data.submissions;
    tbody.innerHTML = data.submissions
      .map((submission) => {
        const submittedDate = submission.submission_date
          ? new Date(submission.submission_date).toLocaleDateString()
          : "N/A";
        return `
          <tr>
            <td>${submission.book_title || "N/A"}</td>
            <td>${submission.submission_type || "N/A"}</td>
            <td><span class="status-badge status-${submission.status || "pending"}">${submission.status || "pending"}</span></td>
            <td>${submission.priority || "medium"}</td>
            <td>${submittedDate}</td>
            <td>
              <div class="table-action-group">
                <button class="table-action-btn info" onclick="viewSubmission(${submission.id})">View</button>
                <button class="table-action-btn success" onclick="viewBook(${submission.book_id})">Book</button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Error loading submissions:", error);
    adminSubmissionsCache = [];
    renderAdminTableMessage(tbody, 6, "Error loading submissions");
  }
}

async function loadContracts() {
  const tbody = document.getElementById("contractsTableBody");

  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      renderAdminTableMessage(tbody, 6, "Please login again");
      return;
    }

    const response = await fetch(`${API_BASE_URL}/admin/contracts?limit=100`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
    let data = {};
    try {
      data = await response.json();
    } catch (error) {
      throw new Error("Invalid server response");
    }

    if (!tbody) return;

    if (response.status === 401 || response.status === 403) {
      renderAdminTableMessage(tbody, 6, data.message || "Please login again");
      handleAdminSectionAuthFailure(data.message);
      return;
    }

    if (!response.ok || !data.success) {
      adminContractsCache = [];
      renderAdminTableMessage(
        tbody,
        6,
        data.message || "Failed to load contracts",
      );
      return;
    }

    if (!data.contracts || data.contracts.length === 0) {
      adminContractsCache = [];
      renderAdminTableMessage(tbody, 6, "No contracts found");
      return;
    }

    adminContractsCache = data.contracts;
    tbody.innerHTML = data.contracts
      .map(
        (contract) => `
        <tr>
          <td>${contract.contract_number || "N/A"}</td>
          <td>${contract.book_title || "N/A"}</td>
          <td>${contract.author_name || "N/A"}</td>
          <td>${contract.contract_type || "N/A"}</td>
          <td><span class="status-badge status-${contract.status || "draft"}">${contract.status || "draft"}</span></td>
          <td>
            <div class="table-action-group">
              <button class="table-action-btn info" onclick="openContractEditor(${contract.id})">View</button>
            </div>
          </td>
        </tr>
      `,
      )
      .join("");
  } catch (error) {
    console.error("Error loading contracts:", error);
    adminContractsCache = [];
    renderAdminTableMessage(tbody, 6, "Error loading contracts");
  }
}

async function fetchAdminCollection(path, rootKey) {
  const token = localStorage.getItem("authToken");
  if (!token) {
    throw new Error("Please login again");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/json",
    },
  });

  let data = {};
  try {
    data = await response.json();
  } catch (error) {
    throw new Error("Invalid server response");
  }

  if (response.status === 401 || response.status === 403) {
    handleAdminSectionAuthFailure(data.message || "Please login again");
    throw new Error(data.message || "Please login again");
  }

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Request failed");
  }

  return rootKey ? data[rootKey] : data;
}

async function ensureAdminAuthorsCache(force = false) {
  if (!force && adminAuthorsCache.length > 0) {
    return adminAuthorsCache;
  }

  const authors = await fetchAdminCollection("/admin/authors", "authors");
  adminAuthorsCache = Array.isArray(authors) ? authors : [];
  return adminAuthorsCache;
}

async function ensureAdminBooksCache(force = false) {
  if (!force && adminBooksCache.length > 0) {
    return adminBooksCache;
  }

  const books = await fetchAdminCollection("/admin/books?limit=100", "books");
  adminBooksCache = Array.isArray(books) ? books : [];
  return adminBooksCache;
}

function getCachedAuthor(authorId) {
  const numericId = Number(authorId);
  return (
    adminAuthorsCache.find((author) => Number(author.id) === numericId) || null
  );
}

function getCachedBook(bookId) {
  const numericId = Number(bookId);
  return adminBooksCache.find((book) => Number(book.id) === numericId) || null;
}

function formatDateForInput(value) {
  if (!value) return "";
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) return "";
  return parsedDate.toISOString().slice(0, 10);
}

function renderStatusBadge(status, fallback = "N/A") {
  const safeStatus = escapeHtml(status || "pending");
  return `<span class="status-badge status-${safeStatus}">${escapeHtml(
    formatDashboardLabel(status || fallback, fallback),
  )}</span>`;
}

function renderWorkflowList(items, emptyMessage, renderItem) {
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) {
    return `<li class="workflow-empty">${escapeHtml(emptyMessage)}</li>`;
  }

  return list.map(renderItem).join("");
}

function renderWorkflowField(label, value) {
  return `
    <div class="workflow-field">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value || "N/A")}</strong>
    </div>
  `;
}

function getEditorialFeedbackBadgeMeta(entry = {}) {
  const decision = String(entry.decision || entry.recommendation || "")
    .trim()
    .toLowerCase();

  if (decision === "accept") {
    return { className: "accepted", label: "Accepted" };
  }

  if (decision === "reject") {
    return { className: "rejected", label: "Rejected" };
  }

  if (
    entry.action_required ||
    ["minor_revisions", "major_revisions", "resubmit"].includes(decision)
  ) {
    return {
      className: "revisions_requested",
      label: decision ? formatDashboardLabel(decision) : "Action Required",
    };
  }

  if ((entry.audience || "").toLowerCase() === "internal") {
    return { className: "draft", label: "Internal Note" };
  }

  const normalizedStatus = String(entry.status || "")
    .trim()
    .toLowerCase();
  if (normalizedStatus) {
    return {
      className: normalizedStatus,
      label: formatDashboardLabel(normalizedStatus),
    };
  }

  return { className: "completed", label: "Editorial Note" };
}

function getEditorialFeedbackTitle(entry = {}) {
  return (
    entry.feedback_title ||
    entry.title ||
    (entry.decision || entry.recommendation
      ? formatDashboardLabel(entry.decision || entry.recommendation)
      : null) ||
    "Editorial update"
  );
}

function getEditorialFeedbackSummary(entry = {}) {
  return (
    entry.message ||
    entry.summary ||
    entry.comments ||
    entry.review_comments ||
    entry.content ||
    "Editorial activity has been recorded for this manuscript."
  );
}

function normalizeLegacyReviewEntry(entry = {}) {
  return {
    ...entry,
    feedback_title:
      entry.feedback_title || entry.title || "Editorial review note",
    summary:
      entry.summary ||
      entry.message ||
      entry.content ||
      "Editorial activity has been recorded for this manuscript.",
    recommendation: entry.recommendation || entry.decision || null,
    action_required: Boolean(entry.action_required),
  };
}

function renderEditorialFeedbackAttachment(
  entry = {},
  label = "Open attachment",
) {
  const attachmentUrl = entry.attachment_url || entry.attachmentUrl;
  if (!attachmentUrl) return "";
  return `
    <a
      class="workflow-attachment-link"
      href="${escapeHtml(resolveAssetUrl(attachmentUrl))}"
      target="_blank"
      rel="noopener noreferrer">
      <i class="fas fa-paperclip"></i> ${escapeHtml(label)}
    </a>
  `;
}

function renderEditorialFeedbackList(
  entries,
  emptyMessage,
  { showAudience = false } = {},
) {
  const feedbackEntries = Array.isArray(entries) ? entries : [];
  if (feedbackEntries.length === 0) {
    return `<li class="workflow-empty">${escapeHtml(emptyMessage)}</li>`;
  }

  return feedbackEntries
    .map((entry) => {
      const badge = getEditorialFeedbackBadgeMeta(entry);
      const title = getEditorialFeedbackTitle(entry);
      const summary = getEditorialFeedbackSummary(entry);
      const authorLabel =
        entry.created_by_name || entry.reviewer_name || "Publishing team";
      const attachmentMarkup = renderEditorialFeedbackAttachment(entry);
      const audienceTag = showAudience
        ? `<span class="workflow-note-tag">${escapeHtml(
            (entry.audience || "author") === "internal"
              ? "Internal"
              : "Author Visible",
          )}</span>`
        : "";

      return `
        <li class="workflow-feedback-item${
          entry.action_required ? " is-action-required" : ""
        }">
          <div class="workflow-feedback-copy">
            <strong>${escapeHtml(title)}</strong>
            <span class="workflow-feedback-meta">${escapeHtml(authorLabel)} • ${escapeHtml(
              formatDashboardDate(entry.created_at, "Recently"),
            )}</span>
            <p>${escapeHtml(summary)}</p>
            ${attachmentMarkup}
          </div>
          <div class="workflow-list-actions">
            ${audienceTag}
            <span class="status-badge status-${escapeHtml(
              badge.className,
            )}">${escapeHtml(badge.label)}</span>
          </div>
        </li>
      `;
    })
    .join("");
}

function getReviewerOptionsMarkup(selectedReviewerId = "") {
  const normalizedSelected = String(selectedReviewerId || "");
  const options = adminAuthorsCache
    .filter((author) => (author.user_status || "") === "active")
    .map((author) => {
      const authorId = String(author.id);
      const selectedAttribute =
        authorId === normalizedSelected ? " selected" : "";
      const descriptor = [author.full_name || "Unnamed author", author.faculty]
        .filter(Boolean)
        .join(" - ");
      return `<option value="${escapeHtml(authorId)}"${selectedAttribute}>${escapeHtml(descriptor || `Author ${authorId}`)}</option>`;
    })
    .join("");

  return `
    <option value="">Unassigned</option>
    ${options}
  `;
}

async function openAdminBookModal(prefill = {}) {
  try {
    if (!currentUser || !ADMIN_ROLES.includes(currentUser.role)) {
      showNotification("Admin access required", "error");
      return;
    }

    showLoading("Loading book form...");
    await ensureAdminAuthorsCache();

    const form = document.getElementById("adminBookForm");
    const authorSelect = document.getElementById("adminBookAuthor");
    if (!form || !authorSelect) {
      throw new Error("Admin book form is not available");
    }

    form.reset();
    authorSelect.innerHTML = `
      <option value="">Select Author</option>
      ${adminAuthorsCache
        .map((author) => {
          const descriptor = [
            author.full_name || "Unnamed author",
            author.faculty,
          ]
            .filter(Boolean)
            .join(" - ");
          return `<option value="${escapeHtml(author.id)}">${escapeHtml(descriptor || `Author ${author.id}`)}</option>`;
        })
        .join("")}
    `;

    document.getElementById("adminBookTitle").value = prefill.title || "";
    document.getElementById("adminBookSubtitle").value = prefill.subtitle || "";
    document.getElementById("adminBookCategory").value = prefill.category || "";
    document.getElementById("adminBookAuthor").value = prefill.author_id || "";
    document.getElementById("adminBookStatus").value =
      prefill.status || "draft";
    document.getElementById("adminBookPrice").value = prefill.price || "";
    document.getElementById("adminBookPublicationDate").value =
      formatDateForInput(prefill.publication_date);
    document.getElementById("adminBookLanguage").value =
      prefill.language || "English";
    document.getElementById("adminBookKeywords").value = prefill.keywords || "";
    document.getElementById("adminBookAbstract").value = prefill.abstract || "";
    document.getElementById("adminBookDescription").value =
      prefill.description || "";

    showModal("adminBookModal");
  } catch (error) {
    console.error("Open admin book modal error:", error);
    showNotification(error.message || "Failed to open book form", "error");
  } finally {
    hideLoading();
  }
}

async function handleAdminBookCreate(event) {
  event.preventDefault();

  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      showNotification("Please login again", "error");
      return;
    }

    const payload = {
      author_id: document.getElementById("adminBookAuthor")?.value,
      title: document.getElementById("adminBookTitle")?.value.trim(),
      subtitle: document.getElementById("adminBookSubtitle")?.value.trim(),
      category: document.getElementById("adminBookCategory")?.value.trim(),
      status: document.getElementById("adminBookStatus")?.value || "draft",
      price: document.getElementById("adminBookPrice")?.value.trim(),
      publication_date:
        document.getElementById("adminBookPublicationDate")?.value || "",
      language:
        document.getElementById("adminBookLanguage")?.value.trim() || "English",
      keywords: document.getElementById("adminBookKeywords")?.value.trim(),
      abstract: document.getElementById("adminBookAbstract")?.value.trim(),
      description: document
        .getElementById("adminBookDescription")
        ?.value.trim(),
    };

    showLoading("Creating book record...");

    const response = await fetch(`${API_BASE_URL}/admin/books`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      showNotification(data.message || "Failed to create book", "error");
      return;
    }

    closeModal("adminBookModal");
    showNotification(data.message || "Book created successfully", "success");
    await Promise.all([loadBooks(), loadContracts(), loadAdminDashboard()]);

    if (data.book_id) {
      await viewBook(data.book_id);
    }
  } catch (error) {
    console.error("Admin book create error:", error);
    showNotification("Failed to create book", "error");
  } finally {
    hideLoading();
  }
}

async function viewBook(bookId) {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      showNotification("Please login to continue", "error");
      return;
    }

    showLoading("Loading book workflow...");

    const response = await fetch(`${API_BASE_URL}/admin/books/${bookId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const data = await response.json();
    if (!response.ok || !data.success || !data.book) {
      showNotification(data.message || "Failed to load book details", "error");
      return;
    }

    const book = data.book;
    const coverImage = book.cover_image
      ? resolveAssetUrl(book.cover_image)
      : "assets/OIP.webp";
    const content = document.getElementById("bookDetailsContent");
    if (!content) return;

    const submissionList = renderWorkflowList(
      book.submissions,
      "No submissions linked to this book yet.",
      (submission) => `
        <li>
          <div>
            <strong>${escapeHtml(
              formatDashboardLabel(
                submission.submission_type || "publishing",
                "Publishing",
              ),
            )}</strong>
            <span>${escapeHtml(
              formatDashboardDate(
                submission.submission_date,
                "No submission date",
              ),
            )}</span>
          </div>
          <div class="workflow-list-actions">
            ${renderStatusBadge(submission.status || "pending", "Pending")}
            <button type="button" class="table-action-btn info" onclick="viewSubmission(${submission.id})">Open</button>
          </div>
        </li>
      `,
    );
    const contractList = renderWorkflowList(
      book.contracts,
      "No contracts recorded for this book yet.",
      (contract) => `
        <li>
          <div>
            <strong>${escapeHtml(contract.contract_number || "Draft contract")}</strong>
            <span>${escapeHtml(
              formatDashboardLabel(
                contract.contract_type || "standard",
                "Standard",
              ),
            )}</span>
          </div>
          <div class="workflow-list-actions">
            ${renderStatusBadge(contract.status || "draft", "Draft")}
            <button type="button" class="table-action-btn info" onclick="openContractEditor(${contract.id})">Open</button>
          </div>
        </li>
      `,
    );
    const progressList = renderWorkflowList(
      book.progress,
      "No workflow milestones have been recorded yet.",
      (progressItem) => `
        <li>
          <div>
            <strong>${escapeHtml(
              formatDashboardLabel(
                progressItem.stage || "manuscript_submission",
                "Workflow",
              ),
            )}</strong>
            <span>${escapeHtml(
              formatDashboardDate(
                progressItem.completed_date || progressItem.start_date,
                "No date",
              ),
            )}</span>
          </div>
          <div class="workflow-list-actions">
            ${renderStatusBadge(progressItem.status || "not_started", "Not Started")}
          </div>
        </li>
      `,
    );
    const reviewList = renderWorkflowList(
      book.reviews,
      "No reviews have been logged for this book.",
      (review) => `
        <li>
          <div>
            <strong>${escapeHtml(review.reviewer_name || "Reviewer pending")}</strong>
            <span>${escapeHtml(
              review.recommendation
                ? formatDashboardLabel(review.recommendation, "Recommendation")
                : "No recommendation yet",
            )}</span>
          </div>
          <div class="workflow-list-actions">
            ${renderStatusBadge(review.status || "pending", "Pending")}
          </div>
        </li>
      `,
    );

    content.innerHTML = `
      <div class="workflow-profile">
        <img src="${escapeHtml(coverImage)}" alt="Book cover" class="workflow-cover" />
        <div class="workflow-profile-copy">
          <span class="workflow-kicker">Book Workflow</span>
          <h4>${escapeHtml(book.title || "Untitled book")}</h4>
          <p>${escapeHtml(book.author_name || "Unknown author")}</p>
          <div class="workflow-status-row">
            ${renderStatusBadge(book.status || "draft", "Draft")}
            <span class="workflow-meta">${escapeHtml(book.category || "No category")}</span>
          </div>
          <div class="workflow-link-row">
            ${
              book.manuscript_file
                ? `<a class="table-action-btn info" href="${escapeHtml(resolveAssetUrl(book.manuscript_file))}" target="_blank" rel="noopener noreferrer">Open Manuscript</a>`
                : `<span class="workflow-meta">No manuscript file uploaded</span>`
            }
          </div>
        </div>
      </div>

      <div class="workflow-summary-grid">
        <article class="workflow-summary-card">
          <span>Submissions</span>
          <strong>${escapeHtml((book.submissions || []).length)}</strong>
        </article>
        <article class="workflow-summary-card">
          <span>Contracts</span>
          <strong>${escapeHtml((book.contracts || []).length)}</strong>
        </article>
        <article class="workflow-summary-card">
          <span>Reviews</span>
          <strong>${escapeHtml((book.reviews || []).length)}</strong>
        </article>
        <article class="workflow-summary-card">
          <span>Sales</span>
          <strong>${escapeHtml((book.sales || []).length)}</strong>
        </article>
      </div>

      <div class="workflow-field-grid">
        ${renderWorkflowField("Author Email", book.author_email || "N/A")}
        ${renderWorkflowField("Faculty", book.author_faculty || "N/A")}
        ${renderWorkflowField("Department", book.author_department || "N/A")}
        ${renderWorkflowField("Language", book.language || "English")}
        ${renderWorkflowField("Format", formatDashboardLabel(book.format || "paperback", "Paperback"))}
        ${renderWorkflowField("Price", book.price !== null && book.price !== undefined ? formatCurrencyCode(book.price) : "N/A")}
        ${renderWorkflowField("Published On", formatDashboardDate(book.publication_date, "Not published yet"))}
        ${renderWorkflowField("Created", formatDashboardDate(book.created_at, "N/A"))}
      </div>

      <div class="workflow-panel">
        <span class="workflow-panel-label">Description</span>
        <p>${escapeHtml(book.description || book.abstract || "No description provided.")}</p>
      </div>

      <div class="workflow-form-grid">
        <form class="workflow-panel" id="bookWorkflowForm" onsubmit="handleBookWorkflowUpdate(event)">
          <input type="hidden" id="bookWorkflowId" value="${escapeHtml(book.id)}" />
          <span class="workflow-panel-label">Update Publishing Status</span>
          <div class="workflow-form-fields">
            <div class="form-group">
              <label for="bookWorkflowStatus">Book Status</label>
              <select id="bookWorkflowStatus" class="form-control" required>
                ${[
                  "draft",
                  "submitted",
                  "under_review",
                  "revisions_requested",
                  "accepted",
                  "in_production",
                  "published",
                  "rejected",
                  "archived",
                ]
                  .map(
                    (statusValue) => `
                      <option value="${statusValue}"${
                        statusValue === (book.status || "draft")
                          ? " selected"
                          : ""
                      }>
                        ${escapeHtml(formatDashboardLabel(statusValue))}
                      </option>
                    `,
                  )
                  .join("")}
              </select>
            </div>
            <div class="form-group">
              <label for="bookWorkflowPublicationDate">Publication Date</label>
              <input type="date" id="bookWorkflowPublicationDate" class="form-control" value="${escapeHtml(formatDateForInput(book.publication_date))}" />
            </div>
            <div class="form-group">
              <label for="bookWorkflowPrice">Price</label>
              <input type="number" id="bookWorkflowPrice" class="form-control" min="0" step="0.01" value="${escapeHtml(book.price ?? "")}" />
            </div>
            <div class="form-group workflow-form-full">
              <label for="bookWorkflowNotes">Editor Notes</label>
              <textarea id="bookWorkflowNotes" class="form-control" rows="4" placeholder="Add editorial notes or publishing instructions">${escapeHtml(book.editor_notes || "")}</textarea>
            </div>
          </div>
          <div class="workflow-form-actions">
            <button type="submit" class="btn btn-primary">Save Book Workflow</button>
            <button type="button" class="btn btn-outline" onclick="openContractEditorForBook(${book.id})">Create Contract</button>
          </div>
        </form>

        <form class="workflow-panel" id="bookCoverForm" onsubmit="handleBookCoverUpload(event)">
          <input type="hidden" id="bookCoverBookId" value="${escapeHtml(book.id)}" />
          <span class="workflow-panel-label">Cover Artwork</span>
          <div class="workflow-upload-meta">
            <p>Upload or replace the book cover used in the public catalog and book details.</p>
          </div>
          <div class="form-group">
            <label for="bookCoverFile">Cover Image</label>
            <input type="file" id="bookCoverFile" class="form-control" accept="image/*" />
          </div>
          <div class="workflow-form-actions">
            <button type="submit" class="btn btn-primary">Upload Cover</button>
          </div>
        </form>
      </div>

      <div class="workflow-activity-grid">
        <section class="workflow-activity-panel">
          <h5>Submissions</h5>
          <ul>${submissionList}</ul>
        </section>
        <section class="workflow-activity-panel">
          <h5>Contracts</h5>
          <ul>${contractList}</ul>
        </section>
        <section class="workflow-activity-panel">
          <h5>Progress</h5>
          <ul>${progressList}</ul>
        </section>
        <section class="workflow-activity-panel">
          <h5>Reviews</h5>
          <ul>${reviewList}</ul>
        </section>
      </div>
    `;

    showModal("bookDetailsModal");
  } catch (error) {
    console.error("View book error:", error);
    showNotification("Failed to load book details", "error");
  } finally {
    hideLoading();
  }
}

async function handleBookWorkflowUpdate(event) {
  event.preventDefault();

  try {
    const token = localStorage.getItem("authToken");
    const bookId = document.getElementById("bookWorkflowId")?.value;
    if (!token || !bookId) {
      showNotification("Please login again", "error");
      return;
    }

    showLoading("Updating book workflow...");

    const response = await fetch(
      `${API_BASE_URL}/admin/books/${bookId}/status`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          status: document.getElementById("bookWorkflowStatus")?.value,
          notes: document.getElementById("bookWorkflowNotes")?.value,
          publication_date:
            document.getElementById("bookWorkflowPublicationDate")?.value || "",
          price: document.getElementById("bookWorkflowPrice")?.value || "",
        }),
      },
    );

    const data = await response.json();
    if (!response.ok || !data.success) {
      showNotification(data.message || "Failed to update book", "error");
      return;
    }

    showNotification(data.message || "Book updated successfully", "success");
    await Promise.all([
      loadBooks(),
      loadSubmissions(),
      loadContracts(),
      loadAdminDashboard(),
    ]);
    await viewBook(bookId);
  } catch (error) {
    console.error("Book workflow update error:", error);
    showNotification("Failed to update book workflow", "error");
  } finally {
    hideLoading();
  }
}

async function handleBookCoverUpload(event) {
  event.preventDefault();

  try {
    const token = localStorage.getItem("authToken");
    const bookId = document.getElementById("bookCoverBookId")?.value;
    const coverFile = document.getElementById("bookCoverFile")?.files?.[0];

    if (!token || !bookId) {
      showNotification("Please login again", "error");
      return;
    }

    if (!coverFile) {
      showNotification("Please choose a cover image to upload", "error");
      return;
    }

    showLoading("Uploading cover...");

    const formData = new FormData();
    formData.append("cover", coverFile);

    const response = await fetch(
      `${API_BASE_URL}/admin/books/${bookId}/cover`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: formData,
      },
    );

    const data = await response.json();
    if (!response.ok || !data.success) {
      showNotification(data.message || "Failed to upload cover", "error");
      return;
    }

    showNotification(data.message || "Cover uploaded successfully", "success");
    await Promise.all([loadBooks(), loadAdminDashboard()]);
    await viewBook(bookId);
  } catch (error) {
    console.error("Book cover upload error:", error);
    showNotification("Failed to upload book cover", "error");
  } finally {
    hideLoading();
  }
}

async function viewSubmission(submissionId) {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      showNotification("Please login to continue", "error");
      return;
    }

    showLoading("Loading submission details...");
    await ensureAdminAuthorsCache();

    const response = await fetch(
      `${API_BASE_URL}/admin/submissions/${submissionId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    );

    const data = await response.json();
    if (!response.ok || !data.success || !data.submission) {
      showNotification(
        data.message || "Failed to load submission details",
        "error",
      );
      return;
    }

    const submission = data.submission;
    const assignedReviewer = getCachedAuthor(submission.assigned_to);
    const reviewsMarkup = renderWorkflowList(
      submission.reviews,
      "No review records logged for this submission.",
      (review) => `
        <li>
          <div>
            <strong>${escapeHtml(review.reviewer_name || "Reviewer pending")}</strong>
            <span>${escapeHtml(
              review.recommendation
                ? formatDashboardLabel(review.recommendation, "Recommendation")
                : "No recommendation yet",
            )}</span>
          </div>
          <div class="workflow-list-actions">
            ${renderStatusBadge(review.status || "pending", "Pending")}
          </div>
        </li>
      `,
    );
    const feedbackMarkup = renderEditorialFeedbackList(
      submission.feedback,
      "No editorial notes have been logged for this submission yet.",
      { showAudience: true },
    );
    const manuscriptLink = submission.manuscript_file
      ? `
          <a
            class="workflow-attachment-link"
            href="${escapeHtml(resolveAssetUrl(submission.manuscript_file))}"
            target="_blank"
            rel="noopener noreferrer">
            <i class="fas fa-file-arrow-down"></i> Open manuscript file
          </a>
        `
      : `<span class="manuscript-link manuscript-link-disabled">No manuscript file uploaded</span>`;

    const content = document.getElementById("submissionDetailsContent");
    if (!content) return;

    content.innerHTML = `
      <div class="workflow-profile workflow-profile-compact">
        <div class="workflow-profile-copy">
          <span class="workflow-kicker">Submission Workflow</span>
          <h4>${escapeHtml(submission.book_title || "Untitled submission")}</h4>
          <p>${escapeHtml(submission.author_name || "Unknown author")}</p>
          <div class="workflow-status-row">
            ${renderStatusBadge(submission.status || "pending", "Pending")}
            <span class="workflow-meta">${escapeHtml(
              formatDashboardLabel(
                submission.submission_type || "publishing",
                "Publishing",
              ),
            )}</span>
          </div>
        </div>
      </div>

      <div class="workflow-summary-grid">
        <article class="workflow-summary-card">
          <span>Priority</span>
          <strong>${escapeHtml(
            formatDashboardLabel(submission.priority || "medium", "Medium"),
          )}</strong>
        </article>
        <article class="workflow-summary-card">
          <span>Assigned Reviewer</span>
          <strong>${escapeHtml(assignedReviewer?.full_name || "Unassigned")}</strong>
        </article>
        <article class="workflow-summary-card">
          <span>Submitted</span>
          <strong>${escapeHtml(
            formatDashboardDate(submission.submission_date, "N/A"),
          )}</strong>
        </article>
        <article class="workflow-summary-card">
          <span>Due Date</span>
          <strong>${escapeHtml(
            formatDashboardDate(
              submission.due_date || submission.due_date_formatted,
              "Not set",
            ),
          )}</strong>
        </article>
      </div>

      <div class="workflow-field-grid">
        ${renderWorkflowField("Book Status", formatDashboardLabel(submission.book_status || "under_review", "Under Review"))}
        ${renderWorkflowField("Category", submission.book_category || "N/A")}
        ${renderWorkflowField("Author Email", submission.author_email || "N/A")}
        ${renderWorkflowField("Reviewer", assignedReviewer?.full_name || "Unassigned")}
      </div>

      <div class="workflow-form-grid">
        <form class="workflow-panel" id="submissionWorkflowForm" onsubmit="handleSubmissionWorkflowUpdate(event)">
          <input type="hidden" id="submissionWorkflowId" value="${escapeHtml(submission.id)}" />
          <input type="hidden" id="submissionWorkflowBookId" value="${escapeHtml(submission.book_id)}" />
          <span class="workflow-panel-label">Assignment and Decision</span>
          <div class="workflow-form-fields">
            <div class="form-group">
              <label for="submissionWorkflowStatus">Submission Status</label>
              <select id="submissionWorkflowStatus" class="form-control" required>
                ${[
                  "pending",
                  "assigned",
                  "in_review",
                  "review_completed",
                  "accepted",
                  "rejected",
                  "withdrawn",
                ]
                  .map(
                    (statusValue) => `
                      <option value="${statusValue}"${
                        statusValue === (submission.status || "pending")
                          ? " selected"
                          : ""
                      }>
                        ${escapeHtml(formatDashboardLabel(statusValue))}
                      </option>
                    `,
                  )
                  .join("")}
              </select>
            </div>
            <div class="form-group">
              <label for="submissionWorkflowReviewer">Reviewer</label>
              <select id="submissionWorkflowReviewer" class="form-control">
                ${getReviewerOptionsMarkup(submission.assigned_to)}
              </select>
            </div>
            <div class="form-group">
              <label for="submissionWorkflowPriority">Priority</label>
              <select id="submissionWorkflowPriority" class="form-control">
                ${["low", "medium", "high", "urgent"]
                  .map(
                    (priorityValue) => `
                      <option value="${priorityValue}"${
                        priorityValue === (submission.priority || "medium")
                          ? " selected"
                          : ""
                      }>
                        ${escapeHtml(formatDashboardLabel(priorityValue))}
                      </option>
                    `,
                  )
                  .join("")}
              </select>
            </div>
            <div class="form-group">
              <label for="submissionWorkflowDueDate">Due Date</label>
              <input type="date" id="submissionWorkflowDueDate" class="form-control" value="${escapeHtml(
                formatDateForInput(
                  submission.due_date || submission.due_date_formatted,
                ),
              )}" />
            </div>
            <div class="form-group workflow-form-full">
              <label for="submissionWorkflowNotes">Admin Notes</label>
              <textarea id="submissionWorkflowNotes" class="form-control" rows="4" placeholder="Add assignment notes, editorial decisions, or review guidance">${escapeHtml(
                submission.admin_notes || "",
              )}</textarea>
            </div>
          </div>
          <div class="workflow-form-actions">
            <button type="submit" class="btn btn-primary">Save Submission</button>
            <button type="button" class="btn btn-outline" onclick="viewBook(${submission.book_id})">Open Book</button>
          </div>
        </form>

        <div class="workflow-panel">
          <span class="workflow-panel-label">Author Notes</span>
          <p>${escapeHtml(
            submission.author_notes || "No author notes were provided.",
          )}</p>
          <div class="workflow-inline-note">
            <strong>Latest reviews</strong>
            <ul class="workflow-inline-list">${reviewsMarkup}</ul>
          </div>
          <div class="workflow-inline-note">
            <strong>Submitted file</strong>
            <div class="workflow-link-group">${manuscriptLink}</div>
          </div>
        </div>
      </div>

      <div class="workflow-form-grid">
        <form
          class="workflow-panel"
          id="submissionFeedbackForm"
          onsubmit="handleSubmissionFeedbackSubmit(event)">
          <input type="hidden" id="submissionFeedbackId" value="${escapeHtml(submission.id)}" />
          <span class="workflow-panel-label">Editorial Feedback</span>
          <p class="workflow-panel-copy">
            Share decision notes, revision requests, or an annotated review file with the author.
          </p>
          <div class="workflow-form-fields">
            <div class="form-group">
              <label for="submissionFeedbackTitle">Feedback Title</label>
              <input
                type="text"
                id="submissionFeedbackTitle"
                class="form-control"
                placeholder="e.g. Initial screening outcome" />
            </div>
            <div class="form-group">
              <label for="submissionFeedbackDecision">Recommendation</label>
              <select id="submissionFeedbackDecision" class="form-control">
                <option value="informational">Informational</option>
                <option value="minor_revisions">Minor Revisions</option>
                <option value="major_revisions">Major Revisions</option>
                <option value="accept">Accept</option>
                <option value="reject">Reject</option>
                <option value="resubmit">Resubmit</option>
              </select>
            </div>
            <div class="form-group">
              <label for="submissionFeedbackAudience">Visibility</label>
              <select id="submissionFeedbackAudience" class="form-control">
                <option value="author">Share with Author</option>
                <option value="internal">Internal Only</option>
              </select>
            </div>
            <div class="form-group">
              <label for="submissionFeedbackAttachment">Attachment</label>
              <input
                type="file"
                id="submissionFeedbackAttachment"
                class="form-control"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/png,image/jpeg" />
            </div>
            <div class="form-group workflow-form-full">
              <label for="submissionFeedbackMessage">Feedback Message</label>
              <textarea
                id="submissionFeedbackMessage"
                class="form-control"
                rows="5"
                placeholder="Summarize the editorial assessment, revision expectations, or decision details"
                required></textarea>
            </div>
          </div>
          <div class="workflow-form-actions">
            <button type="submit" class="btn btn-primary">Save Feedback</button>
          </div>
        </form>

        <section class="workflow-activity-panel workflow-activity-panel-full">
          <h5>Editorial Log</h5>
          <ul class="workflow-feedback-list">${feedbackMarkup}</ul>
        </section>
      </div>
    `;

    showModal("submissionDetailsModal");
  } catch (error) {
    console.error("View submission error:", error);
    showNotification("Failed to load submission details", "error");
  } finally {
    hideLoading();
  }
}

async function handleSubmissionWorkflowUpdate(event) {
  event.preventDefault();

  try {
    const token = localStorage.getItem("authToken");
    const submissionId = document.getElementById("submissionWorkflowId")?.value;
    if (!token || !submissionId) {
      showNotification("Please login again", "error");
      return;
    }

    showLoading("Updating submission...");

    const response = await fetch(
      `${API_BASE_URL}/admin/submissions/${submissionId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          status: document.getElementById("submissionWorkflowStatus")?.value,
          reviewer_id:
            document.getElementById("submissionWorkflowReviewer")?.value || "",
          priority:
            document.getElementById("submissionWorkflowPriority")?.value ||
            "medium",
          due_date:
            document.getElementById("submissionWorkflowDueDate")?.value || "",
          admin_notes:
            document.getElementById("submissionWorkflowNotes")?.value || "",
        }),
      },
    );

    const data = await response.json();
    if (!response.ok || !data.success) {
      showNotification(data.message || "Failed to update submission", "error");
      return;
    }

    showNotification(
      data.message || "Submission updated successfully",
      "success",
    );
    await Promise.all([loadSubmissions(), loadBooks(), loadAdminDashboard()]);
    await viewSubmission(submissionId);
  } catch (error) {
    console.error("Submission workflow update error:", error);
    showNotification("Failed to update submission", "error");
  } finally {
    hideLoading();
  }
}

async function handleSubmissionFeedbackSubmit(event) {
  event.preventDefault();

  try {
    const token = localStorage.getItem("authToken");
    const submissionId = document.getElementById("submissionFeedbackId")?.value;
    if (!token || !submissionId) {
      showNotification("Please login again", "error");
      return;
    }

    const message = document
      .getElementById("submissionFeedbackMessage")
      ?.value.trim();
    if (!message) {
      showNotification("Please add the editorial feedback message", "error");
      return;
    }

    showLoading("Saving editorial feedback...");

    const formData = new FormData();
    formData.append(
      "title",
      document.getElementById("submissionFeedbackTitle")?.value.trim() || "",
    );
    formData.append(
      "decision",
      document.getElementById("submissionFeedbackDecision")?.value ||
        "informational",
    );
    formData.append(
      "audience",
      document.getElementById("submissionFeedbackAudience")?.value || "author",
    );
    formData.append("message", message);

    const attachmentFile = document.getElementById(
      "submissionFeedbackAttachment",
    )?.files?.[0];
    if (attachmentFile) {
      formData.append("attachment", attachmentFile);
    }

    const response = await fetch(
      `${API_BASE_URL}/admin/submissions/${submissionId}/feedback`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: formData,
      },
    );

    const data = await response.json();
    if (!response.ok || !data.success) {
      showNotification(
        data.message || "Failed to save editorial feedback",
        "error",
      );
      return;
    }

    showNotification(
      data.message || "Editorial feedback saved successfully",
      "success",
    );
    await Promise.all([loadSubmissions(), loadBooks(), loadAdminDashboard()]);
    await viewSubmission(submissionId);
  } catch (error) {
    console.error("Submission feedback submit error:", error);
    showNotification("Failed to save editorial feedback", "error");
  } finally {
    hideLoading();
  }
}

function populateContractBookOptions(selectedBookId = "") {
  const bookSelect = document.getElementById("contractEditorBook");
  if (!bookSelect) return;

  const normalizedSelected = String(selectedBookId || "");
  bookSelect.innerHTML = `
    <option value="">Select Book</option>
    ${adminBooksCache
      .filter((book) => Number(book.author_id))
      .map((book) => {
        const selectedAttribute =
          String(book.id) === normalizedSelected ? " selected" : "";
        const label = [book.title || "Untitled book", book.author_name]
          .filter(Boolean)
          .join(" - ");
        return `<option value="${escapeHtml(book.id)}"${selectedAttribute}>${escapeHtml(label)}</option>`;
      })
      .join("")}
  `;
}

function syncContractAuthorFromBookSelection() {
  const bookId = document.getElementById("contractEditorBook")?.value;
  const hiddenAuthorId = document.getElementById("contractEditorAuthorId");
  const authorDisplay = document.getElementById("contractEditorAuthorName");
  const summary = document.getElementById("contractEditorSummary");
  const selectedBook = getCachedBook(bookId);

  if (hiddenAuthorId) {
    hiddenAuthorId.value = selectedBook?.author_id || "";
  }

  if (authorDisplay) {
    authorDisplay.value = selectedBook?.author_name || "";
  }

  if (summary) {
    summary.innerHTML = selectedBook
      ? `
        <strong>${escapeHtml(selectedBook.title || "Untitled book")}</strong>
        <span>${escapeHtml(selectedBook.author_name || "Unknown author")}</span>
      `
      : "<strong>Select a book</strong><span>The linked author will fill automatically.</span>";
  }
}

async function openContractEditor(contractId = null, prefill = {}) {
  try {
    if (!currentUser || !ADMIN_ROLES.includes(currentUser.role)) {
      showNotification("Admin access required", "error");
      return;
    }

    showLoading(
      contractId ? "Loading contract..." : "Loading contract form...",
    );
    await Promise.all([ensureAdminAuthorsCache(), ensureAdminBooksCache()]);

    const form = document.getElementById("contractEditorForm");
    if (!form) {
      throw new Error("Contract editor is not available");
    }

    form.reset();
    document.getElementById("contractEditorId").value = "";
    document.getElementById("contractEditorStatus").value = "draft";
    document.getElementById("contractEditorType").value = "standard";
    populateContractBookOptions(prefill.bookId || "");
    syncContractAuthorFromBookSelection();

    const title = document.getElementById("contractEditorModalTitle");
    const submitLabel = document.getElementById("contractEditorSubmitLabel");
    if (title) {
      title.textContent = contractId ? "Contract Details" : "Create Contract";
    }
    if (submitLabel) {
      submitLabel.textContent = contractId
        ? "Save Contract"
        : "Create Contract";
    }

    if (contractId) {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${API_BASE_URL}/admin/contracts/${contractId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );
      const data = await response.json();
      if (!response.ok || !data.success || !data.contract) {
        showNotification(data.message || "Failed to load contract", "error");
        return;
      }

      const contract = data.contract;
      document.getElementById("contractEditorId").value = contract.id;
      populateContractBookOptions(contract.book_id || "");
      document.getElementById("contractEditorBook").value =
        contract.book_id || "";
      document.getElementById("contractEditorType").value =
        contract.contract_type || "standard";
      document.getElementById("contractEditorStatus").value =
        contract.status || "draft";
      document.getElementById("contractEditorRoyalty").value =
        contract.royalty_percentage ?? "";
      document.getElementById("contractEditorAdvance").value =
        contract.advance_amount ?? "";
      document.getElementById("contractEditorStartDate").value =
        formatDateForInput(contract.start_date);
      document.getElementById("contractEditorEndDate").value =
        formatDateForInput(contract.end_date);
      document.getElementById("contractEditorTerritory").value =
        contract.territory || "";
      document.getElementById("contractEditorRightsGranted").value =
        contract.rights_granted || "";
      document.getElementById("contractEditorPaymentSchedule").value =
        contract.payment_schedule || "";
    } else if (prefill.bookId) {
      document.getElementById("contractEditorBook").value = prefill.bookId;
    }

    syncContractAuthorFromBookSelection();
    showModal("contractEditorModal");
  } catch (error) {
    console.error("Open contract editor error:", error);
    showNotification(
      error.message || "Failed to open contract editor",
      "error",
    );
  } finally {
    hideLoading();
  }
}

function openContractEditorForBook(bookId) {
  openContractEditor(null, { bookId });
}

async function handleContractEditorSubmit(event) {
  event.preventDefault();

  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      showNotification("Please login again", "error");
      return;
    }

    const contractId = document.getElementById("contractEditorId")?.value;
    const bookId = document.getElementById("contractEditorBook")?.value;
    const authorId = document.getElementById("contractEditorAuthorId")?.value;

    if (!bookId || !authorId) {
      showNotification("Please choose a book linked to an author", "error");
      return;
    }

    const payload = {
      book_id: bookId,
      author_id: authorId,
      contract_type: document.getElementById("contractEditorType")?.value,
      status: document.getElementById("contractEditorStatus")?.value,
      royalty_percentage:
        document.getElementById("contractEditorRoyalty")?.value || "",
      advance_amount:
        document.getElementById("contractEditorAdvance")?.value || "",
      start_date:
        document.getElementById("contractEditorStartDate")?.value || "",
      end_date: document.getElementById("contractEditorEndDate")?.value || "",
      territory:
        document.getElementById("contractEditorTerritory")?.value || "",
      rights_granted:
        document.getElementById("contractEditorRightsGranted")?.value || "",
      payment_schedule:
        document.getElementById("contractEditorPaymentSchedule")?.value || "",
    };

    showLoading(contractId ? "Saving contract..." : "Creating contract...");

    const endpoint = contractId
      ? `${API_BASE_URL}/admin/contracts/${contractId}`
      : `${API_BASE_URL}/admin/contracts`;
    const method = contractId ? "PUT" : "POST";

    const response = await fetch(endpoint, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      showNotification(data.message || "Failed to save contract", "error");
      return;
    }

    closeModal("contractEditorModal");
    showNotification(data.message || "Contract saved successfully", "success");
    await Promise.all([loadContracts(), loadBooks(), loadAdminDashboard()]);

    if (
      bookId &&
      document.getElementById("bookDetailsModal")?.classList.contains("active")
    ) {
      await viewBook(bookId);
    }
  } catch (error) {
    console.error("Contract editor submit error:", error);
    showNotification("Failed to save contract", "error");
  } finally {
    hideLoading();
  }
}

async function loadTrainingRegistrations() {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const response = await fetch(`${API_BASE_URL}/admin/training?limit=100`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
    const data = await response.json();
    const tbody = document.getElementById("trainingTableBody");
    if (!tbody) return;

    if (!response.ok || !data.success) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 20px">
            Failed to load training registrations
          </td>
        </tr>
      `;
      return;
    }

    if (!data.registrations || data.registrations.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 20px">
            No training registrations found
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = data.registrations
      .map((row) => {
        const dateValue =
          row.preferred_date || row.created_at
            ? new Date(
                row.preferred_date || row.created_at,
              ).toLocaleDateString()
            : "N/A";
        return `
          <tr>
            <td>${row.full_name || "N/A"}</td>
            <td>${row.email || "N/A"}</td>
            <td>${row.training_type || "N/A"}</td>
            <td><span class="status-badge status-${row.status || "pending"}">${row.status || "pending"}</span></td>
            <td>${dateValue}</td>
            <td>
              <button class="btn btn-info btn-sm" onclick="showNotification('Training details coming soon', 'info')">View</button>
            </td>
          </tr>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Error loading training registrations:", error);
    const tbody = document.getElementById("trainingTableBody");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 20px">
            Error loading training registrations
          </td>
        </tr>
      `;
    }
  }
}

function showAddAuthorModal() {
  // Implement add author modal
  showNotification("Add author functionality coming soon", "info");
}

function showAddBookModal() {
  if (currentUser && ADMIN_ROLES.includes(currentUser.role)) {
    openAdminBookModal();
    return;
  }

  if (!currentUser || currentUser.role !== "author") {
    showNotification(
      "Please login as an author to submit a manuscript",
      "error",
    );
    showAuthorLogin();
    return;
  }

  showModal("submitBookModal");
  document.querySelector("#submitBookModal .modal-body")?.scrollTo({
    top: 0,
    behavior: "smooth",
  });
  syncAuthorWorkspace();
}

function showAddContractModal() {
  openContractEditor();
}

// ============================================
// 8. PAGE NAVIGATION
// ============================================

function showHomepage() {
  document.getElementById("homepage").style.display = "block";
  document.getElementById("adminDashboard").classList.remove("active");
  document.getElementById("authorDashboard").style.display = "none";
  document.body.style.overflow = "auto";
  localStorage.removeItem("activeDashboardView");
  window.location.hash = "#home";
}

function showAdminDashboard() {
  if (!currentUser || !ADMIN_ROLES.includes(currentUser.role)) {
    showNotification("Admin access required", "error");
    showAdminLogin();
    return;
  }

  document.getElementById("homepage").style.display = "none";
  document.getElementById("adminDashboard").classList.add("active");
  document.getElementById("authorDashboard").style.display = "none";
  document.body.style.overflow = "auto";
  localStorage.setItem("activeDashboardView", "admin");
  window.location.hash = "#admin";

  const activeSection =
    localStorage.getItem("activeAdminSection") || DEFAULT_ADMIN_SECTION;
  if (!document.getElementById(activeSection)) {
    localStorage.setItem("activeAdminSection", DEFAULT_ADMIN_SECTION);
    showDashboardSection(DEFAULT_ADMIN_SECTION);
    return;
  }
  showDashboardSection(activeSection);
}

function showAuthorDashboard() {
  if (
    !currentUser ||
    !["author", "admin", "editor"].includes(currentUser.role)
  ) {
    showNotification("Author access required", "error");
    showAuthorLogin();
    return;
  }

  document.getElementById("homepage").style.display = "none";
  document.getElementById("adminDashboard").classList.remove("active");
  document.getElementById("authorDashboard").style.display = "block";
  document.body.style.overflow = "auto";
  localStorage.setItem("activeDashboardView", "author");
  window.location.hash = "#author";

  // Load author dashboard data
  loadAuthorDashboard();
}

// ============================================
// 9. UTILITY FUNCTIONS
// ============================================

function showNotification(message, type = "success") {
  // Remove existing notifications
  const existing = document.querySelector(".notification");
  if (existing) existing.remove();

  const notification = document.createElement("div");
  notification.className = `notification ${type}`;
  notification.innerHTML = `
        <i class="fas fa-${
          type === "success"
            ? "check-circle"
            : type === "error"
              ? "exclamation-circle"
              : type === "warning"
                ? "exclamation-triangle"
                : "info-circle"
        }"></i>
        <span>${message}</span>
    `;

  document.body.appendChild(notification);

  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.parentNode.removeChild(notification);
    }
  }, 5000);
}

function showLoading(text = "Loading...") {
  const loadingText = document.getElementById("loadingText");
  if (loadingText) loadingText.textContent = text;
  document.getElementById("loadingModal").classList.add("active");
}

function hideLoading() {
  document.getElementById("loadingModal").classList.remove("active");
}

function initAnimations() {
  // Initialize carousel
  initHeroCarousel();

  // Initialize animations on scroll
  function animateOnScroll() {
    const elements = document.querySelectorAll(".animate-fade-in-up");
    elements.forEach((element) => {
      const elementTop = element.getBoundingClientRect().top;
      const windowHeight = window.innerHeight;

      if (elementTop < windowHeight - 100) {
        element.style.animationPlayState = "running";
      }
    });

    // Parallax effect for hero section
    const heroSection = document.querySelector(".press-hero");
    if (heroSection) {
      const heroTop = heroSection.getBoundingClientRect().top;
      const windowHeight = window.innerHeight;
      const scrollProgress =
        (windowHeight - heroTop) / (windowHeight + heroSection.offsetHeight);

      if (scrollProgress >= -0.3 && scrollProgress <= 1) {
        const parallaxValue = scrollProgress * 30;
        heroSection.style.setProperty(
          "--press-hero-parallax",
          `${parallaxValue}px`,
        );
      }
    }
  }

  // Initial animation state
  document.querySelectorAll(".animate-fade-in-up").forEach((element) => {
    element.style.animationPlayState = "paused";
  });

  // Trigger animations
  animateOnScroll();
  window.addEventListener("scroll", animateOnScroll, { passive: true });

  // Trigger animations after page load
  setTimeout(() => {
    document.querySelectorAll(".animate-fade-in-up").forEach((element) => {
      element.style.animationPlayState = "running";
    });
  }, 300);
}

// Hero Carousel Initialization
function initHeroCarousel() {
  const carousel = document.querySelector(".press-hero-carousel");
  if (!carousel) return;

  const images = carousel.querySelectorAll(".press-hero-carousel-image");
  if (images.length === 0) return;

  let currentIndex = 0;

  // Only preload first image, others load as needed
  images.forEach((img, index) => {
    if (index === 0) {
      img.style.loading = "eager";
    }
  });

  // Optional: Add keyboard navigation
  document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") {
      currentIndex = (currentIndex + 1) % images.length;
    } else if (e.key === "ArrowLeft") {
      currentIndex = (currentIndex - 1 + images.length) % images.length;
    }
  });
}

// ============================================
// 10. HELPER FUNCTIONS FOR DASHBOARD
// ============================================

function resolveAssetUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  // Prepend the backend host if the path is relative
  const backendBase = API_BASE_URL.replace(/\/api$/, "");
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `${backendBase}${normalizedPath}`;
}

function isRenderableImageAsset(path) {
  if (!path) return false;
  if (String(path).startsWith("data:image/")) return true;

  try {
    const pathname = new URL(path, window.location.origin).pathname.toLowerCase();
    return /\.(avif|gif|jpe?g|png|svg|webp)$/.test(pathname);
  } catch (error) {
    return /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(String(path));
  }
}

function getRenderableImageUrl(path, fallback = "assets/OIP.webp") {
  return isRenderableImageAsset(path) ? resolveAssetUrl(path) : fallback;
}

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDashboardLabel(value, fallback = "N/A") {
  if (!value) return fallback;
  return String(value)
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatCurrencyCode(value) {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    currencyDisplay: "code",
    maximumFractionDigits: 0,
  })
    .format(Number(value) || 0)
    .replace(/\u00a0/g, " ");
}

function formatDashboardDate(value, fallback = "No activity yet") {
  if (!value) return fallback;

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return fallback;
  }

  return parsedDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getWordCount(value) {
  return String(value || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function getKeywordList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getFileExtension(filename) {
  if (!filename || !filename.includes(".")) return "";
  return filename.slice(filename.lastIndexOf(".")).toLowerCase();
}

function isSupportedImageFile(file) {
  if (!file) return false;

  const imageExtensions = new Set([
    ".jpg",
    ".jpeg",
    ".png",
    ".gif",
    ".webp",
    ".avif",
    ".svg",
  ]);
  const mimeType = String(file.type || "").toLowerCase();

  return mimeType.startsWith("image/") || imageExtensions.has(getFileExtension(file.name));
}

function updateProgressBar(elementId, percent) {
  const element = document.getElementById(elementId);
  if (!element) return;
  const safePercent = Math.max(0, Math.min(100, Math.round(percent)));
  element.style.width = `${safePercent}%`;
}

function renderChecklistMarkup(items) {
  return items
    .map(
      (item) => `
        <li class="${item.complete ? "is-complete" : "is-pending"}">
          <i class="fas ${item.complete ? "fa-check-circle" : "fa-circle"}"></i>
          <span>${escapeHtml(item.label)}</span>
        </li>
      `,
    )
    .join("");
}

function getAuthorProfileMetrics(author) {
  const normalizedAuthor = author || {};
  const completionFields = [
    normalizedAuthor.full_name,
    normalizedAuthor.email,
    normalizedAuthor.phone,
    normalizedAuthor.faculty,
    normalizedAuthor.department,
    normalizedAuthor.qualifications,
    normalizedAuthor.areas_of_expertise,
    normalizedAuthor.biography,
    normalizedAuthor.orcid_id || normalizedAuthor.google_scholar_id,
  ];
  const filledCount = completionFields.filter(Boolean).length;
  const completionPercent = Math.round(
    (filledCount / completionFields.length) * 100,
  );
  const essentialsReady = Boolean(
    normalizedAuthor.full_name &&
    normalizedAuthor.email &&
    normalizedAuthor.faculty &&
    normalizedAuthor.department &&
    normalizedAuthor.biography,
  );
  const discoverabilityCount = [
    normalizedAuthor.qualifications,
    normalizedAuthor.areas_of_expertise,
    normalizedAuthor.orcid_id,
    normalizedAuthor.google_scholar_id,
    normalizedAuthor.linkedin_url,
  ].filter(Boolean).length;

  let discoverabilityStatus = "Needs attention";
  let discoverabilityCopy =
    "Add expertise and scholarly identifiers to improve editorial context and metadata quality.";

  if (discoverabilityCount >= 3) {
    discoverabilityStatus = "Strong";
    discoverabilityCopy =
      "Your scholarly identifiers and expertise details are in good shape for routing and discoverability.";
  } else if (discoverabilityCount >= 1) {
    discoverabilityStatus = "Developing";
    discoverabilityCopy =
      "Add one or two more discoverability signals to strengthen catalog and reviewer context.";
  }

  return {
    completionPercent,
    essentialsReady,
    discoverabilityReady: discoverabilityCount >= 2,
    discoverabilityStatus,
    discoverabilityCopy,
  };
}

function getSubmissionDraftState() {
  const title = document.getElementById("bookTitle")?.value.trim() || "";
  const category = document.getElementById("bookCategory")?.value.trim() || "";
  const submissionType =
    document.getElementById("bookSubmissionType")?.value || "publishing";
  const keywordsValue = document.getElementById("bookKeywords")?.value || "";
  const keywordsList = getKeywordList(keywordsValue);
  const language =
    document.getElementById("bookLanguage")?.value.trim() || "English";
  const abstract = document.getElementById("bookAbstract")?.value.trim() || "";
  const description =
    document.getElementById("bookDescription")?.value.trim() || "";
  const fileInput = document.getElementById("bookManuscriptFile");
  const file = fileInput?.files?.[0] || null;
  const abstractWordCount = getWordCount(abstract);
  const descriptionWordCount = getWordCount(description);
  const metadataReady = title.length >= 5 && category.length >= 3;
  const abstractReady =
    submissionType === "reprint" || submissionType === "translation"
      ? abstractWordCount >= 20 || descriptionWordCount >= 25
      : abstractWordCount >= 25;

  return {
    title,
    category,
    submissionType,
    keywordsList,
    language,
    abstract,
    description,
    file,
    abstractWordCount,
    descriptionWordCount,
    metadataReady,
    abstractReady,
    keywordsReady: keywordsList.length >= 2,
    fileReady: Boolean(file),
  };
}

function updateAuthorProfileSummary(profileMetrics) {
  const completionValue = document.getElementById(
    "authorProfileCompletionValue",
  );
  if (completionValue) {
    completionValue.textContent = `${profileMetrics.completionPercent}%`;
  }
  updateProgressBar(
    "authorProfileCompletionBar",
    profileMetrics.completionPercent,
  );

  const discoverabilityStatus = document.getElementById(
    "authorDiscoverabilityStatus",
  );
  if (discoverabilityStatus) {
    discoverabilityStatus.textContent = profileMetrics.discoverabilityStatus;
  }

  const discoverabilityCopy = document.getElementById(
    "authorDiscoverabilityCopy",
  );
  if (discoverabilityCopy) {
    discoverabilityCopy.textContent = profileMetrics.discoverabilityCopy;
  }
}

function setAuthorProfileText(elementId, value, fallback = "Not provided") {
  const element = document.getElementById(elementId);
  if (!element) return;

  const normalizedValue = String(value || "").trim();
  element.textContent = normalizedValue || fallback;
}

function hasSavedAuthorProfile(author = {}) {
  return [
    author.full_name,
    author.email,
    author.phone,
    author.staff_id,
    author.faculty,
    author.department,
    author.qualifications,
    author.areas_of_expertise,
    author.orcid_id,
    author.google_scholar_id,
    author.linkedin_url,
    author.biography,
    author.profile_image,
  ].some((value) => String(value || "").trim().length > 0);
}

function populateAuthorProfileForm(author = {}) {
  const fieldMap = [
    ["authorProfileFullName", author.full_name],
    ["authorProfileEmail", author.email],
    ["authorProfilePhone", author.phone],
    ["authorProfileStaffId", author.staff_id],
    ["authorProfileFaculty", author.faculty],
    ["authorProfileDepartment", author.department],
    ["authorProfileQualification", author.qualifications],
    ["authorProfileExpertise", author.areas_of_expertise],
    ["authorProfileOrcidId", author.orcid_id],
    ["authorProfileGoogleScholarId", author.google_scholar_id],
    ["authorProfileLinkedIn", author.linkedin_url],
    ["authorProfileBiography", author.biography],
  ];

  fieldMap.forEach(([fieldId, value]) => {
    const field = document.getElementById(fieldId);
    if (field) {
      field.value = value || "";
    }
  });

  const preview = document.getElementById("authorProfileImagePreview");
  if (preview) {
    preview.src = getRenderableImageUrl(author.profile_image);
  }

  const pictureInput = document.getElementById("authorProfilePicture");
  if (pictureInput) {
    pictureInput.value = "";
  }
}

function renderAuthorProfileTags(author = {}) {
  const tagContainer = document.getElementById("authorProfileViewTags");
  if (!tagContainer) return;

  const tagValues = [
    author.faculty,
    author.department,
    author.qualifications,
    ...getKeywordList(author.areas_of_expertise).slice(0, 2),
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);

  const uniqueTags = [...new Set(tagValues)];
  const tagsToRender = (uniqueTags.length
    ? uniqueTags
    : ["Complete your profile to surface editorial metadata here."]
  ).slice(0, 5);

  tagContainer.innerHTML = tagsToRender
    .map((tag) => `<span class="author-profile-pill">${escapeHtml(tag)}</span>`)
    .join("");
}

function renderAuthorProfileView(author = {}) {
  const profileMetrics = getAuthorProfileMetrics(author);
  const affiliation = [author.department, author.faculty]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");
  const qualification = String(author.qualifications || "").trim();
  const fallbackHeadline =
    "Your saved academic profile supports editorial routing, contracts, and publication metadata.";
  const headline = affiliation
    ? qualification
      ? `${affiliation} - ${qualification}`
      : affiliation
    : qualification || fallbackHeadline;
  const lastUpdated = formatDashboardDate(author.updated_at, "recently");
  const statusTitle = profileMetrics.essentialsReady
    ? "Ready for editorial use"
    : "Saved with missing details";
  const statusCopy = profileMetrics.essentialsReady
    ? `Last updated ${lastUpdated}. Use settings anytime to refresh your biography, identifiers, or profile image.`
    : `Last updated ${lastUpdated}. Open settings to finish the missing essentials and strengthen routing quality.`;

  const viewImage = document.getElementById("authorProfileViewImage");
  if (viewImage) {
    viewImage.src = getRenderableImageUrl(author.profile_image);
  }

  setAuthorProfileText(
    "authorProfileViewName",
    author.full_name,
    "Author profile",
  );
  setAuthorProfileText(
    "authorProfileViewHeadline",
    headline,
    fallbackHeadline,
  );
  setAuthorProfileText(
    "authorProfileViewUpdated",
    statusTitle,
    "Profile saved",
  );
  setAuthorProfileText(
    "authorProfileViewStatus",
    statusCopy,
    "Use settings anytime to update your saved profile.",
  );
  setAuthorProfileText("authorProfileViewEmail", author.email);
  setAuthorProfileText("authorProfileViewPhone", author.phone);
  setAuthorProfileText("authorProfileViewStaffId", author.staff_id);
  setAuthorProfileText("authorProfileViewFaculty", author.faculty);
  setAuthorProfileText("authorProfileViewDepartment", author.department);
  setAuthorProfileText(
    "authorProfileViewQualification",
    author.qualifications,
  );
  setAuthorProfileText(
    "authorProfileViewExpertise",
    author.areas_of_expertise,
  );
  setAuthorProfileText("authorProfileViewOrcid", author.orcid_id);
  setAuthorProfileText(
    "authorProfileViewScholar",
    author.google_scholar_id,
  );
  setAuthorProfileText(
    "authorProfileViewLinkedIn",
    author.linkedin_url,
  );
  setAuthorProfileText(
    "authorProfileViewBiography",
    author.biography,
    "No biography added yet.",
  );

  renderAuthorProfileTags(author);
}

function setAuthorProfileEditMode(shouldEdit, options = {}) {
  const hasProfile = hasSavedAuthorProfile(authorProfileState);
  const isEditing = hasProfile ? Boolean(shouldEdit) : true;
  const form = document.getElementById("authorProfileForm");
  const view = document.getElementById("authorProfileView");
  const settingsButton = document.getElementById(
    "authorProfileSettingsButton",
  );
  const heroButton = document.getElementById("authorHeroProfileButton");
  const buttonMarkup = !hasProfile
    ? '<i class="fas fa-id-card"></i> Complete Profile'
    : isEditing
      ? '<i class="fas fa-eye"></i> View Saved Profile'
      : '<i class="fas fa-gear"></i> Profile Settings';

  if (form) {
    form.hidden = !isEditing;
  }

  if (view) {
    view.hidden = isEditing || !hasProfile;
  }

  if (settingsButton) {
    settingsButton.innerHTML = buttonMarkup;
    settingsButton.setAttribute("aria-expanded", String(isEditing));
  }

  if (heroButton) {
    heroButton.innerHTML = buttonMarkup;
  }

  if (options.scroll) {
    const fallbackTarget = document.getElementById("authorProfilePanel");
    const target = isEditing
      ? form || fallbackTarget
      : !view || view.hidden
        ? fallbackTarget
        : view;

    target?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function renderAuthorProfileWorkspace(author = {}) {
  authorProfileState = author || {};
  populateAuthorProfileForm(authorProfileState);
  renderAuthorProfileView(authorProfileState);
  setAuthorProfileEditMode(!hasSavedAuthorProfile(authorProfileState));
}

function toggleAuthorProfileEditor(forceState) {
  const form = document.getElementById("authorProfileForm");
  const isCurrentlyEditing = form ? !form.hidden : false;
  const nextState =
    typeof forceState === "boolean" ? forceState : !isCurrentlyEditing;

  if (authorProfileState) {
    populateAuthorProfileForm(authorProfileState);
    renderAuthorProfileView(authorProfileState);
  }

  setAuthorProfileEditMode(nextState, { scroll: true });
}

function updateSubmissionPreview(draftState, profileMetrics) {
  const submissionPreviewTitle = document.getElementById(
    "submissionPreviewTitle",
  );
  if (submissionPreviewTitle) {
    submissionPreviewTitle.textContent =
      draftState.title || "Untitled manuscript";
  }

  const previewCopy = document.getElementById("submissionPreviewCopy");
  if (previewCopy) {
    const missingChecklist = [];
    if (!draftState.metadataReady) missingChecklist.push("title and category");
    if (!draftState.abstractReady) missingChecklist.push("abstract");
    if (!draftState.fileReady) missingChecklist.push("review file");

    previewCopy.textContent =
      missingChecklist.length === 0
        ? "Your submission package includes the core details editors need for first-pass screening."
        : `Add ${missingChecklist.join(", ")} to complete this submission package.`;
  }

  const previewFields = [
    [
      "submissionPreviewType",
      formatDashboardLabel(draftState.submissionType, "Publishing"),
    ],
    ["submissionPreviewCategory", draftState.category || "Not set"],
    [
      "submissionPreviewKeywords",
      draftState.keywordsList.length
        ? `${draftState.keywordsList.length} keyword${
            draftState.keywordsList.length === 1 ? "" : "s"
          }`
        : "None yet",
    ],
    ["submissionPreviewLanguage", draftState.language || "English"],
  ];

  previewFields.forEach(([elementId, value]) => {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value;
    }
  });

  const abstractCount = document.getElementById("bookAbstractCount");
  if (abstractCount) {
    abstractCount.textContent = `${draftState.abstractWordCount} words`;
  }

  const descriptionCount = document.getElementById("bookDescriptionCount");
  if (descriptionCount) {
    descriptionCount.textContent = `${draftState.descriptionWordCount} words`;
  }

  const fileMeta = document.getElementById("bookFileMeta");
  if (fileMeta) {
    if (draftState.file) {
      const sizeInMb = (draftState.file.size / (1024 * 1024)).toFixed(2);
      fileMeta.textContent = `${draftState.file.name} (${sizeInMb} MB)`;
    } else {
      fileMeta.textContent = "No file selected";
    }
  }

  const submissionChecks = [
    {
      label: "Clear title and category",
      complete: draftState.metadataReady,
    },
    {
      label: "Abstract or editorial summary prepared",
      complete: draftState.abstractReady,
    },
    {
      label: "Keywords included for routing",
      complete: draftState.keywordsReady,
    },
    {
      label: "Profile essentials already on file",
      complete: profileMetrics.essentialsReady,
    },
    {
      label: "Review file attached",
      complete: draftState.fileReady,
    },
  ];
  const completedChecks = submissionChecks.filter(
    (item) => item.complete,
  ).length;
  const progressPercent = (completedChecks / submissionChecks.length) * 100;

  updateProgressBar("submissionProgressBar", progressPercent);

  const progressText = document.getElementById("submissionProgressText");
  if (progressText) {
    progressText.textContent = `${completedChecks} of ${submissionChecks.length} editorial checks complete`;
  }

  const submissionChecklist = document.getElementById("submissionChecklist");
  if (submissionChecklist) {
    submissionChecklist.innerHTML = renderChecklistMarkup(submissionChecks);
  }
}

function updateAuthorReadiness(draftState, profileMetrics) {
  const readinessItems = [
    {
      label: "Profile essentials on file",
      complete: profileMetrics.essentialsReady,
    },
    {
      label: "Discoverability signals added",
      complete: profileMetrics.discoverabilityReady,
    },
    {
      label: "Abstract and subject routing prepared",
      complete: draftState.abstractReady && draftState.keywordsReady,
    },
    {
      label: "Review file attached",
      complete: draftState.fileReady,
    },
  ];
  const completedReadinessItems = readinessItems.filter(
    (item) => item.complete,
  ).length;
  const readinessScore = Math.round(
    (completedReadinessItems / readinessItems.length) * 100,
  );

  const readinessScoreElement = document.getElementById("authorReadinessScore");
  if (readinessScoreElement) {
    readinessScoreElement.textContent = `${readinessScore}%`;
  }
  updateProgressBar("authorReadinessBar", readinessScore);

  const readinessSummary = document.getElementById("authorReadinessSummary");
  if (readinessSummary) {
    if (readinessScore === 100) {
      readinessSummary.textContent =
        "Ready for editorial submission. Your profile and manuscript package look complete.";
    } else if (!profileMetrics.essentialsReady) {
      readinessSummary.textContent =
        "Complete your faculty, department, and biography details to strengthen editorial routing.";
    } else if (!draftState.abstractReady) {
      readinessSummary.textContent =
        "Expand the abstract so editors can assess the manuscript quickly.";
    } else if (!draftState.fileReady) {
      readinessSummary.textContent =
        "Attach the manuscript file to finish the submission package.";
    } else {
      readinessSummary.textContent =
        "Add a few more metadata details to make the submission package stronger.";
    }
  }

  const readinessList = document.getElementById("authorReadinessList");
  if (readinessList) {
    readinessList.innerHTML = renderChecklistMarkup(readinessItems);
  }
}

function parseCompletedStages(value) {
  if (!value) return [];
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function getWorkflowProgress(book) {
  const completedStages = parseCompletedStages(book.completed_stages);
  const completedStageSet = new Set(completedStages);
  let lastStageLabel = "Editorial intake";

  for (const stage of AUTHOR_WORKFLOW_STAGES) {
    if (completedStageSet.has(stage.key)) {
      lastStageLabel = stage.label;
    }
  }

  if (book.status === "published") {
    return {
      percent: 100,
      label: "Published",
      detail: "Production and release complete",
    };
  }

  const completedStageCount = AUTHOR_WORKFLOW_STAGES.filter((stage) =>
    completedStageSet.has(stage.key),
  ).length;
  const percent = completedStageCount
    ? Math.max(
        12,
        Math.round((completedStageCount / AUTHOR_WORKFLOW_STAGES.length) * 100),
      )
    : book.status === "under_review"
      ? 18
      : book.status === "revisions_requested"
        ? 36
        : 8;

  return {
    percent,
    label: lastStageLabel,
    detail: completedStageCount
      ? `${completedStageCount} workflow stage${
          completedStageCount === 1 ? "" : "s"
        } recorded`
      : "Awaiting editorial stage updates",
  };
}

function renderAuthorRecentReviews(reviews) {
  const reviewFeed = document.getElementById("authorRecentReviews");
  if (!reviewFeed) return;

  if (!Array.isArray(reviews) || reviews.length === 0) {
    reviewFeed.innerHTML = `
      <div class="author-review-empty">
        Editorial updates will appear here after screening or peer review begins.
      </div>
    `;
    return;
  }

  reviewFeed.innerHTML = reviews
    .map((review) => {
      const badge = getEditorialFeedbackBadgeMeta(review);
      const reviewSummary = getEditorialFeedbackSummary(review);
      const reviewerName =
        review.created_by_name || review.reviewer_name || "Publishing team";
      const bookTitle = review.book_title || "Current manuscript";
      const feedbackTitle = getEditorialFeedbackTitle(review);
      const attachmentMarkup = renderEditorialFeedbackAttachment(
        review,
        "Open editor file",
      );

      return `
        <article class="author-review-item${
          review.action_required ? " author-review-item-action" : ""
        }">
          <div class="author-review-meta">
            <div class="author-review-heading-block">
              <span class="author-review-book">${escapeHtml(bookTitle)}</span>
              <strong class="author-review-heading">${escapeHtml(
                feedbackTitle,
              )}</strong>
            </div>
            <span class="status-badge status-${escapeHtml(
              badge.className,
            )}">${escapeHtml(badge.label)}</span>
          </div>
          <p>${escapeHtml(reviewSummary)}</p>
          ${attachmentMarkup ? `<div class="workflow-link-group">${attachmentMarkup}</div>` : ""}
          <div class="author-review-footer">
            <strong>${escapeHtml(reviewerName)}</strong>
            <span>${escapeHtml(
              formatDashboardDate(review.created_at, "Recently"),
            )}</span>
          </div>
        </article>
      `;
    })
    .join("");
}

function syncAuthorWorkspace() {
  const profileMetrics = getAuthorProfileMetrics(authorProfileState);
  const draftState = getSubmissionDraftState();

  updateAuthorProfileSummary(profileMetrics);
  updateSubmissionPreview(draftState, profileMetrics);
  updateAuthorReadiness(draftState, profileMetrics);
}

function setupAuthorWorkspaceListeners() {
  const authorProfilePictureInput = document.getElementById(
    "authorProfilePicture",
  );
  const authorProfileImagePreview = document.getElementById(
    "authorProfileImagePreview",
  );
  if (authorProfilePictureInput && authorProfileImagePreview) {
    authorProfilePictureInput.addEventListener("change", function () {
      const file = this.files && this.files[0];
      if (!file) return;
      if (!isSupportedImageFile(file)) {
        showNotification("Profile picture must be a valid image file.", "error");
        this.value = "";
        authorProfileImagePreview.src = getRenderableImageUrl(
          authorProfileState?.profile_image,
        );
        return;
      }
      authorProfileImagePreview.src = URL.createObjectURL(file);
    });
  }

  const manuscriptFieldIds = [
    "bookTitle",
    "bookSubtitle",
    "bookCategory",
    "bookSubmissionType",
    "bookKeywords",
    "bookLanguage",
    "bookAbstract",
    "bookDescription",
    "bookAuthorNotes",
    "bookManuscriptFile",
  ];

  manuscriptFieldIds.forEach((fieldId) => {
    const field = document.getElementById(fieldId);
    if (!field) return;

    const eventName =
      field.type === "file" || field.tagName === "SELECT" ? "change" : "input";
    field.addEventListener(eventName, syncAuthorWorkspace);
  });
}

async function legacyLoadAuthorDashboard() {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const [dashboardRes, profileRes] = await Promise.all([
      fetch(`${API_BASE_URL}/author/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }),
      fetch(`${API_BASE_URL}/author/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }),
    ]);

    const dashboardData = await dashboardRes.json();
    const profileData = await profileRes.json();

    if (dashboardData.success && dashboardData.data) {
      const stats = dashboardData.data.stats || {};
      const royalties = dashboardData.data.royalties || {};
      const inProgressCount =
        (Number(stats.submitted_books) || 0) +
        (Number(stats.under_review_books) || 0) +
        (Number(stats.revision_books) || 0) +
        (Number(stats.in_production_books) || 0);
      document.getElementById("authorTotalBooks").textContent =
        stats.total_books || 0;
      document.getElementById("authorPublishedBooks").textContent =
        stats.published_books || 0;
      document.getElementById("authorInProgressBooks").textContent =
        inProgressCount;
      document.getElementById("authorTotalRoyalties").textContent = `₦${(
        Number(royalties.total_royalties) || 0
      ).toLocaleString()}`;
      renderAuthorBooks(dashboardData.data.books || []);
    }

    if (profileData.success && profileData.author) {
      const author = profileData.author;
      document.getElementById("authorProfileFullName").value =
        author.full_name || "";
      document.getElementById("authorProfileEmail").value = author.email || "";
      document.getElementById("authorProfilePhone").value = author.phone || "";
      document.getElementById("authorProfileStaffId").value =
        author.staff_id || "";
      document.getElementById("authorProfileFaculty").value =
        author.faculty || "";
      document.getElementById("authorProfileDepartment").value =
        author.department || "";
      document.getElementById("authorProfileQualification").value =
        author.qualifications || "";
      document.getElementById("authorProfileExpertise").value =
        author.areas_of_expertise || "";
      document.getElementById("authorProfileOrcidId").value =
        author.orcid_id || "";
      document.getElementById("authorProfileGoogleScholarId").value =
        author.google_scholar_id || "";
      document.getElementById("authorProfileLinkedIn").value =
        author.linkedin_url || "";
      document.getElementById("authorProfileBiography").value =
        author.biography || "";

      const preview = document.getElementById("authorProfileImagePreview");
      if (preview) {
        preview.src = getRenderableImageUrl(author.profile_image);
      }
    }
  } catch (error) {
    console.error("Error loading author dashboard:", error);
    showNotification("Failed to load author dashboard", "error");
  }
}

function legacyRenderAuthorBooks(books) {
  const tbody = document.getElementById("authorBooksTableBody");
  if (!tbody) return;

  if (!Array.isArray(books) || books.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="author-empty-state">
          No manuscripts yet. Use "Submit Manuscript" to send your first file to the publishing team.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = books
    .map((book) => {
      const submittedDate = book.created_at
        ? new Date(book.created_at).toLocaleDateString()
        : "N/A";
      const bookStatus = book.status || "submitted";
      const submissionStatus = book.latest_submission_status || "pending";
      const submissionType = formatDashboardLabel(
        book.latest_submission_type || "publishing",
        "Publishing",
      );
      const manuscriptLink = book.manuscript_file
        ? `<a class="manuscript-link" href="${escapeHtml(resolveAssetUrl(book.manuscript_file))}" target="_blank" rel="noopener noreferrer">Open file</a>`
        : "No file";

      return `
        <tr>
          <td>
            <div class="author-manuscript-title">
              <strong>${escapeHtml(book.title || "Untitled manuscript")}</strong>
              <span class="author-manuscript-meta">${escapeHtml(submissionType)}</span>
            </div>
          </td>
          <td>${escapeHtml(book.category || "N/A")}</td>
          <td><span class="status-badge status-${escapeHtml(bookStatus)}">${escapeHtml(formatDashboardLabel(bookStatus, "Submitted"))}</span></td>
          <td><span class="status-badge status-${escapeHtml(submissionStatus)}">${escapeHtml(formatDashboardLabel(submissionStatus, "Pending"))}</span></td>
          <td>${escapeHtml(submittedDate)}</td>
          <td>${manuscriptLink}</td>
        </tr>
      `;
    })
    .join("");
}

async function legacyHandleManuscriptSubmission(e) {
  e.preventDefault();

  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      showNotification("Please login again to continue", "error");
      return;
    }

    const manuscriptFile =
      document.getElementById("bookManuscriptFile").files[0];
    if (!manuscriptFile) {
      showNotification("Please select a manuscript file", "error");
      return;
    }

    showLoading("Submitting manuscript...");

    const formData = new FormData();
    formData.append("title", document.getElementById("bookTitle").value);
    formData.append("subtitle", document.getElementById("bookSubtitle").value);
    formData.append("category", document.getElementById("bookCategory").value);
    formData.append(
      "submission_type",
      document.getElementById("bookSubmissionType").value,
    );
    formData.append("keywords", document.getElementById("bookKeywords").value);
    formData.append("language", document.getElementById("bookLanguage").value);
    formData.append("abstract", document.getElementById("bookAbstract").value);
    formData.append(
      "description",
      document.getElementById("bookDescription").value,
    );
    formData.append(
      "author_notes",
      document.getElementById("bookAuthorNotes").value,
    );
    formData.append("manuscript_file", manuscriptFile);

    const response = await fetch(`${API_BASE_URL}/author/books`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      showNotification(data.message || "Failed to submit manuscript", "error");
      return;
    }

    showNotification(
      data.message || "Manuscript submitted successfully",
      "success",
    );
    document.getElementById("submitBookForm").reset();
    closeModal("submitBookModal");
    await loadAuthorDashboard();
  } catch (error) {
    console.error("Manuscript submission error:", error);
    showNotification("Failed to submit manuscript", "error");
  } finally {
    hideLoading();
  }
}

function validateManuscriptSubmission(draftState) {
  if (!draftState.file) {
    return "Please select a manuscript file before submitting.";
  }

  if (!draftState.metadataReady) {
    return "Add a clear title and manuscript category before submitting.";
  }

  if (!draftState.abstractReady) {
    return draftState.submissionType === "reprint" ||
      draftState.submissionType === "translation"
      ? "Provide either an abstract or a fuller description so editors can assess this submission."
      : "Expand the abstract to at least 25 words so editors can screen the manuscript properly.";
  }

  const supportedExtensions = new Set([".pdf", ".doc", ".docx"]);
  if (!supportedExtensions.has(getFileExtension(draftState.file.name))) {
    return "Please upload the manuscript as a PDF, DOC, or DOCX file.";
  }

  if (draftState.file.size > 10 * 1024 * 1024) {
    return "The manuscript file must be 10MB or smaller.";
  }

  return null;
}

async function loadAuthorDashboard() {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const [dashboardRes, profileRes] = await Promise.all([
      fetch(`${API_BASE_URL}/author/dashboard`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }),
      fetch(`${API_BASE_URL}/author/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      }),
    ]);

    const dashboardData = await dashboardRes.json();
    const profileData = await profileRes.json();

    if (dashboardData.success && dashboardData.data) {
      authorDashboardState = dashboardData.data;
      const stats = dashboardData.data.stats || {};
      const royalties = dashboardData.data.royalties || {};
      const inProgressCount =
        (Number(stats.submitted_books) || 0) +
        (Number(stats.under_review_books) || 0) +
        (Number(stats.revision_books) || 0) +
        (Number(stats.in_production_books) || 0);
      document.getElementById("authorTotalBooks").textContent =
        stats.total_books || 0;
      document.getElementById("authorPublishedBooks").textContent =
        stats.published_books || 0;
      document.getElementById("authorInProgressBooks").textContent =
        inProgressCount;
      document.getElementById("authorTotalRoyalties").textContent =
        formatCurrencyCode(royalties.total_royalties);
      renderAuthorBooks(dashboardData.data.books || []);
      renderAuthorRecentReviews(dashboardData.data.recentReviews || []);
    }

    if (profileData.success && profileData.author) {
      renderAuthorProfileWorkspace(profileData.author);
    }

    syncAuthorWorkspace();
  } catch (error) {
    console.error("Error loading author dashboard:", error);
    showNotification("Failed to load author dashboard", "error");
  }
}

function renderAuthorBooks(books) {
  const tbody = document.getElementById("authorBooksTableBody");
  if (!tbody) return;

  const portfolioCount = document.getElementById("authorPortfolioCount");
  if (portfolioCount) {
    portfolioCount.textContent = `${Array.isArray(books) ? books.length : 0} manuscript${
      Array.isArray(books) && books.length === 1 ? "" : "s"
    }`;
  }

  if (!Array.isArray(books) || books.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="author-empty-state">
          No manuscripts yet. Use "Submit Manuscript" to send your first file to the publishing team.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = books
    .map((book) => {
      const bookStatus = book.status || "submitted";
      const submissionStatus = book.latest_submission_status || "pending";
      const submissionType = formatDashboardLabel(
        book.latest_submission_type || "publishing",
        "Publishing",
      );
      const workflowProgress = getWorkflowProgress(book);
      const latestFeedbackDate =
        book.latest_feedback_date ||
        book.last_progress_date ||
        book.latest_submission_date ||
        book.updated_at ||
        book.created_at;
      const latestFeedbackSummary =
        book.latest_feedback_title ||
        book.latest_feedback_summary ||
        workflowProgress.detail;
      const latestFeedbackBadge = book.latest_feedback_decision
        ? getEditorialFeedbackBadgeMeta({
            decision: book.latest_feedback_decision,
            action_required: book.latest_feedback_action_required,
          })
        : book.latest_feedback_action_required
          ? getEditorialFeedbackBadgeMeta({
              action_required: book.latest_feedback_action_required,
            })
          : null;
      const latestActivityDate =
        latestFeedbackDate || book.updated_at || book.created_at;
      const manuscriptLinkMarkup = book.manuscript_file
        ? `<a class="manuscript-link" href="${escapeHtml(resolveAssetUrl(book.manuscript_file))}" target="_blank" rel="noopener noreferrer">Open file</a>`
        : `<span class="manuscript-link manuscript-link-disabled">No file</span>`;

      return `
        <tr>
          <td>
            <div class="author-manuscript-title">
              <strong>${escapeHtml(book.title || "Untitled manuscript")}</strong>
              <span class="author-manuscript-meta">${escapeHtml(
                book.subtitle || submissionType,
              )}</span>
            </div>
          </td>
          <td>${escapeHtml(book.category || "N/A")}</td>
          <td>
            <div class="author-workflow-cell">
              <span class="status-badge status-${escapeHtml(bookStatus)}">${escapeHtml(
                formatDashboardLabel(bookStatus, "Submitted"),
              )}</span>
              <div class="author-progress-track author-progress-track-compact">
                <span style="width: ${workflowProgress.percent}%"></span>
              </div>
              <span class="author-workflow-meta">${escapeHtml(
                `${workflowProgress.label} - ${workflowProgress.detail}`,
              )}</span>
            </div>
          </td>
          <td>
            <div class="author-submission-cell">
              <strong>${escapeHtml(submissionType)}</strong>
              <span class="status-badge status-${escapeHtml(
                submissionStatus,
              )}">${escapeHtml(
                formatDashboardLabel(submissionStatus, "Pending"),
              )}</span>
            </div>
          </td>
          <td>
            <div class="author-activity-cell">
              <strong>${escapeHtml(
                formatDashboardDate(latestActivityDate, "Awaiting activity"),
              )}</strong>
              <span class="author-table-meta">${escapeHtml(
                latestFeedbackSummary,
              )}</span>
              ${
                latestFeedbackBadge
                  ? `<span class="status-badge status-${escapeHtml(
                      latestFeedbackBadge.className,
                    )}">${escapeHtml(latestFeedbackBadge.label)}</span>`
                  : ""
              }
            </div>
          </td>
          <td>
            <div class="author-manuscript-actions">
              ${manuscriptLinkMarkup}
              <button
                type="button"
                class="table-action-btn info"
                onclick="viewAuthorBookWorkflow(${book.id})">
                Workflow
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

async function viewAuthorBookWorkflow(bookId) {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      showNotification("Please login again to continue", "error");
      return;
    }

    showLoading("Loading manuscript workflow...");

    const response = await fetch(`${API_BASE_URL}/author/books/${bookId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const data = await response.json();
    if (!response.ok || !data.success || !data.data?.book) {
      showNotification(
        data.message || "Failed to load manuscript workflow",
        "error",
      );
      return;
    }

    const workflowData = data.data;
    const book = workflowData.book;
    const latestSubmission = Array.isArray(workflowData.submissions)
      ? workflowData.submissions[0]
      : null;
    const authorVisibleFeedback = Array.isArray(workflowData.feedback)
      ? workflowData.feedback
      : [];
    const legacyReviewEntries = Array.isArray(workflowData.reviews)
      ? workflowData.reviews.map((entry) => normalizeLegacyReviewEntry(entry))
      : [];
    const editorialActivity = [
      ...authorVisibleFeedback,
      ...legacyReviewEntries,
    ].sort(
      (left, right) =>
        new Date(right.created_at || 0).getTime() -
        new Date(left.created_at || 0).getTime(),
    );
    const latestAuthorFeedback = editorialActivity[0] || null;
    const feedbackMarkup = renderEditorialFeedbackList(
      editorialActivity,
      "No author-visible editorial feedback has been shared for this manuscript yet.",
    );
    const progressMarkup = renderWorkflowList(
      workflowData.progress,
      "Workflow milestones will appear here after editorial review begins.",
      (progressItem) => `
        <li>
          <div>
            <strong>${escapeHtml(
              formatDashboardLabel(progressItem.stage || "workflow"),
            )}</strong>
            <span>${escapeHtml(
              progressItem.notes ||
                formatDashboardDate(
                  progressItem.completed_date || progressItem.start_date,
                  "No milestone date",
                ),
            )}</span>
          </div>
          <div class="workflow-list-actions">
            ${renderStatusBadge(progressItem.status || "not_started", "Not Started")}
          </div>
        </li>
      `,
    );
    const manuscriptLinkMarkup = book.manuscript_file
      ? `
          <a
            class="workflow-attachment-link"
            href="${escapeHtml(resolveAssetUrl(book.manuscript_file))}"
            target="_blank"
            rel="noopener noreferrer">
            <i class="fas fa-file-arrow-down"></i> Open current manuscript
          </a>
        `
      : `<span class="manuscript-link manuscript-link-disabled">No manuscript file uploaded</span>`;
    const needsRevision =
      book.status === "revisions_requested" ||
      authorVisibleFeedback.some((entry) => entry.action_required);

    const workflowContent = document.getElementById("authorWorkflowContent");
    if (!workflowContent) return;

    workflowContent.innerHTML = `
      <div class="workflow-profile workflow-profile-compact">
        <div class="workflow-profile-copy">
          <span class="workflow-kicker">Author Workflow</span>
          <h4>${escapeHtml(book.title || "Untitled manuscript")}</h4>
          <p>${escapeHtml(book.category || "Manuscript record")}</p>
          <div class="workflow-status-row">
            ${renderStatusBadge(book.status || "submitted", "Submitted")}
            ${
              latestSubmission
                ? `<span class="workflow-meta">${escapeHtml(
                    `Latest submission: ${formatDashboardLabel(
                      latestSubmission.submission_type || "publishing",
                      "Publishing",
                    )}`,
                  )}</span>`
                : ""
            }
          </div>
        </div>
      </div>

      <div class="workflow-summary-grid">
        <article class="workflow-summary-card">
          <span>Latest Submission</span>
          <strong>${escapeHtml(
            latestSubmission
              ? formatDashboardDate(
                  latestSubmission.submission_date,
                  "No submission date",
                )
              : "Not yet submitted",
          )}</strong>
        </article>
        <article class="workflow-summary-card">
          <span>Latest Decision</span>
          <strong>${escapeHtml(
            latestAuthorFeedback?.decision
              ? formatDashboardLabel(latestAuthorFeedback.decision)
              : "Awaiting feedback",
          )}</strong>
        </article>
        <article class="workflow-summary-card">
          <span>Current File</span>
          <strong>${escapeHtml(
            getFileExtension(book.manuscript_file || "") || "Document",
          )}</strong>
        </article>
        <article class="workflow-summary-card">
          <span>Action Needed</span>
          <strong>${escapeHtml(needsRevision ? "Revision Requested" : "Monitor Activity")}</strong>
        </article>
      </div>

      <div class="workflow-form-grid">
        <section class="workflow-activity-panel workflow-activity-panel-full">
          <h5>Editorial Feedback</h5>
          <ul class="workflow-feedback-list">${feedbackMarkup}</ul>
        </section>

        <section class="workflow-panel">
          <span class="workflow-panel-label">Current Manuscript</span>
          <p>
            Use the latest file link below to keep track of the version currently
            in editorial review.
          </p>
          <div class="workflow-link-group">${manuscriptLinkMarkup}</div>
          ${
            latestSubmission
              ? `
                <div class="workflow-inline-note">
                  <strong>Submission State</strong>
                  <ul class="workflow-inline-list">
                    <li>
                      <div>
                        <strong>${escapeHtml(
                          formatDashboardLabel(
                            latestSubmission.submission_type || "publishing",
                          ),
                        )}</strong>
                        <span>${escapeHtml(
                          formatDashboardDate(
                            latestSubmission.submission_date,
                            "No date",
                          ),
                        )}</span>
                      </div>
                      <div class="workflow-list-actions">
                        ${renderStatusBadge(
                          latestSubmission.status || "pending",
                          "Pending",
                        )}
                      </div>
                    </li>
                  </ul>
                </div>
              `
              : ""
          }
        </section>
      </div>

      <div class="workflow-form-grid">
        <section class="workflow-activity-panel workflow-activity-panel-full">
          <h5>Workflow Timeline</h5>
          <ul>${progressMarkup}</ul>
        </section>

        <form class="workflow-panel" onsubmit="handleAuthorResubmission(event)">
          <input type="hidden" id="authorRevisionBookId" value="${escapeHtml(
            book.id,
          )}" />
          <span class="workflow-panel-label">Revision Response</span>
          <p class="workflow-panel-copy">
            ${
              needsRevision
                ? "Upload your revised manuscript and respond to the latest editorial request."
                : "Revision upload stays locked until the editorial team asks for changes."
            }
          </p>
          <input type="hidden" id="authorRevisionAllowed" value="${needsRevision ? "true" : "false"}" />
          <div class="workflow-form-fields">
            <div class="form-group workflow-form-full">
              <label for="authorRevisionFile">Revised Manuscript</label>
              <input
                type="file"
                id="authorRevisionFile"
                class="form-control"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                ${needsRevision ? "required" : "disabled"} />
            </div>
            <div class="form-group workflow-form-full">
              <label for="authorRevisionNote">Response Note</label>
              <textarea
                id="authorRevisionNote"
                class="form-control"
                rows="4"
                placeholder="Summarize what you revised or clarify any response to the editorial comments"
                ${needsRevision ? "" : "disabled"}></textarea>
            </div>
          </div>
          <div class="workflow-form-actions">
            <button type="submit" class="btn btn-primary" ${needsRevision ? "" : "disabled"}>
              Submit Revision
            </button>
          </div>
        </form>
      </div>
    `;

    showModal("authorWorkflowModal");
  } catch (error) {
    console.error("View author workflow error:", error);
    showNotification("Failed to load manuscript workflow", "error");
  } finally {
    hideLoading();
  }
}

async function handleAuthorResubmission(event) {
  event.preventDefault();

  try {
    const token = localStorage.getItem("authToken");
    const bookId = document.getElementById("authorRevisionBookId")?.value;
    const canResubmit =
      document.getElementById("authorRevisionAllowed")?.value === "true";
    const revisionFile =
      document.getElementById("authorRevisionFile")?.files?.[0];
    const responseNote =
      document.getElementById("authorRevisionNote")?.value.trim() || "";

    if (!token || !bookId) {
      showNotification("Please login again to continue", "error");
      return;
    }

    if (!canResubmit) {
      showNotification(
        "Revision upload becomes available after editorial feedback requests changes",
        "warning",
      );
      return;
    }

    if (!revisionFile) {
      showNotification("Please choose the revised manuscript file", "error");
      return;
    }

    showLoading("Submitting revised manuscript...");

    const formData = new FormData();
    formData.append("manuscript_file", revisionFile);
    formData.append("author_notes", responseNote);

    const response = await fetch(
      `${API_BASE_URL}/author/books/${bookId}/resubmit`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: formData,
      },
    );

    const data = await response.json();
    if (!response.ok || !data.success) {
      showNotification(
        data.message || "Failed to submit revised manuscript",
        "error",
      );
      return;
    }

    showNotification(
      data.message || "Revised manuscript submitted successfully",
      "success",
    );
    await loadAuthorDashboard();
    await viewAuthorBookWorkflow(bookId);
  } catch (error) {
    console.error("Author resubmission error:", error);
    showNotification("Failed to submit revised manuscript", "error");
  } finally {
    hideLoading();
  }
}

async function handleManuscriptSubmission(e) {
  e.preventDefault();

  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      showNotification("Please login again to continue", "error");
      return;
    }

    const draftState = getSubmissionDraftState();
    const validationMessage = validateManuscriptSubmission(draftState);

    if (validationMessage) {
      showNotification(validationMessage, "error");
      return;
    }

    showLoading("Submitting manuscript...");

    const formData = new FormData();
    formData.append("title", draftState.title);
    formData.append(
      "subtitle",
      document.getElementById("bookSubtitle").value.trim(),
    );
    formData.append("category", draftState.category);
    formData.append("submission_type", draftState.submissionType);
    formData.append(
      "keywords",
      document.getElementById("bookKeywords").value.trim(),
    );
    formData.append("language", draftState.language);
    formData.append("abstract", draftState.abstract);
    formData.append("description", draftState.description);
    formData.append(
      "author_notes",
      document.getElementById("bookAuthorNotes").value.trim(),
    );
    formData.append("manuscript_file", draftState.file);

    const response = await fetch(`${API_BASE_URL}/author/books`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      showNotification(data.message || "Failed to submit manuscript", "error");
      return;
    }

    showNotification(
      data.message || "Manuscript submitted successfully",
      "success",
    );
    document.getElementById("submitBookForm").reset();
    document.getElementById("bookLanguage").value = "English";
    closeModal("submitBookModal");
    syncAuthorWorkspace();
    await loadAuthorDashboard();
  } catch (error) {
    console.error("Manuscript submission error:", error);
    showNotification("Failed to submit manuscript", "error");
  } finally {
    hideLoading();
  }
}

async function handleAuthorProfileUpdate(e) {
  e.preventDefault();
  try {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    showLoading("Updating profile...");

    const formData = new FormData();
    formData.append(
      "full_name",
      document.getElementById("authorProfileFullName").value,
    );
    formData.append(
      "email",
      document.getElementById("authorProfileEmail").value,
    );
    formData.append(
      "phone",
      document.getElementById("authorProfilePhone").value,
    );
    formData.append(
      "staff_id",
      document.getElementById("authorProfileStaffId").value,
    );
    formData.append(
      "faculty",
      document.getElementById("authorProfileFaculty").value,
    );
    formData.append(
      "department",
      document.getElementById("authorProfileDepartment").value,
    );
    formData.append(
      "qualifications",
      document.getElementById("authorProfileQualification").value,
    );
    formData.append(
      "areas_of_expertise",
      document.getElementById("authorProfileExpertise").value,
    );
    formData.append(
      "orcid_id",
      document.getElementById("authorProfileOrcidId").value,
    );
    formData.append(
      "google_scholar_id",
      document.getElementById("authorProfileGoogleScholarId").value,
    );
    formData.append(
      "linkedin_url",
      document.getElementById("authorProfileLinkedIn").value,
    );
    formData.append(
      "biography",
      document.getElementById("authorProfileBiography").value,
    );

    const newPicture = document.getElementById("authorProfilePicture").files[0];
    if (newPicture) {
      if (!isSupportedImageFile(newPicture)) {
        showNotification(
          "Profile picture must be a valid image file.",
          "error",
        );
        return;
      }
      formData.append("profile_image", newPicture);
    }

    const response = await fetch(`${API_BASE_URL}/author/profile`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: formData,
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      showNotification(data.message || "Failed to update profile", "error");
      return;
    }

    showNotification("Profile updated successfully", "success");
    if (currentUser) {
      currentUser.full_name = data.author?.full_name || currentUser.full_name;
      currentUser.email = data.author?.email || currentUser.email;
      updateAuthUI();
    }
    if (data.author) {
      renderAuthorProfileWorkspace(data.author);
    }
    syncAuthorWorkspace();
  } catch (error) {
    console.error("Profile update error:", error);
    showNotification("Failed to update profile", "error");
  } finally {
    hideLoading();
  }
}

async function viewAuthor(authorId) {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) {
      showNotification("Please login to continue", "error");
      return;
    }

    showLoading("Loading author details...");

    const response = await fetch(`${API_BASE_URL}/admin/authors/${authorId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const data = await response.json();
    if (!response.ok || !data.success || !data.author) {
      showNotification(
        data.message || "Failed to load author details",
        "error",
      );
      return;
    }

    const author = data.author;
    const profileImage = getRenderableImageUrl(author.profile_image);
    const content = document.getElementById("authorDetailsContent");
    if (!content) return;

    const statusLabel = formatDashboardLabel(
      author.user_status || "pending",
      "Pending",
    );
    const books = Array.isArray(author.books) ? author.books : [];
    const submissions = Array.isArray(author.submissions)
      ? author.submissions
      : [];
    const contracts = Array.isArray(author.contracts) ? author.contracts : [];
    const recentBooksMarkup =
      books.length > 0
        ? books
            .slice(0, 4)
            .map(
              (book) => `
                <li>
                  <strong>${escapeHtml(book.title || "Untitled book")}</strong>
                  <span>${escapeHtml(formatDashboardLabel(book.status || "draft", "Draft"))}</span>
                </li>
              `,
            )
            .join("")
        : `<li class="author-details-empty">No books linked yet.</li>`;
    const recentSubmissionsMarkup =
      submissions.length > 0
        ? submissions
            .slice(0, 4)
            .map(
              (submission) => `
                <li>
                  <strong>${escapeHtml(submission.title || "Untitled submission")}</strong>
                  <span>${escapeHtml(formatDashboardLabel(submission.status || "pending", "Pending"))}</span>
                </li>
              `,
            )
            .join("")
        : `<li class="author-details-empty">No submissions found.</li>`;
    const recentContractsMarkup =
      contracts.length > 0
        ? contracts
            .slice(0, 4)
            .map(
              (contract) => `
                <li>
                  <strong>${escapeHtml(contract.contract_type || "Publishing contract")}</strong>
                  <span>${escapeHtml(formatDashboardLabel(contract.status || "pending", "Pending"))}</span>
                </li>
              `,
            )
            .join("")
        : `<li class="author-details-empty">No contracts recorded.</li>`;

    content.innerHTML = `
      <div class="author-details-profile">
        <img src="${escapeHtml(profileImage)}" alt="Profile" class="author-details-avatar" />
        <div class="author-details-header-copy">
          <span class="author-details-kicker">Author Record</span>
          <h4>${escapeHtml(author.full_name || "N/A")}</h4>
          <p>${escapeHtml(author.email || "N/A")}</p>
          <div class="author-details-status-row">
            <span class="status-badge status-${escapeHtml(author.user_status || "pending")}">${escapeHtml(statusLabel)}</span>
            <span class="author-details-meta">${escapeHtml(author.staff_id || "No staff ID")}</span>
          </div>
        </div>
      </div>

      <div class="author-details-summary-grid">
        <article class="author-details-summary-card">
          <span>Books</span>
          <strong>${escapeHtml(books.length)}</strong>
        </article>
        <article class="author-details-summary-card">
          <span>Submissions</span>
          <strong>${escapeHtml(submissions.length)}</strong>
        </article>
        <article class="author-details-summary-card">
          <span>Contracts</span>
          <strong>${escapeHtml(contracts.length)}</strong>
        </article>
      </div>

      <div class="author-details-grid">
        <div class="author-details-field">
          <span>Phone</span>
          <strong>${escapeHtml(author.phone || "N/A")}</strong>
        </div>
        <div class="author-details-field">
          <span>Staff / Student ID</span>
          <strong>${escapeHtml(author.staff_id || "N/A")}</strong>
        </div>
        <div class="author-details-field">
          <span>Faculty</span>
          <strong>${escapeHtml(author.faculty || "N/A")}</strong>
        </div>
        <div class="author-details-field">
          <span>Department</span>
          <strong>${escapeHtml(author.department || "N/A")}</strong>
        </div>
        <div class="author-details-field">
          <span>Qualification</span>
          <strong>${escapeHtml(author.qualifications || "N/A")}</strong>
        </div>
        <div class="author-details-field">
          <span>Expertise</span>
          <strong>${escapeHtml(author.areas_of_expertise || "N/A")}</strong>
        </div>
        <div class="author-details-field">
          <span>ORCID iD</span>
          <strong>${escapeHtml(author.orcid_id || "N/A")}</strong>
        </div>
        <div class="author-details-field">
          <span>Scholar ID</span>
          <strong>${escapeHtml(author.google_scholar_id || "N/A")}</strong>
        </div>
      </div>

      <div class="author-details-biography">
        <span>Biography</span>
        <p>${escapeHtml(author.biography || "No biography provided.")}</p>
      </div>

      <div class="author-details-activity-grid">
        <section class="author-details-activity-panel">
          <h5>Recent Books</h5>
          <ul>${recentBooksMarkup}</ul>
        </section>
        <section class="author-details-activity-panel">
          <h5>Recent Submissions</h5>
          <ul>${recentSubmissionsMarkup}</ul>
        </section>
        <section class="author-details-activity-panel">
          <h5>Contracts</h5>
          <ul>${recentContractsMarkup}</ul>
        </section>
      </div>
    `;

    showModal("authorDetailsModal");
  } catch (error) {
    console.error("View author error:", error);
    showNotification("Failed to load author details", "error");
  } finally {
    hideLoading();
  }
}

function editAuthor(authorId) {
  showNotification(`Edit author ${authorId} - Coming soon`, "info");
}

function editBook(bookId) {
  showNotification(`Edit book ${bookId} - Coming soon`, "info");
}

// ============================================
// 11. SYSTEM HEALTH CHECK
// ============================================

async function checkSystemHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/system/health`);
    const data = await response.json();

    if (!data.success) {
      console.warn("System health check failed:", data);
    }
  } catch (error) {
    console.error("System health check error:", error);
  }
}

// Periodically check system health (every 5 minutes)
setInterval(checkSystemHealth, 5 * 60 * 1000);
