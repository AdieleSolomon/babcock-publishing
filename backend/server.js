import express from "express";
import mysql from "mysql2";
import pg from "pg";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import multer from "multer";
import fs from "fs";
import session from "express-session";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FRONTEND_DIR = path.resolve(__dirname, "..", "frontend");
const FRONTEND_PUBLIC_DIR = path.join(FRONTEND_DIR, "public");
const LOCAL_CORS_ORIGINS = [
  "http://localhost:5500",
  "http://localhost:3000",
  "http://localhost:3001",
  "http://127.0.0.1:5500",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
];

function parseOrigins(value) {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

const configuredOrigins = [
  ...parseOrigins(process.env.CORS_ORIGIN),
  ...parseOrigins(process.env.FRONTEND_URL),
];

const allowedOrigins = new Set(
  process.env.NODE_ENV === "production"
    ? configuredOrigins
    : [...LOCAL_CORS_ORIGINS, ...configuredOrigins],
);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser clients and same-origin requests.
    if (!origin || allowedOrigins.size === 0 || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error("CORS blocked for this origin"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "Accept",
    "X-Requested-With",
  ],
};

if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET || "babcock_publishing_secret_key_2024",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  }),
);

// Configure file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, "uploads");
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx/;
    const extname = allowedTypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error("Error: File type not allowed!"));
    }
  },
});

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

app.use(bodyParser.json({ limit: "10mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(express.static(FRONTEND_DIR));
app.use(express.static(FRONTEND_PUBLIC_DIR));

const DB_CLIENT = (process.env.DB_CLIENT || "mysql").toLowerCase();
const isPostgres = DB_CLIENT === "postgres";
const { Pool: PgPool } = pg;

// Database connection configuration
const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "babcock_publishing",
  port: process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: "utf8mb4",
};

const mysqlPool = isPostgres ? null : mysql.createPool(dbConfig);
function buildPostgresConfig() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required when DB_CLIENT=postgres");
  }

  const parsed = new URL(databaseUrl);
  const family = process.env.PG_FAMILY
    ? Number(process.env.PG_FAMILY)
    : undefined;
  const sslEnabled = process.env.DB_SSL === "true";

  return {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 5432,
    user: decodeURIComponent(parsed.username || ""),
    password: decodeURIComponent(parsed.password || ""),
    database: parsed.pathname ? parsed.pathname.replace(/^\/+/, "") : "postgres",
    family,
    ssl: sslEnabled ? { rejectUnauthorized: false } : undefined,
  };
}

const pgPool = isPostgres ? new PgPool(buildPostgresConfig()) : null;

function convertQuestionParams(sql) {
  let idx = 0;
  let inSingle = false;
  let inDouble = false;
  let output = "";

  for (let i = 0; i < sql.length; i += 1) {
    const ch = sql[i];
    const prev = i > 0 ? sql[i - 1] : "";

    if (ch === "'" && !inDouble && prev !== "\\") {
      inSingle = !inSingle;
      output += ch;
      continue;
    }
    if (ch === '"' && !inSingle && prev !== "\\") {
      inDouble = !inDouble;
      output += ch;
      continue;
    }

    if (!inSingle && !inDouble && ch === "?") {
      idx += 1;
      output += `$${idx}`;
      continue;
    }

    output += ch;
  }

  return output;
}

function normalizeSqlForPostgres(sql) {
  let normalized = sql;
  normalized = normalized.replace(
    /DATE_SUB\s*\(\s*CURDATE\(\)\s*,\s*INTERVAL\s+(\d+)\s+DAY\s*\)/gi,
    "CURRENT_DATE - INTERVAL '$1 day'",
  );
  normalized = normalized.replace(
    /DATE_SUB\s*\(\s*CURDATE\(\)\s*,\s*INTERVAL\s+(\d+)\s+MONTH\s*\)/gi,
    "CURRENT_DATE - INTERVAL '$1 month'",
  );
  normalized = normalized.replace(/CURDATE\(\)/gi, "CURRENT_DATE");
  normalized = normalized.replace(
    /YEAR\s*\(\s*([^)]+)\s*\)/gi,
    "EXTRACT(YEAR FROM $1)",
  );
  normalized = normalized.replace(
    /MONTH\s*\(\s*([^)]+)\s*\)/gi,
    "EXTRACT(MONTH FROM $1)",
  );
  normalized = normalized.replace(
    /DATEDIFF\s*\(\s*([^,]+)\s*,\s*CURRENT_DATE\s*\)/gi,
    "($1::date - CURRENT_DATE)",
  );
  return normalized;
}

async function dbQuery(sql, params = []) {
  if (!isPostgres) {
    return mysqlPool.promise().query(sql, params);
  }

  const transformedSql = convertQuestionParams(normalizeSqlForPostgres(sql));
  const trimmedSql = transformedSql.trim().toLowerCase();
  const isInsert = /^insert\s+into\s+/i.test(trimmedSql);
  const hasReturning = /\breturning\b/i.test(trimmedSql);
  const executableSql =
    isInsert && !hasReturning
      ? `${transformedSql} RETURNING id`
      : transformedSql;

  const result = await pgPool.query(executableSql, params);

  if (
    /^select\s+/i.test(trimmedSql) ||
    /^with\s+/i.test(trimmedSql) ||
    /^show\s+/i.test(trimmedSql)
  ) {
    return [result.rows];
  }

  if (isInsert) {
    return [
      {
        affectedRows: result.rowCount || 0,
        insertId: result.rows?.[0]?.id ?? null,
        rows: result.rows,
      },
    ];
  }

  return [
    {
      affectedRows: result.rowCount || 0,
      rowCount: result.rowCount || 0,
      rows: result.rows,
    },
  ];
}

async function getTableColumns(tableName) {
  if (isPostgres) {
    const [rows] = await dbQuery(
      `SELECT column_name
       FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = ?
       ORDER BY ordinal_position`,
      [tableName],
    );
    return new Set(rows.map((row) => row.column_name));
  }

  const [rows] = await dbQuery(`SHOW COLUMNS FROM ${tableName}`);
  return new Set(rows.map((row) => row.Field || row.field));
}

function toNullable(value) {
  if (value === undefined || value === null) return null;
  const text = String(value).trim();
  return text === "" ? null : text;
}

function getUploadPath(file) {
  if (!file) return null;
  return `/uploads/${file.filename}`;
}

async function ensureAuthorProfileColumns() {
  const userColumns = await getTableColumns("users");
  const authorColumns = await getTableColumns("authors");

  const userAlterStatements = [];
  if (!userColumns.has("profile_image")) {
    userAlterStatements.push("ADD COLUMN profile_image VARCHAR(255)");
  }
  if (!userColumns.has("phone")) {
    userAlterStatements.push("ADD COLUMN phone VARCHAR(20)");
  }
  if (userAlterStatements.length > 0) {
    await dbQuery(`ALTER TABLE users ${userAlterStatements.join(", ")}`);
  }

  const authorAlterStatements = [];
  if (!authorColumns.has("qualifications")) {
    authorAlterStatements.push("ADD COLUMN qualifications TEXT");
  }
  if (!authorColumns.has("biography")) {
    authorAlterStatements.push("ADD COLUMN biography TEXT");
  }
  if (!authorColumns.has("areas_of_expertise")) {
    authorAlterStatements.push("ADD COLUMN areas_of_expertise TEXT");
  }
  if (!authorColumns.has("orcid_id")) {
    authorAlterStatements.push("ADD COLUMN orcid_id VARCHAR(50)");
  }
  if (!authorColumns.has("google_scholar_id")) {
    authorAlterStatements.push("ADD COLUMN google_scholar_id VARCHAR(100)");
  }
  if (!authorColumns.has("linkedin_url")) {
    authorAlterStatements.push("ADD COLUMN linkedin_url VARCHAR(255)");
  }
  if (!authorColumns.has("status")) {
    authorAlterStatements.push(
      isPostgres
        ? "ADD COLUMN status TEXT DEFAULT 'pending'"
        : "ADD COLUMN status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'",
    );
  }
  if (authorAlterStatements.length > 0) {
    await dbQuery(`ALTER TABLE authors ${authorAlterStatements.join(", ")}`);
  }
}

// JWT Secret
const JWT_SECRET =
  process.env.JWT_SECRET || "babcock_publishing_jwt_secret_2024_secure_key";

// Email configuration (optional)
const emailConfig = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || "587", 10),
  user: process.env.SMTP_USER,
  pass: process.env.SMTP_PASSWORD,
  sender: process.env.SENDER_EMAIL || process.env.SMTP_USER,
};

const isEmailConfigured =
  !!emailConfig.host &&
  !!emailConfig.port &&
  !!emailConfig.user &&
  !!emailConfig.pass &&
  !!emailConfig.sender;

const mailTransporter = isEmailConfigured
  ? nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.port === 465,
      auth: {
        user: emailConfig.user,
        pass: emailConfig.pass,
      },
    })
  : null;

async function sendEmail({ to, subject, text, html }) {
  if (!mailTransporter) {
    return false;
  }

  try {
    await mailTransporter.sendMail({
      from: emailConfig.sender,
      to,
      subject,
      text,
      html,
    });
    return true;
  } catch (error) {
    console.error("Email send error:", error.message);
    return false;
  }
}

// ============== MIDDLEWARE ==============
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Access denied. No token provided.",
      });
    }

    const token = authHeader.split(" ")[1];

    if (!token || token.trim() === "") {
      return res.status(401).json({
        success: false,
        message: "Access denied. Invalid token format.",
      });
    }

    // Development bypass (only for testing in development)
    if (
      process.env.NODE_ENV === "development" &&
      token === "admin-development-token"
    ) {
      req.user = {
        id: 1,
        email: "admin@babcock.edu.ng",
        role: "admin",
        full_name: "Administrator",
      };
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);

    // Check if token is expired
    if (decoded.exp && decoded.exp < Date.now() / 1000) {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
      });
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error("Auth middleware error:", error.message);

    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        message: "Invalid token. Please login again.",
      });
    }

    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        message: "Token expired. Please login again.",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

const roleMiddleware = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Insufficient permissions",
      });
    }

    next();
  };
};

