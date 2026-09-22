// src/views/ProfileView.jsx
//
// This tab only ever renders while signed in — its nav item is hidden
// otherwise (see App.jsx), and App.jsx also bounces away from here if
// auth is lost mid-session. So no guest-state UI lives here anymore;
// that's handled once, at the nav/routing level, not per-page.
//
// Identity (avatar/email/sign out) and the editable profile fields
// (name/DOB/bio) are merged into one page now — there's nothing else left
// under Profile to justify a separate menu (Account/Theme/Legal/About all
// moved to the Settings tab).

import React, { useEffect, useRef, useState } from 'react';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { logUserAction } from '../components/TelemetryLog';
import { uploadImage, fileExtension } from '../lib/imageUpload';
import Icon from '../components/Icon';
import { PixelAvatar, PixelCover } from '../components/Pixel';
import { EDUCATION_OPTIONS } from '../lib/education';
import { USERNAME_PATTERN, isUsernameAvailable, normalizeUsername } from '../lib/username';
import { supabase } from '../lib/supabaseClient';
import { GIG_TAGS } from '../lib/options';
import { ChipPicker } from './create/formKit';
import { CareerBookSection } from '../components/CareerBook';
import { IdentityWordBanner, IdentityWordQuiz } from '../components/IdentityWord';
import { useT } from '../i18n';

const BIO_MAX = 200;
const MAX_LOOKING_FOR = 6;
const todayISO = new Date().toISOString().split('T')[0];


