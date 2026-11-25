'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { verticals, isLive, buildPath } from '@/config/verticals';

// Generate category links from verticals config — only live verticals
const categoryLinks = verticals
  .filter(v => v.status === 'live')
  .map((vertical) => {
    // For live verticals, link to first category if exists
    const href = vertical.categories?.[0] 
      ? buildPath(vertical.slug, vertical.categories[0].slug)
      : `/${vertical.slug}/`;
    
    return {
      name: vertical.name,
      slug: vertical.slug,
      href,
      status: vertical.status,
    };
  });

// Helper to detect current vertical from pathname
function getCurrentVertical(pathname: string | null) {
  if (!pathname) return null;

  // Check which vertical matches the current path
  for (const vertical of verticals) {
    if (pathname.startsWith(`/${vertical.slug}/`) || pathname.startsWith(`/coming-soon/${vertical.slug}`)) {
      return vertical;
    }
  }
  
  // Default to education for school-related paths
  if (pathname.includes('/schools/') || pathname.includes('/education/')) {
    return verticals.find(v => v.slug === 'education') || null;
  }
  
  return null;
}

// Dynamic resource links based on current vertical
function getResourceLinks(pathname: string | null) {
  const currentVertical = getCurrentVertical(pathname);
  
  // Build dynamic "All States" link based on current vertical
  let allStatesLink = '/states/'; // Default
  let allStatesLabel = 'All States';
  
  if (currentVertical && isLive(currentVertical.status)) {
    // For live verticals with categories, link to first category's state listing
    const firstCategory = currentVertical.categories?.[0];
    if (firstCategory) {
      allStatesLink = `/${currentVertical.slug}/${firstCategory.slug}/`;
      allStatesLabel = `All ${firstCategory.name}`;
    }
  } else if (currentVertical) {
    // Coming soon vertical - just show generic
    allStatesLabel = `${currentVertical.name} States`;
  }
  
  return [
    { name: allStatesLabel, href: allStatesLink },
    { name: 'Blog', href: '/blog/' },
  ];
}

const companyLinks = [
  { name: 'About Us', href: '/about/' },
  { name: 'Contact', href: '/contact/' },
  { name: 'Advertise', href: '/advertise/' },
];

const legalLinks = [
  { name: 'Privacy Policy', href: '/privacy/' },
  { name: 'Terms of Use', href: '/terms/' },
];

const socialLinks = [
  { name: 'Twitter', href: 'https://twitter.com/nigeriandir' },
  { name: 'Facebook', href: 'https://facebook.com/nigeriandir' },
  { name: 'Instagram', href: 'https://instagram.com/nigeriandir' },
];

function FooterColumn({ title, links }: { title: string; links: { name: string; href: string }[] }) {
  return (
    <div>
      <h3 className="font-sans text-sm font-medium tracking-normal opacity-70">{title}</h3>
      <ul className="mt-4 space-y-2.5">
        {links.map((link) => (
          <li key={link.name}>
            <Link href={link.href} className="text-[17px] font-medium hover:underline underline-offset-4">
              {link.name}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Footer() {
  const pathname = usePathname();
  const resourceLinks = getResourceLinks(pathname);

  return (
    <footer className="field">
      <div className="shell pt-20 pb-10 lg:pt-28">
        <div className="grid grid-cols-2 gap-x-8 gap-y-12 lg:grid-cols-12">
          {/* Mast: the name set large, with what the directory is */}
          <div className="col-span-2 lg:col-span-6">
            <Link href="/" className="block font-display font-bold tracking-poster leading-[0.9] text-6xl sm:text-7xl lg:text-8xl">
              Nigerian
              <span className="block font-normal">Directory</span>
            </Link>
            <p className="mt-6 max-w-md text-[17px] opacity-85">
              A directory of Nigerian institutions, published one section at a time.
              Every record is checked against an independent source before it goes live.
            </p>
          </div>

          <div className="lg:col-span-2 lg:col-start-7">
            <FooterColumn title="Categories" links={[...categoryLinks.map(({ name, href }) => ({ name, href })), { name: 'News', href: '/news/' }]} />
          </div>
          <div className="lg:col-span-2">
            <FooterColumn title="Resources" links={resourceLinks} />
          </div>
          <div className="lg:col-span-2">
            <FooterColumn title="Company" links={[...companyLinks, ...legalLinks]} />
          </div>
        </div>

        <div className="mt-20 flex flex-col gap-4 text-sm opacity-80 md:flex-row md:items-center md:justify-between">
          <p>© {new Date().getFullYear()} NigerianDirectory.com. All rights reserved.</p>
          <ul className="flex gap-6">
            {socialLinks.map((s) => (
              <li key={s.name}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="hover:underline underline-offset-4">
                  {s.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
