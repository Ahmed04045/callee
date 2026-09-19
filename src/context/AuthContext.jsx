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
  const [isAdmin, setIsAdmin] = useState(false);
  // adminChecked flips true once is_admin() has answered for the CURRENT user.
  // "Not checked yet" must never be treated as "not an admin" — that race is
  // what used to bounce real admins off /admin on a direct page load.
  const [adminChecked, setAdminChecked] = useState(false);

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

  // Admin status is never trusted from anything client-side — it's asked
  // of the database via a SECURITY DEFINER function (is_admin(), see
  // supabase/migrations/002_gig_moderation.sql) every time the session
  // changes. Postgres is the actual gate; this is just so the UI knows
  // whether to show admin-only surfaces.
  useEffect(() => {
    let isMounted = true;
    const userId = session?.user?.id;

    if (!userId) {
      setIsAdmin(false);
      setAdminChecked(true);
      return;
    }

    setAdminChecked(false);
    supabase.rpc('is_admin').then(({ data, error: rpcError }) => {
      if (!isMounted) return;
      setIsAdmin(!rpcError && data === true);
      setAdminChecked(true);
    });

    return () => {
      isMounted = false;
    };
  }, [session?.user?.id]);

  const signUp = useCallback(async (email, password, accountType = 'personal') => {
    setError(null);
    // window.location.origin resolves to whatever the app is actually
    // running on right now — http://localhost:5173 in dev, your real
    // domain in production — so this never needs a hardcoded URL. Supabase
    // still requires that URL to be allow-listed in the dashboard (see
    // Authentication -> URL Configuration -> Redirect URLs) or it silently
    // falls back to the Site URL default.
    //
    // accountType rides along as a query param on the redirect — there's
    // no active session between signUp() and email confirmation, so it
    // can't be written to the profiles table yet; App.jsx reads it back
    // out of the URL on first authenticated load and applies it then.
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/?accountType=${accountType}` },
    });
    if (signUpError) setError(signUpError.message);
    return { error: signUpError };
  }, []);

  const signIn = useCallback(async (email, password) => {
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) setError(signInError.message);
    return { error: signInError };
  }, []);

  const signInWithGoogle = useCallback(async (accountType) => {
    setError(null);
    // accountType (only set for "sign up as a business") rides along on the
    // redirect, same trick as email sign-up; App.jsx applies it on return.
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: accountType
          ? `${window.location.origin}/?accountType=${accountType}`
          : window.location.origin,
      },
    });
    if (oauthError) setError(oauthError.message);
    return { error: oauthError };
  }, []);

  const resetPassword = useCallback(async (email) => {
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });
    if (resetError) setError(resetError.message);
    return { error: resetError };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  const updatePassword = useCallback(async (newPassword) => {
    setError(null);
    // Works for an already-signed-in session (no old password needed) —
    // this is "change password" while logged in, not the forgot-password
    // email flow (that's a separate supabase.auth.resetPasswordForEmail
    // call, for when someone isn't signed in at all).
    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword });
    if (updateError) setError(updateError.message);
    return { error: updateError };
  }, []);

  // True from app start until we know for sure whether this user is an admin.
  const isAdminLoading = status === 'loading' || (Boolean(session) && !adminChecked);

  const value = useMemo(
    () => ({
      status,
      user: session?.user ?? null,
      session,
      error,
      isAdmin,
      isAdminLoading,
      signIn,
      signUp,
      signInWithGoogle,
      resetPassword,
      signOut,
      updatePassword,
    }),
    [status, session, error, isAdmin, isAdminLoading, signIn, signUp, signInWithGoogle, resetPassword, signOut, updatePassword]
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