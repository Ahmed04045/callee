// src/views/AboutView.jsx
//
// Public "who we are" page: what Circosodal is, how it works and how it keeps
// students safe. Written for real visitors and for search engines (a clear
// About page helps Google Search / Ads eligibility). Terms and Privacy are
// separate pages; contact details only show once `brand.contactEmail` is set
// in themeConfig.

import React from 'react';
import { Link } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import usePageMeta from '../lib/usePageMeta';
import SubPageHeader from '../components/SubPageHeader';
import Icon from '../components/Icon';

const PILLARS = [
  { icon: 'event_available', title: 'Events', text: 'Hackathons, workshops, meetups and socials. RSVP, see who is going and find them on the map.' },
  { icon: 'groups', title: 'Clubs & groups', text: 'University clubs and student-run groups. Request to join and the moderators let you in.' },
  { icon: 'work', title: 'Gigs & collaborations', text: 'Calls for developers, creators, designers and helpers, from teams that need them.' },
];

const SAFETY = [
  'Every event, gig and group is reviewed by an admin before it appears publicly.',
  'Clubs are private. WhatsApp and Discord links are only shown to approved members.',
  'Each club has moderators who can remove members, and every join, leave and removal is logged.',
  'You can be in up to five clubs, so groups stay active and personal.',
  'Profiles can be made private, and we never show your email or date of birth to other people.',
];

export default function AboutView() {
  usePageMeta('About', 'Circosodal connects students in Qatar with events, private university clubs and gigs. Learn what we do and how we keep it safe.');
  const { colors, radius, brand } = themeConfig;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 px-4 py-6">
      <SubPageHeader title="About Circosodal" fallbackTo="/" backLabel={`Back to ${brand.name}`} />

      <section className={`${colors.bgCard} border ${colors.border} ${radius.lg} p-6 space-y-4`}>
        <h2 className={`text-lg ${colors.textWhite}`}>Find your people.</h2>
        <p className={`text-sm ${colors.textMuted} leading-relaxed`}>
          {brand.name} is a community platform for students and young creators in Qatar. It puts what is happening around you in one place: events to go to,
          clubs to join and opportunities to work on together. Instead of hunting through group chats and posters, you sign in once and see what is on at your
          university and across the city.
        </p>
        <p className={`text-sm ${colors.textMuted} leading-relaxed`}>
          Anyone can start something. Post an event, open a club or put out a call for collaborators, and it goes live once it has been reviewed.
        </p>
      </section>

      <section className="grid sm:grid-cols-3 gap-4">
        {PILLARS.map((p) => (
          <div key={p.title} className={`${colors.bgCardSoft} border ${colors.border} ${radius.lg} p-4 space-y-2`}>
            <Icon name={p.icon} size={24} className={colors.accent} />
            <h3 className={`text-sm font-bold ${colors.textWhite}`}>{p.title}</h3>
            <p className={`text-xs ${colors.textMuted} leading-relaxed`}>{p.text}</p>
          </div>
        ))}
      </section>

      <section className={`${colors.bgCard} border ${colors.border} ${radius.lg} p-6 space-y-3`}>
        <h2 className={`text-lg ${colors.textWhite} flex items-center gap-2`}>
          <Icon name="shield" size={20} className={colors.success} /> How we keep it safe
        </h2>
        <ul className="space-y-2">
          {SAFETY.map((line) => (
            <li key={line} className={`flex gap-2 text-sm ${colors.textMuted} leading-relaxed`}>
              <Icon name="check" size={16} className={`mt-0.5 shrink-0 ${colors.success}`} />
              {line}
            </li>
          ))}
        </ul>
      </section>

      {(brand.builtBy || brand.contactEmail) && (
        <section className={`${colors.bgCardSoft} border ${colors.border} ${radius.lg} p-6 space-y-2`}>
          <h2 className={`text-sm font-bold ${colors.textWhite}`}>Who is behind it</h2>
          {brand.builtBy && <p className={`text-xs ${colors.textMuted}`}>{brand.name} is built by {brand.builtBy}.</p>}
          {brand.contactEmail && (
            <p className={`text-xs ${colors.textFaint}`}>
              Questions or feedback? <a href={`mailto:${brand.contactEmail}`} className={colors.accent}>{brand.contactEmail}</a>
            </p>
          )}
        </section>
      )}

      <p className={`text-xs ${colors.textFaint} text-center`}>
        <Link to="/terms" className={colors.accent}>Terms</Link> · <Link to="/privacy" className={colors.accent}>Privacy</Link>
      </p>
    </div>
  );
}
