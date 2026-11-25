import Link from 'next/link';
import type { Metadata } from 'next';
import { api, School } from '@/lib/api';
import { toSlugSegment } from '@/lib/slug';
import { verticals } from '@/config/verticals';
import AdBanner from '@/components/ads/AdBanner';

export const metadata: Metadata = {
  alternates: { canonical: '/' },
};

type StateCount = { state: string; schools: string; universities: string };

interface HomeData {
  total: number;
  universities: number;
  schools: number;
  states: number;
  byState: StateCount[];
  byType: { federal: number; state: number; private: number } | null;
  oldest: School[];
}

const num = (v: unknown) => Number(v) || 0;

// Every figure on this page is read from the published records. When the
// API cannot be reached the page still renders, without the figures.
async function getHomeData(): Promise<HomeData> {
  const [stats, federal, stateUnis, privateUnis] = await Promise.all([
    api.getStats().catch(() => null),
    api.getUniversities(1, 100, { type: 'federal' }).catch(() => null),
    api.getUniversities(1, 1, { type: 'state' }).catch(() => null),
    api.getUniversities(1, 1, { type: 'private' }).catch(() => null),
  ]);
  const s = stats as (typeof stats & { by_state?: StateCount[] }) | null;
  const oldest = (federal?.schools || [])
    .filter((u) => u.established_year)
    .sort((a, b) => (a.established_year || 0) - (b.established_year || 0) || a.name.localeCompare(b.name))
    .slice(0, 6);
  return {
    total: num(s?.total_schools),
    universities: num(s?.universities),
    schools: num(s?.secondary_schools),
    states: num(s?.total_states),
    byState: s?.by_state || [],
    byType: federal && stateUnis && privateUnis
      ? {
          federal: federal.pagination.totalCount,
          state: stateUnis.pagination.totalCount,
          private: privateUnis.pagination.totalCount,
        }
      : null,
    oldest,
  };
}

const universityPath = (u: School) =>
  `/education/universities/${toSlugSegment(u.state)}/${toSlugSegment(u.city)}/${u.slug}/`;

const statePath = (row: StateCount) =>
  num(row.schools) > 0
    ? `/education/schools/${toSlugSegment(row.state)}/`
    : `/education/universities/${toSlugSegment(row.state)}/`;

const fmt = (n: number) => n.toLocaleString('en-NG');

