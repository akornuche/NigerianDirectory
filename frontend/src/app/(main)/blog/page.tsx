import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { getContent, BlogPostMeta } from '@/lib/content';
import AdBanner from '@/components/ads/AdBanner';

export const metadata: Metadata = {
  title: 'Blog - Education & Directory News | NigerianDirectory',
  description: 'Stay informed with the latest articles on education in Nigeria, school selection guides, and updates from NigerianDirectory.',
  openGraph: {
    title: 'Blog | NigerianDirectory',
    description: 'Education insights, school guides, and directory updates.',
  },
};

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function PostCard({ post, featured = false }: { post: BlogPostMeta; featured?: boolean }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className={`card-hover group ${featured ? 'lg:col-span-2 lg:grid lg:grid-cols-2 lg:gap-6' : ''}`}
    >
      <div className={`aspect-[16/9] relative bg-gradient-to-br from-primary-100 to-primary-200 overflow-hidden ${featured ? 'lg:aspect-auto lg:h-full' : ''}`}>
        {post.coverImage ? (
          <Image
            src={post.coverImage}
            alt={post.title}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg className="w-16 h-16 text-primary-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-6">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
          <span className="badge-primary">{post.category}</span>
          <span>•</span>
          <span>{post.readingTime} min read</span>
        </div>
        <h2 className={`font-semibold text-gray-900 group-hover:text-primary-600 transition-colors ${featured ? 'text-2xl lg:text-3xl' : 'text-xl'}`}>
          {post.title}
        </h2>
        <p className={`mt-2 text-gray-600 ${featured ? 'text-base' : 'text-sm line-clamp-2'}`}>
          {post.description}
        </p>
        <div className="mt-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
            {post.author.image ? (
              <Image
                src={post.author.image}
                alt={post.author.name}
                width={32}
                height={32}
                className="rounded-full"
              />
            ) : (
              <span className="text-primary-600 font-medium text-sm">
                {post.author.name.charAt(0)}
              </span>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">{post.author.name}</p>
            <p className="text-xs text-gray-500">{formatDate(post.publishedAt)}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}

export default async function BlogPage() {
  const content = getContent();
  const allPosts = await content.getAllPosts();
  const featuredPosts = await content.getFeaturedPosts(1);
  const recentPosts = allPosts.filter(p => !featuredPosts.some(f => f.slug === p.slug));

  return (
    <>
      {/* Top Ad */}
      <div className="bg-gray-100 py-2">
        <div className="mx-auto max-w-7xl flex justify-center">
          <AdBanner slot="blog-top-leaderboard" size="leaderboard" />
          <AdBanner slot="blog-top-mobile" size="mobile-banner" />
        </div>
      </div>

      {/* Breadcrumb */}
      <nav className="bg-gray-50 border-b">
        <div className="mx-auto max-w-7xl container-padding py-3">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <Link href="/" className="text-gray-500 hover:text-gray-700">
                Home
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-gray-900 font-medium">Blog</li>
          </ol>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-12 lg:py-16">
        <div className="mx-auto max-w-7xl container-padding">
          <h1 className="text-3xl lg:text-4xl font-display font-bold">
            NigerianDirectory Blog
          </h1>
          <p className="mt-4 text-lg text-primary-100 max-w-2xl">
            Insights on education in Nigeria, school selection guides, and the latest updates 
            from our directory. Stay informed with expert advice and industry news.
          </p>
        </div>
      </section>

      {/* Blog Posts */}
      <section className="py-12 lg:py-16">
        <div className="mx-auto max-w-7xl container-padding">
          {allPosts.length === 0 ? (
            <div className="text-center py-12">
              <svg className="mx-auto w-16 h-16 text-gray-300" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
              </svg>
              <h2 className="mt-4 text-xl font-semibold text-gray-900">Coming Soon</h2>
              <p className="mt-2 text-gray-600">
                We&apos;re working on exciting content. Check back soon!
              </p>
            </div>
          ) : (
            <>
              {/* Featured Post */}
              {featuredPosts.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Featured</h2>
                  <PostCard post={featuredPosts[0]} featured />
                </div>
              )}

              {/* Ad Row */}
              <div className="flex flex-wrap justify-center gap-4 mb-12">
                <AdBanner slot="blog-mid-rect-1" size="rectangle" />
                <AdBanner slot="blog-mid-rect-2" size="rectangle" className="hidden md:flex" />
              </div>

              {/* Recent Posts */}
              {recentPosts.length > 0 && (
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-6">Recent Posts</h2>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recentPosts.map((post) => (
                      <PostCard key={post.slug} post={post} />
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Ads */}
              <div className="flex flex-wrap justify-center gap-4 mt-12">
                <AdBanner slot="blog-bottom-rect-1" size="large-rectangle" />
                <AdBanner slot="blog-bottom-rect-2" size="large-rectangle" className="hidden lg:flex" />
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
