import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
import pg from "pg";

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, "..", ".env") });

const [email, nextPassword] = process.argv.slice(2);
const dbClient = (process.env.DB_CLIENT || "mysql").toLowerCase();

function fail(message) {
  console.error(message);
  process.exit(1);
}

if (!email || !nextPassword) {
  fail(
    "Usage: node scripts/set-user-password.js <email> <new-password>",
  );
}

async function updateMysqlPassword(passwordHash) {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "babcock_publishing",
  });

  try {
    const [rows] = await connection.execute(
      "SELECT id, email, role, status FROM users WHERE email = ?",
      [email],
    );

    if (!Array.isArray(rows) || rows.length === 0) {
      fail(`No user found for ${email}`);
    }

    const user = rows[0];
    await connection.execute(
      "UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE email = ?",
      [passwordHash, email],
    );

    console.log(
      `Password updated for ${user.email} (role: ${user.role}, status: ${user.status})`,
    );
    if (user.status !== "active") {
      console.log(
        "Note: the account is not active, so login may still be blocked until it is approved or activated.",
      );
    }
  } finally {
    await connection.end();
  }
}

async function updatePostgresPassword(passwordHash) {
  const connectionString =
    process.env.DATABASE_PUBLIC_URL || process.env.DATABASE_URL;

  if (!connectionString) {
    fail(
      "Missing DATABASE_PUBLIC_URL or DATABASE_URL for Postgres password reset.",
    );
  }

  const pool = new Pool({
    connectionString,
    ssl:
      String(process.env.DB_SSL || "").toLowerCase() === "true"
        ? { rejectUnauthorized: false }
        : undefined,
  });

  try {
    const existing = await pool.query(
      "SELECT id, email, role, status FROM users WHERE email = $1",
      [email],
    );

    if (!existing.rows.length) {
      fail(`No user found for ${email}`);
    }

    const user = existing.rows[0];
    await pool.query(
      "UPDATE users SET password = $1, reset_token = NULL, reset_token_expiry = NULL WHERE email = $2",
      [passwordHash, email],
    );

    console.log(
      `Password updated for ${user.email} (role: ${user.role}, status: ${user.status})`,
    );
    if (user.status !== "active") {
      console.log(
        "Note: the account is not active, so login may still be blocked until it is approved or activated.",
      );
    }
  } finally {
    await pool.end();
  }
}

async function main() {
  const passwordHash = await bcrypt.hash(nextPassword, 10);

  if (dbClient === "postgres") {
    await updatePostgresPassword(passwordHash);
    return;
  }

  await updateMysqlPassword(passwordHash);
}

main().catch((error) => {
  console.error("Failed to update password:", error.message);
  process.exit(1);
});
