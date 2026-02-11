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

const API_BASE_URL = (runtimeApiBase ||
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

// Initialize the application
document.addEventListener("DOMContentLoaded", function () {
  initAuth();
  loadHomepageData();
  setupEventListeners();
  setupDashboardNavigation();
  initAdminLayout();
  loadAboutInfo();
  initAnimations();
});

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
      const dashboardButton =
        ADMIN_ROLES.includes(currentUser.role)
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
      const dashboardButton =
        ADMIN_ROLES.includes(currentUser.role)
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

function updateMobileMenu() {
  const mobileAuthButtons = document.getElementById("mobileAuthButtons");
  if (!mobileAuthButtons) return;

  if (currentUser) {
    mobileAuthButtons.innerHTML = `
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

    const profilePicture = document.getElementById("regProfilePicture").files[0];
    if (profilePicture) {
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
    document.querySelector(
      '.btn[onclick="loadMorePublications()"]',
    ).style.display = "none";
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
      const navItem = e.target.closest(".nav-item[data-section]");
      if (!navItem) return;
      e.preventDefault();
      const section = navItem.dataset.section;
      showDashboardSection(section);
    });
  }

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
      authorProfileImagePreview.src = URL.createObjectURL(file);
    });
  }
}

function showDashboardSection(sectionId) {
  const targetSection = document.getElementById(sectionId);
  if (!targetSection) return;

  localStorage.setItem("activeAdminSection", sectionId);

  const navItems = document.querySelectorAll(".nav-item[data-section]");
  navItems.forEach((nav) => {
    nav.classList.toggle("active", nav.dataset.section === sectionId);
  });

  const activeNav = document.querySelector(
    `.nav-item[data-section="${sectionId}"] span`,
  );
  const pageTitle = document.getElementById("pageTitle");
  if (activeNav && pageTitle) {
    pageTitle.textContent = activeNav.textContent;
  }

  const sections = document.querySelectorAll(".content-section");
  sections.forEach((section) => {
    section.classList.remove("active");
    if (section.id === sectionId) {
      section.classList.add("active");
    }
  });

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

    const data = await response.json();

    if (data.success) {
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
      showNotification("Failed to load dashboard stats", "error");
    }
  } catch (error) {
    console.error("Error loading dashboard:", error);
    showNotification("Failed to load dashboard", "error");
  }
}

async function loadAuthors() {
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
    const tbody = document.getElementById("authorsTableBody");

    if (data.success && tbody) {
      if (data.authors && data.authors.length > 0) {
        tbody.innerHTML = data.authors
          .map(
            (author) => `
                    <tr>
                        <td>${author.full_name || "N/A"}</td>
                        <td>${author.email || "N/A"}</td>
                        <td>${author.faculty || "N/A"}</td>
                        <td><span class="status-badge status-${author.user_status || "pending"}">${author.user_status || "pending"}</span></td>
                        <td>${author.bookCount || 0}</td>
                        <td>
                            <button class="btn btn-info btn-sm" onclick="viewAuthor(${author.id})">View</button>
                            ${
                              author.user_status === "pending"
                                ? `
                                  <button class="btn btn-success btn-sm" onclick="approveAuthor(${author.id})">Approve</button>
                                  <button class="btn btn-danger btn-sm" onclick="rejectAuthor(${author.id})">Reject</button>
                                `
                                : ``
                            }
                        </td>
                    </tr>
                `,
          )
          .join("");
      } else {
        tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; padding: 20px">
                            No authors found
                        </td>
                    </tr>
                `;
      }
    }
  } catch (error) {
    console.error("Error loading authors:", error);
  }
}

