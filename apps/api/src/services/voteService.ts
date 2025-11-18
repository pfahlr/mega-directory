/**
 * Vote service for listing upvote/downvote system
 * Handles vote creation, updates, and removal (toggle behavior)
 */
import { prisma } from '../db';

export type VoteType = 'UPVOTE' | 'DOWNVOTE';

export interface VoteCounts {
  upvoteCount: number;
  downvoteCount: number;
  netScore: number;
}

export interface VoteResult {
  vote: {
    id: number;
    userId: number;
    listingId: number;
    voteType: VoteType;
    createdAt: Date;
  } | null;
  counts: VoteCounts;
}

/**
 * Get vote counts for a listing
 * @param listingId Listing ID
 * @returns Vote counts
 */
export async function getVoteCounts(listingId: number): Promise<VoteCounts> {
  const votes = await prisma.vote.groupBy({
    by: ['voteType'],
    where: { listingId },
    _count: true,
  });

  let upvoteCount = 0;
  let downvoteCount = 0;

  for (const vote of votes) {
    if (vote.voteType === 'UPVOTE') {
      upvoteCount = vote._count;
    } else if (vote.voteType === 'DOWNVOTE') {
      downvoteCount = vote._count;
    }
  }

  return {
    upvoteCount,
    downvoteCount,
    netScore: upvoteCount - downvoteCount,
  };
}

/**
 * Submit or update a vote
 * Handles the following cases:
 * - No existing vote + upvote: create upvote
 * - No existing vote + downvote: create downvote
 * - Existing upvote + upvote: remove vote (toggle off)
 * - Existing upvote + downvote: change to downvote
 * - Existing downvote + downvote: remove vote (toggle off)
 * - Existing downvote + upvote: change to upvote
 * - No existing vote + null: no-op
 * - Existing vote + null: remove vote
 *
 * @param userId User ID
 * @param listingId Listing ID
 * @param voteType Vote type or null to remove
 * @returns Vote result with updated counts
 */
export async function submitVote(
  userId: number,
  listingId: number,
  voteType: VoteType | null
): Promise<VoteResult> {
  // Check if listing exists
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true },
  });

  if (!listing) {
    throw new Error('Listing not found');
  }

  // Get existing vote
  const existingVote = await prisma.vote.findUnique({
    where: {
      userId_listingId: {
        userId,
        listingId,
      },
    },
  });

  let resultVote = null;

  if (!existingVote) {
    // No existing vote
    if (voteType) {
      // Create new vote
      resultVote = await prisma.vote.create({
        data: {
          userId,
          listingId,
          voteType,
        },
      });
    }
    // If voteType is null and no existing vote, do nothing
  } else {
    // Existing vote
    if (!voteType) {
      // Remove vote
      await prisma.vote.delete({
        where: {
          userId_listingId: {
            userId,
            listingId,
          },
        },
      });
    } else if (existingVote.voteType === voteType) {
      // Same vote type - toggle off (remove)
      await prisma.vote.delete({
        where: {
          userId_listingId: {
            userId,
            listingId,
          },
        },
      });
    } else {
      // Different vote type - change vote
      resultVote = await prisma.vote.update({
        where: {
          userId_listingId: {
            userId,
            listingId,
          },
        },
        data: {
          voteType,
        },
      });
    }
  }

  // Get updated counts
  const counts = await getVoteCounts(listingId);

  return {
    vote: resultVote,
    counts,
  };
}

/**
 * Get user's vote for a listing
 * @param userId User ID
 * @param listingId Listing ID
 * @returns Vote or null
 */
export async function getUserVote(userId: number, listingId: number) {
  return prisma.vote.findUnique({
    where: {
      userId_listingId: {
        userId,
        listingId,
      },
    },
  });
}

/**
 * Get user's votes for multiple listings
 * @param userId User ID
 * @param listingIds Array of listing IDs
 * @returns Map of listing ID to vote type
 */
export async function getUserVotesForListings(
  userId: number,
  listingIds: number[]
): Promise<Map<number, VoteType>> {
  const votes = await prisma.vote.findMany({
    where: {
      userId,
      listingId: { in: listingIds },
    },
    select: {
      listingId: true,
      voteType: true,
    },
  });

  const voteMap = new Map<number, VoteType>();
  for (const vote of votes) {
    voteMap.set(vote.listingId, vote.voteType as VoteType);
  }

  return voteMap;
}
