/**
 * School type definitions
 * Extracted from api.ts for centralized type management
 */

export interface School {
    id: string;
    uuid?: string;
    name: string;
    slug: string;
    type: string;
    state: string;
    city: string;
    area: string;
    address?: string;
    latitude?: number;
    longitude?: number;
    curriculum?: string;
    levels?: string;
    boarding: boolean;
    day_school: boolean;
    gender?: string;
    phone?: string;
    email?: string;
    website?: string;
    social_links?: Record<string, string>;

    // Summary fields
    template_summary?: string;
    ai_summary?: string;
    needs_ai_enrichment?: boolean;
    summary_template_id?: string;

    // Enriched content (web-sourced / AI-generated)
    enriched_history?: string;
    enriched_academics?: string;
    enriched_student_life?: string;
    enriched_notable_alumni?: string[];
    enriched_recent_news?: string[];
    enriched_campus_info?: string;
    enriched_at?: string;
    enrichment_status?: 'pending' | 'processing' | 'completed' | 'failed';

    // Content sources for outbound links and attribution
    content_sources?: ContentSource[];

    // Additional info
    established_year?: number;
    principal_name?: string;
    principal_title?: string;
    principal_image_url?: string;
    management_info?: ManagementMember[];
    facilities?: string[];
    achievements?: string[];
    student_life?: Record<string, string>;
    fee_range?: string;
    student_count?: number;

    // Images
    logo_url?: string;
    hero_image_url?: string;
    gallery_images?: string[];

    // Status flags
    claimed: boolean;
    verified: boolean;
    featured: boolean;

    // SEO
    meta_title?: string;
    meta_description?: string;

    // Timestamps
    created_at: string;
    updated_at: string;
}

export interface ContentSource {
    url: string;
    title: string;
    type: 'official' | 'reference' | 'news';
}

export interface ManagementMember {
    name: string;
    title: string;
    image_url?: string;
}

export interface SchoolFilters {
    state?: string;
    city?: string;
    area?: string;
    type?: string;
    curriculum?: string;
    gender?: string;
    boarding?: boolean;
    search?: string;
}
