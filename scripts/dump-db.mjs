import pg from "pg";
import fs from "fs";
import path from "path";

const { Pool } = pg;

const DATABASE_URL =
  "postgresql://postgres:vgxKXYsTjJqcIqLFVOGPczvZCdMZnWUd@metro.proxy.rlwy.net:24615/railway";

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function dump() {
  const client = await pool.connect();
  const lines = [];

  try {
    console.log("Connected to Railway PostgreSQL...");

    // Get all user tables
    const { rows: tables } = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log(`Found ${tables.length} tables:`, tables.map(t => t.tablename).join(", "));

    lines.push("-- Tipzy Database Dump");
    lines.push(`-- Generated: ${new Date().toISOString()}`);
    lines.push(`-- Host: metro.proxy.rlwy.net:24615`);
    lines.push("");

    for (const { tablename } of tables) {
      console.log(`Dumping table: ${tablename}...`);

      // Get column info
      const { rows: cols } = await client.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = $1
        ORDER BY ordinal_position
      `, [tablename]);

      // Get row count
      const { rows: countRows } = await client.query(`SELECT COUNT(*) FROM "${tablename}"`);
      const count = countRows[0].count;

      lines.push(`-- ============================================================`);
      lines.push(`-- Table: ${tablename} (${count} rows)`);
      lines.push(`-- ============================================================`);
      lines.push("");

      // Dump rows as INSERT statements
      const { rows } = await client.query(`SELECT * FROM "${tablename}"`);

      if (rows.length === 0) {
        lines.push(`-- (empty)`);
        lines.push("");
        continue;
      }

      const colNames = Object.keys(rows[0]).map(c => `"${c}"`).join(", ");

      for (const row of rows) {
        const values = Object.values(row).map(v => {
          if (v === null) return "NULL";
          if (typeof v === "boolean") return v ? "TRUE" : "FALSE";
          if (typeof v === "number") return v;
          if (v instanceof Date) return `'${v.toISOString()}'`;
          if (typeof v === "object") return `'${JSON.stringify(v).replace(/'/g, "''")}'`;
          return `'${String(v).replace(/'/g, "''")}'`;
        }).join(", ");

        lines.push(`INSERT INTO "${tablename}" (${colNames}) VALUES (${values});`);
      }

      lines.push("");
    }

    const outPath = path.join(process.cwd(), "tipzy_dump.sql");
    fs.writeFileSync(outPath, lines.join("\n"), "utf8");
    console.log(`\nDump saved to: ${outPath}`);
    console.log(`Total lines: ${lines.length}`);

  } finally {
    client.release();
    await pool.end();
  }
}

dump().catch(err => {
  console.error("Dump failed:", err.message);
  process.exit(1);
});
