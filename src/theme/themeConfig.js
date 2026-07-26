// src/theme/themeConfig.js
//
// Single source of truth for Povolum's visual language.
// Every view/component reads its Tailwind classes from here instead of
// hard-coding color/spacing utilities. Rebranding later means editing
// this file only.
//
// Material 3 "Deep Purple" DARK scheme is the default (same purple brand
// seed as before — #6750A4 family — flipped to M3's dark-mode roles, true
// black page background per spec). Token NAMES are unchanged from earlier
// iterations (e.g. `textWhite`) even though the values aren't literally
// white — components reference these names, not their meaning, so
// repointing values here (or in tailwind.config.js, where the actual hex
// values live) is what makes the single-file reskin work. A future light
// mode toggle would mean adding a second palette and switching which one
// tailwind.config.js points `md3-*` at — not touching this file or any
// component.

const themeConfig = {
  brand: {
    name: 'Povolum',
    shortMark: 'PV',
    tagline: 'Stop looking for ordinary jobs.',
    subTagline: 'Build real things instead.',
  },

  colors: {
    // Surfaces
    bgPage: 'bg-md3-surface',
    bgHeader: 'bg-md3-surfaceContainerLow/90',
    bgCard: 'bg-md3-surfaceContainer',
    bgCardSoft: 'bg-md3-surfaceContainerLow',
    bgCardStrong: 'bg-md3-surfaceContainer',
    bgPanel: 'bg-md3-surfaceContainerLow',
    bgInset: 'bg-md3-surfaceContainerHigh',
    bgPill: 'bg-md3-surfaceContainerHighest',
    scrim: 'bg-md3-scrim/60',

    // Borders
    border: 'border-md3-outlineVariant',
    borderStrong: 'border-md3-outline',
    borderHover: 'hover:border-md3-outline',

    // Text
    textPrimary: 'text-md3-onSurface',
    textWhite: 'text-md3-onSurface',
    textMuted: 'text-md3-onSurfaceVariant',
    textFaint: 'text-md3-onSurfaceVariant/80',
    textDim: 'text-md3-onSurfaceVariant/60',
    // Pre-composed hover variants — NEVER build a hover: class by
    // interpolating a token into a template literal (e.g. `hover:${colors.x}`).
    // Tailwind's scanner extracts literal class strings from source text; a
    // string built at runtime via interpolation never appears as a literal
    // substring anywhere, so Tailwind silently never generates the CSS for
    // it and the hover state just does nothing. Always store the complete
    // "hover:whatever" string as its own token instead, like these.
    textHoverStrong: 'hover:text-md3-onSurface',
    textHoverAccent: 'hover:text-md3-primary',
    bgHoverInset: 'hover:bg-md3-surfaceContainerHigh',

    // Accents (primary role)
    accent: 'text-md3-primary',
    accentBg: 'bg-md3-primary',
    accentBgHover: 'hover:brightness-90',
    accentSoftBg: 'bg-md3-primaryContainer',
    accentBorder: 'border-md3-primary/20',
    accentOn: 'text-md3-onPrimary',

    // Secondary role
    secondary: 'text-md3-secondary',
    secondarySoftBg: 'bg-md3-secondaryContainer',
    secondaryBg: 'bg-md3-secondary',

    success: 'text-md3-success',
    error: 'text-md3-error',
    warning: 'text-amber-400',

    gradientBrand: 'bg-gradient-to-tr from-md3-primary to-md3-secondary',
    gradientText: 'bg-gradient-to-r from-md3-primary to-md3-secondary bg-clip-text text-transparent',

    selection: 'selection:bg-md3-primaryContainer selection:text-md3-onPrimaryContainer',
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
  },

  // Structural measurements for the app shell.
  layout: {
    sidebarWidth: 'w-16',
    sidebarWidthLg: '',
    sidebarOffset: 'md:pl-16',
    mobileNavHeight: 'h-14',
    mobileNavOffset: 'pb-14 md:pb-0',
    contentMaxWidth: 'w-full',
    topBarHeight: 'h-16',
  },

  // Semantic states for navigation items. Active indicator is a small pill
  // directly behind the icon (Google's own nav-bar/nav-rail pattern) rather
  // than a full-row highlight or an edge accent bar.
  nav: {
    itemText: 'text-md3-onSurfaceVariant',
    itemHoverText: 'group-hover:text-md3-onSurface',
    itemActiveText: 'text-md3-onSecondaryContainer',
    itemIndicatorBg: 'bg-md3-secondaryContainer',
    itemHoverBg: 'hover:bg-md3-surfaceContainerHigh/60',
    itemRadius: 'rounded-2xl',
  },

  transition: 'transition duration-150',
};

export default themeConfig;