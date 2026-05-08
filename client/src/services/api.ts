// ============================================================
// API Service — Client-side HTTP client for backend communication
// ============================================================

import type { ApiResponse, Trip, GenerateTripRequest, AdaptTripRequest, RefineTripRequest } from '@shared/types/index';

const API_BASE = '/api';

/** Generic fetch wrapper with error handling */
async function apiCall<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });

    const data: ApiResponse<T> = await response.json();

    if (!response.ok && !data.error) {
      return {
        success: false,
        error: { code: 'HTTP_ERROR', message: `Request failed with status ${response.status}` },
      };
    }

    return data;
  } catch (error) {
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

/** Health check */
export async function healthCheck() {
  return apiCall<{ status: string; timestamp: string }>('/health');
}
