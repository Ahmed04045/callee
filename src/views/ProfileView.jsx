// src/views/ProfileView.jsx

import React from 'react';
import { Settings, FileText, Shield, LogOut, LogIn } from 'lucide-react';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { logUserAction } from '../components/TelemetryLog';

export default function ProfileView({ onOpenAuthModal }) {
  const { colors, radius, font, brand } = themeConfig;
  const { status, user, signOut } = useAuth();
  const isAuthenticated = status === 'authenticated' && user;

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Account card */}
      <div className={`${colors.bgCard} border ${colors.border} ${radius.lg} p-6 text-center space-y-4`}>
        <div
          className={`w-20 h-20 ${colors.gradientBrand} ${radius.full} mx-auto flex items-center justify-center text-2xl ${font.heading} ${colors.accentOn}`}
        >
          {isAuthenticated ? user.name?.[0]?.toUpperCase() ?? 'U' : 'U'}
        </div>

        {isAuthenticated ? (
          <div>
            <h3 className={`text-lg font-bold ${colors.textWhite}`}>{user.name}</h3>
            <p className={`text-xs ${colors.textFaint} font-mono`}>
              Signed in via {user.provider}
            </p>
          </div>
        ) : (
          <div>
            <h3 className={`text-lg font-bold ${colors.textWhite}`}>Guest Workspace</h3>
            <p className={`text-xs ${colors.textFaint} font-mono`}>Not signed in</p>
          </div>
        )}

        <div className={`${colors.bgInset} border ${colors.border} p-3 ${radius.md} text-left text-xs ${colors.textMuted} space-y-1`}>
          <div>
            <span className={colors.textDim}>Status:</span> {isAuthenticated ? 'Active Account' : 'Basic Sandbox'}
          </div>
          <div>
            <span className={colors.textDim}>Region:</span> Qatar Local Node
          </div>
        </div>

        {isAuthenticated ? (
          <button
            onClick={() => {
              logUserAction('SIGN_OUT_CLICK', {});
              signOut();
            }}
            className={`w-full flex items-center justify-center gap-2 text-xs font-bold ${colors.textMuted} border ${colors.borderStrong} ${radius.sm} py-2 hover:text-white transition`}
          >
            <LogOut size={14} /> Sign out
          </button>
        ) : (
          <button
            onClick={() => {
              logUserAction('OPEN_AUTH_MODAL', { source: 'profile' });
              onOpenAuthModal?.();
            }}
            className={`w-full flex items-center justify-center gap-2 text-xs font-bold ${colors.accentOn} ${colors.accentBg} ${colors.accentBgHover} ${radius.sm} py-2 transition`}
          >
            <LogIn size={14} /> Sign in
          </button>
        )}
      </div>

      {/* Settings + legal */}
      <div className="md:col-span-2 space-y-6">
        <div className={`${colors.bgCardSoft} border ${colors.border} ${radius.lg} p-6 space-y-4`}>
          <h3
            className={`text-sm font-bold ${colors.textPrimary} uppercase tracking-wider flex items-center gap-2`}
          >
            <Settings size={14} /> Global App Settings
          </h3>
          <div className={`space-y-3 text-xs ${colors.textMuted}`}>
            <label
              className={`flex items-center justify-between p-3 ${colors.bgInset} ${radius.md} border ${colors.border}`}
            >
              <span>Enable push notifications for nearby events</span>
              <input type="checkbox" defaultChecked className="accent-cyan-500" />
            </label>
            <label
              className={`flex items-center justify-between p-3 ${colors.bgInset} ${radius.md} border ${colors.border}`}
            >
              <span>Visible in recruitment pools for startups</span>
              <input type="checkbox" defaultChecked className="accent-cyan-500" />
            </label>
          </div>
        </div>

        <div className={`${colors.bgCardSoft} border ${colors.border} ${radius.lg} p-6 space-y-4`}>
          <h3
            className={`text-sm font-bold ${colors.textPrimary} uppercase tracking-wider flex items-center gap-2`}
          >
            <FileText size={14} /> Legal Foundations
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div
              className={`p-4 ${colors.bgInset} border ${colors.border} ${radius.md} ${colors.borderHover} transition cursor-pointer`}
            >
              <div className={`flex items-center gap-2 ${colors.textWhite} font-bold text-xs`}>
                <Shield size={12} className={colors.accent} /> Terms of Service
              </div>
              <p className={`text-[11px] ${colors.textFaint} mt-1 leading-normal`}>
                Platform rules, safe-recruitment standards, and youth protection guidelines.
              </p>
            </div>
            <div
              className={`p-4 ${colors.bgInset} border ${colors.border} ${radius.md} ${colors.borderHover} transition cursor-pointer`}
            >
              <div className={`flex items-center gap-2 ${colors.textWhite} font-bold text-xs`}>
                <Shield size={12} className={colors.secondary} /> Privacy Policy
              </div>
              <p className={`text-[11px] ${colors.textFaint} mt-1 leading-normal`}>
                What {brand.name} collects, why, and how account and guardian data is handled.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
