'use client';

import { adminFetch } from '@/lib/adminApi';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';


interface SchoolHealth {
  id: number;
  name: string;
  slug: string;
  state: string;
  city: string;
  area: string;
  type: string;
  has_history: boolean;
  has_academics: boolean;
  has_campus: boolean;
  has_student_life: boolean;
  has_meta_title: boolean;
  has_meta_desc: boolean;
  has_hero_image: boolean;
  has_logo: boolean;
  page_score: number;
  enriched_at: string | null;
}

interface HealthResponse {
  summary: { total_schools: string; has_content: string; has_images: string; has_meta: string; avg_page_score: string };
  schools: SchoolHealth[];
  pagination: { page: number; limit: number; totalCount: number; totalPages: number };
}

const OK   = <CheckCircleIcon className="h-4 w-4 text-green-500 mx-auto" />;
const FAIL = <XCircleIcon className="h-4 w-4 text-red-400 mx-auto" />;

function ScoreBadge({ score }: { score: number }) {
  const cls = score >= 80 ? 'bg-green-100 text-green-700'
            : score >= 40 ? 'bg-yellow-100 text-yellow-700'
            : 'bg-red-100 text-red-700';
  return <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>{score}</span>;
}

const FILTERS = [
  { key: 'all',             label: 'All Schools' },
  { key: 'missing_content', label: 'Missing Content' },
  { key: 'missing_images',  label: 'Missing Images' },
  { key: 'missing_meta',    label: 'Missing SEO' },
];

export default function PageHealthPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const filter = searchParams?.get('filter') || 'all';
  const page   = parseInt(searchParams?.get('page') || '1');

  const [data, setData]       = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const fetchData = useCallback(() => {
    setLoading(true);
    setError('');
    adminFetch<typeof data>(`/admin/page-health?filter=${filter}&page=${page}&limit=50`)
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [filter, page]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const go = (f: string, p = 1) => router.push(`/admin/page-health?filter=${f}&page=${p}`);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Page Health</h1>
        <p className="text-gray-500 text-sm mt-1">Content enrichment and SEO coverage per school</p>
      </div>

      {/* Summary cards */}
      {data?.summary && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: 'Total Schools',  value: data.summary.total_schools },
            { label: 'Has Content',    value: data.summary.has_content },
            { label: 'Has Images',     value: data.summary.has_images },
            { label: 'Has SEO Meta',   value: data.summary.has_meta },
            { label: 'Avg Score',      value: `${parseFloat(data.summary.avg_page_score).toFixed(1)}/100` },
          ].map(item => (
            <div key={item.label} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 text-center">
              <div className="text-2xl font-bold text-gray-900">{item.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {FILTERS.map(f => (
          <button key={f.key} onClick={() => go(f.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === f.key
                ? 'bg-green-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>
            {f.label}
          </button>
        ))}
      </div>

      {loading && <div className="text-gray-400 py-16 text-center">Loading...</div>}
      {error   && <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">{error}</div>}

      {!loading && data && (
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left">School</th>
                  <th className="px-4 py-3 text-center">Score</th>
                  <th className="px-4 py-3 text-center">History</th>
                  <th className="px-4 py-3 text-center">Academics</th>
                  <th className="px-4 py-3 text-center">Campus</th>
                  <th className="px-4 py-3 text-center">Student Life</th>
                  <th className="px-4 py-3 text-center">Image</th>
                  <th className="px-4 py-3 text-center">SEO</th>
                  <th className="px-4 py-3 text-left">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {data.schools.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/education/schools/${s.state.toLowerCase().replace(/\s+/g,'-')}/${(s.area||s.city||'').toLowerCase().replace(/\s+/g,'-')}/${s.slug}/`}
                        target="_blank"
                        className="font-medium text-gray-900 hover:text-green-600 transition-colors"
                      >
                        {s.name}
                      </Link>
                      <div className="text-xs text-gray-400 capitalize">{s.type}</div>
                    </td>
                    <td className="px-4 py-3 text-center"><ScoreBadge score={s.page_score} /></td>
                    <td className="px-4 py-3 text-center">{s.has_history      ? OK : FAIL}</td>
                    <td className="px-4 py-3 text-center">{s.has_academics    ? OK : FAIL}</td>
                    <td className="px-4 py-3 text-center">{s.has_campus       ? OK : FAIL}</td>
                    <td className="px-4 py-3 text-center">{s.has_student_life ? OK : FAIL}</td>
                    <td className="px-4 py-3 text-center">{s.has_hero_image   ? OK : FAIL}</td>
                    <td className="px-4 py-3 text-center">
                      {s.has_meta_title && s.has_meta_desc
                        ? OK
                        : <ExclamationTriangleIcon className="h-4 w-4 text-yellow-400 mx-auto" />}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{s.state}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data.schools.length === 0 && (
              <div className="py-16 text-center text-gray-400">No schools match this filter.</div>
            )}
          </div>

          {/* Pagination */}
          {data.pagination.totalPages > 1 && (
            <div className="flex items-center gap-3 justify-center pt-2">
              <button disabled={page <= 1} onClick={() => go(filter, page - 1)}
                className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40">
                ← Prev
              </button>
              <span className="text-sm text-gray-500">
                Page {page} of {data.pagination.totalPages} &nbsp;·&nbsp; {data.pagination.totalCount} schools
              </span>
              <button disabled={page >= data.pagination.totalPages} onClick={() => go(filter, page + 1)}
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
