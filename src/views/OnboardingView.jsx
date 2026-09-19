// src/views/OnboardingView.jsx
//
// One-time account setup, shown right after email verification / Google
// sign-in until the profile has an account type AND a username (App.jsx
// enforces this). Steps: account type -> name -> username (with generated
// suggestions, or type your own) -> school/university (personal only).
// Anything already known (e.g. Google name/photo, ?accountType= hint) is
// pre-filled or skipped.

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { logUserAction } from '../components/TelemetryLog';
import Icon from '../components/Icon';
import { EDUCATION_OPTIONS } from '../lib/education';
import {
  USERNAME_PATTERN,
  isUsernameAvailable,
  normalizeUsername,
  suggestAvailableUsernames,
} from '../lib/username';

const ACCOUNT_TYPES = [
  { id: 'personal', label: 'Personal', icon: 'person', description: 'You, as an individual — apply to gigs, offer opportunities, join clubs, build a profile.' },
  { id: 'business', label: 'Business', icon: 'storefront', description: 'A company, startup, or organization looking to recruit or post opportunities.' },
];

export default function OnboardingView() {
  const { colors, radius, font, brand } = themeConfig;
  const { user } = useAuth();
  const { profile, saveProfile } = useProfile();
  const navigate = useNavigate();

  const meta = user?.user_metadata ?? {};
  const [step, setStep] = useState(profile?.account_type ? 1 : 0);
  const [accountType, setAccountType] = useState(profile?.account_type ?? null);
  const [displayName, setDisplayName] = useState(profile?.display_name ?? meta.full_name ?? meta.name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [usernameState, setUsernameState] = useState('idle'); // idle | checking | ok | taken | invalid
  const [suggestions, setSuggestions] = useState([]);
  const [suggesting, setSuggesting] = useState(false);
  const [education, setEducation] = useState(profile?.university ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const checkToken = useRef(0);

  const steps = useMemo(() => (accountType === 'business' ? ['type', 'name', 'username'] : ['type', 'name', 'username', 'school']), [accountType]);
  const current = steps[step] ?? 'type';

  // Suggestions are generated when the username step opens (from the name typed
  // in the previous step, falling back to the email).
  useEffect(() => {
    if (current !== 'username') return;
    let active = true;
    setSuggesting(true);
    suggestAvailableUsernames(displayName, user?.email).then((list) => {
      if (!active) return;
      setSuggestions(list);
      setSuggesting(false);
      if (!username && list[0]) setUsername(list[0]);
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  // Live availability check (debounced) while the user types.
  useEffect(() => {
    if (current !== 'username') return;
    if (!username) {
      setUsernameState('idle');
      return;
    }
    if (!USERNAME_PATTERN.test(username)) {
      setUsernameState('invalid');
      return;
    }
    const token = ++checkToken.current;
    setUsernameState('checking');
    const timer = setTimeout(async () => {
      const ok = await isUsernameAvailable(username);
      if (token === checkToken.current) setUsernameState(ok ? 'ok' : 'taken');
    }, 350);
    return () => clearTimeout(timer);
  }, [username, current]);

  const finish = async (finalEducation) => {
    setSaving(true);
    setError(null);
    logUserAction('ONBOARDING_COMPLETE', { accountType });
    const updates = {
      account_type: accountType,
      display_name: displayName.trim() || null,
      username,
    };
    if (accountType === 'personal') updates.university = finalEducation || null;
    if (!profile?.avatar_url && (meta.avatar_url || meta.picture)) updates.avatar_url = meta.avatar_url || meta.picture;

    const { error: saveError } = await saveProfile(updates);
    setSaving(false);
    if (saveError) {
      setError(
        /duplicate|unique/i.test(saveError.message)
          ? 'That username was just taken — pick another.'
          : /USERNAME_RESERVED/.test(saveError.message)
            ? 'That username is reserved.'
            : saveError.message
      );
      setStep(steps.indexOf('username'));
      return;
    }
    navigate('/', { replace: true });
  };

  const next = () => {
    setError(null);
    if (current === 'username' && steps[step + 1] === undefined) return finish(education);
    setStep((s) => s + 1);
  };

  const inputClass = `w-full ${colors.bgInset} border ${colors.borderStrong} ${radius.md} px-3 py-2.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary ${colors.transition}`;
  const primaryBtn = `w-full flex items-center justify-center gap-2 ${radius.full} py-2.5 text-sm font-bold ${colors.accentOn} ${colors.accentBg} ${colors.accentBgHover} transition disabled:opacity-50`;

  const hint = {
    idle: null,
    checking: { text: 'Checking…', cls: colors.textFaint },
    ok: { text: `@${username} is available`, cls: colors.success },
    taken: { text: 'That username is taken', cls: colors.error },
    invalid: { text: '3–20 characters: letters, numbers, underscore', cls: colors.error },
  }[usernameState];

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1.5">
          <h1 className={`text-2xl ${font.heading} ${colors.textWhite}`}>Set up your {brand.name} account</h1>
          <p className={`text-xs ${colors.textFaint}`}>
            Step {step + 1} of {steps.length}
          </p>
        </div>

        {current === 'type' && (
          <div className="space-y-3">
            <p className={`text-sm text-center ${colors.textFaint}`}>What best describes you?</p>
            {ACCOUNT_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => {
                  setAccountType(type.id);
                  setStep(1);
                }}
                className={`w-full flex items-start gap-4 text-left ${colors.bgCard} border ${
                  accountType === type.id ? 'border-md3-primary' : colors.borderStrong
                } ${radius.lg} p-4 hover:border-md3-primary transition`}
              >
                <div className={`${colors.accentSoftBg} ${colors.accent} p-2.5 ${radius.md} shrink-0`}>
                  <Icon name={type.icon} size={20} className="text-inherit" />
                </div>
                <div>
                  <p className={`text-sm font-bold ${colors.textWhite}`}>{type.label}</p>
                  <p className={`text-xs ${colors.textFaint} mt-0.5 leading-relaxed`}>{type.description}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {current === 'name' && (
          <div className="space-y-4">
            <label className="block text-left">
              <span className={`text-[11px] font-semibold ${colors.textFaint}`}>
                {accountType === 'business' ? 'Business name' : 'Your name'}
              </span>
              <input className={`${inputClass} mt-1`} maxLength={60} value={displayName} onChange={(e) => setDisplayName(e.target.value)} autoFocus />
            </label>
            <button className={primaryBtn} disabled={!displayName.trim()} onClick={next}>Continue</button>
          </div>
        )}

        {current === 'username' && (
          <div className="space-y-4">
            <label className="block text-left">
              <span className={`text-[11px] font-semibold ${colors.textFaint}`}>Choose your username</span>
              <div className="relative mt-1">
                <span className={`absolute left-3 top-1/2 -translate-y-1/2 text-sm ${colors.textFaint}`}>@</span>
                <input
                  className={`${inputClass} pl-7`}
                  value={username}
                  maxLength={20}
                  onChange={(e) => setUsername(normalizeUsername(e.target.value))}
                  placeholder="username"
                  autoFocus
                />
              </div>
              {hint && <span className={`block mt-1 text-[11px] ${hint.cls}`}>{hint.text}</span>}
            </label>

            <div>
              <p className={`text-[11px] font-semibold ${colors.textFaint} mb-2`}>
                {suggesting ? 'Finding suggestions…' : suggestions.length ? 'Suggestions' : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setUsername(s)}
                    className={`text-xs px-3 py-1.5 ${radius.full} border transition ${
                      username === s ? `${colors.accentBg} ${colors.accentOn} border-transparent` : `${colors.borderStrong} ${colors.textMuted}`
                    }`}
                  >
                    @{s}
                  </button>
                ))}
              </div>
            </div>

            <p className={`text-[11px] ${colors.textDim}`}>Your profile link will be /u/{username || 'username'} — you can change it later.</p>
            {error && <p className={`text-xs ${colors.error}`}>{error}</p>}
            <button className={primaryBtn} disabled={usernameState !== 'ok' || saving} onClick={next}>
              {saving && <Icon name="progress_activity" size={16} className="animate-spin text-inherit" />}
              {steps[step + 1] === undefined ? 'Finish' : 'Continue'}
            </button>
          </div>
        )}

        {current === 'school' && (
          <div className="space-y-4">
            <label className="block text-left">
              <span className={`text-[11px] font-semibold ${colors.textFaint}`}>Where do you study?</span>
              <select className={`${inputClass} mt-1`} value={education} onChange={(e) => setEducation(e.target.value)}>
                <option value="">Select…</option>
                {EDUCATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <p className={`text-[11px] ${colors.textDim}`}>This decides which university's clubs you see. You can skip and set it later.</p>
            {error && <p className={`text-xs ${colors.error}`}>{error}</p>}
            <button className={primaryBtn} disabled={saving} onClick={() => finish(education)}>
              {saving && <Icon name="progress_activity" size={16} className="animate-spin text-inherit" />}
              {education ? 'Finish' : 'Skip and finish'}
            </button>
          </div>
        )}

        {step > 0 && (
          <button onClick={() => setStep((s) => s - 1)} className={`block mx-auto text-xs ${colors.textFaint} ${colors.textHoverStrong}`}>
            Back
          </button>
        )}
      </div>
    </div>
  );
}
