// src/components/AuthModal.jsx
//
// Presentational shell for sign-in. All provider logic lives in
// AuthContext — this component just renders whatever providers are
// registered there and shows pending/error state. Adding a new provider
// (e.g. flipping NoSuits Labs to enabled) requires zero changes here.

import React from 'react';
import { X, Chrome, Facebook, Sparkles, Loader2 } from 'lucide-react';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { logUserAction } from './TelemetryLog';

const PROVIDER_ICONS = {
  google: Chrome,
  facebook: Facebook,
  noSuitsLabs: Sparkles,
};

export default function AuthModal({ isOpen, onClose }) {
  const { colors, radius, spacing, font } = themeConfig;
  const { providers, signIn, status, error, activeProviderId } = useAuth();

  if (!isOpen) return null;

  const handleProviderClick = (provider) => {
    if (!provider.enabled) return;
    logUserAction('AUTH_PROVIDER_CLICK', { provider: provider.id });
    signIn(provider.id);
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
          onClick={onClose}
          aria-label="Close sign-in dialog"
          className={`absolute top-4 right-4 ${colors.textFaint} hover:text-white transition`}
        >
          <X size={18} />
        </button>

        <div className="text-center space-y-1 mb-6">
          <div
            className={`w-12 h-12 mx-auto ${colors.gradientBrand} ${radius.md} flex items-center justify-center ${colors.accentOn} ${font.heading} text-sm`}
          >
            {themeConfig.brand.shortMark}
          </div>
          <h2 id="auth-modal-title" className={`text-lg ${font.heading} ${colors.textWhite} mt-3`}>
            Sign in to {themeConfig.brand.name}
          </h2>
          <p className={`text-xs ${colors.textFaint}`}>
            Save gigs, apply to opportunities, and track your submissions.
          </p>
        </div>

        <div className="space-y-3">
          {providers.map((provider) => {
            const Icon = PROVIDER_ICONS[provider.id] || Sparkles;
            const isPending = status === 'pending' && activeProviderId === provider.id;

            return (
              <button
                key={provider.id}
                onClick={() => handleProviderClick(provider)}
                disabled={!provider.enabled || status === 'pending'}
                className={`w-full flex items-center justify-center gap-2 ${radius.md} ${spacing.cardCompact} text-sm font-semibold border ${colors.borderStrong} transition
                  ${provider.enabled ? `${colors.textWhite} hover:border-neutral-700 bg-neutral-950/40` : `${colors.textDim} bg-neutral-950/20 cursor-not-allowed`}`}
              >
                {isPending ? <Loader2 size={16} className="animate-spin" /> : <Icon size={16} />}
                {provider.label}
                {provider.comingSoon && (
                  <span
                    className={`ml-1 text-[9px] ${font.mono} ${colors.accentSoftBg} ${colors.accent} px-1.5 py-0.5 ${radius.full}`}
                  >
                    Soon
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {status === 'error' && error && (
          <p className="mt-4 text-xs text-red-400 text-center">{error}</p>
        )}

        <p className={`mt-6 text-[10px] ${colors.textDim} text-center leading-relaxed`}>
          By continuing you agree to Captee's Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}
