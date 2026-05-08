// ============================================================
// API Service — Client-side HTTP client for backend communication
// Features: timeout, error handling, type-safe responses
// ============================================================

import type { ApiResponse, Trip, GenerateTripRequest, AdaptTripRequest, RefineTripRequest } from '@shared/types/index';

const API_BASE = '/api';

/** Default request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 60_000;

/**
 * Generic fetch wrapper with error handling, timeout, and type safety.
 * @param endpoint - API path (e.g. '/trips/generate')
 * @param options - Standard fetch options
 * @param timeoutMs - Override default timeout (default: 60s)
 */
async function apiCall<T>(
  endpoint: string,
  options?: RequestInit,
  timeoutMs: number = REQUEST_TIMEOUT_MS,
): Promise<ApiResponse<T>> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...options,
    });
    clearTimeout(timeout);

    const data: ApiResponse<T> = await response.json();

    if (!response.ok && !data.error) {
      return {
        success: false,
        error: { code: 'HTTP_ERROR', message: `Request failed with status ${response.status}` },
      };
    }

    return data;
  } catch (error) {
    clearTimeout(timeout);

    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        success: false,
        error: { code: 'TIMEOUT', message: 'Request timed out. The server may be busy — please try again.' },
      };
    }

    return {
      success: false,
      error: {
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error. Please check your connection.',
      },
    };
  }
}

/** Generate a new trip itinerary */
export async function generateTrip(request: GenerateTripRequest): Promise<ApiResponse<Trip>> {
  return apiCall<Trip>('/trips/generate', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/** Adapt an existing trip based on a disruption */
export async function adaptTrip(request: AdaptTripRequest): Promise<ApiResponse<Trip>> {
  return apiCall<Trip>('/trips/adapt', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/** Refine a trip based on natural language feedback */
export async function refineTrip(request: RefineTripRequest): Promise<ApiResponse<Trip>> {
  return apiCall<Trip>('/trips/refine', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

/** Fetch weather forecast for a city */
export async function getWeather(city: string, days: number = 5) {
  return apiCall<unknown>(`/weather?city=${encodeURIComponent(city)}&days=${days}`);
}

/** Health check — includes service availability info */
export async function healthCheck() {
  return apiCall<{
    status: string;
    timestamp: string;
    version: string;
    services: { groq: boolean; maps: boolean; weather: boolean };
  }>('/health', undefined, 5000);
}

// ── Profile / Trip Persistence ────────────────────────────────

/** Save a trip to the server (with user identity) */
export async function saveServerTrip(trip: Trip, userId: string): Promise<ApiResponse<Trip>> {
  return apiCall<Trip>('/profile/trips', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
    body: JSON.stringify(trip),
  });
}

/** Load all saved trips from the server */
export async function loadServerTrips(userId: string): Promise<ApiResponse<Trip[]>> {
  return apiCall<Trip[]>('/profile/trips', {
    headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
  });
}

/** Delete a trip from the server */
export async function deleteServerTrip(tripId: string, userId: string): Promise<ApiResponse<{ deleted: boolean }>> {
  return apiCall<{ deleted: boolean }>(`/profile/trips/${encodeURIComponent(tripId)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', 'X-User-Id': userId },
  });
}

