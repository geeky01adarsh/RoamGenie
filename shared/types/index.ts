// ============================================================
// RoamGenie — Shared Type Definitions
// Used by both client and server for type safety across the stack
// ============================================================

/** User's travel preferences for trip generation */
export interface TripPreferences {
  origin?: string;
  destination: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  travelStyle: TravelStyle[];
  tripType: TripType;
  constraints: TripConstraints;
  pace: 'relaxed' | 'moderate' | 'packed';
  /** For 'meet-in-middle' trip type — two origin cities */
  origins?: { cityA: string; cityB: string };
}

export type TripType = 'solo' | 'couple' | 'family' | 'bachelor' | 'office' | 'meet-in-middle';

export type TravelStyle = 'adventure' | 'relaxation' | 'culture' | 'foodie' | 'nightlife' | 'nature' | 'romantic';

export interface TripConstraints {
  accessibility: boolean;
  kidFriendly: boolean;
  dietaryRestrictions: string[];
  maxWalkingMinutes: number;
}

/** A single activity/stop in the itinerary */
export interface Activity {
  id: string;
  name: string;
  description: string;
  placeId: string;
  category: ActivityCategory;
  startTime: string;
  duration: number;
  cost: number;
  location: GeoLocation;
  weather: ActivityWeather;
  transitFromPrevious?: TransitInfo;
  imageUrl?: string;
  rating?: number;
}

export type ActivityCategory = 'food' | 'culture' | 'nature' | 'shopping' | 'nightlife' | 'transit' | 'accommodation' | 'entertainment';

export interface GeoLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface ActivityWeather {
  condition: string;
  isOutdoor: boolean;
}

export interface TransitInfo {
  mode: 'walking' | 'transit' | 'driving' | 'cycling';
  duration: number;
  distance: string;
}

/** A single day in the trip */
export interface TripDay {
  date: string;
  dayNumber: number;
  weather: DayWeather;
  activities: Activity[];
  feasibilityScore: number;
}

export interface DayWeather {
  high: number;
  low: number;
  condition: string;
  icon: string;
  rainProbability: number;
  description: string;
}

/** Complete trip object */
export interface Trip {
  id: string;
  userId: string;
  name: string;
  preferences: TripPreferences;
  days: TripDay[];
  totalCost: number;
  costBreakdown?: CostBreakdown;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'active' | 'completed';
}

/** Cost breakdown for the trip estimator */
export interface CostBreakdown {
  accommodation: number;
  food: number;
  transport: number;
  activities: number;
  shopping: number;
  misc: number;
}

/** A disruption event that triggers re-planning */
export interface DisruptionEvent {
  type: 'weather' | 'closure' | 'delay';
  severity: 'low' | 'medium' | 'high';
  affectedDayNumber: number;
  description: string;
  originalActivities: Activity[];
  suggestedActivities: Activity[];
}

/** Chat message for the AI conversation */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  tripUpdate?: Partial<Trip>;
}

/** API response wrapper */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

/** Trip generation request payload */
export interface GenerateTripRequest {
  preferences: TripPreferences;
  message?: string;
}

/** Trip adaptation request payload */
export interface AdaptTripRequest {
  tripId: string;
  trip: Trip;
  disruption: {
    type: DisruptionEvent['type'];
    dayNumber: number;
    description: string;
  };
}

/** Refinement request (conversational) */
export interface RefineTripRequest {
  tripId: string;
  trip: Trip;
  message: string;
}
