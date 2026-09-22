// src/views/GigDetailView.jsx

import React, { useEffect, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { logUserAction } from '../components/TelemetryLog';
import Icon from '../components/Icon';
import LocationMap from '../components/LocationMap';
import StickyAction from '../components/StickyAction';
import { ReportButton, SaveButton } from '../components/SaveReportButtons';
import AnswerModal from '../components/AnswerModal';
import { AnswersView } from '../components/Questions';
import { hasQuestions } from '../lib/questions';
import { PixelCover } from '../components/Pixel';
import { useT } from '../i18n';

export default function GigDetailView({ onOpenAuthModal }) {
  const { t } = useT();
  const { colors, radius } = themeConfig;
  const { id } = useParams();
  const { user } = useAuth();

  const [gig, setGig] = useState(null);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ready' | 'notFound' | 'error'
  const [hasApplied, setHasApplied] = useState(false);
  const [myApplication, setMyApplication] = useState(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    let isMounted = true;

    async function load() {
      setStatus('loading');
      const { data, error } = await supabase.from('gigs').select('*').eq('id', id).maybeSingle();
      if (!isMounted) return;

      if (error) {
        setStatus('error');
        return;
      }
      if (!data) {
        setStatus('notFound');
        return;
      }
      setGig(data);
      setStatus('ready');

      if (user) {
        const { data: existingApplication } = await supabase
          .from('applications')
          .select('id, answers, message, status')
          .eq('gig_id', id)
          .eq('user_id', user.id)
          .maybeSingle();
        if (isMounted) {
          setHasApplied(Boolean(existingApplication));
          setMyApplication(existingApplication);
        }
      }
    }

    load();
    return () => {
      isMounted = false;
    };
  }, [id, user]);

  // Applying always goes through the dialog: it asks the poster's questions, an
  // optional message and how to reach the applicant. Database errors come back as
  // codes (deadline passed, missing answer...) and are shown as plain sentences.
  const APPLY_ERRORS = {
    DEADLINE_PASSED: 'Applications for this gig have closed.',
    GIG_NOT_AVAILABLE: 'This gig is no longer available.',
    OWN_GIG: "You can't apply to your own gig.",
    ANSWER_REQUIRED: 'Please answer all the required questions.',
    ANSWER_TOO_LONG: 'One of your answers is too long.',
    ANSWER_INVALID: 'One of your answers is not valid.',
    'duplicate key': 'You already applied to this gig.',
  };
  const submitApplication = async (payload) => {
    if (!user) return t('Please sign in first.');
    logUserAction('APPLY_SUBMIT', { gigId: id, source: 'detail' });
    const { error } = await supabase.from('applications').insert({ gig_id: id, user_id: user.id, ...payload });
    if (error) {
      const key = Object.keys(APPLY_ERRORS).find((k) => error.message.includes(k));
      return key ? t(APPLY_ERRORS[key]) : error.message;
    }
    setHasApplied(true);
    setMyApplication({ answers: payload.answers, message: payload.message, status: 'submitted' });
    return null;
  };
  const handleApply = () => user && setApplyOpen(true);

  // The poster sees how many people applied.
  const [applicantCount, setApplicantCount] = useState(null);
  useEffect(() => {
    if (!gig || !user || gig.posted_by_user_id !== user.id) return;
    supabase.from('applications').select('id', { count: 'exact', head: true }).eq('gig_id', gig.id).then(({ count }) => setApplicantCount(count ?? 0));
  }, [gig, user]);

  // The Recruit list sends people here with ?apply=1 so the questions are always shown.
  useEffect(() => {
    if (searchParams.get('apply') === '1' && user && status === 'ready' && !hasApplied) setApplyOpen(true);
  }, [searchParams, user, status, hasApplied]);

  if (status === 'loading') {
    return <p className={`text-sm ${colors.textFaint}`}>{t('Loading…')}</p>;
  }

  if (status === 'notFound' || status === 'error') {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-3">
        <Icon name="search_off" size={28} className={colors.textFaint} />
        <p className={`text-sm ${colors.textFaint}`}>
          {status === 'notFound' ? t('This listing doesn\'t exist (or isn\'t public).') : t('Couldn\'t load this listing.')}
        </p>
        <Link to="/recruit" className={`text-xs font-semibold ${colors.accent}`}>
          {t('Back to Recruit')}
        </Link>
      </div>
    );
  }

  const isPoster = Boolean(user && gig.posted_by_user_id === user.id);
  const today = new Date().toLocaleDateString('en-CA');
  const expired = Boolean(gig.deadline && gig.deadline < today);
  const daysLeft = gig.deadline ? Math.round((new Date(gig.deadline) - new Date(today)) / 86400000) : null;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <Link
        to="/recruit"
        className={`inline-flex items-center gap-1 text-xs font-semibold ${colors.textFaint} ${colors.textHoverAccent} transition`}
      >
        <Icon name="arrow_back" size={14} /> {t('Back to Recruit')}
      </Link>

      <div className={`${colors.bgCardStrong} border ${colors.border} ${radius.lg} overflow-hidden`}>
      <div className="h-20">
        <PixelCover seed={gig.id} cols={72} rows={10} />
      </div>
      <div className="p-6">
        <div className="flex justify-between items-start gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className={`text-xl font-bold ${colors.textWhite}`}>{gig.role}</h1>
              {gig.verified && (
                <span className={`flex items-center gap-1 text-[10px] ${colors.success}`}>
                  <Icon name="verified" size={13} /> {t('Verified')}
                </span>
              )}
            </div>
            <p className={`text-xs ${colors.textMuted} mt-1`}>{t('Posted by {name}', { name: gig.posted_by })}</p>
            {gig.deadline && (
              <p className={`text-xs mt-1 font-semibold ${expired ? colors.error : daysLeft <= 7 ? colors.warning : colors.textMuted}`}>
                {expired ? t('Applications closed') : daysLeft === 0 ? t('Closes today') : daysLeft === 1 ? t('Closes tomorrow') : t('Closes in {n} days', { n: daysLeft })} · {gig.deadline}
              </p>
            )}
          </div>
          <span
            className={`text-xs ${colors.bgInset} border ${colors.borderStrong} ${colors.success} px-2.5 py-1 ${radius.full} shrink-0`}
          >
            {t(gig.compensation)}
          </span>
        </div>

        <p className={`text-sm ${colors.textMuted} mt-4 leading-relaxed`}>{gig.details}</p>

        <div className="flex gap-2 mt-4 flex-wrap">
          {(gig.tags ?? []).map((tag) => (
            <span
              key={tag}
              className={`text-[10px] ${colors.textFaint} ${colors.bgPill} px-2.5 py-1 ${radius.full} border ${colors.border}`}
            >
              <bdi>#{t(tag)}</bdi>
            </span>
          ))}
        </div>

        {gig.commitment && (
          <p className={`mt-4 flex items-center gap-2 text-sm ${colors.textMuted}`}>
            <Icon name="schedule" size={16} className={colors.textFaint} /> {t(gig.commitment)}
          </p>
        )}

        {gig.is_remote ? (
          <p className={`mt-4 flex items-center gap-2 text-sm ${colors.textMuted}`}>
            <Icon name="public" size={16} className={colors.textFaint} /> {t('Remote')}
          </p>
        ) : (
          gig.location && (
            <div className="mt-4 space-y-2">
              <p className={`flex items-center gap-2 text-sm ${colors.textMuted}`}>
                <Icon name="location_on" size={16} className={colors.textFaint} /> {gig.location}
              </p>
              <LocationMap name={gig.location} lat={gig.lat} lng={gig.lng} placeId={gig.place_id} />
            </div>
          )
        )}

      </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SaveButton kind="gig" itemId={gig.id} onNeedAuth={() => onOpenAuthModal?.()} />
        {!isPoster && <ReportButton kind="gig" itemId={gig.id} onNeedAuth={() => onOpenAuthModal?.()} />}
        {isPoster && (
          <Link to={`/gigs/${gig.id}/applicants`} className={`flex items-center gap-1.5 text-xs font-bold px-3 py-2 ${colors.accentBg} ${colors.accentOn} ${radius.full}`}>
            <Icon name="group" size={14} className="text-inherit" /> {t('Applicants')}{applicantCount != null ? ` (${applicantCount})` : ''}
          </Link>
        )}
      </div>

      {myApplication && (myApplication.message || hasQuestions(gig.questions)) && (
        <section className={`${colors.bgCardSoft} border ${colors.border} ${radius.lg} p-4 space-y-3`}>
          <h2 className={`text-sm font-bold ${colors.textWhite}`}>{t('Your application')}</h2>
          {myApplication.message && <p className={`text-sm ${colors.textMuted} whitespace-pre-line`}>{myApplication.message}</p>}
          <AnswersView questions={gig.questions} answers={myApplication.answers} />
        </section>
      )}

      <StickyAction summary={gig.role} sub={`${gig.posted_by} · ${t(gig.compensation)}`}>
          {!user ? (
            <p className={`text-xs ${colors.textFaint}`}>{t('Sign in to apply.')}</p>
          ) : (
            <button
              onClick={handleApply}
              disabled={hasApplied || expired}
              className={`flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider px-4 py-2 ${radius.full} transition ${
                hasApplied
                  ? `${colors.success} ${colors.bgInset} border ${colors.borderStrong} cursor-default`
                  : `${colors.accentBg} ${colors.accentOn} ${colors.accentBgHover}`
              }`}
            >
              {hasApplied ? (
                <>
                  {t('Submitted')} <Icon name="check_circle" size={13} className="text-inherit" />
                </>
              ) : (
                <>
                  {t('Submit Project Request')} <Icon name="arrow_forward" size={13} className="text-inherit" />
                </>
              )}
            </button>
          )}
      </StickyAction>

      {applyOpen && (
        <AnswerModal
          title={t('Apply: {title}', { title: gig.role })}
          intro={t('Tell them a bit about yourself.')}
          questions={hasQuestions(gig.questions) ? gig.questions : []}
          withMessage
          messageLabel={t('Message (optional)')}
          withContact
          submitLabel={t('Send application')}
          shares={t('Your name, username, school, bio, answers and contact details will be shared with the person who posted this gig.')}
          onSubmit={submitApplication}
          onClose={() => setApplyOpen(false)}
        />
      )}
    </div>
  );
}