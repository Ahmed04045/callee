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

export default function PublicProfileView() {
  const { colors, radius, font } = themeConfig;
  const { username } = useParams();
  const { profile: myProfile } = useProfile();
  const [person, setPerson] = useState(null);
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

      {status === 'loading' && <p className={`text-xs ${colors.textFaint}`}>Loading profile…</p>}
      {status === 'error' && <p className={`text-xs ${colors.error}`}>Couldn't load this profile. Try again.</p>}
      {status === 'missing' && (
        <p className={`text-sm ${colors.textMuted}`}>This profile doesn't exist or is private.</p>
      )}

      {status === 'ready' && (
        <div className={`${colors.bgCard} border ${colors.border} ${radius.lg} p-6 text-center space-y-4`}>
          {person.avatar_url ? (
            <img src={person.avatar_url} alt="" className="w-24 h-24 rounded-full object-cover mx-auto" />
          ) : (
            <div className={`w-24 h-24 mx-auto rounded-full ${colors.gradientBrand} flex items-center justify-center text-3xl ${font.heading} ${colors.accentOn}`}>
              {(person.display_name || person.username)[0].toUpperCase()}
            </div>
          )}
          <div>
            <h2 className={`text-xl font-bold ${colors.textWhite}`}>{person.display_name || `@${person.username}`}</h2>
            <p className={`text-sm ${colors.accent}`}>@{person.username}</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2">
            {person.account_type === 'business' && (
              <span className={`text-[11px] px-2.5 py-1 ${radius.full} ${colors.secondarySoftBg} ${colors.secondary}`}>Business</span>
            )}
            {person.university && (
              <span className={`text-[11px] px-2.5 py-1 ${radius.full} border ${colors.border} ${colors.textMuted} flex items-center gap-1`}>
                <Icon name="school" size={12} /> {person.university}
              </span>
            )}
          </div>
          {person.bio && <p className={`text-sm ${colors.textMuted} leading-relaxed`}>{person.bio}</p>}

          <div className="flex gap-2 justify-center pt-2">
            <button onClick={share} className={`flex items-center gap-1.5 text-xs font-bold ${colors.accentOn} ${colors.accentBg} ${colors.accentBgHover} px-4 py-2 ${radius.full}`}>
              <Icon name={copied ? 'check' : 'share'} size={14} className="text-inherit" /> {copied ? 'Link copied' : 'Share profile'}
            </button>
            {isMe && (
              <Link to="/profile" className={`text-xs font-bold ${colors.textWhite} border ${colors.borderStrong} px-4 py-2 ${radius.full}`}>Edit</Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
