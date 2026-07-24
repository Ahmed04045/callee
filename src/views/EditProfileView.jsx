// src/views/EditProfileView.jsx

import React, { useEffect, useState } from 'react';
import themeConfig from '../theme/themeConfig';
import { useProfile } from '../hooks/useProfile';
import { logUserAction } from '../components/TelemetryLog';
import SubPageHeader from '../components/SubPageHeader';
import Icon from '../components/Icon';

const BIO_MAX = 200;
const todayISO = new Date().toISOString().split('T')[0];

export default function EditProfileView() {
  const { colors, radius } = themeConfig;
  const { profile, status, error, saveProfile } = useProfile();

  const [displayName, setDisplayName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bio, setBio] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  // Seed the form once the real row loads — profile starts null while
  // status is 'loading', so this only fires after a real fetch.
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setDateOfBirth(profile.date_of_birth ?? '');
      setBio(profile.bio ?? '');
    }
  }, [profile]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setNotice(null);
    logUserAction('PROFILE_SAVE_SUBMIT', {});

    const { error: saveError } = await saveProfile({
      display_name: displayName.trim() || null,
      date_of_birth: dateOfBirth || null,
      bio: bio.trim() || null,
    });

    setIsSaving(false);
    if (!saveError) setNotice('Profile saved.');
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <SubPageHeader title="Edit Profile" />

      {status === 'loading' && !profile && (
        <p className={`text-sm ${colors.textFaint}`}>Loading your profile…</p>
      )}

      {status !== 'loading' || profile ? (
        <form
          onSubmit={handleSubmit}
          className={`${colors.bgCard} border ${colors.border} ${radius.lg} p-5 space-y-4`}
        >
          <label className="block text-left">
            <span className={`text-[11px] font-semibold ${colors.textFaint}`}>Name</span>
            <input
              type="text"
              maxLength={60}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your name"
              className={`w-full mt-1 ${colors.bgInset} border ${colors.borderStrong} ${radius.md} px-3 py-2.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary ${colors.transition}`}
            />
          </label>

          <label className="block text-left">
            <span className={`text-[11px] font-semibold ${colors.textFaint}`}>
              Date of birth <span className={colors.textDim}>(optional)</span>
            </span>
            <input
              type="date"
              value={dateOfBirth}
              max={todayISO}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className={`w-full mt-1 ${colors.bgInset} border ${colors.borderStrong} ${radius.md} px-3 py-2.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary ${colors.transition}`}
            />
          </label>

          <label className="block text-left">
            <div className="flex items-baseline justify-between">
              <span className={`text-[11px] font-semibold ${colors.textFaint}`}>Description</span>
              <span
                className={`text-[10px] ${bio.length >= BIO_MAX ? colors.error : colors.textDim}`}
              >
                {bio.length}/{BIO_MAX}
              </span>
            </div>
            <textarea
              rows={4}
              maxLength={BIO_MAX}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A little about you…"
              className={`w-full mt-1 ${colors.bgInset} border ${colors.borderStrong} ${radius.md} px-3 py-2.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary ${colors.transition} resize-none`}
            />
          </label>

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
            Save profile
          </button>
        </form>
      ) : null}
    </div>
  );
}