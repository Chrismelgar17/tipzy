import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import customerRoutes from "./routes/customer";

// basePath('/api') so routes are relative to /api.
// Expo Router's app/api/[...slug]+api.ts forwards full URLs here,
// e.g. /api/customer/login -> Hono strips /api -> routes /customer/login
const app = new Hono().basePath("/api");

// Enable CORS — allow the Expo web app (any origin) and the rork tunnel
app.use("*", cors({
  origin: (origin) => {
    // Allow all origins in development (Metro localhost, rork tunnel, etc.)
    return origin ?? "*";
  },
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  credentials: true,
}));

// Customer auth routes: /api/customer/register  /api/customer/login  /api/customer/me
app.route("/customer", customerRoutes);

// tRPC: /api/trpc/*
app.use(
  "/trpc/*",
  trpcServer({
    endpoint: "/api/trpc",
    router: appRouter,
    createContext,
  })
);

// Health check: GET /api
app.get("/", (c) => {
  return c.json({ status: "ok", message: "Tipzy API is running" });
});

export default app;
