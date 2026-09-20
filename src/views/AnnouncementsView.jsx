// src/views/AnnouncementsView.jsx

import React, { useMemo } from 'react';
import themeConfig from '../theme/themeConfig';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import Icon from '../components/Icon';
import { useT } from '../i18n';

function formatDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function AnnouncementCard({ item }) {
  const { colors, radius } = themeConfig;
  return (
    <article className={`${colors.bgCardStrong} border ${colors.border} ${radius.lg} p-6 space-y-3`}>
      <div className={`flex justify-between items-center text-xs ${colors.textFaint}`}>
        <span className={`${colors.textWhite} font-bold`}>{item.author}</span>
        <span>{formatDate(item.published_at)}</span>
      </div>
      <h3 className={`text-base font-bold ${colors.textWhite}`}>{item.title}</h3>
      <p className={`text-sm ${colors.textMuted} leading-relaxed`}>{item.content}</p>
    </article>
  );
}

export default function AnnouncementsView() {
  const { t } = useT();
  const { colors } = themeConfig;
  const { data: announcements, status } = useSupabaseTable('announcements', {
    orderBy: 'published_at',
    ascending: false,
  });

  const systemUpdates = useMemo(
    () => announcements.filter((item) => item.category === 'system_update'),
    [announcements]
  );
  const localNews = useMemo(
    () => announcements.filter((item) => item.category === 'local_news'),
    [announcements]
  );

  return (
    <div className="w-full space-y-8">
      <div className={`border-b ${colors.border} pb-3`}>
        <h2 className={`text-xl font-bold ${colors.textWhite}`}>{t('Broadcast Announcements')}</h2>
        <p className={`text-xs ${colors.textFaint} mt-1`}>
          {t('Official platform updates and what\'s happening in the local youth ecosystem.')}
        </p>
      </div>

      {status === 'loading' && <p className={`text-xs ${colors.textFaint}`}>{t('Loading…')}</p>}
      {status === 'error' && (
        <p className={`text-xs ${colors.error}`}>{t('Couldn\'t load announcements. Try refreshing.')}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3
            className={`text-sm font-bold ${colors.textMuted} uppercase tracking-wider flex items-center gap-2`}
          >
            <Icon name="campaign" size={16} className={colors.accent} /> {t('App System Updates')}
          </h3>
          {status === 'ready' && systemUpdates.length === 0 && (
            <p className={`text-xs ${colors.textFaint}`}>{t('No updates yet.')}</p>
          )}
          <div className="space-y-4">
            {systemUpdates.map((item) => (
              <AnnouncementCard key={item.id} item={item} />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h3
            className={`text-sm font-bold ${colors.textMuted} uppercase tracking-wider flex items-center gap-2`}
          >
            <Icon name="newspaper" size={16} className={colors.secondary} /> {t('Local Ecosystem News')}
          </h3>
          {status === 'ready' && localNews.length === 0 && (
            <p className={`text-xs ${colors.textFaint}`}>{t('No local news yet.')}</p>
          )}
          <div className="space-y-4">
            {localNews.map((item) => (
              <AnnouncementCard key={item.id} item={item} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}