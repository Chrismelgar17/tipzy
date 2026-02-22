/**
 * useCapacity – real-time capacity management for a business venue.
 *
 * Provides:
 *  • Live crowd level (green / yellow / red) with traffic-light semantics
 *  • checkIn / checkOut actions that call the backend and update state
 *  • Auto-polling every POLL_INTERVAL_MS milliseconds
 *  • isAtCapacity guard to prevent over-count
 *
 * Usage (business dashboard):
 *   const { capacity, checkIn, checkOut, isPolling } = useCapacity(venueId);
 */
import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { VenueCapacity, CrowdColor } from '@/types/models';
import api from '@/lib/api';

// ---------- constants ----------

const POLL_INTERVAL_MS = 30_000; // 30 s

// ---------- types ----------

interface CapacityState {
  /** The venue ID this context is tracking. Call setVenueId() to change. */
  venueId: string | null;
  setVenueId: (id: string | null) => void;

  /** Latest capacity snapshot from the server */
  capacity: VenueCapacity | null;

  /** True while the initial fetch is in progress */
  isLoading: boolean;

  /** True while a checkIn / checkOut call is in flight */
  isUpdating: boolean;

  /** True while the background polling timer is active */
  isPolling: boolean;

  /** ISO string of last successful fetch */
  lastUpdated: string | null;

  /** Manually trigger a refresh */
  refresh: () => Promise<void>;

  /** Increment current count by 1 (owner / admin only) */
  checkIn: () => Promise<void>;

  /** Decrement current count by 1 (owner / admin only) */
  checkOut: () => Promise<void>;

  /** Error message, if any */
  error: string | null;
}

// ---------- helpers ----------

/** Map the API's crowdLevel string to a CrowdColor */
export function toCrowdColor(level: string): CrowdColor {
  if (level === 'packed') return 'red';
  if (level === 'busy') return 'yellow';
  return 'green';
}

/** Human-readable label for the crowd colour */
export function crowdColorLabel(color: CrowdColor): string {
  if (color === 'red') return 'At Capacity';
  if (color === 'yellow') return 'Busy';
  return 'Quiet';
}

/** Hex value for the crowd colour using theme-aligned values */
export const CROWD_COLOR_HEX: Record<CrowdColor, string> = {
  green: '#4CAF50',
  yellow: '#FF9800',
  red: '#F44336',
};

// ---------- context hook ----------

export const [CapacityProvider, useCapacity] = createContextHook<CapacityState>(() => {
  const [venueId, setVenueIdRaw] = useState<string | null>(null);
  const [capacity, setCapacity] = useState<VenueCapacity | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── fetch capacity from backend ──────────────────────────────────────────

  const fetchCapacity = useCallback(async (id: string) => {
    try {
      const res = await api.get<any>(`/venues/${id}/capacity`);
      const data = res.data;
      setCapacity({
        venueId: data.venueId,
        venueName: data.venueName,
        currentCount: data.currentCount,
        maxCapacity: data.maxCapacity,
        occupancyPct: data.occupancyPct,
        crowdLevel: data.crowdLevel,
        crowdColor: toCrowdColor(data.crowdLevel),
        updatedAt: new Date(data.updatedAt),
      });
      setLastUpdated(new Date().toISOString());
      setError(null);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Failed to fetch capacity';
      setError(msg);
    }
  }, []);

  // ── start / stop polling when venueId changes ────────────────────────────

  useEffect(() => {
    if (pollTimer.current) {
      clearInterval(pollTimer.current);
      pollTimer.current = null;
    }
    setIsPolling(false);

    if (!venueId) {
      setCapacity(null);
      return;
    }

    // Initial load
    setIsLoading(true);
    fetchCapacity(venueId).finally(() => setIsLoading(false));

    // Start polling
    pollTimer.current = setInterval(() => {
      fetchCapacity(venueId);
    }, POLL_INTERVAL_MS);
    setIsPolling(true);

    return () => {
      if (pollTimer.current) clearInterval(pollTimer.current);
      setIsPolling(false);
    };
  }, [venueId, fetchCapacity]);

  // ── public API ───────────────────────────────────────────────────────────

  const setVenueId = useCallback((id: string | null) => {
    setVenueIdRaw(id);
  }, []);

  const refresh = useCallback(async () => {
    if (!venueId) return;
    await fetchCapacity(venueId);
  }, [venueId, fetchCapacity]);

  const checkIn = useCallback(async () => {
    if (!venueId) return;
    if (capacity && capacity.currentCount >= capacity.maxCapacity) {
      setError('Venue is at maximum capacity');
      return;
    }
    setIsUpdating(true);
    try {
      const res = await api.post<any>(`/venues/${venueId}/checkin`);
      const data = res.data;
      setCapacity(prev => prev ? {
        ...prev,
        currentCount: data.currentCount,
        occupancyPct: data.occupancyPct,
        crowdLevel: data.crowdLevel,
        crowdColor: toCrowdColor(data.crowdLevel),
        updatedAt: new Date(data.updatedAt),
      } : null);
      setLastUpdated(new Date().toISOString());
      setError(null);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Check-in failed';
      setError(msg);
    } finally {
      setIsUpdating(false);
    }
  }, [venueId, capacity]);

  const checkOut = useCallback(async () => {
    if (!venueId) return;
    if (capacity && capacity.currentCount <= 0) {
      setError('Count is already 0');
      return;
    }
    setIsUpdating(true);
    try {
      const res = await api.post<any>(`/venues/${venueId}/checkout`);
      const data = res.data;
      setCapacity(prev => prev ? {
        ...prev,
        currentCount: data.currentCount,
        occupancyPct: data.occupancyPct,
        crowdLevel: data.crowdLevel,
        crowdColor: toCrowdColor(data.crowdLevel),
        updatedAt: new Date(data.updatedAt),
      } : null);
      setLastUpdated(new Date().toISOString());
      setError(null);
    } catch (err: any) {
      const msg = err?.response?.data?.error ?? 'Check-out failed';
      setError(msg);
    } finally {
      setIsUpdating(false);
    }
  }, [venueId, capacity]);

  return {
    venueId,
    setVenueId,
    capacity,
    isLoading,
    isUpdating,
    isPolling,
    lastUpdated,
    refresh,
    checkIn,
    checkOut,
    error,
  };
});
