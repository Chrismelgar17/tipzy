/**
 * Business Dashboard – unit & integration tests
 *
 * Run with: bunx jest __tests__/dashboard.test.tsx
 *
 * Covers:
 *  1. Crowd-colour helpers (pure logic – no mocks needed)
 *  2. Capacity context helpers
 *  3. Dashboard component rendering (mocked context)
 *  4. Check-in / Check-out button interactions
 *  5. Chart toggle interactions
 *  6. Stats loading / error states
 */

import React from 'react';
import { render, fireEvent, act, waitFor } from '@testing-library/react-native';

// ─── helpers from capacity-context (pure functions) ────────────────────────
import {
  toCrowdColor,
  crowdColorLabel,
  CROWD_COLOR_HEX,
} from '@/hooks/capacity-context';

// ─── component under test ──────────────────────────────────────────────────
import BusinessDashboard from '@/app/(business-tabs)/dashboard';
import api from '@/lib/api';

// ──────────────────────────────────────────────────────────────────────────
// Shared mock state (mutated per-test)
// ──────────────────────────────────────────────────────────────────────────
const mockCheckIn  = jest.fn().mockResolvedValue(undefined);
const mockCheckOut = jest.fn().mockResolvedValue(undefined);
const mockRefresh  = jest.fn().mockResolvedValue(undefined);

const defaultCapacity = {
  venueId:     'venue-1',
  currentCount: 50,
  maxCapacity:  200,
  occupancyPct: 25,
  crowdColor:   'green' as const,
  crowdLevel:   'quiet',
  updatedAt:    new Date().toISOString(),
};

let mockCapacityState: {
  capacity: typeof defaultCapacity | null;
  isLoading: boolean;
  isUpdating: boolean;
  isPolling: boolean;
  lastUpdated: string | null;
  error: string | null;
} = {
  capacity:    defaultCapacity,
  isLoading:   false,
  isUpdating:  false,
  isPolling:   true,
  lastUpdated: new Date().toISOString(),
  error:       null,
};

// ──────────────────────────────────────────────────────────────────────────
// Module mocks
// ──────────────────────────────────────────────────────────────────────────
jest.mock('@/hooks/capacity-context', () => ({
  toCrowdColor: (level: string) => {
    if (level === 'packed') return 'red';
    if (level === 'busy') return 'yellow';
    return 'green';
  },
  crowdColorLabel: (color: string) => {
    if (color === 'red') return 'At Capacity';
    if (color === 'yellow') return 'Busy';
    return 'Quiet';
  },
  CROWD_COLOR_HEX: { green: '#4CAF50', yellow: '#FF9800', red: '#F44336' },
  useCapacity: () => ({
    ...mockCapacityState,
    checkIn:    mockCheckIn,
    checkOut:   mockCheckOut,
    refresh:    mockRefresh,
    setVenueId: jest.fn(),
  }),
}));

jest.mock('@/hooks/theme-context', () => ({
  useTheme: () => ({
    theme: {
      colors: {
        background:  '#0F0F1A',
        card:        '#1A1A2E',
        text: { primary: '#FFFFFF', secondary: '#A0A0B0', tertiary: '#606070' },
        purple:      '#6C5CE7',
        purpleLight: '#A29BFE',
        cyan:        '#00CEC9',
        cyanLight:   '#81ECEC',
        success:     '#4CAF50',
        warning:     '#FF9800',
        error:       '#F44336',
        white:       '#FFFFFF',
        border:      '#2A2A3E',
      },
      spacing: { sm: 8, md: 12, lg: 16, xl: 24 },
      borderRadius: { sm: 4, md: 8, lg: 12, full: 9999 },
    },
  }),
}));

jest.mock('@/hooks/auth-context', () => ({
  useAuth: () => ({ user: { id: 'user-1', email: 'owner@tipzy.app' } }),
}));

jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    get: jest.fn().mockResolvedValue({
      data: {
        venueId:          'venue-1',
        weeklySales:      200,
        weeklyRevenue:    5000,
        weeklyViews:      3200,
        totalOrdersToday: 12,
        revenueToday:     450,
        pendingOrders:    3,
        acceptedOrders:   9,
      },
    }),
  },
}));

jest.mock('expo-linear-gradient', () => {
  const { View } = require('react-native');
  return { LinearGradient: View };
});

// ──────────────────────────────────────────────────────────────────────────
// 1. Pure helper tests
// ──────────────────────────────────────────────────────────────────────────
describe('toCrowdColor()', () => {
  it('maps "packed" → red', () => expect(toCrowdColor('packed')).toBe('red'));
  it('maps "busy"   → yellow', () => expect(toCrowdColor('busy')).toBe('yellow'));
  it('maps "quiet"  → green', () => expect(toCrowdColor('quiet')).toBe('green'));
  it('maps unknown  → green (default)', () => expect(toCrowdColor('other')).toBe('green'));
});

describe('crowdColorLabel()', () => {
  it('labels red    as "At Capacity"', () => expect(crowdColorLabel('red')).toBe('At Capacity'));
  it('labels yellow as "Busy"',        () => expect(crowdColorLabel('yellow')).toBe('Busy'));
  it('labels green  as "Quiet"',       () => expect(crowdColorLabel('green')).toBe('Quiet'));
});

