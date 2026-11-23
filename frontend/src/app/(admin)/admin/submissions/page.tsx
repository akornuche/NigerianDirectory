'use client';

import { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

interface Submission {
  id: number;
  uuid: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  submission_type: string;
  school_id?: number;
  school_name?: string;
  requester_role?: string;
  organisation_name?: string;
  verification_notes?: string;
  status: string;
  admin_notes?: string;
  created_at: string;
}

const TYPE_COLORS: Record<string, string> = {
  contact:          'bg-blue-100 text-blue-700',
  school_ownership: 'bg-purple-100 text-purple-700',
  report_error:     'bg-red-100 text-red-700',
  advertise:        'bg-green-100 text-green-700',
  other:            'bg-gray-100 text-gray-600',
};
const STATUS_COLORS: Record<string, string> = {
  new:      'bg-yellow-100 text-yellow-700',
  read:     'bg-blue-100 text-blue-700',
  replied:  'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-500',
};
const TYPE_LABELS: Record<string, string> = {
  contact:          'General',
  school_ownership: 'Ownership',
  report_error:     'Error Report',
  advertise:        'Advertising',
  other:            'Other',
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins < 60)  return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

export default function SubmissionsPage() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const statusFilter = searchParams?.get('status') || '';
  const typeFilter   = searchParams?.get('type')   || '';
  const page         = parseInt(searchParams?.get('page') || '1');

  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [pagination,  setPagination]  = useState({ page: 1, totalCount: 0, totalPages: 1 });
  const [loading,     setLoading]     = useState(true);
  const [selected,    setSelected]    = useState<Submission | null>(null);
  const [updatingId,  setUpdatingId]  = useState<number | null>(null);

  const fetchData = useCallback(() => {
    setLoading(true);
    const token = localStorage.getItem('auth_token');
    const qs = new URLSearchParams({ page: String(page), limit: '30' });
    if (statusFilter) qs.set('status', statusFilter);
    if (typeFilter)   qs.set('submission_type', typeFilter);
    fetch(`${API_URL}/admin/contact-submissions?${qs}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.json())
      .then(d => { setSubmissions(d.submissions || []); setPagination(d.pagination || {}); setLoading(false); })
      .catch(() => setLoading(false));
  }, [page, statusFilter, typeFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateStatus = async (id: number, status: string) => {
    setUpdatingId(id);
    const token = localStorage.getItem('auth_token');
    await fetch(`${API_URL}/contact/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ status }),
    });
    setUpdatingId(null);
    fetchData();
    if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : null);
  };

  const setFilter = (key: string, val: string) => {
    const qs = new URLSearchParams(searchParams?.toString());
    if (val) qs.set(key, val); else qs.delete(key);
    qs.set('page', '1');
    router.push(`/admin/submissions?${qs}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Form Submissions</h1>
        <p className="text-gray-500 text-sm mt-1">Contact messages and school ownership requests</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <select value={statusFilter} onChange={e => setFilter('status', e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="">All Statuses</option>
          <option value="new">New</option>
          <option value="read">Read</option>
          <option value="replied">Replied</option>
          <option value="archived">Archived</option>
        </select>
        <select value={typeFilter} onChange={e => setFilter('type', e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="">All Types</option>
          <option value="contact">General</option>
          <option value="school_ownership">Ownership</option>
          <option value="report_error">Error Reports</option>
          <option value="advertise">Advertising</option>
        </select>
        <span className="text-sm text-gray-400">{pagination.totalCount} total</span>
      </div>

      <div className="flex gap-6 items-start">
        {/* List */}
        <div className="flex-1 min-w-0">
          {loading && <div className="text-gray-400 py-16 text-center">Loading...</div>}

          {!loading && submissions.length === 0 && (
            <div className="bg-white rounded-xl p-16 text-center text-gray-400 border border-gray-100">
              No submissions found.
            </div>
          )}

          {!loading && submissions.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 divide-y divide-gray-50">
              {submissions.map(s => (
                <button key={s.id} onClick={() => setSelected(s === selected ? null : s)}
                  className={`w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors ${selected?.id === s.id ? 'bg-green-50 border-l-2 border-green-500' : ''}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <span className="font-medium text-gray-900">{s.name}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[s.submission_type] || TYPE_COLORS.other}`}>
                          {TYPE_LABELS[s.submission_type] || s.submission_type}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[s.status] || ''}`}>
                          {s.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 truncate">{s.subject}</p>
                      {s.school_name && (
                        <p className="text-xs text-green-700 mt-0.5">School: {s.school_name}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                      {timeAgo(s.created_at)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center gap-3 justify-center mt-4">
              <button disabled={page <= 1}
                onClick={() => { const qs = new URLSearchParams(searchParams?.toString()); qs.set('page', String(page-1)); router.push(`/admin/submissions?${qs}`); }}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40">
                ← Prev
              </button>
              <span className="text-sm text-gray-500">Page {page} / {pagination.totalPages}</span>
              <button disabled={page >= pagination.totalPages}
                onClick={() => { const qs = new URLSearchParams(searchParams?.toString()); qs.set('page', String(page+1)); router.push(`/admin/submissions?${qs}`); }}
                className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50 disabled:opacity-40">
                Next →
              </button>
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-88 flex-shrink-0 bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4 self-start sticky top-8" style={{ width: '22rem' }}>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-gray-900">{selected.name}</h3>
                <span className={`mt-1 inline-block px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[selected.submission_type] || ''}`}>
                  {TYPE_LABELS[selected.submission_type] || selected.submission_type}
                </span>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none ml-2">×</button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex gap-2"><span className="text-gray-400 w-24 flex-shrink-0">Email</span><a href={`mailto:${selected.email}`} className="text-green-700 hover:underline truncate">{selected.email}</a></div>
              {selected.phone            && <div className="flex gap-2"><span className="text-gray-400 w-24 flex-shrink-0">Phone</span><span>{selected.phone}</span></div>}
              {selected.requester_role   && <div className="flex gap-2"><span className="text-gray-400 w-24 flex-shrink-0">Role</span><span>{selected.requester_role}</span></div>}
              {selected.organisation_name && <div className="flex gap-2"><span className="text-gray-400 w-24 flex-shrink-0">Organisation</span><span>{selected.organisation_name}</span></div>}
              {selected.school_name      && <div className="flex gap-2"><span className="text-gray-400 w-24 flex-shrink-0">School</span><span className="text-green-700 font-medium">{selected.school_name}</span></div>}
              {selected.school_id && (
                <div className="flex gap-2"><span className="text-gray-400 w-24 flex-shrink-0">Listing</span>
                  <a href={`/admin/schools/${selected.school_id}`} className="text-green-700 hover:underline font-medium">Open in editor</a></div>
              )}
              <div className="flex gap-2"><span className="text-gray-400 w-24 flex-shrink-0">Subject</span><span>{selected.subject}</span></div>
              <div className="flex gap-2"><span className="text-gray-400 w-24 flex-shrink-0">Received</span><span>{new Date(selected.created_at).toLocaleString()}</span></div>
            </div>

            <div>
              <p className="text-xs font-medium text-gray-500 mb-1.5">Message</p>
              <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-40 overflow-auto">
                {selected.message}
              </div>
            </div>

            {selected.verification_notes && (
              <div>
                <p className="text-xs font-medium text-gray-500 mb-1.5">Supporting Info</p>
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 whitespace-pre-wrap max-h-32 overflow-auto">
                  {selected.verification_notes}
                </div>
              </div>
            )}

            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {(['read', 'replied', 'archived'] as const).map(st => (
                  <button key={st} disabled={updatingId === selected.id || selected.status === st}
                    onClick={() => updateStatus(selected.id, st)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      selected.status === st
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                    } disabled:opacity-50`}>
                    {updatingId === selected.id ? '...' : `Mark ${st}`}
                  </button>
                ))}
              </div>
            </div>

            <a href={`mailto:${selected.email}?subject=Re: ${encodeURIComponent(selected.subject)}`}
              className="block w-full text-center bg-green-600 hover:bg-green-700 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
              Reply via Email
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
