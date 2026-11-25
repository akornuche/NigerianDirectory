import { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getContent } from '@/lib/content';
import AdBanner from '@/components/ads/AdBanner';

interface Props {
  params: Promise<{
    slug: string;
  }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const content = getContent();
  const post = await content.getPostBySlug(slug);

  if (!post) {
    return {
      title: 'Post Not Found',
    };
  }

  return {
    title: `${post.title}`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt,
      authors: [post.author.name],
      images: post.coverImage ? [post.coverImage] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
}

export async function generateStaticParams() {
  const content = getContent();
  const posts = await content.getAllPosts();
  
  return posts.map((post) => ({
    slug: post.slug,
  }));
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-NG', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const content = getContent();
  const post = await content.getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.nigeriandirectory.com.ng';
  const postUrl = `${siteUrl}/blog/${post.slug}`;

  // JSON-LD Article schema
  const articleJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    '@id': postUrl,
    headline: post.title,
    description: post.description,
    image: post.coverImage || `${siteUrl}/og-image.png`,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: {
      '@type': 'Person',
      name: post.author.name,
    },
    publisher: {
      '@type': 'Organization',
      name: 'NigerianDirectory',
      url: siteUrl,
      logo: {
        '@type': 'ImageObject',
        url: `${siteUrl}/og-image.png`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': postUrl,
    },
  };

  // Get related posts
  const recentPosts = await content.getRecentPosts(4);
  const relatedPosts = recentPosts.filter(p => p.slug !== post.slug).slice(0, 3);

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      {/* Top Ad */}
      <div className="bg-gray-100 py-2">
        <div className="mx-auto max-w-7xl flex justify-center">
          <AdBanner slot="blogpost-top-leaderboard" size="leaderboard" />
          <AdBanner slot="blogpost-top-mobile" size="mobile-banner" />
        </div>
      </div>

      {/* Breadcrumb */}
      <nav className="bg-gray-50 border-b">
        <div className="shell py-3">
          <ol className="flex items-center space-x-2 text-sm">
            <li>
              <Link href="/" className="text-gray-500 hover:text-gray-700">
                Home
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li>
              <Link href="/blog" className="text-gray-500 hover:text-gray-700">
                Blog
              </Link>
            </li>
            <li className="text-gray-400">/</li>
            <li className="text-gray-900 font-medium truncate max-w-[200px]">
              {post.title}
            </li>
          </ol>
        </div>
      </nav>

      {/* Article */}
      <article className="py-12 lg:py-16">
        <div className="shell">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Main Content */}
            <div className="lg:col-span-2">
              {/* Header */}
              <header className="mb-8">
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="badge-primary">{post.category}</span>
                  {post.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="badge-secondary">
                      {tag}
                    </span>
                  ))}
                </div>

                <h1 className="text-3xl lg:text-4xl font-display font-bold text-gray-900">
                  {post.title}
                </h1>

                <p className="mt-4 text-xl text-gray-600">
                  {post.description}
                </p>

                <div className="mt-6 flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-full flex items-center justify-center overflow-hidden">
                    {post.author.image ? (
                      <Image
                        src={post.author.image}
                        alt={post.author.name}
                        width={48}
                        height={48}
                        className="rounded-full"
                      />
                    ) : (
                      <span className="text-primary-600 font-semibold text-lg">
                        {post.author.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{post.author.name}</p>
                    <p className="text-sm text-gray-500">
                      {formatDate(post.publishedAt)} · {post.readingTime} min read
                    </p>
                  </div>
                </div>
              </header>

              {/* Cover Image */}
              {post.coverImage && (
                <div className="relative aspect-[16/9] mb-8 rounded-xl overflow-hidden bg-gray-100">
                  <Image
                    src={post.coverImage}
                    alt={post.title}
                    fill
                    className="object-cover"
                    priority
                  />
                </div>
              )}

              {/* Content */}
              <div className="prose prose-lg max-w-none prose-headings:font-display prose-headings:text-gray-900 prose-p:text-gray-600 prose-a:text-primary-600 prose-a:no-underline hover:prose-a:underline prose-strong:text-gray-900 prose-ul:text-gray-600 prose-ol:text-gray-600">
                {/* Render MDX content as HTML-like */}
                {post.content.split('\n').map((paragraph, index) => {
                  // Skip empty lines
                  if (!paragraph.trim()) return null;
                  
                  // Handle headers
                  if (paragraph.startsWith('## ')) {
                    return (
                      <h2 key={index} className="text-2xl font-semibold mt-8 mb-4">
                        {paragraph.replace('## ', '')}
                      </h2>
                    );
                  }
                  if (paragraph.startsWith('### ')) {
                    return (
                      <h3 key={index} className="text-xl font-semibold mt-6 mb-3">
                        {paragraph.replace('### ', '')}
                      </h3>
                    );
                  }
                  
                  // Handle list items
                  if (paragraph.startsWith('- ')) {
                    return (
                      <li key={index} className="ml-4">
                        {paragraph.replace('- ', '')}
                      </li>
                    );
                  }
                  if (/^\d+\. /.test(paragraph)) {
                    return (
                      <li key={index} className="ml-4 list-decimal">
                        {paragraph.replace(/^\d+\. /, '')}
                      </li>
                    );
                  }
                  
                  // Handle bold text
                  const formattedText = paragraph.replace(
                    /\*\*([^*]+)\*\*/g,
                    '<strong>$1</strong>'
                  );
                  
                  // Regular paragraphs
                  return (
                    <p 
                      key={index} 
                      className="mb-4"
                      dangerouslySetInnerHTML={{ __html: formattedText }}
                    />
                  );
                })}
              </div>

              {/* In-content Ad */}
              <div className="flex justify-center my-8">
                <AdBanner slot="blogpost-content-rect" size="large-rectangle" />
              </div>

              {/* Share */}
              <div className="mt-12 pt-8 border-t border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Share this article
                </h3>
                <div className="flex gap-3">
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(postUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Facebook
                  </a>
                  <a
                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(post.title)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600 transition-colors"
                  >
                    Twitter
                  </a>
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(post.title + ' ' + postUrl)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    WhatsApp
                  </a>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <aside className="space-y-6">
              {/* Sidebar Ad */}
              <AdBanner slot="blogpost-sidebar-rect" size="rectangle" />

              {/* Related Posts */}
              {relatedPosts.length > 0 && (
                <div className="card p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Related Articles</h3>
                  <div className="space-y-4">
                    {relatedPosts.map((relatedPost) => (
                      <Link
                        key={relatedPost.slug}
                        href={`/blog/${relatedPost.slug}`}
                        className="block group"
                      >
                        <h4 className="text-sm font-medium text-gray-900 group-hover:text-primary-600 transition-colors line-clamp-2">
                          {relatedPost.title}
                        </h4>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatDate(relatedPost.publishedAt)}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {/* CTA */}
              <div className="card p-6 bg-primary-50 border-primary-100">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Find Schools Near You
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Browse our comprehensive directory of schools across Nigeria.
                </p>
                <Link href="/education/schools" className="btn-primary w-full text-center">
                  Browse Schools
                </Link>
              </div>

              {/* Sidebar Skyscraper */}
              <AdBanner slot="blogpost-sidebar-skyscraper" size="skyscraper" />
            </aside>
          </div>
        </div>
      </article>
    </>
  );
}
