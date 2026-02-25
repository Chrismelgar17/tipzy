import api from "./api";
import { Venue } from "@/types/models";

export interface VenueListResponse {
  venues: Venue[];
  total: number;
}

export const venueService = {
  /** Fetch all approved venues */
  getVenues: async (): Promise<Venue[]> => {
    const { data } = await api.get<VenueListResponse>("/venues");
    return data.venues.map(normalizeVenue);
  },

  /** Fetch a single approved venue by id */
  getVenue: async (id: string): Promise<Venue> => {
    const { data } = await api.get<Venue>(`/venues/${id}`);
    return normalizeVenue(data);
  },
};

/** Ensure all required Venue fields have safe defaults */
function normalizeVenue(v: any): Venue {
  return {
    id: v.id,
    name: v.name ?? "Unknown Venue",
    photos: Array.isArray(v.photos) ? v.photos : [],
    address: v.address ?? "",
    geo: (v.geo?.lat != null && v.geo?.lng != null && (v.geo.lat !== 0 || v.geo.lng !== 0)) ? v.geo : null,
    timezone: v.timezone ?? "America/New_York",
    hours: v.hours ?? {},
    minAge: v.minAge ?? 18,
    minEntryAge: v.minEntryAge ?? "18+",
    dressCode: v.dressCode ?? "Casual",
    capacity: v.capacity ?? 100,
    maxCapacity: v.maxCapacity ?? v.capacity ?? 100,
    crowdCount: v.crowdCount ?? v.currentCount ?? 0,
    currentCount: v.currentCount ?? v.crowdCount ?? 0,
    crowdLevel: v.crowdLevel ?? "quiet",
    capacityStatus: v.capacityStatus ?? "quiet",
    genres: Array.isArray(v.genres) ? v.genres : [],
    featuredRank: v.featuredRank ?? 0,
    ownerUserId: v.ownerUserId ?? "",
    createdAt: v.createdAt ? new Date(v.createdAt) : new Date(),
    priceLevel: v.priceLevel ?? 2,
    rating: v.rating ?? undefined,
    distance: v.distance,
    closingTime: v.closingTime,
  };
}
