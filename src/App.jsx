// src/App.jsx

import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { LogIn, ClipboardCheck } from 'lucide-react';

import themeConfig from './theme/themeConfig';
import { AuthProvider, useAuth } from './context/AuthContext';
import { logUserAction } from './components/TelemetryLog';
import AuthModal from './components/AuthModal';
import SidebarNav, { NAV_ITEMS } from './components/SidebarNav';

import MainFeedView from './views/MainFeedView';
import RecruitView from './views/RecruitView';
import DiscoverView from './views/DiscoverView';
import AnnouncementsView from './views/AnnouncementsView';
import ProfileView from './views/ProfileView';
import AdminView from './views/AdminView';

const ADMIN_NAV_ITEM = {
  id: 'admin',
  label: 'Admin',
  path: '/admin',
  iconType: 'svg',
  iconSource: ClipboardCheck,
};

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
  const { colors, layout, font } = themeConfig;
  const { status, isAdmin } = useAuth();
  
  const navigate = useNavigate();
  const location = useLocation();

  // Map the current URL path back to the tab ID for SidebarNav highlight
  const currentTabPath = location.pathname;
  const activeTab = currentTabPath === '/admin' ? 'admin' 
    : currentTabPath === '/recruit' ? 'recruit'
    : currentTabPath === '/discover' ? 'discover'
    : currentTabPath === '/announcements' ? 'announcements'
    : currentTabPath === '/profile' ? 'profile'
    : 'main';

  const handleTabChange = (tabId) => {
    logUserAction('NAVIGATE_TAB', { from: activeTab, to: tabId });
    const targetPath = tabId === 'main' ? '/' : `/${tabId}`;
    navigate(targetPath);
  };

  const openAuthModal = () => setAuthModalOpen(true);
  const closeAuthModal = () => setAuthModalOpen(false);

  const navItems = useMemo(
    () => (isAdmin ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS),
    [isAdmin]
  );

  // Auto-redirect out of admin path if user loses admin rights or signs out
  useEffect(() => {
    if (location.pathname === '/admin' && !isAdmin) {
      navigate('/', { replace: true });
    }
  }, [location.pathname, isAdmin, navigate]);

  const activeLabel = navItems.find((item) => item.id === activeTab)?.label ?? '';

  return (
    <div className={`min-h-screen ${colors.bgPage} ${colors.textPrimary} ${font.base} ${colors.selection}`}>
      <SidebarNav
        activeTab={activeTab}
        onNavigate={handleTabChange}
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
              <LogIn size={14} /> Sign in
            </button>
          )}
        </header>

        <main
          className={`flex-1 ${layout.contentMaxWidth} min-w-0 overflow-x-hidden px-4 md:px-6 py-8`}
        >
          <Routes>
            <Route path="/" element={<MainFeedView onNavigate={handleTabChange} />} />
            <Route path="/recruit" element={<RecruitView onOpenAuthModal={openAuthModal} />} />
            <Route path="/discover" element={<DiscoverView />} />
            <Route path="/announcements" element={<AnnouncementsView />} />
            <Route path="/profile" element={<ProfileView onOpenAuthModal={openAuthModal} />} />
            <Route path="/admin" element={<AdminView />} />
          </Routes>
        </main>
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
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