// src/theme/themeConfig.js
//
// Single source of truth for Circosodal's visual language.
// Every view/component reads its Tailwind classes from here instead of
// hard-coding color/spacing utilities. Rebranding later means editing
// this file only.
//
// Colours are theme-driven: tailwind.config.js maps every `md3-*` name to a
// CSS variable, and src/index.css defines the four palettes (electric,
// ultraviolet, acid, paper). Components only ever use the class names below,
// so re-skinning never touches them. Pixel look: near-square radii, notched
// framed cards (`px-box`), pixel display font on headings, electric glow on
// primary actions.

const themeConfig = {
  brand: {
    name: 'Circosodal',
    shortMark: 'C',
    tagline: 'Find your people.',
    subTagline: 'Play the real world.',
    // Shown on the About page when set; leave empty until you have a real address.
    contactEmail: '',
    // Shown on the About page when set, e.g. 'NoSuits Labs'.
    builtBy: '',
  },

  colors: {
    // Surfaces
    bgPage: 'bg-md3-surface',
    bgHeader: 'bg-md3-surfaceContainerLow/90',
    bgCard: 'bg-md3-surfaceContainer px-box',
    bgCardSoft: 'bg-md3-surfaceContainerLow px-box',
    bgCardStrong: 'bg-md3-surfaceContainer px-box',
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
    accentBg: 'bg-md3-primary shadow-glow-sm',
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
    // Driven by --r-* in index.css: rounded in the plain style, square in the pixel style.
    sm: 'rounded-[var(--r-sm)]',
    md: 'rounded-[var(--r-md)]',
    lg: 'rounded-[var(--r-lg)]',
    full: 'rounded-[var(--r-full)]',
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
    heading: 'font-display font-bold',
  },

  // Structural measurements for the app shell.
  layout: {
    sidebarWidth: 'w-[76px]',
    sidebarWidthLg: '',
    sidebarOffset: 'md:ps-[76px]',
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
    itemActiveText: 'text-md3-onPrimaryContainer',
    itemIndicatorBg: 'bg-md3-primaryContainer',
    itemHoverBg: 'hover:bg-md3-surfaceContainerHigh/60',
    itemRadius: 'rounded-[var(--r-md)]',
  },

  transition: 'transition duration-150',
};

export default themeConfig;