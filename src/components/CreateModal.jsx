// src/components/CreateModal.jsx
//
// The Create flow (gig/opportunity, event, group) as a modal instead of a
// page. An earlier modal version of this was reverted to a full page (see
// git history) because it stayed mounted — and composited — behind every
// other page even while closed. This one returns null when closed, so its
// forms, and everything they import, aren't in the tree at all until
// someone opens it; there's nothing left running underneath.
//
// Opening it always shows a type picker first — full-width rows (icon,
// title, one-line description), the same shape as CareerEntryModal's kind
// picker — rather than a row of small tabs. Picking one swaps in that
// form; "back" returns to the picker without closing the modal.
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
  const types = [
    {
      id: 'gig',
      icon: 'work',
      label: isPersonal ? 'Opportunity' : 'Gig',
      hint: isPersonal
        ? 'Offer something you need help with, or something you can do for someone else.'
        : 'Post a role, freelance gig or paid opportunity for people to apply to.',
    },
    { id: 'event', icon: 'event_available', label: 'Event', hint: 'Something people RSVP to — a hackathon, workshop, meetup or social.' },
    { id: 'group', icon: 'groups', label: 'Group', hint: 'Start a private club or student-run group people request to join.' },
  ];
  const current = types.find((tItem) => tItem.id === type);
  const postedBy = profile?.display_name?.trim() || (profile?.username ? `@${profile.username}` : user.email);

  return (
    <div className="fixed inset-0 z-[90] flex items-end sm:items-center justify-center bg-black/60 sm:px-4 animate-modal-backdrop" role="dialog" aria-modal="true" aria-label={t('Create')}>
      <div className={`w-full sm:max-w-lg max-h-[92vh] overflow-y-auto ${colors.bgCardStrong} border ${colors.borderStrong} ${radius.lg} p-5 space-y-5 animate-modal-in`}>
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

        {!current ? (
          <div className="space-y-2">
            {types.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setType(item.id)}
                className={`w-full flex items-start gap-4 text-start ${colors.bgCard} border ${colors.borderStrong} ${radius.lg} p-4 hover:border-md3-primary transition`}
              >
                <div className={`${colors.accentSoftBg} ${colors.accent} p-2.5 ${radius.md} shrink-0`}>
                  <Icon name={item.icon} size={20} className="text-inherit" />
                </div>
                <div>
                  <p className={`text-sm font-bold ${colors.textWhite}`}>{t(item.label)}</p>
                  <p className={`text-xs ${colors.textFaint} mt-0.5 leading-relaxed`}>{t(item.hint)}</p>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <button type="button" onClick={() => setType(null)} className={`flex items-center gap-1 text-xs font-semibold ${colors.accent}`}>
              <Icon name="arrow_back" size={14} /> {t(current.label)}
            </button>
            {current.id === 'gig' && <GigForm key="gig" user={user} postedBy={postedBy} kind={isPersonal ? 'opportunity' : 'gig'} onDone={close} />}
            {current.id === 'event' && <EventForm key="event" user={user} postedBy={postedBy} onDone={close} />}
            {current.id === 'group' && <GroupForm key="group" profile={profile} onDone={close} />}
          </div>
        )}
      </div>
    </div>
  );
}
