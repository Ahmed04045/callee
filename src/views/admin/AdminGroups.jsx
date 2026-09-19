// src/views/admin/AdminGroups.jsx
//
// User-made groups (Create > Group) arrive as pending clubs. Approving one
// (review_group) makes it public, and makes its creator the moderator.

import React, { useState } from 'react';
import themeConfig from '../../theme/themeConfig';
import { supabase } from '../../lib/supabaseClient';
import ModerationQueue from '../../components/ModerationQueue';
import { CLUB_COLUMNS } from '../../lib/clubUtil';

function LinksPeek({ clubId }) {
  const { colors } = themeConfig;
  const [links, setLinks] = useState(null);
  const load = async () => {
    const { data } = await supabase.rpc('get_club_links', { p_club_id: clubId });
    setLinks(data?.[0] ?? { whatsapp_link: '', discord_link: '' });
  };
  if (!links) {
    return <button onClick={load} className={`text-[11px] font-semibold ${colors.accent} mt-2`}>Show private links</button>;
  }
  return (
    <div className={`text-[11px] ${colors.textMuted} mt-2 break-all space-y-0.5`}>
      {links.whatsapp_link && <p>WhatsApp: {links.whatsapp_link}</p>}
      {links.discord_link && <p>Discord: {links.discord_link}</p>}
    </div>
  );
}

export default function AdminGroups() {
  const { colors } = themeConfig;

  const setStatus = async (club, next) => {
    if (club.status !== 'pending') return 'Only pending groups can be approved or rejected here.';
    const { error } = await supabase.rpc('review_group', { p_club_id: club.id, p_approve: next === 'approved' });
    return error?.message ?? null;
  };

  return (
    <ModerationQueue
      title="Group approvals"
      subtitle="Groups created from the Create tab. Approving makes the group public and its creator the moderator."
      table="clubs"
      select={CLUB_COLUMNS}
      orderBy="created_at"
      allowReset={false}
      onSetStatus={setStatus}
      renderItem={(club) => (
        <>
          <h3 className={`text-sm font-bold ${colors.textWhite}`}>{club.name}</h3>
          <p className={`text-xs ${colors.textFaint} mt-0.5`}>
            {club.category} · {club.university} · {club.room_or_location} · {club.meeting_schedule}
          </p>
          <p className={`text-xs ${colors.textMuted} mt-3 leading-relaxed`}>{club.description}</p>
          <LinksPeek clubId={club.id} />
        </>
      )}
    />
  );
}
