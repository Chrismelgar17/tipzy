/**
 * Catch-all API route for /api/*
 *
 * In Expo Router, this file at app/api/[...slug]+api.ts matches every
 * request whose path starts with /api/ (e.g. /api/customer/login).
 *
 * All methods are forwarded to the Hono app. Hono has basePath('/api')
 * so it strips the prefix before routing internally:
 *   /api/customer/register  →  Hono routes  /customer/register
 *   /api/customer/login     →  Hono routes  /customer/login
 *   /api/customer/me        →  Hono routes  /customer/me
 *   /api/trpc/*             →  tRPC handler
 *   /api                    →  health check
 */
import app from "@/backend/hono";

const handle = async (req: Request) => {
  console.log(`[API Route] ${req.method} ${new URL(req.url).pathname}`);
  const res = await app.fetch(req);
  console.log(`[API Route] → ${res.status}`);
  return res;
};

export const GET     = handle;
export const POST    = handle;
export const PUT     = handle;
export const PATCH   = handle;
export const DELETE  = handle;
export const OPTIONS = handle;
export const HEAD    = handle;
