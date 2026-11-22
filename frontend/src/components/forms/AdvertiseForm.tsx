'use client';

import { useState } from 'react';
import { EnvelopeIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

const INTERESTS: Record<string, string> = {
  banner: 'Banner Advertising',
  featured: 'Featured School Listing',
  sponsored: 'Sponsored Content',
  other: 'Other / Custom Package',
};

const inputClass =
  'w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500';

/**
 * Advertising enquiry form. Submits to the contact API as an "advertise"
 * submission, which appears in the admin submissions inbox. The previous
 * form had no submit handler, so every enquiry was lost.
 */
export default function AdvertiseForm() {
  const [form, setForm] = useState({ name: '', email: '', company: '', interest: '', message: '' });
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState('');

  const update = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('sending');
    setError('');
    try {
      const res = await fetch(`${API_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          subject: `Advertising Inquiry${form.interest ? `: ${INTERESTS[form.interest]}` : ''}`,
          message: form.message,
          submission_type: 'advertise',
          organisation_name: form.company || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.errors?.[0]?.msg || data.error || 'Could not send your enquiry.');
      }
      setStatus('sent');
    } catch (err) {
      setStatus('idle');
      setError(err instanceof Error ? err.message : 'Could not send your enquiry.');
    }
  };

  if (status === 'sent') {
    return (
      <div className="text-center py-8" role="status">
        <CheckCircleIcon className="h-12 w-12 text-green-600 mx-auto mb-4" />
        <p className="text-lg font-semibold text-gray-900">Thank you. Your enquiry has been sent.</p>
        <p className="text-gray-600 mt-2">We will reply to {form.email}.</p>
      </div>
    );
  }

  return (
    <form className="space-y-6" onSubmit={submit}>
      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
          <input type="text" id="name" name="name" required maxLength={120} value={form.name} onChange={update}
            className={inputClass} placeholder="Your name" />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email Address</label>
          <input type="email" id="email" name="email" required value={form.email} onChange={update}
            className={inputClass} placeholder="you@example.com" />
        </div>
      </div>
      <div>
        <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-2">Company / Organization</label>
        <input type="text" id="company" name="company" maxLength={200} value={form.company} onChange={update}
          className={inputClass} placeholder="Your company name" />
      </div>
      <div>
        <label htmlFor="interest" className="block text-sm font-medium text-gray-700 mb-2">Interested In</label>
        <select id="interest" name="interest" value={form.interest} onChange={update} className={inputClass}>
          <option value="">Select an option</option>
          {Object.entries(INTERESTS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">Message</label>
        <textarea id="message" name="message" rows={4} required minLength={10} maxLength={5000}
          value={form.message} onChange={update} className={inputClass}
          placeholder="Tell us about your advertising goals..." />
      </div>
      {error && <p className="text-sm text-red-600" role="alert">{error}</p>}
      <button type="submit" disabled={status === 'sending'} className="w-full btn-primary py-3 disabled:opacity-60">
        <EnvelopeIcon className="h-5 w-5 mr-2 inline" />
        {status === 'sending' ? 'Sending…' : 'Send Inquiry'}
      </button>
    </form>
  );
}
