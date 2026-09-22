// src/views/ClubDetailView.jsx
//
// One shareable page per club (/clubs/:clubId). Clubs are private: you send a
// join request (request_join_club()) and a moderator approves it; leaving goes
// through leave_club(). The WhatsApp/Discord links
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
import LocationMap from '../components/LocationMap';
import { argbToHex, CLUB_COLUMNS, JOIN_MESSAGES, MAX_CLUBS } from '../lib/clubUtil';
import { PixelCover } from '../components/Pixel';
import { ReportButton, SaveButton } from '../components/SaveReportButtons';
import AnswerModal from '../components/AnswerModal';
import { hasQuestions } from '../lib/questions';
import { useT } from '../i18n';

export default function ClubDetailView({ onOpenAuthModal }) {
  const { t } = useT();
  const { colors, radius } = themeConfig;
  const { clubId } = useParams();
  const { user, isAdmin } = useAuth();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const [askOpen, setAskOpen] = useState(false);
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
  const { data: requests, refetch: refetchRequests } = useSupabaseTable('club_join_requests', {
    select: 'id,club_id,status',
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
  const myRequest = useMemo(() => requests.find((r) => r.club_id === clubId), [requests, clubId]);
  const isPending = myRequest?.status === 'pending';
  const canSeeLinks = Boolean(user) && (isMember || isMod || isAdmin);
  const atLimit = memberships.length >= MAX_CLUBS && !isMember;

  useEffect(() => {
    setLinks(null);
    if (!canSeeLinks) return;
    supabase.rpc('get_club_links', { p_club_id: clubId }).then(({ data }) => setLinks(data?.[0] ?? null));
  }, [canSeeLinks, clubId]);

  const refresh = () => Promise.all([refetchClub(), refetchMemberships(), refetchRequests()]);

  // Returns an error sentence (or null). With join questions, the modal collects
  // the answers and passes them here; without, the inline note is used.
  const ANSWER_ERRORS = {
    ANSWER_REQUIRED: 'Please answer all the required questions.',
    ANSWER_TOO_LONG: 'One of your answers is too long.',
    ANSWER_INVALID: 'One of your answers is not valid.',
  };
  const handleRequest = async (payload) => {
    setBusy(true);
    setMessage('');
    logUserAction('CLUB_JOIN_REQUEST', { clubId });
    const { data, error } = await supabase.rpc('request_join_club', {
      p_club_id: clubId,
      p_message: payload?.message ?? note,
      p_answers: payload?.answers ?? {},
    });
    let problem = null;
    if (error) {
      const key = Object.keys(ANSWER_ERRORS).find((k) => error.message.includes(k));
      problem = key ? t(ANSWER_ERRORS[key]) : error.message;
    } else if (data !== 'OK') {
      problem = JOIN_MESSAGES[data] ? t(JOIN_MESSAGES[data]) : String(data);
    } else {
      setNote('');
    }
    setMessage(problem ?? '');
    await refresh();
    setBusy(false);
    return problem;
  };

  const handleCancelRequest = async () => {
    setBusy(true);
    await supabase.rpc('cancel_join_request', { p_club_id: clubId });
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

  if (status === 'loading' && !club) return <p className={`text-xs ${colors.textFaint}`}>{t('Loading club…')}</p>;
  if (!club) {
    return (
      <div>
        <SubPageHeader title={t('Club not found')} fallbackTo="/clubs" />
        <p className={`text-sm ${colors.textMuted}`}>{t('This club doesn\'t exist.')}</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5">
      <SubPageHeader title={club.name} fallbackTo="/clubs" />

      <div className={`overflow-hidden ${colors.bgCardStrong} border ${colors.border} ${radius.lg}`}>
        <div className="relative h-32 p-4 flex items-end gap-2">
          <div className="absolute inset-0">
            {club.banner_image_url ? (
              <img src={club.banner_image_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <PixelCover from={argbToHex(club.banner_gradient_start)} to={argbToHex(club.banner_gradient_end)} seed={club.id} cols={64} rows={16} />
            )}
          </div>
          <span className={`relative text-xs font-semibold bg-black/60 text-white ${radius.full} px-3 py-1`}>{t(club.category)}</span>
          {club.status === 'pending' && (
            <span className={`relative text-xs font-bold bg-white text-black ${radius.full} px-3 py-1`}>{t('Pending approval')}</span>
          )}
        </div>
        <div className="p-6 space-y-5">
          <p className={`text-sm leading-relaxed ${colors.textMuted}`}>{club.description}</p>

          {club.who_can_join && (
            <p className={`flex items-start gap-2 text-xs ${colors.textMuted} ${colors.bgInset} ${radius.md} p-3`}>
              <Icon name="how_to_reg" size={14} className={`mt-0.5 shrink-0 ${colors.textFaint}`} /> {club.who_can_join}
            </p>
          )}

          <div className="grid sm:grid-cols-3 gap-3">
            {[
              ['group', 'Members', club.member_count],
              ['schedule', 'Meets', club.meeting_schedule],
              ['location_on', 'Location', club.room_or_location],
            ].map(([icon, label, value]) => (
              <div key={label} className={`${colors.bgInset} ${radius.md} p-3`}>
                <p className={`text-[11px] ${colors.textFaint} flex items-center gap-1`}>
                  <Icon name={icon} size={13} /> {t(label)}
                </p>
                <p className={`text-sm font-semibold ${colors.textWhite} mt-0.5`}>{value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <SaveButton kind="club" itemId={club.id} onNeedAuth={() => onOpenAuthModal?.()} />
            <ReportButton kind="club" itemId={club.id} onNeedAuth={() => onOpenAuthModal?.()} />
          </div>

          {club.lat != null && club.lng != null && (
            <LocationMap name={club.room_or_location} lat={club.lat} lng={club.lng} placeId={club.place_id} />
          )}

          {club.status !== 'approved' ? (
            <p className={`text-xs ${colors.textMuted} text-center`}>{t('This group is waiting for admin approval before it goes public.')}</p>
          ) : !user ? (
            <button
              onClick={() => onOpenAuthModal?.()}
              className={`w-full ${colors.accentBg} ${colors.accentOn} ${colors.accentBgHover} font-bold text-sm py-3 ${radius.full}`}
            >
              {t('Sign in to request to join')}
            </button>
          ) : isMember ? (
            <button
              onClick={handleLeave}
              disabled={busy}
              className={`w-full border ${colors.borderStrong} ${colors.textWhite} font-bold text-sm py-3 ${radius.full} disabled:opacity-50`}
            >
              {t('Leave club')}
            </button>
          ) : isPending ? (
            <div className="space-y-2">
              <p className={`text-xs ${colors.textMuted} text-center`}>{t('Request sent — a moderator will review it.')}</p>
              <button
                onClick={handleCancelRequest}
                disabled={busy}
                className={`w-full border ${colors.borderStrong} ${colors.textWhite} font-bold text-sm py-3 ${radius.full} disabled:opacity-50`}
              >
                {t('Cancel request')}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {myRequest?.status === 'declined' && (
                <p className={`text-xs ${colors.textFaint}`}>{t('Your last request was declined. You can send a new one.')}</p>
              )}
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={300}
                rows={2}
                placeholder={t('Optional: tell the moderators why you\'d like to join')}
                className={`w-full ${colors.bgInset} border ${colors.border} ${radius.md} px-3 py-2 text-sm ${colors.textPrimary} outline-none focus:border-md3-primary resize-none`}
              />
              <button
                onClick={() => (hasQuestions(club.join_questions) ? setAskOpen(true) : handleRequest())}
                disabled={busy || atLimit}
                className={`w-full ${colors.accentBg} ${colors.accentOn} ${colors.accentBgHover} font-bold text-sm py-3 ${radius.full} disabled:opacity-50`}
              >
                {atLimit ? `Maximum ${MAX_CLUBS} clubs reached` : t('Request to join')}
              </button>
            </div>
          )}
          {message && <p className={`text-xs ${colors.error}`}>{message}</p>}
        </div>
      </div>

      <div className={`${colors.bgCardStrong} border ${colors.border} ${radius.lg} p-6`}>
        <h2 className={`text-sm font-bold ${colors.textWhite} flex items-center gap-2 mb-3`}>
          <Icon name={canSeeLinks ? 'forum' : 'lock'} size={16} /> {t('Member communities')}
        </h2>
        {canSeeLinks ? (
          links ? (
            <div className="grid sm:grid-cols-2 gap-3">
              <a href={links.whatsapp_link} target="_blank" rel="noreferrer"
                className={`text-center text-sm font-bold text-white py-2.5 ${radius.full} bg-[#25D366] hover:brightness-90 transition`}>
                {t('WhatsApp group')}
              </a>
              <a href={links.discord_link} target="_blank" rel="noreferrer"
                className={`text-center text-sm font-bold text-white py-2.5 ${radius.full} bg-[#5865F2] hover:brightness-90 transition`}>
                {t('Discord server')}
              </a>
            </div>
          ) : (
            <p className={`text-xs ${colors.textFaint}`}>{t('Loading links…')}</p>
          )
        ) : (
          <p className={`text-xs ${colors.textFaint}`}>{t('This club is private. Once a moderator approves your request, its WhatsApp group and Discord server unlock here.')}</p>
        )}
      </div>

      {askOpen && (
        <AnswerModal
          title={t('Join {name}', { name: club.name })}
          intro={t('The moderators would like to know a little about you.')}
          questions={club.join_questions}
          withMessage
          messageLabel={t('Message (optional)')}
          submitLabel={t('Send request')}
          shares={t('Your name, username, school, bio and answers will be shared with this group\'s moderators.')}
          onSubmit={handleRequest}
          onClose={() => setAskOpen(false)}
        />
      )}

      {news.length > 0 && (
        <div className="space-y-3">
          <h2 className={`text-sm font-bold ${colors.textWhite}`}>{t('Club updates')}</h2>
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
