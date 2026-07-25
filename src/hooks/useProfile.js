// src/hooks/useProfile.js
//
// Single-row equivalent of useSupabaseTable — reads and upserts the
// signed-in user's own `profiles` row. Not folded into useSupabaseTable
// itself since that hook is shaped around lists (arrays), not a single
// record with a save/upsert action.
//
// Same caching approach as useSupabaseTable, for the same reason: without
// it, navigating away from Profile and back remounts this hook fresh and
// re-shows a loading state even though nothing changed — that's the exact
// "reloads every time you visit it" bug the feed had. Module-level cache
// keyed by user id, seeded instantly on mount, refreshed quietly after.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

const profileCache = new Map(); // userId -> profile row

export function useProfile() {
  const { user } = useAuth();
  const cached = user ? profileCache.get(user.id) : undefined;

  const [profile, setProfile] = useState(() => cached ?? null);
  const [status, setStatus] = useState(() => (cached ? 'ready' : user ? 'loading' : 'idle'));
  const [error, setError] = useState(null);

  const load = useCallback(
    async (isBackgroundRefresh = false) => {
      if (!user) {
        setProfile(null);
        setStatus('idle');
        return;
      }

      if (!isBackgroundRefresh) setStatus('loading');
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(); // no row yet (pre-migration account) shouldn't error

      if (fetchError) {
        setError(fetchError.message);
        setStatus('error');
        return;
      }

      profileCache.set(user.id, data);
      setProfile(data);
      setStatus('ready');
    },
    [user]
  );

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setStatus('idle');
      return;
    }

    if (profileCache.has(user.id)) {
      setProfile(profileCache.get(user.id));
      setStatus('ready');
      load(true); // quiet background refresh
    } else {
      load(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, load]);

  const saveProfile = useCallback(
    async (updates) => {
      if (!user) return { error: new Error('Not signed in') };

      const { data, error: upsertError } = await supabase
        .from('profiles')
        .upsert({ user_id: user.id, ...updates, updated_at: new Date().toISOString() })
        .select()
        .single();

      if (upsertError) return { error: upsertError };

      profileCache.set(user.id, data);
      setProfile(data);
      return { error: null };
    },
    [user]
  );

  return { profile, status, error, saveProfile, refetch: () => load(false) };
}

export default useProfile;