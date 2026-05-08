// ============================================================
// Gemini AI Agent — Core Intelligence Engine
// Uses Gemini 2.0 Flash with function calling for travel planning
// ============================================================

import { GoogleGenAI, Type } from '@google/genai';
import type { Trip, TripPreferences } from '../../../shared/types/index.js';
import { getWeatherForecast } from './weather.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('Gemini');

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// ── Tool Declarations for Function Calling ───────────────────

const toolDeclarations = [
  {
    name: 'getWeatherForecast',
    description: 'Get weather forecast for a city. Returns daily high/low temperatures, conditions, and rain probability.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        city: { type: Type.STRING, description: 'City name (e.g., "Tokyo", "Paris")' },
        days: { type: Type.NUMBER, description: 'Number of days to forecast (1-7)' },
      },
      required: ['city'],
    },
  },
  {
    name: 'searchPlaces',
    description: 'Search for places/attractions in a city by query. Returns place names, descriptions, categories, ratings, coordinates, and Google Place IDs.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        city: { type: Type.STRING, description: 'The city to search in' },
        query: { type: Type.STRING, description: 'Search query (e.g., "best ramen restaurants", "historic temples", "indoor museums")' },
        limit: { type: Type.NUMBER, description: 'Max results to return (default 5)' },
      },
      required: ['city', 'query'],
    },
  },
  {
    name: 'getDirections',
    description: 'Get directions and travel time between two locations. Returns duration in minutes, distance, and travel mode.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        origin: { type: Type.STRING, description: 'Starting location (place name or address)' },
        destination: { type: Type.STRING, description: 'End location (place name or address)' },
        mode: { type: Type.STRING, description: 'Travel mode: walking, transit, or driving' },
      },
      required: ['origin', 'destination'],
    },
  },
];

// ── Tool Execution ───────────────────────────────────────────

async function executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'getWeatherForecast': {
      const city = args.city as string;
      const days = (args.days as number) ?? 5;
      return await getWeatherForecast(city, days);
    }
    case 'searchPlaces': {
      const city = args.city as string;
      const query = args.query as string;
      const limit = (args.limit as number) ?? 5;
      return await searchPlacesWithMaps(city, query, limit);
    }
    case 'getDirections': {
      const origin = args.origin as string;
      const destination = args.destination as string;
      const mode = (args.mode as string) ?? 'walking';
      return await getDirectionsEstimate(origin, destination, mode);
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// ── Google Places Search (via Text Search) ───────────────────

async function searchPlacesWithMaps(city: string, query: string, limit: number) {
  const apiKey = process.env.GCP_MAPS_API_KEY;
  if (!apiKey) {
    return generateMockPlaces(city, query, limit);
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query + ' in ' + city)}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json() as {
      results: Array<{
        place_id: string;
        name: string;
        formatted_address: string;
        geometry: { location: { lat: number; lng: number } };
        rating?: number;
        types?: string[];
        photos?: Array<{ photo_reference: string }>;
      }>;
    };

    return data.results.slice(0, limit).map((place) => ({
      placeId: place.place_id,
      name: place.name,
      address: place.formatted_address,
      lat: place.geometry.location.lat,
      lng: place.geometry.location.lng,
      rating: place.rating ?? 4.0,
      types: place.types ?? [],
      photoRef: place.photos?.[0]?.photo_reference ?? null,
    }));
  } catch (error) {
    log.warn('Places search failed, using mock data', { error: String(error) });
    return generateMockPlaces(city, query, limit);
  }
}

function generateMockPlaces(city: string, query: string, limit: number) {
  return Array.from({ length: limit }, (_, i) => ({
    placeId: `mock_place_${city}_${i}`,
    name: `${query} Spot ${i + 1} in ${city}`,
    address: `${100 + i} Main Street, ${city}`,
    lat: 35.6762 + (Math.random() - 0.5) * 0.05,
    lng: 139.6503 + (Math.random() - 0.5) * 0.05,
    rating: 3.5 + Math.random() * 1.5,
    types: ['point_of_interest'],
    photoRef: null,
  }));
}