export default function ProfileView() {
  const { t } = useT();
  const { colors, radius } = themeConfig;
  const { status, user, signOut } = useAuth();
  const { profile, status: profileStatus, error, saveProfile } = useProfile();
  const isAuthenticated = status === 'authenticated' && user;
  const isLoadingSession = status === 'loading';

  const [displayName, setDisplayName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bio, setBio] = useState('');
  const [education, setEducation] = useState('');
  const [educationOther, setEducationOther] = useState('');
  const [discoverable, setDiscoverable] = useState(false);
  const [username, setUsername] = useState('');
  const [usernameState, setUsernameState] = useState('idle'); // idle | checking | ok | taken | invalid
  const [isPublic, setIsPublic] = useState(true);
  const [lookingFor, setLookingFor] = useState([]);
  const [entries, setEntries] = useState([]);
  const [wordQuizOpen, setWordQuizOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState(null);
  const avatarInputRef = useRef(null);

  const loadEntries = () => {
    if (!user) return;
    supabase
      .from('career_entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data }) => setEntries(data ?? []));
  };
  useEffect(loadEntries, [user]);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setDateOfBirth(profile.date_of_birth ?? '');
      setBio(profile.bio ?? '');
      setDiscoverable(Boolean(profile.discoverable));
      setUsername(profile.username ?? '');
      setIsPublic(profile.is_public !== false);
      setLookingFor(profile.looking_for ?? []);

      const storedUniversity = profile.university ?? '';
      if (storedUniversity && EDUCATION_OPTIONS.includes(storedUniversity)) {
        setEducation(storedUniversity);
        setEducationOther('');
      } else if (storedUniversity) {
        setEducation('Other');
        setEducationOther(storedUniversity);
      } else {
        setEducation('');
        setEducationOther('');
      }
    }
  }, [profile]);

  // Live availability check when the username is edited (skipped for the current one).
  useEffect(() => {
    if (!profile || username === (profile.username ?? '')) {
      setUsernameState('idle');
      return undefined;
    }
    if (!USERNAME_PATTERN.test(username)) {
      setUsernameState('invalid');
      return undefined;
    }
    setUsernameState('checking');
    let active = true;
    const timer = setTimeout(async () => {
      const ok = await isUsernameAvailable(username);
      if (active) setUsernameState(ok ? 'ok' : 'taken');
    }, 350);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [username, profile]);

  if (isLoadingSession) {
    return <p className={`text-sm ${colors.textFaint}`}>{t('Checking your session…')}</p>;
  }

  // Shouldn't normally be reachable while signed out — the nav item is
  // hidden and App.jsx redirects away — but render nothing rather than a
  // broken form in the brief moment before that redirect happens.
  if (!isAuthenticated) return null;

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;

    setIsUploadingAvatar(true);
    setAvatarError(null);
    logUserAction('AVATAR_UPLOAD_SUBMIT', {});

    const path = `${user.id}/avatar.${fileExtension(file)}`;
    const { url, error: uploadError } = await uploadImage('avatars', path, file);

    if (uploadError) {
      setAvatarError(uploadError);
      setIsUploadingAvatar(false);
      return;
    }

    const { error: saveError } = await saveProfile({ avatar_url: url });
    setIsUploadingAvatar(false);
    if (saveError) setAvatarError(saveError.message);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setNotice(null);
    logUserAction('PROFILE_SAVE_SUBMIT', {});

    if (usernameState === 'taken' || usernameState === 'invalid') {
      setNotice(null);
      setIsSaving(false);
      return;
    }

    const universityToSave =
      education === 'Other' ? educationOther.trim() || null : education || null;

    const { error: saveError } = await saveProfile({
      display_name: displayName.trim() || null,
      date_of_birth: dateOfBirth || null,
      bio: bio.trim() || null,
      university: universityToSave,
      discoverable,
      username: username || null,
      is_public: isPublic,
      looking_for: lookingFor,
    });

    setIsSaving(false);
    if (!saveError) setNotice(t('Profile saved.'));
  };

  const heading = displayName.trim() || user.email;
  const profileUrl = profile?.username ? `${window.location.origin}/u/${profile.username}` : null;
  const shareProfile = async () => {
    if (!profileUrl) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: `@${profile.username}`, url: profileUrl });
        return;
      } catch {
        /* cancelled — fall back to copy */
      }
    }
    await navigator.clipboard?.writeText(profileUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  const usernameHint = {
    checking: ['Checking…', colors.textFaint],
    ok: ['Available', colors.success],
    taken: ['That username is taken', colors.error],
    invalid: ['3–20 characters: letters, numbers, underscore', colors.error],
  }[usernameState];

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Identity */}
      <div className={`${colors.bgCard} border ${colors.border} ${radius.lg} p-6 text-center space-y-4`}>
        <div className="-mx-6 -mt-6 h-24">
          <PixelCover seed={profile?.username || user.id} cols={72} rows={10} />
        </div>
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          disabled={isUploadingAvatar}
          className={`relative -mt-14 w-20 h-20 mx-auto block rounded-[var(--r-md)] overflow-hidden group border-4 border-md3-surfaceContainer bg-md3-surfaceContainer`}
          title={t('Change photo')}
        >
          {profile?.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <PixelAvatar seed={profile?.username || user.id} size={80} className="w-full h-full" />
          )}
          <div
            className={`absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center`}
          >
            {isUploadingAvatar ? (
              <Icon name="progress_activity" size={20} className="text-white animate-spin" />
            ) : (
              <Icon name="photo_camera" size={20} className="text-white" />
            )}
          </div>
        </button>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          className="hidden"
        />
        {avatarError && <p className={`text-[11px] ${colors.error}`}>{avatarError}</p>}

        <div>
          <h3 className={`text-lg font-bold ${colors.textWhite} break-all`}>{heading}</h3>
          {profile?.username && <p className={`text-sm ${colors.accent}`}>@{profile.username}</p>}
          <p className={`text-xs ${colors.textFaint}`}>
            {displayName.trim() ? user.email : t('Signed in')}
          </p>
          {profile?.account_type === 'personal' && (
            <div className="flex items-center justify-center gap-2 mt-2">
              <span className={`text-[11px] font-semibold px-2.5 py-1 ${radius.full} border ${colors.border} ${colors.textMuted} flex items-center gap-1`}>
                <Icon name="visibility" size={12} /> {t('{n} profile views', { n: profile?.profile_views ?? 0 })}
              </span>
            </div>
          )}
          {profileUrl && (
            <button
              type="button"
              onClick={shareProfile}
              className={`mt-2 inline-flex items-center gap-1.5 text-xs font-semibold ${colors.accent}`}
            >
              <Icon name={copied ? 'check' : 'share'} size={14} /> {copied ? t('Link copied') : t('Share my profile')}
            </button>
          )}
        </div>

        {profile?.account_type === 'personal' && (
          <IdentityWordBanner word={profile?.identity_word} reason={profile?.identity_word_reason} own onFind={() => setWordQuizOpen(true)} />
        )}

        <button
          onClick={() => {
            logUserAction('SIGN_OUT_CLICK', {});
            signOut();
          }}
          className={`w-full flex items-center justify-center gap-2 text-xs font-bold ${colors.textMuted} border ${colors.borderStrong} ${radius.full} py-2 ${colors.textHoverStrong} transition`}
        >
          <Icon name="logout" size={14} /> {t('Sign out')}
        </button>
      </div>

      {wordQuizOpen && (
        <IdentityWordQuiz
          onClose={() => setWordQuizOpen(false)}
          onSaved={async (word, reason) => {
            await saveProfile({ identity_word: word, identity_word_reason: reason });
            setWordQuizOpen(false);
          }}
        />
      )}

      {/* Editable profile */}
      {profileStatus === 'loading' && !profile && (
        <p className={`text-xs ${colors.textFaint}`}>{t('Loading your profile…')}</p>
      )}

      <form
        onSubmit={handleSubmit}
        className={`${colors.bgCardSoft} border ${colors.border} ${radius.lg} p-5 space-y-4`}
      >
        <h2 className={`text-sm font-bold ${colors.textWhite} flex items-center gap-2`}>
          <Icon name="edit" size={16} /> {t('Edit Profile')}
        </h2>

        <label className="block text-start">
          <span className={`text-[11px] font-semibold ${colors.textFaint}`}>{t('Username')}</span>
          <div className="relative mt-1">
            <span className={`absolute start-3 top-1/2 -translate-y-1/2 text-sm ${colors.textFaint}`}>@</span>
            <input
              type="text"
              maxLength={20}
              value={username}
              onChange={(e) => setUsername(normalizeUsername(e.target.value))}
              placeholder={t('username')}
              className={`w-full ${colors.bgInset} border ${colors.borderStrong} ${radius.md} ps-7 pe-3 py-2.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary ${colors.transition}`}
            />
          </div>
          {usernameHint && <span className={`block mt-1 text-[11px] ${usernameHint[1]}`}>{t(usernameHint[0])}</span>}
        </label>

        <label className="block text-start">
          <span className={`text-[11px] font-semibold ${colors.textFaint}`}>{t('Name')}</span>
          <input
            type="text"
            maxLength={60}
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder={t('Your name')}
            className={`w-full mt-1 ${colors.bgInset} border ${colors.borderStrong} ${radius.md} px-3 py-2.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary ${colors.transition}`}
          />
        </label>

        <label className="block text-start">
          <span className={`text-[11px] font-semibold ${colors.textFaint}`}>
            {t('Date of birth')} <span className={colors.textDim}>{t('(optional)')}</span>
          </span>
          <input
            type="date"
            value={dateOfBirth}
            max={todayISO}
            onChange={(e) => setDateOfBirth(e.target.value)}
            className={`w-full mt-1 ${colors.bgInset} border ${colors.borderStrong} ${radius.md} px-3 py-2.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary ${colors.transition}`}
          />
        </label>

        {profile?.account_type === 'personal' && (
          <label className="block text-start">
            <span className={`text-[11px] font-semibold ${colors.textFaint}`}>
              {t('School / University')} <span className={colors.textDim}>{t('(optional)')}</span>
            </span>
            <select
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              className={`w-full mt-1 ${colors.bgInset} border ${colors.borderStrong} ${radius.md} px-3 py-2.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary ${colors.transition}`}
            >
              <option value="">{t('Select…')}</option>
              {EDUCATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              <option value="Other">{t('Other')}</option>
            </select>
            {education === 'Other' && (
              <input
                type="text"
                maxLength={100}
                value={educationOther}
                onChange={(e) => setEducationOther(e.target.value)}
                placeholder={t('Enter your school or university')}
                className={`w-full mt-2 ${colors.bgInset} border ${colors.borderStrong} ${radius.md} px-3 py-2.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary ${colors.transition}`}
              />
            )}
          </label>
        )}

        <label className="block text-start">
          <div className="flex items-baseline justify-between">
            <span className={`text-[11px] font-semibold ${colors.textFaint}`}>{t('Description')}</span>
            <span className={`text-[10px] ${bio.length >= BIO_MAX ? colors.error : colors.textDim}`}>
              {bio.length}/{BIO_MAX}
            </span>
          </div>
          <textarea
            rows={4}
            maxLength={BIO_MAX}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder={t('A little about you…')}
            className={`w-full mt-1 ${colors.bgInset} border ${colors.borderStrong} ${radius.md} px-3 py-2.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary ${colors.transition} resize-none`}
          />
        </label>

        {profile?.account_type === 'personal' && (
          <div className="block text-start">
            <span className={`text-[11px] font-semibold ${colors.textFaint}`}>
              {t('Looking for')} <span className={colors.textDim}>{t('(optional)')}</span>
            </span>
            <p className={`text-[11px] ${colors.textFaint} mt-0.5 mb-1.5`}>{t('Shown to posters who view your profile — pick what kind of gigs interest you.')}</p>
            <ChipPicker options={GIG_TAGS} value={lookingFor} onChange={setLookingFor} multiple max={MAX_LOOKING_FOR} />
          </div>
        )}

        <label
          className={`flex items-center justify-between p-3 ${colors.bgInset} ${radius.md} border ${colors.border}`}
        >
          <span className={`text-xs ${colors.textMuted}`}>{t('Anyone with my profile link can view it')}</span>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="accent-md3-primary"
          />
        </label>

        <label
          className={`flex items-center justify-between p-3 ${colors.bgInset} ${radius.md} border ${colors.border}`}
        >
          <span className={`text-xs ${colors.textMuted}`}>
            {t('Discoverable via')} <span className={colors.accent}>{t('/search')}</span> {t('on Discord')}
          </span>
          <input
            type="checkbox"
            checked={discoverable}
            onChange={(e) => setDiscoverable(e.target.checked)}
            className="accent-md3-primary"
          />
        </label>
        <p className={`text-[10px] ${colors.textDim} -mt-2`}>
          {t('Off by default. When on, your name, school, and bio are findable by anyone using the Discord bot.')}
        </p>

        {error && <p className={`text-xs ${colors.error}`}>{error}</p>}
        {notice && <p className={`text-xs ${colors.success}`}>{notice}</p>}

        <button
          type="submit"
          disabled={isSaving}
          className={`w-full flex items-center justify-center gap-2 ${radius.full} py-2.5 text-sm font-bold ${colors.accentOn} ${colors.accentBg} ${colors.accentBgHover} transition disabled:opacity-60`}
        >
          {isSaving && (
            <Icon name="progress_activity" size={16} className="animate-spin text-inherit" />
          )}
          {t('Save profile')}
        </button>
      </form>

      {profile?.account_type === 'personal' && (
        <>
          <ProfileReadiness profile={profile} hasEntry={entries.length > 0} />
          <div className={`${colors.bgCardSoft} border ${colors.border} ${radius.lg} p-5`}>
            <CareerBookSection userId={user.id} entries={entries} own onChanged={loadEntries} />
          </div>
        </>
      )}
    </div>
  );
}

