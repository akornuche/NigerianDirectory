/**
 * Common API response types
 */

export interface PaginatedResponse<T> {
    pagination: {
        page: number;
        limit: number;
        totalCount: number;
        totalPages: number;
        hasMore: boolean;
    };
    [key: string]: T[] | PaginatedResponse<T>['pagination'];
}

export interface SchoolsResponse {
    schools: import('./school').School[];
    pagination: {
        page: number;
        limit: number;
        totalCount: number;
        totalPages: number;
        hasMore: boolean;
    };
}

export interface StatsResponse {
    totalSchools: number;
    schoolsByType: Record<string, number>;
    schoolsByState: Record<string, number>;
}

export interface LocationStatsResponse {
    totalStates: number;
    totalCities: number;
    totalAreas: number;
}

export interface BlogDataResponse {
    school: import('./school').School;
    relatedSchools: import('./school').School[];
    blogContent: {
        title: string;
        metaTitle: string;
        metaDescription: string;
        sections: Array<{
            title: string;
            content: string;
        }>;
    };
}

export interface PageViewStats {
    total_views: number;
    unique_visitors: number;
    schools_viewed: number;
    listing_views: number;
    blog_views: number;
    views_today: number;
    views_this_week: number;
}
