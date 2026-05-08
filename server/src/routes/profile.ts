// ============================================================
// Profile Routes — Trip persistence (save, load, list, delete)
// Uses server-side JSON file storage per user
// ============================================================

import { Router, type Request, type Response } from 'express';
import { saveTrip, loadTrip, listTrips, deleteTripById } from '../services/tripStore.js';
import { createLogger } from '../utils/logger.js';
import type { ApiResponse, Trip } from '../../../shared/types/index.js';

const log = createLogger('ProfileRoute');
export const profileRouter = Router();

/**
 * Extract userId from request.
 * In production this would come from a verified Firebase token.
 * For now we use a header or default to 'anonymous'.
 */
function getUserId(req: Request): string {
  return (req.headers['x-user-id'] as string) ?? 'anonymous';
}

/** POST /api/profile/trips — Save or update a trip */
profileRouter.post('/trips', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const trip = req.body as Trip;

    if (!trip || !trip.id || !trip.name) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Trip must have id and name.' },
      } as ApiResponse<never>);
      return;
    }

    const saved = await saveTrip(userId, trip);
    log.info('Trip saved', { userId, tripId: saved.id });
    res.json({ success: true, data: saved } as ApiResponse<Trip>);
  } catch (error) {
    log.error('Save trip failed', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      success: false,
      error: { code: 'SAVE_FAILED', message: 'Failed to save trip.' },
    });
  }
});

/** GET /api/profile/trips — List all trips for a user */
profileRouter.get('/trips', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const trips = await listTrips(userId);
    log.info('Trips listed', { userId, count: trips.length });
    res.json({ success: true, data: trips } as ApiResponse<Trip[]>);
  } catch (error) {
    log.error('List trips failed', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      success: false,
      error: { code: 'LIST_FAILED', message: 'Failed to load trips.' },
    });
  }
});

/** GET /api/profile/trips/:id — Load a single trip */
profileRouter.get('/trips/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const trip = await loadTrip(userId, req.params.id!);

    if (!trip) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Trip not found.' },
      } as ApiResponse<never>);
      return;
    }

    res.json({ success: true, data: trip } as ApiResponse<Trip>);
  } catch (error) {
    log.error('Load trip failed', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      success: false,
      error: { code: 'LOAD_FAILED', message: 'Failed to load trip.' },
    });
  }
});

/** DELETE /api/profile/trips/:id — Delete a trip */
profileRouter.delete('/trips/:id', async (req: Request, res: Response) => {
  try {
    const userId = getUserId(req);
    const deleted = await deleteTripById(userId, req.params.id!);

    if (!deleted) {
      res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Trip not found.' },
      } as ApiResponse<never>);
      return;
    }

    log.info('Trip deleted', { userId, tripId: req.params.id });
    res.json({ success: true, data: { deleted: true } });
  } catch (error) {
    log.error('Delete trip failed', { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({
      success: false,
      error: { code: 'DELETE_FAILED', message: 'Failed to delete trip.' },
    });
  }
});
