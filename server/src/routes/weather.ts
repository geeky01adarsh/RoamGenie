// ============================================================
// Weather Routes — Forecast endpoint for the client
// ============================================================

import { Router, type Request, type Response } from 'express';
import { getWeatherForecast } from '../services/weather.js';
import { weatherQuerySchema } from '../middleware/validate.js';
import type { ApiResponse } from '../../../shared/types/index.js';

export const weatherRouter = Router();

/**
 * GET /api/weather?city=Tokyo&days=5
 * Fetches weather forecast for trip planning and disruption detection
 */
weatherRouter.get('/', async (req: Request, res: Response) => {
  try {
    const parsed = weatherQuerySchema.safeParse({
      city: req.query.city,
      days: req.query.days ? Number(req.query.days) : undefined,
    });

    if (!parsed.success) {
      const response: ApiResponse<never> = {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`).join('; '),
        },
      };
      res.status(400).json(response);
      return;
    }

    const forecast = await getWeatherForecast(parsed.data.city, parsed.data.days);
    res.json({ success: true, data: forecast });
  } catch (error) {
    console.error('[Weather] Route error:', error);
    res.status(500).json({
      success: false,
      error: { code: 'WEATHER_FETCH_FAILED', message: 'Failed to fetch weather data.' },
    });
  }
});
