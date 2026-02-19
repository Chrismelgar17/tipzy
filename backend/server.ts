/**
 * Standalone Hono HTTP server — runs the same backend/hono.ts app
 * as a plain Node.js/Bun HTTP server on port 3001.
 *
 * The Expo web app (and native app) send API requests here instead of
 * relying on Expo Router API routes (which Metro does not expose via rork).
 *
 * Start with:
 *   bun backend/server.ts
 */
import { serve } from "@hono/node-server";
import app from "./hono";

const PORT = Number(process.env.PORT ?? 3001);

serve({ fetch: app.fetch, port: PORT, hostname: "0.0.0.0" }, (info) => {
  console.log(`\x1b[32m✓ Tipzy API running at http://localhost:${info.port}\x1b[0m`);
  console.log(`  Health : http://localhost:${info.port}/api`);
  console.log(`  Auth   : POST http://localhost:${info.port}/api/customer/register`);
  console.log(`           POST http://localhost:${info.port}/api/customer/login`);
  console.log(`           GET  http://localhost:${info.port}/api/customer/me`);
});
