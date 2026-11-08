import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { default: 'Admin — NigerianDirectory', template: '%s | Admin' },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-gray-100 min-h-screen">{children}</div>
  );
}
