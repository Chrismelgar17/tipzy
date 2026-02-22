export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  dob?: Date;
  favorites: string[];
  createdAt: Date;
  role: 'user' | 'clubAdmin' | 'superAdmin' | 'business';
  hasCompletedOnboarding?: boolean;
  phone?: string;
  bio?: string;
  emailVerified?: boolean;
}

/** Traffic-light crowd colour shown in cards and the customer map */
export type CrowdColor = 'green' | 'yellow' | 'red';

/**
 * Maps the backend crowdLevel string to a traffic-light CrowdColor.
 *  quiet / moderate → green
 *  busy             → yellow
 *  packed           → red
 */
export function crowdColorFromLevel(level: Venue['crowdLevel']): CrowdColor {
  if (level === 'packed') return 'red';
  if (level === 'busy') return 'yellow';
  return 'green';
}

export interface Venue {
  id: string;
  name: string;
  photos: string[];
  address: string;
  geo: { lat: number; lng: number };
  timezone: string;
  hours: Record<string, { open: string; close: string }>;
  minAge: number;
  minEntryAge: '18+' | '21+';
  dressCode: string;
  capacity: number;
  crowdCount: number;
  maxCapacity: number;
  currentCount: number;
  crowdLevel: 'quiet' | 'moderate' | 'busy' | 'packed';
  /** Derived traffic-light colour – green (<60 %), yellow (60–85 %), red (>85 %) */
  crowdColor?: CrowdColor;
  capacityStatus: 'quiet' | 'busy' | 'full';
  genres: string[];
  featuredRank: number;
  ownerUserId: string;
  createdAt: Date;
  priceLevel: 1 | 2 | 3 | 4;
  distance?: number;
  closingTime?: string;
  rating?: number;
}

export interface Event {
  id: string;
  venueId: string;
  venueName?: string;
  title: string;
  startAt: Date;
  endAt: Date;
  closingTime: Date;
  products: Product[];
  images: string[];
  status: 'draft' | 'published' | 'soldout' | 'ended';
  maxCheckIns?: number;
  description?: string;
  lineup?: string[];
  friendsGoing?: number;
}

export interface Product {
  id: string;
  name: 'General Entry' | 'VIP' | 'Table' | 'Bottle Service';
  price: number;
  currency: string;
  qtyTotal: number;
  qtySold: number;
  description?: string;
  perks?: string[];
}

export interface Order {
  id: string;
  userId: string;
  eventId: string;
  items: OrderItem[];
  amountTotal: number;
  currency: string;
  stripePaymentIntentId?: string;
  status: 'requires_payment' | 'paid' | 'refunded' | 'canceled';
  createdAt: Date;
}

/**
 * Richer order view used in the business Orders screen.
 * Extends the base Order with venue/customer context and
 * an explicit business-facing status lifecycle.
 */
export interface VenueOrder {
  id: string;
  orderId: string;
  userId: string;
  customerName: string;
  customerEmail?: string;
  venueId: string;
  venueName: string;
  eventId: string;
  eventTitle: string;
  product: string;
  quantity: number;
  amountTotal: number;
  currency: string;
  /** Business-facing lifecycle: pending → accepted | rejected → completed | refunded */
  businessStatus: 'pending' | 'accepted' | 'rejected' | 'completed' | 'refunded';
  orderDate: Date;
  notes?: string;
}

/** Real-time capacity snapshot for a venue */
export interface VenueCapacity {
  venueId: string;
  venueName: string;
  currentCount: number;
  maxCapacity: number;
  /** Percentage 0-100 */
  occupancyPct: number;
  crowdLevel: 'quiet' | 'moderate' | 'busy' | 'packed';
  /** Traffic-light mapping of crowdLevel */
  crowdColor: CrowdColor;
  updatedAt: Date;
}

/** Business dashboard summary stats */
export interface BusinessDashboardStats {
  venueId: string;
  totalOrdersToday: number;
  revenueToday: number;
  pendingOrders: number;
  acceptedOrders: number;
  weeklyRevenue: number;
  weeklySales: number;
  weeklyViews: number;
}

export interface OrderItem {
  productId: string;
  productName: string;
  qty: number;
  unitPrice: number;
}

export interface Ticket {
  id: string;
  orderId: string;
  userId: string;
  eventId: string;
  eventTitle: string;
  venueName: string;
  productId: string;
  productName: string;
  qrCode: string;
  status: 'valid' | 'used' | 'refunded';
  checkedInAt?: Date;
  eventDate: Date;
  venueAddress: string;
}

export interface Chat {
  id: string;
  type: 'dm' | 'group' | 'event';
  name: string;
  memberIds: string[];
  eventId?: string;
  createdAt: Date;
  lastMessage?: string;
  lastMessageTime?: Date;
  unreadCount?: number;
  avatarUrl?: string;
}

export interface Message {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  imageUrl?: string;
  createdAt: Date;
}

export interface PaymentMethod {
  id: string;
  type: 'card' | 'paypal' | 'apple_pay' | 'google_pay';
  cardholderName?: string;
  cardNumber?: string; // Last 4 digits
  expirationDate?: string;
  isDefault: boolean;
  createdAt: Date;
}

export interface NotificationSettings {
  pushNotifications: boolean;
  emailNotifications: boolean;
  inAppNotifications: boolean;
}

export interface PrivacySettings {
  twoFactorEnabled: boolean;
  dataSharing: boolean;
}

export interface AppSettings {
  language: 'en' | 'es' | 'fr';
  theme: 'light' | 'dark';
}

export interface BusinessProfile {
  id: string;
  email: string;
  businessName: string;
  location: string;
  phone: string;
  website?: string;
  category: string;
  services: string[];
  description: string;
  galleryImages: string[];
  workHours: WorkHours;
  maxCapacity: number;
  currentCount: number;
  minEntryAge: '18+' | '21+';
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
}

export interface WorkHours {
  monday: DayHours;
  tuesday: DayHours;
  wednesday: DayHours;
  thursday: DayHours;
  friday: DayHours;
  saturday: DayHours;
  sunday: DayHours;
}

export interface DayHours {
  isOpen: boolean;
  openTime: string; // "09:00"
  closeTime: string; // "22:00"
}

export type UserType = 'customer' | 'business';

export interface OnboardingState {
  userType: UserType | null;
  hasCompletedOnboarding: boolean;
}