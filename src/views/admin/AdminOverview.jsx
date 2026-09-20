// src/views/admin/AdminOverview.jsx

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import themeConfig from '../../theme/themeConfig';
import { supabase } from '../../lib/supabaseClient';
import Icon from '../../components/Icon';
import { useT } from '../../i18n';

const count = (table, filters = {}, column = 'id') => {
  let q = supabase.from(table).select(column, { count: 'exact', head: true });
  Object.entries(filters).forEach(([k, v]) => {
    q = q.eq(k, v);
  });
  return q.then(({ count: n }) => n ?? 0);
};

export default function AdminOverview() {
  const { t } = useT();
  const { colors, radius } = themeConfig;
  const [stats, setStats] = useState(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      count('gigs', { status: 'pending' }),
      count('events', { status: 'pending' }),
      count('clubs', { status: 'pending' }),
      count('profiles', {}, 'user_id'),
      count('club_join_requests', { status: 'pending' }),
      count('reports', { status: 'open' }),
    ]).then(([gigs, events, groups, people, requests, reports]) => {
      if (active) setStats({ gigs, events, groups, people, requests, reports });
    });
    return () => {
      active = false;
    };
  }, []);

  const cards = [
    { label: 'Gigs awaiting review', key: 'gigs', to: '/admin/gigs', icon: 'work' },
    { label: 'Events awaiting review', key: 'events', to: '/admin/events', icon: 'event' },
    { label: 'Groups awaiting approval', key: 'groups', to: '/admin/groups', icon: 'groups' },
    { label: 'Open club join requests', key: 'requests', to: '/admin/activity', icon: 'how_to_reg' },
    { label: 'Open reports', key: 'reports', to: '/admin/reports', icon: 'gpp_maybe' },
    { label: 'People', key: 'people', to: '/admin/people', icon: 'badge' },
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <div className={`border-b ${colors.border} pb-3`}>
        <h2 className={`text-xl font-bold ${colors.textWhite}`}>{t('Overview')}</h2>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {cards.map((c) => (
          <Link key={c.key} to={c.to} className={`${colors.bgCardStrong} border ${colors.border} ${radius.lg} p-5 ${colors.borderHover} transition`}>
            <Icon name={c.icon} size={20} className={colors.accent} />
            <p className={`text-3xl font-black ${colors.textWhite} mt-3`}>{stats ? stats[c.key] : '…'}</p>
            <p className={`text-xs ${colors.textFaint} mt-1`}>{c.label}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
