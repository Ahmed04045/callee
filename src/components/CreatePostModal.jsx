// src/components/CreatePostModal.jsx
//
// Same underlying `gigs` row either way — `kind` and the on-screen framing
// change based on account_type (personal -> "opportunity", everyone else
// -> "gig"), but it's one form, one table, one moderation queue. RLS
// (004_account_types_and_posting.sql) forces status='pending' and
// posted_by_user_id = auth.uid() server-side regardless of what this form
// sends, so there's no client-side way to bypass moderation even if this
// component had a bug.

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../hooks/useProfile';
import { supabase } from '../lib/supabaseClient';
import { logUserAction } from './TelemetryLog';
import Icon from './Icon';

export default function CreatePostModal({ isOpen, onClose }) {
  const { colors, radius, spacing, font } = themeConfig;
  const { user } = useAuth();
  const { profile } = useProfile();
  const navigate = useNavigate();

  const isPersonal = profile?.account_type === 'personal';
  const kind = isPersonal ? 'opportunity' : 'gig';
  const heading = isPersonal ? 'Offer an Opportunity' : 'Post a Gig';

  const [role, setRole] = useState('');
  const [compensation, setCompensation] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [details, setDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const resetAndClose = () => {
    setRole('');
    setCompensation('');
    setTagsInput('');
    setDetails('');
    setError(null);
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    const postedBy = profile?.display_name?.trim() || user.email;

    logUserAction('CREATE_POST_SUBMIT', { kind });

    const { data, error: insertError } = await supabase
      .from('gigs')
      .insert({
        role: role.trim(),
        posted_by: postedBy,
        posted_by_user_id: user.id,
        compensation: compensation.trim() || 'Unpaid',
        tags,
        details: details.trim(),
        kind,
        status: 'pending',
      })
      .select()
      .single();

    setIsSubmitting(false);

    if (insertError) {
      setError(insertError.message);
      return;
    }

    resetAndClose();
    navigate(`/gigs/${data.id}`);
  };

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center ${colors.scrim} backdrop-blur-sm px-4`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-post-title"
    >
      <div
        className={`w-full max-w-md max-h-[90vh] overflow-y-auto ${colors.bgCardStrong} border ${colors.borderStrong} ${radius.lg} ${spacing.card} relative shadow-xl`}
      >
        <button
          onClick={resetAndClose}
          aria-label="Close"
          className={`absolute top-4 right-4 ${colors.textFaint} ${colors.textHoverStrong} transition`}
        >
          <Icon name="close" size={18} />
        </button>

        <h2 id="create-post-title" className={`text-lg ${font.heading} ${colors.textWhite} mb-1`}>
          {heading}
        </h2>
        <p className={`text-xs ${colors.textFaint} mb-5`}>
          Submitted for review — it won't be public until approved.
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-left">
            <span className={`text-[11px] font-semibold ${colors.textFaint}`}>
              {isPersonal ? 'What are you offering?' : 'Role / title'}
            </span>
            <input
              type="text"
              required
              maxLength={100}
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={`w-full mt-1 ${colors.bgInset} border ${colors.borderStrong} ${radius.md} px-3 py-2.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary ${colors.transition}`}
            />
          </label>

          <label className="block text-left">
            <span className={`text-[11px] font-semibold ${colors.textFaint}`}>
              Compensation <span className={colors.textDim}>(optional)</span>
            </span>
            <input
              type="text"
              maxLength={60}
              value={compensation}
              onChange={(e) => setCompensation(e.target.value)}
              placeholder="e.g. Paid, Unpaid, Equity"
              className={`w-full mt-1 ${colors.bgInset} border ${colors.borderStrong} ${radius.md} px-3 py-2.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary ${colors.transition}`}
            />
          </label>

          <label className="block text-left">
            <span className={`text-[11px] font-semibold ${colors.textFaint}`}>
              Tags <span className={colors.textDim}>(comma-separated)</span>
            </span>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="Tech, Design, Media"
              className={`w-full mt-1 ${colors.bgInset} border ${colors.borderStrong} ${radius.md} px-3 py-2.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary ${colors.transition}`}
            />
          </label>

          <label className="block text-left">
            <span className={`text-[11px] font-semibold ${colors.textFaint}`}>Details</span>
            <textarea
              required
              rows={4}
              maxLength={500}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className={`w-full mt-1 ${colors.bgInset} border ${colors.borderStrong} ${radius.md} px-3 py-2.5 text-sm ${colors.textPrimary} focus:outline-none focus:border-md3-primary ${colors.transition} resize-none`}
            />
          </label>

          {error && <p className={`text-xs ${colors.error}`}>{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`w-full flex items-center justify-center gap-2 ${radius.full} py-2.5 text-sm font-bold ${colors.accentOn} ${colors.accentBg} ${colors.accentBgHover} transition disabled:opacity-60`}
          >
            {isSubmitting && (
              <Icon name="progress_activity" size={16} className="animate-spin text-inherit" />
            )}
            Submit for review
          </button>
        </form>
      </div>
    </div>
  );
}