'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { adminFetch } from '@/lib/adminApi';

interface Item { id: number; rank: number; headline: string; summary: string; category: string; states: string[]; sources: { name: string; url: string }[] }
interface Day { day: string; lead: string | null; status: 'draft' | 'published'; published_at: string | null }

const field = 'w-full rounded border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none';

function ItemEditor({ date, item, categories, onChanged }: { date: string; item: Item; categories: string[]; onChanged: () => void }) {
  const [edit, setEdit] = useState(false);
  const [draft, setDraft] = useState({ headline: item.headline, summary: item.summary, category: item.category, states: item.states.join(', ') });
  const [msg, setMsg] = useState('');

  const save = async () => {
    setMsg('');
    try {
      await adminFetch(`/admin/news/${date}/items/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...draft, states: draft.states.split(',').map((s) => s.trim()).filter(Boolean) }),
      });
      setEdit(false);
      onChanged();
    } catch (e) { setMsg((e as Error).message); }
  };
  const drop = async () => {
    if (!confirm(`Drop story ${item.rank}? The stories below it move up.`)) return;
    try { await adminFetch(`/admin/news/${date}/items/${item.id}`, { method: 'DELETE' }); onChanged(); }
    catch (e) { setMsg((e as Error).message); }
  };

  return (
    <li className="border-t border-gray-100 bg-white p-4">
      <div className="flex gap-4">
        <span className="w-8 flex-shrink-0 text-lg font-bold tabular-nums text-gray-400">{item.rank}</span>
        <div className="flex-1">
          {edit ? (
            <div className="space-y-2">
              <input className={field} value={draft.headline} onChange={(e) => setDraft({ ...draft, headline: e.target.value })} />
              <textarea className={field} rows={4} value={draft.summary} onChange={(e) => setDraft({ ...draft, summary: e.target.value })} />
              <div className="flex gap-2">
                <select className={field} value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}>
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <input className={field} placeholder="States, comma separated" value={draft.states} onChange={(e) => setDraft({ ...draft, states: e.target.value })} />
              </div>
              <div className="flex gap-2">
                <button onClick={save} className="rounded bg-green-700 px-3 py-1.5 text-sm font-medium text-white">Save</button>
                <button onClick={() => setEdit(false)} className="px-3 py-1.5 text-sm text-gray-600">Cancel</button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500">{item.category}{item.states.length ? ` · ${item.states.join(', ')}` : ''}</p>
              <p className="mt-1 font-semibold text-gray-900">{item.headline}</p>
              <p className="mt-1 text-sm text-gray-700">{item.summary}</p>
              <p className="mt-2 text-xs text-gray-500">
                {item.sources.map((s, i) => (
                  <span key={s.url}>{i > 0 && ' · '}<a href={s.url} target="_blank" rel="noopener" className="text-green-700 hover:underline">{s.name}</a></span>
                ))}
              </p>
            </>
          )}
          {msg && <p className="mt-1 text-xs text-red-600">{msg}</p>}
        </div>
        {!edit && (
          <div className="flex flex-shrink-0 flex-col gap-1 text-sm">
            <button onClick={() => setEdit(true)} className="text-green-700 hover:underline">Edit</button>
            <button onClick={drop} className="text-red-600 hover:underline">Drop</button>
          </div>
        )}
      </div>
    </li>
  );
}

export default function NewsReviewDay() {
  const date = useParams<{ date: string }>()?.date || '';
  const [day, setDay] = useState<Day | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [lead, setLead] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(() => {
    adminFetch<{ day: Day; items: Item[]; categories: string[] }>(`/admin/news/${date}`)
      .then((d) => { setDay(d.day); setItems(d.items); setCategories(d.categories); setLead(d.day.lead || ''); })
      .catch((e) => setMsg(e.message));
  }, [date]);
  useEffect(load, [load]);

  const patchDay = async (body: Record<string, string>, done: string) => {
    setMsg('');
    try { await adminFetch(`/admin/news/${date}`, { method: 'PATCH', body: JSON.stringify(body) }); setMsg(done); load(); }
    catch (e) { setMsg((e as Error).message); }
  };

  if (!day) return <p className="text-sm text-gray-500">{msg || 'Loading…'}</p>;
  const publicUrl = `/news/${date.slice(0, 4)}/${date.slice(5, 7)}/${date.slice(8, 10)}/`;

  return (
    <div className="max-w-4xl">
      <Link href="/admin/news/" className="text-sm text-gray-500 hover:underline">← All days</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{date}</h1>
          <p className="text-sm text-gray-500">
            {items.length} stories · {day.status === 'published' ? <>published · <a href={publicUrl} target="_blank" rel="noopener" className="text-green-700 hover:underline">view page</a></> : 'draft'}
          </p>
        </div>
        {day.status === 'draft' ? (
          <button onClick={() => patchDay({ status: 'published' }, 'Published.')} className="rounded bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800">
            Publish this day
          </button>
        ) : (
          <button onClick={() => patchDay({ status: 'draft' }, 'Moved back to draft.')} className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700">
            Unpublish
          </button>
        )}
      </div>
      {msg && <p className="mt-3 text-sm text-gray-700">{msg}</p>}

      <div className="mt-6 bg-white p-4">
        <label className="text-sm font-medium text-gray-700">The day in brief</label>
        <textarea className={`${field} mt-1`} rows={4} value={lead} onChange={(e) => setLead(e.target.value)} />
        <button onClick={() => patchDay({ lead }, 'Saved.')} className="mt-2 rounded bg-gray-900 px-3 py-1.5 text-sm text-white">Save summary</button>
      </div>

      <ol className="mt-6">
        {items.map((i) => <ItemEditor key={`${i.id}-${i.rank}`} date={date} item={i} categories={categories} onChanged={load} />)}
      </ol>
    </div>
  );
}
