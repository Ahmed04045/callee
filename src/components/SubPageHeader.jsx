// src/components/SubPageHeader.jsx

import React from 'react';
import { Link } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import Icon from './Icon';

export default function SubPageHeader({ title, backTo = '/profile', backLabel = 'Back' }) {
  const { colors, font } = themeConfig;
  return (
    <div className={`border-b ${colors.border} pb-4 mb-6`}>
      <Link
        to={backTo}
        className={`inline-flex items-center gap-1 text-xs font-semibold ${colors.textFaint} ${colors.textHoverAccent} transition mb-4`}
      >
        <Icon name="arrow_back" size={14} /> {backLabel}
      </Link>
      <h1 className={`text-2xl ${font.heading} ${colors.textWhite}`}>{title}</h1>
    </div>
  );
}