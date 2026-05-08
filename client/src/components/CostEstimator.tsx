// ============================================================
// CostEstimator — Breakdown of trip costs by category
// ============================================================

import type { Trip, CostBreakdown } from '@shared/types/index';

interface CostEstimatorProps {
  trip: Trip;
}

/** Estimate costs from activity data if no breakdown exists */
function estimateCosts(trip: Trip): CostBreakdown {
  if (trip.costBreakdown) return trip.costBreakdown;

  const days = trip.days.length || 1;
  const budget = trip.preferences.budget;
  const style = trip.preferences.travelStyle;
  const type = trip.preferences.tripType;

  // Weight distribution based on trip type
  let weights = { accommodation: 0.30, food: 0.25, transport: 0.15, activities: 0.15, shopping: 0.10, misc: 0.05 };
  if (type === 'bachelor') weights = { accommodation: 0.25, food: 0.20, transport: 0.10, activities: 0.25, shopping: 0.10, misc: 0.10 };
  if (type === 'family') weights = { accommodation: 0.35, food: 0.25, transport: 0.15, activities: 0.15, shopping: 0.05, misc: 0.05 };
  if (type === 'office') weights = { accommodation: 0.35, food: 0.30, transport: 0.15, activities: 0.10, shopping: 0.05, misc: 0.05 };
  if (style.includes('foodie')) { weights.food += 0.05; weights.shopping -= 0.05; }

  // Calculate from actual activity costs if available
  let activityTotal = 0;
  for (const day of trip.days) {
    for (const act of day.activities) {
      activityTotal += act.cost;
    }
  }

  const base = activityTotal > 0 ? Math.max(budget, activityTotal * 2.5) : budget;

  return {
    accommodation: Math.round(base * weights.accommodation / days) * days,
    food: Math.round(base * weights.food / days) * days,
    transport: Math.round(base * weights.transport),
    activities: activityTotal > 0 ? activityTotal : Math.round(base * weights.activities),
    shopping: Math.round(base * weights.shopping),
    misc: Math.round(base * weights.misc),
  };
}

const COST_ITEMS: { key: keyof CostBreakdown; label: string; icon: string }[] = [
  { key: 'accommodation', label: 'Accommodation', icon: '🏨' },
  { key: 'food', label: 'Food & Dining', icon: '🍽️' },
  { key: 'transport', label: 'Transport', icon: '✈️' },
  { key: 'activities', label: 'Activities', icon: '🎟️' },
  { key: 'shopping', label: 'Shopping', icon: '🛍️' },
  { key: 'misc', label: 'Miscellaneous', icon: '📦' },
];

export default function CostEstimator({ trip }: CostEstimatorProps) {
  const costs = estimateCosts(trip);
  const total = Object.values(costs).reduce((a, b) => a + b, 0);
  const isOverBudget = total > trip.preferences.budget;

  return (
    <div className="cost-estimator animate-slide-in" role="region" aria-label="Cost estimate">
      <h4>
        💰 Cost Estimate
        <span className={`category-badge ${isOverBudget ? 'category-entertainment' : 'category-nature'}`}>
          {isOverBudget ? 'Over budget' : 'Within budget'}
        </span>
      </h4>

      {COST_ITEMS.map((item) => (
        <div key={item.key} className="cost-row">
          <span className="cost-label">{item.icon} {item.label}</span>
          <span className="cost-value">₹{costs[item.key].toLocaleString()}</span>
        </div>
      ))}

      <div className="cost-total">
        <span>Estimated Total</span>
        <span className="cost-value">₹{total.toLocaleString()}</span>
      </div>

      <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
        Budget: ₹{trip.preferences.budget.toLocaleString()} · {trip.days.length} days · {trip.preferences.tripType}
      </div>
    </div>
  );
}