// Enhanced Database Schema
const initDatabase = async () => {
  const queries = [
    // Users table (for website users)
    `CREATE TABLE IF NOT EXISTS users (
      id INT PRIMARY KEY AUTO_INCREMENT,
      username VARCHAR(50) UNIQUE NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      full_name VARCHAR(100) NOT NULL,
      phone VARCHAR(20),
      role ENUM('user', 'author', 'admin', 'editor', 'reviewer') DEFAULT 'user',
      status ENUM('active', 'inactive', 'suspended', 'pending') DEFAULT 'pending',
      email_verified BOOLEAN DEFAULT FALSE,
      verification_token VARCHAR(500),
      reset_token VARCHAR(500),
      reset_token_expiry DATETIME,
      last_login TIMESTAMP NULL,
      profile_image VARCHAR(255),
      preferences JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_email (email),
      INDEX idx_status (status),
      INDEX idx_role (role)
    )`,

    // Authors table
    `CREATE TABLE IF NOT EXISTS authors (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT UNIQUE,
      staff_id VARCHAR(50) UNIQUE,
      faculty VARCHAR(100),
      department VARCHAR(100),
      qualifications TEXT,
      biography TEXT,
      areas_of_expertise TEXT,
      orcid_id VARCHAR(50),
      google_scholar_id VARCHAR(100),
      research_gate_url VARCHAR(255),
      linkedin_url VARCHAR(255),
      total_publications INT DEFAULT 0,
      h_index INT DEFAULT 0,
      total_citations INT DEFAULT 0,
      awards TEXT,
      cv_url VARCHAR(255),
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      INDEX idx_user_id (user_id),
      INDEX idx_faculty (faculty)
    )`,

    // Books table (updated)
    `CREATE TABLE IF NOT EXISTS books (
      id INT PRIMARY KEY AUTO_INCREMENT,
      isbn VARCHAR(20) UNIQUE,
      title VARCHAR(255) NOT NULL,
      subtitle VARCHAR(255),
      author_id INT,
      co_authors TEXT,
      description TEXT,
      abstract TEXT,
      category VARCHAR(100),
      subcategory VARCHAR(100),
      keywords TEXT,
      manuscript_file VARCHAR(255),
      cover_image VARCHAR(255),
      sample_chapter VARCHAR(255),
      page_count INT,
      word_count INT,
      language VARCHAR(50) DEFAULT 'English',
      status ENUM('draft', 'submitted', 'under_review', 'revisions_requested', 'accepted', 'in_production', 'published', 'rejected', 'archived') DEFAULT 'draft',
      publication_date DATE,
      price DECIMAL(10,2),
      edition VARCHAR(20),
      format ENUM('hardcover', 'paperback', 'ebook', 'audiobook') DEFAULT 'paperback',
      is_open_access BOOLEAN DEFAULT FALSE,
      reviewer_notes TEXT,
      editor_notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE SET NULL,
      INDEX idx_status (status),
      INDEX idx_category (category),
      INDEX idx_author_id (author_id)
    )`,

    // Submissions table
    `CREATE TABLE IF NOT EXISTS submissions (
      id INT PRIMARY KEY AUTO_INCREMENT,
      book_id INT,
      submission_type ENUM('review', 'publishing', 'reprint', 'translation', 'special_edition') NOT NULL,
      status ENUM('pending', 'assigned', 'in_review', 'review_completed', 'accepted', 'rejected', 'withdrawn') DEFAULT 'pending',
      assigned_to INT,
      due_date DATE,
      priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
      admin_notes TEXT,
      author_notes TEXT,
      submission_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_date TIMESTAMP NULL,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES authors(id) ON DELETE SET NULL,
      INDEX idx_status (status),
      INDEX idx_book_id (book_id)
    )`,

    // Reviews table
    `CREATE TABLE IF NOT EXISTS reviews (
      id INT PRIMARY KEY AUTO_INCREMENT,
      submission_id INT,
      reviewer_id INT,
      rating INT CHECK (rating >= 1 AND rating <= 5),
      originality_score INT,
      clarity_score INT,
      methodology_score INT,
      contribution_score INT,
      overall_score DECIMAL(3,2),
      comments TEXT,
      confidential_comments TEXT,
      recommendation ENUM('accept', 'minor_revisions', 'major_revisions', 'reject', 'resubmit'),
      status ENUM('pending', 'in_progress', 'completed', 'overdue') DEFAULT 'pending',
      assigned_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      completed_date TIMESTAMP NULL,
      FOREIGN KEY (submission_id) REFERENCES submissions(id) ON DELETE CASCADE,
      FOREIGN KEY (reviewer_id) REFERENCES authors(id) ON DELETE SET NULL
    )`,

    // Contracts table
    `CREATE TABLE IF NOT EXISTS contracts (
      id INT PRIMARY KEY AUTO_INCREMENT,
      book_id INT,
      author_id INT,
      contract_type ENUM('standard', 'royalty', 'advance', 'work_for_hire') DEFAULT 'standard',
      contract_number VARCHAR(50) UNIQUE,
      status ENUM('draft', 'sent', 'signed', 'executed', 'expired', 'terminated') DEFAULT 'draft',
      start_date DATE,
      end_date DATE,
      royalty_percentage DECIMAL(5,2),
      advance_amount DECIMAL(10,2),
      payment_schedule TEXT,
      rights_granted TEXT,
      territory TEXT,
      digital_rights BOOLEAN DEFAULT TRUE,
      audio_rights BOOLEAN DEFAULT FALSE,
      translation_rights BOOLEAN DEFAULT FALSE,
      contract_file VARCHAR(255),
      signed_date DATE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE,
      INDEX idx_status (status),
      INDEX idx_author_id (author_id)
    )`,

    // Training registrations
    `CREATE TABLE IF NOT EXISTS training_registrations (
      id INT PRIMARY KEY AUTO_INCREMENT,
      full_name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL,
      student_id VARCHAR(50),
      faculty VARCHAR(100),
      department VARCHAR(100),
      level VARCHAR(20),
      training_type ENUM('publishing_basics', 'editing_proofreading', 'copyright_law', 'digital_publishing', 'academic_writing', 'research_methodology') NOT NULL,
      training_mode ENUM('in_person', 'online', 'hybrid') DEFAULT 'in_person',
      preferred_date DATE,
      preferred_time TIME,
      status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
      attendance BOOLEAN DEFAULT FALSE,
      certificate_issued BOOLEAN DEFAULT FALSE,
      certificate_number VARCHAR(50),
      feedback TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_status (status),
      INDEX idx_email (email)
    )`,

    // Contacts table
    `CREATE TABLE IF NOT EXISTS contacts (
      id INT PRIMARY KEY AUTO_INCREMENT,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) NOT NULL,
      phone VARCHAR(20),
      subject VARCHAR(200) NOT NULL,
      message TEXT NOT NULL,
      category ENUM('general', 'submission', 'contract', 'training', 'technical', 'other') DEFAULT 'general',
      status ENUM('new', 'read', 'replied', 'closed', 'spam') DEFAULT 'new',
      assigned_to INT,
      priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
      response TEXT,
      responded_by INT,
      response_date TIMESTAMP NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_to) REFERENCES authors(id) ON DELETE SET NULL,
      FOREIGN KEY (responded_by) REFERENCES authors(id) ON DELETE SET NULL,
      INDEX idx_status (status),
      INDEX idx_email (email)
    )`,

    // Royalties table
    `CREATE TABLE IF NOT EXISTS royalties (
      id INT PRIMARY KEY AUTO_INCREMENT,
      contract_id INT,
      book_id INT,
      author_id INT,
      period_start DATE,
      period_end DATE,
      units_sold INT DEFAULT 0,
      revenue DECIMAL(10,2) DEFAULT 0,
      royalty_amount DECIMAL(10,2) DEFAULT 0,
      payment_status ENUM('pending', 'calculated', 'approved', 'paid', 'disputed') DEFAULT 'pending',
      payment_date DATE,
      payment_method ENUM('bank_transfer', 'check', 'paypal', 'other') DEFAULT 'bank_transfer',
      transaction_reference VARCHAR(100),
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE
    )`,

    // Production table
    `CREATE TABLE IF NOT EXISTS production (
      id INT PRIMARY KEY AUTO_INCREMENT,
      book_id INT,
      stage ENUM('typesetting', 'proofreading', 'cover_design', 'layout', 'printing', 'quality_check', 'distribution', 'completed') DEFAULT 'typesetting',
      assigned_to VARCHAR(100),
      start_date DATE,
      due_date DATE,
      completed_date DATE,
      status ENUM('not_started', 'in_progress', 'completed', 'delayed') DEFAULT 'not_started',
      notes TEXT,
      files TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    )`,

    // Inventory table
    `CREATE TABLE IF NOT EXISTS inventory (
      id INT PRIMARY KEY AUTO_INCREMENT,
      book_id INT,
      format ENUM('hardcover', 'paperback', 'ebook') NOT NULL,
      quantity INT DEFAULT 0,
      reserved INT DEFAULT 0,
      available INT GENERATED ALWAYS AS (quantity - reserved) STORED,
      reorder_level INT DEFAULT 50,
      location VARCHAR(100),
      last_restocked DATE,
      unit_cost DECIMAL(10,2),
      selling_price DECIMAL(10,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    )`,

    // Sales table
    `CREATE TABLE IF NOT EXISTS sales (
      id INT PRIMARY KEY AUTO_INCREMENT,
      book_id INT,
      format ENUM('hardcover', 'paperback', 'ebook') NOT NULL,
      quantity INT NOT NULL,
      unit_price DECIMAL(10,2) NOT NULL,
      total_amount DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
      customer_type ENUM('student', 'staff', 'library', 'bookstore', 'online', 'other') DEFAULT 'student',
      customer_email VARCHAR(100),
      customer_name VARCHAR(100),
      payment_method ENUM('cash', 'card', 'bank_transfer', 'online', 'invoice') DEFAULT 'cash',
      payment_status ENUM('pending', 'paid', 'refunded') DEFAULT 'pending',
      invoice_number VARCHAR(50),
      sale_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL
    )`,

    // Settings table
    `CREATE TABLE IF NOT EXISTS settings (
      id INT PRIMARY KEY AUTO_INCREMENT,
      setting_key VARCHAR(100) UNIQUE NOT NULL,
      setting_value TEXT,
      setting_type ENUM('string', 'number', 'boolean', 'json', 'array') DEFAULT 'string',
      category VARCHAR(50),
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_key (setting_key),
      INDEX idx_category (category)
    )`,

    // Book progress tracking
    `CREATE TABLE IF NOT EXISTS book_progress (
      id INT PRIMARY KEY AUTO_INCREMENT,
      book_id INT,
      stage ENUM('manuscript_submission', 'initial_review', 'peer_review', 'revisions', 'copyediting', 'proofreading', 'design', 'printing', 'distribution', 'marketing') NOT NULL,
      status ENUM('not_started', 'in_progress', 'completed', 'delayed') DEFAULT 'not_started',
      assigned_to INT,
      start_date DATE,
      due_date DATE,
      completed_date DATE,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
      FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
    )`,

    // Reports table
    `CREATE TABLE IF NOT EXISTS reports (
      id INT PRIMARY KEY AUTO_INCREMENT,
      report_type ENUM('financial', 'sales', 'inventory', 'royalty', 'production', 'training', 'user') NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      period_start DATE,
      period_end DATE,
      generated_by INT,
      report_data JSON,
      file_url VARCHAR(255),
      status ENUM('generating', 'completed', 'failed') DEFAULT 'generating',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (generated_by) REFERENCES users(id) ON DELETE SET NULL
    )`,

    // Analytics table
    `CREATE TABLE IF NOT EXISTS analytics (
      id INT PRIMARY KEY AUTO_INCREMENT,
      metric_name VARCHAR(100) NOT NULL,
      metric_value DECIMAL(15,2),
      dimension_name VARCHAR(100),
      dimension_value VARCHAR(255),
      date DATE,
      source VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Events Management
    `CREATE TABLE IF NOT EXISTS events (
      id INT PRIMARY KEY AUTO_INCREMENT,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      type ENUM('book_launch', 'author_talk', 'workshop', 'seminar', 'conference', 'exhibition') NOT NULL,
      start_datetime DATETIME,
      end_datetime DATETIME,
      venue VARCHAR(255),
      online_link VARCHAR(255),
      organizer VARCHAR(255),
      max_attendees INT,
      current_attendees INT DEFAULT 0,
      registration_fee DECIMAL(10,2) DEFAULT 0,
      status ENUM('upcoming', 'ongoing', 'completed', 'cancelled') DEFAULT 'upcoming',
      featured_image VARCHAR(255),
      gallery JSON,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    // Announcements
    `CREATE TABLE IF NOT EXISTS announcements (
      id INT PRIMARY KEY AUTO_INCREMENT,
      title VARCHAR(255) NOT NULL,
      content TEXT NOT NULL,
      type ENUM('news', 'event', 'maintenance', 'alert', 'update') DEFAULT 'news',
      target_audience ENUM('all', 'authors', 'users', 'admins', 'staff') DEFAULT 'all',
      priority ENUM('low', 'medium', 'high') DEFAULT 'medium',
      start_date DATETIME,
      end_date DATETIME,
      status ENUM('active', 'inactive', 'expired') DEFAULT 'active',
      created_by INT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
    )`,

    // Activity Logs
    `CREATE TABLE IF NOT EXISTS activity_logs (
      id INT PRIMARY KEY AUTO_INCREMENT,
      user_id INT,
      action VARCHAR(100) NOT NULL,
      entity_type VARCHAR(50),
      entity_id INT,
      details JSON,
      ip_address VARCHAR(45),
      user_agent TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
    )`,
  ];

  try {
    for (const query of queries) {
      await dbQuery(query);
    }
    console.log("✓ Database tables created successfully");

    // Ensure books.publication_date exists for legacy databases
    const [[{ count: publicationDateCount }]] = await dbQuery(
      `SELECT COUNT(*) as count
         FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = ?
           AND TABLE_NAME = 'books'
           AND COLUMN_NAME = 'publication_date'`,
      [dbConfig.database],
    );

    if (publicationDateCount === 0) {
      await dbQuery("ALTER TABLE books ADD COLUMN publication_date DATE");
      console.log("✓ Added books.publication_date column");
    }

    // Backfill publication_date for already published books if missing
    await dbQuery(
      "UPDATE books SET publication_date = DATE(created_at) WHERE publication_date IS NULL AND status = 'published'",
    );

    // Create default admin user
    const [adminRows] = await dbQuery("SELECT id FROM users WHERE email = ?", [
      "admin@babcock.edu.ng",
    ]);

    if (adminRows.length === 0) {
      const hashedPassword = await bcrypt.hash("Admin@123", 10);
      await dbQuery(
        "INSERT INTO users (username, email, password, full_name, role, status, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [
          "admin",
          "admin@babcock.edu.ng",
          hashedPassword,
          "System Administrator",
          "admin",
          "active",
          true,
        ],
      );
      console.log("✓ Default admin user created");
    }

    // Insert default settings
    const defaultSettings = [
      [
        "site_name",
        "Babcock University Publishing Company",
        "string",
        "general",
        "Site Name",
      ],
      ["royalty_rate", "15", "number", "royalty", "Default royalty percentage"],
      [
        "contact_email",
        "publishing@babcock.edu.ng",
        "string",
        "contact",
        "Contact email",
      ],
      [
        "max_file_size",
        "10485760",
        "number",
        "uploads",
        "Maximum file size in bytes",
      ],
      ["currency", "NGN", "string", "general", "Default currency"],
      ["tax_rate", "7.5", "number", "sales", "Tax rate percentage"],
      [
        "default_contract_type",
        "standard",
        "string",
        "contracts",
        "Default contract type",
      ],
      ["training_fee", "5000", "number", "training", "Default training fee"],
      ["jwt_expiry", "24h", "string", "security", "JWT token expiry time"],
    ];

    for (const setting of defaultSettings) {
      const upsertSettingSql = isPostgres
        ? "INSERT INTO settings (setting_key, setting_value, setting_type, category, description) VALUES (?, ?, ?, ?, ?) ON CONFLICT (setting_key) DO NOTHING"
        : "INSERT IGNORE INTO settings (setting_key, setting_value, setting_type, category, description) VALUES (?, ?, ?, ?, ?)";
      await dbQuery(upsertSettingSql, setting);
    }
  } catch (error) {
    console.error("✗ Database initialization error:", error.message);
    console.error("Stack:", error.stack);
  }
};

