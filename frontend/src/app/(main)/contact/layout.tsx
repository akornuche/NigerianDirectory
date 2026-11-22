import type { Metadata } from 'next';

// The contact page is a client component and cannot export metadata, so it
// inherited the home page's title. It gets its own here.
export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'Contact NigerianDirectory to correct a listing, claim your school, report an error or ask about advertising.',
  alternates: { canonical: '/contact/' },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
