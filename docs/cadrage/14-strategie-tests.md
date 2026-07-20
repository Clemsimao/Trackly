# Stratégie de tests

> Étape 22 du cadrage — rédigé le 2026-07-17. Principe : l'effort de test suit le risque — maximum sur les calculs de temps (RT-6) et les parcours critiques, minimum sur le décoratif.

## Pyramide et outils

| Niveau               | Outil                                    | Cible                                                                         | Quand                                 |
| -------------------- | ---------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------- |
| Unitaires            | Vitest                                   | Modules métier purs (time-budget, progression, fusion/provenance, validation) | À chaque commit (CI)                  |
| Intégration API      | Vitest + Testcontainers (Postgres réel)  | Modules NestJS avec base : auth, bibliothèque, overrides                      | À chaque commit (CI)                  |
| Contrat fournisseurs | Vitest + fixtures enregistrées           | Parsing/normalisation des réponses TMDB/IGDB (pas d'appel réseau en CI)       | À chaque commit                       |
| E2E                  | Playwright                               | Parcours P1, P2, P3, P6 + auth                                                | CI sur main, avant chaque déploiement |
| Accessibilité        | axe-core intégré aux E2E + Lighthouse CI | Pages des parcours critiques                                                  | CI sur main                           |
| Performance          | Lighthouse CI (budget perf mobile)       | Accueil, bibliothèque, fiche                                                  | CI sur main, seuils bloquants souples |

## Le cœur : tests du module `time-budget` (RT-6)

Matrice de cas obligatoire, chaque règle testée avec et sans données manquantes :

- **Jeux** : restant selon objectif (histoire / +annexes / 100 %) ; heures jouées > estimation (→ 0, jamais négatif) ; aucune durée connue (→ « inconnu », jamais 0 silencieux) ; override manuel prioritaire ; multi-possessions (agrégation par jeu et par possession) ; progression % en pondération.
- **Séries** : durée réelle d'épisode vs moyenne ; épisodes non diffusés exclus du restant immédiat mais listés « à venir » ; saisons partiellement vues ; annulation de marquage ; spéciaux/épisode 0.
- **Films** : somme des « à voir » ; durée manquante signalée.
- **Agrégats dashboard** : cohérence stricte avec la somme des fiches (test de réconciliation).

## Règles transverses

- **Provenance (exigence forte)** : test dédié garantissant qu'un rafraîchissement fournisseur n'écrase jamais un champ `manual`/`overridden`.
- **Auth/permissions** : tests d'intégration systématiques « utilisateur A ne voit jamais les données de B » sur chaque endpoint (générés par liste d'endpoints).
- **Fixtures fournisseurs versionnées** : les réponses TMDB/IGDB enregistrées servent de contrat ; un job hebdo (hors CI bloquante) rejoue quelques appels réels pour détecter les dérives de schéma.
- **Pas de tests fragiles** : pas de snapshots UI massifs ; les E2E utilisent des data-testid stables et une base seedée dédiée.

## Definition of Done (par story)

1. Critères d'acceptation couverts par au moins un test automatisé au bon niveau.
2. Lint + typecheck + tests verts en CI.
3. Accessibilité de base vérifiée si la story touche l'UI (focus, labels, contraste).
4. Doc mise à jour si la story change un comportement documenté.
