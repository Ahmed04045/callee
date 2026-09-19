// src/views/ConnectDiscordView.jsx

import React, { useState } from 'react';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabaseClient';
import { logUserAction } from '../components/TelemetryLog';
import SubPageHeader from '../components/SubPageHeader';
import Icon from '../components/Icon';

export default function ConnectDiscordView() {
  const { colors, radius } = themeConfig;
  const { user } = useAuth();
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null); // { success: bool, message: string } | null

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setResult(null);
    logUserAction('DISCORD_CONNECT_SUBMIT', {});

    const { data, error } = await supabase.rpc('redeem_discord_connect_code', { p_code: code.trim() });

    setIsSubmitting(false);

    if (error) {
      setResult({ success: false, message: error.message });
      return;
    }
    if (!data?.success) {
      setResult({ success: false, message: data?.error ?? 'Something went wrong.' });
      return;
    }
    setResult({
      success: true,
      message: `Connected to Discord as ${data.discord_username ?? 'your account'}.`,
    });
    setCode('');
  };

  if (!user) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-3">
        <Icon name="link_off" size={28} className={colors.textFaint} />
        <p className={`text-sm ${colors.textFaint}`}>Sign in first, then come back to this page.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm mx-auto">
      <SubPageHeader title="Connect Discord" fallbackTo="/account" />

      <div className={`${colors.bgCard} border ${colors.border} ${radius.lg} p-6 space-y-4`}>
        <p className={`text-sm ${colors.textMuted} leading-relaxed`}>
          Run <span className={`${colors.accent} font-mono`}>/connect</span> in Discord, then enter
          the 6-character code it gives you below. Codes expire after 10 minutes.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            required
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABC123"
            className={`w-full ${colors.bgInset} border ${colors.borderStrong} ${radius.md} px-3 py-3 text-center text-lg tracking-[0.3em] font-bold ${colors.textPrimary} focus:outline-none focus:border-md3-primary ${colors.transition}`}
          />

          {result && (
            <p className={`text-xs ${result.success ? colors.success : colors.error}`}>
              {result.message}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting || code.length < 6}
            className={`w-full flex items-center justify-center gap-2 ${radius.full} py-2.5 text-sm font-bold ${colors.accentOn} ${colors.accentBg} ${colors.accentBgHover} transition disabled:opacity-60`}
          >
            {isSubmitting && (
              <Icon name="progress_activity" size={16} className="animate-spin text-inherit" />
            )}
            Connect
          </button>
        </form>
      </div>
    </div>
  );
}
