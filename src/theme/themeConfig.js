// src/theme/themeConfig.js
//
// Single source of truth for Captee's visual language.
// Every view/component should read its Tailwind classes from here instead
// of hard-coding color/spacing utilities. Rebranding the app later means
// editing this file only — no component code should need to change.

const themeConfig = {
  brand: {
    name: 'Captee',
    shortMark: 'CT',
    tagline: 'Stop looking for ordinary jobs.',
    subTagline: 'Build real things instead.',
  },

  colors: {
    // Surfaces
    bgPage: 'bg-neutral-950',
    bgHeader: 'bg-neutral-950/80',
    bgCard: 'bg-neutral-900/40',
    bgCardSoft: 'bg-neutral-900/20',
    bgCardStrong: 'bg-neutral-900/30',
    bgPanel: 'bg-neutral-900',
    bgInset: 'bg-neutral-950/60',
    bgPill: 'bg-neutral-950',

    // Borders
    border: 'border-neutral-900',
    borderStrong: 'border-neutral-800',
    borderHover: 'hover:border-neutral-800',

    // Text
    textPrimary: 'text-neutral-100',
    textWhite: 'text-white',
    textMuted: 'text-neutral-400',
    textFaint: 'text-neutral-500',
    textDim: 'text-neutral-600',

    // Accents
    accent: 'text-cyan-400',
    accentBg: 'bg-cyan-500',
    accentBgHover: 'hover:bg-cyan-400',
    accentSoftBg: 'bg-cyan-950/60',
    accentBorder: 'border-cyan-900/40',
    accentOn: 'text-neutral-950',

    secondary: 'text-indigo-400',
    secondarySoftBg: 'bg-indigo-950',
    secondaryBg: 'bg-indigo-500',

    success: 'text-emerald-400',
    warning: 'text-orange-500',

    gradientBrand: 'bg-gradient-to-tr from-cyan-500 to-indigo-500',
    gradientText: 'bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent',

    selection: 'selection:bg-cyan-500 selection:text-neutral-950',
  },

  radius: {
    sm: 'rounded-lg',
    md: 'rounded-xl',
    lg: 'rounded-2xl',
    full: 'rounded-full',
  },

  spacing: {
    pagePad: 'px-6 py-8',
    headerPad: 'px-6 py-4',
    card: 'p-6',
    cardCompact: 'p-4',
    cardTight: 'p-3',
  },

  font: {
    base: 'font-sans',
    heading: 'font-black',
    mono: 'font-mono',
  },

  // Structural measurements for the app shell. Kept separate from spacing
  // (which is for in-content padding) since these drive layout offsets that
  // multiple components need to agree on (sidebar + main content + mobile bar).
  layout: {
    contentMaxWidth: 'w-full',
    sidebarWidth: 'w-20',
    sidebarWidthLg: 'lg:w-24',
    sidebarOffset: 'md:pl-20 lg:pl-24',
    mobileNavHeight: 'h-16',
    mobileNavOffset: 'pb-16 md:pb-0',
    contentMaxWidth: 'max-w-5xl',
    topBarHeight: 'h-16',
  },

  // Semantic states for navigation items specifically, so SidebarNav (and
  // any future nav surface) never hard-codes an "active" look inline.
  nav: {
    itemText: 'text-neutral-500',
    itemHoverText: 'group-hover:text-neutral-200',
    itemActiveText: 'text-cyan-400',
    itemActiveBg: 'bg-neutral-800/70',
    itemHoverBg: 'hover:bg-neutral-900/60',
    indicatorBg: 'bg-cyan-500',
    itemRadius: 'rounded-xl',
  },

  transition: 'transition duration-150',
};

export default themeConfig;
