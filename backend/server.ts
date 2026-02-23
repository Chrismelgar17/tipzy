/**
 * Standalone Hono HTTP server — uses Bun's native server for Railway compatibility.
 *
 * Start with:
 *   bun backend/server.ts
 */
import app from "./hono";

const PORT = Number(process.env.PORT ?? 3001);

Bun.serve({
  fetch: app.fetch,
  port: PORT,
  hostname: "0.0.0.0",
});

console.log(`\x1b[32m✓ Tipzy API running on port ${PORT}\x1b[0m`);
console.log(`  Health : http://localhost:${PORT}/api`);
console.log(`  Auth   : POST http://localhost:${PORT}/api/customer/register`);
console.log(`           POST http://localhost:${PORT}/api/customer/login`);
console.log(`           GET  http://localhost:${PORT}/api/customer/me`);
