// ============================================================
// Server Tests — Gemini service + validation
// ============================================================

import { describe, it, expect } from 'vitest';
import { generateTripSchema, adaptTripSchema, weatherQuerySchema } from '../src/middleware/validate.js';

describe('Trip Validation Schemas', () => {
  it('should validate a correct trip generation request', () => {
    const validInput = {
      preferences: {
        destination: 'Tokyo',
        startDate: '2026-06-01',
        endDate: '2026-06-04',
        budget: 1500,
        currency: 'USD',
        travelStyle: ['culture', 'foodie'],
        constraints: {
          accessibility: false,
          kidFriendly: false,
          dietaryRestrictions: [],
          maxWalkingMinutes: 30,
        },
        pace: 'moderate',
      },
    };

    const result = generateTripSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject missing destination', () => {
    const invalidInput = {
      preferences: {
        destination: '',
        startDate: '2026-06-01',
        endDate: '2026-06-04',
        budget: 1500,
        currency: 'USD',
        travelStyle: ['culture'],
        constraints: {
          accessibility: false,
          kidFriendly: false,
          dietaryRestrictions: [],
          maxWalkingMinutes: 30,
        },
        pace: 'moderate',
      },
    };

    const result = generateTripSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should reject negative budget', () => {
    const invalidInput = {
      preferences: {
        destination: 'Paris',
        startDate: '2026-06-01',
        endDate: '2026-06-04',
        budget: -500,
        currency: 'USD',
        travelStyle: ['culture'],
        constraints: {
          accessibility: false,
          kidFriendly: false,
          dietaryRestrictions: [],
          maxWalkingMinutes: 30,
        },
        pace: 'moderate',
      },
    };

    const result = generateTripSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should reject invalid date format', () => {
    const invalidInput = {
      preferences: {
        destination: 'London',
        startDate: '06/01/2026',
        endDate: '2026-06-04',
        budget: 2000,
        currency: 'USD',
        travelStyle: ['adventure'],
        constraints: {
          accessibility: false,
          kidFriendly: false,
          dietaryRestrictions: [],
          maxWalkingMinutes: 30,
        },
        pace: 'packed',
      },
    };

    const result = generateTripSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });

  it('should reject empty travelStyle array', () => {
    const invalidInput = {
      preferences: {
        destination: 'Rome',
        startDate: '2026-06-01',
        endDate: '2026-06-04',
        budget: 1000,
        currency: 'EUR',
        travelStyle: [],
        constraints: {
          accessibility: false,
          kidFriendly: false,
          dietaryRestrictions: [],
          maxWalkingMinutes: 30,
        },
        pace: 'relaxed',
      },
    };

    const result = generateTripSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });
});

describe('Adapt Trip Validation', () => {
  it('should validate a correct disruption request', () => {
    const validInput = {
      tripId: 'trip_123',
      trip: { id: 'trip_123', days: [] },
      disruption: {
        type: 'weather',
        dayNumber: 2,
        description: 'Heavy rain expected all day',
      },
    };

    const result = adaptTripSchema.safeParse(validInput);
    expect(result.success).toBe(true);
  });

  it('should reject invalid disruption type', () => {
    const invalidInput = {
      tripId: 'trip_123',
      trip: { id: 'trip_123', days: [] },
      disruption: {
        type: 'earthquake',
        dayNumber: 1,
        description: 'Unexpected event',
      },
    };

    const result = adaptTripSchema.safeParse(invalidInput);
    expect(result.success).toBe(false);
  });
});

describe('Weather Query Validation', () => {
  it('should validate a correct weather query', () => {
    const result = weatherQuerySchema.safeParse({ city: 'Tokyo', days: 5 });
    expect(result.success).toBe(true);
  });

  it('should reject too many forecast days', () => {
    const result = weatherQuerySchema.safeParse({ city: 'Tokyo', days: 30 });
    expect(result.success).toBe(false);
  });

  it('should default days to 5', () => {
    const result = weatherQuerySchema.safeParse({ city: 'London' });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.days).toBe(5);
    }
  });
});