// ============== MIDDLEWARE ==============
// ============== API ROUTES ==============

// System health check
app.get("/api/system/health", async (req, res) => {
  try {
    const [dbResult] = await dbQuery("SELECT 1 as connected");
    const dbConnected = dbResult[0].connected === 1;

    res.json({
      success: true,
      timestamp: new Date().toISOString(),
      status: "operational",
      components: {
        database: dbConnected ? "connected" : "disconnected",
        authentication: "ready",
        file_uploads: "ready",
        session: "active",
      },
      environment: process.env.NODE_ENV || "development",
      version: "2.0.0",
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      timestamp: new Date().toISOString(),
      status: "degraded",
      error: error.message,
      environment: process.env.NODE_ENV || "development",
    });
  }
});

// ============== AUTH ROUTES ==============

// User Registration
app.post("/api/users/register", async (req, res) => {
  try {
    const { username, email, password, full_name, phone } = req.body;

    // Validate input
    if (!username || !email || !password || !full_name) {
      return res.status(400).json({
        success: false,
        message: "Username, email, password, and full name are required",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
    }

    // Check password strength
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long",
      });
    }

    // Check if user already exists
    const [existing] = await dbQuery(
      "SELECT id FROM users WHERE email = ? OR username = ?",
      [email, username],
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "User with this email or username already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = jwt.sign({ email }, JWT_SECRET, {
      expiresIn: "24h",
    });

    const [result] = await dbQuery(
      `INSERT INTO users (username, email, password, full_name, phone, role, status, verification_token) 
       VALUES (?, ?, ?, ?, ?, 'user', 'pending', ?)`,
      [
        username,
        email,
        hashedPassword,
        full_name,
        phone || null,
        verificationToken,
      ],
    );

    const token = jwt.sign(
      {
        id: result.insertId,
        email,
        role: "user",
        full_name,
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.status(201).json({
      success: true,
      message: "User registered successfully. Please verify your email.",
      token,
      user: {
        id: result.insertId,
        username,
        email,
        full_name,
        phone: phone || null,
        role: "user",
        status: "pending",
      },
    });
  } catch (error) {
    console.error("User registration error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to register user. Please try again later.",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// User Login - FIXED VERSION
app.post("/api/users/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user by email
    const [users] = await dbQuery("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = users[0];

    // Verify password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if account is active
    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Account is not active. Please contact administrator.",
      });
    }

    // Update last login
    await dbQuery(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
      [user.id],
    );

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        profile_image: user.profile_image,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("User login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during login",
    });
  }
});

// Author Login - FIXED VERSION
app.post("/api/authors/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    // Find user
    const [users] = await dbQuery("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    // Check if user is an author or admin
    if (!["author", "admin", "editor"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Author account required.",
      });
    }

    // Check if account is active
    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Account is pending approval or inactive",
      });
    }

    // Get author profile
    const [authors] = await dbQuery(
      "SELECT id, staff_id, faculty, department, qualifications, biography FROM authors WHERE user_id = ?",
      [user.id],
    );

    const author = authors.length > 0 ? authors[0] : null;

    // Update last login
    await dbQuery(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
      [user.id],
    );

    // Generate token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
        full_name: user.full_name,
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        status: user.status,
        authorProfile: author,
      },
    });
  } catch (error) {
    console.error("Author login error:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error during login",
    });
  }
});

// Admin Login - FIXED VERSION
app.post("/api/admin/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required",
      });
    }

    const [admins] = await dbQuery(
      "SELECT * FROM users WHERE email = ? AND role IN ('admin', 'editor', 'reviewer')",
      [email],
    );

    if (admins.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const admin = admins[0];

    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (admin.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Account is not active",
      });
    }

    // Update last login
    await dbQuery(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
      [admin.id],
    );

    const token = jwt.sign(
      {
        id: admin.id,
        email: admin.email,
        role: admin.role,
        full_name: admin.full_name,
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({
      success: true,
      message: "Admin login successful",
      token,
      user: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        full_name: admin.full_name,
        role: admin.role,
        status: admin.status,
      },
    });
  } catch (error) {
    console.error("Admin login error:", error);
    res.status(500).json({
      success: false,
      message: "Login failed. Please try again later.",
    });
  }
});

// Verify Token
app.get("/api/auth/verify", authMiddleware, (req, res) => {
  res.json({
    success: true,
    user: req.user,
    valid: true,
    expiresIn: req.user.exp ? req.user.exp - Math.floor(Date.now() / 1000) : 0,
  });
});

// Logout
app.post("/api/auth/logout", authMiddleware, (req, res) => {
  res.json({
    success: true,
    message: "Logged out successfully",
  });
});

// ============== ADMIN HEALTH CHECK ==============

// Admin health check - verify admin access
app.get("/api/admin/health", authMiddleware, async (req, res) => {
  try {
    // Verify user is admin
    if (!["admin", "editor", "reviewer"].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    res.json({
      success: true,
      message: "Admin panel is accessible",
      user: req.user,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Admin health check error:", error);
    res.status(500).json({
      success: false,
      message: "Admin health check failed",
    });
  }
});

// ============== ADMIN USERS MANAGEMENT ==============

// Get all admin users
app.get("/api/admin/users", authMiddleware, async (req, res) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query =
      "SELECT id, username, email, full_name, role, status, last_login, created_at FROM users WHERE 1=1";
    let countQuery = "SELECT COUNT(*) as total FROM users WHERE 1=1";
    const params = [];
    const countParams = [];

    if (role) {
      query += " AND role = ?";
      countQuery += " AND role = ?";
      params.push(role);
      countParams.push(role);
    }

    if (status) {
      query += " AND status = ?";
      countQuery += " AND status = ?";
      params.push(status);
      countParams.push(status);
    }

    if (search) {
      query += " AND (username LIKE ? OR email LIKE ? OR full_name LIKE ?)";
      countQuery +=
        " AND (username LIKE ? OR email LIKE ? OR full_name LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [users] = await dbQuery(query, params);
    const [[{ total }]] = await dbQuery(countQuery, countParams);

    res.json({
      success: true,
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get admin users error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load users",
    });
  }
});

// Create new admin user
app.post("/api/admin/users", authMiddleware, async (req, res) => {
  try {
    const { username, email, password, full_name, role, status } = req.body;

    if (!username || !email || !password || !full_name || !role) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
      });
    }

    // Check if user already exists
    const [existing] = await dbQuery(
      "SELECT id FROM users WHERE email = ? OR username = ?",
      [email, username],
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "User with this email or username already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await dbQuery(
      "INSERT INTO users (username, email, password, full_name, role, status, email_verified) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        username,
        email,
        hashedPassword,
        full_name,
        role,
        status || "active",
        true,
      ],
    );

    res.json({
      success: true,
      message: "User created successfully",
      userId: result.insertId,
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create user",
    });
  }
});

// Update user
app.put("/api/admin/users/:id", authMiddleware, async (req, res) => {
  try {
    const { username, email, full_name, role, status } = req.body;
    const userId = req.params.id;

    const [result] = await dbQuery(
      "UPDATE users SET username = ?, email = ?, full_name = ?, role = ?, status = ? WHERE id = ?",
      [username, email, full_name, role, status, userId],
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update user",
    });
  }
});

// Delete user
app.delete("/api/admin/users/:id", authMiddleware, async (req, res) => {
  try {
    const [result] = await dbQuery("DELETE FROM users WHERE id = ?", [
      req.params.id,
    ]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      message: "User deleted successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete user",
    });
  }
});

// ============== HOMEPAGE API ROUTES ==============

// Get published books for homepage
app.get("/api/books/published", async (req, res) => {
  try {
    const [books] = await dbQuery(`
            SELECT b.*, u.full_name as author_name 
            FROM books b 
            LEFT JOIN authors a ON b.author_id = a.id 
            LEFT JOIN users u ON a.user_id = u.id 
            WHERE b.status = 'published' 
            ORDER BY COALESCE(b.publication_date, DATE(b.created_at)) DESC 
            LIMIT 20
        `);

    res.json({
      success: true,
      books,
      count: books.length,
    });
  } catch (error) {
    console.error("Get published books error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load published books",
    });
  }
});

