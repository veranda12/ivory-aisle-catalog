-- CreateEnum
CREATE TYPE "ProductKind" AS ENUM ('GOWN', 'ADDON');

-- DropIndex
DROP INDEX "photos_collection_idx";

-- DropIndex
DROP INDEX "photos_is_active_created_at_idx";

-- AlterTable
ALTER TABLE "photos" ADD COLUMN     "bust" TEXT,
ADD COLUMN     "chapter_id" TEXT,
ADD COLUMN     "deposit" INTEGER,
ADD COLUMN     "is_featured" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "kind" "ProductKind" NOT NULL DEFAULT 'GOWN',
ADD COLUMN     "length" TEXT,
ADD COLUMN     "waist" TEXT;

-- CreateTable
CREATE TABLE "photo_images" (
    "id" TEXT NOT NULL,
    "photo_id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "thumbnail_url" TEXT NOT NULL,
    "blur_data_url" TEXT,
    "width" INTEGER NOT NULL DEFAULT 0,
    "height" INTEGER NOT NULL DEFAULT 0,
    "size_bytes" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "photo_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "numeral" TEXT,
    "description" TEXT,
    "cover_url" TEXT,
    "cover_thumb" TEXT,
    "cover_blur" TEXT,
    "cover_bytes" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "show_in_nav" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "testimonials" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "photo_url" TEXT,
    "photo_thumb" TEXT,
    "photo_blur" TEXT,
    "photo_bytes" INTEGER NOT NULL DEFAULT 0,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "testimonials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "showcases" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "caption" TEXT,
    "image_url" TEXT NOT NULL,
    "thumbnail_url" TEXT NOT NULL,
    "blur_data_url" TEXT,
    "width" INTEGER NOT NULL DEFAULT 0,
    "height" INTEGER NOT NULL DEFAULT 0,
    "size_bytes" INTEGER NOT NULL DEFAULT 0,
    "photo_id" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "showcases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "photo_images_photo_id_sort_order_idx" ON "photo_images"("photo_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "chapters_slug_key" ON "chapters"("slug");

-- CreateIndex
CREATE INDEX "photos_is_active_kind_created_at_idx" ON "photos"("is_active", "kind", "created_at" DESC);

-- CreateIndex
CREATE INDEX "photos_chapter_id_idx" ON "photos"("chapter_id");

-- AddForeignKey
ALTER TABLE "photos" ADD CONSTRAINT "photos_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "photo_images" ADD CONSTRAINT "photo_images_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "showcases" ADD CONSTRAINT "showcases_photo_id_fkey" FOREIGN KEY ("photo_id") REFERENCES "photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- Data: ubah nilai teks "collection" lama menjadi Chapter, lalu hapus kolomnya.
INSERT INTO "chapters" ("id", "name", "slug", "sort_order", "updated_at")
SELECT 'chm_' || md5(c), c,
       trim(both '-' from regexp_replace(lower(c), '[^a-z0-9]+', '-', 'g')),
       row_number() OVER (ORDER BY c) - 1,
       CURRENT_TIMESTAMP
FROM (SELECT DISTINCT trim("collection") AS c FROM "photos" WHERE "collection" IS NOT NULL AND trim("collection") <> '') x
ON CONFLICT ("slug") DO NOTHING;

UPDATE "photos" p SET "chapter_id" = ch."id"
FROM "chapters" ch WHERE ch."name" = trim(p."collection");

ALTER TABLE "photos" DROP COLUMN "collection";
