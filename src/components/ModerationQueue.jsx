// src/components/ModerationQueue.jsx
//
// Shared pending / approved / rejected review list used by the admin Gigs,
// Events and Groups pages. The page supplies the query (`table`, `select`)
// and how to render one item; approve/reject is delegated to `onSetStatus`
// so gigs/events can update the row while groups call review_group().

import React, { useState } from 'react';
import themeConfig from '../theme/themeConfig';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import Icon from './Icon';

const TABS = [
  { id: 'pending', label: 'Pending' },
  { id: 'approved', label: 'Approved' },
  { id: 'rejected', label: 'Rejected' },
];

export default function ModerationQueue({ title, subtitle, table, select = '*', orderBy = 'created_at', renderItem, onSetStatus, allowReset = true }) {
  const { colors, radius } = themeConfig;
  const [statusFilter, setStatusFilter] = useState('pending');
  const [error, setError] = useState(null);

  const { data, status, refetch } = useSupabaseTable(table, {
    select,
    filters: { status: statusFilter },
    orderBy,
    ascending: false,
  });

  const change = async (item, next) => {
    setError(null);
    const err = await onSetStatus(item, next);
    if (err) setError(err);
    else refetch();
  };

  const btn = `flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 ${radius.full} ${colors.bgInset} border ${colors.borderStrong} transition`;

  return (
    <div className="w-full max-w-3xl space-y-6">
      <div className={`border-b ${colors.border} pb-3`}>
        <h2 className={`text-xl font-bold ${colors.textWhite}`}>{title}</h2>
        {subtitle && <p className={`text-xs ${colors.textFaint} mt-1`}>{subtitle}</p>}
      </div>

      <div className="flex gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setStatusFilter(tab.id)}
            className={`text-xs font-bold px-3.5 py-1.5 ${radius.full} border transition ${
              statusFilter === tab.id ? `${colors.accentBg} ${colors.accentOn} border-transparent` : `${colors.textFaint} ${colors.borderStrong} ${colors.textHoverStrong}`
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {status === 'loading' && <p className={`text-xs ${colors.textFaint}`}>Loading…</p>}
      {status === 'error' && <p className={`text-xs ${colors.error}`}>Couldn't load. Try refreshing.</p>}
      {status === 'ready' && data.length === 0 && <p className={`text-xs ${colors.textFaint}`}>Nothing in "{statusFilter}" right now.</p>}
      {error && <p className={`text-xs ${colors.error}`}>{error}</p>}

      <div className="space-y-4">
        {data.map((item) => (
          <div key={item.id} className={`${colors.bgCardStrong} border ${colors.border} ${radius.lg} p-5`}>
            {renderItem(item)}
            <div className="flex gap-2 mt-4">
              {item.status !== 'approved' && (
                <button onClick={() => change(item, 'approved')} className={`${btn} ${colors.success}`}>
                  <Icon name="check_circle" size={13} className="text-inherit" /> Approve
                </button>
              )}
              {item.status !== 'rejected' && (
                <button onClick={() => change(item, 'rejected')} className={`${btn} ${colors.error}`}>
                  <Icon name="cancel" size={13} className="text-inherit" /> Reject
                </button>
              )}
              {allowReset && item.status !== 'pending' && (
                <button onClick={() => change(item, 'pending')} className={`${btn} ${colors.textFaint}`}>
                  <Icon name="restart_alt" size={13} className="text-inherit" /> Reset
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
