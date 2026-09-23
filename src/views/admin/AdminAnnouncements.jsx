// src/views/admin/AdminAnnouncements.jsx
//
// Announcements used to only be addable via the Supabase Table Editor (see
// schema.sql's own comment) — this is the first in-app create flow, and the
// first to support an Arabic version alongside the English one (021).

import React, { useState } from 'react';
import themeConfig from '../../theme/themeConfig';
import { supabase } from '../../lib/supabaseClient';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import { logUserAction } from '../../components/TelemetryLog';
import Icon from '../../components/Icon';
import { useT } from '../../i18n';

const CATEGORIES = [
  { id: 'system_update', label: 'App system update' },
  { id: 'local_news', label: 'Local ecosystem news' },
];

const inputClass = (colors, radius) =>
  `w-full ${colors.bgInset} border ${colors.borderStrong} ${radius.md} px-3 py-2.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary`;

export default function AdminAnnouncements() {
  const { t } = useT();
  const { colors, radius } = themeConfig;
  const { data: announcements, status, refetch } = useSupabaseTable('announcements', {
    orderBy: 'published_at',
    ascending: false,
  });

  const [category, setCategory] = useState('system_update');
  const [author, setAuthor] = useState('');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [titleAr, setTitleAr] = useState('');
  const [contentAr, setContentAr] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const input = inputClass(colors, radius);

  const submit = async (e) => {
    e.preventDefault();
    if (!author.trim() || !title.trim() || !content.trim()) return setError(t('Fill in author, title and content.'));
    setError('');
    setBusy(true);
    const { error: insertError } = await supabase.from('announcements').insert({
      category,
      author: author.trim(),
      title: title.trim(),
      content: content.trim(),
      title_ar: titleAr.trim() || null,
      content_ar: contentAr.trim() || null,
    });
    setBusy(false);
    if (insertError) return setError(insertError.message);
    logUserAction('ADMIN_ANNOUNCEMENT_CREATE', { category });
    setTitle('');
    setContent('');
    setTitleAr('');
    setContentAr('');
    refetch();
  };

  const remove = async (id) => {
    if (!window.confirm(t('Delete this announcement?'))) return;
    setDeletingId(id);
    await supabase.from('announcements').delete().eq('id', id);
    setDeletingId(null);
    refetch();
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className={`text-lg font-bold ${colors.textWhite}`}>{t('Announcements')}</h2>
        <p className={`text-xs ${colors.textFaint} mt-1`}>{t('English is required. Arabic is optional — Arabic-reading visitors see it automatically when it\'s filled in.')}</p>
      </div>

      <form onSubmit={submit} className={`${colors.bgCardSoft} border ${colors.border} ${radius.lg} p-5 space-y-4`}>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className={`text-xs font-semibold ${colors.textWhite}`}>{t('Category')}</span>
            <select className={`${input} mt-1.5`} value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{t(c.label)}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className={`text-xs font-semibold ${colors.textWhite}`}>{t('Author')}</span>
            <input className={`${input} mt-1.5`} maxLength={80} value={author} onChange={(e) => setAuthor(e.target.value)} placeholder={t('e.g. Circosodal Team')} />
          </label>
        </div>

        <div className={`${radius.md} border ${colors.border} p-3 space-y-3`}>
          <p className={`text-[11px] font-bold uppercase tracking-wider ${colors.textFaint}`}>{t('English')}</p>
          <label className="block">
            <span className={`text-xs font-semibold ${colors.textWhite}`}>{t('Title')}</span>
            <input className={`${input} mt-1.5`} required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block">
            <span className={`text-xs font-semibold ${colors.textWhite}`}>{t('Content')}</span>
            <textarea className={`${input} mt-1.5 resize-none`} rows={3} required maxLength={1000} value={content} onChange={(e) => setContent(e.target.value)} />
          </label>
        </div>

        <div className={`${radius.md} border ${colors.border} p-3 space-y-3`}>
          <p className={`text-[11px] font-bold uppercase tracking-wider ${colors.textFaint}`}>{t('Arabic (optional)')}</p>
          <label className="block">
            <span className={`text-xs font-semibold ${colors.textWhite}`}>{t('Title')}</span>
            <input dir="rtl" className={`${input} mt-1.5`} maxLength={120} value={titleAr} onChange={(e) => setTitleAr(e.target.value)} />
          </label>
          <label className="block">
            <span className={`text-xs font-semibold ${colors.textWhite}`}>{t('Content')}</span>
            <textarea dir="rtl" className={`${input} mt-1.5 resize-none`} rows={3} maxLength={1000} value={contentAr} onChange={(e) => setContentAr(e.target.value)} />
          </label>
        </div>

        {error && <p className={`text-xs ${colors.error}`}>{error}</p>}
        <button disabled={busy} className={`w-full ${colors.accentBg} ${colors.accentOn} font-bold text-sm py-2.5 ${radius.full} disabled:opacity-50`}>
          {busy ? t('Publishing…') : t('Publish announcement')}
        </button>
      </form>

      <div className="space-y-2">
        <h3 className={`text-sm font-bold ${colors.textWhite}`}>{t('Published')}</h3>
        {status === 'loading' && <p className={`text-xs ${colors.textFaint}`}>{t('Loading…')}</p>}
        {announcements.map((item) => (
          <div key={item.id} className={`${colors.bgCardSoft} border ${colors.border} ${radius.md} p-3.5 flex items-start gap-3`}>
            <div className="min-w-0 flex-1">
              <p className={`text-[10px] font-mono font-bold uppercase tracking-wider ${colors.textFaint}`}>{t(CATEGORIES.find((c) => c.id === item.category)?.label ?? item.category)}</p>
              <p className={`text-sm font-bold ${colors.textWhite}`}>{item.title}</p>
              <p className={`text-xs ${colors.textMuted} mt-0.5 line-clamp-2`}>{item.content}</p>
              {item.title_ar && <p className={`text-[11px] ${colors.accent} mt-1`}>{t('Has Arabic version')}</p>}
            </div>
            <button type="button" disabled={deletingId === item.id} onClick={() => remove(item.id)} aria-label={t('Delete')} className={colors.error}>
              <Icon name="delete" size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
