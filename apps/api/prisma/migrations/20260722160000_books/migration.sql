-- Lot livres (docs/cadrage/17) : catalogue Open Library + suivi de lecture.
-- L'œuvre est partagée (book_works), l'édition est personnelle (pages_total
-- sur book_entries, préremplie avec la médiane OL). Le journal alimente la
-- calibration de la vitesse de lecture (minutes_read).

-- CreateEnum
CREATE TYPE "BookStatus" AS ENUM ('TO_READ', 'READING', 'PAUSED', 'FINISHED', 'DROPPED');

-- CreateTable
CREATE TABLE "book_works" (
    "id" TEXT NOT NULL,
    "ol_work_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "refreshed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_works_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "book_work_id" TEXT NOT NULL,
    "status" "BookStatus" NOT NULL DEFAULT 'TO_READ',
    "pages_total" INTEGER,
    "pages_source" TEXT NOT NULL DEFAULT 'auto',
    "edition_isbn" TEXT,
    "current_page" INTEGER NOT NULL DEFAULT 0,
    "progress_percent" INTEGER,
    "resume_note" TEXT,
    "started_at" DATE,
    "finished_at" DATE,
    "rating" INTEGER,
    "review" TEXT,
    "notes" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_progress_updates" (
    "id" TEXT NOT NULL,
    "entry_id" TEXT NOT NULL,
    "current_page" INTEGER,
    "progress_percent" INTEGER,
    "minutes_read" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "book_progress_updates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "book_works_ol_work_id_key" ON "book_works"("ol_work_id");

-- CreateIndex
CREATE INDEX "book_entries_user_id_idx" ON "book_entries"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "book_entries_user_id_book_work_id_key" ON "book_entries"("user_id", "book_work_id");

-- CreateIndex
CREATE INDEX "book_progress_updates_entry_id_idx" ON "book_progress_updates"("entry_id");

-- AddForeignKey
ALTER TABLE "book_entries" ADD CONSTRAINT "book_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_entries" ADD CONSTRAINT "book_entries_book_work_id_fkey" FOREIGN KEY ("book_work_id") REFERENCES "book_works"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_progress_updates" ADD CONSTRAINT "book_progress_updates_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "book_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
