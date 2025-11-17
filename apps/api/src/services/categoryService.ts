import { prisma } from '../db';
import { NotFoundError, ConflictError } from '../errors';
import type { Category } from '@prisma/client';
import {
  normalizePaginationParams,
  createPaginatedResponse,
  type PaginationParams,
  type PaginatedResponse,
} from '../utils/pagination';
import { CacheInvalidation } from '../cache';

export interface CreateCategoryDto {
  name: string;
  slug: string;
  description?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  isActive?: boolean;
}

export interface UpdateCategoryDto {
  name?: string;
  slug?: string;
  description?: string | null;
  metaTitle?: string | null;
  metaDescription?: string | null;
  isActive?: boolean;
}

/**
 * Get all categories (paginated)
 */
export async function getAllCategories(
  params?: PaginationParams
): Promise<PaginatedResponse<Category>> {
  const { page, limit, skip, take } = normalizePaginationParams(params || {});

  const [data, totalCount] = await Promise.all([
    prisma.category.findMany({
      orderBy: { name: 'asc' },
      skip,
      take,
    }),
    prisma.category.count(),
  ]);

  return createPaginatedResponse(data, page, limit, totalCount);
}

/**
 * Get category by ID
 */
export async function getCategoryById(id: number): Promise<Category> {
  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
    throw new NotFoundError('Category', id);
  }

  return category;
}

/**
 * Create new category
 */
export async function createCategory(data: CreateCategoryDto): Promise<Category> {
  try {
    const category = await prisma.category.create({
      data: {
        name: data.name,
        slug: data.slug,
        description: data.description,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        isActive: data.isActive ?? true,
      },
    });

    // Invalidate caches
    await CacheInvalidation.categories();

    return category;
  } catch (error: any) {
    if (error.code === 'P2002') {
      throw new ConflictError('Category with this slug already exists', 'slug');
    }
    throw error;
  }
}

/**
 * Update category
 */
export async function updateCategory(
  id: number,
  data: UpdateCategoryDto
): Promise<Category> {
  try {
    const category = await prisma.category.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.slug !== undefined && { slug: data.slug }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.metaTitle !== undefined && { metaTitle: data.metaTitle }),
        ...(data.metaDescription !== undefined && { metaDescription: data.metaDescription }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      },
    });

    // Invalidate caches
    await CacheInvalidation.category(id);

    return category;
  } catch (error: any) {
    if (error.code === 'P2025') {
      throw new NotFoundError('Category', id);
    }
    if (error.code === 'P2002') {
      throw new ConflictError('Category with this slug already exists', 'slug');
    }
    throw error;
  }
}

/**
 * Delete category
 */
export async function deleteCategory(id: number): Promise<void> {
  try {
    await prisma.category.delete({
      where: { id },
    });

    // Invalidate caches
    await CacheInvalidation.category(id);
  } catch (error: any) {
    if (error.code === 'P2025') {
      throw new NotFoundError('Category', id);
    }
    if (error.code === 'P2003' || error.code === 'P2014') {
      throw new ConflictError('Cannot delete category with associated listings');
    }
    throw error;
  }
}
