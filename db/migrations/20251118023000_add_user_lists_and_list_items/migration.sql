-- CreateTable
CREATE TABLE IF NOT EXISTS "UserList" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" VARCHAR(2000),
    "urlSlug" VARCHAR(100) NOT NULL,
    "unlisted" BOOLEAN NOT NULL DEFAULT false,
    "locationAgnostic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ListItem" (
    "id" SERIAL NOT NULL,
    "listId" INTEGER NOT NULL,
    "listingId" INTEGER NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "notes" VARCHAR(500),
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ListItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "UserList_userId_urlSlug_key" ON "UserList"("userId", "urlSlug");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserList_userId_idx" ON "UserList"("userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserList_unlisted_idx" ON "UserList"("unlisted");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "UserList_createdAt_idx" ON "UserList"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "ListItem_listId_listingId_key" ON "ListItem"("listId", "listingId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ListItem_listId_idx" ON "ListItem"("listId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ListItem_listingId_idx" ON "ListItem"("listingId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "ListItem_position_idx" ON "ListItem"("position");

-- AddForeignKey
ALTER TABLE "UserList" ADD CONSTRAINT "UserList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListItem" ADD CONSTRAINT "ListItem_listId_fkey" FOREIGN KEY ("listId") REFERENCES "UserList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ListItem" ADD CONSTRAINT "ListItem_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;
