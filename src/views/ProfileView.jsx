// src/views/ProfileView.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { logUserAction } from '../components/TelemetryLog';
import Icon from '../components/Icon';

const MENU_ITEMS = [
  { id: 'edit-profile', label: 'Edit Profile', path: '/profile/edit', icon: 'edit' },
  { id: 'account', label: 'Account', path: '/profile/settings', icon: 'manage_accounts' },
  { id: 'theme', label: 'Theme', path: '/profile/theme', icon: 'dark_mode' },
  { id: 'terms', label: 'Terms of Service', path: '/profile/terms', icon: 'description' },
  { id: 'privacy', label: 'Privacy Policy', path: '/profile/privacy', icon: 'privacy_tip' },
  { id: 'about', label: 'About Captee', path: '/about', icon: 'info' },
];

export default function ProfileView({ onOpenAuthModal }) {
  const { colors, radius, font } = themeConfig;
  const { status, user, signOut } = useAuth();
  const { profile } = useProfile();
  const isAuthenticated = status === 'authenticated' && user;
  const isLoadingSession = status === 'loading';
  const displayName = profile?.display_name?.trim();

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
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Account identity */}
      <div className={`${colors.bgCard} border ${colors.border} ${radius.lg} p-6 text-center space-y-4`}>
        <div
          className={`w-20 h-20 ${colors.gradientBrand} ${radius.full} mx-auto flex items-center justify-center text-2xl ${font.heading} ${colors.accentOn}`}
        >
          {(displayName || user.email)?.[0]?.toUpperCase() ?? 'U'}
        </div>
        <div>
          <h3 className={`text-lg font-bold ${colors.textWhite} break-all`}>
            {displayName || user.email}
          </h3>
          <p className={`text-xs ${colors.textFaint}`}>{displayName ? user.email : 'Signed in'}</p>
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

      {/* Menu */}
      <div className={`${colors.bgCardSoft} border ${colors.border} ${radius.lg} overflow-hidden`}>
        {MENU_ITEMS.map((item, index) => (
          <Link
            key={item.id}
            to={item.path}
            className={`flex items-center justify-between px-5 py-4 ${colors.bgHoverInset} transition ${
              index !== MENU_ITEMS.length - 1 ? `border-b ${colors.border}` : ''
            }`}
          >
            <span className={`flex items-center gap-3 text-sm font-semibold ${colors.textWhite}`}>
              <Icon name={item.icon} size={18} className={colors.textFaint} />
              {item.label}
            </span>
            <Icon name="chevron_right" size={18} className={colors.textFaint} />
          </Link>
        ))}
      </div>
    </div>
  );
}