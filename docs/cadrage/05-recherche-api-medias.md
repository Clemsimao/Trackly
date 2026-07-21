# Recherche des API de métadonnées (films, séries, jeux)

> Étape 13 du cadrage — rédigé le 2026-07-17. Conclusions issues d'une recherche multi-sources avec vérification adversariale (24 affirmations confirmées sur sources **primaires officielles**, 1 réfutée). Chaque source datée du 2026-07-17. Les free tiers et CGU évoluent : revérifier avant toute mise en production, et surtout **avant toute monétisation**.

## Synthèse : la pile retenue pour le MVP

| Besoin                                       | Source retenue                                | Coût                         | Verdict                                                 |
| -------------------------------------------- | --------------------------------------------- | ---------------------------- | ------------------------------------------------------- |
| Films (métadonnées + visuels)                | **TMDB**                                      | Gratuit (non commercial)     | ✅ Recommandé                                           |
| Séries (métadonnées + visuels)               | **TMDB** (backbone) + **TVmaze** (complément) | Gratuit                      | ✅ Recommandé                                           |
| Disponibilité streaming FR (« où regarder ») | **TMDB watch/providers** (données JustWatch)  | Gratuit                      | ✅ Recommandé, avec attribution stricte                 |
| Jeux (métadonnées + visuels)                 | **IGDB**                                      | Gratuit (même en commercial) | ✅ Recommandé                                           |
| Durées de complétion des jeux                | **IGDB `game_time_to_beats`**                 | Gratuit                      | ✅ Recommandé — remplace HowLongToBeat                  |
| Scrobbling / listes / social (plus tard)     | **Trakt**                                     | —                            | 🟡 Complément uniquement, pas une source de métadonnées |

Cette pile couvre **tout le besoin de métadonnées du MVP à 0 €**. Elle valide aussi une hypothèse clé de la phase A : les durées de jeux sont accessibles **légalement** sans toucher à HowLongToBeat.

## 1. TMDB — colonne vertébrale films et séries

