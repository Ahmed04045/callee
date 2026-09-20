// src/components/NotificationBell.jsx
//
// Header bell with an unread count and a dropdown of the latest notifications.
// Clicking one marks it read and opens its link; "See all" goes to Activity.

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useNotifications } from '../context/NotificationsContext';
import { metaFor, notificationText, timeAgo } from '../lib/notificationMeta';
import Icon from './Icon';
import { useT } from '../i18n';

export default function NotificationBell() {
  const { t, locale } = useT();
  const { colors, radius } = themeConfig;
  const { items, unread, markRead, markAllRead, status } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => !ref.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openItem = (n) => {
    markRead(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        title={t('Notifications')}
        aria-label={unread ? t('Notifications, {n} unread', { n: unread }) : t('Notifications')}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`relative p-2 ${radius.md} ${colors.bgHoverInset}`}
      >
        <Icon name="notifications" size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -end-0.5 min-w-[16px] h-4 px-1 bg-md3-tertiary text-md3-surface text-[10px] font-mono font-bold leading-4 text-center">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div role="menu" className={`absolute end-0 mt-2 w-80 max-w-[calc(100vw-2rem)] ${colors.bgCardStrong} border ${colors.borderStrong} ${radius.md} z-50`}>
          <div className={`flex items-center justify-between px-3 py-2 border-b ${colors.border}`}>
            <p className={`text-xs font-mono font-bold uppercase tracking-wider ${colors.textMuted}`}>{t('Notifications')}</p>
            {unread > 0 && (
              <button onClick={markAllRead} className={`text-[11px] font-semibold ${colors.accent}`}>
                {t('Mark all read')}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {status === 'error' && <p className={`p-4 text-xs ${colors.error}`}>{t('Couldn\'t load notifications. Has 011_notifications.sql been run?')}</p>}
            {status !== 'error' && items.length === 0 && (
              <p className={`p-4 text-xs ${colors.textFaint}`}>{t('Nothing yet. Requests, approvals and RSVPs will show up here.')}</p>
            )}
            {items.slice(0, 8).map((n) => {
              const meta = metaFor(n.type);
              const text = notificationText(n, t);
              return (
                <button
                  key={n.id}
                  role="menuitem"
                  onClick={() => openItem(n)}
                  className={`w-full text-start flex gap-3 px-3 py-2.5 ${colors.bgHoverInset} border-b ${colors.border} ${n.read_at ? 'opacity-70' : ''}`}
                >
                  <Icon name={meta.icon} size={18} className={`mt-0.5 shrink-0 ${colors[meta.tone] ?? colors.accent}`} />
                  <span className="min-w-0 flex-1">
                    <span className={`block text-xs font-bold ${colors.textWhite}`}>{text.title}</span>
                    {text.body && <span className={`block text-[11px] ${colors.textMuted} truncate`}>{text.body}</span>}
                    <span className={`block text-[10px] ${colors.textFaint} mt-0.5`}>{timeAgo(n.created_at, t, locale)}</span>
                  </span>
                  {!n.read_at && <span className="w-2 h-2 mt-1.5 bg-md3-primary shrink-0" aria-hidden="true" />}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => {
              setOpen(false);
              navigate('/activity');
            }}
            className={`w-full px-3 py-2.5 text-[11px] font-mono font-bold uppercase tracking-wider ${colors.accent} ${colors.bgHoverInset}`}
          >
            {t('See all activity →')}
          </button>
        </div>
      )}
    </div>
  );
}
