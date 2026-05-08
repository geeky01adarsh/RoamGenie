// ============================================================
// DayTimeline — Visual day-by-day schedule sidebar
// ============================================================

import type { Trip, TripDay, Activity, ActivityCategory } from '@shared/types/index';
import { downloadItinerary } from '../utils/download';

interface DayTimelineProps {
  trip: Trip | null;
  isLoading: boolean;
  selectedDay: number | null;
  onSelectDay: (day: number | null) => void;
  onAdapt: (dayNumber: number, description: string) => void;
  onActivityClick?: (activity: Activity) => void;
}

const CATEGORY_ICONS: Record<ActivityCategory, string> = {
  food: '🍜',
  culture: '🏛️',
  nature: '🌿',
  shopping: '🛍️',
  nightlife: '🌃',
  transit: '🚶',
  accommodation: '🏨',
  entertainment: '🎭',
};

function getFeasibilityClass(score: number): string {
  if (score >= 75) return 'feasibility-high';
  if (score >= 50) return 'feasibility-medium';
  return 'feasibility-low';
}

function getWeatherIcon(condition: string): string {
  const lower = condition.toLowerCase();
  if (lower.includes('rain') || lower.includes('drizzle')) return '🌧️';
  if (lower.includes('thunder') || lower.includes('storm')) return '⛈️';
  if (lower.includes('cloud')) return '☁️';
  if (lower.includes('snow')) return '❄️';
  return '☀️';
}

function isRainyDay(day: TripDay): boolean {
  const condition = day.weather.condition.toLowerCase();
  return condition.includes('rain') || condition.includes('thunder') || condition.includes('storm') || day.weather.rainProbability > 60;
}

export default function DayTimeline({ trip, isLoading, selectedDay, onSelectDay, onAdapt, onActivityClick }: DayTimelineProps) {
  if (isLoading) {
    return (
      <aside className="timeline-panel" aria-label="Trip timeline">
        <div className="loading-overlay" role="status">
          <div className="loading-spinner" />
          <p>Building your itinerary...</p>
        </div>
      </aside>
    );
  }

  if (!trip || trip.days.length === 0) {
    return (
      <aside className="timeline-panel" aria-label="Trip timeline">
        <div className="empty-state">
          <div className="empty-state-icon" aria-hidden="true">📅</div>
          <h3>No Itinerary Yet</h3>
          <p>Generate a trip to see your day-by-day schedule here.</p>
        </div>
      </aside>
    );
  }

  const displayDays = selectedDay
    ? trip.days.filter((d) => d.dayNumber === selectedDay)
    : trip.days;

  return (
    <aside className="timeline-panel" aria-label="Trip timeline">
      <div className="timeline-header">
        <h2>📅 Itinerary</h2>
        <div style={{ display: 'flex', gap: '6px' }}>
          {selectedDay && (
            <button
              className="btn btn-secondary btn-icon"
              onClick={() => onSelectDay(null)}
              aria-label="Show all days"
              id="show-all-days-btn"
            >
              All
            </button>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => downloadItinerary(trip)}
            aria-label="Download itinerary as text file"
            id="download-itinerary-btn"
            title="Download itinerary"
          >
            📥 Download
          </button>
        </div>
      </div>

      <nav className="timeline-days">
        {displayDays.map((day) => (
          <article key={day.dayNumber} className="timeline-day animate-slide-in" aria-label={`Day ${day.dayNumber}`}>
            {/* Day Header */}
            <div className="timeline-day-header">
              <button
                className="timeline-day-title"
                onClick={() => onSelectDay(selectedDay === day.dayNumber ? null : day.dayNumber)}
                aria-label={`Filter to Day ${day.dayNumber}`}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', font: 'inherit' }}
              >
                Day {day.dayNumber} · {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="timeline-day-weather" aria-label={`Weather: ${day.weather.condition}, ${day.weather.high}°/${day.weather.low}°`}>
                  {getWeatherIcon(day.weather.condition)} {day.weather.high}°/{day.weather.low}°
                </span>
                <span className={`feasibility-score ${getFeasibilityClass(day.feasibilityScore)}`} aria-label={`Feasibility score: ${day.feasibilityScore}`}>
                  {day.feasibilityScore}%
                </span>
              </div>
            </div>

            {/* Weather Disruption Banner */}
            {isRainyDay(day) && (
              <div className="disruption-banner animate-fade-in">
                <span className="disruption-banner-icon" aria-hidden="true">⚠️</span>
                <div className="disruption-banner-content">
                  <div className="disruption-banner-title">Weather Alert</div>
                  <div className="disruption-banner-desc">
                    {day.weather.rainProbability}% chance of {day.weather.condition.toLowerCase()}
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  onClick={() => onAdapt(day.dayNumber, `Heavy ${day.weather.condition.toLowerCase()} expected on Day ${day.dayNumber} (${day.weather.rainProbability}% probability). Please swap outdoor activities for indoor alternatives.`)}
                  aria-label={`Adapt plan for Day ${day.dayNumber} weather`}
                  id={`adapt-day-${day.dayNumber}-btn`}
                  style={{ whiteSpace: 'nowrap', fontSize: '12px', padding: '4px 12px' }}
                >
                  🔄 Adapt
                </button>
              </div>
            )}

            {/* Activities */}
            {day.activities.map((activity, idx) => (
              <div key={activity.id}>
                {/* Transit indicator */}
                {idx > 0 && activity.transitFromPrevious && (
                  <div className="timeline-transit" aria-label={`${activity.transitFromPrevious.duration} min ${activity.transitFromPrevious.mode}`}>
                    {activity.transitFromPrevious.mode === 'walking' ? '🚶' : activity.transitFromPrevious.mode === 'transit' ? '🚇' : '🚗'}
                    {' '}{activity.transitFromPrevious.duration} min · {activity.transitFromPrevious.distance}
                  </div>
                )}

                <div
                  className="timeline-activity"
                  onClick={() => onActivityClick?.(activity)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onActivityClick?.(activity); }}
                  aria-label={`${activity.name} at ${activity.startTime}`}
                >
                  <span className="timeline-activity-time">{activity.startTime}</span>
                  <div className="timeline-activity-content">
                    <div className="timeline-activity-name">{activity.name}</div>
                    <div className="timeline-activity-desc">{activity.description}</div>
                    <div className="timeline-activity-meta">
                      <span className={`category-badge category-${activity.category}`}>
                        {CATEGORY_ICONS[activity.category]} {activity.category}
                      </span>
                      <span>⏱️ {activity.duration}min</span>
                      {activity.cost > 0 && <span>💰 ₹{activity.cost.toLocaleString('en-IN')}</span>}
                      {activity.weather.isOutdoor && <span>🌤️ Outdoor</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </article>
        ))}
      </nav>
    </aside>
  );
}
