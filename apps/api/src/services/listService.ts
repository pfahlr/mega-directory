/**
 * List service for user collections
 * Handles CRUD operations for lists and list items
 */
import { prisma } from '../db';
import { generateUniqueSlug, isValidSlug } from '../utils/slugGenerator';

const MAX_ITEMS_PER_LIST = 255;

// Types
export interface CreateListInput {
  userId: number;
  title: string;
  description?: string;
  urlSlug?: string;
  unlisted?: boolean;
  locationAgnostic?: boolean;
}

export interface UpdateListInput {
  title?: string;
  description?: string;
  unlisted?: boolean;
  locationAgnostic?: boolean;
}

export interface AddListItemInput {
  listId: number;
  listingId: number;
  position?: number;
  notes?: string;
}

export interface UpdateListItemInput {
  position?: number;
  notes?: string;
}

/**
 * Get all lists for a user
 * @param userId User ID
 * @param includeUnlisted Include unlisted lists (default: true)
 * @returns Array of user lists with item counts
 */
export async function getUserLists(userId: number, includeUnlisted: boolean = true) {
  const where = includeUnlisted
    ? { userId }
    : { userId, unlisted: false };

  const lists = await prisma.userList.findMany({
    where,
    select: {
      id: true,
      title: true,
      description: true,
      urlSlug: true,
      unlisted: true,
      locationAgnostic: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: { items: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return lists.map((list) => ({
    ...list,
    itemCount: list._count.items,
    _count: undefined,
  }));
}

/**
 * Get a single list by ID with all items
 * @param listId List ID
 * @param userId Optional user ID for ownership check
 * @returns List with items or null if not found
 */
export async function getListById(listId: number, userId?: number) {
  const list = await prisma.userList.findUnique({
    where: { id: listId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          photo: true,
        },
      },
      items: {
        include: {
          listing: {
            include: {
              addresses: true,
              categories: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
        orderBy: { position: 'asc' },
      },
    },
  });

  if (!list) {
    return null;
  }

  // Check if user has access
  if (list.unlisted && userId !== list.userId) {
    // Unlisted lists are only accessible to owner
    // In a real app, we might want to allow access via direct link
    // For now, we'll return null for non-owners
    return null;
  }

  return list;
}

/**
 * Get list by username and slug
 * @param username User's username
 * @param slug List slug
 * @param userId Optional user ID for ownership check
 * @returns List with items or null
 */
export async function getListByUsernameAndSlug(
  username: string,
  slug: string,
  userId?: number
) {
  const list = await prisma.userList.findFirst({
    where: {
      urlSlug: slug,
      user: {
        username,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          photo: true,
        },
      },
      items: {
        include: {
          listing: {
            include: {
              addresses: true,
              categories: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
        orderBy: { position: 'asc' },
      },
    },
  });

  if (!list) {
    return null;
  }

  // Check access for unlisted lists
  if (list.unlisted && userId !== list.userId) {
    // For unlisted lists, anyone with the direct link can view
    // We'll allow access here since they know the URL
    // In production, you might want additional security
  }

  return list;
}

/**
 * Create a new list
 * @param input List creation data
 * @returns Created list
 */
export async function createList(input: CreateListInput) {
  const { userId, title, description, urlSlug, unlisted, locationAgnostic } = input;

  // Validate title
  if (!title || title.trim().length === 0) {
    throw new Error('Title is required');
  }

  if (title.length > 200) {
    throw new Error('Title must be 200 characters or less');
  }

  // Validate description
  if (description && description.length > 2000) {
    throw new Error('Description must be 2000 characters or less');
  }

  // Validate custom slug if provided
  if (urlSlug && !isValidSlug(urlSlug)) {
    throw new Error('Invalid slug format. Use only lowercase letters, numbers, and hyphens.');
  }

  // Generate unique slug
  const uniqueSlug = await generateUniqueSlug(userId, title, urlSlug);

  // Create list
  const list = await prisma.userList.create({
    data: {
      userId,
      title: title.trim(),
      description: description?.trim() || null,
      urlSlug: uniqueSlug,
      unlisted: unlisted || false,
      locationAgnostic: locationAgnostic || false,
    },
    include: {
      _count: {
        select: { items: true },
      },
    },
  });

  return {
    ...list,
    itemCount: list._count.items,
    _count: undefined,
  };
}

/**
 * Update a list
 * @param listId List ID
 * @param userId User ID (for ownership check)
 * @param input Update data
 * @returns Updated list
 */
export async function updateList(
  listId: number,
  userId: number,
  input: UpdateListInput
) {
  // Check ownership
  const existing = await prisma.userList.findUnique({
    where: { id: listId },
    select: { userId: true },
  });

  if (!existing) {
    throw new Error('List not found');
  }

  if (existing.userId !== userId) {
    throw new Error('Not authorized to update this list');
  }

  // Validate title if provided
  if (input.title !== undefined) {
    if (!input.title || input.title.trim().length === 0) {
      throw new Error('Title cannot be empty');
    }
    if (input.title.length > 200) {
      throw new Error('Title must be 200 characters or less');
    }
  }

  // Validate description if provided
  if (input.description !== undefined && input.description && input.description.length > 2000) {
    throw new Error('Description must be 2000 characters or less');
  }

  // Update list
  const updateData: any = {};
  if (input.title !== undefined) updateData.title = input.title.trim();
  if (input.description !== undefined) updateData.description = input.description?.trim() || null;
  if (input.unlisted !== undefined) updateData.unlisted = input.unlisted;
  if (input.locationAgnostic !== undefined) updateData.locationAgnostic = input.locationAgnostic;

  const list = await prisma.userList.update({
    where: { id: listId },
    data: updateData,
    include: {
      _count: {
        select: { items: true },
      },
    },
  });

  return {
    ...list,
    itemCount: list._count.items,
    _count: undefined,
  };
}

/**
 * Delete a list
 * @param listId List ID
 * @param userId User ID (for ownership check)
 * @returns true if deleted
 */
export async function deleteList(listId: number, userId: number): Promise<boolean> {
  // Check ownership
  const existing = await prisma.userList.findUnique({
    where: { id: listId },
    select: { userId: true },
  });

  if (!existing) {
    throw new Error('List not found');
  }

  if (existing.userId !== userId) {
    throw new Error('Not authorized to delete this list');
  }

  // Delete list (cascade will delete items)
  await prisma.userList.delete({
    where: { id: listId },
  });

  return true;
}

/**
 * Add listing to list
 * @param input Add item data
 * @returns Created list item
 */
export async function addListItem(input: AddListItemInput) {
  const { listId, listingId, position, notes } = input;

  // Check if list exists and get owner
  const list = await prisma.userList.findUnique({
    where: { id: listId },
    include: {
      _count: {
        select: { items: true },
      },
    },
  });

  if (!list) {
    throw new Error('List not found');
  }

  // Check item count limit
  if (list._count.items >= MAX_ITEMS_PER_LIST) {
    throw new Error(`List is full. Maximum ${MAX_ITEMS_PER_LIST} items allowed.`);
  }

  // Check if listing exists
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true },
  });

  if (!listing) {
    throw new Error('Listing not found');
  }

  // Check if listing is already in list
  const existing = await prisma.listItem.findUnique({
    where: {
      listId_listingId: {
        listId,
        listingId,
      },
    },
  });

  if (existing) {
    throw new Error('Listing is already in this list');
  }

  // Validate notes length
  if (notes && notes.length > 500) {
    throw new Error('Notes must be 500 characters or less');
  }

  // If no position specified, add to end
  const finalPosition = position !== undefined
    ? position
    : list._count.items; // Will be the new last position

  // Create list item
  const item = await prisma.listItem.create({
    data: {
      listId,
      listingId,
      position: finalPosition,
      notes: notes?.trim() || null,
    },
    include: {
      listing: {
        include: {
          addresses: true,
          categories: {
            include: {
              category: true,
            },
          },
        },
      },
    },
  });

  return item;
}

/**
 * Update list item
 * @param listId List ID
 * @param listingId Listing ID
 * @param userId User ID (for ownership check)
 * @param input Update data
 * @returns Updated item
 */
export async function updateListItem(
  listId: number,
  listingId: number,
  userId: number,
  input: UpdateListItemInput
) {
  // Check ownership
  const list = await prisma.userList.findUnique({
    where: { id: listId },
    select: { userId: true },
  });

  if (!list) {
    throw new Error('List not found');
  }

  if (list.userId !== userId) {
    throw new Error('Not authorized to update this list');
  }

  // Check if item exists
  const existing = await prisma.listItem.findUnique({
    where: {
      listId_listingId: {
        listId,
        listingId,
      },
    },
  });

  if (!existing) {
    throw new Error('Item not found in list');
  }

  // Validate notes if provided
  if (input.notes !== undefined && input.notes && input.notes.length > 500) {
    throw new Error('Notes must be 500 characters or less');
  }

  // Update data
  const updateData: any = {};
  if (input.position !== undefined) updateData.position = input.position;
  if (input.notes !== undefined) updateData.notes = input.notes?.trim() || null;

  const item = await prisma.listItem.update({
    where: {
      listId_listingId: {
        listId,
        listingId,
      },
    },
    data: updateData,
    include: {
      listing: {
        include: {
          addresses: true,
          categories: {
            include: {
              category: true,
            },
          },
        },
      },
    },
  });

  return item;
}

/**
 * Remove listing from list
 * @param listId List ID
 * @param listingId Listing ID
 * @param userId User ID (for ownership check)
 * @returns true if deleted
 */
export async function removeListItem(
  listId: number,
  listingId: number,
  userId: number
): Promise<boolean> {
  // Check ownership
  const list = await prisma.userList.findUnique({
    where: { id: listId },
    select: { userId: true },
  });

  if (!list) {
    throw new Error('List not found');
  }

  if (list.userId !== userId) {
    throw new Error('Not authorized to modify this list');
  }

  // Delete item
  await prisma.listItem.delete({
    where: {
      listId_listingId: {
        listId,
        listingId,
      },
    },
  });

  return true;
}

/**
 * Bulk reorder list items
 * @param listId List ID
 * @param userId User ID (for ownership check)
 * @param listingIds Array of listing IDs in desired order
 * @returns true if successful
 */
export async function reorderListItems(
  listId: number,
  userId: number,
  listingIds: number[]
): Promise<boolean> {
  // Check ownership
  const list = await prisma.userList.findUnique({
    where: { id: listId },
    include: {
      items: {
        select: { listingId: true },
      },
    },
  });

  if (!list) {
    throw new Error('List not found');
  }

  if (list.userId !== userId) {
    throw new Error('Not authorized to modify this list');
  }

  // Validate that all provided listing IDs belong to this list
  const currentListingIds = list.items.map((item) => item.listingId);
  const providedSet = new Set(listingIds);
  const currentSet = new Set(currentListingIds);

  // Check for missing or extra IDs
  if (providedSet.size !== currentSet.size) {
    throw new Error('Listing IDs count mismatch');
  }

  for (const id of listingIds) {
    if (!currentSet.has(id)) {
      throw new Error(`Listing ${id} is not in this list`);
    }
  }

  // Update positions
  const updates = listingIds.map((listingId, index) =>
    prisma.listItem.update({
      where: {
        listId_listingId: {
          listId,
          listingId,
        },
      },
      data: {
        position: index,
      },
    })
  );

  await prisma.$transaction(updates);

  return true;
}
