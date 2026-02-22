import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { venueService } from '@/lib/venue.service';
import { mockVenues } from '@/mocks/venues';
import type { Venue } from '@/types/models';

const POLL_INTERVAL_MS = 30_000; // 30 s live crowd refresh

interface VenuesState {
  venues: Venue[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const VenuesContext = createContext<VenuesState>({
  venues: mockVenues,
  isLoading: false,
  error: null,
  refresh: async () => {},
});

export function VenuesProvider({ children }: { children: React.ReactNode }) {
  const [venues, setVenues] = useState<Venue[]>(mockVenues); // start with mocks so UI renders immediately
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const fetchVenues = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const data = await venueService.getVenues();
      // Only replace if we got results; keep mocks otherwise so the UI isn't empty
      if (data.length > 0) {
        setVenues(data);
      }
      setError(null);
    } catch (err: any) {
      // On initial load show the error; on background polls stay silent
      if (!silent) {
        console.warn('[VenuesContext] Failed to fetch venues:', err?.message);
        setError('Could not load venues. Showing cached data.');
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchVenues(false);
  }, [fetchVenues]);

  // Background polling (silent – no spinner, no error banner)
  useEffect(() => {
    pollRef.current = setInterval(() => {
      if (appStateRef.current === 'active') {
        fetchVenues(true);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [fetchVenues]);

  // Pause polling when app is backgrounded; resume + immediate refresh on foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        fetchVenues(true);
      }
      appStateRef.current = nextState;
    });
    return () => sub.remove();
  }, [fetchVenues]);

  const refresh = useCallback(async () => fetchVenues(false), [fetchVenues]);

  return (
    <VenuesContext.Provider value={{ venues, isLoading, error, refresh }}>
      {children}
    </VenuesContext.Provider>
  );
}

export function useVenues(): VenuesState {
  return useContext(VenuesContext);
}
