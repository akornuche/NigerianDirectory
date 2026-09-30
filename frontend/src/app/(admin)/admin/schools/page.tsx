'use client';

export default function SchoolsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Schools</h1>
        <p className="text-gray-500 text-sm">View and manage school directory entries</p>
      </div>

      <div className="bg-white rounded-xl p-8 text-center">
        <p className="text-gray-500">This page is coming soon. Use the <a href="/admin/page-health" className="text-primary-600 hover:underline">Page Health</a> page to monitor individual school enrichment status.</p>
      </div>
    </div>
  );
}
