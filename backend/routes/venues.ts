/**
 * Venue routes
 * GET    /api/venues              – list approved venues (public)
 * GET    /api/venues/:id          – single approved venue (public)
 * POST   /api/venues              – create venue (business, authenticated)
 * PATCH  /api/venues/:id          – update venue details/crowd (owner only)
 * DELETE /api/venues/:id          – delete venue (owner or admin)
 */
import { Hono } from "hono";
import { requireAuth, requireRole } from "../auth";
import { query, type DbVenue } from "../db";

const venues = new Hono();

// ---------- helpers ----------

function rowToVenue(v: DbVenue) {
  return {
    id: v.id,
    ownerUserId: v.owner_user_id,
    name: v.name,
    address: v.address,
    geo: { lat: v.lat ?? 0, lng: v.lng ?? 0 },
    timezone: v.timezone,
    hours: typeof v.hours === "string" ? JSON.parse(v.hours) : v.hours,
    minAge: v.min_age,
    minEntryAge: v.min_age >= 21 ? "21+" : "18+",
    dressCode: v.dress_code ?? "Casual",
    capacity: v.capacity,
    maxCapacity: v.capacity,
    currentCount: v.current_count,
    crowdCount: v.current_count,
    crowdLevel: crowdLevel(v.current_count, v.capacity),
    capacityStatus: crowdLevel(v.current_count, v.capacity),
    genres: typeof v.genres === "string" ? JSON.parse(v.genres) : v.genres,
    photos: typeof v.photos === "string" ? JSON.parse(v.photos) : v.photos,
    priceLevel: v.price_level,
    rating: v.rating,
    status: v.status,
    createdAt: v.created_at,
    featuredRank: 0,
  };
}

function crowdLevel(count: number, capacity: number): "quiet" | "moderate" | "busy" | "packed" {
  if (!capacity) return "quiet";
  const pct = count / capacity;
  if (pct >= 0.9) return "packed";
  if (pct >= 0.6) return "busy";
  if (pct >= 0.3) return "moderate";
  return "quiet";
}

// ---------- public routes ----------

// GET /api/venues – approved venues only
venues.get("/", async (c) => {
  const res = await query<DbVenue>(
    `SELECT * FROM venues WHERE status = 'approved' ORDER BY created_at DESC`,
  );
  return c.json({ venues: res.rows.map(rowToVenue), total: res.rows.length });
});

// GET /api/venues/:id – single approved venue
venues.get("/:id", async (c) => {
  const id = c.req.param("id");
  const res = await query<DbVenue>(
    `SELECT * FROM venues WHERE id = $1 AND status = 'approved'`,
    [id],
  );
  if (!res.rows[0]) return c.json({ error: "Venue not found" }, 404);
  return c.json(rowToVenue(res.rows[0]));
});

// ---------- authenticated routes ----------

// POST /api/venues – business creates a venue (pending approval)
venues.post("/", requireAuth, requireRole("business"), async (c) => {
  let body: {
    name?: string;
    address?: string;
    lat?: number;
    lng?: number;
    timezone?: string;
    hours?: Record<string, { open: string; close: string }>;
    minAge?: number;
    dressCode?: string;
    capacity?: number;
    genres?: string[];
    photos?: string[];
    priceLevel?: number;
  };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }

  const { name, address, lat, lng, timezone, hours, minAge, dressCode, capacity, genres, photos, priceLevel } = body;
  if (!name) return c.json({ error: "name is required" }, 400);

  const userId = (c as any).get("userId");
  const id = crypto.randomUUID?.() ?? `venue_${Date.now()}`;

  const res = await query<DbVenue>(
    `INSERT INTO venues
      (id, owner_user_id, name, address, lat, lng, timezone, hours, min_age, dress_code,
       capacity, genres, photos, price_level, status, created_at, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending',now(),now())
     RETURNING *`,
    [
      id, userId, name.trim(),
      address ?? "", lat ?? null, lng ?? null,
      timezone ?? "America/New_York",
      JSON.stringify(hours ?? {}),
      minAge ?? 18, dressCode ?? null,
      capacity ?? 100,
      JSON.stringify(genres ?? []),
      JSON.stringify(photos ?? []),
      priceLevel ?? 2,
    ],
  );

  return c.json(rowToVenue(res.rows[0]), 201);
});

// PATCH /api/venues/:id – update venue (owner) or update crowd count
venues.patch("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const userId = (c as any).get("userId");
  const userRole = (c as any).get("role");
  const venue = venueRes.rows[0];
  if (!venue) return c.json({ error: "Venue not found" }, 404);
  if (venue.owner_user_id !== userId && userRole !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }

  let body: {
    name?: string;
    address?: string;
    lat?: number;
    lng?: number;
    timezone?: string;
    hours?: Record<string, { open: string; close: string }>;
    minAge?: number;
    dressCode?: string;
    capacity?: number;
    currentCount?: number;
    genres?: string[];
    photos?: string[];
    priceLevel?: number;
    rating?: number;
  };
  try { body = await c.req.json(); } catch { return c.json({ error: "Invalid JSON body" }, 400); }

  const fields: string[] = [];
  const values: any[] = [];
  let i = 1;

  const addField = (col: string, val: any) => {
    fields.push(`${col} = $${i++}`);
    values.push(val);
  };

  if (body.name !== undefined) addField("name", body.name.trim());
  if (body.address !== undefined) addField("address", body.address);
  if (body.lat !== undefined) addField("lat", body.lat);
  if (body.lng !== undefined) addField("lng", body.lng);
  if (body.timezone !== undefined) addField("timezone", body.timezone);
  if (body.hours !== undefined) addField("hours", JSON.stringify(body.hours));
  if (body.minAge !== undefined) addField("min_age", body.minAge);
  if (body.dressCode !== undefined) addField("dress_code", body.dressCode);
  if (body.capacity !== undefined) addField("capacity", body.capacity);
  if (body.currentCount !== undefined) addField("current_count", body.currentCount);
  if (body.genres !== undefined) addField("genres", JSON.stringify(body.genres));
  if (body.photos !== undefined) addField("photos", JSON.stringify(body.photos));
  if (body.priceLevel !== undefined) addField("price_level", body.priceLevel);
  if (body.rating !== undefined) addField("rating", body.rating);

  if (!fields.length) return c.json({ error: "No fields to update" }, 400);
  fields.push(`updated_at = now()`);
  values.push(id);

  const updated = await query<DbVenue>(
    `UPDATE venues SET ${fields.join(", ")} WHERE id = $${i} RETURNING *`,
    values,
  );

  return c.json(rowToVenue(updated.rows[0]));
});

// DELETE /api/venues/:id
venues.delete("/:id", requireAuth, async (c) => {
  const id = c.req.param("id");
  const userId = (c as any).get("userId");
  const userRole = (c as any).get("role");

  const venueRes = await query<DbVenue>("SELECT owner_user_id FROM venues WHERE id = $1", [id]);
  const venue = venueRes.rows[0];
  if (!venue) return c.json({ error: "Venue not found" }, 404);
  if (venue.owner_user_id !== userId && userRole !== "admin") {
    return c.json({ error: "Forbidden" }, 403);
  }

  await query("DELETE FROM venues WHERE id = $1", [id]);
  return c.json({ message: "Venue deleted" });
});

export default venues;
