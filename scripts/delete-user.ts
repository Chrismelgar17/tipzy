import { Pool } from "pg";

const email = process.argv[2];
if (!email) { console.error("Usage: bun scripts/delete-user.ts <email>"); process.exit(1); }

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
});

const res = await pool.query(
  "DELETE FROM users WHERE email = $1 RETURNING email, role",
  [email.toLowerCase().trim()]
);

if (res.rowCount === 0) {
  console.error(`No user found with email: ${email}`);
} else {
  console.log("✓ Deleted user:", res.rows[0]);
}

await pool.end();
