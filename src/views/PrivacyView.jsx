// src/views/PrivacyView.jsx

import React from 'react';
import themeConfig from '../theme/themeConfig';
import SubPageHeader from '../components/SubPageHeader';

export default function PrivacyView() {
  const { colors, radius, brand } = themeConfig;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <SubPageHeader title="Privacy Policy" />
      <div className={`${colors.bgCard} border ${colors.border} ${radius.lg} p-6`}>
        <p className={`text-sm ${colors.textFaint} italic leading-relaxed`}>
          Privacy Policy content goes here. Replace this placeholder with {brand.name}'s actual
          policy — cover what's collected (account email, applications, telemetry events like
          searches and taps) and why.
        </p>
      </div>
    </div>
  );
}