// ── Directions Estimate ──────────────────────────────────────

async function getDirectionsEstimate(origin: string, destination: string, mode: string) {
  const apiKey = process.env.GCP_MAPS_API_KEY;
  if (!apiKey) {
    return {
      origin, destination, mode,
      durationMinutes: 10 + Math.floor(Math.random() * 20),
      distance: `${(0.5 + Math.random() * 3).toFixed(1)} km`,
    };
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&mode=${mode}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json() as {
      routes: Array<{
        legs: Array<{
          duration: { value: number; text: string };
          distance: { text: string };
        }>;
      }>;
    };

    const leg = data.routes[0]?.legs[0];
    return {
      origin, destination, mode,
      durationMinutes: leg ? Math.ceil(leg.duration.value / 60) : 15,
      distance: leg?.distance?.text ?? '1.0 km',
    };
  } catch (error) {
    log.warn('Directions fetch failed, using estimate', { error: String(error) });
    return {
      origin, destination, mode,
      durationMinutes: 15,
      distance: '1.0 km',
    };
  }
}

// ── System Prompt ────────────────────────────────────────────

const SYSTEM_PROMPT = `You are RoamGenie, an expert AI travel planning assistant. You create detailed, realistic, and personalized travel itineraries.

CRITICAL RULES:
1. Use your extensive knowledge to generate a realistic and incredible itinerary.
2. Generate itineraries that are PHYSICALLY FEASIBLE — respect transit times, opening hours, and human energy levels.
3. For "relaxed" pace: 3-4 activities/day. "moderate": 4-5. "packed": 6-7.
4. Always account for meal times (breakfast 8-9, lunch 12-1:30, dinner 7-8:30).
5. Score each day's feasibility from 0-100 based on packing, transit burden, and variety.
6. Respect all user constraints (accessibility, kid-friendly, dietary restrictions).
7. You DO NOT need to look up real Place IDs or exact coordinates—just provide the name and address, and the backend will enrich it.
8. NEVER output plain text, explanations, or apologies. YOUR ENTIRE RESPONSE MUST BE THE RAW JSON OBJECT.

OUTPUT FORMAT: Always respond with valid JSON matching this exact structure (no markdown blocks, no backticks, just the JSON string):
{
  "name": "Trip name",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "dayNumber": 1,
      "weather": { "high": 25, "low": 18, "condition": "Clear", "icon": "01d", "rainProbability": 10, "description": "clear sky" },
      "activities": [
        {
          "id": "unique_id",
          "name": "Activity name",
          "description": "Why this is great for the traveler",
          "placeId": "google_place_id",
          "category": "food|culture|nature|shopping|nightlife|transit|accommodation|entertainment",
          "startTime": "09:00",
          "duration": 90,
          "cost": 15,
          "location": { "lat": 35.6762, "lng": 139.6503, "address": "Full address" },
          "weather": { "condition": "Clear", "isOutdoor": true },
          "transitFromPrevious": { "mode": "walking", "duration": 12, "distance": "0.8 km" }
        }
      ],
      "feasibilityScore": 85
    }
  ],
  "totalCost": 450
}`;

const FALLBACK_MODELS = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-2.5-pro'];

async function executeWithFallback(promptOrContents: any, config: any) {
  let lastError: Error | null = null;
  for (const model of FALLBACK_MODELS) {
    try {
      log.info(`Attempting generation with model: ${model}`);
      const response = await genai.models.generateContent({
        model,
        contents: promptOrContents,
        config,
      });
      return response;
    } catch (e: any) {
      lastError = e;
      log.warn(`Model ${model} failed`, { error: e.message || String(e) });
      if (e.status === 400 || e.status === 403) {
        // Stop retrying on bad request or auth errors
        throw e;
      }
      // Continue to next model on 503, 429, 404
    }
  }
  throw new Error(`All models failed. Last error: ${lastError?.message}`);
}

