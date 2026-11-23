'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { adminFetch, publicPath } from '@/lib/adminApi';

interface RecordRow {
  id: number;
  name: string;
  slug: string;
  institution_category: string;
  type?: string;
  state: string;
  city?: string;
  area?: string;
  website?: string;
  verification_status: 'verified' | 'unverified' | 'rejected';
  verification_source_name?: string;
  verification_source_url?: string;
  verification_notes?: string;
  words: number;
}
interface ListResponse {
  records: RecordRow[];
  summary: Array<{ institution_category: string; verification_status: string; n: number }>;
  pagination: { page: number; totalCount: number; totalPages: number };
}

const STATUS_STYLE: Record<string, string> = {
  verified: 'bg-green-100 text-green-700',
  unverified: 'bg-yellow-100 text-yellow-800',
  rejected: 'bg-gray-200 text-gray-600',
};
const TABS = [
  { value: 'unverified', label: 'Verification queue' },
  { value: 'verified', label: 'Published' },
  { value: 'rejected', label: 'Rejected' },
  { value: '', label: 'All' },
];

export default function RecordsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const status = params?.get('status') ?? 'unverified';
  const category = params?.get('category') || '';
  const q = params?.get('q') || '';
  const page = parseInt(params?.get('page') || '1');

  const [data, setData] = useState<ListResponse | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(q);

  const load = useCallback(() => {
    const qs = new URLSearchParams({ page: String(page), limit: '30' });
    if (status) qs.set('status', status);
    if (category) qs.set('category', category);
    if (q) qs.set('q', q);
    adminFetch<ListResponse>(`/admin/records?${qs}`).then(setData).catch((e) => setError(e.message));
  }, [page, status, category, q]);
  useEffect(load, [load]);

  const go = (changes: Record<string, string>) => {
    const qs = new URLSearchParams(params?.toString());
    qs.set('status', status);
    Object.entries(changes).forEach(([k, v]) => (v ? qs.set(k, v) : qs.delete(k)));
    if (!('page' in changes)) qs.delete('page');
    router.push(`/admin/schools?${qs}`);
  };

  const count = (cat: string, st: string) =>
    data?.summary.filter((s) => (!cat || s.institution_category === cat) && (!st || s.verification_status === st))
      .reduce((a, s) => a + s.n, 0) ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Directory records</h1>
        <p className="text-gray-500 text-sm mt-1">
          Only verified records are published. To publish a record from the queue, confirm it against an independent
          source (an official government list, a reference article or the institution&apos;s own website) and attach that
          source when you verify it.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button key={t.label} onClick={() => go({ status: t.value })}
            className={`px-4 py-2 rounded-lg text-sm font-medium border ${status === t.value ? 'bg-green-600 text-white border-green-600' : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
            {t.label} <span className="opacity-70">({count(category, t.value)})</span>
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-center">
        <select value={category} onChange={(e) => go({ category: e.target.value })}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white">
          <option value="">All categories</option>
          <option value="school">Secondary schools</option>
          <option value="university">Universities</option>
        </select>
        <form onSubmit={(e) => { e.preventDefault(); go({ q: search }); }} className="flex gap-2">
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name"
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white w-64" />
          <button className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Search</button>
        </form>
        {data && <span className="text-sm text-gray-400">{data.pagination.totalCount} records</span>}
      </div>

      {error && <div className="bg-red-50 text-red-700 rounded-lg p-4 text-sm">{error}</div>}
      {!data && !error && <div className="text-gray-400 py-16 text-center">Loading...</div>}

      {data && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-gray-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Source / note</th>
                <th className="px-4 py-3 font-medium text-right">Profile words</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.records.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link href={`/admin/schools/${r.id}`} className="font-medium text-gray-900 hover:text-green-700">{r.name}</Link>
                    <div className="text-xs text-gray-400">{r.institution_category}{r.type ? ` · ${r.type}` : ''}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{[r.area || r.city, r.state].filter(Boolean).join(', ')}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLE[r.verification_status]}`}>{r.verification_status}</span>
                    {r.verification_status === 'verified' && (
                      <a href={publicPath(r)} target="_blank" rel="noopener noreferrer" className="block text-xs text-green-700 hover:underline mt-1">View page</a>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-xs">
                    {r.verification_source_url
                      ? <a href={r.verification_source_url} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline">{r.verification_source_name || 'Source'}</a>
                      : <span className="line-clamp-2">{r.verification_notes || '—'}</span>}
                  </td>
                  <td className={`px-4 py-3 text-right ${r.words < 150 ? 'text-red-600' : 'text-gray-600'}`}>{r.words}</td>
                </tr>
              ))}
              {!data.records.length && (
                <tr><td colSpan={5} className="px-4 py-16 text-center text-gray-400">No records.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {data && data.pagination.totalPages > 1 && (
        <div className="flex items-center gap-3 justify-center">
          <button disabled={page <= 1} onClick={() => go({ page: String(page - 1) })}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm disabled:opacity-40">← Prev</button>
          <span className="text-sm text-gray-500">Page {page} / {data.pagination.totalPages}</span>
          <button disabled={page >= data.pagination.totalPages} onClick={() => go({ page: String(page + 1) })}
            className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm disabled:opacity-40">Next →</button>
        </div>
      )}
    </div>
  );
}
