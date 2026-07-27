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

import React, { useEffect, useState } from 'react';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { logUserAction } from '../components/TelemetryLog';
import Icon from '../components/Icon';

const BIO_MAX = 200;
const todayISO = new Date().toISOString().split('T')[0];

// Not exhaustive, but covers the accredited universities operating in
// Qatar plus a High School option for younger users. "Other" reveals a
// free-text field rather than just storing the literal word "Other" —
// keeps the data actually useful if someone's school isn't listed.
const EDUCATION_OPTIONS = [
  'High School',
  'Qatar University',
  'Hamad Bin Khalifa University (HBKU)',
  'University of Doha for Science and Technology (UDST)',
  'Carnegie Mellon University in Qatar',
  'Georgetown University in Qatar',
  'Northwestern University in Qatar',
  'Texas A&M University at Qatar',
  'VCUarts Qatar',
  'Weill Cornell Medicine - Qatar',
  'HEC Paris in Qatar',
  'Community College of Qatar',
  'University of Calgary in Qatar',
  'Al Rayyan International University',
  'Lusail University',
  'Doha Institute for Graduate Studies',
];

export default function ProfileView() {
  const { colors, radius, font } = themeConfig;
  const { status, user, signOut } = useAuth();
  const { profile, status: profileStatus, error, saveProfile } = useProfile();
  const isAuthenticated = status === 'authenticated' && user;
  const isLoadingSession = status === 'loading';

  const [displayName, setDisplayName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bio, setBio] = useState('');
  const [education, setEducation] = useState('');
  const [educationOther, setEducationOther] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? '');
      setDateOfBirth(profile.date_of_birth ?? '');
      setBio(profile.bio ?? '');

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

  if (isLoadingSession) {
    return <p className={`text-sm ${colors.textFaint}`}>Checking your session…</p>;
  }

  // Shouldn't normally be reachable while signed out — the nav item is
  // hidden and App.jsx redirects away — but render nothing rather than a
  // broken form in the brief moment before that redirect happens.
  if (!isAuthenticated) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setNotice(null);
    logUserAction('PROFILE_SAVE_SUBMIT', {});

    const universityToSave =
      education === 'Other' ? educationOther.trim() || null : education || null;

    const { error: saveError } = await saveProfile({
      display_name: displayName.trim() || null,
      date_of_birth: dateOfBirth || null,
      bio: bio.trim() || null,
      university: universityToSave,
    });

    setIsSaving(false);
    if (!saveError) setNotice('Profile saved.');
  };

  const heading = displayName.trim() || user.email;

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Identity */}
      <div className={`${colors.bgCard} border ${colors.border} ${radius.lg} p-6 text-center space-y-4`}>
        <div
          className={`w-20 h-20 ${colors.gradientBrand} ${radius.full} mx-auto flex items-center justify-center text-2xl ${font.heading} ${colors.accentOn}`}
        >
          {heading?.[0]?.toUpperCase() ?? 'U'}
        </div>
        <div>
          <h3 className={`text-lg font-bold ${colors.textWhite} break-all`}>{heading}</h3>
          <p className={`text-xs ${colors.textFaint}`}>
            {displayName.trim() ? user.email : 'Signed in'}
          </p>
        </div>

        <button
          onClick={() => {
            logUserAction('SIGN_OUT_CLICK', {});
            signOut();
          }}
          className={`w-full flex items-center justify-center gap-2 text-xs font-bold ${colors.textMuted} border ${colors.borderStrong} ${radius.full} py-2 ${colors.textHoverStrong} transition`}
        >
          <Icon name="logout" size={14} /> Sign out
        </button>
      </div>

      {/* Editable profile */}
      {profileStatus === 'loading' && !profile && (
        <p className={`text-xs ${colors.textFaint}`}>Loading your profile…</p>
      )}

      <form
        onSubmit={handleSubmit}
        className={`${colors.bgCardSoft} border ${colors.border} ${radius.lg} p-5 space-y-4`}
      >
        <h2 className={`text-sm font-bold ${colors.textWhite} flex items-center gap-2`}>
          <Icon name="edit" size={16} /> Edit Profile
        </h2>

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

        {profile?.account_type === 'personal' && (
          <label className="block text-left">
            <span className={`text-[11px] font-semibold ${colors.textFaint}`}>
              School / University <span className={colors.textDim}>(optional)</span>
            </span>
            <select
              value={education}
              onChange={(e) => setEducation(e.target.value)}
              className={`w-full mt-1 ${colors.bgInset} border ${colors.borderStrong} ${radius.md} px-3 py-2.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary ${colors.transition}`}
            >
              <option value="">Select…</option>
              {EDUCATION_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
              <option value="Other">Other</option>
            </select>
            {education === 'Other' && (
              <input
                type="text"
                maxLength={100}
                value={educationOther}
                onChange={(e) => setEducationOther(e.target.value)}
                placeholder="Enter your school or university"
                className={`w-full mt-2 ${colors.bgInset} border ${colors.borderStrong} ${radius.md} px-3 py-2.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary ${colors.transition}`}
              />
            )}
          </label>
        )}

        <label className="block text-left">
          <div className="flex items-baseline justify-between">
            <span className={`text-[11px] font-semibold ${colors.textFaint}`}>Description</span>
            <span className={`text-[10px] ${bio.length >= BIO_MAX ? colors.error : colors.textDim}`}>
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
    </div>
  );
}