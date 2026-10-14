'use client';

export default function ClaimsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ownership Requests</h1>
        <p className="text-gray-500 text-sm">Manage school ownership/management claims from principals and proprietors</p>
      </div>

      <div className="bg-white rounded-xl p-8 text-center">
        <p className="text-gray-500">This page is coming soon. Use the <a href="/admin/submissions?type=school_ownership" className="text-primary-600 hover:underline">Form Submissions</a> page to view all school management requests.</p>
      </div>
    </div>
  );
}
