// src/views/TermsView.jsx
//
// Real terms, written for what this app actually does today (private clubs,
// reviewed events/gigs/groups, no payments processed on-site), with Qatar
// named as the governing jurisdiction since that's where the platform and
// its users actually are. Not a substitute for a lawyer's review before a
// public launch, but no longer a placeholder. Kept in English on purpose —
// see PrivacyView for the same choice and why.

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

export default function TermsView() {
  const { t } = useT();
  const { colors, radius, brand } = themeConfig;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <SubPageHeader title={t('Terms of Service')} />
      <div className={`${colors.bgCard} border ${colors.border} ${radius.lg} p-6 space-y-6`}>
        <p className={`text-xs ${colors.textFaint}`}>Effective {EFFECTIVE_DATE}. {brand.name} is a community platform for students and young creators in Qatar.</p>

        <Section heading="1. Who can use this">
          <p>You need an account to post, apply, RSVP or join a club. You’re responsible for what happens under your account — keep your password to yourself and tell us if you think someone else has access to it.</p>
          <p>If you’re under 18, a parent or guardian should be aware of and involved in your use of {brand.name}; see the Privacy Policy for how we handle a younger user’s data.</p>
        </Section>

        <Section heading="2. What you post">
          <p>Events, gigs, groups, profiles and messages you write are reviewed before they’re shown publicly, but that review doesn’t make us a party to any arrangement you make with another user. You keep ownership of what you post; by posting it you let {brand.name} display it on the platform.</p>
          <p>Don’t post anything false, misleading, illegal, or that impersonates someone else. No spam, no scams, no requests for money up front, no discriminatory or harassing content. We can remove content or accounts that break these rules, with or without notice.</p>
        </Section>

        <Section heading="3. Clubs and private links">
          <p>Clubs are private: joining goes through a request that a club’s moderators approve. WhatsApp and Discord links a club shares are only shown to approved members, moderators and admins — don’t share them further without the club’s permission.</p>
        </Section>

        <Section heading="4. Money and safety">
          <p>{brand.name} does not process payments. Any pay, prize or compensation mentioned in a gig or event is an arrangement between the people involved, not something we guarantee or enforce. Meet at public, verified venues, and use the in-app Report button if something looks wrong.</p>
        </Section>

        <Section heading="5. Third-party services">
          <p>Signing in with Google, viewing a location on Google Maps, or connecting your Discord account are optional features governed by those companies’ own terms. We aren’t responsible for their availability or content.</p>
        </Section>

        <Section heading="6. No warranty">
          <p>The platform is provided “as is.” We try to keep listings accurate and the service running, but we don’t guarantee it will be uninterrupted, error-free, or that any listing is accurate, safe or legitimate — that’s what moderation and reporting are for, not a guarantee.</p>
        </Section>

        <Section heading="7. Governing law">
          <p>These terms are governed by the laws of Qatar, including its Personal Data Privacy Protection Law (Law No. 13 of 2016) for anything about your data — see the Privacy Policy for how that applies to you.</p>
        </Section>

        <Section heading="8. Ending your account">
          <p>You can stop using {brand.name} at any time; email us (see the About page) to have your account and its data removed. We can suspend or remove an account that breaks these terms, tell you why when we do, and give you a chance to explain first except where the issue is serious or ongoing.</p>
        </Section>

        <Section heading="9. Changes">
          <p>We may update these terms as the platform changes. Continuing to use {brand.name} after an update means you accept the new terms.</p>
        </Section>

        <Section heading="10. Contact">
          <p>Questions about these terms are covered on the <a href="/about" className={colors.accent}>About page</a>.</p>
        </Section>
      </div>
    </div>
  );
}
