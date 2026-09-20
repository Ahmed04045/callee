// src/views/ClubsView.jsx
//
// Circosodal: browse university clubs. All clubs are private — you request
// to join and a moderator approves. The page is scoped to one university:
// your profile's university if you've set one, otherwise you're asked which
// university you attend (remembered on this device, and offered to save to
// your profile).

import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useSupabaseTable } from '../hooks/useSupabaseTable';
import { CLUB_COLUMNS, MAX_CLUBS } from '../lib/clubUtil';
import { CLUB_UNIVERSITIES } from '../lib/education';
import ClubCard from '../components/ClubCard';
import Icon from '../components/Icon';
import { PixelEmpty } from '../components/Pixel';
import { CardSkeleton } from '../components/FeedCards';
import { useT } from '../i18n';

const STORAGE_KEY = 'clubs.university';

function readStoredUniversity() {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return CLUB_UNIVERSITIES.includes(value) ? value : '';
  } catch {
    return '';
  }
}

export default function ClubsView() {
  const { t } = useT();
  const { colors, radius } = themeConfig;
  const { user } = useAuth();
  const { profile, saveProfile } = useProfile();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [picked, setPicked] = useState(readStoredUniversity);
  const [saved, setSaved] = useState(false);

  const profileUniversity = CLUB_UNIVERSITIES.includes(profile?.university) ? profile.university : '';
  const university = profileUniversity || picked;

  const chooseUniversity = (value) => {
    setPicked(value);
    setSaved(false);
    setCategory('All');
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* private mode — just don't remember it */
    }
  };

  const { data: clubs, status } = useSupabaseTable('clubs', {
    select: CLUB_COLUMNS,
    filters: { status: 'approved', university },
    orderBy: 'name',
    enabled: Boolean(university),
  });
  const { data: memberships } = useSupabaseTable('club_memberships', {
    select: 'club_id',
    filters: user ? { user_id: user.id } : undefined,
    enabled: Boolean(user),
  });
  const joinedIds = useMemo(() => new Set(memberships.map((m) => m.club_id)), [memberships]);

  const categories = useMemo(() => ['All', ...[...new Set(clubs.map((c) => c.category))].sort()], [clubs]);
  const shown = clubs.filter((c) => {
    const q = query.trim().toLowerCase();
    return (
      (category === 'All' || c.category === category) &&
      (!q || c.name.toLowerCase().includes(q) || c.description.toLowerCase().includes(q) || c.category.toLowerCase().includes(q))
    );
  });

  const saveToProfile = async () => {
    const { error } = await saveProfile({ university: picked });
    if (!error) setSaved(true);
  };

  const selectClass = `w-full ${colors.bgInset} border ${colors.borderStrong} ${radius.md} px-3 py-2.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary`;

  return (
    <div className="space-y-6 w-full">
      <div className={`border-b ${colors.border} pb-3 flex items-end justify-between gap-4`}>
        <div>
          <h2 className={`text-xl font-bold ${colors.textWhite}`}>{t('Clubs')}</h2>
          <p className={`text-xs ${colors.textFaint} mt-1`}>{t('Clubs are private: request to join and a moderator approves you. Up to {n} clubs.', { n: MAX_CLUBS })}</p>
        </div>
        {user && (
          <Link to="/clubs/moderator" className={`text-xs font-semibold ${colors.accent} whitespace-nowrap`}>
            {t('Moderator workspace')}
          </Link>
        )}
      </div>

      {profileUniversity ? (
        <div className={`flex items-center gap-2 text-xs ${colors.textMuted}`}>
          <Icon name="school" size={15} /> {t('Showing clubs at')} <b className={colors.textWhite}>{profileUniversity}</b>
          <Link to="/profile" className={colors.accent}>{t('Change')}</Link>
        </div>
      ) : (
        <div className="space-y-2">
          <label className={`block text-xs font-semibold ${colors.textFaint}`}>{t('Which university do you attend?')}</label>
          <select className={selectClass} value={picked} onChange={(e) => chooseUniversity(e.target.value)}>
            <option value="">{t('Select your university…')}</option>
            {CLUB_UNIVERSITIES.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
          {user && picked && !saved && (
            <button onClick={saveToProfile} className={`text-xs font-semibold ${colors.accent}`}>{t('Save as my university')}</button>
          )}
          {saved && <p className={`text-xs ${colors.success}`}>{t('Saved to your profile.')}</p>}
        </div>
      )}

      {!university && <PixelEmpty sprite="search" title={t('Pick your university')}>{t('Choose it above to see its clubs.')}</PixelEmpty>}

      {university && (
        <>
          <div className="relative">
            <Icon name="search" size={18} className={`absolute start-3.5 top-1/2 -translate-y-1/2 ${colors.textFaint}`} />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('Search by club name or interests...')}
              className={`w-full ${colors.bgInset} border ${colors.border} ${radius.md} ps-10 pe-3 py-2.5 text-sm ${colors.textWhite} outline-none focus:border-md3-primary`}
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`text-xs font-medium whitespace-nowrap px-3.5 py-1.5 ${radius.full} border transition ${
                  category === c ? `${colors.accentBg} ${colors.accentOn} border-transparent` : `${colors.border} ${colors.textMuted}`
                }`}
              >
                {c}
              </button>
            ))}
          </div>

          {status === 'loading' && (
            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              <CardSkeleton tall />
              <CardSkeleton tall />
              <CardSkeleton tall />
            </div>
          )}
          {status === 'error' && <p className={`text-xs ${colors.error}`}>{t('Couldn\'t load clubs. Has 010_private_clubs_usernames.sql been run?')}</p>}
          {status === 'ready' && clubs.length === 0 && (
            <PixelEmpty sprite="ghost" title={t('No clubs at this university yet')}>
              {user ? (
                <Link to="/create?type=group" className={`font-semibold ${colors.accent}`}>{t('Create the first group')}</Link>
              ) : (
                t('Sign in to create the first group.')
              )}
            </PixelEmpty>
          )}
          {status === 'ready' && clubs.length > 0 && shown.length === 0 && (
            <p className={`text-xs ${colors.textFaint}`}>{t('No clubs match that search.')}</p>
          )}

          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {shown.map((c) => (
              <ClubCard key={c.id} club={c} joined={joinedIds.has(c.id)} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
