// src/views/admin/AdminActivity.jsx

import React from 'react';
import themeConfig from '../../theme/themeConfig';
import { useSupabaseTable } from '../../hooks/useSupabaseTable';
import { LogList } from '../ClubModeratorView';
import { useT } from '../../i18n';

export default function AdminActivity() {
  const { t } = useT();
  const { colors } = themeConfig;
  const { data: logs, status } = useSupabaseTable('club_audit_logs', { orderBy: 'created_at', ascending: false });

  return (
    <div className="max-w-3xl space-y-4">
      <div className={`border-b ${colors.border} pb-3`}>
        <h2 className={`text-xl font-bold ${colors.textWhite}`}>{t('Club activity')}</h2>
      </div>
      {status === 'loading' && <p className={`text-xs ${colors.textFaint}`}>{t('Loading…')}</p>}
      <LogList logs={logs.slice(0, 250)} showClub />
    </div>
  );
}
