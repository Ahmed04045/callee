// src/views/AboutView.jsx
//
// Public informational page. Search/Ads eligibility needs more than this
// one page (a filled-in Terms of Service and Privacy Policy matter just as
// much — see the Legal tabs on Profile — plus basic on-page SEO like a
// <title>/meta description, which lives in index.html). This page covers
// the "who is behind this" part specifically.

import React from 'react';
import themeConfig from '../theme/themeConfig';
import SubPageHeader from '../components/SubPageHeader';

export default function AboutView() {
  const { colors, radius, brand } = themeConfig;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8">
      <SubPageHeader title="Who we are" fallbackTo="/" backLabel={`Back to ${brand.name}`} />

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

      {brand.contactEmail && (
      <div className={`${colors.bgCardSoft} border ${colors.border} ${radius.lg} p-6 space-y-2`}>
        <h2 className={`text-sm font-bold ${colors.textWhite}`}>Contact</h2>
        <p className={`text-xs ${colors.textFaint} leading-relaxed`}>
          Questions, feedback, or a listing you'd like reviewed? Reach out at{' '}
          <a href={`mailto:${brand.contactEmail}`} className={colors.accent}>{brand.contactEmail}</a>.
        </p>
      </div>
      )}
    </div>
  );
}