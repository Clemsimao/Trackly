# Registre des risques (techniques et fonctionnels)

> Étapes 15 et 16 du cadrage — rédigé le 2026-07-17. Échelle : Impact (Faible/Moyen/Fort), Probabilité (Faible/Moyenne/Forte). Priorité = combinaison des deux. Chaque risque a une parade actée ou une décision à prendre.

## Risques techniques

### RT-1 — Réveil à froid de l'API · Impact Moyen · Proba Faible

**Neutralisé en configuration primaire** (auto-hébergement Proxmox : serveur toujours chaud). Ne subsiste que sur le **repli cloud** (Render free, veille après 15 min → 30-60 s). Parade repli : keep-alive sur `/health` sans requête DB, skeletons de chargement.

### RT-2 — Épuisement du quota base · Impact Moyen · Proba Faible

**Neutralisé en primaire** (Postgres auto-hébergé, pas de quota — limité seulement par le disque). Ne concerne que le **repli Neon** (100 CU-h/mois) : `/health` sans DB, scale-to-zero, alerte à ~70 %.

### RT-10 — Disponibilité domestique et sauvegardes (auto-hébergement) · Impact Fort · Proba Moyenne

Coupure courant/ISP → app indisponible (pas de SLA) ; les sauvegardes deviennent la responsabilité de l'utilisateur ; panne matérielle = downtime. **Parade** : snapshot Proxmox planifié + `pg_dump` chiffré nocturne exporté hors machine ; VM/LXC isolée (VLAN dédié) + Cloudflare Access sur l'admin ; onduleur optionnel ; **repli cloud redéployable** avec la même image Docker en cas de besoin de haute dispo. À formaliser en stratégie de déploiement/sauvegarde (phase D).

### RT-3 — Dépendance aux API externes (TMDB, IGDB) · Impact Fort · Proba Faible

Changement de CGU, de tarif, ou panne d'un fournisseur. **Parade** : la **couche d'abstraction fournisseurs** (déjà au cœur de l'archi) isole chaque API derrière une interface ; cache local persistant → l'app fonctionne en dégradé si une API tombe ; les données déjà importées appartiennent à l'utilisateur. **Point de vigilance** : respecter les durées de cache (TMDB 6 mois, images IGDB 30 j).

### RT-4 — Bascule commerciale TMDB coûteuse · Impact Fort · Proba Moyenne (si succès)

Monétiser (même via dons/pub) rend TMDB payant. **Parade** : décision consciente au moment de monétiser ; TVmaze (CC BY-SA) comme filet séries ; provisionner le coût dans tout business plan futur. **Ce n'est pas un risque MVP**, c'est une contrainte à ne pas oublier.

### RT-5 — Couverture de données incomplète (durées de jeux, FR) · Impact Moyen · Proba Moyenne

`game_time_to_beats` (IGDB) et les traductions FR (TMDB) ne couvrent pas 100 % des titres. **Parade** : édition manuelle **toujours** possible avec provenance affichée (exigence produit déjà prévue) ; **test empirique** sur un échantillon dès le début du dev pour mesurer le taux réel. **Ne bloque rien**, dégrade gracieusement.

### RT-6 — Complexité des calculs de temps restant · Impact Moyen · Proba Moyenne

Cas limites nombreux : épisodes non diffusés, durées variables, temps déjà joué, objectif de complétion, données manquantes, overrides manuels. Source de bugs silencieux. **Parade** : logique isolée dans un **module métier pur, testé en priorité** (exigence déjà actée) ; tests unitaires sur tous les cas limites listés au cahier des charges.

### RT-7 — Sécurité (auth, données perso, RGPD) · Impact Fort · Proba Moyenne

Fuite de données, session volée, faille OWASP. **Parade** : stratégie sécurité dédiée (étape 23) — Argon2id, cookies httpOnly, rate limiting, validation Zod, CORS strict, secrets côté serveur uniquement (front statique aide), export/suppression RGPD dès V1. **À formaliser en phase D.**

### RT-8 — Complexité PWA / hors ligne · Impact Faible-Moyen · Proba Moyenne

Service worker, cache, synchro au retour de connexion = source classique de bugs. **Parade** : V1 volontairement limitée à la **consultation hors ligne en lecture** ; l'écriture hors ligne avec file de synchro repoussée en V2/V3, quand le modèle sera stable.

### RT-9 — Sur-ingénierie (risque auto-infligé) · Impact Moyen · Proba Moyenne

NestJS + monorepo peuvent inviter à abstraire trop tôt. **Parade** : garde-fous déjà actés (un repo, une base, pg-boss pas Redis, pas de microservices, pas d'abstraction sans 2e cas d'usage). **Revue** : se reposer la question à chaque nouvelle couche.

> Note : la numérotation RT-1/RT-2 a été révisée le 2026-07-17 suite au choix d'auto-hébergement (D3) ; RT-10 ajouté.

## Risques fonctionnels

### RF-1 — Fausse promesse d'import automatique · Impact Fort · Proba (maîtrisée)

L'utilisateur pourrait s'attendre à connecter toutes ses plateformes. **Parade** : décision D8 actée (import = confort) ; communication produit honnête (« Steam automatique, autres en saisie assistée ») ; ne jamais afficher un bouton « Connecter PlayStation » qui déçoit. **Déjà traité.**

### RF-2 — Friction de la saisie manuelle · Impact Fort · Proba Moyenne

Si ajouter un contenu est pénible, l'utilisateur abandonne et la bibliothèque reste vide → toute la valeur s'effondre. **Parade** : la saisie assistée (recherche IGDB/TMDB instantanée + préremplissage + ajout 2 clics) est une **priorité UX de premier rang** (persona principal). À traiter comme fonctionnalité cœur, pas comme formulaire.

### RF-3 — Culpabilisation par le backlog · Impact Moyen · Proba Moyenne

Afficher « 320 h restantes » peut décourager. **Parade** : ton bienveillant et ludique exigé au cahier des charges ; formuler en objectifs atteignables (V2) ; jamais de rouge/alarme sur la taille du backlog.

### RF-4 — Démarrage à froid de la recommandation · Impact Moyen · Proba Forte (au début)

Sans historique, la reco swipe est peu pertinente. **Parade** : la reco est en **V2** (après remplissage de la bibliothèque) ; s'appuie d'abord sur les envies explicites du moment + genres + notes, la personnalisation s'améliorant avec l'usage. **Phasage déjà aligné.**

### RF-5 — Charge de maintenance en solo · Impact Fort · Proba Moyenne

Projet perso maintenu par une très petite équipe : risque d'essoufflement. **Parade** : périmètre MVP resserré ; stack en un seul langage ; CI/tests pour éviter les régressions coûteuses ; documentation et ADR pour retrouver le fil après une pause.

### RF-6 — Périmètre qui gonfle (scope creep) · Impact Fort · Proba Forte

Le cahier des charges est riche (social, IA, calendriers…). Tentation d'en faire trop en V1. **Parade** : découpage V1/V2/V3/plus-tard **écrit et validé** ; toute nouvelle idée va d'abord dans « plus tard » et n'entre dans un lot que par arbitrage explicite.

## Top 3 à surveiller en continu

1. **RF-2 (friction saisie)** — c'est le point de vie ou de mort de l'usage réel.
2. **RT-6 (calculs de temps)** — le différenciateur technique, à blinder par les tests.
3. **RF-6 (scope creep)** — le risque le plus probable sur un projet perso ambitieux.
