import { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getVerticalBySlug, getCategoryBySlug, verticalColors } from '@/config/verticals';

interface ComingSoonPageProps {
  params: Promise<{
    slug: string[];
  }>;
}

export async function generateMetadata({ params }: ComingSoonPageProps): Promise<Metadata> {
  const { slug } = await params;
  const [verticalSlug, categorySlug] = slug;
  
  const vertical = getVerticalBySlug(verticalSlug);
  const category = categorySlug ? getCategoryBySlug(verticalSlug, categorySlug) : null;
  
  const title = category 
    ? `${category.name} - Coming Soon | NigerianDirectory`
    : vertical
    ? `${vertical.name} - Coming Soon | NigerianDirectory`
    : 'Coming Soon | NigerianDirectory';

  const description = category?.description || vertical?.description || 'This section is coming soon to NigerianDirectory.';

  return {
    title,
    description,
    robots: {
      index: false,
      follow: true,
    },
  };
}

// Icons for the coming soon page
const CategoryIcons: Record<string, React.FC<{ className?: string }>> = {
  education: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5" />
    </svg>
  ),
  health: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  ),
  food: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8.25v-1.5m0 1.5c-1.355 0-2.697.056-4.024.166C6.845 8.51 6 9.473 6 10.608v2.513m6-4.871c1.355 0 2.697.056 4.024.166C17.155 8.51 18 9.473 18 10.608v2.513M15 8.25v-1.5m-6 1.5v-1.5m12 9.75-1.5.75a3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0 3.354 3.354 0 0 0-3 0 3.354 3.354 0 0 1-3 0L3 16.5m15-3.379a48.474 48.474 0 0 0-6-.371c-2.032 0-4.034.126-6 .371m12 0c.39.049.777.102 1.163.16 1.07.16 1.837 1.094 1.837 2.175v5.169c0 .621-.504 1.125-1.125 1.125H4.125A1.125 1.125 0 0 1 3 20.625v-5.17c0-1.08.768-2.014 1.837-2.174A47.78 47.78 0 0 1 6 13.12M12.265 3.11a.375.375 0 1 1-.53 0L12 2.845l.265.265Z" />
    </svg>
  ),
  'home-services': ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
    </svg>
  ),
  'real-estate': ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  ),
  automotive: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
    </svg>
  ),
  travel: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418" />
    </svg>
  ),
  business: ({ className }) => (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 0 0 .75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 0 0-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0 1 12 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 0 1-.673-.38m0 0A2.18 2.18 0 0 1 3 12.489V8.706c0-1.081.768-2.015 1.837-2.175a48.111 48.111 0 0 1 3.413-.387m7.5 0V5.25A2.25 2.25 0 0 0 13.5 3h-3a2.25 2.25 0 0 0-2.25 2.25v.894m7.5 0a48.667 48.667 0 0 0-7.5 0M12 12.75h.008v.008H12v-.008Z" />
    </svg>
  ),
};

function getIcon(verticalSlug: string) {
  return CategoryIcons[verticalSlug] || CategoryIcons.education;
}

export default async function ComingSoonPage({ params }: ComingSoonPageProps) {
  const { slug } = await params;
  const [verticalSlug, categorySlug] = slug;
  
  const vertical = getVerticalBySlug(verticalSlug);
  
  if (!vertical) {
    notFound();
  }
  
  const category = categorySlug ? getCategoryBySlug(verticalSlug, categorySlug) : null;
  const colors = verticalColors[vertical.color] || verticalColors.primary;
  const Icon = getIcon(verticalSlug);
  
  const displayName = category?.name || vertical.name;
  const description = category?.description || vertical.description;

  // Get related categories that ARE live (for suggestions)
  const liveCategories = vertical.categories.filter(c => c.status === 'live');

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-2xl mx-auto text-center">
        {/* Icon */}
        <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${colors.bg} mb-8`}>
          <Icon className={`w-12 h-12 ${colors.text}`} />
        </div>

        {/* Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-800 text-sm font-medium mb-6">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          Coming Soon
        </div>

        {/* Title */}
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {displayName}
        </h1>

        {/* Description */}
        <p className="text-xl text-gray-600 mb-8">
          {description}
        </p>

        <p className="text-gray-500 mb-8">
          We&apos;re working hard to bring you the best directory of {displayName.toLowerCase()} in Nigeria. 
          Sign up to be notified when we launch!
        </p>

        {/* Email Signup Form */}
        <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-12">
          <input
            type="email"
            placeholder="Enter your email"
            className="flex-1 px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
            required
          />
          <button
            type="submit"
            className={`px-6 py-3 ${colors.badge} text-white font-medium rounded-lg hover:opacity-90 transition-opacity`}
          >
            Notify Me
          </button>
        </form>

        {/* Live Categories Suggestion */}
        {liveCategories.length > 0 && (
          <div className="border-t border-gray-200 pt-8">
            <p className="text-sm text-gray-500 mb-4">
              In the meantime, explore what&apos;s already available:
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {liveCategories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={`/${verticalSlug}/${cat.slug}`}
                  className={`px-4 py-2 rounded-lg ${colors.bg} ${colors.text} font-medium hover:opacity-80 transition-opacity`}
                >
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Back Link */}
        <div className="mt-8">
          <Link
            href="/"
            className="text-gray-600 hover:text-gray-900 inline-flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
