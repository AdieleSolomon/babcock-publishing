const API_URL = "http://localhost:3001/api";
let currentAdminEmail = "";
let currentFilter = "pending";
let currentSection = "dashboard";
let currentUpdateId = null;
let currentUpdateType = null;

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  setupEventListeners();
  testAPIConnection();
});

// Test API Connection
async function testAPIConnection() {
  try {
    console.log("Testing API connection...");
    const response = await fetch(`${API_URL}/test`);
    const data = await response.json();
    console.log("API Connection successful:", data);
    loadDashboardStats();
  } catch (error) {
    console.error("API Connection failed:", error);
    alert(
      "Cannot connect to API. Make sure the server is running on http://localhost:3001",
    );
  }
}

function setupEventListeners() {
  // Login form
  document
    .getElementById("adminLoginForm")
    .addEventListener("submit", handleLogin);

  // Logout button
  document.getElementById("logoutBtn").addEventListener("click", logout);

  // Navigation
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const section = item.getAttribute("data-section");
      switchSection(section);
    });
  });

  // Filter buttons
  document.querySelectorAll(".filter-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const filter = btn.getAttribute("data-filter");
      const parent = btn.parentElement;

      parent
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");

      currentFilter = filter;

      if (currentSection === "authors") {
        loadAuthorRegistrations();
      } else if (currentSection === "training") {
        loadTrainingRegistrations();
      }
    });
  });
}

