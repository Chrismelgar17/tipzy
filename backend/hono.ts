import { Hono } from "hono";
import { trpcServer } from "@hono/trpc-server";
import { cors } from "hono/cors";
import { appRouter } from "./trpc/app-router";
import { createContext } from "./trpc/create-context";
import customerRoutes from "./routes/customer";
import businessRoutes from "./routes/business";
import adminRoutes from "./routes/admin";

const app = new Hono().basePath("/api");

app.use("*", cors({
  origin: (origin) => origin ?? "*",
  allowHeaders: ["Content-Type", "Authorization"],
  allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  exposeHeaders: ["Content-Length"],
  credentials: true,
}));

// Auth routes
app.route("/customer", customerRoutes);
app.route("/business", businessRoutes);
app.route("/admin", adminRoutes);

// tRPC
app.use("/trpc/*", trpcServer({ endpoint: "/api/trpc", router: appRouter, createContext }));

// Health check
app.get("/", (c) => c.json({ status: "ok", message: "Tipzy API is running", version: "2.0" }));

export default app;
