// src/components/AuthModal.jsx
//
// Email/password sign-in and sign-up, backed by AuthContext's Supabase
// calls.

import React, { useEffect, useState } from 'react';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { logUserAction } from './TelemetryLog';
import Icon from './Icon';
import { LogoMark } from './Logo';

export default function AuthModal({ isOpen, initialMode = 'signIn', onClose }) {
  const { colors, radius, spacing, font, brand } = themeConfig;
  const { signIn, signUp, signInWithGoogle, resetPassword, error } = useAuth();

  const [mode, setMode] = useState(initialMode); // 'signIn' | 'signUp' | 'reset'
  const [accountType, setAccountType] = useState('personal'); // 'personal' | 'business' — signUp only
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

  // Whoever opened the modal (topbar vs. Profile's guest CTA vs. Recruit's
  // "sign in to apply") gets to pick which mode it opens in.
  useEffect(() => {
    if (isOpen) setMode(initialMode);
  }, [isOpen, initialMode]);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setEmail('');
    setPassword('');
    setAccountType('personal');
    setNotice(null);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setNotice(null);
    logUserAction('AUTH_SUBMIT', { mode, accountType: mode === 'signUp' ? accountType : undefined });

    if (mode === 'reset') {
      const { error: resetError } = await resetPassword(email);
      setIsSubmitting(false);
      if (!resetError) setNotice('If that email has an account, a reset link is on its way.');
      return;
    }

    const { error: actionError } =
      mode === 'signIn' ? await signIn(email, password) : await signUp(email, password, accountType);

    setIsSubmitting(false);

    if (actionError) return;

    if (mode === 'signUp') {
      setNotice('Account created — check your inbox to confirm your email before signing in.');
    } else {
      resetAndClose();
    }
  };

  const toggleMode = () => {
    setMode((prev) => (prev === 'signIn' ? 'signUp' : 'signIn'));
    setAccountType('personal');
    setNotice(null);
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center ${colors.scrim} backdrop-blur-sm px-4`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className={`w-full max-w-sm ${colors.bgCardStrong} border ${colors.borderStrong} ${radius.lg} ${spacing.card} relative shadow-xl`}
      >
        <button
          onClick={resetAndClose}
          aria-label="Close sign-in dialog"
          className={`absolute top-4 right-4 ${colors.textFaint} ${colors.textHoverStrong} transition`}
        >
          <Icon name="close" size={18} />
        </button>

        <div className="text-center space-y-1 mb-6">
          <LogoMark size={48} className="mx-auto" />
          <h2 id="auth-modal-title" className={`text-lg ${font.heading} ${colors.textWhite} mt-3`}>
            {mode === 'signIn'
              ? `Sign in to ${brand.name}`
              : mode === 'reset'
                ? 'Reset your password'
                : `Create your ${accountType === 'business' ? 'business ' : ''}${brand.name} account`}
          </h2>
          {mode === 'signUp' && (
            <button
              type="button"
              onClick={() => setAccountType((prev) => (prev === 'personal' ? 'business' : 'personal'))}
              className={`text-[11px] font-semibold ${colors.accent}`}
            >
              {accountType === 'personal' ? 'or sign up as a business' : 'or sign up as an individual'}
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-left">
            <span className={`text-[11px] font-semibold ${colors.textFaint}`}>Email</span>
            <div className="relative mt-1">
              <Icon
                name="mail"
                size={16}
                className={`absolute left-3 top-1/2 -translate-y-1/2 ${colors.textFaint}`}
              />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`w-full ${colors.bgInset} border ${colors.borderStrong} ${radius.md} pl-9 pr-3 py-2.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary ${colors.transition}`}
              />
            </div>
          </label>

          {mode !== 'reset' && (
          <label className="block text-left">
            <span className={`text-[11px] font-semibold ${colors.textFaint}`}>Password</span>
            <div className="relative mt-1">
              <Icon
                name="lock"
                size={16}
                className={`absolute left-3 top-1/2 -translate-y-1/2 ${colors.textFaint}`}
              />
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full ${colors.bgInset} border ${colors.borderStrong} ${radius.md} pl-9 pr-3 py-2.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary ${colors.transition}`}
              />
            </div>
          </label>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full flex items-center justify-center gap-2 ${radius.md} py-2.5 text-sm font-bold ${colors.accentOn} ${colors.accentBg} ${colors.accentBgHover} transition disabled:opacity-60`}
          >
            {isSubmitting && (
              <Icon name="progress_activity" size={16} className="animate-spin text-inherit" />
            )}
            {mode === 'signIn' ? 'Sign in' : mode === 'reset' ? 'Send reset link' : 'Create account'}
          </button>
        </form>

        {mode !== 'reset' && (
          <>
            <div className={`flex items-center gap-3 my-4 text-[11px] ${colors.textFaint}`}>
              <span className={`h-px flex-1 ${colors.bgPill}`} /> or <span className={`h-px flex-1 ${colors.bgPill}`} />
            </div>
            <button
              type="button"
              onClick={() => {
                logUserAction('AUTH_GOOGLE', { mode });
                signInWithGoogle(mode === 'signUp' ? accountType : undefined);
              }}
              className={`w-full flex items-center justify-center gap-2 ${radius.md} py-2.5 text-sm font-bold ${colors.textWhite} border ${colors.borderStrong} ${colors.bgHoverInset} transition`}
            >
              <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 8 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
                <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/>
              </svg>
              Continue with Google
            </button>
          </>
        )}

        {error && <p className={`mt-3 text-xs ${colors.error} text-center`}>{error}</p>}
        {notice && <p className={`mt-3 text-xs ${colors.success} text-center`}>{notice}</p>}

        {mode === 'signIn' && (
          <button
            onClick={() => { setMode('reset'); setNotice(null); }}
            className={`mt-4 w-full text-center text-[11px] ${colors.textFaint} ${colors.textHoverStrong} transition`}
          >
            Forgot your password?
          </button>
        )}
        <button
          onClick={() => (mode === 'reset' ? setMode('signIn') : toggleMode())}
          className={`mt-3 w-full text-center text-xs ${colors.textFaint} ${colors.textHoverStrong} transition`}
        >
          {mode === 'signIn'
            ? "Don't have an account? Sign up"
            : mode === 'reset'
              ? 'Back to sign in'
              : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}