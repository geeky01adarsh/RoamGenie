// ============================================================
// useAuth — Firebase authentication hook
// Works gracefully when Firebase is not configured
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, signInWithGoogle, logOut, isFirebaseAvailable } from '../services/firebase';

interface AuthState {
  user: User | null;
  isLoading: boolean;
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    isLoading: isFirebaseAvailable(),
  });

  useEffect(() => {
    if (!auth) {
      setState({ user: null, isLoading: false });
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setState({ user, isLoading: false });
    });
    return unsubscribe;
  }, []);

  const signIn = useCallback(async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('[Auth] Sign-in failed:', error);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    try {
      await logOut();
    } catch (error) {
      console.error('[Auth] Sign-out failed:', error);
    }
  }, []);

  return {
    user: state.user,
    isLoading: state.isLoading,
    isAuthenticated: !!state.user,
    isFirebaseAvailable: isFirebaseAvailable(),
    signIn,
    signOut: signOutUser,
  };
}