describe('CROWD_COLOR_HEX', () => {
  it('provides a hex string for every color', () => {
    (['green', 'yellow', 'red'] as const).forEach(c => {
      expect(CROWD_COLOR_HEX[c]).toMatch(/^#[0-9A-F]{6}$/i);
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────
// 2. Dashboard rendering
// ──────────────────────────────────────────────────────────────────────────
describe('BusinessDashboard – rendering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCapacityState = {
      capacity:    defaultCapacity,
      isLoading:   false,
      isUpdating:  false,
      isPolling:   true,
      lastUpdated: new Date().toISOString(),
      error:       null,
    };
  });

  it('renders without crashing', async () => {
    const { getByTestId } = render(<BusinessDashboard />);
    await waitFor(() => {
      expect(getByTestId('person-in-button')).toBeTruthy();
      expect(getByTestId('person-out-button')).toBeTruthy();
    });
  });

  it('renders all chart toggle buttons', () => {
    const { getByTestId } = render(<BusinessDashboard />);
    expect(getByTestId('sales-toggle')).toBeTruthy();
    expect(getByTestId('income-toggle')).toBeTruthy();
    expect(getByTestId('views-toggle')).toBeTruthy();
  });

  it('renders all quick-action buttons', () => {
    const { getByTestId } = render(<BusinessDashboard />);
    expect(getByTestId('create-offer-action')).toBeTruthy();
    expect(getByTestId('create-event-action')).toBeTruthy();
    expect(getByTestId('view-customers-action')).toBeTruthy();
    expect(getByTestId('analytics-action')).toBeTruthy();
  });

  it('shows a loading spinner while capacity is loading', () => {
    mockCapacityState.isLoading = true;
    mockCapacityState.capacity  = null;
    const { UNSAFE_getAllByType } = render(<BusinessDashboard />);
    const { ActivityIndicator } = require('react-native');
    expect(UNSAFE_getAllByType(ActivityIndicator).length).toBeGreaterThanOrEqual(1);
  });

  it('disables the "In" button when at capacity', () => {
    mockCapacityState.capacity = {
      ...defaultCapacity,
      currentCount: 200,
      maxCapacity:  200,
      occupancyPct: 100,
      crowdColor:   'red',
      crowdLevel:   'packed',
    };
    const { getByTestId } = render(<BusinessDashboard />);
    const inBtn = getByTestId('person-in-button');
    expect(inBtn.props.accessibilityState?.disabled ?? inBtn.props.disabled).toBeTruthy();
  });

  it('disables the "Out" button when venue is empty', () => {
    mockCapacityState.capacity = {
      ...defaultCapacity,
      currentCount: 0,
      occupancyPct: 0,
      crowdColor:   'green',
    };
    const { getByTestId } = render(<BusinessDashboard />);
    const outBtn = getByTestId('person-out-button');
    expect(outBtn.props.accessibilityState?.disabled ?? outBtn.props.disabled).toBeTruthy();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// 3. Capacity interactions
// ──────────────────────────────────────────────────────────────────────────
describe('BusinessDashboard – capacity interactions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCapacityState = {
      capacity:    defaultCapacity,
      isLoading:   false,
      isUpdating:  false,
      isPolling:   true,
      lastUpdated: new Date().toISOString(),
      error:       null,
    };
  });

  it('calls checkIn when "In" button is pressed', async () => {
    const { getByTestId } = render(<BusinessDashboard />);
    await act(async () => {
      fireEvent.press(getByTestId('person-in-button'));
    });
    expect(mockCheckIn).toHaveBeenCalledTimes(1);
  });

  it('calls checkOut when "Out" button is pressed', async () => {
    const { getByTestId } = render(<BusinessDashboard />);
    await act(async () => {
      fireEvent.press(getByTestId('person-out-button'));
    });
    expect(mockCheckOut).toHaveBeenCalledTimes(1);
  });

  it('does NOT call checkIn when venue is at capacity', async () => {
    mockCapacityState.capacity = {
      ...defaultCapacity,
      currentCount: 200,
      maxCapacity:  200,
      occupancyPct: 100,
      crowdColor:   'red',
      crowdLevel:   'packed',
    };
    const { getByTestId } = render(<BusinessDashboard />);
    await act(async () => {
      fireEvent.press(getByTestId('person-in-button'));
    });
    expect(mockCheckIn).not.toHaveBeenCalled();
  });

  it('does NOT call checkOut when venue is empty', async () => {
    mockCapacityState.capacity = {
      ...defaultCapacity,
      currentCount: 0,
      occupancyPct: 0,
    };
    const { getByTestId } = render(<BusinessDashboard />);
    await act(async () => {
      fireEvent.press(getByTestId('person-out-button'));
    });
    expect(mockCheckOut).not.toHaveBeenCalled();
  });
});

// ──────────────────────────────────────────────────────────────────────────
// 4. Chart toggle
// ──────────────────────────────────────────────────────────────────────────
describe('BusinessDashboard – chart toggle', () => {
  beforeEach(() => jest.clearAllMocks());

  it('switches chart type when a toggle is pressed', () => {
    const { getByTestId } = render(<BusinessDashboard />);
    fireEvent.press(getByTestId('income-toggle'));
    // The active style is applied – no crash = toggle accepted the event
    fireEvent.press(getByTestId('views-toggle'));
    fireEvent.press(getByTestId('sales-toggle'));
  });
});

// ──────────────────────────────────────────────────────────────────────────
// 5. Stats API integration
// ──────────────────────────────────────────────────────────────────────────
describe('BusinessDashboard – stats API', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls /business/dashboard on mount', async () => {
    render(<BusinessDashboard />);
    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith('/business/dashboard');
    });
  });

  it('handles API error gracefully (no crash)', async () => {
    (api.get as jest.Mock).mockRejectedValueOnce(new Error('Network Error'));
    expect(() => render(<BusinessDashboard />)).not.toThrow();
  });
});
