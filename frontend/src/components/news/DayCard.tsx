import Link from 'next/link';
import { dayPath, weekday, type NewsDaySummary } from '@/lib/news';

/** One day in the archive: the date large, the story count and its top headlines. */
export default function DayCard({ day }: { day: NewsDaySummary }) {
  return (
    <Link href={dayPath(day.day)} className="group flex h-full flex-col bg-white p-6 transition-colors hover:bg-paper-2 lg:p-7">
      <div className="flex items-baseline justify-between gap-4">
        <span className="font-display text-6xl font-bold leading-none tracking-poster tabular transition-colors group-hover:text-secondary-500">
          {day.day.slice(8, 10)}
        </span>
        <span className="text-sm font-medium text-ink-muted">{day.story_count} stories</span>
      </div>
      <p className="mt-2 font-medium text-primary-700">{weekday(day.day)}</p>
      <ul className="mt-5 space-y-2.5 text-[15px] leading-snug text-ink-2">
        {day.headlines.map((h) => (
          <li key={h} className="line-clamp-2">{h}</li>
        ))}
      </ul>
    </Link>
  );
}
