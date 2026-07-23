// src/components/AuthModal.jsx
//
// Email/password sign-in and sign-up, backed by AuthContext's Supabase
// calls.

import React, { useEffect, useState } from 'react';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { logUserAction } from './TelemetryLog';
import Icon from './Icon';

export default function AuthModal({ isOpen, initialMode = 'signIn', onClose }) {
  const { colors, radius, spacing, font, brand } = themeConfig;
  const { signIn, signUp, error } = useAuth();

  const [mode, setMode] = useState(initialMode); // 'signIn' | 'signUp'
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
    setNotice(null);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setNotice(null);
    logUserAction('AUTH_SUBMIT', { mode });

    const action = mode === 'signIn' ? signIn : signUp;
    const { error: actionError } = await action(email, password);

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
    setNotice(null);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-md3-onSurface/40 backdrop-blur-sm px-4"
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
          <div
            className={`w-12 h-12 mx-auto ${colors.gradientBrand} ${radius.md} flex items-center justify-center ${colors.accentOn} ${font.heading} text-sm`}
          >
            {brand.shortMark}
          </div>
          <h2 id="auth-modal-title" className={`text-lg ${font.heading} ${colors.textWhite} mt-3`}>
            {mode === 'signIn' ? 'Sign in to' : 'Create your'} {brand.name} account
          </h2>
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

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full flex items-center justify-center gap-2 ${radius.md} py-2.5 text-sm font-bold ${colors.accentOn} ${colors.accentBg} ${colors.accentBgHover} transition disabled:opacity-60`}
          >
            {isSubmitting && (
              <Icon name="progress_activity" size={16} className="animate-spin text-inherit" />
            )}
            {mode === 'signIn' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        {error && <p className={`mt-3 text-xs ${colors.error} text-center`}>{error}</p>}
        {notice && <p className={`mt-3 text-xs ${colors.success} text-center`}>{notice}</p>}

        <button
          onClick={toggleMode}
          className={`mt-5 w-full text-center text-xs ${colors.textFaint} ${colors.textHoverStrong} transition`}
        >
          {mode === 'signIn' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}