import express from "express";
import mysql from "mysql2";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middleware
// Enable CORS for all routes
app.use((req, res, next) => {
  const origin = req.headers.origin;

  const allowedOrigins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:5501",
    "http://127.0.0.1:5501",
  ];

  if (!origin || allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin || "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.header("Access-Control-Max-Age", "86400");
  }

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }

  next();
});

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MySQL Connection with better error handling
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "babcock_publishing",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

if (process.env.DB_SSL === "true") {
  dbConfig.ssl = { rejectUnauthorized: false };
}

const pool = mysql.createPool(dbConfig);

// Initialize tables
const initDatabase = async () => {
  const queries = [
    `CREATE TABLE IF NOT EXISTS authors (
            id INT PRIMARY KEY AUTO_INCREMENT,
            full_name VARCHAR(100) NOT NULL,
            email VARCHAR(100) UNIQUE NOT NULL,
            phone VARCHAR(20),
            faculty VARCHAR(100),
            department VARCHAR(100),
            staff_id VARCHAR(50),
            password VARCHAR(255),
            status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

    `CREATE TABLE IF NOT EXISTS books (
            id INT PRIMARY KEY AUTO_INCREMENT,
            author_id INT,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            category VARCHAR(100),
            manuscript_file VARCHAR(255),
            cover_image VARCHAR(255),
            status ENUM('draft', 'under_review', 'approved', 'published', 'rejected') DEFAULT 'draft',
            review_notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE
        )`,

    `CREATE TABLE IF NOT EXISTS submissions (
            id INT PRIMARY KEY AUTO_INCREMENT,
            book_id INT,
            submission_type ENUM('review', 'publishing', 'printing') NOT NULL,
            status ENUM('pending', 'in_progress', 'completed', 'rejected') DEFAULT 'pending',
            admin_notes TEXT,
            submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
        )`,

    `CREATE TABLE IF NOT EXISTS training_registrations (
            id INT PRIMARY KEY AUTO_INCREMENT,
            full_name VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL,
            student_id VARCHAR(50),
            faculty VARCHAR(100),
            department VARCHAR(100),
            level VARCHAR(20),
            training_type VARCHAR(100),
            preferred_date DATE,
            status ENUM('pending', 'confirmed', 'completed') DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,

    `CREATE TABLE IF NOT EXISTS contacts (
            id INT PRIMARY KEY AUTO_INCREMENT,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL,
            subject VARCHAR(200) NOT NULL,
            message TEXT NOT NULL,
            status ENUM('unread', 'read', 'replied') DEFAULT 'unread',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )`,
  ];

  try {
    for (const query of queries) {
      await pool.promise().execute(query);
    }
    console.log("✓ Database initialized successfully");

    // Check for admin user
    const adminEmail = process.env.ADMIN_EMAIL || "admin@babcock.edu.ng";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    const [adminRows] = await pool
      .promise()
      .execute("SELECT id FROM authors WHERE email = ?", [adminEmail]);

    if (adminRows.length === 0) {
      await pool
        .promise()
        .execute(
          "INSERT INTO authors (full_name, email, password, status) VALUES (?, ?, ?, ?)",
          ["Administrator", adminEmail, adminPassword, "approved"],
        );
      console.log("✓ Default admin user created");
    }
  } catch (error) {
    console.error("✗ Database initialization error:", error.message);
  }
};

// Test database connection
pool.getConnection((err, connection) => {
  if (err) {
    console.error("✗ Database connection failed:", err.message);
    console.log("⚠ Please ensure MySQL is running and the database exists");
    return;
  }
  console.log("✓ Connected to MySQL database");
  connection.release();
  initDatabase();
});

// API Routes

// Author Registration
app.post("/api/authors/register", async (req, res) => {
  try {
    const { full_name, email, phone, faculty, department, staff_id, password } =
      req.body;

    if (!full_name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Full name, email and password are required",
      });
    }

    const [result] = await pool
      .promise()
      .execute(
        "INSERT INTO authors (full_name, email, phone, faculty, department, staff_id, password) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [full_name, email, phone, faculty, department, staff_id, password],
      );

    res.json({
      success: true,
      message: "Registration successful. Please wait for admin approval.",
      authorId: result.insertId,
    });
  } catch (error) {
    console.error("Registration error:", error.message);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    res.status(500).json({
      success: false,
      message: "Registration failed. Please try again.",
    });
  }
});

// Author Login
app.post("/api/authors/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const [rows] = await pool
      .promise()
      .execute(
        "SELECT id, full_name, email, status FROM authors WHERE email = ? AND password = ?",
        [email, password],
      );

    if (rows.length > 0) {
      const author = rows[0];

      if (author.status === "pending") {
        return res.status(403).json({
          success: false,
          message: "Your account is pending admin approval",
        });
      }

      if (author.status === "rejected") {
        return res.status(403).json({
          success: false,
          message: "Your account has been rejected. Please contact admin.",
        });
      }

      res.json({
        success: true,
        author: author,
        message: "Login successful",
      });
    } else {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }
  } catch (error) {
    console.error("Login error:", error.message);
    res.status(500).json({
      success: false,
      message: "Login failed. Please try again.",
    });
  }
});

