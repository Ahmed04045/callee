// src/views/admin/AdminPeople.jsx
// Only display_name / username / email / account_type / university are read — never date_of_birth.

import React from 'react';
import themeConfig from '../../theme/themeConfig';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';

export default function AdminPeople() {
  const { colors, radius } = themeConfig;
  const { data: people, status } = useSupabaseTable('profiles', {
    select: 'user_id,display_name,username,email,account_type,university',
    orderBy: 'display_name',
  });

  return (
    <div className="max-w-3xl space-y-4">
      <div className={`border-b ${colors.border} pb-3`}>
        <h2 className={`text-xl font-bold ${colors.textWhite}`}>People ({people.length})</h2>
      </div>
      {status === 'loading' && <p className={`text-xs ${colors.textFaint}`}>Loading…</p>}
      <ul className={`${colors.bgCardStrong} border ${colors.border} ${radius.lg} divide-y divide-md3-outlineVariant`}>
        {people.map((p) => (
          <li key={p.user_id} className="p-3">
            <p className={`text-sm font-semibold ${colors.textWhite}`}>
              {p.display_name || 'Unnamed'} {p.username && <span className={`font-normal ${colors.accent}`}>@{p.username}</span>}
            </p>
            <p className={`text-xs ${colors.textFaint}`}>
              {p.email} · {p.account_type ?? 'no type yet'}
              {p.university ? ` · ${p.university}` : ''}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
