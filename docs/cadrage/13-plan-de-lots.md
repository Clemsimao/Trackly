# Découpage du MVP en lots

> Étape 21 du cadrage — rédigé le 2026-07-17. Lots séquentiels d'environ 1 à 2 semaines de travail effectif chacun (projet perso : pas d'engagement calendaire, l'ordre et le contenu font foi). Chaque lot se termine **démontrable et déployé** sur le Proxmox.

## Lot 0 — Fondations (le socle qui rend tout le reste rapide)

- Monorepo pnpm (apps/web, apps/api, packages/contracts, packages/config).
- NestJS + Prisma + PostgreSQL + migrations + seed de démo ; React + Vite + Tailwind + design tokens (clair/sombre).
- Docker Compose dev ; CI GitHub Actions (lint, typecheck, tests, build) ; hooks pre-commit.
- Déploiement initial sur Proxmox : VM/LXC + Compose + cloudflared + domaine. Sentry + logs structurés.
- **Démo de fin de lot : « Hello Trackly » accessible sur trackly.<domaine>, pipeline verte.**

## Lot 1 — Comptes et sécurité de base (épopée A)

- Inscription, connexion, déconnexion, reset mdp (e-mails via Resend/Brevo), sessions cookie httpOnly, rate limiting, validation Zod partout.
- Profil minimal + thème + i18n FR en place.
- **Démo : créer un compte depuis mobile, se reconnecter, réinitialiser son mdp.**

## Lot 2 — Catalogue et recherche (épopée B + couche fournisseurs)

- Couche `MediaProvider` + implémentations TMDB (films, séries+saisons+épisodes) et IGDB (jeux + time-to-beat) ; cache catalogue en base ; gestion 429/back-off.
- Recherche globale (debounce, résultats fusionnés) ; fiches détail en lecture.
- **Test empirique de couverture (RT-5) : échantillon de 30 jeux / 20 séries / 20 films réels — taux de durées et de FR mesurés et consignés.**
- **Démo : chercher et consulter n'importe quel contenu, avec durées.**

## Lot 3 — Bibliothèque et suivi (épopées C, D, E — le cœur)

- Ajout 2 taps ; statuts par média ; possessions multi-plateformes ; progression jeux (%, prochain objectif, note de reprise, journal) ; marquage épisodes/saisons ; suivi films ; `FieldOverride` (provenance + éditions protégées).
- Filtres bibliothèque (type, statut, genre, plateforme).
- **Démo : le parcours P1 complet en < 60 s, P2 et P3 fonctionnels.**

## Lot 4 — Budget temps et tableau de bord (épopée F)

- Module `time-budget` pur + batterie de tests des cas limites (le gros des tests unitaires du projet).
- Tableau de bord V1 (cartes) ; temps restant sur chaque fiche ; distinction épisodes diffusés/annoncés.
- **Démo : « ton backlog représente X heures », cohérent fiche par fiche.**

## Lot 5 — PWA et finitions V1 (épopée G)

- Manifest, icônes, service worker (app shell + lecture hors ligne), états réseau.
- Export RGPD + suppression de compte (A4, A5). Accessibilité : audit et corrections. E2E Playwright sur P1-P3 + P6.
- **Démo : installation sur téléphone, consultation hors ligne, export/suppression. → V1 terminée.**

## Ensuite (rappel, hors MVP)

- **V2** : reco swipe films, dashboard avancé + objectifs, refresh séries + nouvelles saisons, checklists jeux, listes personnalisées, écriture hors ligne.
- **V3** : intégration Steam, import fichier générique, notifications.

## Règles de pilotage

- On ne commence pas un lot avant que le précédent soit **déployé et démontré**.
- Toute idée nouvelle → backlog « plus tard », jamais insérée dans le lot en cours (RF-6).
- Fin de chaque lot : mise à jour de la doc + du registre des décisions si besoin.
