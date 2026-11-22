import { toSlugSegment } from './slug';

/**
 * Nigeria's 36 states and the Federal Capital Territory, as stored in the
 * database's `state` column.
 */
export const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
  'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT', 'Gombe', 'Imo',
  'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos', 'Nasarawa',
  'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba',
  'Yobe', 'Zamfara',
] as const;

const BY_SLUG = new Map<string, string>(NIGERIAN_STATES.map((s) => [toSlugSegment(s), s]));

/**
 * The state name for a route segment, or null if the segment is not a
 * Nigerian state. Unknown segments must 404 rather than render an empty
 * page, which search engines treat as a soft 404.
 */
export function stateFromSlug(segment: string): string | null {
  return BY_SLUG.get(toSlugSegment(segment)) ?? null;
}
