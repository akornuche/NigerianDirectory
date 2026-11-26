'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { dayPath, formatDay } from '@/lib/news';

/**
 * Search box and date picker for the news archive. The search is a plain
 * GET form, so it works without JavaScript; the date picker only offers the
 * range of published days and says so when a day has no digest.
 */
export default function NewsFinder({ days, defaultQuery = '' }: { days: string[]; defaultQuery?: string }) {
  const router = useRouter();
  const [msg, setMsg] = useState('');
  const published = new Set(days);
  const newest = days[0];
  const oldest = days[days.length - 1];

  const pick = (value: string) => {
    if (!value) return;
    if (published.has(value)) {
      setMsg('');
      router.push(dayPath(value));
    } else {
      const nearest = days.reduce((best, d) =>
        Math.abs(Date.parse(d) - Date.parse(value)) < Math.abs(Date.parse(best) - Date.parse(value)) ? d : best, newest);
      setMsg(`There is no digest for ${formatDay(value)}. The nearest is ${formatDay(nearest)}.`);
    }
  };

  const field = 'min-h-[48px] w-full border border-rule bg-white px-4 text-base text-ink focus:border-ink focus:outline-none';

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:gap-8">
      <form action="/news/search/" method="get" role="search" className="lg:col-span-8">
        <label htmlFor="news-q" className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
          Search the archive
        </label>
        <div className="mt-2 flex gap-2">
          <input
            id="news-q"
            name="q"
            type="search"
            minLength={2}
            required
            defaultValue={defaultQuery}
            placeholder="e.g. Dangote refinery, ASUU strike, Plateau"
            className={field}
          />
          <button type="submit" className="btn-primary min-h-[48px] shrink-0">Search</button>
        </div>
      </form>
      {newest && (
        <div className="lg:col-span-4">
          <label htmlFor="news-date" className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
            Go to a day
          </label>
          <input
            id="news-date"
            type="date"
            min={oldest}
            max={newest}
            onChange={(e) => pick(e.target.value)}
            className={`${field} mt-2`}
          />
          {msg && <p className="mt-2 text-sm text-ink-2" role="status">{msg}</p>}
        </div>
      )}
    </div>
  );
}
