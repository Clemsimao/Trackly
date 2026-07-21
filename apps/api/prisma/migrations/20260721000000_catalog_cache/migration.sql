-- CreateTable
CREATE TABLE "catalog_cache" (
    "id" TEXT NOT NULL,
    "cache_key" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "catalog_cache_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "catalog_cache_cache_key_key" ON "catalog_cache"("cache_key");

-- CreateIndex
CREATE INDEX "catalog_cache_expires_at_idx" ON "catalog_cache"("expires_at");

