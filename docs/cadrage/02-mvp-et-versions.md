# MVP et versions suivantes

> Étapes 4 et 5 du cadrage — rédigé le 2026-07-17. Statut : proposition à valider.

## Principe de découpe

Le MVP doit livrer **les trois piliers en version simple** — bibliothèque + progression + temps restant — sur les trois médias, avec l'authentification et les fondations exigées (abstraction des fournisseurs, provenance des données, sécurité, qualité). Une fonctionnalité n'entre en V1 que si elle sert directement « savoir où j'en suis et ce qu'il me reste ». L'aide au choix (swipe) arrive en V2 : elle a besoin d'une bibliothèque remplie et d'un historique pour être pertinente.

## MVP (V1) — « suivre mes médias et savoir où j'en suis »

### 1. Comptes et profil

- Inscription e-mail/mot de passe, connexion, déconnexion, réinitialisation du mot de passe par e-mail.
- Profil : pseudo, avatar, préférences de base (thème, langue).
- **RGPD dès la V1** : suppression complète du compte + export des données personnelles.
- Sessions sécurisées, protection brute force, rate limiting, validation stricte des entrées.

### 2. Recherche et fiches médias

- Recherche globale (jeux, films, séries) via les API externes, avec cache serveur et debounce.
- Fiches détail : visuels, synopsis, genres, plateformes, durées, saisons/épisodes, équipe/développeurs.

### 3. Bibliothèque et statuts

- Ajout / retrait d'un contenu, changement de statut.
- Statuts spécifiques par média (listes complètes du besoin) :
  - Jeux : envie / possédé non commencé (backlog) / en cours / en pause / terminé / terminé 100 % / abandonné.
  - Séries : à voir / en cours / en pause / terminée / abandonnée / favorite.
  - Films : à voir / vu / favori / pas apprécié / abandonné / proposé mais refusé.
- Filtres et tris par type, statut, genre, plateforme. (Listes personnalisées → V2.)

### 4. Jeux vidéo