// Get authors count
app.get("/api/authors/count", async (req, res) => {
  try {
    const [[{ count }]] = await dbQuery(
      "SELECT COUNT(*) as count FROM authors a JOIN users u ON a.user_id = u.id WHERE u.status = 'active'",
    );

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Get authors count error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load authors count",
    });
  }
});

// Get training registrations count
app.get("/api/training/count", async (req, res) => {
  try {
    const [[{ count }]] = await dbQuery(
      "SELECT COUNT(*) as count FROM training_registrations WHERE status = 'completed'",
    );

    res.json({
      success: true,
      count,
    });
  } catch (error) {
    console.error("Get training count error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load training count",
    });
  }
});

// Author registration (public endpoint)
app.post(
  "/api/authors/register",
  upload.single("profile_image"),
  async (req, res) => {
    try {
      await ensureAuthorProfileColumns();

      const {
        full_name,
        email,
        phone,
        faculty,
        department,
        staff_id,
        password,
        qualifications,
        biography,
        areas_of_expertise,
        orcid_id,
        google_scholar_id,
        linkedin_url,
      } = req.body;

      if (
        !full_name ||
        !email ||
        !staff_id ||
        !password ||
        !faculty ||
        !department
      ) {
        return res.status(400).json({
          success: false,
          message: "Missing required fields for author registration",
        });
      }

      const profileImagePath = getUploadPath(req.file);

      const [existingUsers] = await dbQuery(
        "SELECT id FROM users WHERE email = ?",
        [email],
      );

      if (existingUsers.length > 0) {
        return res.status(400).json({
          success: false,
          message: "User with this email already exists",
        });
      }

      const [existingStaffId] = await dbQuery(
        "SELECT id FROM authors WHERE staff_id = ?",
        [staff_id],
      );

      if (existingStaffId.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Author with this staff ID already exists",
        });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const userColumns = await getTableColumns("users");
      const authorColumns = await getTableColumns("authors");

      const userPayload = {
        username: email,
        email,
        password: hashedPassword,
        full_name,
        role: "author",
        status: "pending",
        phone: toNullable(phone),
        profile_image: profileImagePath,
      };

      const userInsertColumns = [];
      const userInsertValues = [];
      const userInsertPlaceholders = [];
      for (const [key, value] of Object.entries(userPayload)) {
        if (userColumns.has(key)) {
          userInsertColumns.push(key);
          userInsertValues.push(value);
          userInsertPlaceholders.push("?");
        }
      }

      const [userResult] = await dbQuery(
        `INSERT INTO users (${userInsertColumns.join(", ")}) VALUES (${userInsertPlaceholders.join(", ")})`,
        userInsertValues,
      );

      const authorPayload = {
        user_id: userResult.insertId,
        staff_id: toNullable(staff_id),
        faculty: toNullable(faculty),
        department: toNullable(department),
        qualifications: toNullable(qualifications),
        biography: toNullable(biography),
        areas_of_expertise: toNullable(areas_of_expertise),
        orcid_id: toNullable(orcid_id),
        google_scholar_id: toNullable(google_scholar_id),
        linkedin_url: toNullable(linkedin_url),
        status: "pending",
      };

      const authorInsertColumns = [];
      const authorInsertValues = [];
      const authorInsertPlaceholders = [];
      for (const [key, value] of Object.entries(authorPayload)) {
        if (authorColumns.has(key)) {
          authorInsertColumns.push(key);
          authorInsertValues.push(value);
          authorInsertPlaceholders.push("?");
        }
      }

      const [authorResult] = await dbQuery(
        `INSERT INTO authors (${authorInsertColumns.join(", ")}) VALUES (${authorInsertPlaceholders.join(", ")})`,
        authorInsertValues,
      );

      res.json({
        success: true,
        message:
          "Author registered successfully. Please wait for admin approval.",
        userId: userResult.insertId,
        authorId: authorResult.insertId,
      });
    } catch (error) {
      console.error("Author registration error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to register author",
      });
    }
  },
);

// Author login (public endpoint)
app.post("/api/authors/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // First authenticate against users table
    const [users] = await dbQuery(
      "SELECT id, full_name, email, role, password, status FROM users WHERE email = ?",
      [email],
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const user = users[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your account is pending approval. Please contact the admin.",
      });
    }

    // Get author profile
    const [authors] = await dbQuery(
      "SELECT id, staff_id, faculty, department FROM authors WHERE user_id = ?",
      [user.id],
    );

    const author = authors.length > 0 ? authors[0] : null;

    // Update last login
    await dbQuery(
      "UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?",
      [user.id],
    );

    // Generate JWT token
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    );

    res.json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user.id,
        full_name: user.full_name,
        email: user.email,
        role: user.role,
        status: user.status,
        authorProfile: author,
      },
    });
  } catch (error) {
    console.error("Author login error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to login",
    });
  }
});

// Training registration (public endpoint)
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

    const [result] = await dbQuery(
      `INSERT INTO training_registrations 
            (full_name, email, student_id, faculty, department, level, training_type, preferred_date, status) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
      [
        full_name,
        email,
        student_id,
        faculty,
        department,
        level,
        training_type,
        preferred_date || null,
      ],
    );

    res.json({
      success: true,
      message: "Training registration submitted successfully",
      registrationId: result.insertId,
    });
  } catch (error) {
    console.error("Training registration error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to register for training",
    });
  }
});

// Contact form submission
app.post("/api/contact", async (req, res) => {
  try {
    const {
      name,
      email,
      subject,
      message,
      category = "general",
      phone,
    } = req.body;

    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Required fields are missing",
      });
    }

    const [result] = await dbQuery(
      `INSERT INTO contacts 
            (name, email, phone, subject, message, category, status) 
            VALUES (?, ?, ?, ?, ?, ?, 'new')`,
      [name, email, phone || null, subject, message, category],
    );

    // Send email notifications only when SMTP is configured.
    if (isEmailConfigured) {
      const adminRecipient = process.env.ADMIN_EMAIL || emailConfig.sender;

      if (adminRecipient) {
        void sendEmail({
          to: adminRecipient,
          subject: `New contact message: ${subject}`,
          text: `Name: ${name}\nEmail: ${email}\nPhone: ${phone || "N/A"}\nCategory: ${category}\n\nMessage:\n${message}`,
        });
      }

      void sendEmail({
        to: email,
        subject: "We received your message",
        text: `Hello ${name},\n\nYour message has been received. Our team will respond shortly.\n\nSubject: ${subject}\n\nRegards,\nBabcock Publishing`,
      });
    }

    res.json({
      success: true,
      message: "Message sent successfully. We will respond shortly.",
      contactId: result.insertId,
    });
  } catch (error) {
    console.error("Contact form error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to send message",
    });
  }
});

// ============== ABOUT US PAGE ROUTES ==============

// Get about us information
app.get("/api/about", async (req, res) => {
  try {
    // Get statistics
    const [[booksCount], [authorsCount], [trainingCount], [countriesReached]] =
      await Promise.all([
        dbQuery(
          "SELECT COUNT(*) as count FROM books WHERE status = 'published'",
        ),
        dbQuery(
          "SELECT COUNT(*) as count FROM authors a JOIN users u ON a.user_id = u.id WHERE u.status = 'active'",
        ),
        dbQuery(
          "SELECT COUNT(*) as count FROM training_registrations WHERE status = 'completed'",
        ),
        dbQuery("SELECT '25' as count"),
      ]);

    // Get leadership team
    const [team] = await dbQuery(`
      SELECT u.full_name, a.faculty, a.department, a.qualifications
      FROM users u
      LEFT JOIN authors a ON u.id = a.user_id
      WHERE u.role IN ('admin', 'editor') AND u.status = 'active'
      LIMIT 5
    `);

    res.json({
      success: true,
      data: {
        mission:
          "To advance scholarly communication by providing innovative publishing solutions that empower researchers, educators, and students to share their work with the global academic community while maintaining the highest standards of quality and integrity.",
        vision:
          "To become the leading academic publishing platform in Africa, recognized globally for excellence in scholarly communication, innovation in publishing technology, and commitment to advancing knowledge.",
        history:
          "Founded in 2009 as part of Babcock University's commitment to scholarly excellence, our publishing company began with a simple mission: to provide African scholars with a platform to share their research with the world. Over the past 15+ years, we have grown from publishing a handful of local textbooks to becoming a comprehensive academic publishing house that serves scholars across Africa and beyond.",
        values: [
          {
            title: "Academic Excellence",
            description:
              "We maintain the highest standards of scholarly rigor and quality in all our publications.",
          },
          {
            title: "Integrity",
            description:
              "We uphold ethical publishing practices and transparency in all our operations.",
          },
          {
            title: "Innovation",
            description:
              "We embrace new technologies and approaches to enhance scholarly communication.",
          },
          {
            title: "Global Reach",
            description:
              "We connect African scholars with international academic communities.",
          },
        ],
        stats: {
          booksPublished: booksCount.count || 0,
          authorsPublished: authorsCount.count || 0,
          studentsTrained: trainingCount.count || 0,
          countriesReached: countriesReached.count || 25,
        },
        team: team || [],
      },
    });
  } catch (error) {
    console.error("Get about info error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load about information",
    });
  }
});

// ============== DASHBOARD ROUTES ==============

// Get comprehensive dashboard statistics
app.get("/api/admin/dashboard/stats", authMiddleware, async (req, res) => {
  try {
    // Get multiple stats in parallel
    const [
      [pendingAuthors],
      [approvedAuthors],
      [totalBooks],
      [publishedBooks],
      [pendingSubmissions],
      [pendingTraining],
      [newContacts],
      [pendingContracts],
      [totalSales],
      [monthlyRevenue],
      [lowInventory],
    ] = await Promise.all([
      dbQuery(
        "SELECT COUNT(*) as count FROM authors a JOIN users u ON a.user_id = u.id WHERE u.status = 'pending'",
      ),
      dbQuery(
        "SELECT COUNT(*) as count FROM authors a JOIN users u ON a.user_id = u.id WHERE u.status = 'active'",
      ),
      dbQuery("SELECT COUNT(*) as count FROM books"),
      dbQuery("SELECT COUNT(*) as count FROM books WHERE status = 'published'"),
      dbQuery(
        "SELECT COUNT(*) as count FROM submissions WHERE status = 'pending'",
      ),
      dbQuery(
        "SELECT COUNT(*) as count FROM training_registrations WHERE status = 'pending'",
      ),
      dbQuery("SELECT COUNT(*) as count FROM contacts WHERE status = 'new'"),
      dbQuery(
        "SELECT COUNT(*) as count FROM contracts WHERE status = 'draft' OR status = 'sent'",
      ),
      dbQuery(
        "SELECT SUM(total_amount) as total FROM sales WHERE payment_status = 'paid' AND sale_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)",
      ),
      dbQuery(
        "SELECT SUM(total_amount) as revenue FROM sales WHERE payment_status = 'paid' AND MONTH(sale_date) = MONTH(CURDATE())",
      ),
      dbQuery(
        "SELECT COUNT(*) as count FROM inventory WHERE available <= reorder_level",
      ),
    ]);

    // Get recent activities
    const [recentBooks] = await dbQuery(
      "SELECT b.id, b.title, b.status, u.full_name as author, b.created_at FROM books b LEFT JOIN authors a ON b.author_id = a.id LEFT JOIN users u ON a.user_id = u.id ORDER BY b.created_at DESC LIMIT 5",
    );

    const [recentSubmissions] = await dbQuery(
      "SELECT s.id, b.title, s.submission_type, s.status, s.submission_date FROM submissions s JOIN books b ON s.book_id = b.id ORDER BY s.submission_date DESC LIMIT 5",
    );

    // Get monthly sales data for chart
    const [monthlySales] = await dbQuery(`
      SELECT 
        DATE_FORMAT(sale_date, '%Y-%m') as month,
        SUM(total_amount) as revenue,
        COUNT(*) as transactions
      FROM sales 
      WHERE sale_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(sale_date, '%Y-%m')
      ORDER BY month DESC
      LIMIT 6
    `);

    // Get book categories distribution
    const [categoryDistribution] = await dbQuery(`
      SELECT 
        category,
        COUNT(*) as count,
        ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM books), 1) as percentage
      FROM books 
      WHERE category IS NOT NULL 
      GROUP BY category 
      ORDER BY count DESC
      LIMIT 8
    `);

    res.json({
      success: true,
      stats: {
        authors: {
          pending: pendingAuthors[0].count,
          approved: approvedAuthors[0].count,
          total: pendingAuthors[0].count + approvedAuthors[0].count,
        },
        books: {
          total: totalBooks[0].count,
          published: publishedBooks[0].count,
          in_progress: totalBooks[0].count - publishedBooks[0].count,
        },
        submissions: {
          pending: pendingSubmissions[0].count,
        },
        training: {
          pending: pendingTraining[0].count,
        },
        contacts: {
          new: newContacts[0].count,
        },
        contracts: {
          pending: pendingContracts[0].count,
        },
        sales: {
          total_last_30_days: totalSales[0].total || 0,
          monthly_revenue: monthlyRevenue[0].revenue || 0,
        },
        inventory: {
          low_stock: lowInventory[0].count,
        },
      },
      recent: {
        books: recentBooks,
        submissions: recentSubmissions,
      },
      charts: {
        monthly_sales: monthlySales,
        categories: categoryDistribution,
      },
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load dashboard statistics",
    });
  }
});

// ============== AUTHORS MANAGEMENT ==============

// Get all authors with filters
app.get("/api/admin/authors", authMiddleware, async (req, res) => {
  try {
    const { status, faculty, search, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT a.*, u.username, u.email, u.full_name, u.status as user_status, u.created_at
      FROM authors a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    let countQuery = `
      SELECT COUNT(*) as total FROM authors a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;
    const params = [];
    const countParams = [];

    if (status) {
      query += " AND u.status = ?";
      countQuery += " AND u.status = ?";
      params.push(status);
      countParams.push(status);
    }

    if (faculty) {
      query += " AND a.faculty = ?";
      countQuery += " AND a.faculty = ?";
      params.push(faculty);
      countParams.push(faculty);
    }

    if (search) {
      query +=
        " AND (u.full_name LIKE ? OR u.email LIKE ? OR a.staff_id LIKE ?)";
      countQuery +=
        " AND (u.full_name LIKE ? OR u.email LIKE ? OR a.staff_id LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    query += " ORDER BY u.created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [authors] = await dbQuery(query, params);
    const [[{ total }]] = await dbQuery(countQuery, countParams);

    // Get book counts for each author
    for (const author of authors) {
      const [[{ bookCount }]] = await dbQuery(
        "SELECT COUNT(*) as bookCount FROM books WHERE author_id = ?",
        [author.id],
      );
      author.bookCount = bookCount;
    }

    res.json({
      success: true,
      authors,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get authors error:", error);
    res.status(500).json({ success: false, message: "Failed to load authors" });
  }
});

