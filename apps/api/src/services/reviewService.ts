/**
 * Review service
 * Handles review CRUD, spam detection, image uploads, and moderation
 */
import { PrismaClient, ReviewStatus, ImageFormat } from '@prisma/client';
import { detectSpam, shouldRejectReview } from '../utils/spamDetection';
import { processImage, saveImageToLocal, deleteImageFromLocal } from '../utils/imageProcessor';
import { createLogger } from '../logger';

const prisma = new PrismaClient();
const logger = createLogger({ name: 'review-service' });

const MIN_REVIEW_LENGTH = 10;
const MAX_REVIEW_LENGTH = 5000;
const MAX_IMAGES = 5;

/**
 * Convert image processor format to Prisma ImageFormat enum
 */
function toImageFormat(format: string): ImageFormat {
  const upperFormat = format.toUpperCase();
  if (upperFormat === 'WEBP') return ImageFormat.WEBP;
  if (upperFormat === 'AVIF') return ImageFormat.AVIF;
  if (upperFormat === 'JPG' || upperFormat === 'JPEG') return ImageFormat.JPG;
  if (upperFormat === 'PNG') return ImageFormat.PNG;
  return ImageFormat.WEBP; // Default fallback
}

export interface CreateReviewInput {
  userId: number;
  listingId: number;
  rating?: number | null;
  text: string;
  images?: {
    buffer: Buffer;
    originalFilename: string;
  }[];
  ipAddress?: string;
  autoApprove?: boolean; // Site setting for moderation mode
}

export interface UpdateReviewInput {
  rating?: number | null;
  text?: string;
}

export interface ModerateReviewInput {
  status: ReviewStatus;
  moderatorNotes?: string;
}

export interface ReviewWithDetails {
  id: number;
  userId: number;
  listingId: number;
  rating: number | null;
  text: string;
  status: ReviewStatus;
  spamScore: any;
  spamDetails: any;
  createdAt: Date;
  updatedAt: Date;
  user: {
    id: number;
    username: string | null;
    displayName: string | null;
  };
  images: {
    id: number;
    url: string;
    width: number | null;
    height: number | null;
  }[];
}

/**
 * Validate review text
 * @param text Review text
 */
function validateReviewText(text: string): void {
  if (!text || typeof text !== 'string') {
    throw new Error('Review text is required');
  }

  const trimmed = text.trim();

  if (trimmed.length < MIN_REVIEW_LENGTH) {
    throw new Error(`Review must be at least ${MIN_REVIEW_LENGTH} characters`);
  }

  if (trimmed.length > MAX_REVIEW_LENGTH) {
    throw new Error(`Review must not exceed ${MAX_REVIEW_LENGTH} characters`);
  }
}

/**
 * Validate review rating
 * @param rating Review rating (1-5)
 */
function validateRating(rating: number | null | undefined): void {
  if (rating !== null && rating !== undefined) {
    if (typeof rating !== 'number' || rating < 1 || rating > 5 || !Number.isInteger(rating)) {
      throw new Error('Rating must be an integer between 1 and 5');
    }
  }
}

/**
 * Create a new review with spam detection and image processing
 * @param input Review data
 * @returns Created review
 */
