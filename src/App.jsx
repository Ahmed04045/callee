// src/App.jsx

import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';

import themeConfig from './theme/themeConfig';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ProfileProvider, useProfile } from './context/ProfileContext';
import { logUserAction } from './components/TelemetryLog';
import AuthModal from './components/AuthModal';
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
import CreateView from './views/CreateView';

const ONBOARDING_PATH = '/onboarding/account-type';

// Rail items (Feed/Recruit/Discover, from SidebarNav) plus Create make up
// the primary nav — rendered as the desktop left rail / mobile bottom bar.
// Everything else (Updates, Profile, Settings, Admin) lives in the header's
// icon cluster or is unlisted entirely, and gets its own explicit <Route>
// below instead of coming from this array. Create is a real page (was a
// modal — that had real perf cost, see CreateView.jsx), so it needs a real
// path like everything else in this array now.
const CREATE_NAV_ITEM = {
  id: 'create',
  label: 'Create',
  path: '/create',
  iconType: 'material',
  iconSource: 'add_circle',
};

// Header cluster + settings-rail item + admin. Admin is deliberately absent
// from every list that drives visible nav — reachable only by typing
// /admin directly. The real gate is still is_admin() in Postgres either
// way; not listing it anywhere is just so it isn't an obvious thing to
// stumble onto, not a security boundary by itself.
const ANNOUNCEMENTS_NAV_ITEM = {
  id: 'announcements',
  label: 'Updates',
  path: '/updates',
  iconType: 'material',
  iconSource: 'campaign',
};
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
const ADMIN_PATH = '/admin';

// Full-screen "detail" pages — persistent nav/topbar hide on these,
// SubPageHeader's own back button is the only way to navigate. Onboarding
// is included for the same visual effect even though it's a different
// kind of full-screen page (a forced interstitial, not a drill-down).
const IMMERSIVE_PATHS = ['/account', '/theme', '/terms', '/privacy', '/about', ONBOARDING_PATH];

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
    case 'create':
      return <CreateView />;
    case 'admin':
      return <AdminView />;
    default:
      return null;
  }
}

// Small header-cluster icon button (Updates/Profile/Settings-on-mobile) —
// simpler than a full NavButton since it doesn't need the label/pill
// treatment, just the icon + active state.
function HeaderIconButton({ item, isActive, onClick, className = '' }) {
  const { colors } = themeConfig;
  return (
    <button
      onClick={onClick}
      title={item.label}
      aria-current={isActive ? 'page' : undefined}
      className={`p-2 rounded-full transition-colors ${
        isActive ? colors.accentSoftBg : colors.bgHoverInset
      } ${className}`}
    >
      <Icon name={item.iconSource} size={20} active={isActive} />
    </button>
  );
}