// Get single author with details
app.get("/api/admin/authors/:id", authMiddleware, async (req, res) => {
  try {
    await ensureAuthorProfileColumns();

    const [authors] = await dbQuery(
      `SELECT a.*, u.id as user_id, u.username, u.email, u.full_name, u.phone, u.profile_image, u.status as user_status, u.created_at
         FROM authors a
         LEFT JOIN users u ON a.user_id = u.id
         WHERE a.id = ?`,
      [req.params.id],
    );

    if (authors.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Author not found" });
    }

    const author = authors[0];

    // Get author's books
    const [books] = await dbQuery(
      "SELECT id, title, status, created_at FROM books WHERE author_id = ? ORDER BY created_at DESC",
      [author.id],
    );

    // Get author's submissions
    const [submissions] = await dbQuery(
      `
      SELECT s.*, b.title 
      FROM submissions s 
      JOIN books b ON s.book_id = b.id 
      WHERE b.author_id = ? 
      ORDER BY s.submission_date DESC
    `,
      [author.id],
    );

    // Get author's contracts
    const [contracts] = await dbQuery(
      "SELECT * FROM contracts WHERE author_id = ? ORDER BY created_at DESC",
      [author.id],
    );

    res.json({
      success: true,
      author: {
        ...author,
        books,
        submissions,
        contracts,
      },
    });
  } catch (error) {
    console.error("Get author error:", error);
    res.status(500).json({ success: false, message: "Failed to load author" });
  }
});

// Update author status
app.put("/api/admin/authors/:id/status", authMiddleware, async (req, res) => {
  try {
    await ensureAuthorProfileColumns();

    const { status, notes } = req.body;

    if (!["pending", "approved", "rejected", "suspended"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    const [authors] = await dbQuery(
      "SELECT id, user_id FROM authors WHERE id = ?",
      [req.params.id],
    );

    if (authors.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Author not found" });
    }

    const author = authors[0];
    const userStatusMap = {
      pending: "pending",
      approved: "active",
      rejected: "inactive",
      suspended: "suspended",
    };
    const userStatus = userStatusMap[status] || "pending";

    // Some existing databases may not have authors.status yet.
    // Approval should still work by updating the linked users.status.
    let result = { affectedRows: 0 };
    try {
      const [authorUpdate] = await dbQuery(
        "UPDATE authors SET status = ? WHERE id = ?",
        [status, req.params.id],
      );
      result = authorUpdate;
    } catch (error) {
      if (error.code !== "ER_BAD_FIELD_ERROR") {
        throw error;
      }
    }

    const [userResult] = await dbQuery(
      "UPDATE users SET status = ? WHERE id = ?",
      [userStatus, author.user_id],
    );

    if (userResult.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Linked user account not found",
      });
    }

    if (result.affectedRows === 0) {
      // Author record exists (queried above); this branch mostly indicates
      // authors.status column is missing, which is tolerated.
    }

    res.json({
      success: true,
      message: `Author ${status} successfully`,
    });
  } catch (error) {
    console.error("Update author status error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update author status" });
  }
});

// ============== BOOKS MANAGEMENT ==============

// Get all books with filters
app.get("/api/admin/books", authMiddleware, async (req, res) => {
  try {
    const {
      status,
      category,
      author_id,
      search,
      year,
      format,
      page = 1,
      limit = 20,
    } = req.query;

    const offset = (page - 1) * limit;

    let query = `
      SELECT b.*, u.full_name as author_name, u.email as author_email
      FROM books b
      LEFT JOIN authors a ON b.author_id = a.id
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;

    let countQuery = `
      SELECT COUNT(*) as total 
      FROM books b
      LEFT JOIN authors a ON b.author_id = a.id
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;

    const params = [];
    const countParams = [];

    if (status) {
      query += " AND b.status = ?";
      countQuery += " AND b.status = ?";
      params.push(status);
      countParams.push(status);
    }

    if (category) {
      query += " AND b.category = ?";
      countQuery += " AND b.category = ?";
      params.push(category);
      countParams.push(category);
    }

    if (author_id) {
      query += " AND b.user_id = ?";
      countQuery += " AND b.user_id = ?";
      params.push(author_id);
      countParams.push(author_id);
    }

    if (format) {
      query += " AND b.format = ?";
      countQuery += " AND b.format = ?";
      params.push(format);
      countParams.push(format);
    }

    if (year) {
      query += " AND YEAR(b.created_at) = ?";
      countQuery += " AND YEAR(b.created_at) = ?";
      params.push(year);
      countParams.push(year);
    }

    if (search) {
      query += " AND (b.title LIKE ? OR b.isbn LIKE ? OR a.full_name LIKE ?)";
      countQuery +=
        " AND (b.title LIKE ? OR b.isbn LIKE ? OR a.full_name LIKE ?)";
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }

    query += " ORDER BY b.created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [books] = await dbQuery(query, params);
    const [[{ total }]] = await dbQuery(countQuery, countParams);

    // Get additional data for each book
    for (const book of books) {
      // Get inventory
      const [inventory] = await dbQuery(
        "SELECT format, quantity, available FROM inventory WHERE book_id = ?",
        [book.id],
      );
      book.inventory = inventory;

      // Get sales count
      const [[{ salesCount }]] = await dbQuery(
        "SELECT COUNT(*) as salesCount FROM sales WHERE book_id = ?",
        [book.id],
      );
      book.salesCount = salesCount || 0;
    }

    res.json({
      success: true,
      books,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get books error:", error);
    res.status(500).json({ success: false, message: "Failed to load books" });
  }
});

// Get single book with details
app.get("/api/admin/books/:id", authMiddleware, async (req, res) => {
  try {
    const [books] = await dbQuery(
      `SELECT b.*, a.full_name as author_name, a.email as author_email, 
              a.faculty as author_faculty, a.department as author_department
       FROM books b
       LEFT JOIN authors a ON b.author_id = a.id
       WHERE b.id = ?`,
      [req.params.id],
    );

    if (books.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Book not found" });
    }

    const book = books[0];

    // Get submissions for this book
    const [submissions] = await dbQuery(
      "SELECT * FROM submissions WHERE book_id = ? ORDER BY submission_date DESC",
      [book.id],
    );

    // Get contracts for this book
    const [contracts] = await dbQuery(
      "SELECT * FROM contracts WHERE book_id = ? ORDER BY created_at DESC",
      [book.id],
    );

    // Get production status
    const [production] = await dbQuery(
      "SELECT * FROM production WHERE book_id = ? ORDER BY created_at DESC",
      [book.id],
    );

    // Get reviews for this book
    const [reviews] = await dbQuery(
      `
      SELECT r.*, a.full_name as reviewer_name
      FROM reviews r
      LEFT JOIN authors a ON r.reviewer_id = a.id
      WHERE r.submission_id IN (SELECT id FROM submissions WHERE book_id = ?)
      ORDER BY r.completed_date DESC
    `,
      [book.id],
    );

    // Get inventory
    const [inventory] = await dbQuery(
      "SELECT * FROM inventory WHERE book_id = ?",
      [book.id],
    );

    // Get sales history
    const [sales] = await dbQuery(
      "SELECT * FROM sales WHERE book_id = ? ORDER BY sale_date DESC LIMIT 50",
      [book.id],
    );

    res.json({
      success: true,
      book: {
        ...book,
        submissions,
        contracts,
        production,
        reviews,
        inventory,
        sales,
      },
    });
  } catch (error) {
    console.error("Get book error:", error);
    res.status(500).json({ success: false, message: "Failed to load book" });
  }
});

// Update book status
app.put("/api/admin/books/:id/status", authMiddleware, async (req, res) => {
  try {
    const { status, notes } = req.body;

    const validStatuses = [
      "draft",
      "submitted",
      "under_review",
      "revisions_requested",
      "accepted",
      "in_production",
      "published",
      "rejected",
      "archived",
    ];

    if (!validStatuses.includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    const [result] = await dbQuery(
      "UPDATE books SET status = ?, editor_notes = COALESCE(?, editor_notes) WHERE id = ?",
      [status, notes, req.params.id],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Book not found" });
    }

    res.json({
      success: true,
      message: `Book status updated to ${status}`,
    });
  } catch (error) {
    console.error("Update book status error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update book status" });
  }
});

// Upload book cover
app.post(
  "/api/admin/books/:id/cover",
  upload.single("cover"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, message: "No file uploaded" });
      }

      const coverPath = `/uploads/${req.file.filename}`;

      const [result] = await dbQuery(
        "UPDATE books SET cover_image = ? WHERE id = ?",
        [coverPath, req.params.id],
      );

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Book not found" });
      }

      res.json({
        success: true,
        message: "Cover uploaded successfully",
        cover_url: coverPath,
      });
    } catch (error) {
      console.error("Upload cover error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to upload cover" });
    }
  },
);

