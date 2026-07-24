# Trackly (nom de travail)

Application web (responsive + PWA installable) de suivi personnel des jeux vidéo, séries et films : bibliothèque unifiée, statuts et progression propres à chaque média, temps restant estimé, assistant de recommandation de films.

**Statut : V1 en cours** — authentification, catalogue, bibliothèque, livres,
PWA hors ligne et droits RGPD sont implémentés. Voir le
[plan de lots](docs/cadrage/13-plan-de-lots.md).

## Démarrage rapide (dev)

Prérequis : Node ≥ 22, pnpm 10 (`corepack enable`), Docker (pour Postgres locale).

```bash
pnpm install
cp .env.example .env
docker compose up -d postgres        # base locale
pnpm --filter @trackly/api prisma:deploy   # applique les migrations
pnpm --filter @trackly/api seed            # données de démo
pnpm build                           # contracts d'abord (nécessaire au 1er lancement)
pnpm dev                             # API sur :3000, front sur :5173
```

- Front : http://localhost:5173 (proxy `/api` → API, pas de CORS)
- Santé API : http://localhost:3000/api/health (ne touche jamais la base)

Qualité : `pnpm lint` · `pnpm typecheck` · `pnpm test` · `pnpm format` (hooks pre-commit actifs, CI dans `.github/workflows/ci.yml`).

## Structure

```
apps/web            React + Vite + Tailwind, PWA installable
apps/api            NestJS + Prisma (modules par domaine métier)
packages/contracts  Contrat partagé front/back (types + schémas Zod)
deploy/             Dockerfiles, compose de production, guide Proxmox
docs/cadrage/       Cadrage complet (25 étapes) et décisions
```

## Déploiement

Production auto-hébergée sur Proxmox derrière Cloudflare Tunnel (0 €/mois, zéro port ouvert) : suivre [deploy/proxmox.md](deploy/proxmox.md). La CI publie les images sur GHCR à chaque push sur `main` ; la VM les tire automatiquement.

## Documentation de cadrage

- [Avancement et registre des décisions](docs/cadrage/00-avancement.md)
- [Reformulation du besoin et vision](docs/cadrage/01-reformulation-du-besoin.md)
- [MVP et versions suivantes](docs/cadrage/02-mvp-et-versions.md)
- [Comparaison des stacks techniques](docs/cadrage/03-comparaison-des-stacks.md)
- [Hébergement à 0 €/mois (Proxmox + Cloudflare Tunnel)](docs/cadrage/04-hebergement-0-euro.md)
- [Recherche des API de métadonnées](docs/cadrage/05-recherche-api-medias.md)
- [Faisabilité des connexions aux plateformes de jeu](docs/cadrage/06-faisabilite-plateformes-jeux.md)
- [Profils d'utilisateurs (personas)](docs/cadrage/07-personas.md)
- [Registre des risques](docs/cadrage/08-registre-des-risques.md)
- [Architecture globale](docs/cadrage/09-architecture-globale.md)
- [Premier modèle de données](docs/cadrage/10-modele-de-donnees.md)
- [Pages et parcours utilisateurs](docs/cadrage/11-pages-et-parcours.md)
- [User stories du MVP](docs/cadrage/12-user-stories-mvp.md)
- [Plan de lots](docs/cadrage/13-plan-de-lots.md)
- [Stratégie de tests](docs/cadrage/14-strategie-tests.md)
- [Stratégie de sécurité](docs/cadrage/15-strategie-securite.md)
- [Stratégie de déploiement](docs/cadrage/16-strategie-deploiement.md)
