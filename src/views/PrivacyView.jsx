// src/views/PrivacyView.jsx
//
// Real privacy policy, matching what the codebase actually collects today —
// see supabase/schema.sql + migrations for the tables named below, and
// src/components/TelemetryLog.js for the telemetry note. Not a substitute for
// a lawyer's review before a public launch, but no longer a placeholder.
// Kept in English on purpose: legal text is easy to mistranslate in a way
// that changes its meaning, and this project's own translations aren't
// reviewed by a native speaker yet.

import themeConfig from '../theme/themeConfig';
import SubPageHeader from '../components/SubPageHeader';
import { useT } from '../i18n';

const EFFECTIVE_DATE = 'September 2026';

function Section({ heading, children }) {
  const { colors } = themeConfig;
  return (
    <section className="space-y-2">
      <h2 className={`text-sm font-bold ${colors.textWhite}`}>{heading}</h2>
      <div className={`text-sm ${colors.textMuted} leading-relaxed space-y-2`}>{children}</div>
    </section>
  );
}

export default function PrivacyView() {
  const { t } = useT();
  const { colors, radius, brand } = themeConfig;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <SubPageHeader title={t('Privacy Policy')} />
      <div className={`${colors.bgCard} border ${colors.border} ${radius.lg} p-6 space-y-6`}>
        <p className={`text-xs ${colors.textFaint}`}>Effective {EFFECTIVE_DATE}. This covers what {brand.name} collects and why.</p>

        <Section heading="What we collect">
          <p>Your account email and password (handled by our database provider, Supabase — we never see your password). Whatever you put in your profile: display name, username, date of birth, bio, school, and a photo if you upload one.</p>
          <p>Whatever you write when you use the platform: event and gig listings you post, messages and answers you submit when applying to a gig, RSVPing to an event, or requesting to join a club, and photos you add to an event. Items you save, and reports you file.</p>
          <p>Your language and appearance choice, kept in your browser’s local storage — this stays on your device and isn’t sent to us.</p>
        </Section>

        <Section heading="What we don’t collect">
          <p>No payment information — {brand.name} doesn’t process payments. No precise location tracking; a place shown on the map is one you typed or picked yourself. No advertising trackers or third-party analytics. In-app usage logging currently only prints to your own browser console during development — it isn’t sent anywhere.</p>
        </Section>

        <Section heading="Who sees it">
          <p>Your profile is public by default unless you turn on “Private profile,” in which case only you can see it. When you apply to a gig, request to join a club, or RSVP to an event, the relevant name, university, bio, your message and your answers are shared with that gig’s poster or that club/event’s moderators — that’s the point of applying. We never show your email or date of birth to other users.</p>
          <p>Supabase hosts our database and handles sign-in. If you choose “Continue with Google,” Google handles that sign-in. If you connect Discord, our bot can look up your linked account to answer your commands. Vercel hosts this website. None of these partners get your data for their own advertising — they process it only to run the parts of the service they provide.</p>
          <p>We never sell your data.</p>
        </Section>

        <Section heading="Your choices">
          <p>Edit or delete most of your profile any time from Account settings. Leave any club, cancel a pending join request, or turn off notification categories you don’t want. There’s no self-serve “delete my account” button yet — email us (see the About page) and we’ll remove your account and its data.</p>
        </Section>

        <Section heading="Young users">
          <p>Many people on {brand.name} are teenagers. We don’t run targeted ads, don’t sell data, and keep private information (email, date of birth) hidden from other users by default. If you’re a parent or guardian with a concern about your child’s account, contact us via the About page.</p>
        </Section>

        <Section heading="Security">
          <p>Access to your data is controlled by database-level rules (Row Level Security) that limit what any account, including ours, can read or change — not just checks in the app.</p>
        </Section>

        <Section heading="Changes">
          <p>We may update this policy as the platform changes. Material changes will be reflected here with a new effective date.</p>
        </Section>

        <Section heading="Contact">
          <p>Questions about this policy are covered on the <a href="/about" className={colors.accent}>About page</a>.</p>
        </Section>
      </div>
    </div>
  );
}
