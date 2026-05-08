// ============================================================
// useTrip — Trip state management hook
// ============================================================

import { useState, useCallback } from 'react';
import type { Trip, TripPreferences, ChatMessage } from '@shared/types/index';
import * as api from '../services/api';

interface TripState {
  trip: Trip | null;
  isLoading: boolean;
  error: string | null;
  messages: ChatMessage[];
}

export function useTrip() {
  const [state, setState] = useState<TripState>({
    trip: null,
    isLoading: false,
    error: null,
    messages: [{
      id: 'welcome',
      role: 'assistant',
      content: '🌍 Welcome to RoamGenie! Tell me about your dream trip — where do you want to go, when, and what do you love doing? I\'ll create a personalized itinerary for you.',
      timestamp: new Date().toISOString(),
    }],
  });

  const addMessage = useCallback((role: ChatMessage['role'], content: string) => {
    const message: ChatMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      role,
      content,
      timestamp: new Date().toISOString(),
    };
    setState((prev) => ({ ...prev, messages: [...prev.messages, message] }));
    return message;
  }, []);

  const generateTrip = useCallback(async (preferences: TripPreferences, message?: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    if (message) addMessage('user', message);
    addMessage('assistant', '✨ Generating your personalized itinerary... I\'m checking weather, finding amazing places, and calculating routes.');

    try {
      const result = await api.generateTrip({ preferences, message });

      if (result.success && result.data) {
        setState((prev) => ({
          ...prev,
          trip: result.data!,
          isLoading: false,
        }));
        addMessage('assistant', `🎉 Your trip to **${preferences.destination}** is ready! ${result.data.days.length} days of adventure planned. Check the map and timeline to explore your itinerary.`);
      } else {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: result.error?.message ?? 'Failed to generate trip',
        }));
        addMessage('assistant', `❌ ${result.error?.message ?? 'Something went wrong. Please try again.'}`);
      }
    } catch {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: 'Network error',
      }));
      addMessage('assistant', '❌ Network error. Please check your connection and try again.');
    }
  }, [addMessage]);

  const adaptTrip = useCallback(async (dayNumber: number, description: string) => {
    if (!state.trip) return;

    setState((prev) => ({ ...prev, isLoading: true }));
    addMessage('assistant', `🔄 Adapting your plan for Day ${dayNumber}... Finding alternatives based on the disruption.`);

    try {
      const result = await api.adaptTrip({
        tripId: state.trip.id,
        trip: state.trip,
        disruption: {
          type: 'weather',
          dayNumber,
          description,
        },
      });

      if (result.success && result.data) {
        setState((prev) => ({
          ...prev,
          trip: result.data!,
          isLoading: false,
        }));
        addMessage('assistant', `✅ Plan adapted! I've swapped outdoor activities for indoor alternatives on Day ${dayNumber}. Check the updated timeline.`);
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
        addMessage('assistant', `❌ ${result.error?.message ?? 'Failed to adapt trip.'}`);
      }
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
      addMessage('assistant', '❌ Failed to adapt trip. Please try again.');
    }
  }, [state.trip, addMessage]);

  const refineTrip = useCallback(async (message: string) => {
    if (!state.trip) return;

    setState((prev) => ({ ...prev, isLoading: true }));
    addMessage('user', message);
    addMessage('assistant', '🤔 Let me adjust your itinerary...');

    try {
      const result = await api.refineTrip({
        tripId: state.trip.id,
        trip: state.trip,
        message,
      });

      if (result.success && result.data) {
        setState((prev) => ({
          ...prev,
          trip: result.data!,
          isLoading: false,
        }));
        addMessage('assistant', '✅ Done! I\'ve updated your itinerary based on your feedback.');
      } else {
        setState((prev) => ({ ...prev, isLoading: false }));
        addMessage('assistant', `❌ ${result.error?.message ?? 'Failed to refine trip.'}`);
      }
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }));
      addMessage('assistant', '❌ Failed to refine trip. Please try again.');
    }
  }, [state.trip, addMessage]);

  const setTrip = useCallback((trip: Trip | null) => {
    setState((prev) => ({ ...prev, trip }));
  }, []);

  return {
    trip: state.trip,
    isLoading: state.isLoading,
    error: state.error,
    messages: state.messages,
    generateTrip,
    adaptTrip,
    refineTrip,
    setTrip,
    addMessage,
  };
}
