// src/components/SidebarNav.jsx
//
// Base rail is just the primary content tabs now (Feed/Recruit/Discover) —
// Updates, Profile, and Settings moved out to the header's top-right
// cluster (desktop) / header + bottom bar split (mobile), and Admin was
// removed from visible nav entirely (see App.jsx). `bottomItem` renders
// pinned to the bottom of the desktop rail only — there's no equivalent
// "bottom-left" concept on the mobile bottom bar, so mobile just gets
// `items` with nothing pinned.

import React from 'react';
import themeConfig from '../theme/themeConfig';
import Icon from './Icon';

export const NAV_ITEMS = [
  { id: 'main', label: 'Feed', path: '/', iconType: 'material', iconSource: 'home' },
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
        className={`object-contain transition-opacity ${active ? 'opacity-100' : 'opacity-60 group-hover:opacity-90'}`}
      />
    );
  }
  return <Icon name={item.iconSource} size={size} active={active} />;
}

function NavButton({ item, isActive, onSelect, orientation }) {
  const { nav } = themeConfig;
  const isVertical = orientation === 'vertical';

  return (
    <button
      onClick={() => onSelect(item.id)}
      aria-current={isActive ? 'page' : undefined}
      title={item.label}
      className={`group relative flex items-center transition-colors ${nav.itemRadius}
        ${isVertical ? 'w-full flex-col gap-0.5 py-1.5' : 'flex-col gap-0.5 py-1 flex-1'}
        ${nav.itemHoverBg}`}
    >
      <span
        className={`flex items-center justify-center rounded-full transition-colors duration-200 ${
          isVertical ? 'w-11 h-8' : 'w-12 h-7'
        } ${isActive ? nav.itemIndicatorBg : 'bg-transparent'}`}
      >
        <NavGlyph item={item} active={isActive} size={22} />
      </span>

      <span
        className={`text-[9px] font-semibold tracking-wide transition-colors ${
          isActive ? nav.itemActiveText : `${nav.itemText} ${nav.itemHoverText}`
        }`}
      >
        {item.label}
      </span>
    </button>
  );
}

export default function SidebarNav({ activeTab, onNavigate, items = NAV_ITEMS, bottomItem }) {
  const { colors, layout } = themeConfig;

  return (
    <>
      {/* DESKTOP: fixed left icon rail */}
      <aside
        className={`hidden md:flex flex-col fixed left-0 top-0 h-screen ${layout.sidebarWidth} ${layout.sidebarWidthLg} ${colors.bgPanel} border-r ${colors.border} z-40`}
      >
        <nav className="flex-1 flex flex-col gap-0.5 px-1.5 py-4">
          {items.map((item) => (
            <NavButton
              key={item.id}
              item={item}
              isActive={activeTab === item.id}
              onSelect={onNavigate}
              orientation="vertical"
            />
          ))}
        </nav>

        {bottomItem && (
          <div className="px-1.5 pb-4">
            <NavButton
              item={bottomItem}
              isActive={activeTab === bottomItem.id}
              onSelect={onNavigate}
              orientation="vertical"
            />
          </div>
        )}
      </aside>

      {/* MOBILE: fixed bottom bar */}
      <nav
        className={`flex md:hidden fixed bottom-0 left-0 right-0 ${layout.mobileNavHeight} ${colors.bgPanel} border-t ${colors.border} z-40 pb-[env(safe-area-inset-bottom)]`}
      >
        {items.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            isActive={activeTab === item.id}
            onSelect={onNavigate}
            orientation="horizontal"
          />
        ))}
      </nav>
    </>
  );
}