'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { adminFetch } from '@/lib/adminApi';

interface Claim {
  id: number; school_id: number; school_name: string; state?: string; status: string;
  user_name: string; user_email: string; verification_method?: string;
  verification_notes?: string; created_at: string;
}
interface Submission {
  id: number; name: string; email: string; phone?: string; school_id?: number; school_name?: string;
  requester_role?: string; organisation_name?: string; verification_notes?: string; message: string;
  status: string; created_at: string;
}

export default function ClaimsPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [requests, setRequests] = useState<Submission[]>([]);
  const [msg, setMsg] = useState('');
  const [reason, setReason] = useState<Record<number, string>>({});

  const load = useCallback(() => {
    adminFetch<{ claims: Claim[] }>('/admin/claims').then((d) => setClaims(d.claims || [])).catch((e) => setMsg(e.message));
    adminFetch<{ submissions: Submission[] }>('/admin/contact-submissions?submission_type=school_ownership&limit=50')
      .then((d) => setRequests((d.submissions || []).filter((s) => s.status !== 'archived'))).catch((e) => setMsg(e.message));
  }, []);
  useEffect(load, [load]);

  const decide = async (id: number, status: 'approved' | 'rejected') => {
    setMsg('');
    try {
      await adminFetch(`/claims/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status, rejection_reason: reason[id] || undefined }) });
      load();
    } catch (e) { setMsg((e as Error).message); }
  };
  const markRequest = async (id: number, status: string) => {
    try { await adminFetch(`/contact/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }); load(); }
    catch (e) { setMsg((e as Error).message); }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ownership requests</h1>
        <p className="text-gray-500 text-sm mt-1">
          Approve a request only with proof that the person represents the institution: an email from the
          institution&apos;s own domain, an official letter, or confirmation through a contact listed on the official
          website. Never approve on a request alone.
        </p>
      </div>
      {msg && <div className="bg-red-50 text-red-700 rounded-lg p-3 text-sm">{msg}</div>}

      <section className="space-y-3">
        <h2 className="font-semibold text-gray-900">Requests from the registration form ({requests.length})</h2>
        {!requests.length && <p className="text-sm text-gray-400">None open.</p>}
        {requests.map((r) => {
          const domain = r.email.split('@')[1] || '';
          const freeMail = /^(gmail|yahoo|hotmail|outlook|live|icloud|aol|ymail)\./i.test(domain);
          return (
            <div key={r.id} className="bg-white rounded-xl border border-gray-100 p-5 text-sm space-y-2">
              <div className="flex flex-wrap gap-2 items-center">
                <span className="font-medium text-gray-900">{r.school_name || 'Unnamed school'}</span>
                {r.school_id && <Link href={`/admin/schools/${r.school_id}`} className="text-green-700 hover:underline">Open record</Link>}
                <span className="text-xs bg-gray-100 rounded px-1.5 py-0.5">{r.status}</span>
                <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</span>
              </div>
              <div className="text-gray-600">
                {r.name}{r.requester_role ? `, ${r.requester_role}` : ''} · <a href={`mailto:${r.email}`} className="text-green-700">{r.email}</a>
                {freeMail
                  ? <span className="ml-2 text-xs text-amber-700 bg-amber-50 rounded px-1.5 py-0.5">personal email address: needs other proof</span>
                  : <span className="ml-2 text-xs text-gray-500">domain {domain}: check it matches the school&apos;s website</span>}
                {r.phone ? ` · ${r.phone}` : ''}
              </div>
              {r.verification_notes && <p className="bg-gray-50 rounded p-2 text-gray-600 whitespace-pre-wrap">{r.verification_notes}</p>}
              <p className="text-gray-600 whitespace-pre-wrap">{r.message}</p>
              <div className="flex gap-2">
                <a href={`mailto:${r.email}?subject=${encodeURIComponent(`Your NigerianDirectory listing request${r.school_name ? `: ${r.school_name}` : ''}`)}`}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white">Reply by email</a>
                <button onClick={() => markRequest(r.id, 'replied')} className="px-3 py-1.5 rounded-lg text-xs border border-gray-200">Mark replied</button>
                <button onClick={() => markRequest(r.id, 'archived')} className="px-3 py-1.5 rounded-lg text-xs border border-gray-200">Close</button>
              </div>
            </div>
          );
        })}
      </section>

      <section className="space-y-3">
        <h2 className="font-semibold text-gray-900">Account claims awaiting review ({claims.length})</h2>
        {!claims.length && <p className="text-sm text-gray-400">None pending.</p>}
        {claims.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-gray-100 p-5 text-sm space-y-2">
            <div className="flex flex-wrap gap-2 items-center">
              <Link href={`/admin/schools/${c.school_id}`} className="font-medium text-gray-900 hover:text-green-700">{c.school_name}</Link>
              <span className="text-xs bg-gray-100 rounded px-1.5 py-0.5">{c.status}</span>
              <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString()}</span>
            </div>
            <div className="text-gray-600">{c.user_name} · {c.user_email}{c.verification_method ? ` · proof by ${c.verification_method}` : ''}</div>
            {c.verification_notes && <p className="bg-gray-50 rounded p-2 text-gray-600 whitespace-pre-wrap">{c.verification_notes}</p>}
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => decide(c.id, 'approved')} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-600 text-white">Approve</button>
              <input placeholder="Reason (required to reject)" value={reason[c.id] || ''}
                onChange={(e) => setReason({ ...reason, [c.id]: e.target.value })}
                className="border border-gray-200 rounded-lg px-2 py-1 text-xs flex-1 min-w-[200px]" />
              <button onClick={() => decide(c.id, 'rejected')} className="px-3 py-1.5 rounded-lg text-xs border border-red-200 text-red-700">Reject</button>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
