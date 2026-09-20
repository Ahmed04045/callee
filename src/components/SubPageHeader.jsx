// src/components/SubPageHeader.jsx

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import Icon from './Icon';
import { useT } from '../i18n';

// `fallbackTo` is only used when there's nowhere to actually go back to
// (e.g. this page was opened via a direct link/URL, so there's no prior
// in-app history) — otherwise this is a real "go back to wherever I
// actually came from," not a fixed destination. React Router marks the
// very first history entry of a session with location.key === 'default';
// that's the signal there's nothing behind it to navigate(-1) into.
export default function SubPageHeader({ title, fallbackTo = '/settings', backLabel }) {
  const { t } = useT();
  const { colors, font } = themeConfig;
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    if (location.key === 'default') {
      navigate(fallbackTo);
    } else {
      navigate(-1);
    }
  };

  return (
    <div className={`border-b ${colors.border} pb-4 mb-6`}>
      <button
        onClick={handleBack}
        className={`inline-flex items-center gap-1 text-xs font-semibold ${colors.textFaint} ${colors.textHoverAccent} transition mb-4`}
      >
        <Icon name="arrow_back" size={14} /> {backLabel ?? t('Back')}
      </button>
      <h1 className={`text-2xl ${font.heading} ${colors.textWhite}`}>{title}</h1>
    </div>
  );
}