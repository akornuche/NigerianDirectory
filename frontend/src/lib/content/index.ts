/**
 * Content Provider
 * 
 * This is the main entry point for accessing blog content.
 * It uses the adapter pattern to abstract the content source.
 * 
 * Usage:
 * import { getContent } from '@/lib/content';
 * 
 * const posts = await getContent().getAllPosts();
 * const post = await getContent().getPostBySlug('my-post');
 * 
 * To switch to a different content source (e.g., CMS):
 * 1. Set CONTENT_PROVIDER=sanity in .env
 * 2. Implement the sanity adapter
 * 3. The consuming code doesn't need to change
 */

import { ContentAdapter, getContentProvider } from './types';
import { mdxAdapter } from './mdx-adapter';

// Cache the adapter instance
let contentAdapter: ContentAdapter | null = null;

/**
 * Get the content adapter based on configuration
 * Currently only MDX is implemented, but the structure
 * allows easy addition of CMS adapters
 */
export function getContent(): ContentAdapter {
  if (contentAdapter) {
    return contentAdapter;
  }
  
  const provider = getContentProvider();
  
  switch (provider) {
    case 'mdx':
      contentAdapter = mdxAdapter;
      break;
    
    // Future CMS implementations:
    // case 'sanity':
    //   contentAdapter = sanityAdapter;
    //   break;
    // case 'contentful':
    //   contentAdapter = contentfulAdapter;
    //   break;
    
    default:
      contentAdapter = mdxAdapter;
  }
  
  return contentAdapter;
}

// Re-export types for convenience
export type { BlogPost, BlogPostMeta, ContentAdapter } from './types';

// Export utility functions
export { getContentProvider } from './types';
