'use client';

import { useState } from 'react';
import { adminFetch } from '@/lib/adminApi';

export default function AccountPage() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (next.length < 8) return setMsg({ ok: false, text: 'The new password must be at least 8 characters.' });
    if (next !== confirm) return setMsg({ ok: false, text: 'The two new passwords do not match.' });
    setBusy(true);
    try {
      await adminFetch('/auth/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      setCurrent(''); setNext(''); setConfirm('');
      setMsg({ ok: true, text: 'Password changed. Use the new password next time you sign in.' });
    } catch (err) {
      setMsg({ ok: false, text: (err as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const field = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-600 focus:outline-none';
  return (
    <div className="max-w-md">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Change password</h1>
      <p className="text-sm text-gray-500 mb-6">Choose a password of at least 8 characters that you do not use anywhere else.</p>
      <form onSubmit={submit} className="space-y-4 bg-white rounded-xl border border-gray-200 p-6">
        <label className="block text-sm font-medium text-gray-700">Current password
          <input type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} className={`${field} mt-1`} />
        </label>
        <label className="block text-sm font-medium text-gray-700">New password
          <input type="password" autoComplete="new-password" required minLength={8} value={next} onChange={(e) => setNext(e.target.value)} className={`${field} mt-1`} />
        </label>
        <label className="block text-sm font-medium text-gray-700">Confirm new password
          <input type="password" autoComplete="new-password" required minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} className={`${field} mt-1`} />
        </label>
        {msg && <p className={`text-sm ${msg.ok ? 'text-green-700' : 'text-red-600'}`}>{msg.text}</p>}
        <button type="submit" disabled={busy} className="w-full rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white hover:bg-green-800 disabled:opacity-60">
          {busy ? 'Saving…' : 'Change password'}
        </button>
      </form>
    </div>
  );
}