export default async function HomePage() {
  const d = await getHomeData();
  const lead = d.oldest[0];
  const directory = verticals.map((v) => ({
    name: v.name,
    description: v.description,
    open: v.status === 'live',
    href: v.status === 'live' ? `/${v.slug}/${v.categories[0]?.slug || ''}/` : `/coming-soon/${v.slug}/`,
    status: v.status === 'live' ? (d.total ? `Open · ${fmt(d.total)}` : 'Open') : 'In preparation',
  }));
  // News is the second section to open, after Education.
  const sections = [
    directory[0],
    {
      name: 'News',
      description: "The day's most reported Nigerian stories, summarised with links to the full reports",
      open: true,
      href: '/news/',
      status: 'Daily',
    },
    ...directory.slice(1),
  ];
  const openCount = sections.filter((s) => s.open).length;
  const comingCount = sections.length - openCount;
  const words = ['None', 'One', 'Two', 'Three', 'Four', 'Five'];

  return (
    <>
      {/* ── Hero: the overprint sheet. The head hangs from column 1 and runs
             onto a green field that starts on column 8; where it crosses,
             its letters print in paper. ───────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div className="shell">
          <div className="relative">
          <div
            aria-hidden="true"
            className="field absolute inset-y-0 hidden lg:block"
            style={{ left: 'calc(7 * (100% + 2rem) / 12)', right: 'calc((100% - 100vw) / 2)' }}
          />
          <div className="relative grid min-h-[calc(100svh-72px)] grid-cols-1 lg:grid-cols-12 lg:gap-x-8">
            <div className="relative col-span-full pt-14 lg:pt-24">
              <h1 className="text-poster font-bold text-ink">
                Nigeria, listed
                <br />
                and checked.
              </h1>
              {/* The overprint: the same head in paper, shown only over the field */}
              <p
                aria-hidden="true"
                className="text-poster pointer-events-none absolute inset-x-0 top-14 hidden select-none font-display font-bold text-paper lg:top-24 lg:block"
                style={{ clipPath: 'inset(0 0 0 calc(7 * (100% + 2rem) / 12))' }}
              >
                Nigeria, listed
                <br />
                and checked.
              </p>
            </div>

            <div className="col-span-full pb-16 pt-10 lg:col-span-6 lg:pb-24 lg:pt-0">
              <p className="max-w-xl text-xl leading-snug text-ink-2 lg:text-[21px]">
                A national directory of Nigerian institutions, released one section at a time.
                Education is open: each university and secondary school here is confirmed
                against an independent source before it is published.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3">
                <Link href="/education/universities/" className="btn-primary">
                  Browse universities
                </Link>
                <Link href="/education/schools/" className="btn-secondary">
                  Secondary schools
                </Link>
              </div>
            </div>

            {/* The figure at the field's foot */}
            <div className="field -mx-4 px-4 py-10 sm:-mx-8 sm:px-8 lg:col-span-4 lg:col-start-9 lg:mx-0 lg:self-end lg:bg-transparent lg:px-0 lg:pb-24 lg:pt-0">
              {d.total > 0 && (
                <>
                  <p className="font-display text-[5.5rem] font-bold leading-none tracking-poster tabular lg:text-[8rem]">
                    {fmt(d.total)}
                  </p>
                  <p className="mt-3 text-[17px] font-medium">
                    published records: {fmt(d.universities)} universities and {fmt(d.schools)} secondary
                    schools, in {d.states} states and the FCT
                  </p>
                </>
              )}
            </div>
          </div>
          </div>
        </div>
      </section>

      <div className="shell flex justify-center py-6">
        <AdBanner slot="home-top-leaderboard" size="large-leaderboard" />
        <AdBanner slot="home-top-mobile" size="mobile-banner" />
      </div>

      {/* ── Open now: education, by category ─────────────────────────── */}
      <section className="py-24 lg:py-36">
        <div className="shell grid grid-cols-1 gap-x-8 gap-y-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 className="text-5xl lg:text-[3.25rem]">Education is open</h2>
            <p className="mt-5 max-w-sm text-lg text-ink-muted">
              The first section of the directory. Choose a category, then a state.
            </p>
          </div>

          <div className="lg:col-span-8">
            <Link
              href="/education/universities/"
              className="group grid grid-cols-[1fr_auto] items-end gap-x-6 border-b border-rule pb-8"
            >
              <span>
                <span className="block font-display text-4xl font-bold tracking-display transition-colors group-hover:text-secondary-500 lg:text-5xl">
                  Universities
                </span>
                {d.byType && (
                  <span className="mt-3 block text-ink-muted">
                    {fmt(d.byType.federal)} federal · {fmt(d.byType.state)} state · {fmt(d.byType.private)} private
                  </span>
                )}
              </span>
              <span className="font-display text-6xl font-bold leading-none tracking-poster tabular text-primary-700 lg:text-[5.5rem]">
                {d.universities ? fmt(d.universities) : '→'}
              </span>
            </Link>
            <Link
              href="/education/schools/"
              className="group grid grid-cols-[1fr_auto] items-end gap-x-6 border-b border-rule py-8"
            >
              <span>
                <span className="block font-display text-4xl font-bold tracking-display transition-colors group-hover:text-secondary-500 lg:text-5xl">
                  Secondary schools
                </span>
                <span className="mt-3 block text-ink-muted">
                  Federal unity colleges, state, mission, private and international schools
                </span>
              </span>
              <span className="font-display text-6xl font-bold leading-none tracking-poster tabular text-primary-700 lg:text-[5.5rem]">
                {d.schools ? fmt(d.schools) : '→'}
              </span>
            </Link>
            <div className="grid grid-cols-[1fr_auto] items-end gap-x-6 py-8 text-ink-muted">
              <span>
                <span className="block font-display text-4xl font-bold tracking-display lg:text-5xl">
                  Polytechnics and colleges
                </span>
                <span className="mt-3 block">Being checked now; published when every record is confirmed</span>
              </span>
              <span className="text-sm font-medium">Coming soon</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── The oldest universities on record: years as a specimen ──── */}
      {d.oldest.length > 0 && (
        <section className="bg-paper-2 py-24 lg:py-32">
          <div className="shell grid grid-cols-1 gap-x-8 gap-y-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <h2 className="text-5xl lg:text-[3.25rem]">The first generation</h2>
              <p className="mt-5 max-w-md text-lg text-ink-muted">
                The oldest federal universities in the directory, by the year each was founded.
              </p>
              {lead?.hero_image_url && (
                <Link href={universityPath(lead)} className="duotone-well mt-12 block aspect-square max-w-[416px] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={lead.hero_image_url}
                    alt={lead.name}
                    loading="lazy"
                    className="duotone h-full w-full object-cover"
                  />
                </Link>
              )}
            </div>
            <ol className="lg:col-span-7">
              {d.oldest.map((u, i) => (
                <li key={u.slug}>
                  <Link
                    href={universityPath(u)}
                    className={`group grid grid-cols-[7rem_1fr] items-baseline gap-x-6 py-6 sm:grid-cols-[10rem_1fr] ${i ? 'border-t border-rule' : ''}`}
                  >
                    <span
                      className={`font-display font-bold leading-none tracking-poster tabular transition-colors group-hover:text-secondary-500 ${i === 0 ? 'text-5xl sm:text-7xl text-primary-700' : 'text-4xl sm:text-6xl'}`}
                    >
                      {u.established_year}
                    </span>
                    <span>
                      <span className="block text-xl font-medium sm:text-2xl">{u.name}</span>
                      <span className="mt-1 block text-ink-muted">
                        {[u.city, u.state].filter(Boolean).join(', ')}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* ── By state: the index as a specimen ───────────────────────── */}
      {d.byState.length > 0 && (
        <section className="py-24 lg:py-36">
          <div className="shell">
            <div className="grid grid-cols-1 gap-x-8 gap-y-4 lg:grid-cols-12">
              <h2 className="text-5xl lg:col-span-5 lg:text-[3.25rem]">By state</h2>
              <p className="max-w-xl text-lg text-ink-muted lg:col-span-6 lg:col-start-7 lg:self-end">
                Every state with a published record, the largest first. The figure is the number of
                records in that state.
              </p>
            </div>
            <ul className="mt-14 flex flex-wrap items-baseline gap-x-7 gap-y-3 lg:gap-x-9">
              {d.byState.map((row) => {
                const total = num(row.schools) + num(row.universities);
                return (
                  <li key={row.state}>
                    <Link
                      href={statePath(row)}
                      className="font-display text-[2rem] font-bold leading-tight tracking-display transition-colors hover:text-secondary-500 sm:text-[2.6rem] lg:text-5xl"
                    >
                      {row.state}
                      <sup className="ml-1 font-sans text-sm font-medium tracking-normal text-ink-muted sm:text-base">
                        {total}
                      </sup>
                    </Link>
                  </li>
                );
              })}
            </ul>
            <p className="mt-12">
              <Link href="/education/universities/#states" className="btn-secondary">
                All 36 states and the FCT
              </Link>
            </p>
          </div>
        </section>
      )}

      {/* ── A statement, hung from column 4 ─────────────────────────── */}
      <section className="pb-24 lg:pb-36">
        <div className="shell grid grid-cols-1 lg:grid-cols-12 lg:gap-x-8">
          <p className="font-display text-4xl font-bold leading-[1.05] tracking-display lg:col-span-9 lg:col-start-4 lg:text-[3.75rem]">
            Nothing is listed until an independent source confirms it exists, and every page{' '}
            <Link href="/about/" className="text-primary-700 underline decoration-2 underline-offset-[0.12em] transition-colors hover:text-secondary-500">
              names its sources
            </Link>
            .
          </p>
        </div>
      </section>

      <div className="shell flex justify-center pb-16">
        <AdBanner slot="home-featured-infeed-1" size="large-rectangle" />
      </div>

      {/* ── The whole directory, section by section ─────────────────── */}
      <section className="bg-paper-2 py-24 lg:py-32">
        <div className="shell grid grid-cols-1 gap-x-8 gap-y-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <h2 className="text-5xl lg:text-[3.25rem]">One section at a time</h2>
            <p className="mt-5 max-w-sm text-lg text-ink-muted">
              The directory opens a section only when its records are checked. {words[openCount] || openCount}{' '}
              {openCount === 1 ? 'is' : 'are'} open; {comingCount} are in preparation.
            </p>
          </div>
          <ol className="lg:col-span-8">
            {sections.map((s, i) => {
              // Only open sections link anywhere; sections still in
              // preparation are listed as plain text, not linked to
              // placeholder pages.
              const row = `group grid grid-cols-[2.5rem_1fr_auto] items-baseline gap-x-4 py-5 sm:grid-cols-[3.5rem_1fr_auto] ${i ? 'border-t border-rule' : ''}`;
              const body = (
                <>
                  <span className="tabular text-sm font-medium text-ink-muted">{String(i + 1).padStart(2, '0')}</span>
                  <span>
                    <span className={`block font-display text-2xl font-bold tracking-display sm:text-3xl ${s.open ? 'transition-colors group-hover:text-secondary-500' : 'text-ink-2'}`}>
                      {s.name}
                    </span>
                    <span className="mt-1 block text-ink-muted">{s.description}</span>
                  </span>
                  <span className={`whitespace-nowrap text-sm font-medium ${s.open ? 'text-secondary-500' : 'text-ink-muted'}`}>
                    {s.status}
                  </span>
                </>
              );
              return (
                <li key={s.name}>
                  {s.open ? <Link href={s.href} className={row}>{body}</Link> : <div className={row}>{body}</div>}
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* ── For institutions: the one red field ─────────────────────── */}
      <section className="field--mark py-20 lg:py-28">
        <div className="shell grid grid-cols-1 gap-x-8 gap-y-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <h2 className="text-5xl lg:text-[3.25rem]">Run a school or university?</h2>
            <p className="mt-5 max-w-xl text-lg">
              Ask to manage your institution&apos;s page, send a correction with your source, or
              reach parents and students with an advertisement.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 lg:col-span-5 lg:justify-end">
            <Link href="/contact/" className="btn-primary">
              Contact the editors
            </Link>
            <Link href="/advertise/" className="btn-secondary">
              Advertise with us
            </Link>
          </div>
        </div>
      </section>

      {/* ── About ───────────────────────────────────────────────────── */}
      <section className="py-24 lg:py-32">
        <div className="shell grid grid-cols-1 gap-x-8 gap-y-8 lg:grid-cols-12">
          <h2 className="text-5xl lg:col-span-4 lg:text-[3.25rem]">About Nigerian Directory</h2>
          <div className="space-y-5 text-lg text-ink-2 lg:col-span-7 lg:col-start-6">
            <p>
              Nigerian Directory is a directory of institutions in Nigeria. Its first section covers
              education: universities and secondary schools across the 36 states and the Federal
              Capital Territory.
            </p>
            <p>
              Whether you are looking for a federal university in the north, a private university in
              Ogun State, or a unity college or mission school near home, each page gives the
              institution&apos;s history, what it teaches, where it is, and the sources the
              information came from.
            </p>
            <p>
              More sections, from health to business services, will open as their records are
              checked. Schools and universities can contact us to correct or manage their pages.
            </p>
          </div>
        </div>
        <div className="shell mt-20 flex justify-center">
          <AdBanner slot="home-bottom-billboard" size="billboard" />
          <AdBanner slot="home-bottom-mobile" size="mobile-large" />
        </div>
      </section>
    </>
  );
}
