// src/components/AuthModal.jsx
//
// Email/password sign-in and sign-up, backed by AuthContext's Supabase
// calls. Google/Facebook buttons removed — they weren't wired to anything.
// Supabase OAuth is a real, quick add later if you want it back.

import React, { useState } from 'react';
import { X, Mail, Lock, Loader2 } from 'lucide-react';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { logUserAction } from './TelemetryLog';

export default function AuthModal({ isOpen, onClose }) {
  const { colors, radius, spacing, font, brand } = themeConfig;
  const { signIn, signUp, error } = useAuth();

  const [mode, setMode] = useState('signIn'); // 'signIn' | 'signUp'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);

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
      className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-950/80 backdrop-blur-sm px-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
    >
      <div
        className={`w-full max-w-sm ${colors.bgPanel} border ${colors.borderStrong} ${radius.lg} ${spacing.card} relative`}
      >
        <button
          onClick={resetAndClose}
          aria-label="Close sign-in dialog"
          className={`absolute top-4 right-4 ${colors.textFaint} hover:text-white transition`}
        >
          <X size={18} />
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
              <Mail size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${colors.textFaint}`} />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`w-full ${colors.bgInset} border ${colors.borderStrong} ${radius.md} pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 ${colors.transition}`}
              />
            </div>
          </label>

          <label className="block text-left">
            <span className={`text-[11px] font-semibold ${colors.textFaint}`}>Password</span>
            <div className="relative mt-1">
              <Lock size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${colors.textFaint}`} />
              <input
                type="password"
                required
                minLength={6}
                autoComplete={mode === 'signIn' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full ${colors.bgInset} border ${colors.borderStrong} ${radius.md} pl-9 pr-3 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 ${colors.transition}`}
              />
            </div>
          </label>

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full flex items-center justify-center gap-2 ${radius.md} py-2.5 text-sm font-bold ${colors.accentOn} ${colors.accentBg} ${colors.accentBgHover} transition disabled:opacity-60`}
          >
            {isSubmitting && <Loader2 size={16} className="animate-spin" />}
            {mode === 'signIn' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        {error && <p className="mt-3 text-xs text-red-400 text-center">{error}</p>}
        {notice && <p className="mt-3 text-xs text-emerald-400 text-center">{notice}</p>}

        <button
          onClick={toggleMode}
          className={`mt-5 w-full text-center text-xs ${colors.textFaint} hover:text-white transition`}
        >
          {mode === 'signIn' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </div>
    </div>
  );
}