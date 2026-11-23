'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { adminFetch, publicPath, wordCount } from '@/lib/adminApi';

type Rec = Record<string, unknown> & {
  id: number; name: string; slug: string; institution_category: string; state: string;
  city?: string; area?: string; verification_status: string;
  verification_source_name?: string; verification_source_url?: string; verification_notes?: string;
  content_sources?: Array<{ url: string; title?: string; type?: string }>;
};
interface Revision { id: number; action: string; changes: Record<string, { from: unknown; to: unknown }>; note?: string; created_at: string; user_name?: string }
interface Report { id: number; name: string; email: string; subject: string; message: string; submission_type: string; status: string; created_at: string }

const FACTS: Array<{ key: string; label: string; kind?: 'bool' | 'number' | 'gender'; uni?: boolean; school?: boolean }> = [
  { key: 'name', label: 'Name' },
  { key: 'type', label: 'Type (federal, state, private, …)' },
  { key: 'website', label: 'Official website' },
  { key: 'established_year', label: 'Founded (year)', kind: 'number' },
  { key: 'address', label: 'Address' },
  { key: 'phone', label: 'Phone' },
  { key: 'email', label: 'Email' },
  { key: 'vc_name', label: 'Vice-chancellor', uni: true },
  { key: 'year_chartered', label: 'Year licensed/chartered', kind: 'number', uni: true },
  { key: 'principal_name', label: 'Principal', school: true },
  { key: 'gender', label: 'Gender', kind: 'gender', school: true },
  { key: 'boarding', label: 'Boarding', kind: 'bool', school: true },
  { key: 'day_school', label: 'Day school', kind: 'bool', school: true },
];
const SECTIONS = [
  { key: 'enriched_history', label: 'Overview and history' },
  { key: 'enriched_academics', label: 'Academics' },
  { key: 'enriched_campus_info', label: 'Campus and location' },
  { key: 'enriched_student_life', label: 'Student life' },
];
// Phrases that mark copied promotional or listing-site text.
const JUNK = /(click here|apply now|read more|best school in|top \d+ best|sponsored|call us|whatsapp|admission (is )?(ongoing|in progress)|copyright ©)/i;

const input = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500';

