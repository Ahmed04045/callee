// src/context/AuthContext.jsx
//
// Real Supabase auth: email/password sign-in and sign-up, session restored
// on load, session kept in sync via onAuthStateChange. The old mock
// provider-registry (Google/Facebook placeholders, NoSuits Labs stub) is
// gone — those weren't functional and this is a real backend now. Adding
// Supabase OAuth later (Google, GitHub, etc.) is a `supabase.auth.signInWithOAuth`
// call once you configure the provider in the Supabase dashboard; ping me
// when you're ready and I'll wire the button in.

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // status: 'loading' (initial session check) | 'authenticated' | 'unauthenticated'
  const [status, setStatus] = useState('loading');
  const [session, setSession] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!isMounted) return;
      setSession(data.session);
      setStatus(data.session ? 'authenticated' : 'unauthenticated');
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setStatus(nextSession ? 'authenticated' : 'unauthenticated');
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(async (email, password) => {
    setError(null);
    const { error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) setError(signUpError.message);
    return { error: signUpError };
  }, []);

  const signIn = useCallback(async (email, password) => {
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setError(signInError.message);
    return { error: signInError };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const value = useMemo(
    () => ({
      status,
      user: session?.user ?? null,
      session,
      error,
      signIn,
      signUp,
      signOut,
    }),
    [status, session, error, signIn, signUp, signOut]
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