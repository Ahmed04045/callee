// src/views/TermsView.jsx

import React from 'react';
import themeConfig from '../theme/themeConfig';
import SubPageHeader from '../components/SubPageHeader';
import { useT } from '../i18n';

export default function TermsView() {
  const { t } = useT();
  const { colors, radius, brand } = themeConfig;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <SubPageHeader title={t('Terms of Service')} />
      <div className={`${colors.bgCard} border ${colors.border} ${radius.lg} p-6`}>
        <p className={`text-sm ${colors.textFaint} italic leading-relaxed`}>
          Terms of Service content goes here. Replace this placeholder with {brand.name}'s actual
          terms before launch — most payment providers and Google Ads will want to see a real one.
        </p>
      </div>
    </div>
  );
}