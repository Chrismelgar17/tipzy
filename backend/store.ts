/**
 * Shared in-memory data store.
 * Replace with a real database (SQLite, Postgres, etc.) for production.
 *
 * Having a single module ensures all routes share the same Map instances
 * even when hot-reloaded by the dev server.
 */

export type Role = 'customer' | 'business' | 'admin';

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
  phone?: string;
  age?: number;
  createdAt: string;
  // For business accounts
  businessName?: string;
  businessCategory?: string;
  businessStatus?: 'pending' | 'approved' | 'rejected';
}

// Central user store keyed by user ID
export const users = new Map<string, StoredUser>();

// Refresh token store: token → userId (for rotation/invalidation)
export const refreshTokens = new Map<string, string>();

// Seed a default admin account for development
const ADMIN_ID = 'admin_seed_001';
// Password: "admin123" – hashed below
// We hash lazily on first import using a placeholder; real hash is set on first run.
// In production seed this properly or use env vars.
users.set(ADMIN_ID, {
  id: ADMIN_ID,
  email: 'admin@tipzy.app',
  name: 'Tipzy Admin',
  // Placeholder – will be replaced on first login attempt via hashPassword()
  passwordHash: '__PENDING__',
  role: 'admin',
  createdAt: new Date().toISOString(),
});
