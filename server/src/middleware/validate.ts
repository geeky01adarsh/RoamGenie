// ============================================================
// Input Validation Schemas (Zod)
// Validates and sanitizes all API request payloads
// ============================================================

import { z } from 'zod';

/** Validates trip preferences from the client */
export const tripPreferencesSchema = z.object({
  origin: z.string().min(2).max(100).trim().optional(),
  destination: z.string().min(2).max(100).trim(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  budget: z.number().positive().max(1_000_000),
  currency: z.string().length(3).default('USD'),
  travelStyle: z.array(
    z.enum(['adventure', 'relaxation', 'culture', 'foodie', 'nightlife', 'nature', 'romantic'])
  ).min(1).max(5),
  tripType: z.enum(['solo', 'couple', 'family', 'bachelor', 'office', 'meet-in-middle']).default('solo'),
  constraints: z.object({
    accessibility: z.boolean().default(false),
    kidFriendly: z.boolean().default(false),
    dietaryRestrictions: z.array(z.string().max(50)).max(10).default([]),
    maxWalkingMinutes: z.number().min(5).max(120).default(30),
  }),
  pace: z.enum(['relaxed', 'moderate', 'packed']).default('moderate'),
  origins: z.object({
    cityA: z.string().min(2).max(100),
    cityB: z.string().min(2).max(100),
  }).optional(),
});

/** Validates trip generation request */
export const generateTripSchema = z.object({
  preferences: tripPreferencesSchema,
  message: z.string().max(1000).optional(),
});

/** Validates trip adaptation (disruption) request */
export const adaptTripSchema = z.object({
  tripId: z.string().min(1),
  trip: z.any(), // Full trip object — validated structurally by Gemini
  disruption: z.object({
    type: z.enum(['weather', 'closure', 'delay']),
    dayNumber: z.number().int().positive(),
    description: z.string().min(5).max(500),
  }),
});

/** Validates conversational refinement request */
export const refineTripSchema = z.object({
  tripId: z.string().min(1),
  trip: z.any(),
  message: z.string().min(2).max(1000),
});

/** Validates weather forecast request */
export const weatherQuerySchema = z.object({
  city: z.string().min(2).max(100).trim(),
  days: z.number().int().min(1).max(7).default(5),
});

export type GenerateTripInput = z.infer<typeof generateTripSchema>;
export type AdaptTripInput = z.infer<typeof adaptTripSchema>;
export type RefineTripInput = z.infer<typeof refineTripSchema>;
export type WeatherQueryInput = z.infer<typeof weatherQuerySchema>;
