# Architecture globale

> Étapes 9 et 10 du cadrage — rédigé le 2026-07-17. Principe directeur : **la structure reflète les domaines métier**, avec un seul endroit générique (la couche fournisseurs externes). Garde-fous anti-surarchitecture rappelés du D2 : un repo, une base, pg-boss (pas de Redis), pas de microservices, pas d'abstraction sans 2e cas d'usage.

## Vue d'ensemble

```
┌─────────────────────────────────────────────────────────────┐
│  CLIENT — SPA React + Vite (PWA installable)                 │
│  Cloudflare Pages (statique)                                 │
│  · UI / composants  · TanStack Query (cache serveur)         │
│  · TanStack Router  · state local  · service worker (offline)│
└───────────────────────────┬─────────────────────────────────┘
                            │ HTTPS — API REST JSON, cookie httpOnly
                            │ contrat typé partagé (paquet @trackly/contracts + Zod)
┌───────────────────────────▼─────────────────────────────────┐
│  API — NestJS (Node/TypeScript)   Render (conteneur Docker)  │
│                                                              │
│  ┌── Modules de domaine (logique métier pure) ────────────┐  │
│  │ auth · users · library · games · series · films        │  │
│  │ progress · time-budget · lists · reviews · activity     │  │
│  │ recommendations (V2) · platform-sync (V3)               │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌── Couche fournisseurs externes (la seule abstraction) ─┐  │
│  │ MediaProvider (interface)                               │  │
│  │  ├─ TmdbProvider (films, séries)                        │  │
│  │  ├─ TvmazeProvider (séries, complément)                 │  │
│  │  └─ IgdbProvider (jeux + time-to-beat)                  │  │
│  │ ExternalGameLibraryProvider (interface)                 │  │
│  │  └─ SteamProvider (V3)                                  │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌── Infrastructure ──────────────────────────────────────┐  │
│  │ Prisma (ORM/migrations) · pg-boss (jobs) · cache        │  │
│  │ mailer · logs structurés · Sentry                       │  │
│  └────────────────────────────────────────────────────────┘  │
└───────────────┬───────────────────────────┬─────────────────┘
                │                           │
      ┌─────────▼─────────┐      ┌──────────▼───────────┐
      │ PostgreSQL (Neon) │      │ API externes         │
      │ · données user    │      │ TMDB · TVmaze · IGDB │
      │ · cache métadonnées│      │ (Steam en V3)        │
      │ · file pg-boss    │      └──────────────────────┘
      └───────────────────┘
```

## Principes d'architecture appliqués

- **Séparation stricte** (exigence forte) : le client ne parle qu'à notre API ; les clés d'API externes vivent **uniquement côté serveur** ; la logique métier ne dépend ni du framework HTTP ni de l'ORM (ports/adapters là où ça compte).
- **Modules de domaine** : chaque module NestJS = un domaine, avec service (métier), contrôleur (HTTP), et accès données via repository. Testables en isolation par injection de dépendances.
- **Le métier ne connaît pas les fournisseurs concrets** : les modules dépendent des interfaces `MediaProvider` / `ExternalGameLibraryProvider`, pas de TMDB/IGDB directement → changer de fournisseur = une nouvelle implémentation, zéro impact métier (RT-3).
- **Contrat partagé** : un paquet `@trackly/contracts` (types + schémas Zod) partagé front/back garantit le typage de bout en bout et une validation identique des deux côtés.

## Organisation du monorepo (pnpm workspaces)

```
trackly/
├─ apps/
│  ├─ web/          # React + Vite + PWA
│  └─ api/          # NestJS
├─ packages/
│  ├─ contracts/    # types partagés + schémas Zod (DTO, entités API)
│  └─ config/       # config lint/tsconfig/prettier partagée
├─ docker-compose.yml   # postgres + api + web en dev
└─ docs/
```

## Flux clés

### Recherche + ajout d'un média (chemin critique — RF-2 friction saisie)

1. L'utilisateur tape → le front debounce → appelle **notre** API (`GET /search?q=`).
2. L'API interroge le `MediaProvider` adéquat (TMDB/IGDB), **avec cache** : si déjà en base et frais, pas d'appel externe.
3. Résultats normalisés (forme commune) renvoyés → affichage instantané.
4. À l'ajout : on **copie un instantané** des métadonnées utiles dans notre base (référence externe + snapshot), on marque la **provenance = auto**, et on rattache à la bibliothèque de l'utilisateur.

### Rafraîchissement des métadonnées (respecte les modifications manuelles — exigence forte)

- Un job pg-boss (V2) rafraîchit périodiquement les snapshots depuis les fournisseurs.
- **Règle d'or** : un champ dont la provenance est `manual` ou `overridden` **n'est jamais écrasé** par le rafraîchissement. Seuls les champs `auto` sont mis à jour. (Détaillé dans le modèle de données.)

### Calcul du temps restant (différenciateur — RT-6)

- Module `time-budget` **pur** (aucune dépendance I/O), qui prend en entrée l'état d'un item (progression, objectif, durées, épisodes vus…) et renvoie le temps restant.
- Testable exhaustivement sur les cas limites → c'est là qu'on concentre les tests unitaires.

## Choix structurants et alternatives

| Sujet             | Choix                                                | Alternative écartée | Raison                                                                              |
| ----------------- | ---------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------- |
| ORM               | **Prisma**                                           | Drizzle             | Migrations mûres, DX ; Drizzle reste une option si on veut coller au SQL            |
| Jobs              | **pg-boss** (sur Postgres)                           | Redis + BullMQ      | Pas de service supplémentaire ni de coût ; suffisant à notre échelle                |
| API style         | **REST** + contrat Zod                               | GraphQL, tRPC       | REST réutilisable par une app native ; tRPC coupissant mais couple front/back en TS |
| Auth transport    | **Cookie httpOnly** (session ou JWT court + refresh) | JWT en localStorage | Protège du vol par XSS ; détaillé en phase D sécurité                               |
| Cache métadonnées | **Table Postgres dédiée**                            | Redis               | Une seule base ; volumes faibles ; scale-to-zero Neon                               |

## Points reportés (pour ne pas surarchitecturer maintenant)

- **Recherche full-text avancée** : commencer avec les recherches des fournisseurs + `ILIKE`/`pg_trgm` sur le cache local ; moteur dédié seulement si besoin.
- **Écriture hors ligne / sync** : V2/V3, quand le modèle sera stable (RT-8).
- **Séparation lecture/écriture, event sourcing, CQRS** : non — hors de proportion.