// Generic file upload endpoint
app.post(
  "/api/admin/upload",
  authMiddleware,
  upload.single("file"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
        });
      }

      const fileUrl = `/uploads/${req.file.filename}`;

      res.json({
        success: true,
        message: "File uploaded successfully",
        fileUrl,
        fileName: req.file.originalname,
        fileSize: req.file.size,
      });
    } catch (error) {
      console.error("File upload error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to upload file",
      });
    }
  },
);

// ============== SUBMISSIONS MANAGEMENT ==============

// Get all submissions
app.get("/api/admin/submissions", authMiddleware, async (req, res) => {
  try {
    const { status, type, priority, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT s.*, b.title as book_title, u.full_name as author_name,
             DATE(s.due_date) as due_date_formatted,
             DATEDIFF(s.due_date, CURDATE()) as days_remaining
      FROM submissions s
      JOIN books b ON s.book_id = b.id
      LEFT JOIN authors a ON b.author_id = a.id
      LEFT JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;

    let countQuery = `
      SELECT COUNT(*) as total 
      FROM submissions s
      JOIN books b ON s.book_id = b.id
      WHERE 1=1
    `;

    const params = [];
    const countParams = [];

    if (status) {
      query += " AND s.status = ?";
      countQuery += " AND s.status = ?";
      params.push(status);
      countParams.push(status);
    }

    if (type) {
      query += " AND s.submission_type = ?";
      countQuery += " AND s.submission_type = ?";
      params.push(type);
      countParams.push(type);
    }

    if (priority) {
      query += " AND s.priority = ?";
      countQuery += " AND s.priority = ?";
      params.push(priority);
      countParams.push(priority);
    }

    query += " ORDER BY s.priority DESC, s.due_date ASC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [submissions] = await dbQuery(query, params);
    const [[{ total }]] = await dbQuery(countQuery, countParams);

    res.json({
      success: true,
      submissions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get submissions error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to load submissions" });
  }
});

// Assign submission to reviewer
app.post(
  "/api/admin/submissions/:id/assign",
  authMiddleware,
  async (req, res) => {
    try {
      const { reviewer_id, due_date, priority } = req.body;

      const [result] = await dbQuery(
        "UPDATE submissions SET assigned_to = ?, due_date = ?, priority = ?, status = 'assigned' WHERE id = ?",
        [reviewer_id, due_date, priority, req.params.id],
      );

      if (result.affectedRows === 0) {
        return res
          .status(404)
          .json({ success: false, message: "Submission not found" });
      }

      res.json({
        success: true,
        message: "Submission assigned successfully",
      });
    } catch (error) {
      console.error("Assign submission error:", error);
      res
        .status(500)
        .json({ success: false, message: "Failed to assign submission" });
    }
  },
);

// ============== CONTRACTS MANAGEMENT ==============

// Get all contracts
app.get("/api/admin/contracts", authMiddleware, async (req, res) => {
  try {
    const { status, type, author_id, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT c.*, b.title as book_title, a.full_name as author_name,
             a.email as author_email, a.phone as author_phone
      FROM contracts c
      JOIN books b ON c.book_id = b.id
      JOIN authors a ON c.author_id = a.id
      WHERE 1=1
    `;

    const params = [];

    if (status) {
      query += " AND c.status = ?";
      params.push(status);
    }

    if (type) {
      query += " AND c.contract_type = ?";
      params.push(type);
    }

    if (author_id) {
      query += " AND c.author_id = ?";
      params.push(author_id);
    }

    query += " ORDER BY c.created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [contracts] = await dbQuery(query, params);

    res.json({
      success: true,
      contracts,
    });
  } catch (error) {
    console.error("Get contracts error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to load contracts" });
  }
});

// Generate new contract
app.post("/api/admin/contracts", authMiddleware, async (req, res) => {
  try {
    const {
      book_id,
      author_id,
      contract_type,
      royalty_percentage,
      advance_amount,
      start_date,
      end_date,
      rights_granted,
      territory,
      payment_schedule,
    } = req.body;

    // Generate contract number
    const contractNumber = `CONTRACT-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const [result] = await dbQuery(
      `INSERT INTO contracts (
        book_id, author_id, contract_type, contract_number,
        royalty_percentage, advance_amount, start_date, end_date,
        rights_granted, territory, payment_schedule
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        book_id,
        author_id,
        contract_type,
        contractNumber,
        royalty_percentage,
        advance_amount,
        start_date,
        end_date,
        rights_granted,
        territory,
        payment_schedule,
      ],
    );

    res.json({
      success: true,
      message: "Contract created successfully",
      contract_id: result.insertId,
      contract_number: contractNumber,
    });
  } catch (error) {
    console.error("Create contract error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to create contract" });
  }
});

// ============== TRAINING MANAGEMENT ==============

// Get all training registrations
app.get("/api/admin/training", authMiddleware, async (req, res) => {
  try {
    const { status, type, mode, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let query = "SELECT * FROM training_registrations WHERE 1=1";
    const params = [];

    if (status) {
      query += " AND status = ?";
      params.push(status);
    }

    if (type) {
      query += " AND training_type = ?";
      params.push(type);
    }

    if (mode) {
      query += " AND training_mode = ?";
      params.push(mode);
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [registrations] = await dbQuery(query, params);

    res.json({
      success: true,
      registrations,
    });
  } catch (error) {
    console.error("Get training error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load training registrations",
    });
  }
});

// Update training status
app.put("/api/admin/training/:id", authMiddleware, async (req, res) => {
  try {
    const { status, attendance, certificate_issued, feedback } = req.body;

    const [result] = await dbQuery(
      `UPDATE training_registrations 
       SET status = ?, attendance = ?, certificate_issued = ?, feedback = ?,
           updated_at = CURRENT_TIMESTAMP 
       WHERE id = ?`,
      [status, attendance, certificate_issued, feedback, req.params.id],
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Registration not found" });
    }

    res.json({
      success: true,
      message: "Training registration updated successfully",
    });
  } catch (error) {
    console.error("Update training error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update training" });
  }
});

// ============== SALES & INVENTORY ==============

// Get sales report
app.get("/api/admin/sales", authMiddleware, async (req, res) => {
  try {
    const {
      start_date,
      end_date,
      format,
      customer_type,
      page = 1,
      limit = 50,
    } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT s.*, b.title as book_title,
             FORMAT(s.total_amount, 2) as formatted_amount
      FROM sales s
      JOIN books b ON s.book_id = b.id
      WHERE 1=1
    `;

    const params = [];

    if (start_date) {
      query += " AND DATE(s.sale_date) >= ?";
      params.push(start_date);
    }

    if (end_date) {
      query += " AND DATE(s.sale_date) <= ?";
      params.push(end_date);
    }

    if (format) {
      query += " AND s.format = ?";
      params.push(format);
    }

    if (customer_type) {
      query += " AND s.customer_type = ?";
      params.push(customer_type);
    }

    query += " ORDER BY s.sale_date DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [sales] = await dbQuery(query, params);

    // Get summary
    const [[summary]] = await dbQuery(
      `
      SELECT 
        COUNT(*) as total_transactions,
        SUM(total_amount) as total_revenue,
        SUM(quantity) as total_units
      FROM sales
      WHERE 1=1
      ${start_date ? "AND DATE(sale_date) >= ?" : ""}
      ${end_date ? "AND DATE(sale_date) <= ?" : ""}
    `,
      [start_date, end_date].filter(Boolean),
    );

    res.json({
      success: true,
      sales,
      summary: {
        total_transactions: summary.total_transactions || 0,
        total_revenue: summary.total_revenue || 0,
        total_units: summary.total_units || 0,
      },
    });
  } catch (error) {
    console.error("Get sales error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to load sales data" });
  }
});

// Get inventory status
app.get("/api/admin/inventory", authMiddleware, async (req, res) => {
  try {
    const { low_stock, category, format } = req.query;

    let query = `
      SELECT i.*, b.title, b.category, b.isbn,
             a.full_name as author_name,
             CASE 
               WHEN i.available <= i.reorder_level THEN 'low'
               WHEN i.available <= i.reorder_level * 2 THEN 'medium'
               ELSE 'good'
             END as stock_status
      FROM inventory i
      JOIN books b ON i.book_id = b.id
      LEFT JOIN authors a ON b.author_id = a.id
      WHERE 1=1
    `;

    const params = [];

    if (low_stock === "true") {
      query += " AND i.available <= i.reorder_level";
    }

    if (category) {
      query += " AND b.category = ?";
      params.push(category);
    }

    if (format) {
      query += " AND i.format = ?";
      params.push(format);
    }

    query += " ORDER BY stock_status, i.available ASC";

    const [inventory] = await dbQuery(query, params);

    // Get summary
    const [[summary]] = await dbQuery(`
      SELECT 
        COUNT(*) as total_items,
        SUM(quantity) as total_quantity,
        SUM(available) as total_available,
        SUM(CASE WHEN available <= reorder_level THEN 1 ELSE 0 END) as low_stock_items,
        SUM(quantity * unit_cost) as total_value
      FROM inventory
    `);

    res.json({
      success: true,
      inventory,
      summary,
    });
  } catch (error) {
    console.error("Get inventory error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to load inventory" });
  }
});

// ============== REPORTS ==============

// Generate financial report
app.get("/api/admin/reports/financial", authMiddleware, async (req, res) => {
  try {
    const { year, month } = req.query;

    // Monthly revenue
    const [monthlyRevenue] = await dbQuery(
      `
      SELECT 
        DATE_FORMAT(sale_date, '%Y-%m') as month,
        SUM(total_amount) as revenue,
        COUNT(*) as transactions,
        SUM(quantity) as units_sold
      FROM sales 
      WHERE payment_status = 'paid'
      ${year ? "AND YEAR(sale_date) = ?" : ""}
      GROUP BY DATE_FORMAT(sale_date, '%Y-%m')
      ORDER BY month DESC
    `,
      year ? [year] : [],
    );

    // Top selling books
    const [topBooks] = await dbQuery(
      `
      SELECT 
        b.id, b.title, b.isbn,
        a.full_name as author,
        SUM(s.quantity) as total_sold,
        SUM(s.total_amount) as total_revenue,
        COUNT(DISTINCT s.id) as transactions
      FROM sales s
      JOIN books b ON s.book_id = b.id
      JOIN authors a ON b.author_id = a.id
      WHERE s.payment_status = 'paid'
      ${month ? "AND MONTH(s.sale_date) = ? AND YEAR(s.sale_date) = YEAR(CURDATE())" : ""}
      ${year && !month ? "AND YEAR(s.sale_date) = ?" : ""}
      GROUP BY b.id, b.title, b.isbn, a.full_name
      ORDER BY total_revenue DESC
      LIMIT 10
    `,
      month ? [month] : year ? [year] : [],
    );

    // Royalties due
    const [royalties] = await dbQuery(`
      SELECT 
        r.*, c.contract_number,
        b.title as book_title,
        a.full_name as author_name,
        a.email as author_email
      FROM royalties r
      JOIN contracts c ON r.contract_id = c.id
      JOIN books b ON r.book_id = b.id
      JOIN authors a ON r.author_id = a.id
      WHERE r.payment_status IN ('pending', 'calculated')
      ORDER BY r.payment_date ASC
    `);

    res.json({
      success: true,
      report: {
        monthly_revenue: monthlyRevenue,
        top_books: topBooks,
        pending_royalties: royalties,
      },
    });
  } catch (error) {
    console.error("Financial report error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to generate financial report" });
  }
});

// ============== SETTINGS ==============

// Get settings
app.get("/api/admin/settings", authMiddleware, async (req, res) => {
  try {
    const [settings] = await dbQuery(
      "SELECT * FROM settings ORDER BY category, setting_key",
    );

    // Organize by category
    const organized = {};
    settings.forEach((setting) => {
      if (!organized[setting.category]) {
        organized[setting.category] = [];
      }
      organized[setting.category].push(setting);
    });

    res.json({
      success: true,
      settings: organized,
    });
  } catch (error) {
    console.error("Get settings error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to load settings" });
  }
});

// Update settings
app.post("/api/admin/settings", authMiddleware, async (req, res) => {
  try {
    const settings = req.body;

    for (const [key, value] of Object.entries(settings)) {
      await dbQuery(
        "UPDATE settings SET setting_value = ?, updated_at = CURRENT_TIMESTAMP WHERE setting_key = ?",
        [value, key],
      );
    }

    res.json({
      success: true,
      message: "Settings updated successfully",
    });
  } catch (error) {
    console.error("Update settings error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to update settings" });
  }
});

