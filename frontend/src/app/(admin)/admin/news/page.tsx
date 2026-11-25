'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminFetch } from '@/lib/adminApi';

interface Day { day: string; status: 'draft' | 'published'; story_count: number; published_at: string | null; updated_at: string }

export default function NewsReviewList() {
  const [days, setDays] = useState<Day[]>([]);
  const [msg, setMsg] = useState('');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    adminFetch<{ days: Day[] }>('/admin/news')
      .then((d) => setDays(d.days || []))
      .catch((e) => setMsg(e.message))
      .finally(() => setLoaded(true));
  }, []);

  const drafts = days.filter((d) => d.status === 'draft').length;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">News review</h1>
      <p className="mt-1 text-sm text-gray-500">
        Each day is a draft until you publish it. {drafts} {drafts === 1 ? 'day is' : 'days are'} waiting for review.
      </p>
      {msg && <p className="mt-4 text-sm text-red-600">{msg}</p>}
      <table className="mt-6 w-full bg-white text-sm">
        <thead className="text-left text-gray-500">
          <tr><th className="p-3">Day</th><th className="p-3">Stories</th><th className="p-3">Status</th><th className="p-3" /></tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.day} className="border-t border-gray-100">
              <td className="p-3 font-medium">{d.day}</td>
              <td className="p-3 tabular-nums">{d.story_count}</td>
              <td className="p-3">
                <span className={d.status === 'published' ? 'text-green-700' : 'text-amber-700'}>
                  {d.status === 'published' ? 'Published' : 'Draft'}
                </span>
              </td>
              <td className="p-3 text-right">
                <Link href={`/admin/news/${d.day}/`} className="font-medium text-green-700 hover:underline">
                  {d.status === 'draft' ? 'Review' : 'Open'}
                </Link>
              </td>
            </tr>
          ))}
          {loaded && !days.length && (
            <tr><td className="p-3 text-gray-500" colSpan={4}>No days yet.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
