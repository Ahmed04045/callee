// src/context/AuthContext.jsx
//
// Small state machine that owns "who is signed in and how." AuthModal only
// ever talks to `providers` and `signIn(providerId)` — it never branches on
// which provider it's calling. That means wiring in the real NoSuits Labs
// unified sign-in API later is a matter of implementing one entry's
// `authenticate()` function below, not touching any component markup.

import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

const AuthContext = createContext(null);

// Registry of sign-in providers. Each entry describes how it should render
// in AuthModal (label/icon key/enabled) and how to perform the sign-in.
// Swap out `authenticate` with a real network call when the provider goes
// live — the modal's button list and click handling stay identical.
const PROVIDERS = {
  google: {
    id: 'google',
    label: 'Continue with Google',
    enabled: true,
    authenticate: async () =>
      mockAuthenticate({ id: 'google-mock-user', provider: 'google', name: 'Google User' }),
  },
  facebook: {
    id: 'facebook',
    label: 'Continue with Facebook',
    enabled: true,
    authenticate: async () =>
      mockAuthenticate({ id: 'facebook-mock-user', provider: 'facebook', name: 'Facebook User' }),
  },
  noSuitsLabs: {
    id: 'noSuitsLabs',
    label: 'Continue with NoSuits Labs',
    enabled: false, // Flip to true once the unified sign-in API ships.
    comingSoon: true,
    authenticate: async () => {
      throw new Error('NoSuits Labs unified sign-in is not available yet.');
    },
  },
};

// Placeholder network delay so the UI's pending state is exercised even
// though nothing real is being called yet.
function mockAuthenticate(user) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(user), 600);
  });
}

export function AuthProvider({ children }) {
  // status: 'idle' | 'pending' | 'authenticated' | 'error'
  const [status, setStatus] = useState('idle');
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);
  const [activeProviderId, setActiveProviderId] = useState(null);

  const signIn = useCallback(async (providerId) => {
    const provider = PROVIDERS[providerId];
    if (!provider || !provider.enabled) {
      setStatus('error');
      setError(`"${providerId}" is not available yet.`);
      return;
    }

    setStatus('pending');
    setActiveProviderId(providerId);
    setError(null);

    try {
      const authedUser = await provider.authenticate();
      setUser(authedUser);
      setStatus('authenticated');
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Sign-in failed.');
    } finally {
      setActiveProviderId(null);
    }
  }, []);

  const signOut = useCallback(() => {
    setUser(null);
    setStatus('idle');
    setError(null);
  }, []);

  const value = useMemo(
    () => ({
      status,
      user,
      error,
      activeProviderId,
      providers: Object.values(PROVIDERS),
      signIn,
      signOut,
    }),
    [status, user, error, activeProviderId, signIn, signOut]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an <AuthProvider>.');
  }
  return ctx;
}
