import { Metadata } from 'next';
import Link from 'next/link';
import {
  ShieldCheckIcon,
  DocumentMagnifyingGlassIcon,
  PencilSquareIcon,
  ScaleIcon,
  ExclamationTriangleIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import { api } from '@/lib/api';

export const metadata: Metadata = {
  alternates: { canonical: '/about/' },
  title: 'About Us: How We Verify Every Listing',
  description:
    'NigerianDirectory lists universities and secondary schools in Nigeria. Every published record is checked against an independent source such as the National Universities Commission. Here is how we work.',
};

// Counts come from the live directory rather than being hard-coded, so this
// page never states a number we cannot back up.
export const revalidate = 3600;

async function getCounts() {
  try {
    const s = await api.getStats();
    return {
      universities: Number(s.universities) || 0,
      schools: Number(s.secondary_schools) || 0,
      states: Number(s.total_states) || 0,
    };
  } catch {
    return null;
  }
}

const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

const principles = [
  {
    icon: ShieldCheckIcon,
    title: 'Verified before it is published',
    body: 'A record appears on the site only after we have matched it to an independent source. Records we cannot verify are kept off the site until we can, however many there are.',
  },
  {
    icon: DocumentMagnifyingGlassIcon,
    title: 'Every fact has a source',
    body: 'Each profile lists the sources its information came from, so you can check it yourself. Where reliable sources disagree, for example on a founding year, we leave the field blank rather than guess.',
  },
  {
    icon: PencilSquareIcon,
    title: 'Written by us, not copied',
    body: 'Profiles are written in our own words from the facts in their sources. We do not republish other directories’ descriptions, adverts or promotional copy.',
  },
  {
    icon: ScaleIcon,
    title: 'Independent',
    body: 'Listings are free and are not for sale. No school pays to be included, to be verified, or to change what we say about it. Advertising, when shown, is clearly separate from listings.',
  },
];

export default async function AboutPage() {
  const counts = await getCounts();

  return (
    <div className="min-h-screen bg-white">
      <section className="field py-16 lg:py-20">
        <div className="shell"><div className="max-w-3xl">
          <h1 className="text-4xl lg:text-5xl font-bold mb-6">About NigerianDirectory</h1>
          <p className="text-xl text-primary-100">
            A directory of universities and secondary schools in Nigeria, built on one rule: we only
            publish what we can verify.
          </p>
        </div></div>
      </section>

      <section className="py-14">
        <div className="container mx-auto px-4 max-w-3xl space-y-5 text-lg text-gray-700">
          <h2 className="text-3xl font-bold text-gray-900">What we do</h2>
          <p>
            Choosing a school or university is one of the most important decisions a family makes, and
            reliable information about Nigerian institutions is scattered across government lists, school
            websites and secondary sources of very mixed quality. NigerianDirectory brings verified
            information together in one place, organised by state, so parents, students and educators can
            find and compare institutions with confidence.
          </p>
          {counts && (
            <p>
              The directory currently lists <strong>{counts.universities.toLocaleString('en-NG')} universities</strong>{' '}
              and <strong>{counts.schools.toLocaleString('en-NG')} secondary schools</strong> across{' '}
              <strong>{counts.states} states</strong> and the Federal Capital Territory. These numbers count
              only verified, published records.
            </p>
          )}
        </div>
      </section>

      <section className="py-14 bg-gray-50">
        <div className="container mx-auto px-4 max-w-5xl">
          <h2 className="text-3xl font-bold text-gray-900 mb-10 text-center">Our standards</h2>
          <div className="grid md:grid-cols-2 gap-8">
            {principles.map((p) => (
              <div key={p.title} className="bg-white rounded-xl p-6 shadow-sm">
                <p.icon className="h-8 w-8 text-primary-600 mb-3" aria-hidden="true" />
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{p.title}</h3>
                <p className="text-gray-600">{p.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14">
        <div className="container mx-auto px-4 max-w-3xl space-y-5 text-lg text-gray-700">
          <h2 className="text-3xl font-bold text-gray-900">How we verify a listing</h2>
          <h3 className="text-xl font-semibold text-gray-900">Universities</h3>
          <p>
            Every university we publish is matched to the official lists of federal, state and private
            universities maintained by the{' '}
            <a href="https://www.nuc.edu.ng/" className="text-primary-600 underline" rel="noopener noreferrer" target="_blank">
              National Universities Commission (NUC)
            </a>
            , the body that licenses universities in Nigeria. A university&apos;s type, founding year,
            vice-chancellor and official website come from the NUC list unless the profile says otherwise.
            Note that NUC records the year an institution became a university, which can differ from the
            year it was first founded as a college.
          </p>
          <h3 className="text-xl font-semibold text-gray-900">Secondary schools</h3>
          <p>
            Secondary schools have no single national register, so the bar is strict. We publish a school
            only when an independent reference source confirms that a school of exactly that name exists in
            Nigeria at that location. Every match is also checked by a person. We confirm details such as
            founding year, location and whether a school takes boarders against the same sources, and we
            check that a listed website really belongs to the school.
          </p>
          <p>
            Many real schools are not yet listed because we have not been able to verify them to this
            standard. If your school is missing, you can help us add it (see below).
          </p>
        </div>
      </section>

      <section className="py-14 bg-gray-50">
        <div className="container mx-auto px-4 max-w-3xl space-y-5 text-lg text-gray-700">
          <h2 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ExclamationTriangleIcon className="h-8 w-8 text-primary-600" aria-hidden="true" />
            Corrections
          </h2>
          <p>
            We aim to be accurate, and we correct mistakes promptly. If you find an error, or you represent a
            school and want to update or add a listing, please{' '}
            <Link href="/contact/?subject=report_error" rel="nofollow" className="text-primary-600 underline">
              report it through our contact form
            </Link>
            . Tell us what is wrong and, if you can, where the correct information is published. We check
            every report against a source before changing a listing.
          </p>
          <p>
            Information about institutions changes, for example when a new principal or vice-chancellor is
            appointed. Each profile shows its sources, so you can see what our information is based on.
            For admissions, fees and deadlines, always confirm directly with the institution.
          </p>
        </div>
      </section>

      <section className="py-14">
        <div className="container mx-auto px-4 max-w-3xl space-y-5 text-lg text-gray-700">
          <h2 className="text-3xl font-bold text-gray-900">How the site is funded</h2>
          <p>
            NigerianDirectory is free to use. It may be supported by advertising, which is always kept
            separate from listings and never affects which institutions we include or what we say about
            them. How we handle your data is explained in our{' '}
            <Link href="/privacy/" className="text-primary-600 underline">privacy policy</Link>.
          </p>
        </div>
      </section>

      <section className="py-14 field">
        <div className="container mx-auto px-4 max-w-3xl text-center">
          <EnvelopeIcon className="h-10 w-10 mx-auto mb-4" aria-hidden="true" />
          <h2 className="text-3xl font-bold mb-4">Get in touch</h2>
          <p className="text-xl text-primary-100 mb-8">
            Questions, corrections and listing requests are all welcome.
            {CONTACT_EMAIL && <> You can also email us at <a href={`mailto:${CONTACT_EMAIL}`} className="underline">{CONTACT_EMAIL}</a>.</>}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/contact/" className="btn-white">Contact us</Link>
            <Link href="/education/universities/" className="btn-outline-white">Browse universities</Link>
          </div>
        </div>
      </section>
    </div>
  );
}