// ── Main Generation Function ─────────────────────────────────

export async function generateTrip(preferences: TripPreferences, userMessage?: string): Promise<Trip> {
  const prompt = buildGenerationPrompt(preferences, userMessage);

  // Initial call WITHOUT tools to get raw generation fast
  let response = await executeWithFallback(prompt, {
    systemInstruction: SYSTEM_PROMPT,
    temperature: 0.7,
    responseMimeType: "application/json",
  });

  const text = response.text ?? '';
  let trip = parseGeminiResponse(text, preferences);
  
  // Post-process the trip with APIs
  trip = await enrichTripWithAPIs(trip);
  return trip;
}

// ── API Enrichment Function ──────────────────────────────────
async function enrichTripWithAPIs(trip: Trip): Promise<Trip> {
  const updatedDays = await Promise.all(trip.days.map(async (day) => {
    // Determine the main city for the day based on the first activity or destination
    const firstActivity = day.activities[0];
    const citySearch = firstActivity ? firstActivity.location.address : trip.preferences.destination;
    
    // Fetch weather for the day (rough estimation using city)
    let weatherInfo = day.weather;
    try {
       const forecast = await getWeatherForecast(citySearch, 5);
       weatherInfo = {
         high: forecast.forecast[0]?.high ?? 25,
         low: forecast.forecast[0]?.low ?? 18,
         condition: forecast.forecast[0]?.condition ?? "Clear",
         icon: "01d",
         rainProbability: forecast.forecast[0]?.rainProbability ?? 10,
         description: forecast.forecast[0]?.condition ?? "clear sky"
       };
    } catch (e) {
       log.warn('Weather enrichment failed', { error: String(e) });
    }

    const updatedActivities = await Promise.all(day.activities.map(async (act, index) => {
       // Search places for exact coordinates and Place ID
       try {
         const places = await searchPlacesWithMaps(citySearch, act.name, 1);
         if (places && places.length > 0) {
           const p = places[0];
           act.placeId = p.placeId;
           act.location.lat = p.lat;
           act.location.lng = p.lng;
           if (!act.location.address) act.location.address = p.address;
         }
       } catch (e) {
         log.warn('Place enrichment failed', { error: String(e) });
       }

       // Get directions from previous activity
       if (index > 0) {
         const prevAct = day.activities[index - 1];
         try {
           const originStr = prevAct.location.lat + ',' + prevAct.location.lng;
           const destStr = act.location.lat + ',' + act.location.lng;
           const dir = await getDirectionsEstimate(originStr, destStr, act.transitFromPrevious?.mode || 'driving');
           act.transitFromPrevious = {
             mode: act.transitFromPrevious?.mode || 'driving',
             duration: dir.durationMinutes,
             distance: dir.distance,
           };
         } catch (e) {
           log.warn('Directions enrichment failed', { error: String(e) });
         }
       }
       return act;
    }));

    return { ...day, weather: weatherInfo, activities: updatedActivities };
  }));

  return { ...trip, days: updatedDays };
}

// ── Adaptation Function (Weather Disruption) ─────────────────

export async function adaptTrip(
  trip: Trip,
  disruption: { type: string; dayNumber: number; description: string }
): Promise<Trip> {
  const prompt = `The traveler's trip to ${trip.preferences.destination} has a disruption:

DISRUPTION: ${disruption.description}
AFFECTED DAY: Day ${disruption.dayNumber}
TYPE: ${disruption.type}

Current itinerary for the affected day:
${JSON.stringify(trip.days.find((d) => d.dayNumber === disruption.dayNumber), null, 2)}

Full trip preferences:
${JSON.stringify(trip.preferences, null, 2)}

INSTRUCTIONS:
1. Find INDOOR alternatives if weather is the issue, or alternative activities for closures/delays.
2. Ensure the new schedule is feasible.
3. Preserve the overall trip structure — only modify the affected day.
4. Return the COMPLETE updated trip JSON (all days, not just the affected one).`;

  let response = await executeWithFallback(prompt, {
    systemInstruction: SYSTEM_PROMPT,
    temperature: 0.5,
    responseMimeType: "application/json",
  });

  const text = response.text ?? '';
  let updatedTrip = parseGeminiResponse(text, trip.preferences);
  updatedTrip = await enrichTripWithAPIs(updatedTrip);
  return updatedTrip;
}