async function loadRegisteredUsers() {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const response = await fetch(`${API_BASE_URL}/admin/users?limit=100`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    const data = await response.json();
    const tbody = document.getElementById("usersTableBody");

    if (!tbody) return;

    if (!response.ok || !data.success) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 20px">
            Failed to load users
          </td>
        </tr>
      `;
      return;
    }

    if (!data.users || data.users.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 20px">
            No registered users found
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = data.users
      .map((user) => {
        const lastLogin = user.last_login
          ? new Date(user.last_login).toLocaleString()
          : "Never";
        const registeredOn = user.created_at
          ? new Date(user.created_at).toLocaleDateString()
          : "N/A";

        return `
          <tr>
            <td>${user.full_name || "N/A"}</td>
            <td>${user.email || "N/A"}</td>
            <td>${user.username || "N/A"}</td>
            <td style="text-transform: capitalize;">${user.role || "user"}</td>
            <td><span class="status-badge status-${user.status || "pending"}">${user.status || "pending"}</span></td>
            <td>${lastLogin}</td>
            <td>${registeredOn}</td>
          </tr>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Error loading registered users:", error);
    const tbody = document.getElementById("usersTableBody");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align: center; padding: 20px">
            Error loading users
          </td>
        </tr>
      `;
    }
  }
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
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 20px">
            No books found
          </td>
        </tr>
      `;
      return;
    }

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
              <button class="btn btn-info btn-sm" onclick="viewBook(${book.id})">View</button>
            </td>
          </tr>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Error loading books:", error);
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

    const response = await fetch(`${API_BASE_URL}/admin/authors/${authorId}/status`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      body: JSON.stringify({ status }),
    });

    const data = await response.json();
    if (!response.ok || !data.success) {
      showNotification(data.message || "Failed to update author status", "error");
      return;
    }

    showNotification(data.message || `Author ${status} successfully`, "success");
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
  try {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const response = await fetch(
      `${API_BASE_URL}/admin/submissions?limit=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      },
    );
    const data = await response.json();
    const tbody = document.getElementById("submissionsTableBody");
    if (!tbody) return;

    if (!response.ok || !data.success) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 20px">
            Failed to load submissions
          </td>
        </tr>
      `;
      return;
    }

    if (!data.submissions || data.submissions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 20px">
            No submissions found
          </td>
        </tr>
      `;
      return;
    }

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
              <button class="btn btn-info btn-sm" onclick="showNotification('Submission details coming soon', 'info')">View</button>
            </td>
          </tr>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Error loading submissions:", error);
    const tbody = document.getElementById("submissionsTableBody");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 20px">
            Error loading submissions
          </td>
        </tr>
      `;
    }
  }
}

async function loadContracts() {
  try {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    const response = await fetch(`${API_BASE_URL}/admin/contracts?limit=100`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });
    const data = await response.json();
    const tbody = document.getElementById("contractsTableBody");
    if (!tbody) return;

    if (!response.ok || !data.success) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 20px">
            Failed to load contracts
          </td>
        </tr>
      `;
      return;
    }

    if (!data.contracts || data.contracts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 20px">
            No contracts found
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = data.contracts
      .map((contract) => `
        <tr>
          <td>${contract.contract_number || "N/A"}</td>
          <td>${contract.book_title || "N/A"}</td>
          <td>${contract.author_name || "N/A"}</td>
          <td>${contract.contract_type || "N/A"}</td>
          <td><span class="status-badge status-${contract.status || "draft"}">${contract.status || "draft"}</span></td>
          <td>
            <button class="btn btn-info btn-sm" onclick="showNotification('Contract details coming soon', 'info')">View</button>
          </td>
        </tr>
      `)
      .join("");
  } catch (error) {
    console.error("Error loading contracts:", error);
    const tbody = document.getElementById("contractsTableBody");
    if (tbody) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align: center; padding: 20px">
            Error loading contracts
          </td>
        </tr>
      `;
    }
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
            ? new Date(row.preferred_date || row.created_at).toLocaleDateString()
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
  // Implement add book modal
  showNotification("Add book functionality coming soon", "info");
}

function showAddContractModal() {
  // Implement add contract modal
  showNotification("Add contract functionality coming soon", "info");
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
  }

  // Initial animation state
  document.querySelectorAll(".animate-fade-in-up").forEach((element) => {
    element.style.animationPlayState = "paused";
  });

  // Trigger animations
  animateOnScroll();
  window.addEventListener("scroll", animateOnScroll);

  // Trigger animations after page load
  setTimeout(() => {
    document.querySelectorAll(".animate-fade-in-up").forEach((element) => {
      element.style.animationPlayState = "running";
    });
  }, 300);
}

// ============================================
// 10. HELPER FUNCTIONS FOR DASHBOARD
// ============================================

function resolveAssetUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/")) return path;
  return `/${path}`;
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
      const stats = dashboardData.data.stats || {};
      const royalties = dashboardData.data.royalties || {};
      document.getElementById("authorTotalBooks").textContent = stats.total_books || 0;
      document.getElementById("authorPublishedBooks").textContent =
        stats.published_books || 0;
      document.getElementById("authorInProgressBooks").textContent =
        stats.in_production_books || 0;
      document.getElementById("authorTotalRoyalties").textContent = `₦${(
        Number(royalties.total_royalties) || 0
      ).toLocaleString()}`;
    }

    if (profileData.success && profileData.author) {
      const author = profileData.author;
      document.getElementById("authorProfileFullName").value =
        author.full_name || "";
      document.getElementById("authorProfileEmail").value = author.email || "";
      document.getElementById("authorProfilePhone").value = author.phone || "";
      document.getElementById("authorProfileStaffId").value = author.staff_id || "";
      document.getElementById("authorProfileFaculty").value = author.faculty || "";
      document.getElementById("authorProfileDepartment").value =
        author.department || "";
      document.getElementById("authorProfileQualification").value =
        author.qualifications || "";
      document.getElementById("authorProfileExpertise").value =
        author.areas_of_expertise || "";
      document.getElementById("authorProfileOrcidId").value = author.orcid_id || "";
      document.getElementById("authorProfileGoogleScholarId").value =
        author.google_scholar_id || "";
      document.getElementById("authorProfileLinkedIn").value =
        author.linkedin_url || "";
      document.getElementById("authorProfileBiography").value =
        author.biography || "";

      const preview = document.getElementById("authorProfileImagePreview");
      if (preview) {
        preview.src = author.profile_image
          ? resolveAssetUrl(author.profile_image)
          : "assets/OIP.webp";
      }
    }
  } catch (error) {
    console.error("Error loading author dashboard:", error);
    showNotification("Failed to load author dashboard", "error");
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
    formData.append("email", document.getElementById("authorProfileEmail").value);
    formData.append("phone", document.getElementById("authorProfilePhone").value);
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
    if (data.author && data.author.profile_image) {
      const preview = document.getElementById("authorProfileImagePreview");
      if (preview) {
        preview.src = resolveAssetUrl(data.author.profile_image);
      }
    }
    document.getElementById("authorProfilePicture").value = "";
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
      showNotification(data.message || "Failed to load author details", "error");
      return;
    }

    const author = data.author;
    const profileImage = author.profile_image
      ? resolveAssetUrl(author.profile_image)
      : "assets/OIP.webp";
    const content = document.getElementById("authorDetailsContent");
    if (!content) return;

    content.innerHTML = `
      <div style="display:flex; gap:16px; align-items:center; margin-bottom:16px; flex-wrap:wrap;">
        <img src="${escapeHtml(profileImage)}" alt="Profile" style="width:88px; height:88px; border-radius:50%; object-fit:cover; border:2px solid #e9ecef;" />
        <div>
          <h4 style="margin:0 0 4px 0;">${escapeHtml(author.full_name || "N/A")}</h4>
          <p style="margin:0; color:#6c757d;">${escapeHtml(author.email || "N/A")}</p>
          <p style="margin:4px 0 0 0; color:#6c757d; text-transform:capitalize;">Status: ${escapeHtml(author.user_status || "pending")}</p>
        </div>
      </div>
      <div class="stats-grid" style="margin-bottom: 0;">
        <div><strong>Phone:</strong> ${escapeHtml(author.phone || "N/A")}</div>
        <div><strong>Staff/Student ID:</strong> ${escapeHtml(author.staff_id || "N/A")}</div>
        <div><strong>Faculty:</strong> ${escapeHtml(author.faculty || "N/A")}</div>
        <div><strong>Department:</strong> ${escapeHtml(author.department || "N/A")}</div>
        <div><strong>Qualification:</strong> ${escapeHtml(author.qualifications || "N/A")}</div>
        <div><strong>Expertise:</strong> ${escapeHtml(author.areas_of_expertise || "N/A")}</div>
        <div><strong>ORCID iD:</strong> ${escapeHtml(author.orcid_id || "N/A")}</div>
        <div><strong>Scholar ID:</strong> ${escapeHtml(author.google_scholar_id || "N/A")}</div>
      </div>
      <div class="form-group" style="margin-top:16px;">
        <strong>Biography</strong>
        <p style="margin-top:8px;">${escapeHtml(author.biography || "N/A")}</p>
      </div>
      <div style="margin-top:8px; color:#6c757d;">
        <small>Books: ${Array.isArray(author.books) ? author.books.length : 0} | Submissions: ${Array.isArray(author.submissions) ? author.submissions.length : 0} | Contracts: ${Array.isArray(author.contracts) ? author.contracts.length : 0}</small>
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

function viewBook(bookId) {
  showNotification(`View book ${bookId} - Coming soon`, "info");
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
