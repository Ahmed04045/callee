// src/views/NotificationSettingsView.jsx
//
// Choose which kinds of notifications you get. A switched-off category is stored
// as muted types in notification_prefs; the database then skips creating those
// notifications for you (push_notification in 013_questions_prefs_reminders.sql).

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationsContext';
import { NOTIFICATION_CATEGORIES } from '../lib/notificationMeta';
import SubPageHeader from '../components/SubPageHeader';
import { useT } from '../i18n';

export default function NotificationSettingsView() {
  const { t } = useT();
  const { colors, radius } = themeConfig;
  const { user } = useAuth();
  const { muted, saveMuted } = useNotifications();
  const [error, setError] = useState('');

  if (!user) {
    return (
      <div className="w-full max-w-md mx-auto">
        <SubPageHeader title={t('Notifications')} />
        <p className={`text-sm ${colors.textMuted}`}>{t('Sign in to choose your notifications.')}</p>
      </div>
    );
  }

  const isOn = (category) => !category.types.every((type) => muted.includes(type));

  const toggle = async (category) => {
    setError('');
    const next = isOn(category)
      ? [...new Set([...muted, ...category.types])]
      : muted.filter((type) => !category.types.includes(type));
    const message = await saveMuted(next);
    if (message) setError(t('Could not save. Has 013_questions_prefs_reminders.sql been run?'));
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-4">
      <SubPageHeader title={t('Notifications')} />
      <p className={`text-xs ${colors.textFaint}`}>
        {t('Choose what shows up in your bell and Activity page. Switched-off types are not created at all.')}
      </p>

      <div className={`${colors.bgCardSoft} border ${colors.border} ${radius.lg} overflow-hidden`}>
        {NOTIFICATION_CATEGORIES.map((category, index) => {
          const on = isOn(category);
          return (
            <label
              key={category.id}
              className={`flex items-center justify-between gap-4 px-5 py-4 cursor-pointer ${colors.bgHoverInset} ${index !== NOTIFICATION_CATEGORIES.length - 1 ? `border-b ${colors.border}` : ''}`}
            >
              <span className="min-w-0">
                <span className={`block text-sm font-semibold ${colors.textWhite}`}>{t(category.label)}</span>
                <span className={`block text-[11px] ${colors.textFaint} mt-0.5`}>{t(category.hint)}</span>
              </span>
              <input type="checkbox" role="switch" checked={on} onChange={() => toggle(category)} className="w-5 h-5 accent-md3-primary shrink-0" />
            </label>
          );
        })}
      </div>

      {error && <p className={`text-xs ${colors.error}`}>{error}</p>}
      <p className={`text-[11px] ${colors.textFaint}`}>
        {t('Notifications appear in the app. Email and push are not available yet.')} <Link to="/activity" className={colors.accent}>{t('Open Activity')}</Link>
      </p>
    </div>
  );
}
