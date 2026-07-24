// src/components/SidebarNav.jsx
//
// One config, two renders (desktop rail + mobile bottom bar, pure CSS
// breakpoints, no resize listeners). Icons are Google Material Symbols
// (fonts.google.com/icons) via the shared <Icon> component — iconType
// 'material' takes a symbol name string; iconType 'image' still works for
// a custom asset path if you ever want to drop one in for a specific item.

import React from 'react';
import themeConfig from '../theme/themeConfig';
import Icon from './Icon';

export const NAV_ITEMS = [
  { id: 'main', label: 'Feed', path: '/', iconType: 'material', iconSource: 'home' },
  { id: 'recruit', label: 'Recruit', path: '/recruit', iconType: 'material', iconSource: 'work' },
  { id: 'discover', label: 'Discover', path: '/discover', iconType: 'material', iconSource: 'explore' },
  { id: 'announcements', label: 'Updates', path: '/updates', iconType: 'material', iconSource: 'campaign' },
  { id: 'profile', label: 'Profile', path: '/profile', iconType: 'material', iconSource: 'person' },
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
      {/* Google-style pill indicator directly behind the icon, filled only
          when active */}
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

export default function SidebarNav({ activeTab, onNavigate, brandMark, items = NAV_ITEMS }) {
  const { colors, layout } = themeConfig;

  return (
    <>
      {/* DESKTOP: fixed left icon rail */}
      <aside
        className={`hidden md:flex flex-col fixed left-0 top-0 h-screen ${layout.sidebarWidth} ${layout.sidebarWidthLg} ${colors.bgPanel} border-r ${colors.border} z-40`}
      >
        {brandMark && (
          <div className={`flex items-center justify-center py-4 border-b ${colors.border}`}>
            {brandMark}
          </div>
        )}

        <nav className="flex-1 flex flex-col gap-0.5 px-1.5 py-3">
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