// ── Refinement Function (Conversational) ─────────────────────

export async function refineTrip(
  tripId: string,
  trip: Trip,
  message: string
): Promise<Trip> {
  const prompt = `The traveler wants to refine their trip to ${trip.preferences.destination}.

CURRENT TRIP:
${JSON.stringify(trip, null, 2)}

USER REQUEST: ${message}

INSTRUCTIONS:
1. Update the itinerary based on the user's request.
2. Return the COMPLETE updated trip JSON.
3. Only change what the user asked for — preserve everything else.`;

  let response = await executeWithFallback(prompt, {
    systemInstruction: SYSTEM_PROMPT,
    temperature: 0.6,
    responseMimeType: "application/json",
  });

  const text = response.text ?? '';
  let updatedTrip = parseGeminiResponse(text, trip.preferences);
  updatedTrip = await enrichTripWithAPIs(updatedTrip);
  return updatedTrip;
}

// ── Helpers ──────────────────────────────────────────────────

function buildGenerationPrompt(prefs: TripPreferences, userMessage?: string): string {
  const dayCount = Math.ceil(
    (new Date(prefs.endDate).getTime() - new Date(prefs.startDate).getTime()) / (1000 * 60 * 60 * 24)
  ) + 1;

  return `Plan a ${dayCount}-day trip to ${prefs.destination} from ${prefs.startDate} to ${prefs.endDate}.

PREFERENCES:
${prefs.origin ? `- Origin (starting location): ${prefs.origin}` : ''}
- Destination: ${prefs.destination}
- Budget: ${prefs.budget} ${prefs.currency} (MUST INCLUDE ESTIMATED FLIGHT/TRAVEL COST FROM ORIGIN)
- Travel styles: ${prefs.travelStyle.join(', ')}
- Trip type: ${prefs.tripType}
- Pace: ${prefs.pace}
- Max walking: ${prefs.constraints.maxWalkingMinutes} minutes
- Accessibility needed: ${prefs.constraints.accessibility}
- Kid-friendly: ${prefs.constraints.kidFriendly}
- Dietary restrictions: ${prefs.constraints.dietaryRestrictions.join(', ') || 'None'}

${userMessage ? `ADDITIONAL REQUEST: ${userMessage}` : ''}

STEPS:
1. Generate the best sequence of places and activities.
2. Provide dummy or estimated coordinates if needed.
3. Build a complete, feasible itinerary respecting all constraints.
4. Return the JSON response.`;
}

function parseGeminiResponse(text: string, preferences: TripPreferences): Trip {
  // Extract JSON from potential markdown code blocks
  let jsonStr = text;
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch?.[1]) {
    jsonStr = jsonMatch[1];
  }

  try {
    const parsed = JSON.parse(jsonStr.trim());
    return {
      id: `trip_${Date.now()}`,
      userId: 'anonymous',
      name: parsed.name ?? `Trip to ${preferences.destination}`,
      preferences,
      days: parsed.days ?? [],
      totalCost: parsed.totalCost ?? 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft',
    };
  } catch (error) {
    log.error('Failed to parse Gemini response', { error: String(error), rawPreview: text.substring(0, 300) });

    // Return a minimal trip so the UI doesn't break
    return {
      id: `trip_${Date.now()}`,
      userId: 'anonymous',
      name: `Trip to ${preferences.destination}`,
      preferences,
      days: [],
      totalCost: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'draft',
    };
  }
}
