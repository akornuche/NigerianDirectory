'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AcademicCapIcon,
  DocumentTextIcon,
  EnvelopeIcon,
  ClipboardDocumentListIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api';

interface Overview {
  schools: {
    total_schools: string;
    needs_enrichment: string;
    claimed_schools: string;
    verified_schools: string;
    total_states: string;
  };
  claims: {
    total_claims: string;
    pending_claims: string;
    approved_claims: string;
  };
  contact: {
    total: string;
    new_count: string;
    ownership_count: string;
    report_count: string;
    last_7_days: string;
  };
  crawls: {
    total_crawls: string;
    successful: string;
    failed: string;
    schools_crawled: string;
  };
}

function StatCard({ label, value, sub, icon: Icon, href, color = 'blue' }: {
  label: string; value: string | number; sub?: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string; color?: string;
}) {
  const colors: Record<string, string> = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    yellow: 'bg-yellow-50 text-yellow-700',
    purple: 'bg-purple-50 text-purple-600',
    red:    'bg-red-50 text-red-600',
  };
  const card = (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition-shadow cursor-pointer">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
          {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
        <div className={`p-3 rounded-lg ${colors[color] || colors.blue}`}>
          <Icon className="h-6 w-6" />
        </div>
      </div>
    </div>
  );
  return href ? <Link href={href}>{card}</Link> : card;
}

export default function AdminOverview() {
  const [data, setData]     = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    fetch(`${API_URL}/admin/overview`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => { if (!r.ok) throw new Error(`Server error ${r.status}`); return r.json(); })
      .then(d => { setData(d); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <div className="text-gray-400">Loading dashboard...</div>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
      Error: {error}
    </div>
  );

  if (!data) return null;

  const total      = parseInt(data.schools.total_schools) || 0;
  const crawled    = total - (parseInt(data.schools.needs_enrichment) || 0);
  const enrichPct  = total ? Math.round((crawled / total) * 100) : 0;
  const newMsgs    = parseInt(data.contact.new_count) || 0;
  const totalMsgs  = parseInt(data.contact.total) || 0;
  const pendingClaims = parseInt(data.claims.pending_claims) || 0;
  const totalClaims   = parseInt(data.claims.total_claims) || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          {new Date().toLocaleDateString('en-NG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          label="Total Schools" value={total}
          sub={`${data.schools.total_states} states covered`}
          icon={AcademicCapIcon} href="/admin/page-health" color="blue"
        />
        <StatCard
          label="Content Coverage" value={`${enrichPct}%`}
          sub={`${crawled} of ${total} enriched`}
          icon={DocumentTextIcon} href="/admin/page-health" color="green"
        />
        <StatCard
          label="New Messages" value={newMsgs}
          sub={`${totalMsgs} total · ${data.contact.last_7_days} this week`}
          icon={EnvelopeIcon} href="/admin/submissions" color="yellow"
        />
        <StatCard
          label="Ownership Requests" value={pendingClaims}
          sub={`${totalClaims} total requests`}
          icon={ClipboardDocumentListIcon} href="/admin/submissions" color="purple"
        />
      </div>

      {/* Enrichment progress bars */}
      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-5 flex items-center gap-2">
          <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
          Content Enrichment Progress
        </h2>
        <div className="space-y-5">
          {[
            { label: 'Schools with enriched content', value: crawled, total },
            { label: 'Schools claimed by owners',     value: parseInt(data.schools.claimed_schools) || 0,  total },
            { label: 'Schools verified',              value: parseInt(data.schools.verified_schools) || 0, total },
          ].map(row => {
            const pct = row.total ? Math.round((row.value / row.total) * 100) : 0;
            return (
              <div key={row.label}>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-gray-600">{row.label}</span>
                  <span className="font-medium text-gray-900">{row.value} / {row.total} <span className="text-gray-400">({pct}%)</span></span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick action links */}
      <div className="grid sm:grid-cols-3 gap-4">
        <Link href="/admin/page-health?filter=missing_content"
          className="rounded-xl px-5 py-4 font-medium text-sm text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
          Schools missing content →
        </Link>
        <Link href="/admin/page-health?filter=missing_images"
          className="rounded-xl px-5 py-4 font-medium text-sm text-yellow-700 bg-yellow-50 hover:bg-yellow-100 transition-colors">
          Schools missing images →
        </Link>
        <Link href="/admin/submissions?status=new"
          className="rounded-xl px-5 py-4 font-medium text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors">
          Unread form submissions →
        </Link>
      </div>
    </div>
  );
}
