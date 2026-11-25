import type { Metadata } from 'next';

// Health is not open yet: no hospital records are published, so these pages
// stay out of search results until the section launches.
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function HealthLayout({ children }: { children: React.ReactNode }) {
  return children;
}