// ============== UTILITY ENDPOINTS ==============

// Get filters data (for dropdowns, etc.)
app.get("/api/admin/filters", authMiddleware, async (req, res) => {
  try {
    const [faculties] = await dbQuery(
      "SELECT DISTINCT faculty FROM authors WHERE faculty IS NOT NULL AND faculty != '' ORDER BY faculty",
    );

    const [categories] = await dbQuery(
      "SELECT DISTINCT category FROM books WHERE category IS NOT NULL AND category != '' ORDER BY category",
    );

    const [authors] = await dbQuery(
      "SELECT a.id, u.full_name, u.email FROM authors a JOIN users u ON a.user_id = u.id WHERE u.status = 'active' ORDER BY u.full_name",
    );

    res.json({
      success: true,
      filters: {
        faculties: faculties.map((f) => f.faculty),
        categories: categories.map((c) => c.category),
        authors: authors,
      },
    });
  } catch (error) {
    console.error("Get filters error:", error);
    res.status(500).json({ success: false, message: "Failed to load filters" });
  }
});

// Search across all entities
app.get("/api/admin/search", authMiddleware, async (req, res) => {
  try {
    const { q } = req.query;

    if (!q || q.length < 2) {
      return res.json({ success: true, results: [] });
    }

    const searchTerm = `%${q}%`;

    // Search books
    const [books] = await dbQuery(
      `
      SELECT 'book' as type, id, title as name, CONCAT('Book: ', title) as description
      FROM books 
      WHERE title LIKE ? OR isbn LIKE ?
      LIMIT 5
    `,
      [searchTerm, searchTerm],
    );

    // Search authors
    const [authors] = await dbQuery(
      `
      SELECT 'author' as type, id, full_name as name, CONCAT('Author: ', full_name, ' (', email, ')') as description
      FROM authors 
      WHERE full_name LIKE ? OR email LIKE ? OR staff_id LIKE ?
      LIMIT 5
    `,
      [searchTerm, searchTerm, searchTerm],
    );

    // Search contracts
    const [contracts] = await dbQuery(
      `
      SELECT 'contract' as type, c.id, c.contract_number as name, 
             CONCAT('Contract: ', c.contract_number, ' - ', b.title) as description
      FROM contracts c
      JOIN books b ON c.book_id = b.id
      WHERE c.contract_number LIKE ?
      LIMIT 5
    `,
      [searchTerm],
    );

    const results = [...books, ...authors, ...contracts];

    res.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ success: false, message: "Search failed" });
  }
});

// ============== AUTHOR PROFILE ROUTES ==============
app.get("/api/author/profile", authMiddleware, async (req, res) => {
  try {
    await ensureAuthorProfileColumns();

    const userId = req.user.id;
    const [rows] = await dbQuery(
      `SELECT u.id as user_id, u.full_name, u.email, u.phone, u.profile_image, u.status as user_status,
              a.id as author_id, a.staff_id, a.faculty, a.department, a.qualifications,
              a.biography, a.areas_of_expertise, a.orcid_id, a.google_scholar_id, a.linkedin_url, a.status as author_status
       FROM users u
       LEFT JOIN authors a ON a.user_id = u.id
       WHERE u.id = ?`,
      [userId],
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Author profile not found",
      });
    }

    res.json({
      success: true,
      author: rows[0],
    });
  } catch (error) {
    console.error("Get author profile error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load author profile",
    });
  }
});

app.put(
  "/api/author/profile",
  authMiddleware,
  upload.single("profile_image"),
  async (req, res) => {
    try {
      await ensureAuthorProfileColumns();

      const userId = req.user.id;
      const {
        full_name,
        email,
        phone,
        staff_id,
        faculty,
        department,
        qualifications,
        biography,
        areas_of_expertise,
        orcid_id,
        google_scholar_id,
        linkedin_url,
      } = req.body;

      const [authorRows] = await dbQuery(
        "SELECT id FROM authors WHERE user_id = ?",
        [userId],
      );

      if (authorRows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Author profile not found",
        });
      }

      const [duplicateEmail] = await dbQuery(
        "SELECT id FROM users WHERE email = ? AND id != ?",
        [email, userId],
      );
      if (email && duplicateEmail.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Email is already in use by another account",
        });
      }

      const profileImagePath = getUploadPath(req.file);
      const userColumns = await getTableColumns("users");
      const authorColumns = await getTableColumns("authors");

      const userUpdates = {};
      const userValues = [];
      if (userColumns.has("full_name") && full_name !== undefined) {
        userUpdates.full_name = toNullable(full_name);
      }
      if (userColumns.has("email") && email !== undefined) {
        userUpdates.email = toNullable(email);
      }
      if (userColumns.has("username") && email !== undefined) {
        userUpdates.username = toNullable(email);
      }
      if (userColumns.has("phone") && phone !== undefined) {
        userUpdates.phone = toNullable(phone);
      }
      if (profileImagePath && userColumns.has("profile_image")) {
        userUpdates.profile_image = profileImagePath;
      }

      if (Object.keys(userUpdates).length > 0) {
        const userSetClause = Object.keys(userUpdates)
          .map((key) => `${key} = ?`)
          .join(", ");
        userValues.push(...Object.values(userUpdates), userId);
        await dbQuery(
          `UPDATE users SET ${userSetClause} WHERE id = ?`,
          userValues,
        );
      }

      const authorUpdates = {};
      const authorValues = [];
      const authorId = authorRows[0].id;
      const authorPayload = {
        staff_id: toNullable(staff_id),
        faculty: toNullable(faculty),
        department: toNullable(department),
        qualifications: toNullable(qualifications),
        biography: toNullable(biography),
        areas_of_expertise: toNullable(areas_of_expertise),
        orcid_id: toNullable(orcid_id),
        google_scholar_id: toNullable(google_scholar_id),
        linkedin_url: toNullable(linkedin_url),
      };
      for (const [key, value] of Object.entries(authorPayload)) {
        if (authorColumns.has(key)) {
          authorUpdates[key] = value;
        }
      }

      if (Object.keys(authorUpdates).length > 0) {
        const authorSetClause = Object.keys(authorUpdates)
          .map((key) => `${key} = ?`)
          .join(", ");
        authorValues.push(...Object.values(authorUpdates), authorId);
        await dbQuery(
          `UPDATE authors SET ${authorSetClause} WHERE id = ?`,
          authorValues,
        );
      }

      const [rows] = await dbQuery(
        `SELECT u.id as user_id, u.full_name, u.email, u.phone, u.profile_image, u.status as user_status,
                a.id as author_id, a.staff_id, a.faculty, a.department, a.qualifications,
                a.biography, a.areas_of_expertise, a.orcid_id, a.google_scholar_id, a.linkedin_url, a.status as author_status
         FROM users u
         LEFT JOIN authors a ON a.user_id = u.id
         WHERE u.id = ?`,
        [userId],
      );

      res.json({
        success: true,
        message: "Profile updated successfully",
        author: rows[0],
      });
    } catch (error) {
      console.error("Update author profile error:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update author profile",
      });
    }
  },
);

// ============== STATIC FILES ==============

// Serve static files
app.use(express.static(FRONTEND_DIR));

// ============== AUTHOR DASHBOARD ROUTES ==============

// Get author's books with progress
app.get("/api/author/dashboard", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get author ID
    const [authorRows] = await dbQuery(
      "SELECT id FROM authors WHERE user_id = ?",
      [userId],
    );

    if (authorRows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Author profile not found",
      });
    }

    const authorId = authorRows[0].id;

    // Get author's books with progress
    const [books] = await dbQuery(
      `SELECT b.*, 
              COUNT(DISTINCT r.id) as review_count,
              COUNT(DISTINCT bp.id) as progress_count,
              MAX(bp.completed_date) as last_progress_date,
              GROUP_CONCAT(DISTINCT bp.stage ORDER BY bp.id) as completed_stages
       FROM books b
       LEFT JOIN book_reviews r ON b.id = r.book_id
       LEFT JOIN book_progress bp ON b.id = bp.book_id
       WHERE b.author_id = ?
       GROUP BY b.id
       ORDER BY b.updated_at DESC`,
      [authorId],
    );

    // Get overall statistics
    const [stats] = await dbQuery(
      `SELECT 
        COUNT(*) as total_books,
        SUM(CASE WHEN status = 'published' THEN 1 ELSE 0 END) as published_books,
        SUM(CASE WHEN status = 'in_production' THEN 1 ELSE 0 END) as in_production_books,
        SUM(CASE WHEN status = 'under_review' THEN 1 ELSE 0 END) as under_review_books,
        SUM(CASE WHEN status = 'revisions_requested' THEN 1 ELSE 0 END) as revision_books
       FROM books 
       WHERE author_id = ?`,
      [authorId],
    );

    // Get recent reviews
    const [reviews] = await dbQuery(
      `SELECT r.*, b.title as book_title, u.full_name as reviewer_name
       FROM book_reviews r
       JOIN books b ON r.book_id = b.id
       LEFT JOIN users u ON r.user_id = u.id
       WHERE b.author_id = ?
       ORDER BY r.created_at DESC
       LIMIT 5`,
      [authorId],
    );

    // Get royalty summary
    const [royalties] = await dbQuery(
      `SELECT 
        SUM(royalty_amount) as total_royalties,
        SUM(CASE WHEN payment_status = 'paid' THEN royalty_amount ELSE 0 END) as paid_royalties,
        SUM(CASE WHEN payment_status = 'pending' THEN royalty_amount ELSE 0 END) as pending_royalties
       FROM royalty_statements 
       WHERE author_id = ?`,
      [authorId],
    );

    res.json({
      success: true,
      data: {
        books,
        stats: stats[0],
        recentReviews: reviews,
        royalties: royalties[0],
      },
    });
  } catch (error) {
    console.error("Author dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load author dashboard",
    });
  }
});

