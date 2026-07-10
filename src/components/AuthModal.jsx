// src/components/AuthModal.jsx
//
// Presentational shell for sign-in. All provider logic lives in
// AuthContext — this component just renders whatever providers are
// registered there and shows pending/error state. Adding a new provider
// (e.g. flipping NoSuits Labs to enabled) requires zero changes here.

import React from 'react';
import { X, Sparkles, Loader2 } from 'lucide-react';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { logUserAction } from './TelemetryLog';

// Custom inline SVGs for the third-party platforms to prevent Lucide library dependency failures
const GoogleIcon = () => (
  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
  </svg>
);

const FacebookIcon = () => (
  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" fill="#1877F2"/>
  </svg>
);

const PROVIDER_ICONS = {
  google: GoogleIcon,
  facebook: FacebookIcon,
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
                {isPending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : provider.id === 'google' || provider.id === 'facebook' ? (
                  <Icon />
                ) : (
                  <Icon size={16} />
                )}
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
