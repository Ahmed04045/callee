// src/views/CreateView.jsx
//
// Full page, not a modal (the modal version kept the whole app mounted and
// composited underneath it, which was the real source of the lag).
//
// Three post types, each in its own form under views/create/:
//   - Gig / Opportunity (`gigs`; framing follows account_type: personal ->
//     "opportunity", business -> "gig")
//   - Event (`events`)
//   - Group (a private club, via the create_group() database function)
// Everything submits as pending — RLS / the database function force that
// server-side, so there's no client-side way to skip moderation. The forms
// use pickers and validation instead of free text wherever possible.
//
// /create?type=group|event|gig preselects a tab (used by the Clubs page).

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import Icon from '../components/Icon';
import GigForm from './create/GigForm';
import EventForm from './create/EventForm';
import GroupForm from './create/GroupForm';
import { useT } from '../i18n';

export default function CreateView() {
  const { t } = useT();
  const { colors, radius, font } = themeConfig;
  const { user } = useAuth();
  const { profile } = useProfile();
  const [params, setParams] = useSearchParams();

  const isPersonal = profile?.account_type === 'personal';
  const gigKind = isPersonal ? 'opportunity' : 'gig';
  const tabs = [
    { id: 'gig', label: isPersonal ? 'Opportunity' : 'Gig' },
    { id: 'event', label: 'Event' },
    { id: 'group', label: 'Group' },
  ];
  const requested = params.get('type');
  const [postType, setPostType] = useState(tabs.some((t) => t.id === requested) ? requested : 'gig');

  const select = (id) => {
    setPostType(id);
    setParams({ type: id }, { replace: true });
  };

  const postedBy = profile?.display_name?.trim() || (profile?.username ? `@${profile.username}` : user.email);

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      <div className={`border-b ${colors.border} pb-3`}>
        <h1 className={`text-xl ${font.heading} ${colors.textWhite} flex items-center gap-2`}>
          <Icon name="add_circle" size={22} className={colors.accent} /> {t('Create')}
        </h1>
        <p className={`text-xs ${colors.textFaint} mt-1`}>{t('Submitted for review — it won\'t be public until approved.')}</p>
      </div>

      <div className="flex gap-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => select(tab.id)}
            className={`text-xs font-bold px-3.5 py-1.5 ${radius.full} border transition ${
              postType === tab.id
                ? `${colors.accentBg} ${colors.accentOn} border-transparent`
                : `${colors.textFaint} ${colors.borderStrong} ${colors.textHoverStrong}`
            }`}
          >
            {t(tab.label)}
          </button>
        ))}
      </div>

      {postType === 'gig' && <GigForm key="gig" user={user} postedBy={postedBy} kind={gigKind} />}
      {postType === 'event' && <EventForm key="event" user={user} postedBy={postedBy} />}
      {postType === 'group' && <GroupForm key="group" profile={profile} />}
    </div>
  );
}
