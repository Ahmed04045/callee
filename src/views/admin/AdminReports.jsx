// src/views/admin/AdminReports.jsx
//
// Reports people filed against events, gigs, clubs and profiles. Admins open
// the reported item, then mark the report resolved or dismissed. (To take a
// listing down, use the Gigs / Events / Groups pages.)

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import themeConfig from '../../theme/themeConfig';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import { PixelEmpty } from '../../components/Pixel';
import { fmtDateTime } from '../../lib/clubUtil';
import { useT } from '../../i18n';

const REASON_LABEL = { spam: 'Spam', scam: 'Scam or fake', inappropriate: 'Inappropriate', wrong_info: 'Wrong information', other: 'Other' };
const linkFor = (r) => ({ event: `/events/${r.item_id}`, gig: `/gigs/${r.item_id}`, club: `/clubs/${r.item_id}`, profile: `/u/${r.item_id}` })[r.kind];

export default function AdminReports() {
  const { t } = useT();
  const { colors, radius } = themeConfig;
  const { user } = useAuth();
  const [tab, setTab] = useState('open');
  const [rows, setRows] = useState([]);
  const [status, setStatus] = useState('loading');

  const load = useCallback(async () => {
    const { data, error } = await supabase.from('reports').select('*').eq('status', tab).order('created_at', { ascending: false }).limit(100);
    if (error) return setStatus('error');
    setRows(data ?? []);
    setStatus('ready');
  }, [tab]);

  useEffect(() => {
    setStatus('loading');
    load();
  }, [load]);

  const resolve = async (row, next) => {
    await supabase.from('reports').update({ status: next, resolved_by: user.id, resolved_at: new Date().toISOString() }).eq('id', row.id);
    load();
  };

  return (
    <div className="w-full max-w-3xl space-y-6">
      <div className={`border-b ${colors.border} pb-3`}>
        <h2 className={`text-xl font-bold ${colors.textWhite}`}>{t('Reports')}</h2>
        <p className={`text-xs ${colors.textFaint} mt-1`}>{t('Things people flagged. Open the item, decide, then close the report.')}</p>
      </div>
      <div className="flex gap-2">
        {[['open', 'Open'], ['resolved', 'Resolved'], ['dismissed', 'Dismissed']].map(([k, label]) => (
          <button key={k} onClick={() => setTab(k)} className={`text-xs font-bold px-3.5 py-1.5 ${radius.full} border ${tab === k ? `${colors.accentBg} ${colors.accentOn} border-transparent` : `${colors.textFaint} ${colors.borderStrong}`}`}>{label}</button>
        ))}
      </div>

      {status === 'error' && <p className={`text-xs ${colors.error}`}>{t('Couldn\'t load reports. Has 012_tickets_saves_reports_applicants.sql been run?')}</p>}
      {status === 'ready' && rows.length === 0 && <PixelEmpty sprite="box" title={`No ${tab} reports`} />}

      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.id} className={`${colors.bgCardStrong} border ${colors.border} ${radius.lg} p-4 space-y-2`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className={`text-sm font-bold ${colors.textWhite}`}>{REASON_LABEL[r.reason] ?? r.reason} <span className={`font-normal ${colors.textFaint}`}>· {r.kind}</span></p>
              <span className={`text-[11px] ${colors.textFaint}`}>{fmtDateTime(r.created_at)}</span>
            </div>
            {r.details && <p className={`text-xs ${colors.textMuted} leading-relaxed`}>&ldquo;{r.details}&rdquo;</p>}
            <div className="flex flex-wrap gap-2 items-center pt-1">
              <Link to={linkFor(r)} className={`text-xs font-semibold ${colors.accent}`}>Open reported {r.kind} →</Link>
              {r.status === 'open' && (
                <>
                  <button onClick={() => resolve(r, 'resolved')} className={`text-[11px] font-bold px-3 py-1.5 ${colors.accentBg} ${colors.accentOn} ${radius.full}`}>{t('Mark resolved')}</button>
                  <button onClick={() => resolve(r, 'dismissed')} className={`text-[11px] font-bold px-3 py-1.5 border ${colors.borderStrong} ${colors.textMuted} ${radius.full}`}>{t('Dismiss')}</button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
