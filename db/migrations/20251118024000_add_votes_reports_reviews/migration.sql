-- CreateEnum
CREATE TYPE "VoteType" AS ENUM ('UPVOTE', 'DOWNVOTE');

-- CreateEnum
CREATE TYPE "ReportReason" AS ENUM ('SPAM', 'INCORRECT_INFO', 'INAPPROPRIATE', 'DUPLICATE', 'OTHER');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED');

-- CreateEnum
CREATE TYPE "ImageFormat" AS ENUM ('WEBP', 'AVIF', 'JPG', 'PNG');

-- CreateTable
CREATE TABLE IF NOT EXISTS "Vote" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "listingId" INTEGER NOT NULL,
    "voteType" "VoteType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Report" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER,
    "listingId" INTEGER NOT NULL,
    "reason" "ReportReason" NOT NULL,
    "details" VARCHAR(1000),
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "adminNotes" VARCHAR(2000),
    "resolvedBy" INTEGER,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" VARCHAR(45),

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Review" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "listingId" INTEGER NOT NULL,
    "rating" INTEGER,
    "text" VARCHAR(5000) NOT NULL,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "spamScore" DECIMAL(3,2),
    "spamDetails" JSONB,
    "moderatedBy" INTEGER,
    "moderatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" VARCHAR(45),

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ReviewImage" (
    "id" SERIAL NOT NULL,
    "reviewId" INTEGER NOT NULL,
    "originalFilename" VARCHAR(255) NOT NULL,
    "storedFilename" VARCHAR(255) NOT NULL,
    "url" VARCHAR(500) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "format" "ImageFormat" NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReviewImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Vote_userId_listingId_key" ON "Vote"("userId", "listingId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Vote_listingId_idx" ON "Vote"("listingId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Vote_userId_idx" ON "Vote"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Vote_voteType_idx" ON "Vote"("voteType");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Report_listingId_idx" ON "Report"("listingId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Report_userId_idx" ON "Report"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Report_status_idx" ON "Report"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Report_createdAt_idx" ON "Report"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Report_resolvedBy_idx" ON "Report"("resolvedBy");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Review_userId_listingId_key" ON "Review"("userId", "listingId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Review_listingId_idx" ON "Review"("listingId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Review_userId_idx" ON "Review"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Review_status_idx" ON "Review"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Review_spamScore_idx" ON "Review"("spamScore");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Review_createdAt_idx" ON "Review"("createdAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReviewImage_reviewId_idx" ON "ReviewImage"("reviewId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ReviewImage_uploadedAt_idx" ON "ReviewImage"("uploadedAt");

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_moderatedBy_fkey" FOREIGN KEY ("moderatedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewImage" ADD CONSTRAINT "ReviewImage_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "Review"("id") ON DELETE CASCADE ON UPDATE CASCADE;
