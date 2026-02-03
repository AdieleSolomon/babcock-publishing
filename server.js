const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");
require("dotenv").config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MySQL Connection for production (Supabase compatible)
const db = mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "babcock_publishing",
  port: process.env.DB_PORT || 3306,
  ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
});

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
      await db.promise().execute(query);
    }
    console.log("Database initialized successfully");
  } catch (error) {
    console.error("Database initialization error:", error);
  }
};

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
    return;
  }
  console.log("Connected to MySQL database");
  initDatabase();
});

// API Routes

// Author Registration
app.post("/api/authors/register", async (req, res) => {
  try {
    const { full_name, email, phone, faculty, department, staff_id, password } =
      req.body;

    const [result] = await db
      .promise()
      .execute(
        "INSERT INTO authors (full_name, email, phone, faculty, department, staff_id, password) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [full_name, email, phone, faculty, department, staff_id, password],
      );

    res.json({
      success: true,
      message: "Registration successful",
      authorId: result.insertId,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Author Login
app.post("/api/authors/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await db
      .promise()
      .execute(
        "SELECT id, full_name, email, status FROM authors WHERE email = ? AND password = ?",
        [email, password],
      );

    if (rows.length > 0) {
      res.json({ success: true, author: rows[0] });
    } else {
      res.status(401).json({ success: false, message: "Invalid credentials" });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Upload Book
app.post("/api/books/upload", async (req, res) => {
  try {
    const { author_id, title, description, category } = req.body;

    const [result] = await db
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
    res.status(500).json({ success: false, message: error.message });
  }
});

// Submit for Review/Publishing
app.post("/api/submissions/create", async (req, res) => {
  try {
    const { book_id, submission_type } = req.body;

    const [result] = await db
      .promise()
      .execute(
        "INSERT INTO submissions (book_id, submission_type) VALUES (?, ?)",
        [book_id, submission_type],
      );

    res.json({ success: true, message: "Submission created successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
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

    const [result] = await db
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

    res.json({ success: true, message: "Training registration successful" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Contact Form
app.post("/api/contact", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    const [result] = await db
      .promise()
      .execute(
        "INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)",
        [name, email, subject, message],
      );

    res.json({ success: true, message: "Message sent successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get Author Books
app.get("/api/authors/:id/books", async (req, res) => {
  try {
    const [rows] = await db
      .promise()
      .execute(
        "SELECT * FROM books WHERE author_id = ? ORDER BY created_at DESC",
        [req.params.id],
      );

    res.json({ success: true, books: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
