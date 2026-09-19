// src/views/AccountView.jsx
//
// This is the old SettingsView content, renamed — "Settings" now means the
// app-wide settings hub (Theme, Legal, About), and this page specifically
// is just account credentials (email + password). Reached via the Account
// row in the Settings menu, only shown there when signed in.

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { logUserAction } from '../components/TelemetryLog';
import SubPageHeader from '../components/SubPageHeader';
import Icon from '../components/Icon';

export default function AccountView() {
  const { colors, radius } = themeConfig;
  const { user, updatePassword, error } = useAuth();

  const [discordLink, setDiscordLink] = useState(null);
  const [discordStatus, setDiscordStatus] = useState('loading');

  useEffect(() => {
    if (!user) return;
    let isMounted = true;
    supabase
      .from('discord_links')
      .select('discord_username, linked_at')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (isMounted) {
          setDiscordLink(data);
          setDiscordStatus('ready');
        }
      });
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleUnlinkDiscord = async () => {
    logUserAction('DISCORD_UNLINK', {});
    await supabase.from('discord_links').delete().eq('user_id', user.id);
    setDiscordLink(null);
  };

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [mismatch, setMismatch] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNotice(null);

    if (newPassword !== confirmPassword) {
      setMismatch(true);
      return;
    }
    setMismatch(false);

    setIsSubmitting(true);
    logUserAction('PASSWORD_UPDATE_SUBMIT', {});
    const { error: updateError } = await updatePassword(newPassword);
    setIsSubmitting(false);

    if (!updateError) {
      setNotice('Password updated.');
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <SubPageHeader title="Account" />

      <div className="space-y-6">
        <div className={`${colors.bgCard} border ${colors.border} ${radius.lg} p-5 space-y-1`}>
          <span className={`text-[11px] font-semibold ${colors.textFaint}`}>Email</span>
          <p className={`text-sm ${colors.textWhite} break-all`}>{user?.email}</p>
        </div>

        <div className={`${colors.bgCard} border ${colors.border} ${radius.lg} p-5 space-y-3`}>
          <h2 className={`text-sm font-bold ${colors.textWhite} flex items-center gap-2`}>
            <Icon name="forum" size={16} /> Discord
          </h2>
          {discordStatus === 'loading' && (
            <p className={`text-xs ${colors.textFaint}`}>Checking…</p>
          )}
          {discordStatus === 'ready' && discordLink && (
            <div className="flex items-center justify-between">
              <p className={`text-xs ${colors.textMuted}`}>
                Connected as <span className={colors.textWhite}>{discordLink.discord_username}</span>
              </p>
              <button
                onClick={handleUnlinkDiscord}
                className={`text-[11px] font-semibold ${colors.error}`}
              >
                Unlink
              </button>
            </div>
          )}
          {discordStatus === 'ready' && !discordLink && (
            <Link
              to="/connect-discord"
              className={`inline-flex items-center gap-1.5 text-xs font-bold ${colors.accent}`}
            >
              Connect your Discord account <Icon name="arrow_forward" size={13} />
            </Link>
          )}
        </div>

        <div className={`${colors.bgCard} border ${colors.border} ${radius.lg} p-5 space-y-4`}>
          <h2 className={`text-sm font-bold ${colors.textWhite} flex items-center gap-2`}>
            <Icon name="lock_reset" size={16} /> Change password
          </h2>

          <form onSubmit={handleSubmit} className="space-y-3">
            <label className="block text-left">
              <span className={`text-[11px] font-semibold ${colors.textFaint}`}>New password</span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`w-full mt-1 ${colors.bgInset} border ${colors.borderStrong} ${radius.md} px-3 py-2.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary ${colors.transition}`}
              />
            </label>
            <label className="block text-left">
              <span className={`text-[11px] font-semibold ${colors.textFaint}`}>Confirm new password</span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full mt-1 ${colors.bgInset} border ${colors.borderStrong} ${radius.md} px-3 py-2.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary ${colors.transition}`}
              />
            </label>

            {mismatch && <p className={`text-xs ${colors.error}`}>Passwords don't match.</p>}
            {error && <p className={`text-xs ${colors.error}`}>{error}</p>}
            {notice && <p className={`text-xs ${colors.success}`}>{notice}</p>}

            <button
              type="submit"
              disabled={isSubmitting}
              className={`w-full flex items-center justify-center gap-2 ${radius.full} py-2.5 text-sm font-bold ${colors.accentOn} ${colors.accentBg} ${colors.accentBgHover} transition disabled:opacity-60`}
            >
              {isSubmitting && (
                <Icon name="progress_activity" size={16} className="animate-spin text-inherit" />
              )}
              Update password
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
