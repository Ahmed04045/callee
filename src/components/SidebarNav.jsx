// src/components/SidebarNav.jsx

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Flame, Briefcase, Compass, Megaphone, User } from 'lucide-react';
import themeConfig from '../theme/themeConfig';

export const NAV_ITEMS = [
  { id: 'main', label: 'Feed', path: '/', iconType: 'svg', iconSource: Flame },
  { id: 'recruit', label: 'Recruit', path: '/recruit', iconType: 'svg', iconSource: Briefcase },
  { id: 'discover', label: 'Discover', path: '/discover', iconType: 'svg', iconSource: Compass },
  { id: 'announcements', label: 'Updates', path: '/updates', iconType: 'svg', iconSource: Megaphone },
  { id: 'profile', label: 'Profile', path: '/profile', iconType: 'svg', iconSource: User },
];

function NavIcon({ item, active, size = 20 }) {
  const { nav } = themeConfig;
  const stateClass = active ? nav.itemActiveText : `${nav.itemText} ${nav.itemHoverText}`;

  if (item.iconType === 'image') {
    return (
      <img
        src={item.iconSource}
        alt=""
        aria-hidden="true"
        style={{ width: size, height: size }}
        className={`object-contain transition-opacity ${active ? 'opacity-100' : 'opacity-50 group-hover:opacity-90'}`}
      />
    );
  }

  const Icon = item.iconSource;
  return <Icon size={size} strokeWidth={active ? 2.25 : 1.75} className={`transition-colors ${stateClass}`} />;
}

function NavLinkItem({ item, isActive, orientation }) {
  const { nav, radius } = themeConfig;
  const isVertical = orientation === 'vertical';

  return (
    <Link
      to={item.path}
      aria-current={isActive ? 'page' : undefined}
      title={item.label}
      className={`group relative flex items-center transition-colors ${nav.itemRadius}
        ${isVertical ? 'w-full flex-col gap-1.5 py-3' : 'flex-col gap-1 px-3 py-2 flex-1'}
        ${isActive ? nav.itemActiveBg : `${nav.itemHoverBg}`}`}
    >
      {/* Premium active indicator */}
      {isActive && isVertical && (
        <span
          aria-hidden="true"
          className={`absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] ${radius.full} ${nav.indicatorBg}`}
        />
      )}
      {isActive && !isVertical && (
        <span
          aria-hidden="true"
          className={`absolute top-0 left-1/2 -translate-x-1/2 h-[3px] w-8 ${radius.full} ${nav.indicatorBg}`}
        />
      )}

      <NavIcon item={item} active={isActive} />
      <span
        className={`text-[10px] font-semibold tracking-wide transition-colors ${
          isActive ? nav.itemActiveText : `${nav.itemText} ${nav.itemHoverText}`
        }`}
      >
        {item.label}
      </span>
    </Link>
  );
}

export default function SidebarNav({ brandMark }) {
  const { colors, layout } = themeConfig;
  const location = useLocation();

  return (
    <>
      {/* DESKTOP: fixed left icon rail */}
      <aside
        className={`hidden md:flex flex-col fixed left-0 top-0 h-screen ${layout.sidebarWidth} ${layout.sidebarWidthLg} ${colors.bgPanel} border-r ${colors.border} z-40`}
      >
        {brandMark && (
          <div className={`flex items-center justify-center py-5 border-b ${colors.border}`}>
            {brandMark}
          </div>
        )}

        <nav className="flex-1 flex flex-col gap-1 px-2 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLinkItem
              key={item.id}
              item={item}
              isActive={location.pathname === item.path}
              orientation="vertical"
            />
          ))}
        </nav>
      </aside>

      {/* MOBILE: fixed bottom bar */}
      <nav
        className={`flex md:hidden fixed bottom-0 left-0 right-0 ${layout.mobileNavHeight} ${colors.bgPanel} border-t ${colors.border} z-40 pb-[env(safe-area-inset-bottom)]`}
      >
        {NAV_ITEMS.map((item) => (
          <NavLinkItem
            key={item.id}
            item={item}
            isActive={location.pathname === item.path}
            orientation="horizontal"
          />
        ))}
      </nav>
    </>
  );
}