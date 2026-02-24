/**
 * Location type definitions
 */

export interface Location {
    id: string;
    country?: string;
    state: string;
    city: string;
    area?: string;
    slug?: string;
    latitude?: number;
    longitude?: number;
    population?: number;
    is_major_city?: boolean;
    school_count?: number;
}

export interface LocationHierarchy {
    state: Location | null;
    city: Location | null;
    area: Location | null;
}
