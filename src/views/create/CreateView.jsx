// src/views/create/CreateView.jsx
//
// Create used to be a modal (see git history / CreateModal.jsx, now
// removed) — moved to real pages so each type gets its own shareable URL
// (/create/gig, /create/event, /create/group, /create/receipt) and its own
// back-navigation, while the sidebar/header stay visible around it like any
// other page. /create with no type shows the picker.
//
// Gig/Event/Group forms already navigate themselves on success (to the new
// item's detail page or My Submissions) — onDone is a no-op here, it only
// mattered for closing the old modal. Receipt has nowhere else to go, so it
// navigates to the profile itself.

import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import themeConfig from '../../theme/themeConfig';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../context/AuthContext';
import { useProfile } from '../../context/ProfileContext';
import SubPageHeader from '../../components/SubPageHeader';
import Icon from '../../components/Icon';
import GigForm from './GigForm';
import EventForm from './EventForm';
import GroupForm from './GroupForm';
import { CareerEntryModal } from '../../components/CareerBook';
import { useT } from '../../i18n';

export default function CreateView() {
  const { t } = useT();
  const { colors, radius } = themeConfig;
  const navigate = useNavigate();
  const { type } = useParams();
  const { user } = useAuth();
  const { profile } = useProfile();

  if (!user) return null;

  const isPersonal = profile?.account_type === 'personal';
  const types = [
    {
      id: 'gig',
      icon: 'work',
      label: isPersonal ? 'Opportunity' : 'Gig',
      hint: isPersonal
        ? 'Offer something you need help with, or something you can do for someone else.'
        : 'Post a role, freelance gig or paid opportunity for people to apply to.',
    },
    { id: 'event', icon: 'event_available', label: 'Event', hint: 'Something people RSVP to — a hackathon, workshop, meetup or social.' },
    { id: 'group', icon: 'groups', label: 'Group', hint: 'Start a private club or student-run group people request to join.' },
    { id: 'receipt', icon: 'auto_stories', label: 'Receipt', hint: 'Add proof of work to your profile — a project, achievement or experience.' },
  ];
  const current = types.find((tItem) => tItem.id === type);
  const postedBy = profile?.display_name?.trim() || (profile?.username ? `@${profile.username}` : user.email);

  if (!current) {
    return (
      <div className="w-full max-w-lg mx-auto">
        <SubPageHeader title={t('Create')} fallbackTo="/" />
        <p className={`text-xs ${colors.textFaint} -mt-2 mb-4`}>{t("Submitted for review — it won't be public until approved.")}</p>
        <div className="space-y-2">
          {types.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(`/create/${item.id}`)}
              className={`w-full flex items-center gap-4 text-start ${colors.bgCard} border ${colors.borderStrong} ${radius.lg} p-4 hover:border-md3-primary transition`}
            >
              <div className={`w-11 h-11 flex items-center justify-center shrink-0 ${colors.accentSoftBg} ${colors.accent} ${radius.md}`}>
                <Icon name={item.icon} size={20} className="text-inherit" />
              </div>
              <div>
                <p className={`text-sm font-bold ${colors.textWhite}`}>{t(item.label)}</p>
                <p className={`text-xs ${colors.textFaint} mt-0.5 leading-relaxed`}>{t(item.hint)}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <SubPageHeader title={t(current.label)} fallbackTo="/create" />
      {current.id === 'gig' && <GigForm user={user} postedBy={postedBy} kind={isPersonal ? 'opportunity' : 'gig'} onDone={() => {}} />}
      {current.id === 'event' && <EventForm user={user} postedBy={postedBy} onDone={() => {}} />}
      {current.id === 'group' && <GroupForm profile={profile} onDone={() => {}} />}
      {current.id === 'receipt' && (
        <CareerEntryModal
          inline
          onSubmit={async (payload) => {
            const { error } = await supabase.from('career_entries').insert({ user_id: user.id, ...payload });
            if (error) return error.message;
            navigate('/profile');
            return null;
          }}
        />
      )}
    </div>
  );
}
