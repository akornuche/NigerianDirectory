'use client';

import { adminFetch, publicPath } from '@/lib/adminApi';
import SortHeader, { type SortDir } from '@/components/admin/SortHeader';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';

interface RecordHealth {
  id: number;
  name: string;
  slug: string;
  state: string;
  city: string | null;
  area: string | null;
  type: string;
  institution_category: string;
  indexable: boolean;
  original_words: number;
  has_history: boolean;
  has_academics: boolean;
  has_campus: boolean;
  has_student_life: boolean;
  has_meta_title: boolean;
  has_meta_desc: boolean;
  has_hero_image: boolean;
  has_website: boolean;
  page_score: number;
  updated_at: string | null;
}

interface HealthResponse {
  summary: {
    total: number; universities: number; schools: number; indexable: number; not_indexable: number;
    has_photo: number; has_seo: number; has_website: number; avg_page_score: number;
  };
  schools: RecordHealth[];
  pagination: { page: number; limit: number; totalCount: number; totalPages: number };
}

const OK = <CheckCircleIcon className="h-4 w-4 text-green-500 mx-auto" aria-label="yes" />;
const NO = <XCircleIcon className="h-4 w-4 text-red-400 mx-auto" aria-label="no" />;

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 80 ? 'bg-green-100 text-green-700'
            : score >= 55 ? 'bg-yellow-100 text-yellow-700'
            : 'bg-red-100 text-red-700';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{score}</span>;
}

const CATEGORIES = [
  { key: 'all', label: 'All records' },
  { key: 'university', label: 'Universities' },
  { key: 'school', label: 'Secondary schools' },
];

const ISSUES = [
  { key: 'all', label: 'Everything' },
  { key: 'not_indexable', label: 'Not indexable' },
  { key: 'missing_photo', label: 'No photo' },
  { key: 'missing_seo', label: 'Missing SEO text' },
  { key: 'missing_website', label: 'No website' },
];

