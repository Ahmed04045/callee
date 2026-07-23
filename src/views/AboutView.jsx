// src/views/AboutView.jsx
//
// Public informational page. Search/Ads eligibility needs more than this
// one page (a filled-in Terms of Service and Privacy Policy matter just as
// much — see the Legal tabs on Profile — plus basic on-page SEO like a
// <title>/meta description, which lives in index.html). This page covers
// the "who is behind this" part specifically.

import React from 'react';
import { Link } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import Icon from '../components/Icon';

export default function AboutView() {
  const { colors, radius, font, brand } = themeConfig;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      <div className={`border-b ${colors.border} pb-4`}>
        <Link
          to="/"
          className={`inline-flex items-center gap-1 text-xs font-semibold ${colors.textFaint} ${colors.textHoverAccent} transition mb-4`}
        >
          <Icon name="arrow_back" size={14} /> Back to {brand.name}
        </Link>
        <h1 className={`text-2xl ${font.heading} ${colors.textWhite}`}>Who we are</h1>
      </div>

      <div className={`${colors.bgCard} border ${colors.border} ${radius.lg} p-6 space-y-4`}>
        <p className={`text-sm ${colors.textMuted} leading-relaxed`}>
          {brand.name} is a local platform connecting young creators and students with real
          opportunities — paid gigs in tech, media, and design, along with local events built for
          the youth ecosystem. Our goal is to give teens and young adults a straightforward way to
          find legitimate work and community without navigating a corporate job board.
        </p>
        <p className={`text-sm ${colors.textMuted} leading-relaxed`}>
          Every opportunity posted on {brand.name} is reviewed before it goes live — we manually
          approve listings rather than relying on automated moderation, since getting this right
          for a younger audience matters more than moving fast.
        </p>
      </div>

      <div className={`${colors.bgCardSoft} border ${colors.border} ${radius.lg} p-6 space-y-2`}>
        <h2 className={`text-sm font-bold ${colors.textWhite}`}>Contact</h2>
        <p className={`text-xs ${colors.textFaint} leading-relaxed`}>
          Questions, feedback, or a listing you'd like reviewed? Reach out at{' '}
          <span className={colors.accent}>[add your contact email here]</span>.
        </p>
      </div>
    </div>
  );
}