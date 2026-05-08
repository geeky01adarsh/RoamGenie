// ============================================================
// Trip Store — Simple JSON file-based persistence for trips
// Stores trips per user in a JSON file on disk
// ============================================================

import { promises as fs } from 'fs';
import path from 'path';
import { createLogger } from '../utils/logger.js';
import type { Trip } from '../../../shared/types/index.js';

const log = createLogger('TripStore');

/** Directory where trip data is persisted */
const DATA_DIR = path.resolve(process.cwd(), 'data', 'trips');

/** Ensure the data directory exists */
async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

/** Get the file path for a user's trips */
function getUserFile(userId: string): string {
  // Sanitize userId to prevent path traversal
  const safe = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(DATA_DIR, `${safe}.json`);
}

/** Load all trips for a user */
async function loadUserTrips(userId: string): Promise<Trip[]> {
  try {
    const filePath = getUserFile(userId);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data) as Trip[];
  } catch (e: any) {
    if (e.code === 'ENOENT') return [];
    log.error('Failed to load trips', { userId, error: e.message });
    return [];
  }
}

/** Save all trips for a user */
async function saveUserTrips(userId: string, trips: Trip[]): Promise<void> {
  await ensureDir();
  const filePath = getUserFile(userId);
  await fs.writeFile(filePath, JSON.stringify(trips, null, 2), 'utf-8');
}

// ── Public API ───────────────────────────────────────────────

/** Save or update a trip for a user */
export async function saveTrip(userId: string, trip: Trip): Promise<Trip> {
  const trips = await loadUserTrips(userId);
  const existingIdx = trips.findIndex((t) => t.id === trip.id);

  const tripWithMeta = {
    ...trip,
    updatedAt: new Date().toISOString(),
    status: trip.status ?? 'active' as const,
  };

  if (existingIdx >= 0) {
    trips[existingIdx] = tripWithMeta;
    log.info('Trip updated', { userId, tripId: trip.id });
  } else {
    trips.push(tripWithMeta);
    log.info('Trip saved', { userId, tripId: trip.id });
  }

  await saveUserTrips(userId, trips);
  return tripWithMeta;
}

/** Load a single trip by ID */
export async function loadTrip(userId: string, tripId: string): Promise<Trip | null> {
  const trips = await loadUserTrips(userId);
  return trips.find((t) => t.id === tripId) ?? null;
}

/** Load all trips for a user */
export async function listTrips(userId: string): Promise<Trip[]> {
  return loadUserTrips(userId);
}

/** Delete a trip by ID */
export async function deleteTripById(userId: string, tripId: string): Promise<boolean> {
  const trips = await loadUserTrips(userId);
  const filtered = trips.filter((t) => t.id !== tripId);
  if (filtered.length === trips.length) return false; // Not found
  await saveUserTrips(userId, filtered);
  log.info('Trip deleted', { userId, tripId });
  return true;
}
