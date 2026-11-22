'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  BuildingLibraryIcon,
  CheckCircleIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon,
  BriefcaseIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

interface FormData {
  name: string;
  email: string;
  phone: string;
  requester_role: string;
  organisation_name: string;
  subject: string;
  message: string;
  verification_notes: string;
}

export default function RegisterSchoolPage() {
  const params = useParams();
  const schoolSlug = params?.slug as string || '';
  const schoolName = schoolSlug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    phone: '',
    requester_role: '',
    organisation_name: schoolName,
    subject: `School Ownership Request – ${schoolName}`,
    message: '',
    verification_notes: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');

    try {
      const res = await fetch(`${API_URL}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          submission_type: 'school_ownership',
          school_name: schoolName,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Submission failed. Please try again.');
      }

      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="max-w-lg w-full bg-white rounded-2xl shadow-sm p-10 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircleIcon className="h-8 w-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Request Received</h1>
          <p className="text-gray-600 mb-6">
            Thank you! We have received your request to manage the profile for{' '}
            <strong>{schoolName}</strong>. Our team will review your details and get back to you
            within 2–3 business days.
          </p>
          <Link
            href={`/education/schools/${params?.state}/${params?.area}/${params?.slug}/`}
            className="inline-block bg-primary-600 hover:bg-primary-700 text-white font-medium px-6 py-3 rounded-lg transition-colors"
          >
            Back to School Profile
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-primary-700 text-white py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
              <BuildingLibraryIcon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-primary-200 text-sm font-medium uppercase tracking-wide">
                School Profile Management
              </p>
              <h1 className="text-2xl font-bold">Register as School Administrator</h1>
            </div>
          </div>
          <p className="text-primary-100 max-w-xl">
            Are you a principal, proprietor, or authorised representative of{' '}
            <strong className="text-white">{schoolName}</strong>? Register to manage this school&apos;s
            profile, update information, add photos, and respond to enquiries.
          </p>
        </div>
      </div>

      {/* What you get */}
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="grid sm:grid-cols-3 gap-4 mb-8">
          {[
            { title: 'Update your profile', desc: 'Edit contact info, facilities, and school details' },
            { title: 'Add photos & logo', desc: 'Upload a hero image, logo, and gallery photos' },
            { title: 'Verified badge', desc: 'Get a verified badge displayed on your profile' },
          ].map(item => (
            <div key={item.title} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
              <CheckCircleIcon className="h-6 w-6 text-primary-600 mb-2" />
              <h3 className="font-semibold text-gray-900 text-sm">{item.title}</h3>
              <p className="text-gray-500 text-xs mt-1">{item.desc}</p>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm p-8 space-y-6">
          <h2 className="text-lg font-semibold text-gray-900 border-b pb-4">Your Details</h2>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-5">
            {/* Full name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <UserIcon className="h-4 w-4 inline mr-1 text-gray-400" />
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="name"
                required
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Dr. Amaka Okonkwo"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <BriefcaseIcon className="h-4 w-4 inline mr-1 text-gray-400" />
                Your Role at the School <span className="text-red-500">*</span>
              </label>
              <select
                name="requester_role"
                required
                value={formData.requester_role}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">Select your role</option>
                <option value="Principal">Principal / Head Teacher</option>
                <option value="Proprietor">Proprietor / School Owner</option>
                <option value="Board Member">Board Member / Trustee</option>
                <option value="Administrator">School Administrator</option>
                <option value="PR Manager">PR / Communications Manager</option>
                <option value="Other">Other</option>
              </select>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <EnvelopeIcon className="h-4 w-4 inline mr-1 text-gray-400" />
                Official Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                name="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="your@schooldomain.edu.ng"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <p className="text-xs text-gray-400 mt-1">
                Using a school email address speeds up verification
              </p>
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <PhoneIcon className="h-4 w-4 inline mr-1 text-gray-400" />
                Phone Number
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+234 800 000 0000"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <DocumentTextIcon className="h-4 w-4 inline mr-1 text-gray-400" />
              Brief Message <span className="text-red-500">*</span>
            </label>
            <textarea
              name="message"
              required
              rows={4}
              value={formData.message}
              onChange={handleChange}
              placeholder={`Tell us briefly about your association with ${schoolName} and what you'd like to update on the profile.`}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          {/* Additional verification */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Supporting Information <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              name="verification_notes"
              rows={3}
              value={formData.verification_notes}
              onChange={handleChange}
              placeholder="Any additional information that can help verify your authority — e.g. staff ID number, reference contacts, official documents available."
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-3 items-center">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto bg-primary-600 hover:bg-primary-700 disabled:opacity-60 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
            >
              {isSubmitting ? 'Submitting…' : 'Submit Request'}
            </button>
            <Link
              href={`/education/schools/${params?.state}/${params?.area}/${params?.slug}/`}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel — go back
            </Link>
          </div>

          <p className="text-xs text-gray-400">
            By submitting this form you agree to our{' '}
            <Link href="/about" className="underline">terms of service</Link>. We will never share
            your personal details with third parties.
          </p>
        </form>
      </div>
    </div>
  );
}
