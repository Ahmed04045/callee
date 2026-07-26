// src/App.jsx

import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

import themeConfig from './theme/themeConfig';
import { AuthProvider, useAuth } from './context/AuthContext';
import { useProfile } from './hooks/useProfile';
import { logUserAction } from './components/TelemetryLog';
import AuthModal from './components/AuthModal';
import CreatePostModal from './components/CreatePostModal';
import SidebarNav, { NAV_ITEMS } from './components/SidebarNav';
import Icon from './components/Icon';

import MainFeedView from './views/MainFeedView';
import RecruitView from './views/RecruitView';
import DiscoverView from './views/DiscoverView';
import AnnouncementsView from './views/AnnouncementsView';
import ProfileView from './views/ProfileView';
import SettingsView from './views/SettingsView';
import AdminView from './views/AdminView';
import AboutView from './views/AboutView';
import AccountView from './views/AccountView';
import ThemeView from './views/ThemeView';
import TermsView from './views/TermsView';
import PrivacyView from './views/PrivacyView';
import OnboardingAccountTypeView from './views/OnboardingAccountTypeView';
import GigDetailView from './views/GigDetailView';
import EventDetailView from './views/EventDetailView';

const ONBOARDING_PATH = '/onboarding/account-type';

// Conditional nav items — only added to the visible tab list when the
// condition holds (Profile: signed in. Admin: is an admin). Everything in
// base NAV_ITEMS (Feed/Recruit/Discover/Updates) is unconditional; Settings
// is unconditional too but lives here since, unlike the base four, it's
// not something every part of the app needs to import.
const PROFILE_NAV_ITEM = {
  id: 'profile',
  label: 'Profile',
  path: '/profile',
  iconType: 'material',
  iconSource: 'person',
};
const SETTINGS_NAV_ITEM = {
  id: 'settings',
  label: 'Settings',
  path: '/settings',
  iconType: 'material',
  iconSource: 'settings',
};
const ADMIN_NAV_ITEM = {
  id: 'admin',
  label: 'Admin',
  path: '/admin',
  iconType: 'material',
  iconSource: 'fact_check',
};

// Full-screen "detail" pages, reached by drilling into a Settings row (or,
// for About, a direct link) rather than being tabs themselves. The
// persistent nav/topbar hide on these — SubPageHeader's own back button is
// the only way to navigate while on one. Onboarding is included too for
// the same visual effect (no nav chrome) even though it's a different kind
// of full-screen page — a forced interstitial, not a drill-down detail.
const IMMERSIVE_PATHS = ['/account', '/theme', '/terms', '/privacy', '/about', ONBOARDING_PATH];