async function handleLogin(e) {
  e.preventDefault();

  const email = document.getElementById("adminEmail").value;
  const password = document.getElementById("adminPassword").value;

  try {
    const response = await fetch(`${API_URL}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.success) {
      currentAdminEmail = email;
      document.getElementById("loginModal").classList.remove("active");
      document.getElementById("dashboardContainer").classList.add("active");
      document.getElementById("adminEmail").textContent = email;
      loadDashboardStats();
    } else {
      alert(data.message || "Login failed");
    }
  } catch (error) {
    console.error("Login error details:", {
      message: error.message,
      stack: error.stack,
      api_url: `${API_URL}/admin/login`,
    });
    alert(
      "Login error: " +
        error.message +
        "\n\nPlease check the browser console for more details.",
    );
  }
}

function logout() {
  currentAdminEmail = "";
  document.getElementById("dashboardContainer").classList.remove("active");
  document.getElementById("loginModal").classList.add("active");
  document.getElementById("adminLoginForm").reset();
}

function switchSection(section) {
  // Update navigation
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active");
  });
  document.querySelector(`[data-section="${section}"]`).classList.add("active");

  // Update content
  document.querySelectorAll(".content-section").forEach((s) => {
    s.classList.remove("active");
  });
  document.getElementById(section).classList.add("active");

  // Update page title
  const titles = {
    dashboard: "Dashboard",
    authors: "Author Registrations",
    training: "Student Training",
    books: "All Books",
    contacts: "Contact Messages",
  };
  document.getElementById("pageTitle").textContent = titles[section];

  currentSection = section;

  // Load section data
  if (section === "authors") {
    loadAuthorRegistrations();
  } else if (section === "training") {
    loadTrainingRegistrations();
  } else if (section === "books") {
    loadAllBooks();
  } else if (section === "contacts") {
    loadAllContacts();
  }
}

async function loadDashboardStats() {
  try {
    const response = await fetch(`${API_URL}/admin/dashboard/stats`);
    const data = await response.json();

    if (data.success) {
      document.getElementById("pendingAuthorsCount").textContent =
        data.stats.pendingAuthors;
      document.getElementById("approvedAuthorsCount").textContent =
        data.stats.approvedAuthors;
      document.getElementById("pendingTrainingCount").textContent =
        data.stats.pendingTraining;
      document.getElementById("totalBooksCount").textContent =
        data.stats.totalBooks;
      document.getElementById("totalContactsCount").textContent =
        data.stats.totalContacts;
    }
  } catch (error) {
    console.error("Error loading stats:", error);
  }
}

async function loadAuthorRegistrations() {
  const endpoint =
    currentFilter === "all"
      ? `/api/admin/authors/all`
      : `/api/admin/authors/pending`;

  try {
    const response = await fetch(`${API_URL}${endpoint}`);
    const data = await response.json();

    if (data.success) {
      const tbody = document.getElementById("authorsTableBody");
      tbody.innerHTML = "";

      let filteredAuthors = data.authors;
      if (currentFilter !== "all") {
        filteredAuthors = data.authors.filter(
          (a) => a.status === currentFilter,
        );
      }

      if (filteredAuthors.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="8" style="text-align: center; padding: 40px;">No registrations found</td></tr>';
        return;
      }

      filteredAuthors.forEach((author) => {
        const row = document.createElement("tr");
        const createdDate = new Date(author.created_at).toLocaleDateString();

        row.innerHTML = `
          <td>${author.full_name}</td>
          <td>${author.email}</td>
          <td>${author.faculty || "-"}</td>
          <td>${author.department || "-"}</td>
          <td>${author.staff_id || "-"}</td>
          <td>
            <span class="status-badge status-${author.status}">
              ${author.status}
            </span>
          </td>
          <td>${createdDate}</td>
          <td>
            <div class="action-buttons">
              ${
                author.status === "pending"
                  ? `
                <button class="btn btn-success" onclick="openStatusModal(${author.id}, 'author', 'approved')">Approve</button>
                <button class="btn btn-danger" onclick="openStatusModal(${author.id}, 'author', 'rejected')">Reject</button>
              `
                  : `<button class="btn btn-primary" onclick="openStatusModal(${author.id}, 'author')">Change Status</button>`
              }
            </div>
          </td>
        `;
        tbody.appendChild(row);
      });
    }
  } catch (error) {
    console.error("Error loading authors:", error);
  }
}

async function loadTrainingRegistrations() {
  const endpoint =
    currentFilter === "all"
      ? `/api/admin/training/all`
      : `/api/admin/training/pending`;

  try {
    const response = await fetch(`${API_URL}${endpoint}`);
    const data = await response.json();

    if (data.success) {
      const tbody = document.getElementById("trainingTableBody");
      tbody.innerHTML = "";

      let filteredRegistrations = data.registrations;
      if (currentFilter !== "all") {
        filteredRegistrations = data.registrations.filter(
          (r) => r.status === currentFilter,
        );
      }

      if (filteredRegistrations.length === 0) {
        tbody.innerHTML =
          '<tr><td colspan="9" style="text-align: center; padding: 40px;">No registrations found</td></tr>';
        return;
      }

      filteredRegistrations.forEach((reg) => {
        const row = document.createElement("tr");
        const createdDate = new Date(reg.created_at).toLocaleDateString();
        const preferredDate = reg.preferred_date
          ? new Date(reg.preferred_date).toLocaleDateString()
          : "-";

        row.innerHTML = `
          <td>${reg.full_name}</td>
          <td>${reg.email}</td>
          <td>${reg.student_id || "-"}</td>
          <td>${reg.faculty || "-"}</td>
          <td>${reg.level || "-"}</td>
          <td>${reg.training_type || "-"}</td>
          <td>${preferredDate}</td>
          <td>
            <span class="status-badge status-${reg.status}">
              ${reg.status}
            </span>
          </td>
          <td>
            <div class="action-buttons">
              ${
                reg.status === "pending"
                  ? `
                <button class="btn btn-success" onclick="openStatusModal(${reg.id}, 'training', 'confirmed')">Confirm</button>
                <button class="btn btn-danger" onclick="openStatusModal(${reg.id}, 'training', 'rejected')">Reject</button>
              `
                  : `<button class="btn btn-primary" onclick="openStatusModal(${reg.id}, 'training')">Change Status</button>`
              }
            </div>
          </td>
        `;
        tbody.appendChild(row);
      });
    }
  } catch (error) {
    console.error("Error loading training registrations:", error);
  }
}

async function loadAllBooks() {
  try {
    const response = await fetch(`${API_URL}/admin/training/all`);
    const data = await response.json();

    const container = document.getElementById("booksContainer");
    container.innerHTML = "";

    if (data.registrations.length === 0) {
      container.innerHTML =
        '<div class="empty-state"><i class="fas fa-book"></i><p>No books found</p></div>';
      return;
    }

    // This is a placeholder - you would typically fetch actual books data
    data.registrations.forEach((item, index) => {
      const card = document.createElement("div");
      card.className = "book-card";
      card.innerHTML = `
        <h3>Sample Book ${index + 1}</h3>
        <p>Author: System</p>
        <p>Category: Publishing</p>
        <div class="book-meta">
          <div class="book-meta-item">
            <span class="book-meta-label">Status:</span>
            <span>Available</span>
          </div>
          <div class="book-meta-item">
            <span class="book-meta-label">Pages:</span>
            <span>250</span>
          </div>
        </div>
        <p style="font-size: 12px; color: #999;">Feature coming soon...</p>
      `;
      container.appendChild(card);
    });
  } catch (error) {
    console.error("Error loading books:", error);
  }
}

async function loadAllContacts() {
  const container = document.getElementById("contactsContainer");
  container.innerHTML = "";

  try {
    // Placeholder for contacts - would typically fetch from API
    const card = document.createElement("div");
    card.className = "contact-card";
    card.innerHTML = `
      <h3>Contact Management</h3>
      <p><strong>Feature:</strong> Display contact form submissions</p>
      <p>Status: <span class="status-badge status-pending">Coming Soon</span></p>
      <p style="font-size: 12px; color: #999; margin-top: 15px;">This section will display all contact form submissions with ability to mark as read and replied.</p>
    `;
    container.appendChild(card);
  } catch (error) {
    console.error("Error loading contacts:", error);
  }
}

function openStatusModal(id, type, quickStatus = null) {
  currentUpdateId = id;
  currentUpdateType = type;

  const select = document.getElementById("statusSelect");
  select.innerHTML = '<option value="">-- Select Status --</option>';

  if (type === "author") {
    if (quickStatus) {
      select.value = quickStatus;
    } else {
      select.innerHTML += `
        <option value="pending">Pending</option>
        <option value="approved">Approved</option>
        <option value="rejected">Rejected</option>
      `;
    }
  } else if (type === "training") {
    if (quickStatus) {
      select.value = quickStatus;
    } else {
      select.innerHTML += `
        <option value="pending">Pending</option>
        <option value="confirmed">Confirmed</option>
        <option value="completed">Completed</option>
      `;
    }
  }

  document.getElementById("statusModal").classList.add("active");
}

function closeStatusModal() {
  document.getElementById("statusModal").classList.remove("active");
  currentUpdateId = null;
  currentUpdateType = null;
}

async function updateStatus() {
  const status = document.getElementById("statusSelect").value;

  if (!status) {
    alert("Please select a status");
    return;
  }

  try {
    const endpoint =
      currentUpdateType === "author"
        ? `/api/admin/authors/${currentUpdateId}/status`
        : `/api/admin/training/${currentUpdateId}/status`;

    const response = await fetch(`${API_URL}${endpoint}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    const data = await response.json();

    if (data.success) {
      alert(data.message);
      closeStatusModal();

      // Reload the current section
      if (currentUpdateType === "author") {
        loadAuthorRegistrations();
      } else if (currentUpdateType === "training") {
        loadTrainingRegistrations();
      }

      // Reload stats
      loadDashboardStats();
    } else {
      alert(data.message || "Update failed");
    }
  } catch (error) {
    console.error("Error updating status:", error);
    alert("Error: " + error.message);
  }
}

// Close modal when clicking outside
document.addEventListener("click", (e) => {
  const modal = document.getElementById("statusModal");
  if (e.target === modal) {
    closeStatusModal();
  }
});
