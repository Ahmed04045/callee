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
import Logo from './components/Logo';
import ThemeMenu from './components/ThemeMenu';
import NotificationBell from './components/NotificationBell';
import { NotificationsProvider } from './context/NotificationsContext';
import LandingView from './views/LandingView';
import ActivityView from './views/ActivityView';
import TicketsView from './views/TicketsView';
import TicketCheckView from './views/TicketCheckView';
import EventManageView from './views/EventManageView';
import EventScanView from './views/EventScanView';
import ApplicantsView from './views/ApplicantsView';
import AdminReports from './views/admin/AdminReports';
import { PixelAvatar } from './components/Pixel';

import MainFeedView from './views/MainFeedView';
import RecruitView from './views/RecruitView';
import DiscoverView from './views/DiscoverView';
import AnnouncementsView from './views/AnnouncementsView';
import ProfileView from './views/ProfileView';
import SettingsView from './views/SettingsView';
import AdminLayout from './components/AdminLayout';
import AdminOverview from './views/admin/AdminOverview';
import AdminGigs from './views/admin/AdminGigs';
import AdminEvents from './views/admin/AdminEvents';
import AdminGroups from './views/admin/AdminGroups';
import AdminModerators from './views/admin/AdminModerators';
import AdminPeople from './views/admin/AdminPeople';
import AdminActivity from './views/admin/AdminActivity';
import AboutView from './views/AboutView';
import AccountView from './views/AccountView';
import ThemeView from './views/ThemeView';
import TermsView from './views/TermsView';
import PrivacyView from './views/PrivacyView';
import OnboardingView from './views/OnboardingView';
import PublicProfileView from './views/PublicProfileView';
import GigDetailView from './views/GigDetailView';
import EventDetailView from './views/EventDetailView';
import CreateView from './views/CreateView';
import MySubmissionsView from './views/MySubmissionsView';
import ClubsView from './views/ClubsView';
import ClubDetailView from './views/ClubDetailView';
import ClubModeratorView from './views/ClubModeratorView';
import ConnectDiscordView from './views/ConnectDiscordView';

const ONBOARDING_PATH = '/onboarding';

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
const ACTIVITY_NAV_ITEM = { id: 'activity', label: 'Activity', path: '/activity', iconType: 'material', iconSource: 'history' };
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

// Full-screen "detail" pages — persistent nav/topbar hide on these,
// SubPageHeader's own back button is the only way to navigate. Onboarding
// is included for the same visual effect even though it's a different
// kind of full-screen page (a forced interstitial, not a drill-down).
const IMMERSIVE_PATHS = ['/account', '/theme', '/terms', '/privacy', '/about', '/my-submissions', '/connect-discord', ONBOARDING_PATH];
const isImmersivePath = (pathname) =>
  IMMERSIVE_PATHS.includes(pathname) ||
  pathname.startsWith('/clubs/') ||
  pathname.startsWith('/u/') ||
  pathname.startsWith('/ticket/') ||
  /^\/events\/[^/]+\/(manage|scan)$/.test(pathname) ||
  /^\/gigs\/[^/]+\/applicants$/.test(pathname) ||
  pathname.startsWith('/admin');

