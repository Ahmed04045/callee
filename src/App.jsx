// src/App.jsx

import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

import themeConfig from './theme/themeConfig';
import { AuthProvider, useAuth } from './context/AuthContext';
import { logUserAction } from './components/TelemetryLog';
import AuthModal from './components/AuthModal';
import SidebarNav, { NAV_ITEMS } from './components/SidebarNav';
import Icon from './components/Icon';

import MainFeedView from './views/MainFeedView';
import RecruitView from './views/RecruitView';
import DiscoverView from './views/DiscoverView';
import AnnouncementsView from './views/AnnouncementsView';
import ProfileView from './views/ProfileView';
import AdminView from './views/AdminView';
import AboutView from './views/AboutView';
import SettingsView from './views/SettingsView';
import ThemeView from './views/ThemeView';
import TermsView from './views/TermsView';
import PrivacyView from './views/PrivacyView';
import EditProfileView from './views/EditProfileView';

const ADMIN_NAV_ITEM = {
  id: 'admin',
  label: 'Admin',
  path: '/admin',
  iconType: 'material',
  iconSource: 'fact_check',
};

// One switch, keyed by nav item id, mapping each tab to its view. Combined
// with `path` on every nav item (NAV_ITEMS / ADMIN_NAV_ITEM), this is the
// ONLY place that pairs a tab with anything — routes, highlighting, and
// navigation below all derive from item.path, never a hardcoded string.
// Add a tab by adding one NAV_ITEMS entry + one case here.
function renderView(tabId, handlers) {
  switch (tabId) {
    case 'main':
      return <MainFeedView onNavigate={handlers.navigateToTab} />;
    case 'recruit':
      return <RecruitView onOpenAuthModal={handlers.openAuthModal} />;
    case 'discover':
      return <DiscoverView />;
    case 'announcements':
      return <AnnouncementsView />;
    case 'profile':
      return <ProfileView onOpenAuthModal={handlers.openAuthModal} />;
    case 'admin':
      return <AdminView />;
    default:
      return null;
  }
}

function BrandMark({ size = 'sm' }) {
  const { colors, font, brand } = themeConfig;
  const boxSize = size === 'sm' ? 'w-9 h-9 text-xs' : 'w-10 h-10 text-sm';
  return (
    <div className="flex items-center gap-2.5">
      <div
        className={`${boxSize} ${colors.gradientBrand} rounded-xl flex items-center justify-center ${colors.accentOn} ${font.heading} tracking-wider shrink-0`}
      >
        {brand.shortMark}
      </div>
      <span className={`${font.heading} text-base tracking-tight ${colors.textWhite} md:hidden`}>
        {brand.name}
      </span>
    </div>
  );
}

function AppShell() {
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('signIn');
  const { colors, layout, font } = themeConfig;
  const { status, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const openAuthModal = (mode = 'signIn') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };
  const closeAuthModal = () => setAuthModalOpen(false);

  const navItems = useMemo(
    () => (isAdmin ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS),
    [isAdmin]
  );

  // Prefix match (not exact) so a sub-page like /profile/settings still
  // highlights the Profile nav item — except the root path, which would
  // otherwise "match" every route as a prefix.
  const activeItem = navItems.find((item) =>
    item.path === '/' ? location.pathname === '/' : location.pathname.startsWith(item.path)
  );
  const activeTab = activeItem?.id ?? 'main';
  const activeLabel = activeItem?.label ?? '';

  const navigateToTab = (tabId) => {
    const target = navItems.find((item) => item.id === tabId);
    if (!target) return;
    logUserAction('NAVIGATE_TAB', { from: activeTab, to: tabId });
    navigate(target.path);
  };

  // Bounce out of /admin if admin rights are lost mid-session (sign-out,
  // different account). The page itself would refuse data regardless —
  // this is just so the UI doesn't sit on a dead end.
  useEffect(() => {
    if (location.pathname === ADMIN_NAV_ITEM.path && !isAdmin) {
      navigate(NAV_ITEMS[0].path, { replace: true });
    }
  }, [location.pathname, isAdmin, navigate]);

  const handlers = { navigateToTab, openAuthModal };

  return (
    <div className={`min-h-screen ${colors.bgPage} ${colors.textPrimary} ${font.base} ${colors.selection}`}>
      <SidebarNav
        activeTab={activeTab}
        onNavigate={navigateToTab}
        brandMark={<BrandMark />}
        items={navItems}
      />

      <div className={`flex flex-col min-h-screen ${layout.sidebarOffset} ${layout.mobileNavOffset}`}>
        <header
          className={`sticky top-0 z-30 flex items-center justify-between border-b ${colors.border} ${colors.bgHeader} backdrop-blur ${layout.topBarHeight} px-6`}
        >
          <div className="md:hidden">
            <BrandMark />
          </div>
          <h2 className={`hidden md:block text-sm font-semibold ${colors.textMuted} tracking-wide uppercase`}>
            {activeLabel}
          </h2>

          {status === 'unauthenticated' && (
            <button
              onClick={() => {
                logUserAction('OPEN_AUTH_MODAL', { source: 'topbar' });
                openAuthModal();
              }}
              className={`flex items-center gap-1.5 text-xs font-bold ${colors.accentOn} ${colors.accentBg} ${colors.accentBgHover} rounded-lg px-3 py-2 transition`}
            >
              <Icon name="login" size={14} className="text-inherit" /> Sign in
            </button>
          )}
        </header>

        <main
          className={`flex-1 ${layout.contentMaxWidth} min-w-0 overflow-x-hidden px-4 md:px-6 py-8`}
        >
          <Routes>
            {navItems.map((item) => (
              <Route key={item.id} path={item.path} element={renderView(item.id, handlers)} />
            ))}
            <Route path="/about" element={<AboutView />} />
            <Route path="/profile/edit" element={<EditProfileView />} />
            <Route path="/profile/settings" element={<SettingsView />} />
            <Route path="/profile/theme" element={<ThemeView />} />
            <Route path="/profile/terms" element={<TermsView />} />
            <Route path="/profile/privacy" element={<PrivacyView />} />
            <Route path="*" element={<Navigate to={NAV_ITEMS[0].path} replace />} />
          </Routes>
        </main>
      </div>

      <AuthModal isOpen={isAuthModalOpen} initialMode={authModalMode} onClose={closeAuthModal} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </BrowserRouter>
  );
}