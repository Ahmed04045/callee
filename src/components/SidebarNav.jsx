// src/components/SidebarNav.jsx
//
// Primary navigation: a slim pixel-style icon rail on desktop, a bottom tab
// bar on mobile. Icons are static (no hover/animation); state is shown with
// a filled glyph, a tinted tile, and a 3px indicator bar. `bottomItem`
// (Settings) is pinned to the bottom of the desktop rail only.
//
// On mobile, the item with id 'create' is drawn as a raised, glowing tile in
// the middle of the bar (the main call to action).

import React from 'react';
import themeConfig from '../theme/themeConfig';
import Icon from './Icon';
import { LogoMark } from './Logo';
import { useT } from '../i18n';

export const NAV_ITEMS = [
  { id: 'main', label: 'Home', path: '/', iconType: 'material', iconSource: 'home' },
  { id: 'recruit', label: 'Recruit', path: '/recruit', iconType: 'material', iconSource: 'work' },
  { id: 'discover', label: 'Discover', path: '/discover', iconType: 'material', iconSource: 'explore' },
  { id: 'clubs', label: 'Clubs', path: '/clubs', iconType: 'material', iconSource: 'groups' },
];

function NavGlyph({ item, active, size = 22 }) {
  if (item.iconType === 'image') {
    return (
      <img
        src={item.iconSource}
        alt=""
        aria-hidden="true"
        style={{ width: size, height: size }}
        className={`object-contain px-crisp ${active ? 'opacity-100' : 'opacity-60'}`}
      />
    );
  }
  return <Icon name={item.iconSource} size={size} active={active} />;
}

function NavButton({ item, isActive, onSelect, orientation }) {
  const { t } = useT();
  const { nav, colors } = themeConfig;
  const isVertical = orientation === 'vertical';

  // Mobile "Create": raised glowing tile.
  if (!isVertical && item.id === 'create') {
    return (
      <button
        onClick={() => onSelect(item.id)}
        aria-current={isActive ? 'page' : undefined}
        title={t(item.label)}
        className="flex-1 flex flex-col items-center justify-start"
      >
        <span className={`-mt-5 w-12 h-12 flex items-center justify-center ${colors.accentBg} ${colors.accentOn} rounded-[var(--r-md)] border-2 border-md3-surface`}>
          <Icon name={item.iconSource} size={26} className="text-inherit" />
        </span>
        <span className={`text-[9px] font-mono font-bold uppercase tracking-wider mt-0.5 ${isActive ? colors.accent : nav.itemText}`}>{t(item.label)}</span>
      </button>
    );
  }

  return (
    <button
      onClick={() => onSelect(item.id)}
      aria-current={isActive ? 'page' : undefined}
      title={t(item.label)}
      className={`relative flex flex-col items-center gap-1 ${nav.itemRadius} ${nav.itemHoverBg} ${
        isVertical ? 'w-full py-2.5' : 'flex-1 py-1.5'
      } ${isActive ? 'bg-md3-primary/10' : ''}`}
    >
      {isActive && (
        <span
          className={`absolute bg-md3-primary ${isVertical ? 'start-0 top-2 bottom-2 w-[3px]' : 'top-0 start-3 end-3 h-[3px]'}`}
          aria-hidden="true"
        />
      )}
      <span className={isActive ? colors.accent : nav.itemText}>
        <NavGlyph item={item} active={isActive} size={22} />
      </span>
      <span className={`text-[9px] font-mono font-bold uppercase tracking-wider ${isActive ? colors.accent : nav.itemText}`}>{t(item.label)}</span>
    </button>
  );
}

export default function SidebarNav({ activeTab, onNavigate, items = NAV_ITEMS, bottomItem }) {
  const { t } = useT();
  const { colors, layout } = themeConfig;

  return (
    <>
      {/* DESKTOP: fixed left icon rail */}
      <aside
        className={`hidden md:flex flex-col fixed start-0 top-0 h-screen ${layout.sidebarWidth} ${colors.bgPanel} border-e ${colors.border} z-40`}
      >
        <button
          onClick={() => onNavigate(items[0]?.id ?? 'main')}
          aria-label={t('Circosodal home')}
          className="h-16 flex items-center justify-center border-b border-md3-outlineVariant"
        >
          <LogoMark size={30} />
        </button>

        <nav className="flex-1 flex flex-col gap-1 px-1.5 py-3">
          {items.map((item) => (
            <NavButton key={item.id} item={item} isActive={activeTab === item.id} onSelect={onNavigate} orientation="vertical" />
          ))}
        </nav>

        {bottomItem && (
          <div className="px-1.5 pb-4">
            <NavButton item={bottomItem} isActive={activeTab === bottomItem.id} onSelect={onNavigate} orientation="vertical" />
          </div>
        )}
      </aside>

      {/* MOBILE: fixed bottom bar */}
      <nav
        className={`flex md:hidden fixed bottom-0 start-0 end-0 ${layout.mobileNavHeight} ${colors.bgPanel} border-t ${colors.border} z-40 pb-[env(safe-area-inset-bottom)]`}
      >
        {items.map((item) => (
          <NavButton key={item.id} item={item} isActive={activeTab === item.id} onSelect={onNavigate} orientation="horizontal" />
        ))}
      </nav>
    </>
  );
}
