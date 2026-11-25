import Link from 'next/link';
import DayCard from './DayCard';
import { formatMonth, monthPath, type NewsMonth } from '@/lib/news';

/** A month heading over its days as a grid of cards, newest first. */
export default function MonthBlock({ month }: { month: NewsMonth }) {
  const stories = month.days.reduce((n, d) => n + d.story_count, 0);
  return (
    <section className="pt-16 lg:pt-24" aria-labelledby={`m-${month.month}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-2">
        <h2 id={`m-${month.month}`} className="text-5xl lg:text-[3.25rem]">
          <Link href={monthPath(month.month)} className="transition-colors hover:text-secondary-500">
            {formatMonth(month.month)}
          </Link>
        </h2>
        <p className="text-ink-muted">
          {month.days.length} {month.days.length === 1 ? 'day' : 'days'} · {stories.toLocaleString('en-NG')} stories
        </p>
      </div>
      <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
        {month.days.map((d) => (
          <li key={d.day}>
            <DayCard day={d} />
          </li>
        ))}
      </ul>
    </section>
  );
}
