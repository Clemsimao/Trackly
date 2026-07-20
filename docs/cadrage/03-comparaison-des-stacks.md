# Comparaison des stacks techniques

> Étapes 6, 7 et 8 du cadrage — rédigé le 2026-07-17. Statut : **option B validée le 2026-07-17** (décision D2).

## Critères de choix (issus des exigences du projet)

1. Typage de bout en bout et maintenabilité par une très petite équipe.
2. Séparation stricte interface / logique métier / données / services externes.
3. Tâches planifiées et files de travaux de première classe (rafraîchissement séries, futures synchronisations plateformes, recalculs).
4. API réutilisable telle quelle par une future application mobile native.
5. PWA de qualité (équivalente dans toutes les options — non discriminant).
6. Coût de fonctionnement faible (projet personnel).
7. Écosystème stable et pérenne ; pas de choix « parce que c'est populaire ».

## Option A — Monolithe Next.js full-stack

React + Next.js (App Router, Route Handlers/Server Actions), Prisma ou Drizzle, PostgreSQL. Déploiement Vercel ou VPS.

- **Avantages** : un seul projet et un seul déploiement ; très productif au démarrage ; écosystème React maximal ; SSR utile pour les fiches médias ; PWA possible.
- **Inconvénients** : la logique métier se mêle facilement au framework (couplage fort à Next) ; pas de worker/queue natif — le rafraîchissement périodique des séries et les futures synchronisations imposent un cron externe ou un worker séparé, donc on recrée de facto un backend ; une app native future obligera à ré-exposer une API propre ; churn notable du framework ; coûts Vercel si l'usage grandit.
- **Coût indicatif** : 0 €/mois au départ (Vercel Hobby + Postgres managé gratuit type Neon/Supabase), puis 20 €+ si dépassement ; ou VPS 5–12 €.
- **Risques** : dépendance forte à Next/Vercel ; discipline permanente nécessaire pour garder le métier isolé et testable.

## Option B — Monorepo TypeScript : SPA React + API NestJS (recommandée)

Frontend React + Vite (SPA/PWA) ; backend NestJS (Node.js) ; PostgreSQL ; Prisma ou Drizzle ; jobs via pg-boss (file de travaux sur Postgres — pas de Redis au départ) ; monorepo pnpm workspaces avec paquet partagé (types + schémas de validation Zod) ; Docker Compose en dev.

