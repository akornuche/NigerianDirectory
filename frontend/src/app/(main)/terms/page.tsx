import { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  alternates: { canonical: '/terms/' },
  title: 'Terms of Use',
  description:
    'The terms that apply when you use NigerianDirectory: how the directory and news digest are compiled, acceptable use, submissions, advertising and liability.',
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

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <section className="bg-gray-50 border-b">
        <div className="container mx-auto px-4 max-w-3xl py-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">Terms of Use</h1>
          <p className="text-gray-600">Last updated: {LAST_UPDATED}</p>
        </div>
      </section>

      <article className="container mx-auto px-4 max-w-3xl py-10">
        <p className="text-gray-700 leading-relaxed">
          These terms apply to your use of www.nigeriandirectory.com.ng (&ldquo;NigerianDirectory&rdquo;,
          &ldquo;we&rdquo;, &ldquo;us&rdquo;). By using the site you agree to them. If you do not agree, please do not
          use the site. How we handle personal data is explained separately in our{' '}
          <Link href="/privacy/" className="link">Privacy Policy</Link>.
        </p>

        <Section id="service" title="1. What the site is">
          <p>
            NigerianDirectory is a free directory of institutions in Nigeria, currently universities and
            secondary schools, together with a daily digest summarising the most reported Nigerian news.
            Sections open one at a time as their records are checked.
          </p>
        </Section>

        <Section id="accuracy" title="2. How information is compiled, and its limits">
          <p>
            Each directory record is published only after an independent source confirms the institution
            exists, and each profile lists the sources it was written from. Information can still change or
            be incomplete: fees, admission requirements, leadership and contact details in particular. Please
            confirm anything important, such as an admission decision, directly with the institution.
          </p>
          <p>
            News digest entries are short summaries written in our own words from reports published by
            Nigerian news outlets, with links to the original reports. Claims in a summary are attributed to
            the people or bodies who made them; publishing a summary is not an endorsement of the claim.
          </p>
          <p>
            The site is provided &ldquo;as is&rdquo;. We work to keep it accurate but do not guarantee that every detail
            is complete, current or error-free.
          </p>
        </Section>

        <Section id="links" title="3. Links to other websites">
          <p>
            The site links to institutions&apos; own websites, news outlets and other sources. We do not control
            those sites and are not responsible for their content, availability or privacy practices. The
            full reports summarised in the news digest belong to the outlets that published them.
          </p>
        </Section>

        <Section id="use" title="4. Acceptable use">
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>copy or republish substantial parts of the site, or scrape it in bulk, without our written permission;</li>
            <li>interfere with the site&apos;s security or operation, or try to access areas you are not authorised to use;</li>
            <li>submit information you know to be false, or impersonate an institution or another person;</li>
            <li>use the site for any unlawful purpose.</li>
          </ul>
          <p>
            Quoting short extracts with a link back to the page is welcome.
          </p>
        </Section>

        <Section id="submissions" title="5. Corrections, requests and ownership claims">
          <p>
            You can send corrections, information requests and requests to manage an institution&apos;s page
            through the <Link href="/contact/" className="link">contact page</Link>. By sending information you
            confirm it is accurate to the best of your knowledge and that you may share it. We review every
            submission against a source before changing a record, and may decline changes we cannot verify.
            Requests to manage a page are approved only after we confirm the requester represents the
            institution.
          </p>
        </Section>

        <Section id="ip" title="6. Our content">
          <p>
            The profiles, summaries, page design and compilation of the directory are our work and are
            protected by copyright. Names, logos and photographs of institutions belong to their owners and
            are shown to identify them.
          </p>
        </Section>

        <Section id="ads" title="7. Advertising">
          <p>
            The site is funded by advertising, which may be served by Google and other partners. Adverts are
            clearly separated from editorial content, and advertisers have no influence over directory
            records or news summaries. How advertising cookies are used, and how to control them, is set out
            in the <Link href="/privacy/" className="link">Privacy Policy</Link>.
          </p>
        </Section>

        <Section id="liability" title="8. Liability">
          <p>
            To the extent the law allows, we are not liable for any loss arising from your use of, or reliance
            on, the site or the sites it links to. Nothing in these terms limits liability that cannot be
            limited under Nigerian law.
          </p>
        </Section>

        <Section id="law" title="9. Governing law">
          <p>These terms are governed by the laws of the Federal Republic of Nigeria.</p>
        </Section>

        <Section id="changes" title="10. Changes to these terms">
          <p>
            We may update these terms as the site develops. The date at the top shows when they last changed;
            continuing to use the site after a change means you accept the updated terms.
          </p>
        </Section>

        <Section id="contact" title="11. Contact">
          <p>
            Questions about these terms can be sent through our <Link href="/contact/" className="link">contact page</Link>
            {CONTACT_EMAIL ? (
              <>
                {' '}or by email to <a href={`mailto:${CONTACT_EMAIL}`} className="link">{CONTACT_EMAIL}</a>
              </>
            ) : null}
            .
          </p>
        </Section>
      </article>
    </div>
  );
}