function renderView(tabId, handlers) {
  switch (tabId) {
    case 'main':
      // Signed-out visitors get the public landing page; signed-in users get their Home.
      if (handlers.status === 'loading') return null;
      return handlers.status === 'authenticated' ? <MainFeedView /> : <LandingView onOpenAuthModal={handlers.openAuthModal} />;
    case 'recruit':
      return <RecruitView onOpenAuthModal={handlers.openAuthModal} />;
    case 'discover':
      return <DiscoverView />;
    case 'clubs':
      return <ClubsView />;
    case 'announcements':
      return <AnnouncementsView />;
    case 'profile':
      return <ProfileView />;
    case 'settings':
      return <SettingsView />;
    case 'create':
      return <CreateView />;
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
  const { status } = useAuth();
  const { profile, status: profileStatus, saveProfile } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();

  const isAuthenticated = status === 'authenticated';
  // Detail pages, profiles and the admin area bring their own header/nav.
  const isLanding = location.pathname === '/' && status !== 'authenticated';
  const isImmersive = isImmersivePath(location.pathname) || isLanding;

  const openAuthModal = (mode = 'signIn') => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };
  const closeAuthModal = () => setAuthModalOpen(false);

  // Rail items: what's actually rendered in SidebarNav (and what becomes
  // routes via .map() below).
  const railItems = useMemo(() => {
    const items = [...NAV_ITEMS];
    // Create sits in the middle so it becomes the raised centre button on mobile.
    if (isAuthenticated) items.splice(2, 0, CREATE_NAV_ITEM);
    return items;
  }, [isAuthenticated]);

  // Superset used only for active-page lookup (page title, icon
  // highlighting) — includes everything reachable, not just what's in the
  // rail, so e.g. being on /profile still highlights the Profile icon.
  const lookupItems = useMemo(
    () => [
      ...railItems,
      ANNOUNCEMENTS_NAV_ITEM,
      ACTIVITY_NAV_ITEM,
      ...(isAuthenticated ? [{ ...PROFILE_NAV_ITEM, label: profile?.username ? `@${profile.username}` : PROFILE_NAV_ITEM.label }] : []),
      SETTINGS_NAV_ITEM,
    ],
    [railItems, isAuthenticated, profile?.username]
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
    // Admin area: no visible nav entry, and no redirect either — AdminLayout shows
    // an "access required" screen (with a diagnostic) for non-admins. The real
    // gate is is_admin() in Postgres either way.
    if (location.pathname === PROFILE_NAV_ITEM.path && status !== 'loading' && !isAuthenticated) {
      navigate(NAV_ITEMS[0].path, { replace: true });
    }

    if (isAuthenticated && profileStatus === 'ready' && profile) {
      // Signing up via "or sign up as a business" passes ?accountType=
      // through the email-confirmation redirect (see AuthModal); apply it
      // silently so the onboarding step for account type is pre-answered.
      const hinted = new URLSearchParams(location.search).get('accountType');
      if (!profile.account_type && (hinted === 'personal' || hinted === 'business')) {
        saveProfile({ account_type: hinted });
        return;
      }
      // Account setup (type, name, username, university) is required once.
      const needsSetup = !profile.account_type || !profile.username;
      if (needsSetup && location.pathname !== ONBOARDING_PATH && !location.pathname.startsWith('/u/')) {
        navigate(ONBOARDING_PATH, { replace: true });
      } else if (!needsSetup && location.pathname === ONBOARDING_PATH) {
        navigate(NAV_ITEMS[0].path, { replace: true });
      }
    }
  }, [
    location.pathname,
    location.search,
    status,
    isAuthenticated,
    profileStatus,
    profile,
    saveProfile,
    navigate,
  ]);

  const handlers = { navigateToTab, openAuthModal, status };

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
              <Logo size={26} />
            </div>
            <h2 className={`hidden md:block text-sm font-semibold ${colors.textMuted} tracking-wide uppercase`}>
              {activeLabel}
            </h2>

            <div className="flex items-center gap-1.5">
              <ThemeMenu />
              <HeaderIconButton
                item={ANNOUNCEMENTS_NAV_ITEM}
                isActive={activeTab === 'announcements'}
                onClick={() => navigateToTab('announcements')}
              />
              {isAuthenticated && <NotificationBell />}
              {isAuthenticated && (
                <button
                  onClick={() => navigateToTab('profile')}
                  title="Your profile"
                  aria-current={activeTab === 'profile' ? 'page' : undefined}
                  className={`flex items-center gap-2 pl-1 pr-3 py-1 rounded-full transition-colors ${
                    activeTab === 'profile' ? colors.accentSoftBg : colors.bgHoverInset
                  }`}
                >
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-7 h-7 rounded-[var(--r-sm)] object-cover" />
                  ) : (
                    <PixelAvatar seed={profile?.username || profile?.user_id || 'me'} size={28} />
                  )}
                  <span className={`text-xs font-semibold ${colors.textWhite} max-w-[110px] truncate`}>
                    {profile?.username ? `@${profile.username}` : 'Profile'}
                  </span>
                </button>
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
          className={`flex-1 ${layout.contentMaxWidth} min-w-0 overflow-x-hidden ${isLanding ? '' : 'px-4 md:px-6 py-8'}`}
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
            <Route path="/u/:username" element={<PublicProfileView onOpenAuthModal={openAuthModal} />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminOverview />} />
              <Route path="gigs" element={<AdminGigs />} />
              <Route path="events" element={<AdminEvents />} />
              <Route path="groups" element={<AdminGroups />} />
              <Route path="moderators" element={<AdminModerators />} />
              <Route path="people" element={<AdminPeople />} />
              <Route path="reports" element={<AdminReports />} />
              <Route path="activity" element={<AdminActivity />} />
            </Route>
            <Route path="/clubs/moderator" element={<ClubModeratorView />} />
            <Route path="/clubs/:clubId" element={<ClubDetailView onOpenAuthModal={openAuthModal} />} />
            <Route path="/connect-discord" element={<ConnectDiscordView />} />
            <Route path="/explore" element={<MainFeedView />} />
            <Route path="/activity" element={<ActivityView onOpenAuthModal={openAuthModal} />} />
            <Route path="/about" element={<AboutView />} />
            <Route path="/account" element={<AccountView />} />
            <Route path="/my-submissions" element={<MySubmissionsView />} />
            <Route path="/theme" element={<ThemeView />} />
            <Route path="/terms" element={<TermsView />} />
            <Route path="/privacy" element={<PrivacyView />} />
            <Route path={ONBOARDING_PATH} element={<OnboardingView />} />
            <Route path="/onboarding/account-type" element={<Navigate to={ONBOARDING_PATH} replace />} />
            <Route path="/gigs/:id" element={<GigDetailView onOpenAuthModal={openAuthModal} />} />
            <Route path="/gigs/:id/applicants" element={<ApplicantsView />} />
            <Route path="/events/:id" element={<EventDetailView onOpenAuthModal={openAuthModal} />} />
            <Route path="/events/:id/manage" element={<EventManageView />} />
            <Route path="/events/:id/scan" element={<EventScanView />} />
            <Route path="/tickets" element={<TicketsView onOpenAuthModal={openAuthModal} />} />
            <Route path="/ticket/:code" element={<TicketCheckView onOpenAuthModal={openAuthModal} />} />
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
          <NotificationsProvider>
            <AppShell />
          </NotificationsProvider>
        </ProfileProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}