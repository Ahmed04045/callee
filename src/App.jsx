// src/App.jsx

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
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

import { featuredEvents, allRecruitment, systemUpdates, localNews } from './data/mockData';

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
  const { status } = useAuth();
  
  const location = useLocation();
  const navigate = useNavigate();

  const openAuthModal = () => setAuthModalOpen(true);
  const closeAuthModal = () => setAuthModalOpen(false);

  // Derive which item is active based on the actual browser URL path
  const currentItem = NAV_ITEMS.find((item) => item.path === location.pathname) || NAV_ITEMS[0];
  const activeLabel = currentItem.label;

  const handleTabChange = (tabId) => {
    const targetItem = NAV_ITEMS.find((item) => item.id === tabId);
    if (targetItem) {
      logUserAction('NAVIGATE_TAB', { from: currentItem.id, to: tabId });
      navigate(targetItem.path);
    }
  };

  return (
    <div className={`min-h-screen ${colors.bgPage} ${colors.textPrimary} ${font.base} ${colors.selection}`}>
      <SidebarNav brandMark={<BrandMark />} />

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

          {status !== 'authenticated' && (
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

        <main className={`flex-1 w-full ${layout.contentMaxWidth} mx-auto px-6 py-8`}>
          <Routes>
            <Route path="/" element={<MainFeedView events={featuredEvents} gigs={allRecruitment} onNavigate={handleTabChange} />} />
            <Route path="/recruit" element={<RecruitView gigs={allRecruitment} />} />
            <Route path="/discover" element={<DiscoverView events={featuredEvents} />} />
            <Route path="/updates" element={<AnnouncementsView systemUpdates={systemUpdates} localNews={localNews} />} />
            <Route path="/profile" element={<ProfileView onOpenAuthModal={openAuthModal} />} />
          </Routes>
        </main>
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppShell />
      </Router>
    </AuthProvider>
  );
}