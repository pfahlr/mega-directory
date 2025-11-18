-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'PUBLIC';

-- AlterTable: Make User model compatible with public users
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "username" VARCHAR(50),
                   ADD COLUMN IF NOT EXISTS "emailVerified" BOOLEAN NOT NULL DEFAULT false,
                   ADD COLUMN IF NOT EXISTS "photo" VARCHAR(500),
                   ADD COLUMN IF NOT EXISTS "about" VARCHAR(1024),
                   ALTER COLUMN "email" DROP NOT NULL,
                   ALTER COLUMN "passwordHash" DROP NOT NULL,
                   ALTER COLUMN "role" SET DEFAULT 'PUBLIC',
                   ALTER COLUMN "status" SET DEFAULT 'ACTIVE';

-- Backfill username for existing users (use email prefix or generate random)
UPDATE "User"
SET "username" = COALESCE(
  SUBSTRING(email FROM 1 FOR POSITION('@' IN email) - 1),
  'user-' || id
)
WHERE "username" IS NULL;

-- Make username required after backfilling
ALTER TABLE "User" ALTER COLUMN "username" SET NOT NULL;

-- Add unique constraint on username
ALTER TABLE "User" ADD CONSTRAINT "User_username_key" UNIQUE ("username");

-- Drop the old email unique constraint and add conditional one
ALTER TABLE "User" DROP CONSTRAINT IF EXISTS "User_email_key";

-- Add indexes
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");
CREATE INDEX IF NOT EXISTS "User_username_idx" ON "User"("username");
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");

-- Create Session table
CREATE TABLE IF NOT EXISTS "Session" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "tokenHash" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" VARCHAR(45),
    "userAgent" VARCHAR(500),

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- Add foreign key
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Add indexes for Session
CREATE INDEX "Session_userId_idx" ON "Session"("userId");
CREATE INDEX "Session_tokenHash_idx" ON "Session"("tokenHash");
CREATE INDEX "Session_expiresAt_idx" ON "Session"("expiresAt");