export default function PageHealthPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const category = searchParams?.get('category') || 'all';
  const issue = searchParams?.get('issue') || searchParams?.get('filter') || 'all';
  const sort = searchParams?.get('sort') || 'score';
  const dir = (searchParams?.get('dir') as SortDir) || 'asc';
  const q = searchParams?.get('q') || '';
  const page = parseInt(searchParams?.get('page') || '1');

  const [data, setData] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState(q);

  const go = useCallback((changes: Record<string, string | number>) => {
    const params = new URLSearchParams({ category, issue, sort, dir, q, page: String(page) });
    Object.entries(changes).forEach(([k, v]) => params.set(k, String(v)));
    if (!('page' in changes)) params.set('page', '1');
    if (!params.get('q')) params.delete('q');
    router.push(`/admin/page-health?${params}`);
  }, [category, issue, sort, dir, q, page, router]);

  useEffect(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams({ category, issue, sort, dir, page: String(page), limit: '50' });
    if (q) params.set('q', q);
    adminFetch<HealthResponse>(`/admin/page-health?${params}`)
      .then((d) => setData(d))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [category, issue, sort, dir, q, page]);

  const s = data?.summary;
  const onSort = (column: string, d: SortDir) => go({ sort: column, dir: d });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Page Health</h1>
        <p className="text-gray-500 text-sm mt-1">
          Content and SEO coverage per record. &ldquo;Indexable&rdquo; uses the same rule as the public site: only
          indexable pages are in the sitemap and open to Google.
        </p>
      </div>

      {s && (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {[
            { label: 'Records', value: s.total, sub: `${s.universities} universities · ${s.schools} schools` },
            { label: 'Indexable', value: s.indexable, sub: `${s.total ? Math.round((s.indexable / s.total) * 100) : 0}% open to Google` },
            { label: 'Not indexable', value: s.not_indexable, sub: 'too little original text', warn: s.not_indexable > 0 },
            { label: 'With photo', value: s.has_photo, sub: `of ${s.total}` },
            { label: 'With SEO text', value: s.has_seo, sub: 'title and description' },
            { label: 'Avg score', value: `${s.avg_page_score}/100`, sub: `${s.has_website} with website` },
          ].map((item) => (
            <div key={item.label} className={`bg-white rounded-xl p-4 shadow-sm border text-center ${item.warn ? 'border-amber-200' : 'border-gray-100'}`}>
              <div className="text-2xl font-bold text-gray-900">{item.value}</div>
              <div className="text-xs font-medium text-gray-600 mt-0.5">{item.label}</div>
              <div className="text-[11px] text-gray-400 mt-0.5">{item.sub}</div>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((c) => (
          <button key={c.key} onClick={() => go({ category: c.key })}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              category === c.key ? 'bg-gray-900 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {c.label}
          </button>
        ))}
        <span className="mx-1 h-5 w-px bg-gray-200" />
        {ISSUES.map((f) => (
          <button key={f.key} onClick={() => go({ issue: f.key })}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              issue === f.key ? 'bg-green-600 text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}>
            {f.label}
          </button>
        ))}
        <form className="ml-auto" onSubmit={(e) => { e.preventDefault(); go({ q: search.trim() }); }}>
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name"
            className="w-56 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-green-600 focus:outline-none" />
        </form>
      </div>

      {loading && <div className="text-gray-400 py-16 text-center">Loading...</div>}
      {error && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div>}

      {!loading && data && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs text-gray-500">
                <tr>
                  <SortHeader label="Record" column="name" sort={sort} dir={dir} onSort={onSort} />
                  <SortHeader label="Score" column="score" sort={sort} dir={dir} onSort={onSort} align="center" />
                  <th className="px-4 py-3 text-center font-semibold">Indexable</th>
                  <SortHeader label="Words" column="words" sort={sort} dir={dir} onSort={onSort} align="right" />
                  <th className="px-3 py-3 text-center font-semibold">History</th>
                  <th className="px-3 py-3 text-center font-semibold">Academics</th>
                  <th className="px-3 py-3 text-center font-semibold">Campus</th>
                  <th className="px-3 py-3 text-center font-semibold">Student life</th>
                  <th className="px-3 py-3 text-center font-semibold">Photo</th>
                  <th className="px-3 py-3 text-center font-semibold">SEO</th>
                  <th className="px-3 py-3 text-center font-semibold">Website</th>
                  <SortHeader label="State" column="state" sort={sort} dir={dir} onSort={onSort} />
                  <SortHeader label="Updated" column="updated" sort={sort} dir={dir} onSort={onSort} />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.schools.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <a href={publicPath(r)} target="_blank" rel="noopener" className="font-medium text-gray-900 hover:text-green-700">
                        {r.name}
                      </a>
                      <div className="text-xs text-gray-400">
                        <span className="capitalize">{r.type}</span> {r.institution_category === 'university' ? 'university' : 'school'} ·{' '}
                        <Link href={`/admin/schools/${r.id}/`} className="text-green-700 hover:underline">Edit</Link>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center"><ScoreBadge score={r.page_score} /></td>
                    <td className="px-4 py-3 text-center">
                      {r.indexable
                        ? <span className="text-xs font-medium text-green-700">Yes</span>
                        : <span className="text-xs font-medium text-red-600">No</span>}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-gray-700">{r.original_words}</td>
                    <td className="px-3 py-3 text-center">{r.has_history ? OK : NO}</td>
                    <td className="px-3 py-3 text-center">{r.has_academics ? OK : NO}</td>
                    <td className="px-3 py-3 text-center">{r.has_campus ? OK : NO}</td>
                    <td className="px-3 py-3 text-center">{r.has_student_life ? OK : NO}</td>
                    <td className="px-3 py-3 text-center">{r.has_hero_image ? OK : NO}</td>
                    <td className="px-3 py-3 text-center">
                      {r.has_meta_title && r.has_meta_desc ? OK : <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400 mx-auto" />}
                    </td>
                    <td className="px-3 py-3 text-center">{r.has_website ? OK : NO}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{r.state}</td>
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                      {r.updated_at ? new Date(r.updated_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {data.schools.length === 0 && <div className="py-16 text-center text-gray-400">No records match.</div>}
          </div>

          {data.pagination.totalPages > 1 && (
            <div className="flex items-center gap-3 justify-center pt-2">
              <button disabled={page <= 1} onClick={() => go({ page: page - 1 })}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40">
                ← Prev
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {data.pagination.totalPages} · {data.pagination.totalCount} records
              </span>
              <button disabled={page >= data.pagination.totalPages} onClick={() => go({ page: page + 1 })}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40">
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