function ProfileReadiness({ profile, hasEntry }) {
  const { t } = useT();
  const { colors, radius } = themeConfig;
  const [open, setOpen] = useState(false);

  const criteria = [
    { id: 'name', label: t('Your name'), done: Boolean(profile?.display_name) },
    { id: 'username', label: t('A username'), done: Boolean(profile?.username) },
    { id: 'university', label: t('Your university'), done: Boolean(profile?.university) },
    { id: 'bio', label: t('A short bio'), done: Boolean(profile?.bio) },
    { id: 'avatar', label: t('A profile photo'), done: Boolean(profile?.avatar_url) },
    { id: 'looking_for', label: t('What you are looking for'), done: (profile?.looking_for?.length ?? 0) > 0 },
    { id: 'entry', label: t('One receipt'), done: hasEntry },
  ];
  const met = criteria.filter((c) => c.done).length;

  return (
    <div className={`${colors.bgCardSoft} border ${colors.border} ${radius.lg} p-5 space-y-2`}>
      <button type="button" onClick={() => setOpen((o) => !o)} className="w-full flex items-center justify-between gap-3">
        <span className={`text-sm font-bold ${colors.textWhite}`}>{t('Profile completeness')}</span>
        <span className={`text-xs font-mono font-bold ${met === criteria.length ? colors.success : colors.textFaint} flex items-center gap-1`}>
          {t('{met}/{total} criteria met', { met, total: criteria.length })}
          <Icon name="expand_more" size={16} className={open ? 'rotate-180' : ''} />
        </span>
      </button>
      <p className={`text-[11px] ${colors.textFaint}`}>{t('A complete profile is what a gig or event poster sees before they decide.')}</p>
      {open && (
        <ul className="space-y-1.5 pt-1">
          {criteria.map((c) => (
            <li key={c.id} className={`flex items-center gap-2 text-xs ${c.done ? colors.textMuted : colors.textFaint}`}>
              <Icon name={c.done ? 'check_circle' : 'expand_more'} size={14} className={c.done ? colors.success : 'opacity-0'} />
              {c.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
