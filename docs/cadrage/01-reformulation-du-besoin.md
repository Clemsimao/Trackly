# Reformulation du besoin et vision produit

> Étapes 1 et 2 du cadrage — rédigé le 2026-07-17. Objectif : vérifier la compréhension partagée avant toute décision technique.

## Le produit en une phrase

Trackly est une application web responsive et PWA installable qui sert de bibliothèque personnelle unifiée pour trois types de médias — jeux vidéo, séries, films — avec pour promesse centrale : **« savoir où j'en suis, ce qu'il me reste, et quoi jouer ou regarder ensuite »**.

Ce n'est pas un simple catalogue : la valeur est dans le suivi personnel (progression, temps, notes) et l'aide à la décision.

## Les trois piliers différenciants

1. **Suivi de progression spécifique par média.** Chaque type a ses propres statuts et règles. Pour les jeux : distinction nette entre liste d'envies (jeux non possédés ou à découvrir) et backlog (jeux possédés mais pas commencés), objectif de complétion par jeu, progression fine (%, prochain objectif, journal de reprise, trophées), possession multi-plateformes d'un même jeu avec temps et progressions distincts. Pour les séries : suivi à l'épisode près, distinction épisodes diffusés / annoncés. Pour les films : listes de visionnage, contexte (date, avec qui, envie de revoir).

2. **Budget temps.** Pour chaque contenu et en agrégé : temps déjà consacré et temps restant estimé, calculé en croisant les durées externes (épisodes, films, temps de complétion des jeux) avec l'avancement réel et l'objectif de complétion choisi. Présenté de façon motivante, jamais culpabilisante.

3. **Aide au choix.** Assistant de recommandation de films en interface swipe : envies du moment + historique (vus, aimés, refusés, notes, genres), avec explication de chaque proposition (« recommandé parce que tu as apprécié… ») et amélioration progressive à partir des réponses. Démarrage avec un moteur à règles ; IA/embeddings plus tard.

## Contraintes structurantes

- **Multi-utilisateur avec comptes** (inscription, connexion, déconnexion, profil, récupération de mot de passe), mais **aucune fonction sociale au départ**.
- **Données de catalogue issues d'API externes**, derrière une couche d'abstraction : multi-fournisseurs, cache, gestion des quotas, fusion de sources, dédoublonnage, mise à jour périodique, et **conservation des modifications manuelles** de l'utilisateur.
- **Provenance des données tracée** : l'application distingue toujours données récupérées automatiquement / saisies manuellement / modifiées par l'utilisateur.
- **Intégrations plateformes de jeu** (Steam, PSN, Xbox, Nintendo, Epic, GOG) : souhaitées mais pas exigées en V1. Le modèle de données doit les prévoir dès le départ. Règles fermes : jamais de mots de passe tiers demandés ou stockés, jamais de scraping contournant des protections ou violant des CGU ; OAuth ou équivalent sécurisé quand disponible ; jetons chiffrés, révocables, avec expiration gérée ; alternatives sinon (import de fichier, saisie manuelle, données publiques autorisées, service tiers reconnu).
- **Exigences transverses non négociables** : sécurité by design (OWASP, hachage fort, sessions sécurisées, rate limiting, RGPD avec export et suppression de compte), qualité logicielle professionnelle (typage, tests, CI/CD, migrations, documentation et ADR), accessibilité, performance mobile, mode clair/sombre, mobile-first.
- **Proportionnalité** : éviter la surarchitecture ; les choix doivent correspondre à un projet personnel maintenu par une très petite équipe, capable de grandir.

## Objectifs produit (ce qui définira le succès)

1. **Centraliser** : remplacer les notes éparses et applications multiples par une seule bibliothèque.
2. **Ne jamais perdre le fil** : reprendre un jeu ou une série des mois plus tard en sachant exactement où on en était et quoi faire ensuite.
3. **Rendre le backlog actionnable** : transformer la « pile de la honte » en plan réaliste grâce au temps restant, sans culpabilisation.
4. **Décider vite quoi regarder** : réduire le temps passé à choisir un film.
5. **Rester maître de ses données** : provenance claire, édition manuelle toujours possible, export et suppression complets.

## Ce que le produit n'est pas (anti-scope durable)

- Pas de lecture/streaming de contenus, pas de téléchargement.
- Pas de collecte de mots de passe de plateformes tierces, pas de scraping en violation de CGU.
- Pas de réseau social en V1 (prévu comme évolution possible, sans complexifier le MVP).
- Pas de publicité ni de tracking tiers.

## Hypothèses de faisabilité et points de vigilance

Ces points sous-tendent le découpage du MVP. Ils sont établis **de mémoire** et devront être **confirmés avec sources et CGU lors de l'étape 13** (recherche API dédiée). Là où l'information est incertaine, c'est indiqué — rien n'est inventé.

1. **Durées de complétion des jeux** : HowLongToBeat est la référence mais **n'a pas d'API officielle** ; les intégrations existantes reposent sur du scraping non autorisé → exclu par nos propres règles. Hypothèse de repli : IGDB expose depuis peu un endpoint de temps de complétion (« Time To Beat ») — existence et couverture à vérifier. Dans tous les cas, les estimations seront éditables manuellement (exigence produit de toute façon).
2. **Missions / chapitres / quêtes** : aucune API généraliste connue ne fournit la structure interne des jeux de manière fiable et légale. Le MVP repose donc sur % + prochain objectif + journal de progression ; les checklists structurées seront d'abord créées manuellement par l'utilisateur (V2), l'import automatique restant opportuniste là où une source fiable existera.
3. **Plateformes de jeu** : seule **Steam** propose une Web API officielle (bibliothèque, temps de jeu, succès, liaison de compte via OpenID). PSN, Xbox, Nintendo, Epic et GOG n'ont **pas d'API publique officielle** pour ces données (à confirmer) ; il existe des solutions non officielles ou tierces dont la conformité aux CGU devra être examinée avant toute décision. D'où : Steam en première intégration, les autres via import de fichier / saisie manuelle en attendant l'étude.
4. **Données en français** : très bonnes côté films/séries (TMDB), partielles côté jeux (IGDB majoritairement en anglais). L'interface sera en français ; certaines métadonnées de jeux resteront en anglais.
5. **Disponibilité streaming** : TMDB fournit les « watch providers » (données JustWatch) avec des conditions d'attribution et d'usage spécifiques — à vérifier avant de s'appuyer dessus pour la recommandation.
6. **Épisodes non diffusés** : gérables via les dates de diffusion fournies par les API séries ; le calcul du temps restant distinguera « disponible » et « annoncé ».
7. **Démarrage à froid de la recommandation** : au début, peu d'historique → la V1 de l'assistant s'appuiera surtout sur les envies du moment, les genres et les notes ; la personnalisation s'améliorera avec l'usage.
8. **PWA sur iOS** : installation et notifications ont des limitations spécifiques (à détailler en phase risques) ; l'architecture PWA reste valable, mais les notifications push ne seront pas un pilier du MVP.
