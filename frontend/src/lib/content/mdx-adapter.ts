import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { ContentAdapter, BlogPost, BlogPostMeta } from './types';

/**
 * MDX Content Adapter
 * 
 * Reads blog posts from local MDX files in /content/blog/
 * This is the default adapter for the static MDX implementation.
 * 
 * File structure expected:
 * /content/blog/
 *   ├── my-first-post.mdx
 *   ├── another-post.mdx
 *   └── ...
 * 
 * MDX frontmatter format:
 * ---
 * title: "Post Title"
 * description: "Post description"
 * publishedAt: "2024-01-01"
 * author:
 *   name: "Author Name"
 *   image: "/images/authors/author.jpg"
 *   role: "Editor"
 * coverImage: "/images/blog/cover.jpg"
 * tags: ["education", "schools"]
 * category: "Education"
 * featured: false
 * ---
 */

const BLOG_CONTENT_DIR = path.join(process.cwd(), 'content', 'blog');

function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const wordCount = content.split(/\s+/).length;
  return Math.ceil(wordCount / wordsPerMinute);
}

function ensureContentDirExists(): void {
  if (!fs.existsSync(BLOG_CONTENT_DIR)) {
    fs.mkdirSync(BLOG_CONTENT_DIR, { recursive: true });
  }
}

function parsePostFile(filename: string): BlogPost | null {
  try {
    const filePath = path.join(BLOG_CONTENT_DIR, filename);
    const fileContents = fs.readFileSync(filePath, 'utf8');
    const { data, content } = matter(fileContents);
    
    const slug = filename.replace(/\.mdx?$/, '');
    
    return {
      slug,
      title: data.title || 'Untitled',
      description: data.description || '',
      content,
      publishedAt: data.publishedAt || new Date().toISOString(),
      updatedAt: data.updatedAt,
      author: {
        name: data.author?.name || 'NigerianDirectory Team',
        image: data.author?.image,
        role: data.author?.role,
      },
      coverImage: data.coverImage,
      tags: data.tags || [],
      category: data.category || 'General',
      readingTime: calculateReadingTime(content),
      featured: data.featured || false,
    };
  } catch (error) {
    console.error(`Error parsing post file ${filename}:`, error);
    return null;
  }
}

function postToMeta(post: BlogPost): BlogPostMeta {
  return {
    slug: post.slug,
    title: post.title,
    description: post.description,
    publishedAt: post.publishedAt,
    author: {
      name: post.author.name,
      image: post.author.image,
    },
    coverImage: post.coverImage,
    tags: post.tags,
    category: post.category,
    readingTime: post.readingTime,
    featured: post.featured,
  };
}

export const mdxAdapter: ContentAdapter = {
  async getAllPosts(): Promise<BlogPostMeta[]> {
    ensureContentDirExists();
    
    try {
      const files = fs.readdirSync(BLOG_CONTENT_DIR);
      const mdxFiles = files.filter(file => /\.mdx?$/.test(file));
      
      const posts = mdxFiles
        .map(file => parsePostFile(file))
        .filter((post): post is BlogPost => post !== null)
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
        .map(postToMeta);
      
      return posts;
    } catch (error) {
      console.error('Error reading blog posts:', error);
      return [];
    }
  },

  async getPostBySlug(slug: string): Promise<BlogPost | null> {
    ensureContentDirExists();
    
    // Try .mdx first, then .md
    const extensions = ['.mdx', '.md'];
    
    for (const ext of extensions) {
      const filename = `${slug}${ext}`;
      const filePath = path.join(BLOG_CONTENT_DIR, filename);
      
      if (fs.existsSync(filePath)) {
        return parsePostFile(filename);
      }
    }
    
    return null;
  },

  async getPostsByCategory(category: string): Promise<BlogPostMeta[]> {
    const allPosts = await this.getAllPosts();
    return allPosts.filter(
      post => post.category.toLowerCase() === category.toLowerCase()
    );
  },

  async getPostsByTag(tag: string): Promise<BlogPostMeta[]> {
    const allPosts = await this.getAllPosts();
    return allPosts.filter(post =>
      post.tags.some(t => t.toLowerCase() === tag.toLowerCase())
    );
  },

  async getFeaturedPosts(limit = 3): Promise<BlogPostMeta[]> {
    const allPosts = await this.getAllPosts();
    return allPosts.filter(post => post.featured).slice(0, limit);
  },

  async getRecentPosts(limit = 6): Promise<BlogPostMeta[]> {
    const allPosts = await this.getAllPosts();
    return allPosts.slice(0, limit);
  },

  async searchPosts(query: string): Promise<BlogPostMeta[]> {
    const allPosts = await this.getAllPosts();
    const lowerQuery = query.toLowerCase();
    
    return allPosts.filter(post =>
      post.title.toLowerCase().includes(lowerQuery) ||
      post.description.toLowerCase().includes(lowerQuery) ||
      post.tags.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
      post.category.toLowerCase().includes(lowerQuery)
    );
  },
};