// Get author's book details with progress tracking
app.get("/api/author/books/:id", authMiddleware, async (req, res) => {
  try {
    const bookId = req.params.id;
    const userId = req.user.id;

    // Verify author owns the book
    const [authorRows] = await dbQuery(
      "SELECT a.id FROM authors a JOIN books b ON a.id = b.author_id WHERE a.user_id = ? AND b.id = ?",
      [userId, bookId],
    );

    if (authorRows.length === 0) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized access",
      });
    }

    // Get book details
    const [books] = await dbQuery("SELECT * FROM books WHERE id = ?", [bookId]);

    if (books.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Book not found",
      });
    }

    const book = books[0];

    // Get progress tracking
    const [progress] = await dbQuery(
      "SELECT * FROM book_progress WHERE book_id = ? ORDER BY start_date ASC",
      [bookId],
    );

    // Get reviews
    const [book_reviews] = await dbQuery(
      "SELECT * FROM book_reviews WHERE book_id = ? ORDER BY created_at DESC",
      [bookId],
    );

    // Get sales data (if sales_orders_items exists)
    const [sales] = await dbQuery(
      "SELECT * FROM sales_orders WHERE id IN (SELECT order_id FROM sales_order_items WHERE book_id = ?) ORDER BY created_at DESC LIMIT 10",
      [bookId],
    ).catch(() => [[]]);

    // Get royalty statements
    const [royalties] = await dbQuery(
      "SELECT * FROM royalty_statements WHERE book_id = ? ORDER BY period_end DESC",
      [bookId],
    );

    res.json({
      success: true,
      data: {
        book,
        progress,
        reviews: book_reviews,
        sales,
        royalties,
      },
    });
  } catch (error) {
    console.error("Get author book error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load book details",
    });
  }
});

// ============== ENHANCED SECTIONS ==============

// Training & Workshops Management
app.get("/api/training", authMiddleware, async (req, res) => {
  try {
    const { status, type, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = "SELECT * FROM training_workshops WHERE 1=1";
    let countQuery =
      "SELECT COUNT(*) as total FROM training_workshops WHERE 1=1";
    const params = [];
    const countParams = [];

    if (status) {
      query += " AND status = ?";
      countQuery += " AND status = ?";
      params.push(status);
      countParams.push(status);
    }

    if (type) {
      query += " AND type = ?";
      countQuery += " AND type = ?";
      params.push(type);
      countParams.push(type);
    }

    query += " ORDER BY start_date DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [trainings] = await dbQuery(query, params);
    const [[{ total }]] = await dbQuery(countQuery, countParams);

    res.json({
      success: true,
      data: trainings,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get trainings error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load trainings",
    });
  }
});

// Production Management
app.get("/api/production", authMiddleware, async (req, res) => {
  try {
    const { status, task_type, priority, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT pt.*, b.title as book_title, u.full_name as assigned_to_name
      FROM production_tasks pt
      LEFT JOIN books b ON pt.book_id = b.id
      LEFT JOIN users u ON pt.assigned_to = u.id
      WHERE 1=1
    `;

    let countQuery = `
      SELECT COUNT(*) as total 
      FROM production_tasks pt
      WHERE 1=1
    `;

    const params = [];
    const countParams = [];

    if (status) {
      query += " AND pt.status = ?";
      countQuery += " AND pt.status = ?";
      params.push(status);
      countParams.push(status);
    }

    if (task_type) {
      query += " AND pt.task_type = ?";
      countQuery += " AND pt.task_type = ?";
      params.push(task_type);
      countParams.push(task_type);
    }

    if (priority) {
      query += " AND pt.priority = ?";
      countQuery += " AND pt.priority = ?";
      params.push(priority);
      countParams.push(priority);
    }

    query += " ORDER BY pt.due_date ASC, pt.priority DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [tasks] = await dbQuery(query, params);
    const [[{ total }]] = await dbQuery(countQuery, countParams);

    res.json({
      success: true,
      data: tasks,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get production tasks error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load production tasks",
    });
  }
});

// Inventory Management
app.get("/api/inventory", authMiddleware, async (req, res) => {
  try {
    const { low_stock, format, category, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT ii.*, b.title as book_title, b.category, b.isbn,
             CASE 
               WHEN ii.available <= ii.reorder_level THEN 'critical'
               WHEN ii.available <= ii.reorder_level * 2 THEN 'low'
               ELSE 'good'
             END as stock_status
      FROM inventory_items ii
      JOIN books b ON ii.book_id = b.id
      WHERE 1=1
    `;

    let countQuery = `
      SELECT COUNT(*) as total 
      FROM inventory_items ii
      JOIN books b ON ii.book_id = b.id
      WHERE 1=1
    `;

    const params = [];
    const countParams = [];

    if (low_stock === "true") {
      query += " AND ii.available <= ii.reorder_level";
      countQuery += " AND ii.available <= ii.reorder_level";
    }

    if (format) {
      query += " AND ii.format = ?";
      countQuery += " AND ii.format = ?";
      params.push(format);
      countParams.push(format);
    }

    if (category) {
      query += " AND b.category = ?";
      countQuery += " AND b.category = ?";
      params.push(category);
      countParams.push(category);
    }

    query += " ORDER BY ii.available ASC, ii.book_id LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [inventory] = await dbQuery(query, params);
    const [[{ total }]] = await dbQuery(countQuery, countParams);

    // Get summary
    const [[summary]] = await dbQuery(`
      SELECT 
        COUNT(*) as total_items,
        SUM(ii.quantity) as total_quantity,
        SUM(ii.available) as total_available,
        SUM(ii.quantity * ii.unit_cost) as total_cost,
        SUM(ii.available * ii.selling_price) as potential_revenue,
        SUM(CASE WHEN ii.available <= ii.reorder_level THEN 1 ELSE 0 END) as low_stock_items
      FROM inventory_items ii
    `);

    res.json({
      success: true,
      data: inventory,
      summary,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get inventory error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load inventory",
    });
  }
});

// Royalty Management
app.get("/api/royalties", authMiddleware, async (req, res) => {
  try {
    const {
      status,
      period_start,
      period_end,
      author_id,
      page = 1,
      limit = 10,
    } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT rs.*, b.title as book_title, 
             a.user_id, u.full_name as author_name
      FROM royalty_statements rs
      JOIN books b ON rs.book_id = b.id
      JOIN authors a ON rs.author_id = a.id
      JOIN users u ON a.user_id = u.id
      WHERE 1=1
    `;

    let countQuery = `
      SELECT COUNT(*) as total 
      FROM royalty_statements rs
      WHERE 1=1
    `;

    const params = [];
    const countParams = [];

    if (status) {
      query += " AND rs.payment_status = ?";
      countQuery += " AND rs.payment_status = ?";
      params.push(status);
      countParams.push(status);
    }

    if (period_start) {
      query += " AND rs.period_start >= ?";
      countQuery += " AND rs.period_start >= ?";
      params.push(period_start);
      countParams.push(period_start);
    }

    if (period_end) {
      query += " AND rs.period_end <= ?";
      countQuery += " AND rs.period_end <= ?";
      params.push(period_end);
      countParams.push(period_end);
    }

    if (author_id) {
      query += " AND rs.author_id = ?";
      countQuery += " AND rs.author_id = ?";
      params.push(author_id);
      countParams.push(author_id);
    }

    query += " ORDER BY rs.period_end DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [royalties] = await dbQuery(query, params);
    const [[{ total }]] = await dbQuery(countQuery, countParams);

    res.json({
      success: true,
      data: royalties,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get royalties error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load royalties",
    });
  }
});

// Sales Management
app.get("/api/sales", authMiddleware, async (req, res) => {
  try {
    const {
      status,
      start_date,
      end_date,
      payment_status,
      page = 1,
      limit = 10,
    } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT so.*, 
             COUNT(soi.id) as item_count
      FROM sales_orders so
      LEFT JOIN sales_order_items soi ON so.id = soi.order_id
      WHERE 1=1
    `;

    let countQuery = `
      SELECT COUNT(*) as total 
      FROM sales_orders so
      WHERE 1=1
    `;

    const params = [];
    const countParams = [];

    if (status) {
      query += " AND so.order_status = ?";
      countQuery += " AND so.order_status = ?";
      params.push(status);
      countParams.push(status);
    }

    if (payment_status) {
      query += " AND so.payment_status = ?";
      countQuery += " AND so.payment_status = ?";
      params.push(payment_status);
      countParams.push(payment_status);
    }

    if (start_date) {
      query += " AND DATE(so.created_at) >= ?";
      countQuery += " AND DATE(so.created_at) >= ?";
      params.push(start_date);
      countParams.push(start_date);
    }

    if (end_date) {
      query += " AND DATE(so.created_at) <= ?";
      countQuery += " AND DATE(so.created_at) <= ?";
      params.push(end_date);
      countParams.push(end_date);
    }

    query += " GROUP BY so.id ORDER BY so.created_at DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), offset);

    const [sales] = await dbQuery(query, params);
    const [[{ total }]] = await dbQuery(countQuery, countParams);

    // Get sales summary
    const [[summary]] = await dbQuery(`
      SELECT 
        COUNT(*) as total_orders,
        SUM(total_amount) as total_revenue,
        AVG(total_amount) as average_order_value,
        SUM(CASE WHEN order_status = 'delivered' THEN 1 ELSE 0 END) as completed_orders,
        SUM(CASE WHEN payment_status = 'paid' THEN total_amount ELSE 0 END) as paid_revenue
      FROM sales_orders
      WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `);

    res.json({
      success: true,
      data: sales,
      summary,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get sales error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load sales",
    });
  }
});

// Get authors with proper DataTable handling

// Serve HTML pages
app.get("/", (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

app.get("/admin.html", (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(FRONTEND_DIR, "index.html"));
});

// Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    await dbQuery("SELECT 1");
    res.json({
      success: true,
      message: "Server is healthy",
      timestamp: new Date(),
      database: isPostgres ? "postgres" : dbConfig.database,
      client: isPostgres ? "postgres" : "mysql",
      uptime: process.uptime(),
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: "Database query failed",
      error: error.message,
    });
  }
});

// Handle 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(FRONTEND_DIR, "index.html"));
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// ============== AUTO-INITIALIZATION FUNCTIONS ==============

async function initializeDatabase() {
  try {
    await dbQuery("SELECT 1");
    if (!isPostgres) {
      await initDatabase();
    }
    return true;
  } catch (error) {
    console.error("Database initialization error:", error.message);
    return false;
  }
}

// ============== START SERVER ==============

const PORT = process.env.PORT || 3001;

console.log("Initializing database...");
initializeDatabase().then((success) => {
  if (success === false) {
    console.error("Failed to initialize database");
    process.exit(1);
  }

  const server = app.listen(PORT, () => {
    console.log(`
BABCOCK UNIVERSITY PUBLISHING COMPANY - ADMIN SERVER
========================================================

Server running on port: ${PORT}
Main URL: http://localhost:${PORT}
Admin Panel: http://localhost:${PORT}/admin
API Health: http://localhost:${PORT}/api/health

DATABASE STATUS:
   - Client: ${isPostgres ? "Postgres (Supabase-ready)" : "MySQL"}
   - Database: ${isPostgres ? "postgres" : dbConfig.database}
   - Tables: initialized in MySQL mode or pre-provisioned in Postgres mode

DEFAULT ADMIN CREDENTIALS:
   - Email: admin@babcock.edu.ng
   - Password: Admin@123
   - Role: Super Admin

FILE UPLOADS:
   - Directory: ${path.join(__dirname, "uploads")}
   - Max Size: 10MB

========================================================
    `);
  });

  server.on("error", (err) => {
    console.error("Server error:", err);
    process.exit(1);
  });

  process.on("SIGTERM", () => {
    console.log("SIGTERM received, shutting down gracefully...");
    server.close(async () => {
      console.log("Server closed");
      try {
        if (isPostgres && pgPool) {
          await pgPool.end();
        }
        if (!isPostgres && mysqlPool) {
          await mysqlPool.promise().end();
        }
        console.log("Database connections closed");
      } catch (dbShutdownError) {
        console.error("Error closing database connections:", dbShutdownError);
      }
      process.exit(0);
    });
  });

  process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    process.exit(1);
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    process.exit(1);
  });
});

// ============== END SERVER ==============
