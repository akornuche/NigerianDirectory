/**
 * Content Adapter Interface
 * 
 * This abstraction layer allows us to swap content sources
 * (MDX files -> CMS) without changing the consuming code.
 * 
 * Current implementation: Static MDX files
 * Future: Sanity, Contentful, or other headless CMS
 */

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  content: string;
  publishedAt: string;
  updatedAt?: string;
  author: {
    name: string;
    image?: string;
    role?: string;
  };
  coverImage?: string;
  tags: string[];
  category: string;
  readingTime: number; // in minutes
  featured?: boolean;
}

export interface BlogPostMeta {
  slug: string;
  title: string;
  description: string;
  publishedAt: string;
  author: {
    name: string;
    image?: string;
  };
  coverImage?: string;
  tags: string[];
  category: string;
  readingTime: number;
  featured?: boolean;
}

export interface ContentAdapter {
  getAllPosts(): Promise<BlogPostMeta[]>;
  getPostBySlug(slug: string): Promise<BlogPost | null>;
  getPostsByCategory(category: string): Promise<BlogPostMeta[]>;
  getPostsByTag(tag: string): Promise<BlogPostMeta[]>;
  getFeaturedPosts(limit?: number): Promise<BlogPostMeta[]>;
  getRecentPosts(limit?: number): Promise<BlogPostMeta[]>;
  searchPosts(query: string): Promise<BlogPostMeta[]>;
}

/**
 * Content Provider Type
 * Used to switch between different content sources
 */
export type ContentProviderType = 'mdx' | 'sanity' | 'contentful';

/**
 * Get the current content provider setting
 * Can be configured via environment variable
 */
export function getContentProvider(): ContentProviderType {
  const provider = process.env.CONTENT_PROVIDER as ContentProviderType;
  return provider || 'mdx';
}
