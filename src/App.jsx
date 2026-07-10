// src/App.jsx

import React, { useState } from 'react';
import { Compass, Briefcase, Megaphone, User, Flame, LogIn } from 'lucide-react';

import themeConfig from './theme/themeConfig';
import { AuthProvider, useAuth } from './context/AuthContext';
import { logUserAction } from './components/TelemetryLog';
import AuthModal from './components/AuthModal';

import MainFeedView from './views/MainFeedView';
import RecruitView from './views/RecruitView';
import DiscoverView from './views/DiscoverView';
import AnnouncementsView from './views/AnnouncementsView';
import ProfileView from './views/ProfileView';

import { featuredEvents, allRecruitment, systemUpdates, localNews } from './data/mockData';

const TABS = [
  { id: 'main', label: 'Feed', icon: Flame },
  { id: 'recruit', label: 'Recruit', icon: Briefcase },
  { id: 'discover', label: 'Discover', icon: Compass },
  { id: 'announcements', label: 'Updates', icon: Megaphone },
  { id: 'profile', label: 'Profile', icon: User },
];

function AppShell() {
  const [activeTab, setActiveTab] = useState('main');
  const [isAuthModalOpen, setAuthModalOpen] = useState(false);
  const { colors, spacing, font, brand } = themeConfig;
  const { status } = useAuth();

  const handleTabChange = (tabId) => {
    logUserAction('NAVIGATE_TAB', { from: activeTab, to: tabId });
    setActiveTab(tabId);
  };

  const openAuthModal = () => setAuthModalOpen(true);
  const closeAuthModal = () => setAuthModalOpen(false);

  return (
    <div className={`min-h-screen ${colors.bgPage} ${colors.textPrimary} ${font.base} ${colors.selection}`}>
      {/* GLOBAL HEADER */}
      <header
        className={`border-b ${colors.border} ${colors.bgHeader} backdrop-blur sticky top-0 z-50 ${spacing.headerPad} flex justify-between items-center`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`${colors.gradientBrand} p-2 rounded-xl ${colors.accentOn} ${font.heading} text-xs tracking-wider`}
          >
            {brand.shortMark}
          </div>
          <h1 className={`${font.heading} text-lg tracking-tight ${colors.textWhite}`}>
            {brand.name.toUpperCase()}
          </h1>
        </div>

        <div className="flex items-center gap-3">
          <nav className={`flex ${colors.bgPanel} p-1 rounded-xl border ${colors.borderStrong} max-w-full overflow-x-auto`}>
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-150 ${
                    isActive ? `bg-neutral-800 ${colors.accent} shadow-md` : `${colors.textMuted} hover:text-neutral-200`
                  }`}
                >
                  <Icon size={15} />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              );
            })}
          </nav>

          {status !== 'authenticated' && (
            <button
              onClick={() => {
                logUserAction('OPEN_AUTH_MODAL', { source: 'header' });
                openAuthModal();
              }}
              className={`hidden sm:flex items-center gap-1.5 text-xs font-bold ${colors.accentOn} ${colors.accentBg} ${colors.accentBgHover} rounded-lg px-3 py-2 transition`}
            >
              <LogIn size={14} /> Sign in
            </button>
          )}
        </div>
      </header>

      {/* GLOBAL MAIN WORKSPACE */}
      <main className={`max-w-5xl mx-auto ${spacing.pagePad}`}>
        {activeTab === 'main' && (
          <MainFeedView events={featuredEvents} gigs={allRecruitment} onNavigate={handleTabChange} />
        )}
        {activeTab === 'recruit' && <RecruitView gigs={allRecruitment} />}
        {activeTab === 'discover' && <DiscoverView events={featuredEvents} />}
        {activeTab === 'announcements' && (
          <AnnouncementsView systemUpdates={systemUpdates} localNews={localNews} />
        )}
        {activeTab === 'profile' && <ProfileView onOpenAuthModal={openAuthModal} />}
      </main>

      <AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}
