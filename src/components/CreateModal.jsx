// src/components/CreateModal.jsx
//
// The Create flow (gig/opportunity, event, group) as a modal instead of a
// page. An earlier modal version of this was reverted to a full page (see
// git history) because it stayed mounted — and composited — behind every
// other page even while closed. This one returns null when closed, so its
// forms, and everything they import, aren't in the tree at all until
// someone opens it; there's nothing left running underneath.
//
// Rendered once near the app root (see App.jsx) and controlled through
// CreateModalContext, so any page can open it without a route change.

import themeConfig from '../theme/themeConfig';
import { useAuth } from '../context/AuthContext';
import { useProfile } from '../context/ProfileContext';
import { useCreateModal } from '../context/CreateModalContext';
import Icon from './Icon';
import GigForm from '../views/create/GigForm';
import EventForm from '../views/create/EventForm';
import GroupForm from '../views/create/GroupForm';
import { useT } from '../i18n';

export default function CreateModal() {
  const { t } = useT();
  const { colors, radius, font } = themeConfig;
  const { user } = useAuth();
  const { profile } = useProfile();
  const { isOpen, type, setType, close } = useCreateModal();

  if (!isOpen || !user) return null;

  const isPersonal = profile?.account_type === 'personal';
  const gigKind = isPersonal ? 'opportunity' : 'gig';
  const tabs = [
    { id: 'gig', label: isPersonal ? 'Opportunity' : 'Gig' },
    { id: 'event', label: 'Event' },
    { id: 'group', label: 'Group' },
  ];
  const postType = tabs.some((tab) => tab.id === type) ? type : 'gig';
  const postedBy = profile?.display_name?.trim() || (profile?.username ? `@${profile.username}` : user.email);

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/60 sm:px-4" role="dialog" aria-modal="true" aria-label={t('Create')}>
      <div className={`w-full sm:max-w-lg max-h-[92vh] overflow-y-auto ${colors.bgCardStrong} border ${colors.borderStrong} ${radius.lg} p-5 space-y-5`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className={`text-lg ${font.heading} ${colors.textWhite} flex items-center gap-2`}>
              <Icon name="add_circle" size={20} className={colors.accent} /> {t('Create')}
            </h2>
            <p className={`text-xs ${colors.textFaint} mt-1`}>{t("Submitted for review — it won't be public until approved.")}</p>
          </div>
          <button type="button" onClick={close} aria-label={t('Close')} className={colors.textFaint}>
            <Icon name="close" size={20} />
          </button>
        </div>

        <div className="flex gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setType(tab.id)}
              className={`text-xs font-bold px-3.5 py-1.5 ${radius.full} border transition ${
                postType === tab.id
                  ? `${colors.accentBg} ${colors.accentOn} border-transparent`
                  : `${colors.textFaint} ${colors.borderStrong} ${colors.textHoverStrong}`
              }`}
            >
              {t(tab.label)}
            </button>
          ))}
        </div>

        {postType === 'gig' && <GigForm key="gig" user={user} postedBy={postedBy} kind={gigKind} onDone={close} />}
        {postType === 'event' && <EventForm key="event" user={user} postedBy={postedBy} onDone={close} />}
        {postType === 'group' && <GroupForm key="group" profile={profile} onDone={close} />}
      </div>
    </div>
  );
}
