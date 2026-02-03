// API Base URL
const API_BASE_URL = "http://localhost:3001/api";

// DOM Elements
let currentAuthor = null;

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
  loadPublications();
  setupEventListeners();
  setupForms();

  // Check for saved session
  const savedAuthor = localStorage.getItem("currentAuthor");
  if (savedAuthor) {
    currentAuthor = JSON.parse(savedAuthor);
    updateAuthUI();
  }
});

// Setup Event Listeners
function setupEventListeners() {
  // Mobile menu toggle
  const hamburger = document.querySelector(".hamburger");
  const navMenu = document.querySelector(".nav-menu");

  if (hamburger) {
    hamburger.addEventListener("click", () => {
      navMenu.classList.toggle("active");
    });
  }

  // Close mobile menu when clicking outside
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".nav-container")) {
      navMenu.classList.remove("active");
    }
  });
}

// Modal Functions
function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "block";
    document.body.style.overflow = "hidden";

    // If it's the submission modal and author is logged in, load their books
    if (modalId === "submitModal" && currentAuthor) {
      loadAuthorBooks();
    }
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.style.display = "none";
    document.body.style.overflow = "auto";

    // Reset forms when closing
    const form = modal.querySelector("form");
    if (form) {
      form.reset();
    }
  }
}

// Close modal when clicking outside
window.onclick = function (event) {
  if (event.target.classList.contains("modal")) {
    event.target.style.display = "none";
    document.body.style.overflow = "auto";
  }
};

// Setup Form Submissions
function setupForms() {
  // Author Registration
  const registerForm = document.getElementById("authorRegisterForm");
  if (registerForm) {
    registerForm.addEventListener("submit", handleAuthorRegistration);
  }

  // Author Login
  const loginForm = document.getElementById("authorLoginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", handleAuthorLogin);
  }

  // Book Upload
  const uploadForm = document.getElementById("uploadBookForm");
  if (uploadForm) {
    uploadForm.addEventListener("submit", handleBookUpload);
  }

  // Submission for Publishing
  const submitForm = document.getElementById("submitPublishingForm");
  if (submitForm) {
    submitForm.addEventListener("submit", handleSubmission);
  }

  // Training Registration
  const trainingForm = document.getElementById("trainingRegistrationForm");
  if (trainingForm) {
    trainingForm.addEventListener("submit", handleTrainingRegistration);
  }

  // Contact Form
  const contactForm = document.getElementById("contactForm");
  if (contactForm) {
    contactForm.addEventListener("submit", handleContactForm);
  }
}

// Form Handlers
async function handleAuthorRegistration(e) {
  e.preventDefault();

  const formData = {
    full_name: document.getElementById("fullName").value,
    email: document.getElementById("authorEmail").value,
    phone: document.getElementById("authorPhone").value,
    faculty: document.getElementById("faculty").value,
    department: document.getElementById("department").value,
    staff_id: document.getElementById("staffId").value,
    password: document.getElementById("authorPassword").value,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/authors/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (data.success) {
      showSuccess("Registration successful! Please wait for admin approval.");
      closeModal("registerModal");
    } else {
      throw new Error(data.message || "Registration failed");
    }
  } catch (error) {
    showError(error.message);
  }
}

async function handleAuthorLogin(e) {
  e.preventDefault();

  const formData = {
    email: document.getElementById("loginEmail").value,
    password: document.getElementById("loginPassword").value,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/authors/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (data.success) {
      currentAuthor = data.author;
      localStorage.setItem("currentAuthor", JSON.stringify(currentAuthor));
      updateAuthUI();
      showSuccess("Login successful!");
      closeModal("loginModal");
    } else {
      throw new Error(data.message || "Login failed");
    }
  } catch (error) {
    showError(error.message);
  }
}