function AppShell() {
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('signIn');
  const { colors, layout, font } = themeConfig;
  const { status, isAdmin, isAdminLoading } = useAuth();
  const { profile, status: profileStatus, saveProfile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthenticated = status === 'authenticated';
  const isImmersive = IMMERSIVE_PATHS.includes(location.pathname);

  const openAuthModal = (mode = 'signIn') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };
  const closeAuthModal = () => setAuthModalOpen(false);

  // Rail items: what's actually rendered in SidebarNav (and what becomes
  // routes via .map() below).
  const railItems = useMemo(() => {
    const items = [...NAV_ITEMS];
    if (isAuthenticated) items.push(CREATE_NAV_ITEM);
    return items;
  }, [isAuthenticated]);

  // Superset used only for active-page lookup (page title, icon
  // highlighting) — includes everything reachable, not just what's in the
  // rail, so e.g. being on /profile still highlights the Profile icon.
  const lookupItems = useMemo(
    () => [
      ...railItems,
      ANNOUNCEMENTS_NAV_ITEM,
      ...(isAuthenticated ? [PROFILE_NAV_ITEM] : []),
      SETTINGS_NAV_ITEM,
    ],
    [railItems, isAuthenticated]
  );

  const activeItem = lookupItems.find((item) =>
    item.path === '/' ? location.pathname === '/' : item.path && location.pathname.startsWith(item.path)
  );
  const activeTab = activeItem?.id ?? 'main';
  const activeLabel = activeItem?.label ?? '';

  const navigateToTab = (tabId) => {
    const target = lookupItems.find((item) => item.id === tabId);
    if (!target) return;
    logUserAction('NAVIGATE_TAB', { from: activeTab, to: tabId });
    navigate(target.path);
  };

  useEffect(() => {
    // Admin: no visible nav entry, but still a real, still-gated route —
    // bounce non-admins away, waiting for the is_admin() check to actually
    // resolve first so a real admin isn't bounced during that brief window.
    if (location.pathname === ADMIN_PATH && !isAdminLoading && !isAdmin) {
      navigate(NAV_ITEMS[0].path, { replace: true });
    }
    if (location.pathname === PROFILE_NAV_ITEM.path && status !== 'loading' && !isAuthenticated) {
      navigate(NAV_ITEMS[0].path, { replace: true });
    }

    if (isAuthenticated && profileStatus === 'ready' && profile) {
      if (!profile.account_type) {
        // Signing up via "or sign up as a business" passes ?accountType=
        // through the email-confirmation redirect (see AuthModal). If it's
        // here, use it silently instead of showing the onboarding
        // interstitial at all — that screen is a fallback for when this
        // hint is missing, not the primary path anymore.
        const hinted = new URLSearchParams(location.search).get('accountType');
        if (hinted === 'personal' || hinted === 'business') {
          saveProfile({ account_type: hinted }).then(({ error }) => {
            if (!error) navigate(NAV_ITEMS[0].path, { replace: true });
          });
        } else if (location.pathname !== ONBOARDING_PATH) {
          navigate(ONBOARDING_PATH, { replace: true });
        }
      } else if (location.pathname === ONBOARDING_PATH) {
        navigate(NAV_ITEMS[0].path, { replace: true });
      }
    }
  }, [
    location.pathname,
    location.search,
    isAdmin,
    isAdminLoading,
    status,
    isAuthenticated,
    profileStatus,
    profile,
    saveProfile,
    navigate,
  ]);

  const handlers = { navigateToTab, openAuthModal };

  return (
    <div className={`min-h-screen ${colors.bgPage} ${colors.textPrimary} ${font.base} ${colors.selection}`}>
      {!isImmersive && (
        <SidebarNav
          activeTab={activeTab}
          onNavigate={navigateToTab}
          items={railItems}
          bottomItem={SETTINGS_NAV_ITEM}
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
              <span className={`${font.heading} text-base tracking-tight ${colors.textWhite}`}>
                {themeConfig.brand.name}
              </span>
            </div>
            <h2 className={`hidden md:block text-sm font-semibold ${colors.textMuted} tracking-wide uppercase`}>
              {activeLabel}
            </h2>

            <div className="flex items-center gap-1.5">
              <HeaderIconButton
                item={ANNOUNCEMENTS_NAV_ITEM}
                isActive={activeTab === 'announcements'}
                onClick={() => navigateToTab('announcements')}
              />
              {isAuthenticated && (
                <HeaderIconButton
                  item={PROFILE_NAV_ITEM}
                  isActive={activeTab === 'profile'}
                  onClick={() => navigateToTab('profile')}
                />
              )}
              {/* Settings is pinned to the bottom of the desktop rail —
                  only shown here on mobile, which has no rail to pin it to. */}
              <HeaderIconButton
                item={SETTINGS_NAV_ITEM}
                isActive={activeTab === 'settings'}
                onClick={() => navigateToTab('settings')}
                className="md:hidden"
              />

              {status === 'unauthenticated' && (
                <button
                  onClick={() => {
                    logUserAction('OPEN_AUTH_MODAL', { source: 'topbar' });
                    openAuthModal();
                  }}
                  className={`flex items-center gap-1.5 text-xs font-bold ${colors.accentOn} ${colors.accentBg} ${colors.accentBgHover} rounded-lg px-3 py-2 transition ml-1`}
                >
                  <Icon name="login" size={14} className="text-inherit" /> Sign in
                </button>
              )}
            </div>
          </header>
        )}

        <main
          className={`flex-1 ${layout.contentMaxWidth} min-w-0 overflow-x-hidden px-4 md:px-6 py-8`}
        >
          <Routes>
            {railItems
              .filter((item) => item.path)
              .map((item) => (
                <Route key={item.id} path={item.path} element={renderView(item.id, handlers)} />
              ))}
            <Route path={ANNOUNCEMENTS_NAV_ITEM.path} element={renderView('announcements', handlers)} />
            <Route path={PROFILE_NAV_ITEM.path} element={renderView('profile', handlers)} />
            <Route path={SETTINGS_NAV_ITEM.path} element={renderView('settings', handlers)} />
            <Route path={ADMIN_PATH} element={renderView('admin', handlers)} />
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

      <AuthModal isOpen={isAuthModalOpen} initialMode={authModalMode} onClose={closeAuthModal} />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ProfileProvider>
          <AppShell />
        </ProfileProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}