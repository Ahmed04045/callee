// src/views/LandingView.jsx
//
// The public front door (shown at "/" to signed-out visitors). It explains
// what Circosodal is, shows real live numbers and upcoming events straight from
// the database (no made-up stats), answers common questions, and sends people
// to sign up or explore. Signed-in users get the personal Home instead.

import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { supabase } from '../lib/supabaseClient';
import usePageMeta from '../lib/usePageMeta';
import Logo from '../components/Logo';
import ThemeMenu from '../components/ThemeMenu';
import LanguageSwitch from '../components/LanguageSwitch';
import { useTheme } from '../theme/theme';
import Icon from '../components/Icon';
import { PixelCover, PixelSprite } from '../components/Pixel';
import { EventCard } from '../components/FeedCards';
import { useT } from '../i18n';

const FEATURES = [
  { icon: 'event_available', title: 'Events near you', text: 'Find hackathons, workshops and meetups, RSVP in one tap, and see them on a map.' },
  { icon: 'groups', title: 'Private clubs', text: 'Browse your university’s clubs and request to join. Moderators approve you, and the group chats stay private.' },
  { icon: 'work', title: 'Gigs & collabs', text: 'Recruitment calls for developers, creators, designers and more. Apply in a click.' },
  { icon: 'add_circle', title: 'Start your own', text: 'Post an event, a gig or a whole group. Everything is reviewed before it goes public.' },
];

const STEPS = [
  { n: '01', title: 'Make an account', text: 'Sign up with Google or email and pick a username. It takes a minute.' },
  { n: '02', title: 'Pick your university', text: 'We show you the clubs and events that matter where you study.' },
  { n: '03', title: 'Show up', text: 'RSVP, request to join clubs, apply to gigs or start something new.' },
];

const FAQ = [
  ['Who is Circosodal for?', 'Students and young creators in Qatar. Right now the clubs are at UDST, and more universities are coming.'],
  ['Is it free?', 'Yes. Creating an account, joining events and requesting to join clubs is free.'],
  ['Why are clubs private?', 'Club chats (WhatsApp and Discord) are only shown to approved members. You send a request and the club’s moderators let you in, which keeps groups safe and spam-free.'],
  ['How many clubs can I join?', 'Up to five, so you can actually take part in each one.'],
  ['Who checks the events and gigs?', 'Every event, gig and group is reviewed by an admin before it appears publicly.'],
  ['Can I run my own event or club?', 'Yes. Use the Create tab. Events get RSVPs and an attendee list for you; groups get their own moderators.'],
];

const todayISO = () => new Date().toLocaleDateString('en-CA');

function useLiveStats() {
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);

  useEffect(() => {
    let active = true;
    const today = todayISO();
    Promise.all([
      supabase.from('clubs').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('events').select('id', { count: 'exact', head: true }).eq('status', 'approved').gte('event_date', today),
      supabase.from('gigs').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
      supabase.from('events').select('*').eq('status', 'approved').gte('event_date', today).order('event_date').limit(3),
    ]).then(([clubs, evs, gigs, list]) => {
      if (!active) return;
      if (!clubs.error && !evs.error && !gigs.error) setStats({ clubs: clubs.count ?? 0, events: evs.count ?? 0, gigs: gigs.count ?? 0 });
      setEvents(list.data ?? []);
    });
    return () => {
      active = false;
    };
  }, []);

  return { stats, events };
}

