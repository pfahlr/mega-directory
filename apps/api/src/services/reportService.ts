/**
 * Report service for listing issue reporting
 * Handles report submission, validation, and admin moderation
 */
import { prisma } from '../db';

export type ReportReason = 'SPAM' | 'INCORRECT_INFO' | 'INAPPROPRIATE' | 'DUPLICATE' | 'OTHER';
export type ReportStatus = 'PENDING' | 'REVIEWING' | 'RESOLVED' | 'DISMISSED';

export interface CreateReportInput {
  userId: number;
  listingId: number;
  reason: ReportReason;
  details?: string;
  ipAddress?: string;
}

export interface UpdateReportInput {
  status?: ReportStatus;
  adminNotes?: string;
  resolvedBy?: number;
}

/**
 * Validate report reason and details
 * @param reason Report reason
 * @param details Additional details
 * @returns true if valid, throws error otherwise
 */
function validateReport(reason: ReportReason, details?: string): boolean {
  // Details required for DUPLICATE and OTHER
  if ((reason === 'DUPLICATE' || reason === 'OTHER') && (!details || details.trim().length === 0)) {
    throw new Error(`Details are required for ${reason.toLowerCase()} reports`);
  }

  // Details length validation
  if (details && details.length > 1000) {
    throw new Error('Details must be 1000 characters or less');
  }

  return true;
}

/**
 * Create a new report
 * @param input Report creation data
 * @returns Created report
 */
export async function createReport(input: CreateReportInput) {
  const { userId, listingId, reason, details, ipAddress } = input;

  // Validate report
  validateReport(reason, details);

  // Check if listing exists
  const listing = await prisma.listing.findUnique({
    where: { id: listingId },
    select: { id: true, title: true },
  });

  if (!listing) {
    throw new Error('Listing not found');
  }

  // Check if user has already reported this listing
  const existingReport = await prisma.report.findFirst({
    where: {
      userId,
      listingId,
    },
  });

  if (existingReport) {
    throw new Error('You have already reported this listing');
  }

  // Create report
  const report = await prisma.report.create({
    data: {
      userId,
      listingId,
      reason,
      details: details?.trim() || null,
      status: 'PENDING',
      ipAddress,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          email: true,
        },
      },
      listing: {
        select: {
          id: true,
          title: true,
          slug: true,
        },
      },
    },
  });

  // Check for auto-hide condition (10+ reports with same reason)
  await checkAutoHideCondition(listingId, reason);

  return report;
}

/**
 * Check if listing should be auto-hidden due to multiple reports
 * @param listingId Listing ID
 * @param reason Report reason
 */
async function checkAutoHideCondition(listingId: number, reason: ReportReason): Promise<void> {
  const count = await prisma.report.count({
    where: {
      listingId,
      reason,
      status: 'PENDING',
    },
  });

  if (count >= 10) {
    // Auto-hide listing by marking as INACTIVE
    await prisma.listing.update({
      where: { id: listingId },
      data: { status: 'INACTIVE' },
    });

    // TODO: Send alert to admin about auto-hidden listing
    // This would typically use an email service or notification system
  }
}

/**
 * Get all reports with filters
 * @param filters Query filters
 * @param pagination Pagination params
 * @returns Reports with pagination
 */
export async function getReports(
  filters: {
    status?: ReportStatus;
    reason?: ReportReason;
    listingId?: number;
  } = {},
  pagination: {
    page?: number;
    limit?: number;
  } = {}
) {
  const { status, reason, listingId } = filters;
  const page = pagination.page || 1;
  const limit = pagination.limit || 20;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (status) where.status = status;
  if (reason) where.reason = reason;
  if (listingId) where.listingId = listingId;

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        listing: {
          select: {
            id: true,
            title: true,
            slug: true,
            status: true,
          },
        },
        resolver: {
          select: {
            id: true,
            username: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' }, // Oldest first for admin queue
      skip,
      take: limit,
    }),
    prisma.report.count({ where }),
  ]);

  return {
    reports,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get single report by ID
 * @param reportId Report ID
 * @returns Report with related data
 */
export async function getReportById(reportId: number) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          email: true,
          status: true,
        },
      },
      listing: {
        select: {
          id: true,
          title: true,
          description: true,
          slug: true,
          status: true,
          websiteUrl: true,
          contactEmail: true,
        },
      },
      resolver: {
        select: {
          id: true,
          username: true,
          displayName: true,
        },
      },
    },
  });

  if (!report) {
    throw new Error('Report not found');
  }

  // Get similar reports for the same listing
  const similarReports = await prisma.report.findMany({
    where: {
      listingId: report.listingId,
      id: { not: reportId },
    },
    select: {
      id: true,
      reason: true,
      status: true,
      createdAt: true,
      user: {
        select: {
          username: true,
        },
      },
    },
    take: 10,
  });

  return {
    ...report,
    similarReports,
  };
}

/**
 * Update report status and admin notes
 * @param reportId Report ID
 * @param adminId Admin user ID
 * @param input Update data
 * @returns Updated report
 */
export async function updateReport(
  reportId: number,
  adminId: number,
  input: UpdateReportInput
) {
  const { status, adminNotes } = input;

  // Validate status transition
  if (status && !['PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED'].includes(status)) {
    throw new Error('Invalid status');
  }

  const updateData: any = {};

  if (status) {
    updateData.status = status;

    // If resolving or dismissing, set resolved fields
    if (status === 'RESOLVED' || status === 'DISMISSED') {
      updateData.resolvedBy = adminId;
      updateData.resolvedAt = new Date();
    }
  }

  if (adminNotes !== undefined) {
    updateData.adminNotes = adminNotes?.trim() || null;
  }

  const report = await prisma.report.update({
    where: { id: reportId },
    data: updateData,
    include: {
      user: {
        select: {
          id: true,
          username: true,
        },
      },
      listing: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });

  return report;
}

/**
 * Delete a listing (admin action from report)
 * @param listingId Listing ID
 * @param adminId Admin user ID
 * @returns true if deleted
 */
export async function deleteListingFromReport(
  reportId: number,
  adminId: number
) {
  // Get the report to find the listing
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      listing: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  if (!report) {
    throw new Error('Report not found');
  }

  const listingId = report.listingId;

  // Mark listing as REJECTED (soft delete)
  await prisma.listing.update({
    where: { id: listingId },
    data: {
      status: 'REJECTED',
      archivedAt: new Date(),
    },
  });

  // Mark all pending reports for this listing as resolved
  await prisma.report.updateMany({
    where: {
      listingId,
      status: 'PENDING',
    },
    data: {
      status: 'RESOLVED',
      resolvedBy: adminId,
      resolvedAt: new Date(),
      adminNotes: 'Listing deleted',
    },
  });

  // Get updated report
  const updatedReport = await prisma.report.findUnique({
    where: { id: reportId },
    include: {
      listing: {
        select: {
          id: true,
          status: true,
        },
      },
    },
  });

  return updatedReport;
}

/**
 * Get report statistics
 * @returns Report stats
 */
export async function getReportStats() {
  const [byStatus, byReason, recentCount] = await Promise.all([
    prisma.report.groupBy({
      by: ['status'],
      _count: true,
    }),
    prisma.report.groupBy({
      by: ['reason'],
      _count: true,
    }),
    prisma.report.count({
      where: {
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
        },
      },
    }),
  ]);

  return {
    byStatus,
    byReason,
    recentCount,
  };
}