export async function createReview(input: CreateReviewInput): Promise<ReviewWithDetails> {
  const { userId, listingId, rating, text, images, ipAddress, autoApprove = false } = input;

  // Validate text and rating
  validateReviewText(text);
  validateRating(rating);

  // Validate images count
  if (images && images.length > MAX_IMAGES) {
    throw new Error(`Maximum ${MAX_IMAGES} images allowed per review`);
  }

  // Check if user already reviewed this listing
  const existingReview = await prisma.review.findUnique({
    where: {
      userId_listingId: {
        userId,
        listingId,
      },
    },
  });

  if (existingReview) {
    throw new Error('You have already reviewed this listing');
  }

  // Verify listing exists
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
  });

  if (!listing) {
    throw new Error('Listing not found');
  }

  // Run spam detection
  const spamResult = await detectSpam(text);
  const isSpam = shouldRejectReview(spamResult);

  // Determine initial status
  let initialStatus: ReviewStatus;
  if (isSpam) {
    // Auto-reject spam
    initialStatus = ReviewStatus.REJECTED;
    logger.warn({
      userId,
      listingId,
      spamScore: spamResult.confidence,
      reasons: spamResult.reasons,
    }, 'Review rejected as spam');
  } else if (autoApprove) {
    // Post-moderation mode: approve by default
    initialStatus = ReviewStatus.APPROVED;
  } else {
    // Pre-moderation mode: pending by default
    initialStatus = ReviewStatus.PENDING;
  }

  // Process images if provided
  const processedImages: Array<{
    originalFilename: string;
    storedFilename: string;
    url: string;
    sizeBytes: number;
    width: number;
    height: number;
    format: ImageFormat;
  }> = [];

  if (images && images.length > 0) {
    for (const image of images) {
      try {
        // Process image
        const processed = await processImage(image.buffer, image.originalFilename);

        // Save to filesystem
        const { url } = await saveImageToLocal(processed);

        processedImages.push({
          originalFilename: image.originalFilename,
          storedFilename: processed.filename,
          url,
          sizeBytes: processed.sizeBytes,
          width: processed.width,
          height: processed.height,
          format: toImageFormat(processed.format),
        });

        logger.info({
          filename: processed.filename,
          sizeBytes: processed.sizeBytes,
          format: processed.format,
        }, 'Review image processed');
      } catch (error: any) {
        logger.error({ error, filename: image.originalFilename }, 'Failed to process image');
        throw new Error(`Failed to process image "${image.originalFilename}": ${error.message}`);
      }
    }
  }

  // Create review with images
  const review = await prisma.review.create({
    data: {
      userId,
      listingId,
      rating: rating || null,
      text: text.trim(),
      status: initialStatus,
      spamScore: spamResult.confidence,
      spamDetails: {
        isSpam: spamResult.isSpam,
        reasons: spamResult.reasons,
        extractedUrls: spamResult.extractedUrls,
        extractedEmails: spamResult.extractedEmails,
        extractedPhones: spamResult.extractedPhones,
      },
      ipAddress,
      images: {
        create: processedImages.map((img) => ({
          originalFilename: img.originalFilename,
          storedFilename: img.storedFilename,
          url: img.url,
          sizeBytes: img.sizeBytes,
          width: img.width,
          height: img.height,
          format: img.format,
        })),
      },
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
      images: {
        select: {
          id: true,
          url: true,
          width: true,
          height: true,
        },
      },
    },
  });

  logger.info({
    reviewId: review.id,
    userId,
    listingId,
    status: initialStatus,
    imageCount: processedImages.length,
  }, 'Review created');

  return review as ReviewWithDetails;
}

/**
 * Get reviews for a listing
 * @param listingId Listing ID
 * @param includeStatus Statuses to include (default: APPROVED only)
 * @param userId Optional user ID to check if they've reviewed
 * @returns List of reviews
 */
export async function getReviewsForListing(
  listingId: number,
  includeStatus: ReviewStatus[] = [ReviewStatus.APPROVED],
  _userId?: number
): Promise<ReviewWithDetails[]> {
  const reviews = await prisma.review.findMany({
    where: {
      listingId,
      status: {
        in: includeStatus,
      },
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
      images: {
        select: {
          id: true,
          url: true,
          width: true,
          height: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  return reviews;
}

/**
 * Get a single review by ID
 * @param reviewId Review ID
 * @param userId Optional user ID to verify ownership
 * @returns Review or null
 */
export async function getReviewById(
  reviewId: number,
  userId?: number
): Promise<ReviewWithDetails | null> {
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
      images: {
        select: {
          id: true,
          url: true,
          width: true,
          height: true,
        },
      },
    },
  });

  if (!review) {
    return null;
  }

  // If userId provided, verify ownership
  if (userId && review.userId !== userId) {
    return null;
  }

  return review;
}

/**
 * Update a review (user can only update their own)
 * @param reviewId Review ID
 * @param userId User ID
 * @param input Update data
 * @returns Updated review
 */
export async function updateReview(
  reviewId: number,
  userId: number,
  input: UpdateReviewInput
): Promise<ReviewWithDetails> {
  const { rating, text } = input;

  // Get existing review
  const existingReview = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!existingReview) {
    throw new Error('Review not found');
  }

  // Verify ownership
  if (existingReview.userId !== userId) {
    throw new Error('Not authorized to update this review');
  }

  // Validate updates
  if (text !== undefined) {
    validateReviewText(text);
  }

  if (rating !== undefined) {
    validateRating(rating);
  }

  // Re-run spam detection if text changed
  let newStatus = existingReview.status;
  let spamScore: any = existingReview.spamScore;
  let spamDetails: any = existingReview.spamDetails;

  if (text !== undefined && text.trim() !== existingReview.text) {
    const spamResult = await detectSpam(text);
    const isSpam = shouldRejectReview(spamResult);

    spamScore = spamResult.confidence;
    spamDetails = {
      isSpam: spamResult.isSpam,
      reasons: spamResult.reasons,
      extractedUrls: spamResult.extractedUrls,
      extractedEmails: spamResult.extractedEmails,
      extractedPhones: spamResult.extractedPhones,
    };

    if (isSpam) {
      newStatus = ReviewStatus.REJECTED;
      logger.warn({
        reviewId,
        userId,
        spamScore: spamResult.confidence,
      }, 'Updated review rejected as spam');
    } else if (existingReview.status === ReviewStatus.APPROVED) {
      // If was approved, flag for re-moderation
      newStatus = ReviewStatus.FLAGGED;
    }
  }

  // Update review
  const updateData: any = {
    updatedAt: new Date(),
  };

  if (text !== undefined) {
    updateData.text = text.trim();
    updateData.spamScore = spamScore;
    updateData.spamDetails = spamDetails;
    updateData.status = newStatus;
  }

  if (rating !== undefined) {
    updateData.rating = rating;
  }

  const review = await prisma.review.update({
    where: { id: reviewId },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
      images: {
        select: {
          id: true,
          url: true,
          width: true,
          height: true,
        },
      },
    },
  });

  logger.info({ reviewId, userId, status: newStatus }, 'Review updated');

  return review as ReviewWithDetails;
}

