import pg from "pg";

const { Pool } = pg;

const DATABASE_URL =
  "postgresql://postgres:vgxKXYsTjJqcIqLFVOGPczvZCdMZnWUd@metro.proxy.rlwy.net:24615/railway";

const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function reset() {
  const client = await pool.connect();
  try {
    console.log("Connected to Railway PostgreSQL...");

    // Truncate all user tables in one shot with CASCADE to handle FK dependencies
    const { rows: tables } = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);

    console.log(`Found ${tables.length} tables:`, tables.map(t => t.tablename).join(", "));

    const tableList = tables.map(t => `"${t.tablename}"`).join(", ");
    await client.query(`TRUNCATE TABLE ${tableList} RESTART IDENTITY CASCADE`);

    console.log("\n✓ All tables truncated and sequences reset.");

    // Verify
    for (const { tablename } of tables) {
      const { rows } = await client.query(`SELECT COUNT(*) FROM "${tablename}"`);
      console.log(`  ${tablename}: ${rows[0].count} rows`);
    }

  } finally {
    client.release();
    await pool.end();
  }
}

reset().catch(err => {
  console.error("Reset failed:", err.message);
  process.exit(1);
});
