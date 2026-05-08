// ============================================================
// Trip Routes — API endpoints for trip CRUD + AI operations
// ============================================================

import { Router, type Request, type Response } from 'express';
import { generateTrip, adaptTrip, refineTrip } from '../services/groq.js';
import { generateTripSchema, adaptTripSchema, refineTripSchema } from '../middleware/validate.js';
import { createLogger } from '../utils/logger.js';
import type { ApiResponse, Trip } from '../../../shared/types/index.js';

const log = createLogger('TripRoute');
export const tripRouter = Router();

tripRouter.post('/generate', async (req: Request, res: Response) => {
  try {
    const parsed = generateTripSchema.safeParse(req.body);
    if (!parsed.success) {
      log.warn('Validation failed', { errors: parsed.error.errors.map(e => e.message) });
      const response: ApiResponse<never> = {
        success: false,
        error: { code: 'VALIDATION_ERROR', message: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ') },
      };
      res.status(400).json(response);
      return;
    }

    log.info('Generating trip', { destination: parsed.data.preferences.destination, tripType: parsed.data.preferences.tripType });
    const startTime = Date.now();
    const trip = await generateTrip(parsed.data.preferences, parsed.data.message);
    log.info('Trip generated', { duration: `${Date.now() - startTime}ms`, days: trip.days.length, cost: trip.totalCost });

    const response: ApiResponse<Trip> = { success: true, data: trip };
    res.json(response);
  } catch (error) {
    log.error('Generation failed', { error: error instanceof Error ? error.message : String(error) });
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate trip.';
    res.status(500).json({ success: false, error: { code: 'GENERATION_FAILED', message: errorMessage } });
  }
});

tripRouter.post('/adapt', async (req: Request, res: Response) => {
  try {
    const parsed = adaptTripSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ') } });
      return;
    }

    log.info('Adapting trip', { type: parsed.data.disruption.type, day: parsed.data.disruption.dayNumber });
    const startTime = Date.now();
    const adaptedTrip = await adaptTrip(parsed.data.trip as Trip, parsed.data.disruption);
    log.info('Trip adapted', { duration: `${Date.now() - startTime}ms` });

    res.json({ success: true, data: adaptedTrip } as ApiResponse<Trip>);
  } catch (error) {
    log.error('Adaptation failed', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: { code: 'ADAPTATION_FAILED', message: 'Failed to adapt trip.' } });
  }
});

tripRouter.post('/refine', async (req: Request, res: Response) => {
  try {
    const parsed = refineTripSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: parsed.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('; ') } });
      return;
    }

    log.info('Refining trip', { message: parsed.data.message.slice(0, 50) });
    const startTime = Date.now();
    const refinedTrip = await refineTrip(parsed.data.tripId ?? '', parsed.data.trip as Trip, parsed.data.message);
    log.info('Trip refined', { duration: `${Date.now() - startTime}ms` });

    res.json({ success: true, data: refinedTrip } as ApiResponse<Trip>);
  } catch (error) {
    log.error('Refinement failed', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ success: false, error: { code: 'REFINEMENT_FAILED', message: 'Failed to refine trip.' } });
  }
});