/**
 * Delete a review (user can only delete their own)
 * @param reviewId Review ID
 * @param userId User ID
 */
export async function deleteReview(reviewId: number, userId: number): Promise<void> {
  // Get existing review with images
  const existingReview = await prisma.review.findUnique({
    where: { id: reviewId },
    include: {
      images: true,
    },
  });

  if (!existingReview) {
    throw new Error('Review not found');
  }

  // Verify ownership
  if (existingReview.userId !== userId) {
    throw new Error('Not authorized to delete this review');
  }

  // Delete images from filesystem
  for (const image of existingReview.images) {
    // Extract file path from URL
    const urlPath = image.url.replace(/^\//, ''); // Remove leading slash
    const filePath = `/${urlPath}`;
    await deleteImageFromLocal(filePath);
  }

  // Delete review (cascade deletes images from DB)
  await prisma.review.delete({
    where: { id: reviewId },
  });

  logger.info({ reviewId, userId, imageCount: existingReview.images.length }, 'Review deleted');
}

/**
 * Moderate a review (admin only)
 * @param reviewId Review ID
 * @param moderatorId Moderator user ID
 * @param input Moderation data
 * @returns Updated review
 */
export async function moderateReview(
  reviewId: number,
  moderatorId: number,
  input: ModerateReviewInput
): Promise<ReviewWithDetails> {
  const { status } = input;

  // Validate status
  if (!Object.values(ReviewStatus).includes(status)) {
    throw new Error('Invalid review status');
  }

  // Get existing review
  const existingReview = await prisma.review.findUnique({
    where: { id: reviewId },
  });

  if (!existingReview) {
    throw new Error('Review not found');
  }

  // Update review
  const review = await prisma.review.update({
    where: { id: reviewId },
    data: {
      status,
      moderatedBy: moderatorId,
      moderatedAt: new Date(),
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
      images: {
        select: {
          id: true,
          url: true,
          width: true,
          height: true,
        },
      },
    },
  });

  logger.info({
    reviewId,
    moderatorId,
    status,
    previousStatus: existingReview.status,
  }, 'Review moderated');

  return review;
}

/**
 * Get reviews by status (admin)
 * @param status Review status filter
 * @param limit Results limit
 * @param offset Results offset
 * @returns Reviews
 */
export async function getReviewsByStatus(
  status?: ReviewStatus,
  limit: number = 50,
  offset: number = 0
): Promise<{ reviews: ReviewWithDetails[]; total: number }> {
  const where = status ? { status } : {};

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            displayName: true,
          },
        },
        images: {
          select: {
            id: true,
            url: true,
            width: true,
            height: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
      skip: offset,
    }),
    prisma.review.count({ where }),
  ]);

  return { reviews, total };
}

/**
 * Get review statistics for a listing
 * @param listingId Listing ID
 * @returns Review stats
 */
export async function getReviewStats(listingId: number) {
  const reviews = await prisma.review.findMany({
    where: {
      listingId,
      status: ReviewStatus.APPROVED,
    },
    select: {
      rating: true,
    },
  });

  const totalReviews = reviews.length;
  const reviewsWithRating = reviews.filter((r) => r.rating !== null);
  const totalRatings = reviewsWithRating.length;

  let averageRating: number | null = null;
  let ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  if (totalRatings > 0) {
    const sum = reviewsWithRating.reduce((acc, r) => acc + (r.rating || 0), 0);
    averageRating = sum / totalRatings;

    // Count distribution
    reviewsWithRating.forEach((r) => {
      if (r.rating) {
        ratingDistribution[r.rating as keyof typeof ratingDistribution]++;
      }
    });
  }

  return {
    totalReviews,
    totalRatings,
    averageRating: averageRating ? Math.round(averageRating * 10) / 10 : null,
    ratingDistribution,
  };
}
