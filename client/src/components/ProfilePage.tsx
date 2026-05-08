// ============================================================
// ProfilePage — Manage past and upcoming trips
// ============================================================

import { useState, useEffect } from 'react';
import type { Trip } from '@shared/types/index';
import type { User } from 'firebase/auth';
import { loadAllTrips, deleteTrip } from '../services/firebase';

interface ProfilePageProps {
  user: User | null;
  onLoadTrip: (trip: Trip) => void;
  onSignIn: () => void;
}

const TRIP_TYPE_LABELS: Record<string, string> = {
  solo: '🎒 Solo', couple: '💑 Couple', family: '👨‍👩‍👧‍👦 Family',
  bachelor: '🥳 Bachelor', office: '💼 Office', 'meet-in-middle': '📍 Meet in Middle',
};

export default function ProfilePage({ user, onLoadTrip, onSignIn }: ProfilePageProps) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadAllTrips().then((t) => { setTrips(t); setLoading(false); }).catch(() => setLoading(false));
  }, [user]);

  const handleDelete = async (tripId: string) => {
    if (!confirm('Delete this trip?')) return;
    await deleteTrip(tripId);
    setTrips((prev) => prev.filter((t) => t.id !== tripId));
  };

  const now = new Date().toISOString().split('T')[0]!;
  const upcoming = trips.filter((t) => t.preferences.endDate >= now);
  const past = trips.filter((t) => t.preferences.endDate < now);

  if (!user) {
    return (
      <div className="profile-page">
        <div className="empty-state" style={{ minHeight: '60vh' }}>
          <div className="empty-state-icon" aria-hidden="true">🔑</div>
          <h3>Sign In to View Profile</h3>
          <p>Sign in with Google to save trips and access your travel history.</p>
          <button className="btn btn-primary" onClick={onSignIn} id="profile-sign-in-btn">
            🔑 Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page animate-fade-in">
      {/* Profile Header */}
      <div className="profile-header">
        {user.photoURL && (
          <img src={user.photoURL} alt={`${user.displayName}'s avatar`} className="profile-avatar" />
        )}
        <div className="profile-info">
          <h2>{user.displayName ?? 'Traveler'}</h2>
          <p>{user.email}</p>
          <p style={{ marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
            {trips.length} trips planned · {upcoming.length} upcoming
          </p>
        </div>
      </div>

      {loading ? (
        <div className="loading-overlay" role="status"><div className="loading-spinner" /><p>Loading trips...</p></div>
      ) : (
        <>
          {/* Upcoming Trips */}
          <section className="profile-section" aria-label="Upcoming trips">
            <h3>🗓️ Upcoming Trips <span className="badge">{upcoming.length}</span></h3>
            {upcoming.length === 0 ? (
              <div style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '14px' }}>
                No upcoming trips. Start planning your next adventure!
              </div>
            ) : (
              <div className="trip-card-grid">
                {upcoming.map((trip) => (
                  <TripCard key={trip.id} trip={trip} onLoad={onLoadTrip} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </section>

          <section className="profile-section" aria-label="Past trips">
            <h3>📜 Past Trips <span className="badge">{past.length}</span></h3>
            {past.length === 0 ? (
              <div style={{ padding: '20px', color: 'var(--text-muted)', fontSize: '14px' }}>
                No past trips yet. Your travel history will appear here.
              </div>
            ) : (
              <div className="trip-card-grid">
                {past.map((trip) => (
                  <TripCard key={trip.id} trip={trip} onLoad={onLoadTrip} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}

function TripCard({ trip, onLoad, onDelete }: { trip: Trip; onLoad: (t: Trip) => void; onDelete: (id: string) => void }) {
  const statusClass = `status-${trip.status}`;
  const days = trip.days.length;
  const tripType = trip.preferences.tripType ?? 'solo';

  return (
    <article className="trip-card" onClick={() => onLoad(trip)} tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onLoad(trip); }}
      aria-label={`Trip: ${trip.name}`}>
      <span className={`trip-card-status ${statusClass}`}>{trip.status}</span>
      <div className="trip-card-title">{trip.name}</div>
      <div className="trip-card-meta">
        <span>📅 {trip.preferences.startDate} → {trip.preferences.endDate}</span>
        <span>📍 {days} days</span>
        <span>💰 ₹{trip.totalCost.toLocaleString()}</span>
      </div>
      <div className="trip-card-tags">
        <span className="category-badge category-culture">{TRIP_TYPE_LABELS[tripType] ?? tripType}</span>
        {trip.preferences.travelStyle.slice(0, 3).map((s) => (
          <span key={s} className={`category-badge category-${s === 'foodie' ? 'food' : s}`}>{s}</span>
        ))}
      </div>
      <button className="btn btn-ghost btn-sm" style={{ position: 'absolute', bottom: '12px', right: '12px' }}
        onClick={(e) => { e.stopPropagation(); onDelete(trip.id); }} aria-label="Delete trip">
        🗑️
      </button>
    </article>
  );
}
