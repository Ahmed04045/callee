// src/views/PublicProfileView.jsx
//
// Shareable profile page at /u/:username. Works signed-out. Data comes from
// the get_public_profile() database function, which returns only username,
// name, avatar, bio, university and account type — never email, birthdate or
// club memberships — and returns nothing for profiles set to private.

import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useProfile } from '../context/ProfileContext';
import { supabase } from '../lib/supabaseClient';
import SubPageHeader from '../components/SubPageHeader';
import Icon from '../components/Icon';
import { PixelAvatar, PixelCover } from '../components/Pixel';
import { CareerBookSection } from '../components/CareerBook';
import { IdentityWordBanner } from '../components/IdentityWord';
import SocialLinksRow from '../components/SocialLinksRow';
import { useT } from '../i18n';

export default function PublicProfileView() {
  const { t } = useT();
  const { colors, radius } = themeConfig;
  const { username } = useParams();
  const { profile: myProfile } = useProfile();
  const [person, setPerson] = useState(null);
  const [entries, setEntries] = useState([]);
  const [status, setStatus] = useState('loading'); // loading | ready | missing | error
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    setStatus('loading');
    supabase.rpc('get_public_profile', { p_username: username }).then(({ data, error }) => {
      if (!active) return;
      if (error) return setStatus('error');
      if (!data?.length) return setStatus('missing');
      setPerson(data[0]);
      setStatus('ready');
      supabase.rpc('record_profile_view', { p_username: username });
    });
    supabase.rpc('get_public_career_entries', { p_username: username }).then(({ data }) => {
      if (active) setEntries(data ?? []);
    });
    return () => {
      active = false;
    };
  }, [username]);

  const url = `${window.location.origin}/u/${username}`;
  const share = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `@${username}`, url });
        return;
      } catch {
        /* cancelled — fall through to copy */
      }
    }
    await navigator.clipboard?.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isMe = myProfile?.username && myProfile.username === username;

  return (
    <div className="w-full max-w-md mx-auto space-y-6 px-4 py-6">
      <SubPageHeader title={`@${username}`} fallbackTo="/" />

      {status === 'loading' && <p className={`text-xs ${colors.textFaint}`}>{t('Loading profile…')}</p>}
      {status === 'error' && <p className={`text-xs ${colors.error}`}>{t('Couldn\'t load this profile. Try again.')}</p>}
      {status === 'missing' && (
        <p className={`text-sm ${colors.textMuted}`}>{t('This profile doesn\'t exist or is private.')}</p>
      )}

      {status === 'ready' && (
        <div className={`${colors.bgCard} border ${colors.border} ${radius.lg} p-6 text-center space-y-4`}>
          <div className="-mx-6 -mt-6 h-28">
            <PixelCover seed={person.username} cols={72} rows={12} />
          </div>
          <div className="-mt-14 inline-block border-4 border-md3-surfaceContainer bg-md3-surfaceContainer">
            {person.avatar_url ? (
              <img src={person.avatar_url} alt="" className="w-24 h-24 rounded-[var(--r-md)] object-cover" />
            ) : (
              <PixelAvatar seed={person.username} size={96} />
            )}
          </div>
          <div>
            <h2 className={`text-xl font-bold ${colors.textWhite}`}>{person.display_name || `@${person.username}`}</h2>
            <p className={`text-sm ${colors.accent}`}>@{person.username}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {person.account_type === 'business' && (
              <span className={`text-[11px] px-2.5 py-1 ${radius.full} ${colors.secondarySoftBg} ${colors.secondary}`}>{t('Business')}</span>
            )}
            {person.university && (
              <span className={`text-[11px] px-2.5 py-1 ${radius.full} border ${colors.border} ${colors.textMuted} flex items-center gap-1`}>
                <Icon name="school" size={12} /> {person.university}
              </span>
            )}
          </div>
          {person.bio && <p className={`text-sm ${colors.textMuted} leading-relaxed`}>{person.bio}</p>}

          {person.account_type === 'personal' && (
            <div className="flex flex-wrap justify-center gap-2">
              <span className={`text-[11px] font-semibold px-2.5 py-1 ${radius.full} border ${colors.border} ${colors.textMuted} flex items-center gap-1`}>
                <Icon name="visibility" size={12} /> {t('{n} profile views', { n: person.profile_views ?? 0 })}
              </span>
            </div>
          )}

          {person.account_type === 'personal' && person.identity_word && (
            <IdentityWordBanner word={person.identity_word} reason={person.identity_word_reason} own={false} />
          )}

          <SocialLinksRow profile={person} />

          {person.looking_for?.length > 0 && (
            <div className="flex flex-wrap justify-center gap-1.5">
              {person.looking_for.map((tag) => (
                <span key={tag} className={`text-[10px] ${colors.textFaint} ${colors.bgPill} px-2 py-0.5 border ${colors.border}`}>
                  <bdi>#{t(tag)}</bdi>
                </span>
              ))}
            </div>
          )}

          <div className="flex gap-2 justify-center pt-2">
            <button onClick={share} className={`flex items-center gap-1.5 text-xs font-bold ${colors.accentOn} ${colors.accentBg} ${colors.accentBgHover} px-4 py-2 ${radius.full}`}>
              <Icon name={copied ? 'check' : 'share'} size={14} className="text-inherit" /> {copied ? t('Link copied') : t('Share profile')}
            </button>
            {isMe && (
              <Link to="/profile" className={`text-xs font-bold ${colors.textWhite} border ${colors.borderStrong} px-4 py-2 ${radius.full}`}>{t('Edit')}</Link>
            )}
          </div>
        </div>
      )}

      {status === 'ready' && person.account_type === 'personal' && (
        <div className={`${colors.bgCardSoft} border ${colors.border} ${radius.lg} p-5 text-start`}>
          <CareerBookSection entries={entries} own={false} />
        </div>
      )}
    </div>
  );
}
