// src/views/SettingsView.jsx
//
// App-wide settings hub — always in the nav, regardless of sign-in state.
// Account only appears in the list when signed in; Theme/Legal/About are
// generic and always available. This is a normal tab (nav stays visible
// here) — its children (Account, Theme, Terms, Privacy, and the standalone
// About page) are the ones that go full-screen/immersive.

import React from 'react';
import { Link } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import Icon from '../components/Icon';
import { useT } from '../i18n';

const ALWAYS_VISIBLE_ITEMS = [
  { id: 'theme', label: 'Appearance and language', path: '/theme', icon: 'dark_mode' },
  { id: 'terms', label: 'Terms of Service', path: '/terms', icon: 'description' },
  { id: 'privacy', label: 'Privacy Policy', path: '/privacy', icon: 'privacy_tip' },
];

const ACCOUNT_ITEM = { id: 'account', label: 'Account', path: '/account', icon: 'manage_accounts' };
const ORGANIZER_ITEM = { id: 'organizer', label: 'Organizer hub', path: '/organizer', icon: 'event' };
const NOTIFICATIONS_ITEM = { id: 'notifications', label: 'Notifications', path: '/settings/notifications', icon: 'notifications' };
const MY_SUBMISSIONS_ITEM = {
  id: 'my-submissions',
  label: 'My Submissions',
  path: '/my-submissions',
  icon: 'inbox',
};

export default function SettingsView() {
  const { t } = useT();
  const { colors, radius, font, brand } = themeConfig;
  const { status } = useAuth();
  const aboutItem = { id: 'about', label: t('About {name}', { name: brand.name }), path: '/about', icon: 'info' };
  const menuItems =
    status === 'authenticated'
      ? [ACCOUNT_ITEM, ORGANIZER_ITEM, MY_SUBMISSIONS_ITEM, NOTIFICATIONS_ITEM, ...ALWAYS_VISIBLE_ITEMS, aboutItem]
      : [...ALWAYS_VISIBLE_ITEMS, aboutItem];

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <h1 className={`text-2xl ${font.heading} ${colors.textWhite}`}>{t('Settings')}</h1>

      <div className={`${colors.bgCardSoft} border ${colors.border} ${radius.lg} overflow-hidden`}>
        {menuItems.map((item, index) => (
          <Link
            key={item.id}
            to={item.path}
            className={`flex items-center justify-between px-5 py-4 ${colors.bgHoverInset} transition ${
              index !== menuItems.length - 1 ? `border-b ${colors.border}` : ''
            }`}
          >
            <span className={`flex items-center gap-3 text-sm font-semibold ${colors.textWhite}`}>
              <Icon name={item.icon} size={18} className={colors.textFaint} />
              {t(item.label)}
            </span>
            <Icon name="chevron_right" size={18} className={colors.textFaint} />
          </Link>
        ))}
      </div>
    </div>
  );
}
