/**
 * Slug generation utility for user lists
 * Generates URL-friendly slugs from titles with collision handling
 */
import { prisma } from '../db';

const MAX_SLUG_LENGTH = 100;
const MAX_SUFFIX = 999;

/**
 * Convert a title to a URL-friendly slug
 * - Lowercase only
 * - Replace spaces with hyphens
 * - Remove all special characters except hyphens
 * - Collapse multiple hyphens into one
 * - Trim hyphens from start and end
 * @param title The title to convert
 * @returns URL-friendly slug
 */
export function titleToSlug(title: string): string {
  let slug = title
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/[^a-z0-9-]/g, '') // Remove all non-alphanumeric except hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-+|-+$/g, ''); // Trim hyphens from start and end

  // Truncate to max length
  if (slug.length > MAX_SLUG_LENGTH) {
    slug = slug.substring(0, MAX_SLUG_LENGTH);
    // Remove trailing hyphen if truncation created one
    slug = slug.replace(/-+$/, '');
  }

  // If slug is empty after sanitization, use default
  if (!slug) {
    slug = 'list';
  }

  return slug;
}

/**
 * Generate a unique slug for a user's list
 * If slug already exists for the user, appends -1, -2, etc.
 * @param userId User ID
 * @param title List title to convert to slug
 * @param proposedSlug Optional pre-generated slug (if not provided, will be generated from title)
 * @returns Unique slug for the user
 * @throws Error if max suffix (999) is reached
 */
export async function generateUniqueSlug(
  userId: number,
  title: string,
  proposedSlug?: string
): Promise<string> {
  // Start with proposed slug or generate from title
  const baseSlug = proposedSlug ? titleToSlug(proposedSlug) : titleToSlug(title);

  // Check if base slug is available
  const existing = await prisma.userList.findUnique({
    where: {
      userId_urlSlug: {
        userId,
        urlSlug: baseSlug,
      },
    },
    select: { id: true },
  });

  if (!existing) {
    return baseSlug;
  }

  // Base slug is taken, try with suffixes
  for (let suffix = 1; suffix <= MAX_SUFFIX; suffix++) {
    const slugWithSuffix = `${baseSlug}-${suffix}`;

    // Check if this suffixed version is available
    const existingWithSuffix = await prisma.userList.findUnique({
      where: {
        userId_urlSlug: {
          userId,
          urlSlug: slugWithSuffix,
        },
      },
      select: { id: true },
    });

    if (!existingWithSuffix) {
      return slugWithSuffix;
    }
  }

  // If we get here, we've exhausted all suffixes up to MAX_SUFFIX
  throw new Error(`Unable to generate unique slug. Maximum suffix (${MAX_SUFFIX}) reached.`);
}

/**
 * Validate slug format
 * @param slug Slug to validate
 * @returns true if valid, false otherwise
 */
export function isValidSlug(slug: string): boolean {
  // Must match pattern: lowercase alphanumeric and hyphens only
  const slugPattern = /^[a-z0-9-]+$/;

  if (!slugPattern.test(slug)) {
    return false;
  }

  if (slug.length === 0 || slug.length > MAX_SLUG_LENGTH) {
    return false;
  }

  // Cannot start or end with hyphen
  if (slug.startsWith('-') || slug.endsWith('-')) {
    return false;
  }

  // Cannot have consecutive hyphens
  if (slug.includes('--')) {
    return false;
  }

  return true;
}
