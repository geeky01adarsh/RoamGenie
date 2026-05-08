// ============================================================
// TripChat — AI conversation + trip form with trip types
// ============================================================

import { useState, useRef, useEffect, type FormEvent } from 'react';
import type { TripPreferences, TravelStyle, TripType, ChatMessage } from '@shared/types/index';

interface TripChatProps {
  messages: ChatMessage[];
  isLoading: boolean;
  hasTrip: boolean;
  onGenerate: (preferences: TripPreferences, message?: string) => void;
  onRefine: (message: string) => void;
}

const TRAVEL_STYLES: { value: TravelStyle; label: string; icon: string }[] = [
  { value: 'culture', label: 'Culture', icon: '🏛️' },
  { value: 'foodie', label: 'Foodie', icon: '🍜' },
  { value: 'adventure', label: 'Adventure', icon: '🧗' },
  { value: 'nature', label: 'Nature', icon: '🌿' },
  { value: 'relaxation', label: 'Relax', icon: '🧘' },
  { value: 'nightlife', label: 'Nightlife', icon: '🌃' },
  { value: 'romantic', label: 'Romantic', icon: '💕' },
];

const TRIP_TYPES: { value: TripType; label: string; icon: string; desc: string }[] = [
  { value: 'solo', label: 'Solo', icon: '🎒', desc: 'Just me' },
  { value: 'couple', label: 'Couple', icon: '💑', desc: 'Romantic getaway' },
  { value: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦', desc: 'Kid-friendly' },
  { value: 'bachelor', label: 'Bachelor', icon: '🥳', desc: 'Party vibes' },
  { value: 'office', label: 'Office', icon: '💼', desc: 'Team building' },
  { value: 'meet-in-middle', label: 'Meet in Middle', icon: '📍', desc: 'Long-distance couples' },
];

export default function TripChat({ messages, isLoading, hasTrip, onGenerate, onRefine }: TripChatProps) {
  const [showForm, setShowForm] = useState(!hasTrip);
  const [refineInput, setRefineInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [budget, setBudget] = useState(50000);
  const [styles, setStyles] = useState<TravelStyle[]>(['culture', 'foodie']);
  const [pace, setPace] = useState<'relaxed' | 'moderate' | 'packed'>('moderate');
  const [tripType, setTripType] = useState<TripType>('solo');
  const [cityA, setCityA] = useState('');
  const [cityB, setCityB] = useState('');
  const [additionalNotes, setAdditionalNotes] = useState('');

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);
  useEffect(() => { if (hasTrip) setShowForm(false); }, [hasTrip]);

  const toggleStyle = (style: TravelStyle) => {
    setStyles((prev) =>
      prev.includes(style) ? prev.filter((s) => s !== style) : prev.length < 5 ? [...prev, style] : prev
    );
  };

  const handleGenerate = (e: FormEvent) => {
    e.preventDefault();
    const isMeetMiddle = tripType === 'meet-in-middle';
    if (isMeetMiddle && (!cityA || !cityB)) return;
    if (!isMeetMiddle && !origin) return;
    if (!startDate || !endDate || styles.length === 0) return;

    const preferences: TripPreferences = {
      origin: isMeetMiddle ? undefined : origin,
      destination: isMeetMiddle ? `Midpoint between ${cityA} and ${cityB}` : (destination || 'Suggest 3-4 best places to visit based on my preferences as a multi-stop itinerary'),
      startDate, endDate, budget, currency: 'INR',
      travelStyle: styles, tripType,
      constraints: {
        accessibility: false,
        kidFriendly: tripType === 'family',
        dietaryRestrictions: [],
        maxWalkingMinutes: tripType === 'family' ? 20 : 30,
      },
      pace: tripType === 'family' ? 'relaxed' : pace,
      ...(isMeetMiddle ? { origins: { cityA, cityB } } : {}),
    };

    let extraMessage = additionalNotes || '';
    if (tripType === 'bachelor') extraMessage += ' Focus on nightlife, parties, group activities, and fun experiences.';
    if (tripType === 'office') extraMessage += ' Include team building activities, conference-friendly venues, and professional dining.';
    if (tripType === 'couple') extraMessage += ' Include romantic restaurants, scenic spots, and intimate experiences.';
    if (isMeetMiddle) extraMessage += ` Find the best destination city roughly equidistant between ${cityA} and ${cityB} with good flight connections.`;
    setDestination("");
    onGenerate(preferences, extraMessage.trim() || undefined);
  };

  const handleRefine = (e: FormEvent) => {
    e.preventDefault();
    if (!refineInput.trim() || isLoading) return;
    onRefine(refineInput.trim());
    setRefineInput('');
  };

  return (
    <section className="chat-panel" aria-label="Trip planning chat">
      <div className="chat-header">
        <h2>🧞 RoamGenie</h2>
        <p>Your AI travel co-pilot</p>
      </div>

      {showForm && !hasTrip ? (
        <form className="trip-form" onSubmit={handleGenerate} aria-label="Trip preferences form">
          {/* Trip Type Selector */}
          <div className="input-group">
            <label>Trip Type</label>
            <div className="style-tags" role="group" aria-label="Trip type">
              {TRIP_TYPES.map((t) => (
                <button
                  key={t.value} type="button"
                  className={`style-tag ${tripType === t.value ? 'active' : ''}`}
                  onClick={() => setTripType(t.value)}
                  aria-pressed={tripType === t.value}
                  title={t.desc}
                >
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Meet in Middle: Two origin cities */}
          {tripType === 'meet-in-middle' ? (
            <div className="trip-form-row">
              <div className="input-group">
                <label htmlFor="city-a">Person A's City</label>
                <input id="city-a" className="input-field" type="text" placeholder="e.g. New York"
                  value={cityA} onChange={(e) => setCityA(e.target.value)} required aria-required="true" />
              </div>
              <div className="input-group">
                <label htmlFor="city-b">Person B's City</label>
                <input id="city-b" className="input-field" type="text" placeholder="e.g. London"
                  value={cityB} onChange={(e) => setCityB(e.target.value)} required aria-required="true" />
              </div>
            </div>
          ) : (
            <div className="input-group">
              <label htmlFor="origin">Current Location</label>
              <input id="origin" className="input-field" type="text"
                placeholder="e.g. New York, London..." value={origin}
                onChange={(e) => setOrigin(e.target.value)} required aria-required="true" />
            </div>
          )}

          <div className="trip-form-row">
            <div className="input-group">
              <label htmlFor="start-date">Start Date</label>
              <input id="start-date" className="input-field" type="date" value={startDate}
                onChange={(e) => setStartDate(e.target.value)} required aria-required="true" />
            </div>
            <div className="input-group">
              <label htmlFor="end-date">End Date</label>
              <input id="end-date" className="input-field" type="date" value={endDate}
                onChange={(e) => setEndDate(e.target.value)} required aria-required="true" />
            </div>
          </div>

          <div className="trip-form-row">
            <div className="input-group">
              <label htmlFor="budget">Budget (INR)</label>
              <input id="budget" className="input-field" type="number" min={5000} max={10000000} step={1000}
                value={budget} onChange={(e) => setBudget(Number(e.target.value))} required />
            </div>
            <div className="input-group">
              <label htmlFor="pace">Pace</label>
              <select id="pace" className="input-field" value={pace}
                onChange={(e) => setPace(e.target.value as 'relaxed' | 'moderate' | 'packed')} aria-label="Trip pace">
                <option value="relaxed">🐢 Relaxed</option>
                <option value="moderate">🚶 Moderate</option>
                <option value="packed">🏃 Packed</option>
              </select>
            </div>
          </div>

          <div className="input-group">
            <label>Travel Style</label>
            <div className="style-tags" role="group" aria-label="Travel style selection">
              {TRAVEL_STYLES.map((s) => (
                <button key={s.value} type="button"
                  className={`style-tag ${styles.includes(s.value) ? 'active' : ''}`}
                  onClick={() => toggleStyle(s.value)} aria-pressed={styles.includes(s.value)}>
                  {s.icon} {s.label}
                </button>
              ))}
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="notes">Special requests (optional)</label>
            <input id="notes" className="input-field" type="text"
              placeholder="e.g. love ramen, hate crowds, want hidden gems..."
              value={additionalNotes} onChange={(e) => setAdditionalNotes(e.target.value)} />
          </div>

          <button type="submit" className="btn btn-primary" id="generate-trip-btn"
            disabled={isLoading || (!origin && tripType !== 'meet-in-middle') || !startDate || !endDate || styles.length === 0}>
            {isLoading ? (<><span className="loading-spinner" aria-hidden="true" /> Generating...</>) : '✨ Generate My Trip'}
          </button>
        </form>
      ) : (
        <>
          <div className="chat-messages" role="log" aria-label="Chat messages" aria-live="polite">
            {messages.map((msg) => (
              <div key={msg.id} className={`chat-message chat-message-${msg.role}`}
                role={msg.role === 'assistant' ? 'status' : undefined}>
                {msg.content}
              </div>
            ))}
            {isLoading && (
              <div className="chat-message chat-message-assistant">
                <span className="loading-spinner" aria-label="Loading" />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form className="chat-input-area" onSubmit={handleRefine}>
            <input className="input-field" type="text" id="refine-input"
              placeholder={hasTrip ? 'Refine: "make day 2 less packed"...' : 'Describe your trip...'}
              value={refineInput} onChange={(e) => setRefineInput(e.target.value)}
              disabled={isLoading || !hasTrip} aria-label="Refine your trip" />
            <button type="submit" className="btn btn-primary" disabled={isLoading || !refineInput.trim() || !hasTrip}
              aria-label="Send" id="send-refine-btn">→</button>
            {hasTrip && (
              <button type="button" className="btn btn-secondary" onClick={() => setShowForm(true)}
                aria-label="New trip" id="new-trip-btn" style={{ whiteSpace:'nowrap' }}>+ New</button>
            )}
          </form>
        </>
      )}
    </section>
  );
}
