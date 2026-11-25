'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { adminFetch } from '@/lib/adminApi';
import SortHeader, { type SortDir } from '@/components/admin/SortHeader';

interface Day { day: string; status: 'draft' | 'published'; story_count: number; published_at: string | null; updated_at: string }
type Action = 'publish' | 'unpublish' | 'delete';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Drafts' },
  { key: 'published', label: 'Published' },
] as const;

const fmt = (d: string) =>
  new Date(`${d.slice(0, 10)}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });

export default function NewsReviewList() {
  const [days, setDays] = useState<Day[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<'all' | 'draft' | 'published'>('all');
  const [sort, setSort] = useState('day');
  const [dir, setDir] = useState<SortDir>('asc');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const load = useCallback(() => {
    adminFetch<{ days: Day[] }>('/admin/news')
      .then((d) => setDays(d.days || []))
      .catch((e) => setMsg({ ok: false, text: e.message }))
      .finally(() => setLoaded(true));
  }, []);
  useEffect(load, [load]);

  const visible = useMemo(() => {
    const key: Record<string, (d: Day) => string | number> = {
      day: (d) => d.day,
      stories: (d) => d.story_count,
      status: (d) => d.status,
      updated: (d) => d.updated_at || '',
    };
    const k = key[sort] || key.day;
    return days
      .filter((d) => tab === 'all' || d.status === tab)
      .sort((a, b) => {
        const x = k(a), y = k(b);
        const c = x < y ? -1 : x > y ? 1 : a.day.localeCompare(b.day);
        return dir === 'asc' ? c : -c;
      });
  }, [days, tab, sort, dir]);

  // Keep the selection to rows that are still visible after filtering.
  const visibleSelected = visible.filter((d) => selected.has(d.day));
  const allVisibleSelected = visible.length > 0 && visibleSelected.length === visible.length;

  const toggle = (day: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day); else next.add(day);
      return next;
    });
  const toggleAll = () =>
    setSelected(allVisibleSelected ? new Set() : new Set(visible.map((d) => d.day)));

  const run = async (action: Action) => {
    const chosen = visibleSelected.map((d) => d.day);
    if (!chosen.length) return;
    if (action === 'delete') {
      const stories = visibleSelected.reduce((n, d) => n + d.story_count, 0);
      const ok = confirm(
        `Delete ${chosen.length} day${chosen.length === 1 ? '' : 's'} and their ${stories} stories?\n\n` +
        'This cannot be undone. Published days will disappear from the site.'
      );
      if (!ok) return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const r = await adminFetch<{ changed: number; requested: number }>('/admin/news/bulk', {
        method: 'POST',
        body: JSON.stringify({ action, days: chosen }),
      });
      const verb = action === 'publish' ? 'Published' : action === 'unpublish' ? 'Moved back to draft' : 'Deleted';
      const skipped = r.requested - r.changed;
      setMsg({
        ok: true,
        text: `${verb} ${r.changed} day${r.changed === 1 ? '' : 's'}.` +
          (skipped ? ` ${skipped} skipped (already in that state${action === 'publish' ? ', or no stories' : ''}).` : ''),
      });
      setSelected(new Set());
      load();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const drafts = days.filter((d) => d.status === 'draft').length;
  const counts = { all: days.length, draft: drafts, published: days.length - drafts };
  const onSort = (column: string, d: SortDir) => { setSort(column); setDir(d); };
  const selDrafts = visibleSelected.filter((d) => d.status === 'draft').length;
  const selPublished = visibleSelected.length - selDrafts;

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900">News review</h1>
      <p className="mt-1 text-sm text-gray-500">
        Each day is a draft until you publish it. {drafts} {drafts === 1 ? 'day is' : 'days are'} waiting for review.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-2">
        {STATUS_TABS.map((t) => (
          <button key={t.key} onClick={() => { setTab(t.key); setSelected(new Set()); }}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${tab === t.key ? 'bg-gray-900 text-white' : 'border border-gray-200 bg-white text-gray-600 hover:bg-gray-50'}`}>
            {t.label} <span className="ml-1 tabular-nums opacity-70">{counts[t.key]}</span>
          </button>
        ))}
      </div>

      {/* Bulk action bar: appears when something is selected */}
      <div className={`sticky top-0 z-10 mt-4 flex flex-wrap items-center gap-3 rounded-lg border px-4 py-3 text-sm ${visibleSelected.length ? 'border-green-200 bg-green-50' : 'border-gray-100 bg-white'}`}>
        <span className="font-medium text-gray-800">
          {visibleSelected.length ? `${visibleSelected.length} selected` : 'Select days to act on several at once'}
        </span>
        {visibleSelected.length > 0 && (
          <>
            <button disabled={busy || !selDrafts} onClick={() => run('publish')}
              className="rounded bg-green-700 px-3 py-1.5 font-semibold text-white hover:bg-green-800 disabled:opacity-40">
              Publish{selDrafts ? ` (${selDrafts})` : ''}
            </button>
            <button disabled={busy || !selPublished} onClick={() => run('unpublish')}
              className="rounded border border-gray-300 bg-white px-3 py-1.5 text-gray-700 hover:bg-gray-50 disabled:opacity-40">
              Unpublish{selPublished ? ` (${selPublished})` : ''}
            </button>
            <button disabled={busy} onClick={() => run('delete')}
              className="rounded border border-red-200 bg-white px-3 py-1.5 text-red-700 hover:bg-red-50 disabled:opacity-40">
              Delete
            </button>
            <button disabled={busy} onClick={() => setSelected(new Set())} className="text-gray-500 hover:underline">
              Clear
            </button>
          </>
        )}
        {busy && <span className="text-gray-500">Working…</span>}
      </div>

      {msg && <p className={`mt-3 text-sm ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}

      <div className="mt-4 overflow-x-auto rounded-lg border border-gray-100 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="w-10 px-4 py-3 text-left">
                <input type="checkbox" aria-label="Select all visible days" checked={allVisibleSelected}
                  ref={(el) => { if (el) el.indeterminate = visibleSelected.length > 0 && !allVisibleSelected; }}
                  onChange={toggleAll} className="h-4 w-4 accent-green-700" />
              </th>
              <SortHeader label="Day" column="day" sort={sort} dir={dir} onSort={onSort} />
              <SortHeader label="Stories" column="stories" sort={sort} dir={dir} onSort={onSort} align="right" />
              <SortHeader label="Status" column="status" sort={sort} dir={dir} onSort={onSort} />
              <SortHeader label="Updated" column="updated" sort={sort} dir={dir} onSort={onSort} />
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {visible.map((d) => (
              <tr key={d.day} className={`border-t border-gray-100 ${selected.has(d.day) ? 'bg-green-50/60' : 'hover:bg-gray-50'}`}>
                <td className="px-4 py-3">
                  <input type="checkbox" aria-label={`Select ${d.day}`} checked={selected.has(d.day)}
                    onChange={() => toggle(d.day)} className="h-4 w-4 accent-green-700" />
                </td>
                <td className="px-4 py-3 font-medium text-gray-900">{fmt(d.day)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{d.story_count}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${d.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                    {d.status === 'published' ? 'Published' : 'Draft'}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-gray-500">
                  {d.updated_at ? new Date(d.updated_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : '-'}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/news/${d.day}/`} className="font-medium text-green-700 hover:underline">
                    {d.status === 'draft' ? 'Review' : 'Open'}
                  </Link>
                </td>
              </tr>
            ))}
            {loaded && !visible.length && (
              <tr><td className="px-4 py-6 text-gray-500" colSpan={6}>No days here.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