// Upload Book
app.post("/api/books/upload", async (req, res) => {
  try {
    const { author_id, title, description, category } = req.body;

    if (!author_id || !title) {
      return res.status(400).json({
        success: false,
        message: "Author ID and title are required",
      });
    }

    const [result] = await pool
      .promise()
      .execute(
        "INSERT INTO books (author_id, title, description, category) VALUES (?, ?, ?, ?)",
        [author_id, title, description, category],
      );

    res.json({
      success: true,
      message: "Book uploaded successfully",
      bookId: result.insertId,
    });
  } catch (error) {
    console.error("Upload error:", error.message);
    res.status(500).json({
      success: false,
      message: "Upload failed. Please try again.",
    });
  }
});

// Submit for Review/Publishing
app.post("/api/submissions/create", async (req, res) => {
  try {
    const { book_id, submission_type } = req.body;

    if (!book_id || !submission_type) {
      return res.status(400).json({
        success: false,
        message: "Book ID and submission type are required",
      });
    }

    const [result] = await pool
      .promise()
      .execute(
        "INSERT INTO submissions (book_id, submission_type) VALUES (?, ?)",
        [book_id, submission_type],
      );

    res.json({
      success: true,
      message: "Submission created successfully",
    });
  } catch (error) {
    console.error("Submission error:", error.message);
    res.status(500).json({
      success: false,
      message: "Submission failed. Please try again.",
    });
  }
});

// Training Registration
app.post("/api/training/register", async (req, res) => {
  try {
    const {
      full_name,
      email,
      student_id,
      faculty,
      department,
      level,
      training_type,
      preferred_date,
    } = req.body;

    if (!full_name || !email || !training_type) {
      return res.status(400).json({
        success: false,
        message: "Full name, email and training type are required",
      });
    }

    const [result] = await pool
      .promise()
      .execute(
        "INSERT INTO training_registrations (full_name, email, student_id, faculty, department, level, training_type, preferred_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        [
          full_name,
          email,
          student_id,
          faculty,
          department,
          level,
          training_type,
          preferred_date,
        ],
      );

    res.json({
      success: true,
      message: "Training registration successful",
    });
  } catch (error) {
    console.error("Training registration error:", error.message);
    res.status(500).json({
      success: false,
      message: "Registration failed. Please try again.",
    });
  }
});

// Contact Form
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const [result] = await pool
      .promise()
      .execute(
        "INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)",
        [name, email, subject, message],
      );

    res.json({
      success: true,
      message: "Message sent successfully",
    });
  } catch (error) {
    console.error("Contact error:", error.message);
    res.status(500).json({
      success: false,
      message: "Message sending failed. Please try again.",
    });
  }
});

// Get Author Books
app.get("/api/authors/:id/books", async (req, res) => {
  try {
    const [rows] = await pool
      .promise()
      .execute(
        "SELECT * FROM books WHERE author_id = ? ORDER BY created_at DESC",
        [req.params.id],
      );

    res.json({
      success: true,
      books: rows,
      count: rows.length,
    });
  } catch (error) {
    console.error("Get books error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load books",
    });
  }
});

// Test endpoint
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "API is working",
    timestamp: new Date().toISOString(),
  });
});

// Admin Login
app.post("/api/admin/login", async (req, res) => {
  try {
    console.log("Admin login attempt:", {
      email: req.body.email,
      hasPassword: !!req.body.password,
      timestamp: new Date().toISOString(),
    });

    const { email, password } = req.body;

    if (!email || !password) {
      console.log("Missing email or password");
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const adminEmail = process.env.ADMIN_EMAIL || "admin@babcock.edu.ng";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    if (email === adminEmail && password === adminPassword) {
      console.log("Admin login successful for:", email);
      res.json({
        success: true,
        message: "Admin login successful",
        admin: { email },
      });
    } else {
      // Also check if it's an approved author trying to access admin
      const [rows] = await pool
        .promise()
        .execute(
          "SELECT id, full_name, email FROM authors WHERE email = ? AND password = ? AND status = 'approved'",
          [email, password],
        );

      if (rows.length > 0) {
        res.json({
          success: true,
          message: "Author admin access granted",
          admin: rows[0],
        });
      } else {
        res.status(401).json({
          success: false,
          message: "Invalid admin credentials",
        });
      }
    }
  } catch (error) {
    console.error("Admin login error:", error.message);
    res.status(500).json({
      success: false,
      message: "Admin login failed",
    });
  }
});

// Get Pending Author Registrations
app.get("/api/admin/authors/pending", async (req, res) => {
  try {
    const [rows] = await pool
      .promise()
      .execute(
        "SELECT id, full_name, email, phone, faculty, department, staff_id, status, created_at FROM authors WHERE status = 'pending' ORDER BY created_at ASC",
      );

    res.json({
      success: true,
      authors: rows,
      count: rows.length,
    });
  } catch (error) {
    console.error("Get pending authors error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load pending authors",
    });
  }
});