export default function RecordEditor() {
  const id = useParams<{ id: string }>()?.id;
  const [rec, setRec] = useState<Rec | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [ver, setVer] = useState({ source_name: '', source_url: '', note: '' });

  const load = useCallback(() => {
    adminFetch<{ record: Rec; revisions: Revision[]; reports: Report[] }>(`/admin/records/${id}`)
      .then((d) => {
        setRec(d.record); setRevisions(d.revisions); setReports(d.reports); setDraft({});
        setVer({ source_name: d.record.verification_source_name || '', source_url: d.record.verification_source_url || '', note: '' });
      })
      .catch((e) => setMsg({ ok: false, text: e.message }));
  }, [id]);
  useEffect(load, [load]);

  const val = (k: string) => (k in draft ? draft[k] : rec?.[k]);
  const set = (k: string, v: unknown) => setDraft((d) => ({ ...d, [k]: v }));
  const dirty = Object.keys(draft).length > 0;
  const isUni = rec?.institution_category === 'university';

  const words = useMemo(() => wordCount(...SECTIONS.map((s) => val(s.key) as string)), [draft, rec]); // eslint-disable-line react-hooks/exhaustive-deps
  const junk = SECTIONS.filter((s) => JUNK.test(String(val(s.key) || ''))).map((s) => s.label);
  const metaDesc = String(val('meta_description') || '');
  const metaTitle = String(val('meta_title') || '');

  const save = async () => {
    setBusy(true); setMsg(null);
    try {
      const r = await adminFetch<{ changed: string[] }>(`/admin/records/${id}`, {
        method: 'PATCH', body: JSON.stringify({ updates: draft, note: note || undefined }),
      });
      setMsg({ ok: true, text: r.changed.length ? `Saved: ${r.changed.join(', ')}. The public page updates within 5 minutes.` : 'No changes.' });
      setNote(''); load();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally { setBusy(false); }
  };

  const setStatus = async (status: 'verified' | 'rejected' | 'unverified') => {
    setBusy(true); setMsg(null);
    try {
      await adminFetch(`/admin/records/${id}/verify`, { method: 'POST', body: JSON.stringify({ status, ...ver }) });
      setMsg({ ok: true, text: status === 'verified' ? 'Verified and published. The public page appears within 5 minutes.' : `Status set to ${status}.` });
      load();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally { setBusy(false); }
  };

  if (!rec) return <div className="text-gray-400 py-16 text-center">{msg?.text || 'Loading...'}</div>;

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link href="/admin/schools" className="text-sm text-gray-500 hover:text-gray-700">← Records</Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{rec.name}</h1>
          <p className="text-sm text-gray-500">
            {rec.institution_category} · {[rec.area || rec.city, rec.state].filter(Boolean).join(', ')} ·{' '}
            <span className="font-medium">{rec.verification_status}</span>
            {rec.verification_status === 'verified' && (
              <> · <a href={publicPath(rec)} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline">View public page</a></>
            )}
          </p>
        </div>
      </div>

      {msg && <div className={`rounded-lg p-3 text-sm ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</div>}

      {/* Verification */}
      <section className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Verification</h2>
        <p className="text-sm text-gray-500">
          Verify only when an independent source confirms that an institution of exactly this name exists at this
          location: an official list (NUC, Federal or State Ministry of Education, WAEC/NECO), a reference article, or the
          institution&apos;s own website. A directory or listing site is not enough.
        </p>
        {rec.verification_notes && <p className="text-sm bg-gray-50 rounded p-3 text-gray-600">Current note: {rec.verification_notes}</p>}
        <div className="grid md:grid-cols-2 gap-3">
          <input className={input} placeholder="Source name (e.g. NUC list of private universities)" value={ver.source_name}
            onChange={(e) => setVer({ ...ver, source_name: e.target.value })} />
          <input className={input} placeholder="Source URL" value={ver.source_url}
            onChange={(e) => setVer({ ...ver, source_url: e.target.value })} />
        </div>
        <input className={input} placeholder="Note (required to reject; e.g. why the record is wrong)" value={ver.note}
          onChange={(e) => setVer({ ...ver, note: e.target.value })} />
        <div className="flex flex-wrap gap-2">
          <button disabled={busy} onClick={() => setStatus('verified')}
            className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">Verify and publish</button>
          <button disabled={busy || rec.verification_status === 'unverified'} onClick={() => setStatus('unverified')}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 hover:bg-gray-50 disabled:opacity-50">Unpublish (back to queue)</button>
          <button disabled={busy || rec.verification_status === 'rejected'} onClick={() => setStatus('rejected')}
            className="px-4 py-2 rounded-lg text-sm font-medium border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50">Reject</button>
        </div>
      </section>

      {/* Reports about this record */}
      {reports.length > 0 && (
        <section className="bg-white rounded-xl border border-amber-200 p-6 space-y-3">
          <h2 className="font-semibold text-gray-900">Reports and requests about this record ({reports.length})</h2>
          {reports.map((r) => (
            <div key={r.id} className="text-sm border-t border-gray-100 pt-3">
              <div className="flex gap-2 items-center flex-wrap">
                <span className="font-medium">{r.subject}</span>
                <span className="text-xs bg-gray-100 rounded px-1.5 py-0.5">{r.submission_type}</span>
                <span className="text-xs bg-gray-100 rounded px-1.5 py-0.5">{r.status}</span>
                <span className="text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()} · {r.name} &lt;{r.email}&gt;</span>
              </div>
              <p className="text-gray-600 whitespace-pre-wrap mt-1">{r.message}</p>
            </div>
          ))}
        </section>
      )}

      {/* Facts */}
      <section className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <h2 className="font-semibold text-gray-900">Facts</h2>
        <p className="text-sm text-gray-500">Change a fact only from a source, and leave it blank if reliable sources disagree.</p>
        <div className="grid md:grid-cols-2 gap-4">
          {FACTS.filter((f) => (isUni ? !f.school : !f.uni)).map((f) => (
            <label key={f.key} className="block text-sm">
              <span className="text-gray-600">{f.label}</span>
              {f.kind === 'bool' ? (
                <select className={input} value={val(f.key) === true ? 'true' : val(f.key) === false ? 'false' : ''}
                  onChange={(e) => set(f.key, e.target.value === '' ? null : e.target.value === 'true')}>
                  <option value="">Unknown</option><option value="true">Yes</option><option value="false">No</option>
                </select>
              ) : f.kind === 'gender' ? (
                <select className={input} value={String(val(f.key) ?? '')} onChange={(e) => set(f.key, e.target.value || null)}>
                  <option value="">Unknown</option><option value="co-ed">Co-ed</option>
                  <option value="boys-only">Boys only</option><option value="girls-only">Girls only</option>
                </select>
              ) : (
                <input className={input} value={String(val(f.key) ?? '')}
                  onChange={(e) => set(f.key, f.kind === 'number' ? (e.target.value ? Number(e.target.value) : null) : e.target.value)} />
              )}
            </label>
          ))}
        </div>
      </section>

      {/* Profile */}
      <section className="bg-white rounded-xl border border-gray-100 p-6 space-y-4">
        <div className="flex justify-between items-baseline flex-wrap gap-2">
          <h2 className="font-semibold text-gray-900">Profile text</h2>
          <span className={`text-sm ${words < 150 ? 'text-red-600' : words < 300 ? 'text-amber-600' : 'text-green-700'}`}>
            {words} words {words < 150 ? '(too thin to index well)' : words < 300 ? '(acceptable)' : '(good)'}
          </span>
        </div>
        <p className="text-sm text-gray-500">
          Write in your own words from the sources listed below. Do not paste text from other websites or the
          institution&apos;s brochures.
        </p>
        {junk.length > 0 && (
          <div className="bg-amber-50 text-amber-800 text-sm rounded-lg p-3">
            Promotional or copied wording detected in: {junk.join(', ')}. Rewrite before saving.
          </div>
        )}
        {SECTIONS.map((s) => (
          <label key={s.key} className="block text-sm">
            <span className="text-gray-600">{s.label} <span className="text-gray-400">({wordCount(val(s.key) as string)} words)</span></span>
            <textarea className={`${input} min-h-[140px] font-serif leading-relaxed`} value={String(val(s.key) ?? '')}
              onChange={(e) => set(s.key, e.target.value)} />
          </label>
        ))}
        <label className="block text-sm">
          <span className="text-gray-600">Search title <span className={metaTitle.length > 60 ? 'text-red-600' : 'text-gray-400'}>({metaTitle.length}/60)</span></span>
          <input className={input} value={metaTitle} onChange={(e) => set('meta_title', e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Search description <span className={metaDesc.length > 160 ? 'text-red-600' : 'text-gray-400'}>({metaDesc.length}/160)</span></span>
          <textarea className={`${input} min-h-[70px]`} value={metaDesc} onChange={(e) => set('meta_description', e.target.value)} />
        </label>
        {rec.content_sources && rec.content_sources.length > 0 && (
          <div className="text-sm">
            <p className="text-gray-600 mb-1">Sources</p>
            <ul className="list-disc pl-5 space-y-1">
              {rec.content_sources.map((s) => (
                <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline break-all">{s.title || s.url}</a></li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <div className="sticky bottom-4 bg-white rounded-xl border border-gray-200 shadow-lg p-4 flex flex-wrap gap-3 items-center">
        <input className={`${input} flex-1 min-w-[200px]`} placeholder="What changed and why (saved with the edit history)" value={note} onChange={(e) => setNote(e.target.value)} />
        <button disabled={!dirty || busy} onClick={save}
          className="px-5 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50">Save changes</button>
        {dirty && <button onClick={() => setDraft({})} className="text-sm text-gray-500 hover:text-gray-700">Discard</button>}
      </div>

      {/* History */}
      <section className="bg-white rounded-xl border border-gray-100 p-6">
        <h2 className="font-semibold text-gray-900 mb-3">Edit history</h2>
        {!revisions.length && <p className="text-sm text-gray-400">No edits made through the admin yet.</p>}
        <ul className="space-y-3 text-sm">
          {revisions.map((r) => (
            <li key={r.id} className="border-t border-gray-100 pt-3">
              <div className="text-gray-500">
                <span className="font-medium text-gray-800">{r.action}</span> by {r.user_name || 'unknown'} · {new Date(r.created_at).toLocaleString()}
              </div>
              {r.note && <div className="text-gray-600">“{r.note}”</div>}
              <div className="text-xs text-gray-500 mt-1">{Object.keys(r.changes).join(', ')}</div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
