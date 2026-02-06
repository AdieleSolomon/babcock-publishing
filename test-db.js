const mysql = require("mysql2/promise");

(async () => {
  try {
    const pool = mysql.createPool({
      host: "localhost",
      user: "root",
      password: "",
      database: "babcock_publishing",
    });

    const conn = await pool.getConnection();

    // Test the problematic query
    const [result] = await conn.query(
      'SELECT COUNT(*) as count FROM authors WHERE status = "pending"',
    );
    console.log("Authors result:", result);

    conn.release();
    process.exit(0);
  } catch (e) {
    console.error("Error:", e.message);
    console.error("Stack:", e.stack);
    process.exit(1);
  }
})();