export default function LandingView({ onOpenAuthModal }) {
  const { t } = useT();
  usePageMeta('', 'Circosodal: find clubs, events and gigs for students in Qatar. Join private university clubs, RSVP to events and start your own.');
  const { colors, radius, brand, font } = themeConfig;
  const navigate = useNavigate();
  const { stats, events } = useLiveStats();
  const { style: look } = useTheme();
  // Only show numbers worth showing: a "0" tile would look empty, not impressive.
  const statTiles = stats
    ? [[stats.clubs, 'Clubs'], [stats.events, 'Upcoming events'], [stats.gigs, 'Open gigs']].filter(([n]) => n > 0)
    : [];
  const [openFaq, setOpenFaq] = useState(0);
  const [query, setQuery] = useState('');

  const go = (e) => {
    e.preventDefault();
    navigate(query.trim() ? `/explore?q=${encodeURIComponent(query.trim())}` : '/explore');
  };

  const primary = `inline-flex items-center justify-center gap-2 ${colors.accentBg} ${colors.accentOn} font-bold text-sm px-6 py-3 ${radius.full}`;
  const secondary = `inline-flex items-center justify-center gap-2 border ${colors.borderStrong} ${colors.textWhite} font-bold text-sm px-6 py-3 ${radius.full} ${colors.bgHoverInset}`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className={`sticky top-0 z-30 border-b ${colors.border} ${colors.bgHeader} backdrop-blur`}>
        <div className="max-w-6xl mx-auto h-16 px-4 flex items-center justify-between gap-4">
          <Link to="/" aria-label={t('{name} home', { name: brand.name })}><Logo size={28} /></Link>
          <nav className="hidden md:flex items-center gap-6 text-sm font-semibold" aria-label={t('Main')}>
            <Link to="/explore" className={colors.textMuted}>{t('Explore')}</Link>
            <Link to="/clubs" className={colors.textMuted}>{t('Clubs')}</Link>
            <Link to="/recruit" className={colors.textMuted}>{t('Gigs')}</Link>
            <Link to="/about" className={colors.textMuted}>{t('About')}</Link>
          </nav>
          <div className="flex items-center gap-2">
            <LanguageSwitch />
            <ThemeMenu />
            <button onClick={() => onOpenAuthModal?.('signIn')} className={`hidden sm:block text-sm font-bold ${colors.textWhite} px-3 py-2`}>{t('Sign in')}</button>
            <button onClick={() => onOpenAuthModal?.('signUp')} className={`text-sm font-bold ${colors.accentBg} ${colors.accentOn} px-4 py-2 ${radius.full}`}>{t('Get started')}</button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-md3-outlineVariant">
          {look === 'pixel' && (
            <div className="absolute inset-x-0 bottom-0 h-24 opacity-40" aria-hidden="true">
              <PixelCover cols={96} rows={8} seed="hero" />
            </div>
          )}
          <div className="relative max-w-6xl mx-auto px-4 pt-16 pb-28 md:pt-24 md:pb-36 grid md:grid-cols-[1fr_auto] gap-10 items-center">
            <div className="space-y-6">
              <p className={`text-[11px] font-mono font-bold uppercase tracking-wider ${colors.accent}`}>{t('For students in Qatar')}</p>
              <h1 className={`text-4xl sm:text-6xl ${font.heading} ${colors.textWhite} leading-[1.05]`}>
                {t(brand.tagline)}
                <br />
                <span className={colors.gradientText}>{t(brand.subTagline)}</span>
              </h1>
              <p className={`text-base sm:text-lg ${colors.textMuted} max-w-xl`}>
                {t('Discover events, join your university\'s clubs and find gigs, all in one place, built for students.')}
              </p>
              <form onSubmit={go} className="max-w-xl relative">
                <Icon name="search" size={18} className={`absolute start-4 top-1/2 -translate-y-1/2 ${colors.textFaint}`} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('Search events, gigs, clubs…')}
                  aria-label={t('Search')}
                  className={`w-full ${colors.bgCard} border ${colors.borderStrong} ${radius.full} ps-12 pe-28 py-3.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary`}
                />
                <button type="submit" className={`absolute end-1.5 top-1/2 -translate-y-1/2 text-xs font-bold ${colors.accentBg} ${colors.accentOn} px-4 py-2 ${radius.full}`}>{t('Search')}</button>
              </form>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => onOpenAuthModal?.('signUp')} className={primary}>
                  {t('Get started')} <Icon name="arrow_forward" size={16} className="text-inherit" />
                </button>
                <Link to="/explore" className={secondary}>{t('Explore events')}</Link>
              </div>
            </div>
            {look === 'pixel' && (
              <div className="hidden md:block" aria-hidden="true">
                <PixelSprite sprite="ghost" size={220} />
              </div>
            )}
          </div>
        </section>

        {/* LIVE NUMBERS (real counts) */}
        {statTiles.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 -mt-10 relative z-10">
            <div className={`grid ${colors.bgCardStrong} border ${colors.borderStrong} ${radius.lg} divide-x rtl:divide-x-reverse divide-md3-outlineVariant`} style={{ gridTemplateColumns: `repeat(${statTiles.length}, minmax(0, 1fr))` }}>
              {statTiles.map(([n, label]) => (
                <div key={label} className="p-4 sm:p-6 text-center">
                  <p className={`text-3xl sm:text-4xl font-display font-bold ${colors.textWhite}`}>{n}</p>
                  <p className={`text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider ${colors.textFaint} mt-1`}>{t(label)}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* FEATURES */}
        <section className="max-w-6xl mx-auto px-4 py-20 space-y-10">
          <div className="max-w-2xl">
            <p className={`text-[11px] font-mono font-bold uppercase tracking-wider ${colors.accent}`}>{t('What you can do')}</p>
            <h2 className={`text-3xl ${colors.textWhite} mt-2`}>{t('Everything happening on campus, in one place.')}</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {FEATURES.map((f) => (
              <div key={f.title} className={`${colors.bgCard} border ${colors.border} ${radius.lg} p-5 space-y-3`}>
                <Icon name={f.icon} size={28} className={colors.accent} />
                <h3 className={`text-base font-bold ${colors.textWhite}`}>{t(f.title)}</h3>
                <p className={`text-sm ${colors.textMuted} leading-relaxed`}>{t(f.text)}</p>
              </div>
            ))}
          </div>
        </section>

        {/* HAPPENING SOON (real events) */}
        {events.length > 0 && (
          <section className="max-w-6xl mx-auto px-4 pb-20 space-y-6">
            <div className="flex items-end justify-between gap-4">
              <h2 className={`text-2xl ${colors.textWhite}`}>{t('Happening soon')}</h2>
              <Link to="/explore" className={`text-xs font-mono font-bold uppercase tracking-wider ${colors.accent}`}>{t('See all →')}</Link>
            </div>
            <div className="grid md:grid-cols-3 gap-5">
              {events.map((event) => (
                <EventCard key={event.id} event={event} onOpen={(e) => navigate(`/events/${e.id}`)} />
              ))}
            </div>
          </section>
        )}

        {/* HOW IT WORKS */}
        <section className={`border-y ${colors.border} ${colors.bgPanel}`}>
          <div className="max-w-6xl mx-auto px-4 py-20 space-y-10">
            <h2 className={`text-3xl ${colors.textWhite} max-w-2xl`}>{t('Up and running in three steps.')}</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {STEPS.map((s) => (
                <div key={s.n} className="space-y-2">
                  <p className={`text-4xl font-display font-bold ${colors.accent}`}>{s.n}</p>
                  <h3 className={`text-lg font-bold ${colors.textWhite}`}>{t(s.title)}</h3>
                  <p className={`text-sm ${colors.textMuted} leading-relaxed`}>{t(s.text)}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ORGANIZERS + SAFETY */}
        <section className="max-w-6xl mx-auto px-4 py-20 grid md:grid-cols-2 gap-6">
          <div className={`${colors.bgCard} border ${colors.border} ${radius.lg} p-6 space-y-3`}>
            <h3 className={`text-xl ${colors.textWhite}`}>{t('Run something? We\'ve got you.')}</h3>
            <p className={`text-sm ${colors.textMuted} leading-relaxed`}>
              {t('Post an event and see exactly who\'s coming, with capacity limits and a hidden-seats option. Start a club with its own moderators and a private group chat.')}
            </p>
            <button onClick={() => onOpenAuthModal?.('signUp')} className={`text-sm font-bold ${colors.accent}`}>{t('Create an account →')}</button>
          </div>
          <div className={`${colors.bgCard} border ${colors.border} ${radius.lg} p-6 space-y-3`}>
            <h3 className={`text-xl ${colors.textWhite} flex items-center gap-2`}><Icon name="shield" size={22} className={colors.success} /> {t('Built to be safe')}</h3>
            <p className={`text-sm ${colors.textMuted} leading-relaxed`}>
              {t('Every listing is reviewed before it goes live. Clubs are private and moderated, group links are only shown to approved members, and you can make your profile private at any time.')}
            </p>
            <Link to="/about" className={`text-sm font-bold ${colors.accent}`}>{t('How we keep it safe →')}</Link>
          </div>
        </section>

        {/* FAQ */}
        <section className="max-w-3xl mx-auto px-4 pb-20 space-y-6">
          <h2 className={`text-3xl ${colors.textWhite}`}>{t('Questions, answered.')}</h2>
          <div className={`${colors.bgCard} border ${colors.border} ${radius.lg} divide-y divide-md3-outlineVariant`}>
            {FAQ.map(([q, a], i) => (
              <div key={q}>
                <button
                  onClick={() => setOpenFaq(openFaq === i ? -1 : i)}
                  aria-expanded={openFaq === i}
                  className="w-full flex items-center justify-between gap-4 text-start p-4"
                >
                  <span className={`text-sm font-bold ${colors.textWhite}`}>{t(q)}</span>
                  <Icon name={openFaq === i ? 'close' : 'add_circle'} size={18} className={colors.accent} />
                </button>
                {openFaq === i && <p className={`px-4 pb-4 text-sm ${colors.textMuted} leading-relaxed`}>{t(a)}</p>}
              </div>
            ))}
          </div>
        </section>

        {/* FINAL CTA */}
        <section className="max-w-6xl mx-auto px-4 pb-24">
          <div className={`relative overflow-hidden ${colors.bgCardStrong} border ${colors.borderStrong} ${radius.lg} p-8 md:p-12 text-center`}>
            <div className="absolute inset-0 opacity-25" aria-hidden="true"><PixelCover cols={64} rows={12} seed="cta" /></div>
            <div className="relative space-y-5">
              <h2 className={`text-3xl md:text-4xl ${colors.textWhite}`}>{t('Ready to find your people?')}</h2>
              <div className="flex flex-wrap gap-3 justify-center">
                <button onClick={() => onOpenAuthModal?.('signUp')} className={primary}>{t('Get started')}</button>
                <Link to="/explore" className={secondary}>{t('Explore first')}</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className={`border-t ${colors.border} ${colors.bgPanel}`}>
        <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo size={22} />
          <nav className={`flex flex-wrap gap-5 text-xs ${colors.textMuted}`} aria-label={t('Footer')}>
            <Link to="/about">{t('About')}</Link>
            <Link to="/terms">{t('Terms')}</Link>
            <Link to="/privacy">{t('Privacy')}</Link>
            <Link to="/explore">{t('Explore')}</Link>
          </nav>
          <p className={`text-[11px] ${colors.textFaint}`}>© {new Date().getFullYear()} {brand.name}</p>
        </div>
      </footer>
    </div>
  );
}
