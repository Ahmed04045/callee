// src/components/SocialLinksRow.jsx
//
// Read-only row of social-link icon buttons for a profile — shown when at
// least one is set. Shared between ProfileView (own profile) and
// PublicProfileView (someone else's).

import themeConfig from '../theme/themeConfig';
import { SOCIAL_LINKS } from '../lib/socialLinks';
import Icon from './Icon';
import { useT } from '../i18n';

export default function SocialLinksRow({ profile }) {
  const { t } = useT();
  const { colors } = themeConfig;
  const active = SOCIAL_LINKS.filter((s) => profile?.[s.key]);
  if (!active.length) return null;

  return (
    <div className="flex flex-wrap justify-center gap-2">
      {active.map((s) => (
        <a
          key={s.key}
          href={profile[s.key]}
          target="_blank"
          rel="noreferrer"
          title={t(s.label)}
          aria-label={t(s.label)}
          className={`w-9 h-9 flex items-center justify-center rounded-full border ${colors.borderStrong} ${colors.textMuted} ${colors.textHoverStrong} transition`}
        >
          <Icon name={s.icon} size={16} className="text-inherit" />
        </a>
      ))}
    </div>
  );
}
