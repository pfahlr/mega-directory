-- CreateTable
CREATE TABLE IF NOT EXISTS "MagicLink" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "code" VARCHAR(12) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" VARCHAR(45),

    CONSTRAINT "MagicLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "MagicLink_code_key" ON "MagicLink"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MagicLink_userId_idx" ON "MagicLink"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MagicLink_code_idx" ON "MagicLink"("code");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MagicLink_expiresAt_idx" ON "MagicLink"("expiresAt");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "MagicLink_email_idx" ON "MagicLink"("email");

-- AddForeignKey
ALTER TABLE "MagicLink" ADD CONSTRAINT "MagicLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
