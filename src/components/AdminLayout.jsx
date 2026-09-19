// src/components/AdminLayout.jsx
//
// Shell for every /admin/* page: a left side nav on desktop, a scrolling tab
// strip on mobile. Still not linked from anywhere in the normal UI — you
// reach it by typing /admin.
//
// Non-admins are NOT redirected; they see an "access required" screen with
// the account they're signed in as, which is what you need to debug "why
// am I not an admin". The actual gate is is_admin() in Postgres (RLS + the
// club functions) — this component is only about what to show.

import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import Icon from './Icon';

export const ADMIN_SECTIONS = [
  { to: '/admin', label: 'Overview', icon: 'dashboard', end: true },
  { to: '/admin/gigs', label: 'Gigs', icon: 'work' },
  { to: '/admin/events', label: 'Events', icon: 'event' },
  { to: '/admin/groups', label: 'Groups', icon: 'groups' },
  { to: '/admin/moderators', label: 'Moderators', icon: 'shield_person' },
  { to: '/admin/people', label: 'People', icon: 'badge' },
  { to: '/admin/activity', label: 'Activity', icon: 'history' },
];

function AccessRequired() {
  const { colors } = themeConfig;
  const { user, status } = useAuth();
  const sql = `insert into app_admins (user_id)\nselect id from auth.users where email = '${user?.email ?? 'you@example.com'}'\non conflict do nothing;`;

  return (
    <div className="max-w-md mx-auto text-center py-16 px-4">
      <Icon name="gpp_maybe" size={28} className={`mx-auto mb-3 ${colors.textFaint}`} />
      <h2 className={`text-lg font-bold ${colors.textWhite}`}>Admin access required</h2>
      {status === 'unauthenticated' ? (
        <p className={`text-xs ${colors.textFaint} mt-2 leading-relaxed`}>Sign in with your admin account first, then come back to this page.</p>
      ) : (
        <>
          <p className={`text-xs ${colors.textFaint} mt-2 leading-relaxed`}>
            You're signed in as <b className={colors.textWhite}>{user?.email}</b>, and the database says this account isn't in{' '}
            <code className={colors.accent}>app_admins</code>. If that's the account you meant to promote, run this in the Supabase SQL editor,
            then reload:
          </p>
          <pre className={`mt-3 text-left text-[11px] ${colors.bgInset} ${colors.textMuted} p-3 rounded-xl overflow-x-auto`}>{sql}</pre>
          <p className={`text-[11px] ${colors.textDim} mt-3`}>
            The email must match exactly and belong to a confirmed account. Check with{' '}
            <code>select * from app_admins;</code>
          </p>
        </>
      )}
    </div>
  );
}

export default function AdminLayout() {
  const { colors, radius } = themeConfig;
  const { isAdmin, isAdminLoading } = useAuth();

  if (isAdminLoading) return <p className={`text-sm ${colors.textFaint} p-6`}>Checking admin access…</p>;
  if (!isAdmin) return <AccessRequired />;

  const linkClass = ({ isActive }) =>
    `flex items-center gap-3 px-3 py-2 ${radius.md} text-sm font-semibold whitespace-nowrap transition ${
      isActive ? `${colors.accentSoftBg} ${colors.textWhite}` : `${colors.textMuted} ${colors.bgHoverInset}`
    }`;

  return (
    <div className="min-h-screen md:flex">
      <aside className={`md:w-56 md:shrink-0 md:sticky md:top-0 md:h-screen border-b md:border-b-0 md:border-r ${colors.border} ${colors.bgPanel} p-3`}>
        <div className="hidden md:flex items-center gap-2 px-3 py-3 mb-2">
          <Icon name="admin_panel_settings" size={20} className={colors.accent} />
          <span className={`text-sm font-black ${colors.textWhite}`}>Admin</span>
        </div>
        <nav className="flex md:flex-col gap-1 overflow-x-auto">
          {ADMIN_SECTIONS.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={linkClass}>
              <Icon name={item.icon} size={18} className="text-inherit" />
              {item.label}
            </NavLink>
          ))}
          <NavLink to="/" className={`${linkClass({ isActive: false })} md:mt-6`}>
            <Icon name="arrow_back" size={18} className="text-inherit" />
            Back to site
          </NavLink>
        </nav>
      </aside>
      <main className="flex-1 min-w-0 px-4 md:px-8 py-8">
        <Outlet />
      </main>
    </div>
  );
}