- **Coût / licence** : gratuit pour l'usage **non commercial**, défini par TMDB comme un projet dont « the primary purpose is to create revenue for the benefit of the owner ». Un tracker personnel sans revenu est couvert. Source : [ToU](https://www.themoviedb.org/api-terms-of-use), [FAQ](https://developer.themoviedb.org/docs/faq).
- **⚠️ Bascule commerciale** : app payante, **publicité, dons (revenus indirects)**, revente, ou entraînement d'un modèle IA → exigent un **accord écrit séparé et payant** avec TMDB (pas de tarif self-serve public ; contact par e-mail ; des sources communautaires évoquent ~149 $/mois sous 1 M$ de CA, **à confirmer** le moment venu). **C'est le point d'attention n°1 si Trackly devient commercial.**
- **Attribution obligatoire** : logo TMDB (moins proéminent que la marque Trackly) + mention exacte « This product uses TMDB and the TMDB APIs but is not endorsed, certified, or otherwise approved by TMDB. », dans une section À propos/Crédits.
- **Quotas** : l'ancienne limite (40 req/10 s) est **désactivée depuis le 16/12/2019** ; subsiste un garde-fou anti-scraping ~40 req/s par IP (« could change at any time »). Large pour un usage mono-utilisateur. **À implémenter : back-off sur HTTP 429.** Cache local autorisé, **6 mois maximum**. Source : [rate-limiting](https://developer.themoviedb.org/docs/rate-limiting).
- **Français** : titres et synopsis **localisés en FR** quand une traduction communautaire existe (sinon repli langue d'origine). **Exceptions** : noms de personnes et **noms de personnages** retournés en anglais. → casting/personnages resteront en anglais dans Trackly. Source : [languages](https://developer.themoviedb.org/docs/languages).

## 2. TMDB watch/providers — disponibilité streaming en France

- Endpoint alimenté par le **partenariat JustWatch** : disponibilité flatrate/location/achat **par pays** (dont `FR`) et par fournisseur. Idéal pour la fonctionnalité « où regarder » et pour l'assistant de recommandation (filtrer par plateformes de l'utilisateur).
- **Limites** : pas de deep links (disponibilité + lien vers la page TMDB uniquement), rafraîchissement ~24 h.
- **⚠️ Contrainte de conception forte** : l'attribution **JustWatch** (référence ou logo) doit apparaître **sur chaque fiche** affichant la donnée — pas une seule fois dans les crédits — sous peine de **révocation de l'accès API**. À intégrer dès la maquette des fiches détail. Sources : [movie watch providers](https://developer.themoviedb.org/reference/movie-watch-providers), [précision staff TMDB](https://www.themoviedb.org/talk/60355e30a284eb003da676f2).

## 3. Compléments films/séries

- **TVmaze** (séries uniquement) : REST/JSON, **sans clé d'API**, gratuit, licence **CC BY-SA** (usage commercial permis avec crédit + ShareAlike), ≥ 20 appels/10 s par IP. **Aucun endpoint film.** Utile comme complément séries (calendrier de diffusion, structure épisodes) et, grâce à sa licence permissive, comme filet en cas de monétisation là où TMDB deviendrait payant. Source : [tvmaze.com/api](https://www.tvmaze.com/api).
- **Trakt** : ⚠️ **n'est PAS une source de métadonnées indépendante** — Trakt utilise **TMDB** comme source primaire des métadonnées TV et films depuis le 18/01/2021. À réserver aux fonctions **scrobbling / listes / IDs / social** (donc plutôt « plus tard »). Source : [annonce Trakt](https://github.com/trakt/trakt-api/discussions/250).
- **OMDb / IMDb** : non tranché ici (aucune affirmation vérifiée). OMDb reste une piste d'appoint pour certains identifiants ; IMDb n'a pas d'API publique ouverte. À creuser seulement si un manque précis apparaît.

## 4. IGDB — jeux vidéo

- **Coût / licence** : gratuit en **non commercial ET commercial** — avantage majeur sur TMDB. Le commercial passe par un partenariat (partner@igdb.com) avec attribution « IGDB.com » visible en emplacement statique. Source : [api-docs.igdb.com](https://api-docs.igdb.com/).
- **Authentification** : compte **Twitch** + OAuth2 `client_credentials` (`POST id.twitch.tv/oauth2/token`) — **pas** d'authentification utilisateur. Token ~64 jours, à renouveler côté serveur.
- **Quotas** : **4 req/s**, max 8 requêtes simultanées (HTTP 429 au-delà). Cache local **encouragé** par IGDB. ⚠️ Les images retirées restent disponibles **30 jours** avant suppression → prévoir une logique de rafraîchissement des visuels.
- **Français** : ⚠️ **limité**. `game_localizations` ne couvre que nom/jaquette/région ; `summary` et `storyline` sont des champs **uniques sans variante de langue** → **descriptions de jeux en anglais**. À assumer côté produit (les synopsis films/séries seront en FR, ceux des jeux en EN, sauf traduction externe ultérieure).

## 5. Durées de complétion — IGDB `game_time_to_beats` (résout le point de vigilance phase A)

- Endpoint **officiel** `https://api.igdb.com/v4/game_time_to_beats` exposant, en secondes, exactement les trois durées du besoin :
  - `hastily` = **histoire principale**,
  - `normally` = **histoire + annexes**,
  - `completely` = **100 %**,
  - `count` = nombre de soumissions communautaires (indicateur de fiabilité par jeu).
- Ce sont des **moyennes de soumissions communautaires stockées dans IGDB** (pas un flux HowLongToBeat) → **aucun scraping, aucune zone grise juridique.** Source : [game-time-to-beat](https://api-docs.igdb.com/#game-time-to-beat).
- **HowLongToBeat** : la recherche **n'a pas confirmé** l'existence d'une API officielle HLTB ni le détail de ses CGU sur le scraping (les intégrations connues restent non officielles). **Décision : on ne dépend pas de HLTB** ; l'endpoint IGDB couvre le besoin par des moyens propres.
- **⚠️ Couverture non garantie** : IGDB ne publie aucun chiffre de couverture ; elle dépend du volume de soumissions par jeu. Cohérent avec l'exigence produit : les estimations restent **toujours éditables manuellement**, avec provenance affichée (auto / manuel / modifié). **À valider empiriquement** sur un échantillon de jeux réels avant de figer.
- **RAWG** : **vérifié le 2026-07-20** (question soulevée par Julien, sources : [rawg.io/apidocs](https://rawg.io/apidocs)). Base ~500 000 jeux, très populaire dans les tutoriels. **Écarté comme source** pour Trackly : (1) gratuit limité au **non-commercial** avec backlinks obligatoires, usage commercial à **149 $/mois** — là où IGDB reste gratuit même en commercial ; (2) **pas d'équivalent à `game_time_to_beats`** (un seul champ playtime moyen, pas les 3 durées histoire/+annexes/100 % dont le budget temps a besoin) ; (3) qualité en baisse documentée (entrées fantômes, données incomplètes, [migration de projets vers IGDB en 2024](https://gamevau.lt/blog/2024/05/07/)) ; IGDB est adossé à Twitch/Amazon (pérennité). Reste un plan B connu si IGDB devenait indisponible.

## Points à revérifier / non couverts

1. Tarif commercial exact de TMDB et quotas hauts (sources communautaires, « susceptibles de changer »).
2. Couverture réelle mesurée (script `coverage-check`, exécuté le 2026-07-21 sur l'échantillon de 20 films + 20 séries — **partie TMDB** ; jeux en attente des clés IGDB) :
   - **Films** : 100 % trouvés, 100 % synopsis FR, 100 % durée connue. ✅ Rien à signaler.
   - **Séries** : 100 % trouvées, 100 % synopsis FR, mais **seulement 10 % avec `episode_run_time` renseigné** au niveau série (champ souvent vide sur les séries récentes — particularité TMDB connue). ⚠️ **Conséquence Lot 3** : le budget temps des séries s'appuiera sur la **durée par épisode** (fournie dans le détail des saisons `/tv/{id}/season/{n}`, chaque épisode ayant son propre `runtime`), avec la moyenne de la série en repli — exactement le mécanisme « durée réelle sinon moyenne » prévu au cahier des charges.
   - **Jeux** (mesuré le 2026-07-21 sur 30 titres) : 100 % trouvés, 100 % avec jaquette, **70 % avec durées `game_time_to_beats`** (21/30). Manquants : God of War Ragnarök, Hollow Knight, Hades, Persona 5 Royal, Super Mario Odyssey, Metroid Dread, Silksong, Disco Elysium, Returnal. ⚠️ Nuances : (1) le test prend le **premier** résultat de recherche, qui peut être une édition/spin-off sans durées (ex. « Elden Ring » → « Elden Ring Nightreign ») — la couverture réelle du bon jeu est probablement un peu meilleure, et le choix du bon résultat par l'utilisateur (B2) atténue ; (2) ce 70 % **valide la décision produit** : les estimations restent toujours éditables manuellement (`FieldOverride`, provenance affichée) et une durée absente s'affiche « — », jamais 0. Levier d'amélioration Lot 3+ : privilégier la correspondance exacte du nom dans le classement des résultats.
3. ~~RAWG~~ (vérifié le 2026-07-20, écarté — voir section 5) ; OMDb : non vérifié (complément potentiel seulement).
4. Rappel : dons ou publicité feraient basculer TMDB en usage commercial — vigilance si un bouton de don est ajouté un jour.
