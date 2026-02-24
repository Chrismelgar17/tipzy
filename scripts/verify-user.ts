import { Pool } from "pg";

const email = process.argv[2];
if (!email) { console.error("Usage: bun scripts/verify-user.ts <email>"); process.exit(1); }

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSL === "true" ? { rejectUnauthorized: false } : undefined,
});

const res = await pool.query(
  "UPDATE users SET email_verified = true WHERE email = $1 RETURNING email, email_verified, role",
  [email.toLowerCase().trim()]
);

if (res.rowCount === 0) {
  console.error(`No user found with email: ${email}`);
} else {
  console.log("✓ Email verified:", res.rows[0]);
}

await pool.end();
