// ============================================================
// RoamGenie Server — Entry Point
// Express with security middleware, rate limiting, logging
// ============================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { tripRouter } from './routes/trip.js';
import { weatherRouter } from './routes/weather.js';
import { profileRouter } from './routes/profile.js';
import { createLogger } from './utils/logger.js';

const log = createLogger('Server');
const app = express();
const PORT = process.env.PORT ?? 9001;

// ── Security Middleware ──────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false,     // Allow Google Maps / fonts
  crossOriginEmbedderPolicy: false, // Allow external API calls
}));
app.use(cors({
  origin: process.env.CORS_ORIGIN ?? 'http://localhost:9173',
  credentials: true,
  methods: ['GET', 'POST', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '1mb' }));

// ── Request ID + Timing ──────────────────────────────────────
app.use((req, res, next) => {
  const requestId = `req_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-Id', requestId);
  const start = Date.now();
  res.on('finish', () => {
    log.debug(`${req.method} ${req.path} completed`, { ms: Date.now() - start, reqId: requestId });
  });
  next();
});

// ── Request Logging ──────────────────────────────────────────
app.use((req, _res, next) => {
  log.info(`${req.method} ${req.path}`, {
    ip: req.ip,
    ua: req.get('user-agent')?.slice(0, 50),
    reqId: req.headers['x-request-id'] as string,
  });
  next();
});

// ── Rate Limiting ────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMIT', message: 'Too many requests.' } },
});
app.use('/api/', apiLimiter);

// ── Health Check ─────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version ?? '1.0.0',
      services: {
        groq: !!process.env.GROQ_API_KEY,
        maps: !!process.env.GCP_MAPS_API_KEY,
        weather: !!process.env.OPENWEATHER_API_KEY,
      },
    },
  });
});

// ── Routes ───────────────────────────────────────────────────
app.use('/api/trips', tripRouter);
app.use('/api/weather', weatherRouter);
app.use('/api/profile', profileRouter);

// ── Global Error Handler ─────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  log.error('Unhandled error', { message: err.message, stack: err.stack?.slice(0, 200) });
  res.status(500).json({
    success: false,
    error: { code: 'INTERNAL_ERROR', message: 'Something went wrong.' },
  });
});

// ── Start Server ─────────────────────────────────────────────
app.listen(PORT, () => {
  log.info(`RoamGenie server running on http://localhost:${PORT}`);
  log.info(`Environment: ${process.env.NODE_ENV ?? 'development'}`);
  log.info(`CORS origin: ${process.env.CORS_ORIGIN ?? 'http://localhost:9173'}`);
});

export default app;
