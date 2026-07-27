// src/context/ProfileContext.jsx
//
// Profile data lives here, in ONE place, instead of each component calling
// its own independent fetch (that was the old `useProfile` hook, now
// removed — it caused the "stuck after choosing account type" bug: two
// separate component instances each had their own copy of `profile`, so
// saving in one didn't update the other's copy, and the redirect guard in
// App.jsx kept acting on stale data until a full reload re-fetched it).
// Context guarantees every consumer re-renders from the same state the
// instant it changes — same pattern AuthContext already uses.

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const ProfileContext = createContext(null);

export function ProfileProvider({ children }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'ready' | 'error'
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setStatus('idle');
      return;
    }
    setStatus('loading');
    setError(null);

    const { data, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (fetchError) {
      setError(fetchError.message);
      setStatus('error');
      return;
    }

    setProfile(data);
    setStatus('ready');
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const saveProfile = useCallback(
    async (updates) => {
      if (!user) return { error: new Error('Not signed in') };

      const { data, error: upsertError } = await supabase
        .from('profiles')
        .upsert({ user_id: user.id, ...updates, updated_at: new Date().toISOString() })
        .select()
        .single();

      if (upsertError) return { error: upsertError };

      setProfile(data); // the ONE shared state — every consumer sees this immediately
      return { error: null };
    },
    [user]
  );

  const value = { profile, status, error, saveProfile, refetch: load };

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) {
    throw new Error('useProfile must be used inside a <ProfileProvider>.');
  }
  return ctx;
}