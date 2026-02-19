/**
 * Root API handler — forwards all HTTP methods to the Hono app.
 * Expo Router requires named exports (GET, POST, etc.), not a bare default.
 */
import app from "@/backend/hono";

export const GET = (req: Request) => app.fetch(req);
export const POST = (req: Request) => app.fetch(req);
export const PUT = (req: Request) => app.fetch(req);
export const PATCH = (req: Request) => app.fetch(req);
export const DELETE = (req: Request) => app.fetch(req);
export const OPTIONS = (req: Request) => app.fetch(req);
export const HEAD = (req: Request) => app.fetch(req);
