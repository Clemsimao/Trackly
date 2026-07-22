-- Story A5 : suppression de compte avec délai de grâce.
-- Le compte reste intact pendant le délai ; la purge planifiée l'efface ensuite.
-- deletion_token_hash porte le jeton d'annulation envoyé par e-mail (haché),
-- ce qui permet d'annuler sans pouvoir se connecter.

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deletion_requested_at" TIMESTAMP(3),
ADD COLUMN     "deletion_token_hash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "users_deletion_token_hash_key" ON "users"("deletion_token_hash");
