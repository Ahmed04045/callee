// src/views/ClubDetailView.jsx
//
// One shareable page per club (/clubs/:clubId). Joining/leaving goes through
// the join_club()/leave_club() database functions; the WhatsApp/Discord links
// come from get_club_links(), which only returns them to members, this
// club's moderators and admins — so hiding them here is UX, the database is
// the real gate.

import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { supabase } from '../lib/supabaseClient';
import { logUserAction } from '../components/TelemetryLog';
import SubPageHeader from '../components/SubPageHeader';
import Icon from '../components/Icon';
import { bannerStyle, CLUB_COLUMNS, JOIN_MESSAGES, MAX_CLUBS } from '../lib/clubUtil';

export default function ClubDetailView({ onOpenAuthModal }) {
  const { colors, radius } = themeConfig;
  const { clubId } = useParams();
  const { user, isAdmin } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [links, setLinks] = useState(null);

  const { data: clubRows, status, refetch: refetchClub } = useSupabaseTable('clubs', {
    select: CLUB_COLUMNS,
    filters: { id: clubId },
  });
  const club = clubRows[0];

  const { data: memberships, refetch: refetchMemberships } = useSupabaseTable('club_memberships', {
    select: 'club_id',
    filters: user ? { user_id: user.id } : undefined,
    enabled: Boolean(user),
  });
  const { data: moderated } = useSupabaseTable('club_moderators', {
    select: 'club_id',
    filters: user ? { user_id: user.id } : undefined,
    enabled: Boolean(user),
  });
  const { data: news } = useSupabaseTable('club_news', {
    filters: { club_id: clubId },
    orderBy: 'created_at',
    ascending: false,
  });

  const isMember = useMemo(() => memberships.some((m) => m.club_id === clubId), [memberships, clubId]);
  const isMod = useMemo(() => moderated.some((m) => m.club_id === clubId), [moderated, clubId]);
  const canSeeLinks = Boolean(user) && (isMember || isMod || isAdmin);
  const atLimit = memberships.length >= MAX_CLUBS && !isMember;

  useEffect(() => {
    setLinks(null);
    if (!canSeeLinks) return;
    supabase.rpc('get_club_links', { p_club_id: clubId }).then(({ data }) => setLinks(data?.[0] ?? null));
  }, [canSeeLinks, clubId]);

  const refresh = () => Promise.all([refetchClub(), refetchMemberships()]);

  const handleJoin = async () => {
    setBusy(true);
    setMessage('');
    logUserAction('CLUB_JOIN', { clubId });
    const { data, error } = await supabase.rpc('join_club', { p_club_id: clubId });
    if (error) setMessage(error.message.includes('LIMIT_REACHED') ? JOIN_MESSAGES.LIMIT_REACHED : error.message);
    else if (data !== 'OK') setMessage(JOIN_MESSAGES[data] ?? String(data));
    await refresh();
    setBusy(false);
  };

  const handleLeave = async () => {
    if (!window.confirm(`Leave ${club.name}? You'll lose access to its WhatsApp and Discord links.`)) return;
    setBusy(true);
    setMessage('');
    logUserAction('CLUB_LEAVE', { clubId });
    const { error } = await supabase.rpc('leave_club', { p_club_id: clubId });
    if (error) setMessage(error.message);
    await refresh();
    setBusy(false);
  };

  if (status === 'loading' && !club) return <p className={`text-xs ${colors.textFaint}`}>Loading club…</p>;
  if (!club) {
    return (
      <div>
        <SubPageHeader title="Club not found" fallbackTo="/clubs" />
        <p className={`text-sm ${colors.textMuted}`}>This club doesn't exist.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-5">
      <SubPageHeader title={club.name} fallbackTo="/clubs" />

      <div className={`overflow-hidden ${colors.bgCardStrong} border ${colors.border} ${radius.lg}`}>
        <div style={bannerStyle(club)} className="h-32 p-4 flex items-end">
          <span className={`text-xs font-semibold bg-black/40 text-white ${radius.full} px-3 py-1`}>{club.category}</span>
        </div>
        <div className="p-6 space-y-5">
          <p className={`text-sm leading-relaxed ${colors.textMuted}`}>{club.description}</p>

          <div className="grid sm:grid-cols-3 gap-3">
            {[
              ['group', 'Members', club.member_count],
              ['schedule', 'Meets', club.meeting_schedule],
              ['location_on', 'Location', club.room_or_location],
            ].map(([icon, label, value]) => (
              <div key={label} className={`${colors.bgInset} ${radius.md} p-3`}>
                <p className={`text-[11px] ${colors.textFaint} flex items-center gap-1`}>
                  <Icon name={icon} size={13} /> {label}
                </p>
                <p className={`text-sm font-semibold ${colors.textWhite} mt-0.5`}>{value}</p>
              </div>
            ))}
          </div>

          {!user ? (
            <button
              onClick={() => onOpenAuthModal?.()}
              className={`w-full ${colors.accentBg} ${colors.accentOn} ${colors.accentBgHover} font-bold text-sm py-3 ${radius.full}`}
            >
              Sign in to join
            </button>
          ) : isMember ? (
            <button
              onClick={handleLeave}
              disabled={busy}
              className={`w-full border ${colors.borderStrong} ${colors.textWhite} font-bold text-sm py-3 ${radius.full} disabled:opacity-50`}
            >
              Leave club
            </button>
          ) : (
            <button
              onClick={handleJoin}
              disabled={busy || atLimit}
              className={`w-full ${colors.accentBg} ${colors.accentOn} ${colors.accentBgHover} font-bold text-sm py-3 ${radius.full} disabled:opacity-50`}
            >
              {atLimit ? `Maximum ${MAX_CLUBS} clubs reached` : `Join ${club.name}`}
            </button>
          )}
          {message && <p className={`text-xs ${colors.error}`}>{message}</p>}
        </div>
      </div>

      <div className={`${colors.bgCardStrong} border ${colors.border} ${radius.lg} p-6`}>
        <h2 className={`text-sm font-bold ${colors.textWhite} flex items-center gap-2 mb-3`}>
          <Icon name={canSeeLinks ? 'forum' : 'lock'} size={16} /> Member communities
        </h2>
        {canSeeLinks ? (
          links ? (
            <div className="grid sm:grid-cols-2 gap-3">
              <a href={links.whatsapp_link} target="_blank" rel="noreferrer"
                className={`text-center text-sm font-bold text-white py-2.5 ${radius.full} bg-[#25D366] hover:brightness-90 transition`}>
                WhatsApp group
              </a>
              <a href={links.discord_link} target="_blank" rel="noreferrer"
                className={`text-center text-sm font-bold text-white py-2.5 ${radius.full} bg-[#5865F2] hover:brightness-90 transition`}>
                Discord server
              </a>
            </div>
          ) : (
            <p className={`text-xs ${colors.textFaint}`}>Loading links…</p>
          )
        ) : (
          <p className={`text-xs ${colors.textFaint}`}>Join this club to unlock its private WhatsApp group and Discord server.</p>
        )}
      </div>

      {news.length > 0 && (
        <div className="space-y-3">
          <h2 className={`text-sm font-bold ${colors.textWhite}`}>Club updates</h2>
          {news.map((n) => (
            <div key={n.id} className={`${colors.bgCardStrong} border ${colors.border} ${radius.lg} p-4`}>
              <h3 className={`font-bold ${colors.textWhite}`}>{n.title}</h3>
              <p className={`text-xs ${colors.textMuted} mt-1`}>{n.summary}</p>
              <p className={`text-sm ${colors.textMuted} mt-3 leading-relaxed`}>{n.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
