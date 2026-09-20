// src/context/NotificationsContext.jsx
//
// The signed-in user's notifications (created by database triggers, see
// 011_notifications.sql). Loads the latest 50, keeps them live via Supabase
// Realtime, and exposes mark-read / mark-all-read / remove. Shared by the bell
// in the header and the Activity page.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from './AuthContext';

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { user } = useAuth();
  const uid = user?.id;
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | ready | error
  const [muted, setMuted] = useState([]); // notification types the user switched off

  const load = useCallback(async () => {
    if (!uid) {
      setItems([]);
      setStatus('idle');
      return;
    }
    setStatus((s) => (s === 'ready' ? s : 'loading'));
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) {
      setStatus('error'); // usually: 011_notifications.sql hasn't been run yet
      return;
    }
    setItems(data ?? []);
    setStatus('ready');
  }, [uid]);

  // Which types the user has muted (notification_prefs, see 013_questions_prefs_reminders.sql).
  useEffect(() => {
    if (!uid) {
      setMuted([]);
      return;
    }
    supabase
      .from('notification_prefs')
      .select('muted_types')
      .eq('user_id', uid)
      .maybeSingle()
      .then(({ data }) => setMuted(data?.muted_types ?? []));
  }, [uid]);

  const saveMuted = useCallback(
    async (next) => {
      const previous = muted;
      setMuted(next);
      const { error } = await supabase
        .from('notification_prefs')
        .upsert({ user_id: uid, muted_types: next, updated_at: new Date().toISOString() });
      if (error) setMuted(previous);
      return error ? error.message : null;
    },
    [uid, muted]
  );

  useEffect(() => {
    load();
    if (!uid) return undefined;
    const channel = supabase
      .channel(`notifications:${uid}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${uid}` },
        (payload) => setItems((prev) => (prev.some((n) => n.id === payload.new.id) ? prev : [payload.new, ...prev].slice(0, 50)))
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [uid, load]);

  const markRead = useCallback(async (id) => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.id === id && !n.read_at ? { ...n, read_at: now } : n)));
    await supabase.from('notifications').update({ read_at: now }).eq('id', id);
  }, []);

  const markAllRead = useCallback(async () => {
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    await supabase.rpc('mark_all_notifications_read');
  }, []);

  const remove = useCallback(async (id) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    await supabase.from('notifications').delete().eq('id', id);
  }, []);

  const value = useMemo(
    () => ({ items, status, unread: items.filter((n) => !n.read_at).length, markRead, markAllRead, remove, reload: load, muted, saveMuted }),
    [items, status, muted, saveMuted, markRead, markAllRead, remove, load]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used inside a <NotificationsProvider>.');
  return ctx;
}
