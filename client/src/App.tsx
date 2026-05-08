// ============================================================
// App — Root component with nav, planner view, and profile view
// ============================================================

import { useState, useCallback } from 'react';
import TripChat from './components/TripChat';
import MapView from './components/MapView';
import DayTimeline from './components/DayTimeline';
import CostEstimator from './components/CostEstimator';
import ProfilePage from './components/ProfilePage';
import { useTrip } from './hooks/useTrip';
import { useAuth } from './hooks/useAuth';
import { saveTrip as saveFirebaseTrip } from './services/firebase';
import { saveServerTrip } from './services/api';
import type { Activity, Trip } from '@shared/types/index';

type AppView = 'planner' | 'profile';

export default function App() {
  const { trip, isLoading, messages, generateTrip, adaptTrip, refineTrip, setTrip } = useTrip();
  const { user, isAuthenticated, signIn, signOut } = useAuth();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [view, setView] = useState<AppView>('planner');
  const [showCost, setShowCost] = useState(false);

  const handleActivityClick = useCallback((_activity: Activity) => {}, []);

  const handleSaveTrip = useCallback(async () => {
    if (!trip || !isAuthenticated || !user) return;
    setSaveStatus('saving');
    try {
      // Save to server (primary persistence)
      await saveServerTrip(trip, user.uid);
      // Also save to Firebase (bonus persistence)
      try { await saveFirebaseTrip(trip); } catch { /* Firebase optional */ }
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    }
  }, [trip, isAuthenticated, user]);

  const handleLoadTrip = useCallback((loadedTrip: Trip) => {
    setTrip(loadedTrip);
    setView('planner');
  }, [setTrip]);

  return (
    <div className="app">
      <a href="#main-content" className="skip-to-content">Skip to main content</a>

      <header className="app-header" role="banner">
        <div className="app-logo">
          <span className="app-logo-icon" aria-hidden="true">🌍</span>
          <h1>RoamGenie</h1>
        </div>

        <nav className="app-nav" aria-label="Main navigation">
          <button className={`app-nav-link ${view === 'planner' ? 'active' : ''}`}
            onClick={() => setView('planner')} id="nav-planner">
            ✨ Planner
          </button>
          <button className={`app-nav-link ${view === 'profile' ? 'active' : ''}`}
            onClick={() => setView('profile')} id="nav-profile">
            👤 Profile
          </button>

          {trip && (
            <button className={`app-nav-link ${showCost ? 'active' : ''}`}
              onClick={() => setShowCost((p) => !p)} id="nav-cost" title="Toggle cost estimator">
              💰 Costs
            </button>
          )}

          {trip && isAuthenticated && (
            <button className="btn btn-secondary btn-sm" onClick={handleSaveTrip}
              disabled={saveStatus === 'saving'} id="save-trip-btn">
              {saveStatus === 'saving' ? '💾 Saving...' : saveStatus === 'saved' ? '✅ Saved!' :
               saveStatus === 'error' ? '❌ Error' : '💾 Save'}
            </button>
          )}

          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {user?.photoURL && (
                <img src={user.photoURL} alt={`${user?.displayName ?? 'User'}'s avatar`}
                  style={{ width: 28, height: 28, borderRadius: '50%', border: '2px solid var(--border-subtle)' }} />
              )}
              <button className="btn btn-ghost btn-sm" onClick={signOut} id="sign-out-btn" title="Sign out">↪</button>
            </div>
          ) : (
            <button className="btn btn-primary btn-sm" onClick={signIn} id="sign-in-btn">
              🔑 Sign in
            </button>
          )}
        </nav>
      </header>

      <main id="main-content" role="main" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Screen reader announcement for loading state */}
        <div aria-live="assertive" aria-atomic="true" className="sr-only"
          style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0,0,0,0)' }}>
          {isLoading ? 'Generating your itinerary, please wait...' : ''}
        </div>

        {view === 'planner' ? (
          <div className="app-main">
            <TripChat messages={messages} isLoading={isLoading} hasTrip={!!trip}
              onGenerate={generateTrip} onRefine={refineTrip} />

            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column' }}>
              <MapView trip={trip} selectedDay={selectedDay} onActivityClick={handleActivityClick} />
              {showCost && trip && (
                <div style={{ position: 'absolute', bottom: '16px', right: '16px', zIndex: 10, width: '320px' }}>
                  <CostEstimator trip={trip} />
                </div>
              )}
            </div>

            <DayTimeline trip={trip} isLoading={isLoading} selectedDay={selectedDay}
              onSelectDay={setSelectedDay} onAdapt={adaptTrip} onActivityClick={handleActivityClick} />
          </div>
        ) : (
          <ProfilePage user={user} onLoadTrip={handleLoadTrip} onSignIn={signIn} />
        )}
      </main>
    </div>
  );
}
