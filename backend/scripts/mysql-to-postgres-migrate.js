import fs from "fs";
import path from "path";
import mysql from "mysql2/promise";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;
const shouldApply = process.argv.includes("--apply");
const outputDir = path.resolve("migrations", "mysql_to_postgres");
const schemaFilePath = path.join(outputDir, "generated_schema.sql");
const summaryFilePath = path.join(outputDir, "migration_summary.json");

const dbName = process.env.DB_NAME || "babcock_publishing";

function mapMySqlTypeToPostgres(mysqlType) {
  const type = mysqlType.toLowerCase();
  if (type.startsWith("int") || type.startsWith("tinyint") || type.startsWith("smallint")) return "INTEGER";
  if (type.startsWith("bigint")) return "BIGINT";
  if (type.startsWith("decimal") || type.startsWith("numeric")) return "NUMERIC";
  if (type.startsWith("float") || type.startsWith("double")) return "DOUBLE PRECISION";
  if (type.startsWith("varchar") || type.startsWith("char")) return "TEXT";
  if (type.includes("text")) return "TEXT";
  if (type.startsWith("datetime") || type.startsWith("timestamp")) return "TIMESTAMP";
  if (type.startsWith("date")) return "DATE";
  if (type.startsWith("time")) return "TIME";
  if (type.startsWith("json")) return "JSONB";
  if (type.startsWith("enum")) return "TEXT";
  if (type.startsWith("boolean") || type.startsWith("bool")) return "BOOLEAN";
  return "TEXT";
}

function quoteIdent(identifier) {
  return `"${String(identifier).replaceAll('"', '""')}"`;
}

async function main() {
  fs.mkdirSync(outputDir, { recursive: true });

  const mysqlConn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: dbName,
  });

  const [tables] = await mysqlConn.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? ORDER BY TABLE_NAME`,
    [dbName],
  );

  const tableNames = tables.map((t) => t.TABLE_NAME);
  const summary = { database: dbName, generatedAt: new Date().toISOString(), tables: [] };
  const schemaStatements = [];

  for (const tableName of tableNames) {
    const [columns] = await mysqlConn.query(
      `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY, EXTRA
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
       ORDER BY ORDINAL_POSITION`,
      [dbName, tableName],
    );

    const pgColumns = columns.map((col) => {
      const pgType = mapMySqlTypeToPostgres(col.COLUMN_TYPE);
      const isPrimary = col.COLUMN_KEY === "PRI";
      const isAuto = String(col.EXTRA || "").includes("auto_increment");
      const nullable = col.IS_NULLABLE === "YES";

      let definition = `${quoteIdent(col.COLUMN_NAME)} ${pgType}`;
      if (isPrimary && isAuto && pgType === "INTEGER") {
        definition = `${quoteIdent(col.COLUMN_NAME)} SERIAL PRIMARY KEY`;
      } else {
        if (!nullable) definition += " NOT NULL";
        if (isPrimary) definition += " PRIMARY KEY";
      }
      return definition;
    });

    schemaStatements.push(`CREATE TABLE IF NOT EXISTS ${quoteIdent(tableName)} (\n  ${pgColumns.join(",\n  ")}\n);`);

    const [[{ count }]] = await mysqlConn.query(`SELECT COUNT(*) as count FROM ${tableName}`);
    summary.tables.push({ tableName, rowCount: Number(count), columnCount: columns.length });
  }

  fs.writeFileSync(schemaFilePath, `${schemaStatements.join("\n\n")}\n`);
  fs.writeFileSync(summaryFilePath, JSON.stringify(summary, null, 2));

  console.log(`Generated schema: ${schemaFilePath}`);
  console.log(`Generated summary: ${summaryFilePath}`);

  if (!shouldApply) {
    console.log("Dry run complete. Re-run with --apply to create tables and copy data.");
    await mysqlConn.end();
    return;
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for --apply mode");
  }

  const pgClient = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : undefined,
  });

  await pgClient.connect();

  for (const stmt of schemaStatements) {
    await pgClient.query(stmt);
  }

  for (const tableName of tableNames) {
    const [rows] = await mysqlConn.query(`SELECT * FROM ${tableName}`);
    if (!rows.length) continue;

    const columns = Object.keys(rows[0]);
    const colSql = columns.map(quoteIdent).join(", ");
    const valueSql = columns.map((_, idx) => `$${idx + 1}`).join(", ");
    const insertSql = `INSERT INTO ${quoteIdent(tableName)} (${colSql}) VALUES (${valueSql}) ON CONFLICT DO NOTHING`;

    for (const row of rows) {
      const values = columns.map((c) => row[c]);
      await pgClient.query(insertSql, values);
    }

    console.log(`Migrated ${rows.length} row(s) from ${tableName}`);
  }

  await pgClient.end();
  await mysqlConn.end();
  console.log("MySQL -> Postgres migration complete.");
}

main().catch((error) => {
  console.error("Migration failed:", error.message);
  process.exit(1);
});