async function handleBookUpload(e) {
  e.preventDefault();

  if (!currentAuthor) {
    showError("Please login first");
    showModal("loginModal");
    return;
  }

  const formData = new FormData();
  formData.append("author_id", currentAuthor.id);
  formData.append("title", document.getElementById("bookTitle").value);
  formData.append(
    "description",
    document.getElementById("bookDescription").value,
  );
  formData.append("category", document.getElementById("bookCategory").value);

  const manuscriptFile = document.getElementById("manuscriptFile").files[0];
  if (manuscriptFile) {
    formData.append("manuscript_file", manuscriptFile);
  }

  const coverImage = document.getElementById("coverImage").files[0];
  if (coverImage) {
    formData.append("cover_image", coverImage);
  }

  try {
    const response = await fetch(`${API_BASE_URL}/books/upload`, {
      method: "POST",
      body: formData,
    });

    const data = await response.json();

    if (data.success) {
      // Create submission for review
      await fetch(`${API_BASE_URL}/submissions/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          book_id: data.bookId,
          submission_type: "review",
        }),
      });

      showSuccess("Book uploaded successfully for review!");
      closeModal("uploadModal");
    } else {
      throw new Error(data.message || "Upload failed");
    }
  } catch (error) {
    showError(error.message);
  }
}

async function loadAuthorBooks() {
  if (!currentAuthor) return;

  try {
    const response = await fetch(
      `${API_BASE_URL}/authors/${currentAuthor.id}/books`,
    );
    const data = await response.json();

    const bookSelect = document.getElementById("bookSelect");
    if (bookSelect && data.success) {
      bookSelect.innerHTML = '<option value="">Select Your Book</option>';

      data.books.forEach((book) => {
        if (book.status === "approved") {
          const option = document.createElement("option");
          option.value = book.id;
          option.textContent = book.title;
          bookSelect.appendChild(option);
        }
      });
    }
  } catch (error) {
    console.error("Error loading books:", error);
  }
}

async function handleSubmission(e) {
  e.preventDefault();

  if (!currentAuthor) {
    showError("Please login first");
    showModal("loginModal");
    return;
  }

  const formData = {
    book_id: document.getElementById("bookSelect").value,
    submission_type: document.getElementById("submissionType").value,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/submissions/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (data.success) {
      showSuccess("Submission successful! Our team will contact you soon.");
      closeModal("submitModal");
    } else {
      throw new Error(data.message || "Submission failed");
    }
  } catch (error) {
    showError(error.message);
  }
}

async function handleTrainingRegistration(e) {
  e.preventDefault();

  const formData = {
    full_name: document.getElementById("studentName").value,
    email: document.getElementById("studentEmail").value,
    student_id: document.getElementById("studentId").value,
    faculty: document.getElementById("studentFaculty").value,
    department: document.getElementById("studentDepartment").value,
    level: document.getElementById("studentLevel").value,
    training_type: document.getElementById("trainingType").value,
    preferred_date: document.getElementById("preferredDate").value,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/training/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (data.success) {
      showSuccess(
        "Training registration successful! We will contact you with details.",
      );
      closeModal("trainingModal");
    } else {
      throw new Error(data.message || "Registration failed");
    }
  } catch (error) {
    showError(error.message);
  }
}

async function handleContactForm(e) {
  e.preventDefault();

  const formData = {
    name: document.getElementById("contactName").value,
    email: document.getElementById("contactEmail").value,
    subject: document.getElementById("contactSubject").value,
    message: document.getElementById("contactMessage").value,
  };

  try {
    const response = await fetch(`${API_BASE_URL}/contact`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (data.success) {
      showSuccess("Message sent successfully! We will respond shortly.");
      document.getElementById("contactForm").reset();
    } else {
      throw new Error(data.message || "Message sending failed");
    }
  } catch (error) {
    showError(error.message);
  }
}

// Load Sample Publications
async function loadPublications() {
  const publicationsList = document.getElementById("publicationsList");
  if (!publicationsList) return;

  // Sample publications data
  const publications = [
    {
      id: 1,
      title: "Introduction to Computer Science",
      author: "Dr. John Adebayo",
      category: "Textbook",
      year: "2023",
    },
    {
      id: 2,
      title: "Research Methods in Social Sciences",
      author: "Prof. Mary Johnson",
      category: "Research",
      year: "2022",
    },
    {
      id: 3,
      title: "Business Ethics and Corporate Governance",
      author: "Dr. Samuel Ojo",
      category: "Textbook",
      year: "2023",
    },
    {
      id: 4,
      title: "Advances in Medical Research",
      author: "Various Authors",
      category: "Journal",
      year: "2024",
    },
  ];

  publicationsList.innerHTML = "";

  publications.forEach((pub) => {
    const card = document.createElement("div");
    card.className = "publication-card";
    card.innerHTML = `
            <div class="publication-image">
                <i class="fas fa-book"></i>
            </div>
            <div class="publication-info">
                <h3>${pub.title}</h3>
                <p class="author">By ${pub.author}</p>
                <div class="publication-details">
                    <span class="category">${pub.category}</span>
                    <span class="year">${pub.year}</span>
                </div>
            </div>
        `;
    publicationsList.appendChild(card);
  });
}

// Update UI based on authentication state
function updateAuthUI() {
  const authButtons = document.querySelector(".auth-buttons");
  if (authButtons && currentAuthor) {
    authButtons.innerHTML = `
            <div class="user-menu">
                <span>Welcome, ${currentAuthor.full_name.split(" ")[0]}</span>
                <button class="btn-logout" onclick="logout()">Logout</button>
            </div>
        `;
  }
}

// Logout function
function logout() {
  currentAuthor = null;
  localStorage.removeItem("currentAuthor");
  location.reload();
}

// Success and Error Messages
function showSuccess(message) {
  const successMessage = document.getElementById("successMessage");
  if (successMessage) {
    successMessage.textContent = message;
    showModal("successModal");
  }
}

function showError(message) {
  alert("Error: " + message);
}
