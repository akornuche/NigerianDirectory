import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  alternates: { canonical: '/privacy/' },
  title: 'Privacy Policy',
  description:
    'How NigerianDirectory collects, uses and protects personal data, the cookies it uses, and your rights under the Nigeria Data Protection Act 2023.',
};

const LAST_UPDATED = '25 November 2026';
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="text-2xl font-bold text-gray-900 mt-10 mb-4">{title}</h2>
      <div className="space-y-4 text-gray-700 leading-relaxed">{children}</div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-gray-50 border-b">
        <div className="container mx-auto px-4 max-w-3xl py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Privacy Policy</h1>
          <p className="text-gray-600">Last updated: {LAST_UPDATED}</p>
        </div>
      </section>

      <article className="container mx-auto px-4 max-w-3xl py-10">
        <p className="text-gray-700 leading-relaxed">
          This policy explains what personal data NigerianDirectory (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects
          when you use www.nigeriandirectory.com.ng, why we collect it, how long we keep it, who we share it
          with, and the rights you have. We process personal data in line with the Nigeria Data Protection
          Act 2023 and, for visitors in the European Union or United Kingdom, the GDPR.
        </p>

        <nav aria-label="Contents" className="mt-8 rounded-lg bg-gray-50 p-5 text-sm">
          <p className="font-semibold text-gray-900 mb-2">Contents</p>
          <ol className="list-decimal pl-5 space-y-1 text-primary-700">
            <li><a href="#who-we-are">Who we are</a></li>
            <li><a href="#what-we-collect">What we collect</a></li>
            <li><a href="#how-we-use">How we use it and why</a></li>
            <li><a href="#cookies">Cookies and similar technologies</a></li>
            <li><a href="#sharing">Who we share it with</a></li>
            <li><a href="#transfers">International transfers</a></li>
            <li><a href="#retention">How long we keep it</a></li>
            <li><a href="#rights">Your rights</a></li>
            <li><a href="#institutions">Information about schools and universities</a></li>
            <li><a href="#children">Children</a></li>
            <li><a href="#security">Security</a></li>
            <li><a href="#changes">Changes to this policy</a></li>
            <li><a href="#contact">Contact us</a></li>
          </ol>
        </nav>

        <Section id="who-we-are" title="1. Who we are">
          <p>
            NigerianDirectory is an online directory of universities and secondary schools in Nigeria. We are
            the data controller for the personal data described in this policy.
            {CONTACT_EMAIL && <> You can reach us at <a className="text-primary-600 underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.</>}
          </p>
        </Section>

        <Section id="what-we-collect" title="2. What we collect">
          <p><strong>You can browse the directory without giving us any personal data.</strong> We collect personal data only in these cases:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>When you contact us</strong> through the contact, advertising or school registration forms:
              your name, email address, phone number (if you give one), the subject and message, and any school,
              role or organisation details you provide. With each submission we also record your IP address and
              browser type, to protect the forms against spam and abuse.
            </li>
            <li>
              <strong>Usage information</strong>, unless you turn analytics off (or, in the EEA, UK and Switzerland, only if you accept analytics cookies): pages viewed, approximate
              location derived from your IP address, device and browser type, and how you arrived at the site.
              This is collected by Google Analytics (see section 4).
            </li>
            <li>
              <strong>Your cookie choice</strong>, stored in your own browser so we do not ask again.
            </li>
            <li>
              <strong>Administrator accounts</strong>: if you are given an account to manage the site, your
              name, email address and a securely hashed password.
            </li>
          </ul>
        </Section>

        <Section id="how-we-use" title="3. How we use it and why">
          <ul className="list-disc pl-6 space-y-2">
            <li>
              <strong>To answer your enquiry</strong>, correct or add a listing, or discuss advertising. Our legal
              basis is your request and our legitimate interest in responding.
            </li>
            <li>
              <strong>To keep the forms secure</strong>, using IP address and browser type to detect spam and
              abuse. Legal basis: legitimate interest.
            </li>
            <li>
              <strong>To understand how the site is used</strong> and improve it, using analytics. Legal basis:
              our legitimate interest in measuring use of the site (your consent in the EEA, UK and Switzerland),
              which you can refuse or withdraw at any time with &ldquo;Necessary only&rdquo;.
            </li>
            <li>
              <strong>To show advertising</strong>, when advertising is enabled. Personalised advertising is used
              only with your consent; otherwise any ads shown are not personalised.
            </li>
          </ul>
          <p>We do not sell personal data, and we do not use it for automated decisions about you.</p>
        </Section>

        <Section id="cookies" title="4. Cookies and similar technologies">
          <p>
            When you first visit, we ask whether you accept analytics and advertising cookies. If you are in the
            European Economic Area, the United Kingdom or Switzerland, Google services on this site store no
            analytics or advertising cookies until you choose. Elsewhere, anonymous analytics is on until you
            choose so that we can count visits, and advertising cookies stay off until you accept them
            (Google Consent Mode).
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Strictly necessary:</strong> your cookie choice, saved in your browser&apos;s local storage.</li>
            <li><strong>Analytics (optional):</strong> Google Analytics cookies, which help us count visits and understand which pages are useful.</li>
            <li><strong>Advertising (optional, only when ads are enabled):</strong> cookies set by advertising partners such as Google AdSense to show and measure ads, and to personalise them if you allow it.</li>
          </ul>
          <p>
            Choosing &ldquo;Necessary only&rdquo; turns analytics and advertising storage off. To change your choice
            later, clear this site&apos;s data in your browser settings and you will be asked again. You can also
            block cookies in your browser, and Google lets you opt out of Analytics with its browser add-on.
          </p>
          <p>
            <strong>About advertising cookies.</strong> When advertising is enabled, third-party vendors,
            including Google, use cookies to serve ads based on your previous visits to this and other
            websites. Google&apos;s use of advertising cookies enables it and its partners to serve ads to you
            based on those visits. You can opt out of personalised advertising in{' '}
            <a href="https://adssettings.google.com" target="_blank" rel="noopener noreferrer" className="link">Google&apos;s Ads Settings</a>,
            and opt out of some third-party vendors&apos; use of cookies for personalised advertising at{' '}
            <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer" className="link">aboutads.info</a>.
            Google explains how it uses information from sites that use its services at{' '}
            <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer" className="link">policies.google.com/technologies/partner-sites</a>.
          </p>
        </Section>

        <Section id="sharing" title="5. Who we share it with">
          <p>We use trusted service providers who process data on our behalf and only as we instruct:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Vercel</strong>: hosts the website and its servers.</li>
            <li><strong>Neon</strong>: hosts our database, where form submissions are stored.</li>
            <li><strong>Google</strong>: Google Analytics (which you can turn off), email delivery of form notifications, and Google AdSense when advertising is enabled.</li>
          </ul>
          <p>
            We may also disclose data where the law requires it, or to protect the rights and safety of our users
            or others.
          </p>
        </Section>

        <Section id="transfers" title="6. International transfers">
          <p>
            Our service providers store and process data outside Nigeria, including in the United States. Where
            data leaves Nigeria we rely on the safeguards the Nigeria Data Protection Act 2023 allows, such as
            the provider&apos;s contractual data protection commitments.
          </p>
        </Section>

        <Section id="retention" title="7. How long we keep it">
          <ul className="list-disc pl-6 space-y-2">
            <li>Form submissions: for as long as we need them to handle your enquiry and any follow-up, after which we delete them.</li>
            <li>Analytics data: according to the retention period set in Google Analytics.</li>
            <li>Administrator accounts: until the account is closed.</li>
          </ul>
        </Section>

        <Section id="rights" title="8. Your rights">
          <p>Under the Nigeria Data Protection Act 2023 (and the GDPR where it applies) you have the right to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>be told how your data is used, and get a copy of it;</li>
            <li>have inaccurate data corrected;</li>
            <li>have your data deleted;</li>
            <li>object to, or ask us to restrict, how we use it;</li>
            <li>receive your data in a portable format;</li>
            <li>withdraw consent at any time, without affecting what was done before.</li>
          </ul>
          <p>
            To use any of these rights, contact us (section 13). We will respond within the time the law allows.
            If you are not satisfied with our response, you can complain to the Nigeria Data Protection Commission.
          </p>
        </Section>

        <Section id="institutions" title="9. Information about schools and universities">
          <p>
            Our listings describe institutions, not private individuals. Some profiles name people in public
            roles, such as a vice-chancellor or a founder, based on public sources that each profile lists. If
            you are named and believe the information is wrong, please{' '}
            <Link href="/contact/?subject=report_error" rel="nofollow" className="text-primary-600 underline">tell us</Link> and we
            will review it.
          </p>
        </Section>

        <Section id="children" title="10. Children">
          <p>
            The directory is intended for parents, students and educators. Our forms are not intended for
            children under 13, and we do not knowingly collect their personal data. If you believe a child has
            sent us personal data, contact us and we will delete it.
          </p>
        </Section>

        <Section id="security" title="11. Security">
          <p>
            Data is sent over encrypted (HTTPS) connections and stored by our providers with access restricted
            to authorised administrators. Administrator passwords are stored only in hashed form. No system is
            completely secure, but we take reasonable steps to protect your data.
          </p>
        </Section>

        <Section id="changes" title="12. Changes to this policy">
          <p>
            We may update this policy, for example if we add a feature or service provider. The date at the top
            shows when it last changed. Significant changes will be highlighted on the site.
          </p>
        </Section>

        <Section id="contact" title="13. Contact us">
          <p>
            For any question about this policy or your data, use our{' '}
            <Link href="/contact/" className="text-primary-600 underline">contact form</Link>
            {CONTACT_EMAIL && <> or email <a className="text-primary-600 underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a></>}.
          </p>
        </Section>
      </article>
    </div>
  );
}
