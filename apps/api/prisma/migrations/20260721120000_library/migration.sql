-- CreateEnum
CREATE TYPE "OwnershipStatus" AS ENUM ('BACKLOG', 'PLAYING', 'PAUSED', 'FINISHED', 'COMPLETED', 'DROPPED');

-- CreateEnum
CREATE TYPE "CompletionTarget" AS ENUM ('MAIN', 'MAIN_EXTRA', 'COMPLETIONIST');

-- CreateEnum
CREATE TYPE "SeriesStatus" AS ENUM ('TO_WATCH', 'WATCHING', 'PAUSED', 'FINISHED', 'DROPPED');

-- CreateEnum
CREATE TYPE "FilmStatus" AS ENUM ('TO_WATCH', 'SEEN', 'DISLIKED', 'DROPPED', 'REJECTED');

-- CreateTable
CREATE TABLE "game_works" (
    "id" TEXT NOT NULL,
    "igdb_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "refreshed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_works_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series_works" (
    "id" TEXT NOT NULL,
    "tmdb_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "refreshed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "series_works_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "film_works" (
    "id" TEXT NOT NULL,
    "tmdb_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "refreshed_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "film_works_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episode_records" (
    "id" TEXT NOT NULL,
    "series_work_id" TEXT NOT NULL,
    "season_number" INTEGER NOT NULL,
    "episode_number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "runtime_minutes" INTEGER,
    "air_date" DATE,

    CONSTRAINT "episode_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "game_work_id" TEXT NOT NULL,
    "rating" INTEGER,
    "review" TEXT,
    "notes" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_ownerships" (
    "id" TEXT NOT NULL,
    "entry_id" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "status" "OwnershipStatus" NOT NULL DEFAULT 'BACKLOG',
    "hours_played" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "progress_percent" INTEGER,
    "next_objective" TEXT,
    "resume_note" TEXT,
    "purchase_date" DATE,
    "started_at" DATE,
    "finished_at" DATE,
    "last_played_at" DATE,
    "trophies_earned" INTEGER,
    "trophies_total" INTEGER,
    "completion_target" "CompletionTarget" NOT NULL DEFAULT 'MAIN',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "game_ownerships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "game_progress_updates" (
    "id" TEXT NOT NULL,
    "ownership_id" TEXT NOT NULL,
    "hours_played" DOUBLE PRECISION,
    "progress_percent" INTEGER,
    "note" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "game_progress_updates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "series_work_id" TEXT NOT NULL,
    "status" "SeriesStatus" NOT NULL DEFAULT 'TO_WATCH',
    "rating" INTEGER,
    "review" TEXT,
    "notes" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "series_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episode_watches" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "episode_id" TEXT NOT NULL,
    "watched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "episode_watches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "film_entries" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "film_work_id" TEXT NOT NULL,
    "status" "FilmStatus" NOT NULL DEFAULT 'TO_WATCH',
    "watched_at" DATE,
    "rewatch" BOOLEAN NOT NULL DEFAULT false,
    "watched_with" TEXT,
    "rating" INTEGER,
    "review" TEXT,
    "notes" TEXT,
    "favorite" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "film_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "field_overrides" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "field_name" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "source" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "field_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "game_works_igdb_id_key" ON "game_works"("igdb_id");

-- CreateIndex
CREATE UNIQUE INDEX "series_works_tmdb_id_key" ON "series_works"("tmdb_id");

-- CreateIndex
CREATE UNIQUE INDEX "film_works_tmdb_id_key" ON "film_works"("tmdb_id");

-- CreateIndex
CREATE UNIQUE INDEX "episode_records_series_work_id_season_number_episode_number_key" ON "episode_records"("series_work_id", "season_number", "episode_number");

-- CreateIndex
CREATE INDEX "game_entries_user_id_idx" ON "game_entries"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_entries_user_id_game_work_id_key" ON "game_entries"("user_id", "game_work_id");

-- CreateIndex
CREATE UNIQUE INDEX "game_ownerships_entry_id_platform_key" ON "game_ownerships"("entry_id", "platform");

-- CreateIndex
CREATE INDEX "game_progress_updates_ownership_id_idx" ON "game_progress_updates"("ownership_id");

-- CreateIndex
CREATE INDEX "series_entries_user_id_idx" ON "series_entries"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "series_entries_user_id_series_work_id_key" ON "series_entries"("user_id", "series_work_id");

-- CreateIndex
CREATE INDEX "episode_watches_user_id_idx" ON "episode_watches"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "episode_watches_user_id_episode_id_key" ON "episode_watches"("user_id", "episode_id");

-- CreateIndex
CREATE INDEX "film_entries_user_id_idx" ON "film_entries"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "film_entries_user_id_film_work_id_key" ON "film_entries"("user_id", "film_work_id");

-- CreateIndex
CREATE UNIQUE INDEX "field_overrides_user_id_entity_type_entity_id_field_name_key" ON "field_overrides"("user_id", "entity_type", "entity_id", "field_name");

-- AddForeignKey
ALTER TABLE "episode_records" ADD CONSTRAINT "episode_records_series_work_id_fkey" FOREIGN KEY ("series_work_id") REFERENCES "series_works"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_entries" ADD CONSTRAINT "game_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_entries" ADD CONSTRAINT "game_entries_game_work_id_fkey" FOREIGN KEY ("game_work_id") REFERENCES "game_works"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_ownerships" ADD CONSTRAINT "game_ownerships_entry_id_fkey" FOREIGN KEY ("entry_id") REFERENCES "game_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "game_progress_updates" ADD CONSTRAINT "game_progress_updates_ownership_id_fkey" FOREIGN KEY ("ownership_id") REFERENCES "game_ownerships"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_entries" ADD CONSTRAINT "series_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_entries" ADD CONSTRAINT "series_entries_series_work_id_fkey" FOREIGN KEY ("series_work_id") REFERENCES "series_works"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_watches" ADD CONSTRAINT "episode_watches_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_watches" ADD CONSTRAINT "episode_watches_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episode_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "film_entries" ADD CONSTRAINT "film_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "film_entries" ADD CONSTRAINT "film_entries_film_work_id_fkey" FOREIGN KEY ("film_work_id") REFERENCES "film_works"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "field_overrides" ADD CONSTRAINT "field_overrides_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

