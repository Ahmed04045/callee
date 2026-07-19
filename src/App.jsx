// src/App.jsx
import { BrowserRouter } from 'react-router-dom';

import React, { useState } from 'react';
import { LogIn } from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState('main');
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const { colors, layout, font } = themeConfig;
  const { status } = useAuth();

  const handleTabChange = (tabId) => {
    logUserAction('NAVIGATE_TAB', { from: activeTab, to: tabId });
    setActiveTab(tabId);
  };

  const openAuthModal = () => setAuthModalOpen(true);
  const closeAuthModal = () => setAuthModalOpen(false);

  const activeLabel = NAV_ITEMS.find((item) => item.id === activeTab)?.label ?? '';

  return (
    <div className={`min-h-screen ${colors.bgPage} ${colors.textPrimary} ${font.base} ${colors.selection}`}>
      <SidebarNav
        activeTab={activeTab}
        onNavigate={handleTabChange}
        brandMark={<BrandMark />}
      />

      {/* Content column — offset by the fixed sidebar on desktop, padded
          above the fixed bottom bar on mobile. */}
      <div className={`flex flex-col min-h-screen ${layout.sidebarOffset} ${layout.mobileNavOffset}`}>
        <header
          className={`sticky top-0 z-30 flex items-center justify-between border-b ${colors.border} ${colors.bgHeader} backdrop-blur ${layout.topBarHeight} px-6`}
        >
          {/* Brand shows here on mobile only (sidebar carries it on desktop) */}
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
          {activeTab === 'main' && <MainFeedView onNavigate={handleTabChange} />}
          {activeTab === 'recruit' && <RecruitView onOpenAuthModal={openAuthModal} />}
          {activeTab === 'discover' && <DiscoverView />}
          {activeTab === 'announcements' && <AnnouncementsView />}
          {activeTab === 'profile' && <ProfileView onOpenAuthModal={openAuthModal} />}
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