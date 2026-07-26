// src/views/OnboardingAccountTypeView.jsx
//
// Not a nav tab — a forced interstitial. App.jsx redirects here whenever a
// signed-in user's profile has account_type === null, and redirects away
// once it's set. Picking an option is a plain upsert via useProfile, same
// mechanism the rest of the profile-editing flow already uses.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useProfile } from '../hooks/useProfile';
import { logUserAction } from '../components/TelemetryLog';
import Icon from '../components/Icon';

const ACCOUNT_TYPES = [
  {
    id: 'personal',
    label: 'Personal',
    description: 'You, as an individual — apply to gigs, offer opportunities, build a profile.',
    icon: 'person',
  },
  {
    id: 'brand',
    label: 'Brand',
    description: 'A company or product looking to recruit young creators.',
    icon: 'storefront',
  },
  {
    id: 'startup',
    label: 'Startup',
    description: 'An early-stage venture posting real roles.',
    icon: 'rocket_launch',
  },
  {
    id: 'other',
    label: 'Other',
    description: "Doesn't fit the above — organizations, collectives, etc.",
    icon: 'more_horiz',
  },
];

export default function OnboardingAccountTypeView() {
  const { colors, radius, font, brand } = themeConfig;
  const { saveProfile } = useProfile();
  const navigate = useNavigate();
  const [selecting, setSelecting] = useState(null);

  const handleSelect = async (accountType) => {
    setSelecting(accountType);
    logUserAction('ONBOARDING_ACCOUNT_TYPE_SELECT', { accountType });
    const { error } = await saveProfile({ account_type: accountType });
    setSelecting(null);
    if (!error) navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-1.5">
          <h1 className={`text-2xl ${font.heading} ${colors.textWhite}`}>
            Welcome to {brand.name}
          </h1>
          <p className={`text-sm ${colors.textFaint}`}>What best describes you?</p>
        </div>

        <div className="space-y-3">
          {ACCOUNT_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => handleSelect(type.id)}
              disabled={selecting !== null}
              className={`w-full flex items-start gap-4 text-left ${colors.bgCard} border ${colors.borderStrong} ${radius.lg} p-4 hover:border-md3-primary transition disabled:opacity-60`}
            >
              <div className={`${colors.accentSoftBg} ${colors.accent} p-2.5 ${radius.md} shrink-0`}>
                {selecting === type.id ? (
                  <Icon name="progress_activity" size={20} className="animate-spin text-inherit" />
                ) : (
                  <Icon name={type.icon} size={20} className="text-inherit" />
                )}
              </div>
              <div>
                <p className={`text-sm font-bold ${colors.textWhite}`}>{type.label}</p>
                <p className={`text-xs ${colors.textFaint} mt-0.5 leading-relaxed`}>
                  {type.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}