- Possession multi-plateformes : le même jeu possédé sur PlayStation et Steam = deux possessions distinctes avec temps de jeu et progression propres.
- Champs : plateforme(s), dates (achat, début, fin, dernière session), heures jouées (saisie manuelle), note, avis, notes personnelles, trophées en compteur simple « x / y » (détail par trophée via les plateformes → V3+).
- **Objectif de complétion par jeu** : histoire principale / histoire + annexes / 100 %.
- Progression : pourcentage + « prochain objectif » en texte libre + **journal daté des mises à jour** (historique consultable) + note de reprise (« où j'en suis, quoi faire en relançant »).
- Durées estimées (histoire / histoire+annexes / 100 %) importées quand disponibles, **toujours éditables manuellement**, avec provenance affichée (auto / manuel / modifié).
- Temps restant calculé : estimation selon l'objectif choisi − heures jouées (ou pondéré par la progression).

### 5. Séries

- Marquer un épisode vu / une saison vue, annuler en cas d'erreur, date de visionnage par épisode.
- Progression : épisodes vus / restants, pourcentage, durée vue / restante (durée réelle des épisodes si disponible, sinon moyenne).
- Distinction épisodes **diffusés** vs **annoncés non diffusés** dans le calcul du restant.
- Note, avis, notes personnelles, date du dernier épisode vu.

### 6. Films

- Note, avis, notes personnelles, date de visionnage, envie de revoir, « vu avec » (texte simple en V1).
- Durée du film intégrée au temps total de la liste « à voir ».

### 7. Tableau de bord v1

- Cartes : heures restantes séries / films / jeux + total backlog ; heures déjà consacrées par catégorie ; compteurs en cours / terminés / envies / backlog ; répartition par type et par statut.
- (Graphiques d'évolution, objectifs personnels, formulations ludiques → V2.)

### 8. PWA v1

- Installable (manifest, icônes), cache de l'app shell et des dernières données consultées (lecture seule hors ligne), états réseau et de chargement propres, gestion des mises à jour du service worker.
- (Écriture hors ligne avec synchronisation au retour → V2/V3.)

### 9. Fondations techniques (invisibles mais structurantes)

- Couche d'abstraction des fournisseurs externes (interface commune par type de média) + cache + gestion des quotas.
- Provenance auto / manuel / modifié sur les champs importés ; les éditions manuelles survivent aux rafraîchissements.
- Journal d'événements d'activité enregistré dès la V1 (la page « historique d'activité » arrive en V2, sans perte de données).
- i18n en place (UI française d'abord), mode clair/sombre, accessibilité de base (clavier, contrastes, focus, alt).
- Tests : unitaires sur les calculs de temps restant (cas limites : données manquantes, overrides, épisodes non diffusés), intégration API, E2E sur les parcours critiques (inscription, ajout, progression).
- CI, lint/format, Docker Compose pour le dev, migrations, données de démo, logs structurés, suivi d'erreurs (type Sentry).

## V2 — « choisir et se motiver »

- **Assistant de recommandation de films v1** : questionnaire d'envies (genres recherchés/évités, ambiance, durée max, époque, langue, popularité, seul/en couple/famille/amis, plateformes de streaming) + moteur à règles exploitant l'historique (vus, aimés, refusés, notes, genres) + **interface swipe** (oui/non, déjà vu, ajouter à la liste, infos, bande-annonce, disponibilité streaming) + explication de chaque proposition + apprentissage simple à partir des réponses enregistrées.
- **Tableau de bord v2** : graphiques, évolution semaine/mois/année, répartitions par genre et plateforme, objectifs personnels (« terminer 2 jeux ce mois-ci »), formulations ludiques et bienveillantes (« ton backlog représente 320 h ; à 5 h/semaine, ~15 mois »), page historique d'activité.
- **Séries à jour** : rafraîchissement périodique des données, détection de nouvelles saisons sur les séries terminées, information in-app.
- **Jeux** : checklists de progression structurées créées par l'utilisateur (chapitres/quêtes/zones), import automatique opportuniste si une source fiable et autorisée est identifiée.
- Listes personnalisées ; export de la bibliothèque (CSV/JSON) ; PWA avec écriture hors ligne et file de synchronisation.

## V3 — « connecter »

- **Intégration Steam** (API officielle) : liaison de compte via OpenID, import de la bibliothèque avec sélection des jeux, temps de jeu, succès ; resynchronisation ; détection et fusion des doublons ; choix des données partagées ; déconnexion de la plateforme et purge des données importées.
- Import par fichier / export plateforme pour les autres écosystèmes, selon les conclusions de l'étude de faisabilité (PSN, Xbox : solutions à évaluer strictement au regard des CGU ; Nintendo, Epic, GOG : a priori manuel/fichier).
- Notifications (nouvelles saisons, sorties) en push web, selon les limites PWA par OS.

## Plus tard (backlog produit, sans engagement)

Profils publics, amis, comparaison de bibliothèques, partage de listes, défis ; recommandation de séries et de jeux ; calendrier des sorties ; suivi livres/mangas/podcasts ; import depuis d'autres applications (Letterboxd, Backloggd…) ; IA conversationnelle, embeddings pour la recommandation, résumé automatique de reprise ; bilans mensuels/annuels ; application mobile native (facilitée par l'API séparée).

## Arbitrages assumés (à valider)

| Arbitrage                                                          | Pourquoi                                                                                                                                                                                         |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Recommandation swipe en V2, pas en V1                              | Elle n'est pertinente qu'avec une bibliothèque et un historique existants ; elle dépend des watch providers (conditions à vérifier) ; la mettre en V1 retarderait le cœur de plusieurs semaines. |
| Import Steam en V3, rien d'autre avant                             | Seule API officielle identifiée ; le modèle de données prévoit le multi-fournisseurs dès la V1, donc rien n'est bloqué.                                                                          |
| Trophées en compteur simple en V1                                  | Le détail par trophée n'a de valeur qu'automatisé (V3 via Steam) ; un compteur manuel couvre le besoin de suivi.                                                                                 |
| Missions/chapitres : texte libre + journal en V1, checklists en V2 | Aucune source automatique fiable et légale identifiée à ce stade ; le texte libre couvre le besoin « savoir quoi faire en reprenant ».                                                           |
| RGPD (export + suppression) dès la V1                              | Obligatoire dès le premier utilisateur réel, et beaucoup plus coûteux à rattraper après coup.                                                                                                    |
| Notifications push hors V1                                         | Complexité PWA/OS élevée pour un gain différé ; l'information in-app (V2) couvre d'abord le besoin.                                                                                              |
