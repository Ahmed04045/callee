// src/views/ProfileView.jsx

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { logUserAction } from '../components/TelemetryLog';
import Icon from '../components/Icon';

const LEGAL_TABS = [
  { id: 'tos', label: 'Terms of Service' },
  { id: 'privacy', label: 'Privacy Policy' },
];

// Placeholder copy only — swap these two strings for your real ToS/Privacy
// text whenever you have it. Keeping it as plain text here (rather than,
// say, markdown rendering) on purpose since it's a couple of paragraphs;
// revisit if the real documents end up long enough to want that.
const LEGAL_PLACEHOLDER = {
  tos: 'Terms of Service content goes here. Replace this placeholder with your actual terms before launch — Google Ads and most payment providers will want to see a real one.',
  privacy: "Privacy Policy content goes here. Replace this placeholder with your actual policy — cover what you collect (account email, applications, telemetry events) and why.",
};

export default function ProfileView({ onOpenAuthModal }) {
  const { colors, radius, font, brand } = themeConfig;
  const { status, user, signOut } = useAuth();
  const isAuthenticated = status === 'authenticated' && user;
  const isLoadingSession = status === 'loading';
  const [legalTab, setLegalTab] = useState('tos');

  if (isLoadingSession) {
    return <p className={`text-sm ${colors.textFaint}`}>Checking your session…</p>;
  }

  // Guest state: just the one clear call to action, nothing else.
  if (!isAuthenticated) {
    return (
      <div className="w-full max-w-sm mx-auto text-center py-16 space-y-5">
        <div
          className={`w-16 h-16 mx-auto ${colors.bgInset} ${radius.full} flex items-center justify-center ${colors.textFaint}`}
        >
          <Icon name="person" size={28} />
        </div>
        <div>
          <h2 className={`text-lg font-bold ${colors.textWhite}`}>You're not signed in</h2>
          <p className={`text-xs ${colors.textFaint} mt-1.5 leading-relaxed`}>
            Create an account to apply to gigs, save events, and track your submissions.
          </p>
        </div>
        <button
          onClick={() => {
            logUserAction('OPEN_AUTH_MODAL', { source: 'profile', mode: 'signUp' });
            onOpenAuthModal?.('signUp');
          }}
          className={`inline-flex items-center justify-center gap-2 text-sm font-bold ${colors.accentOn} ${colors.accentBg} ${colors.accentBgHover} ${radius.full} px-6 py-2.5 transition`}
        >
          <Icon name="person_add" size={16} className="text-inherit" /> Sign up
        </button>
        <p className={`text-xs ${colors.textFaint}`}>
          Already have an account?{' '}
          <button
            onClick={() => onOpenAuthModal?.('signIn')}
            className={`font-semibold ${colors.accent}`}
          >
            Sign in
          </button>
        </p>
      </div>
    );
  }

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Account card */}
      <div className={`${colors.bgCard} border ${colors.border} ${radius.lg} p-6 text-center space-y-4`}>
        <div
          className={`w-20 h-20 ${colors.gradientBrand} ${radius.full} mx-auto flex items-center justify-center text-2xl ${font.heading} ${colors.accentOn}`}
        >
          {user.email?.[0]?.toUpperCase() ?? 'U'}
        </div>
        <div>
          <h3 className={`text-lg font-bold ${colors.textWhite} break-all`}>{user.email}</h3>
          <p className={`text-xs ${colors.textFaint} font-mono`}>Signed in</p>
        </div>

        <button
          onClick={() => {
            logUserAction('SIGN_OUT_CLICK', {});
            signOut();
          }}
          className={`w-full flex items-center justify-center gap-2 text-xs font-bold ${colors.textMuted} border ${colors.borderStrong} ${radius.full} py-2 ${colors.textHoverStrong} transition`}
        >
          <Icon name="logout" size={14} /> Sign out
        </button>
      </div>

      {/* Settings + legal */}
      <div className="md:col-span-2 space-y-6">
        <div className={`${colors.bgCardSoft} border ${colors.border} ${radius.lg} p-6 space-y-4`}>
          <h3
            className={`text-sm font-bold ${colors.textPrimary} uppercase tracking-wider flex items-center gap-2`}
          >
            <Icon name="settings" size={16} /> App Settings
          </h3>
          <div className={`space-y-3 text-xs ${colors.textMuted}`}>
            <label
              className={`flex items-center justify-between p-3 ${colors.bgInset} ${radius.md} border ${colors.border}`}
            >
              <span>Enable push notifications for nearby events</span>
              <input type="checkbox" defaultChecked className="accent-md3-primary" />
            </label>
            <label
              className={`flex items-center justify-between p-3 ${colors.bgInset} ${radius.md} border ${colors.border}`}
            >
              <span>Visible in recruitment pools for startups</span>
              <input type="checkbox" defaultChecked className="accent-md3-primary" />
            </label>
          </div>
        </div>

        <div className={`${colors.bgCardSoft} border ${colors.border} ${radius.lg} p-6 space-y-4`}>
          <h3
            className={`text-sm font-bold ${colors.textPrimary} uppercase tracking-wider flex items-center gap-2`}
          >
            <Icon name="gavel" size={16} /> Legal
          </h3>

          <div className="flex gap-2">
            {LEGAL_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setLegalTab(tab.id)}
                className={`text-xs font-bold px-3.5 py-1.5 ${radius.full} border transition ${
                  legalTab === tab.id
                    ? `${colors.accentBg} ${colors.accentOn} border-transparent`
                    : `${colors.textFaint} ${colors.borderStrong} ${colors.textHoverStrong}`
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className={`${colors.bgInset} border ${colors.border} ${radius.md} p-4`}>
            <p className={`text-xs ${colors.textFaint} italic leading-relaxed`}>
              {LEGAL_PLACEHOLDER[legalTab]}
            </p>
          </div>
        </div>

        <Link
          to="/about"
          className={`inline-flex items-center gap-1.5 text-xs font-semibold ${colors.textFaint} ${colors.textHoverAccent} transition`}
        >
          <Icon name="info" size={14} /> About {brand.name}
        </Link>
      </div>
    </div>
  );
}