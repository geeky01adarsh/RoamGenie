// ============================================================
// MapView — Google Maps integration with trip markers and routes
// ============================================================

import { useMemo } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin } from '@vis.gl/react-google-maps';
import type { Trip, Activity, ActivityCategory } from '@shared/types/index';

interface MapViewProps {
  trip: Trip | null;
  selectedDay: number | null;
  onActivityClick?: (activity: Activity) => void;
}

/** Category-to-color mapping for map markers */
const CATEGORY_COLORS: Record<ActivityCategory, { bg: string; glyph: string; border: string }> = {
  food: { bg: '#fb923c', glyph: '🍜', border: '#ea580c' },
  culture: { bg: '#a78bfa', glyph: '🏛️', border: '#7c3aed' },
  nature: { bg: '#34d399', glyph: '🌿', border: '#059669' },
  shopping: { bg: '#f472b6', glyph: '🛍️', border: '#db2777' },
  nightlife: { bg: '#c084fc', glyph: '🌃', border: '#9333ea' },
  transit: { bg: '#60a5fa', glyph: '🚶', border: '#2563eb' },
  accommodation: { bg: '#fbbf24', glyph: '🏨', border: '#d97706' },
  entertainment: { bg: '#f87171', glyph: '🎭', border: '#dc2626' },
};

export default function MapView({ trip, selectedDay, onActivityClick }: MapViewProps) {
  const apiKey = import.meta.env.VITE_GCP_MAPS_API_KEY;

  // Collect all activities to show (filter by day if selected)
  const activities = useMemo(() => {
    if (!trip?.days) return [];
    const days = selectedDay
      ? trip.days.filter((d) => d.dayNumber === selectedDay)
      : trip.days;
    return days.flatMap((d) => d.activities);
  }, [trip, selectedDay]);

  // Calculate map center from activities
  const center = useMemo(() => {
    if (activities.length === 0) return { lat: 35.6762, lng: 139.6503 }; // Default: Tokyo
    const lats = activities.map((a) => a.location.lat);
    const lngs = activities.map((a) => a.location.lng);
    return {
      lat: lats.reduce((a, b) => a + b, 0) / lats.length,
      lng: lngs.reduce((a, b) => a + b, 0) / lngs.length,
    };
  }, [activities]);

  if (!apiKey) {
    return (
      <div className="map-container" role="region" aria-label="Trip map">
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">🗺️</div>
          <h3>Map Unavailable</h3>
          <p>Set VITE_GCP_MAPS_API_KEY in your .env to enable the interactive map.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="map-container" role="region" aria-label="Trip map">
      <APIProvider apiKey={apiKey}>
        <Map
          defaultCenter={center}
          center={center}
          defaultZoom={activities.length > 0 ? 13 : 3}
          mapId="roamgenie-map"
          gestureHandling="greedy"
          disableDefaultUI={false}
          style={{ width: '100%', height: '100%' }}
        >
          {activities.map((activity, index) => {
            const colors = CATEGORY_COLORS[activity.category] ?? CATEGORY_COLORS.culture;
            return (
              <AdvancedMarker
                key={activity.id}
                position={{ lat: activity.location.lat, lng: activity.location.lng }}
                title={`${index + 1}. ${activity.name}`}
                onClick={() => onActivityClick?.(activity)}
              >
                <Pin
                  background={colors.bg}
                  borderColor={colors.border}
                  glyphColor="white"
                >
                  <span style={{ fontSize: '14px' }}>{colors.glyph}</span>
                </Pin>
              </AdvancedMarker>
            );
          })}
        </Map>
      </APIProvider>

      {!trip && (
        <div className="empty-state" style={{ position: 'absolute', inset: 0, background: 'rgba(10,10,26,0.85)' }}>
          <div className="empty-state-icon" aria-hidden="true">🗺️</div>
          <h3>Your Trip Awaits</h3>
          <p>Fill in your preferences and generate a trip to see it come alive on the map.</p>
        </div>
      )}
    </div>
  );
}
