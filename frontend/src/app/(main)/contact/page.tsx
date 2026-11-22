'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { EnvelopeIcon, PhoneIcon, MapPinIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

// Real contact details only. The previous email was on a domain that does
// not exist and the phone number was a placeholder. Each detail is shown
// only when its setting is configured; the form below always works.
const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL;
const CONTACT_PHONE = process.env.NEXT_PUBLIC_CONTACT_PHONE;

const contactInfo = [
  ...(CONTACT_EMAIL ? [{ icon: EnvelopeIcon, title: 'Email', value: CONTACT_EMAIL, href: `mailto:${CONTACT_EMAIL}` }] : []),
  ...(CONTACT_PHONE ? [{ icon: PhoneIcon, title: 'Phone', value: CONTACT_PHONE, href: `tel:${CONTACT_PHONE.replace(/[^+\d]/g, '')}` }] : []),
  { icon: MapPinIcon,  title: 'Location', value: 'Lagos, Nigeria', href: null },
];

const subjectOptions = [
  { value: 'General Inquiry',              type: 'contact',          label: 'General Inquiry' },
  { value: 'Add/Update School Listing',    type: 'contact',          label: 'Add / Update School Listing' },
  { value: 'School Profile Management',    type: 'school_ownership', label: 'Manage a School Profile' },
  { value: 'Advertising Inquiry',          type: 'advertise',        label: 'Advertising Inquiry' },
  { value: 'Partnership Opportunity',      type: 'contact',          label: 'Partnership Opportunity' },
  { value: 'Feedback/Suggestion',          type: 'contact',          label: 'Feedback / Suggestion' },
  { value: 'Report Incorrect Information', type: 'report_error',     label: 'Report Incorrect Information' },
  { value: 'Technical Issue',              type: 'other',            label: 'Technical Issue' },
];

function ContactForm() {
  const searchParams = useSearchParams();
  const prefillSubject = searchParams?.get('subject') === 'report_error'
    ? 'Report Incorrect Information' : '';
  const prefillSchool = searchParams?.get('school') || '';

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: prefillSubject,
    message: prefillSchool ? `School: ${prefillSchool}\n\n` : '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [error, setError]               = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    const selectedOption = subjectOptions.find(o => o.value === formData.subject);
    const submission_type = selectedOption?.type || 'contact';

    try {
      const res = await fetch(`${API_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || undefined,
          subject: formData.subject,
          message: formData.message,
          submission_type,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.errors?.[0]?.msg || data.error || 'Submission failed.');
      }

      setSubmitted(true);
      setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
          <CheckCircleIcon className="w-8 h-8 text-green-600" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Message Sent!</h3>
        <p className="text-gray-600 mb-6">
          Thank you for reaching out. We&apos;ll respond as soon as possible.
        </p>
        <button onClick={() => setSubmitted(false)} className="btn-primary">
          Send Another Message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">Your Name *</label>
          <input type="text" id="name" name="name" required value={formData.name} onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="John Doe" />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
          <input type="email" id="email" name="email" required value={formData.email} onChange={handleChange}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            placeholder="john@example.com" />
        </div>
      </div>

      <div>
        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
        <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          placeholder="+234 800 000 0000" />
      </div>

      <div>
        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
        <select id="subject" name="subject" required value={formData.subject} onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent">
          <option value="">Select a subject</option>
          {subjectOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
        <textarea id="message" name="message" required rows={6} value={formData.message} onChange={handleChange}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
          placeholder="How can we help you?" />
      </div>

      <button type="submit" disabled={isSubmitting}
        className="w-full btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed">
        {isSubmitting ? 'Sending…' : 'Send Message'}
      </button>
    </form>
  );
}

export default function ContactPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl lg:text-5xl font-bold mb-6">Contact Us</h1>
            <p className="text-xl text-primary-100">
              Have questions? Send us a message and we&apos;ll get back to you shortly.
            </p>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Contact info */}
            <div className="lg:col-span-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Get in Touch</h2>
              <div className="space-y-6">
                {contactInfo.map((item, i) => (
                  <div key={i} className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                      <item.icon className="h-6 w-6 text-primary-600" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.title}</h3>
                      {item.href
                        ? <a href={item.href} className="text-primary-600 hover:text-primary-700">{item.value}</a>
                        : <p className="text-gray-600">{item.value}</p>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Business Hours</h3>
                <p className="text-gray-600">Mon – Fri: 9:00 AM – 6:00 PM</p>
                <p className="text-gray-600">Saturday: 10:00 AM – 2:00 PM</p>
                <p className="text-gray-600">Sunday: Closed</p>
              </div>
            </div>

            {/* Form */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-lg p-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Send a Message</h2>
                <Suspense fallback={<div className="text-gray-400 py-8 text-center">Loading form…</div>}>
                  <ContactForm />
                </Suspense>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
