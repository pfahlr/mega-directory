/**
 * Type definitions for API server
 * These types align with the Prisma schema models
 */

// Enum types matching Prisma schema
export type ListingStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'INACTIVE';
export type DirectoryStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
export type SlotType = 'HERO' | 'PREMIUM' | 'STANDARD';

// Base model interfaces
export interface ListingAddress {
  id: number;
  listingId: number;
  label?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  region?: string | null;
  postalCode?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  isPrimary: boolean;
  countryId?: number | null;
  stateId?: number | null;
  cityId?: number | null;
  postalCodeId?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  heroImageUrl?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface Directory {
  id: number;
  title: string;
  slug: string;
  subdomain: string;
  subdirectory: string;
  hostname?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  introMarkdown?: string | null;
  status: DirectoryStatus;
  featuredLimit: number;
  metaTitle?: string | null;
  metaDescription?: string | null;
  metaKeywords?: string | null;
  ogImageUrl?: string | null;
  locationAgnostic: boolean;
  isActive: boolean;
  categoryId: number;
  locationId?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Listing {
  id: number;
  title: string;
  slug: string;
  tagline?: string | null;
  summary?: string | null;
  description?: string | null;
  websiteUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  priceRange?: string | null;
  rating?: number | null;
  reviewCount?: number | null;
  score?: number | null;
  status: ListingStatus;
  isClaimed: boolean;
  isSponsored: boolean;
  sourceName?: string | null;
  sourceUrl?: string | null;
  sourceId?: string | null;
  crawlerRunId?: string | null;
  rawPayload?: unknown;
  generatedPayload?: unknown;
  notes?: string | null;
  ingestedAt?: Date | null;
  approvedAt?: Date | null;
  publishedAt?: Date | null;
  archivedAt?: Date | null;
  locationId?: number | null;
  directoryId?: number | null;
  approvedById?: number | null;
  countryId?: number | null;
  stateId?: number | null;
  cityId?: number | null;
  postalCodeId?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

// Extended types with relations
export interface ListingWithRelations extends Listing {
  addresses: ListingAddress[];
  categories: Array<{
    category: Category;
    isPrimary: boolean;
    assignedAt: Date;
  }>;
  directory?: Directory | null;
}

// API Response types
export interface ListingResponse {
  id: number;
  title: string;
  slug: string;
  tagline?: string | null;
  summary?: string | null;
  description?: string | null;
  websiteUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  status: ListingStatus;
  addresses: ListingAddress[];
  categoryIds: number[];
  createdAt: string;
  updatedAt: string;
}

export interface DirectoryResponse {
  id: number;
  title: string;
  slug: string;
  subdomain: string;
  subdirectory: string;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  status: DirectoryStatus;
  locationAgnostic: boolean;
  categoryId: number;
  locationId?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CategoryResponse {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// API Request body types
export interface CreateListingRequest {
  title: string;
  slug: string;
  summary?: string | null;
  description?: string | null;
  websiteUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  status?: ListingStatus;
  directoryId?: number | null;
  categoryIds?: number[];
  addresses?: Array<{
    addressLine1?: string | null;
    addressLine2?: string | null;
    city?: string | null;
    region?: string | null;
    postalCode?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }>;
}

export interface UpdateListingRequest {
  title?: string;
  slug?: string;
  summary?: string | null;
  description?: string | null;
  websiteUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  status?: ListingStatus;
  directoryId?: number | null;
}

export interface CreateDirectoryRequest {
  title: string;
  slug: string;
  subdomain: string;
  subdirectory: string;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  status?: DirectoryStatus;
  categoryId: number;
  locationId?: number | null;
  locationAgnostic?: boolean;
}

export interface UpdateDirectoryRequest {
  title?: string;
  slug?: string;
  subdomain?: string;
  subdirectory?: string;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  status?: DirectoryStatus;
  categoryId?: number;
  locationId?: number | null;
  locationAgnostic?: boolean;
}

export interface CreateCategoryRequest {
  name: string;
  slug: string;
  description?: string | null;
}

export interface UpdateCategoryRequest {
  name?: string;
  slug?: string;
  description?: string | null;
  isActive?: boolean;
}
