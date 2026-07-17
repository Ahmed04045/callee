// src/views/AnnouncementsView.jsx

import React from 'react';
import { Megaphone, Newspaper } from 'lucide-react';
import themeConfig from '../theme/themeConfig';

function AnnouncementCard({ item }) {
  const { colors, radius } = themeConfig;
  return (
    <article className={`${colors.bgCardStrong} border ${colors.border} ${radius.lg} p-6 space-y-3`}>
      <div className={`flex justify-between items-center text-xs font-mono ${colors.textFaint}`}>
        <span className={`${colors.textWhite} font-bold`}>{item.author}</span>
        <span>{item.date}</span>
      </div>
      <h3 className={`text-base font-bold ${colors.textWhite}`}>{item.title}</h3>
      <p className={`text-sm ${colors.textMuted} leading-relaxed`}>{item.content}</p>
    </article>
  );
}

export default function AnnouncementsView({ systemUpdates = [], localNews = [] }) {
  const { colors } = themeConfig;

  return (
    <div className="w-full space-y-8">
      <div className={`border-b ${colors.border} pb-3`}>
        <h2 className={`text-xl font-bold ${colors.textWhite}`}>Broadcast Announcements</h2>
        <p className={`text-xs ${colors.textFaint} mt-1`}>
          Official platform updates and what's happening in the local youth ecosystem.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h3
            className={`text-sm font-bold ${colors.textMuted} uppercase tracking-wider flex items-center gap-2`}
          >
            <Megaphone size={14} className={colors.accent} /> App System Updates
          </h3>
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
            <Newspaper size={14} className={colors.secondary} /> Local Ecosystem News
          </h3>
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