// One switch, keyed by nav item id, mapping each tab to its view. Combined
// with `path` on every nav item, this is the ONLY place that pairs a tab
// with anything — routes, highlighting, and navigation all derive from
// item.path, never a hardcoded string. Add a tab by adding one nav item
// constant + one case here.
function renderView(tabId, handlers) {
  switch (tabId) {
    case 'main':
      return <MainFeedView />;
    case 'recruit':
      return <RecruitView onOpenAuthModal={handlers.openAuthModal} />;
    case 'discover':
      return <DiscoverView />;
    case 'announcements':
      return <AnnouncementsView />;
    case 'profile':
      return <ProfileView />;
    case 'settings':
      return <SettingsView />;
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
  const [isCreatePostOpen, setCreatePostOpen] = useState(false);
  const { colors, layout, font } = themeConfig;
  const { status, isAdmin, isAdminLoading } = useAuth();
  const { profile, status: profileStatus } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthenticated = status === 'authenticated';
  const isImmersive = IMMERSIVE_PATHS.includes(location.pathname);

  const openAuthModal = (mode = 'signIn') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };
  const closeAuthModal = () => setAuthModalOpen(false);

  const navItems = useMemo(() => {
    const items = [...NAV_ITEMS];
    if (isAuthenticated) items.push(PROFILE_NAV_ITEM);
    items.push(SETTINGS_NAV_ITEM);
    if (isAdmin) items.push(ADMIN_NAV_ITEM);
    return items;
  }, [isAuthenticated, isAdmin]);

  // Prefix match (not exact) so a detail page like /theme still
  // highlights the Settings nav item — except the root path, which would
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

  // Bounce out of /admin if admin rights are lost mid-session, and out of
  // /profile if signed out mid-session. Both wait for their respective
  // check to actually finish first (isAdminLoading / status !== 'loading')
  // — bouncing an admin out of /admin during the brief window before the
  // is_admin() RPC resolves would be a false negative, not a real one.
  useEffect(() => {
    if (location.pathname === ADMIN_NAV_ITEM.path && !isAdminLoading && !isAdmin) {
      navigate(NAV_ITEMS[0].path, { replace: true });
    }
    if (location.pathname === PROFILE_NAV_ITEM.path && status !== 'loading' && !isAuthenticated) {
      navigate(NAV_ITEMS[0].path, { replace: true });
    }
    // Onboarding: force it once account_type is confirmed null, and bounce
    // away from it if account_type is already set (e.g. a direct revisit
    // to the URL after already completing it). Waits for profileStatus to
    // actually be 'ready' first — acting on a still-loading profile could
    // misfire in either direction.
    if (isAuthenticated && profileStatus === 'ready' && profile) {
      if (!profile.account_type && location.pathname !== ONBOARDING_PATH) {
        navigate(ONBOARDING_PATH, { replace: true });
      } else if (profile.account_type && location.pathname === ONBOARDING_PATH) {
        navigate(NAV_ITEMS[0].path, { replace: true });
      }
    }
  }, [
    location.pathname,
    isAdmin,
    isAdminLoading,
    status,
    isAuthenticated,
    profileStatus,
    profile,
    navigate,
  ]);

  const handlers = { navigateToTab, openAuthModal };

  return (
    <div className={`min-h-screen ${colors.bgPage} ${colors.textPrimary} ${font.base} ${colors.selection}`}>
      {!isImmersive && (
        <SidebarNav
          activeTab={activeTab}
          onNavigate={navigateToTab}
          brandMark={<BrandMark />}
          items={navItems}
        />
      )}

      <div
        className={`flex flex-col min-h-screen ${
          isImmersive ? '' : `${layout.sidebarOffset} ${layout.mobileNavOffset}`
        }`}
      >
        {!isImmersive && (
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
        )}

        <main
          className={`flex-1 ${layout.contentMaxWidth} min-w-0 overflow-x-hidden px-4 md:px-6 py-8`}
        >
          <Routes>
            {navItems.map((item) => (
              <Route key={item.id} path={item.path} element={renderView(item.id, handlers)} />
            ))}
            <Route path="/about" element={<AboutView />} />
            <Route path="/account" element={<AccountView />} />
            <Route path="/theme" element={<ThemeView />} />
            <Route path="/terms" element={<TermsView />} />
            <Route path="/privacy" element={<PrivacyView />} />
            <Route path={ONBOARDING_PATH} element={<OnboardingAccountTypeView />} />
            <Route path="/gigs/:id" element={<GigDetailView />} />
            <Route path="/events/:id" element={<EventDetailView />} />
            <Route path="*" element={<Navigate to={NAV_ITEMS[0].path} replace />} />
          </Routes>
        </main>
      </div>

      {isAuthenticated && !isImmersive && (
        <button
          onClick={() => {
            logUserAction('OPEN_CREATE_POST', {});
            setCreatePostOpen(true);
          }}
          aria-label="Create a post"
          className={`fixed bottom-20 md:bottom-6 right-6 z-30 w-14 h-14 flex items-center justify-center ${colors.accentBg} ${colors.accentOn} rounded-2xl shadow-lg ${colors.accentBgHover} transition`}
        >
          <Icon name="add" size={26} className="text-inherit" />
        </button>
      )}

      <AuthModal isOpen={isAuthModalOpen} initialMode={authModalMode} onClose={closeAuthModal} />
      <CreatePostModal isOpen={isCreatePostOpen} onClose={() => setCreatePostOpen(false)} />
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