// Get All Author Registrations
app.get("/api/admin/authors/all", async (req, res) => {
  try {
    const [rows] = await pool
      .promise()
      .execute(
        "SELECT id, full_name, email, phone, faculty, department, staff_id, status, created_at FROM authors ORDER BY created_at DESC",
      );

    res.json({
      success: true,
      authors: rows,
      count: rows.length,
    });
  } catch (error) {
    console.error("Get all authors error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load authors",
    });
  }
});

// Update Author Status
app.put("/api/admin/authors/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const authorId = req.params.id;

    if (!["pending", "approved", "rejected"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const [result] = await pool
      .promise()
      .execute("UPDATE authors SET status = ? WHERE id = ?", [
        status,
        authorId,
      ]);

    if (result.affectedRows > 0) {
      res.json({
        success: true,
        message: `Author ${status} successfully`,
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Author not found",
      });
    }
  } catch (error) {
    console.error("Update author status error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update author status",
    });
  }
});

// Get Pending Training Registrations
app.get("/api/admin/training/pending", async (req, res) => {
  try {
    const [rows] = await pool
      .promise()
      .execute(
        "SELECT id, full_name, email, student_id, faculty, department, level, training_type, preferred_date, status, created_at FROM training_registrations WHERE status = 'pending' ORDER BY created_at ASC",
      );

    res.json({
      success: true,
      registrations: rows,
      count: rows.length,
    });
  } catch (error) {
    console.error("Get pending training error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load pending training registrations",
    });
  }
});

// Get All Training Registrations
app.get("/api/admin/training/all", async (req, res) => {
  try {
    const [rows] = await pool
      .promise()
      .execute(
        "SELECT id, full_name, email, student_id, faculty, department, level, training_type, preferred_date, status, created_at FROM training_registrations ORDER BY created_at DESC",
      );

    res.json({
      success: true,
      registrations: rows,
      count: rows.length,
    });
  } catch (error) {
    console.error("Get all training error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load training registrations",
    });
  }
});

// Update Training Registration Status
app.put("/api/admin/training/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const trainingId = req.params.id;

    if (!["pending", "confirmed", "completed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status",
      });
    }

    const [result] = await pool
      .promise()
      .execute("UPDATE training_registrations SET status = ? WHERE id = ?", [
        status,
        trainingId,
      ]);

    if (result.affectedRows > 0) {
      res.json({
        success: true,
        message: `Training registration ${status} successfully`,
      });
    } else {
      res.status(404).json({
        success: false,
        message: "Training registration not found",
      });
    }
  } catch (error) {
    console.error("Update training status error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to update training status",
    });
  }
});

// Get Dashboard Statistics
app.get("/api/admin/dashboard/stats", async (req, res) => {
  try {
    const [[pendingAuthors]] = await pool
      .promise()
      .execute(
        "SELECT COUNT(*) as count FROM authors WHERE status = 'pending'",
      );

    const [[approvedAuthors]] = await pool
      .promise()
      .execute(
        "SELECT COUNT(*) as count FROM authors WHERE status = 'approved'",
      );

    const [[pendingTraining]] = await pool
      .promise()
      .execute(
        "SELECT COUNT(*) as count FROM training_registrations WHERE status = 'pending'",
      );

    const [[totalBooks]] = await pool
      .promise()
      .execute("SELECT COUNT(*) as count FROM books");

    const [[totalContacts]] = await pool
      .promise()
      .execute("SELECT COUNT(*) as count FROM contacts");

    res.json({
      success: true,
      stats: {
        pendingAuthors: pendingAuthors.count,
        approvedAuthors: approvedAuthors.count,
        pendingTraining: pendingTraining.count,
        totalBooks: totalBooks.count,
        totalContacts: totalContacts.count,
      },
    });
  } catch (error) {
    console.error("Get dashboard stats error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to load dashboard statistics",
    });
  }
});

// Serve static files (CSS, JS, Images, SVG)
app.use(express.static(path.join(__dirname)));

// Serve HTML pages
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/admin.html", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "admin.html"));
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "Server is running",
    timestamp: new Date().toISOString(),
  });
});

// Handle 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, "index.html"));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✓ Server running on port ${PORT}`);
  console.log(`✓ Main site: http://localhost:${PORT}`);
  console.log(`✓ Admin panel: http://localhost:${PORT}/admin`);
  console.log(`✓ API health check: http://localhost:${PORT}/api/health`);
});
