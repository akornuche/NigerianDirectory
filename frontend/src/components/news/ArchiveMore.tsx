'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import MonthBlock from './MonthBlock';
import { formatMonth, monthPath, type NewsMonth } from '@/lib/news';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

/**
 * Keeps the archive going: when the reader nears the end, the next older
 * months load and are appended, with no page numbers. The trigger is a real
 * link to the older month's own page, so crawlers and readers without
 * JavaScript can still walk the whole archive.
 */
export default function ArchiveMore({ next: initialNext }: { next: string | null }) {
  const [months, setMonths] = useState<NewsMonth[]>([]);
  const [next, setNext] = useState<string | null>(initialNext);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const sentinel = useRef<HTMLAnchorElement>(null);

  const load = useCallback(async () => {
    if (!next || loading) return;
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(`${API_URL}/news/months?before=${next}&limit=2`);
      if (!res.ok) throw new Error(String(res.status));
      const data: { months: NewsMonth[]; next: string | null } = await res.json();
      setMonths((m) => [...m, ...data.months]);
      setNext(data.next);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [next, loading]);

  useEffect(() => {
    const el = sentinel.current;
    if (!el || !next || failed) return;
    const io = new IntersectionObserver((entries) => entries[0].isIntersecting && load(), { rootMargin: '800px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [next, load, failed]);

  return (
    <>
      {months.map((m) => (
        <MonthBlock key={m.month} month={m} />
      ))}
      {next && (
        <p className="pt-16">
          <a
            ref={sentinel}
            href={monthPath(next)}
            onClick={(e) => {
              e.preventDefault();
              load();
            }}
            className="btn-secondary"
          >
            {loading ? 'Loading…' : failed ? `Try again: ${formatMonth(next)}` : `Older: ${formatMonth(next)}`}
          </a>
        </p>
      )}
    </>
  );
}
