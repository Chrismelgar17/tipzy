/**
 * Standalone Hono HTTP server — uses Bun's native server for Railway compatibility.
 *
 * Start with:
 *   bun backend/server.ts
 */
import app from "./hono";

const PORT = Number(process.env.PORT ?? 3001);

console.log(`[startup] PORT=${PORT}`);
console.log(`[startup] DATABASE_URL=${process.env.DATABASE_URL ? process.env.DATABASE_URL.replace(/:([^@]+)@/, ':***@') : 'NOT SET'}`);
console.log(`[startup] PGSSL=${process.env.PGSSL}`);
console.log(`[startup] NODE_ENV=${process.env.NODE_ENV}`);

try {
  Bun.serve({
    fetch: app.fetch,
    port: PORT,
    hostname: "0.0.0.0",
  });
  console.log(`\x1b[32m✓ Tipzy API running on port ${PORT}\x1b[0m`);
} catch (err: any) {
  console.error(`[startup] FAILED to start server:`, err?.message ?? err);
  process.exit(1);
}
console.log(`  Health : http://localhost:${PORT}/api`);
console.log(`  Auth   : POST http://localhost:${PORT}/api/customer/register`);
console.log(`           POST http://localhost:${PORT}/api/customer/login`);
console.log(`           GET  http://localhost:${PORT}/api/customer/me`);
