// src/hooks/useProfile.js
//
// Single-row equivalent of useSupabaseTable — reads and upserts the
// signed-in user's own `profiles` row. Not folded into useSupabaseTable
// itself since that hook is shaped around lists (arrays), not a single
// record with a save/upsert action.

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../context/AuthContext';

export function useProfile() {
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
      .maybeSingle(); // no row yet (pre-migration account) shouldn't error

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

      setProfile(data);
      return { error: null };
    },
    [user]
  );

  return { profile, status, error, saveProfile, refetch: load };
}

export default useProfile;