- **Avantages** : séparation exigée obtenue par construction (modules NestJS = domaines : bibliothèque, jeux, séries, films, recommandation, fournisseurs externes, auth) ; injection de dépendances → testabilité et remplaçabilité (dont le point clé : la couche d'abstraction des API externes) ; l'API sert telle quelle une future app native ; tâches planifiées et files de travaux naturelles côté backend ; frontend statique (surface d'attaque réduite, hébergement trivial, clés API uniquement côté serveur) ; un seul langage (TypeScript) partout.
- **Inconvénients** : deux applications à développer et déployer ; plomberie initiale plus importante (contrat d'API typé, CORS, auth) ; NestJS impose son formalisme (courbe d'apprentissage si non connu) ; mise en route un peu plus lente que l'option A (~15–25 % de temps en plus sur les premières semaines, estimation).
- **Coût indicatif** : un seul VPS 5–12 €/mois (front statique + API + Postgres via Coolify, sauvegardes à organiser) ; ou PaaS (Fly.io, Railway, Render) ~15–25 €/mois avec Postgres managé.
- **Risques** : tentation de sur-ingénierie. Garde-fous actés : un seul repo, une seule base, pg-boss plutôt que Redis tant que non nécessaire, pas de microservices, pas d'event sourcing, pas d'abstraction sans deuxième cas d'usage (exception : fournisseurs externes, multi-sources par nature).
- **Variantes** : Fastify + structure modulaire maison (plus léger, mais toutes les conventions à définir soi-même) ; AdonisJS (TS « batteries incluses », écosystème plus restreint).

## Option C — Framework « batteries incluses » hors TypeScript

Laravel (PHP) + Inertia/React, ou Django (Python) + SPA React.

- **Avantages** : auth, ORM, migrations, files d'attente, mails, admin intégrés → énorme productivité backend ; frameworks très stables et documentés ; hébergement très économique.
- **Inconvénients** : deux langages, car le frontend riche (swipe, PWA, cache, offline) restera en TypeScript/React de toute façon ; typage de bout en bout impossible sans outillage supplémentaire ; coût cognitif permanent si les compétences principales sont TS.
- **Coût indicatif** : VPS 5–12 €/mois ; l'option la plus économe en services externes.
- **Risques** : faibles si PHP/Python sont déjà maîtrisés ; sinon double courbe d'apprentissage.

## Option D — BaaS (Supabase, Firebase) + SPA — écartée comme socle

L'essentiel de la valeur de Trackly est dans la logique métier serveur : calculs de temps restant, fusion multi-sources, provenance des données, jobs de synchronisation, proxy des clés API. Tout cela se loge mal dans un BaaS (règles RLS complexes, logique éclatée en edge functions), avec un lock-in réel. Supabase reste en revanche pertinent comme simple **Postgres managé** pour n'importe quelle option.

## Tableau comparatif

| Critère                        | A. Next.js monolithe                         | B. React + NestJS (reco)                | C. Laravel / Django                   |
| ------------------------------ | -------------------------------------------- | --------------------------------------- | ------------------------------------- |
| Typage bout en bout            | Bon                                          | Très bon (TS partout + contrat partagé) | Faible sans outillage                 |
| Séparation des responsabilités | Possible mais à discipline constante         | Par construction                        | Bonne côté back, front séparé de fait |
| Jobs planifiés / queues        | À ajouter (cron externe ou worker)           | Natifs (scheduler + pg-boss)            | Natifs (queues Laravel / Celery)      |
| Réutilisation pour app native  | API à ré-exposer plus tard                   | Immédiate                               | Immédiate                             |
| Vitesse de démarrage           | La plus rapide                               | Moyenne                                 | Rapide (si langage connu)             |
| Maintenance solo à long terme  | Moyenne (churn Next)                         | Bonne                                   | Bonne                                 |
| Coût mensuel indicatif         | 0–20 €+                                      | 6–25 €                                  | 5–12 €                                |
| Risque principal               | Couplage framework/métier, coûts à l'échelle | Sur-ingénierie (garde-fous définis)     | Deux langages à maintenir             |

## Recommandation de l'équipe (D2 — validée le 2026-07-17)

**Option B.** Quatre raisons directement liées aux exigences du projet :

1. La séparation interface / métier / données / externes est demandée explicitement → les modules NestJS et l'injection de dépendances la donnent par construction, y compris pour la couche d'abstraction des fournisseurs d'API.
2. Une application mobile native est envisagée → l'API séparée est prête dès le premier jour.
3. Les rafraîchissements périodiques (séries) et les synchronisations futures (Steam…) imposent des jobs → première classe dans cette option, bricolage dans l'option A.
4. Un seul langage (TypeScript) → maintenance réaliste par une très petite équipe.

### Avis croisés de l'équipe

- **Product manager** : B protège la roadmap (app native, imports V3) pour un surcoût initial modéré ; aucun impact sur le périmètre V1.
- **Architecte** : les frontières de modules refléteront les domaines métier ; l'abstraction fournisseurs est le seul endroit où l'on investit en généricité dès la V1.
- **Sécurité** : front statique + API séparée = clés API et secrets exclusivement côté serveur, CORS strict, surface réduite ; sessions par cookie httpOnly recommandées (détail en phase sécurité).
- **DevOps** : un seul VPS avec Docker Compose/Coolify héberge tout ; la CI reste simple (build front statique + image API).
- **UX/UI** : aucun impact négatif ; design system custom (Tailwind + primitives accessibles type Radix) adapté à une identité propre, mode clair/sombre inclus.

### Choix associés proposés (détaillés et actés en phase C)

- PostgreSQL (base unique) ; Prisma par défaut (migrations mûres, DX) avec Drizzle en alternative si l'on préfère rester proche du SQL.
- TanStack Query (+ Router) côté front ; Zod partagé front/back pour la validation ; Tailwind CSS + primitives accessibles pour le design system.
- Vitest (unitaires/intégration) + Playwright (E2E) ; ESLint + Prettier + hooks pre-commit ; GitHub Actions.
- Sessions par cookie httpOnly + Argon2id pour les mots de passe (stratégie complète en étape 23).
- Suivi d'erreurs type Sentry ; logs structurés.
- Hébergement : décision D3 actée avec la contrainte **0 €/mois au départ** — voir [04-hebergement-0-euro.md](04-hebergement-0-euro.md) (Cloudflare Pages + Render free + Neon free ; portes de sortie Cloud Run ou VPS sans refactor).
