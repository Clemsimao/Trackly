# Profils d'utilisateurs (personas)

> Étape 3 du cadrage — rédigé le 2026-07-17. Trackly démarre comme un produit personnel (mono-utilisateur réel : toi), mais l'architecture est multi-utilisateur dès le départ. Ces personas servent à **arbitrer les priorités UX**, pas à élargir le périmètre.

## Persona principal — « Le complétionniste organisé » (utilisateur cible n°1)

**Qui.** Joueur/spectateur multi-plateformes (PC + console + streaming). Possède plus de contenus qu'il ne peut en consommer. Aime savoir où il en est et planifier.

**Frustrations actuelles.**

- Sa mémoire de jeu se perd entre deux sessions espacées (« j'étais où dans Baldur's Gate déjà ? »).
- Son backlog est éparpillé : wishlist Steam, jeux PS non commencés, séries à moitié vues, films notés nulle part.
- Aucune vision du temps que « tout ça » représente.

**Ce qu'il attend de Trackly (priorités).**

1. Une bibliothèque unique qui centralise les 3 médias.
2. Un suivi de progression fiable avec **note de reprise** (« quoi faire en relançant »).
3. Le **budget temps** agrégé et par contenu.
4. Une saisie rapide (il ajoutera beaucoup de contenus).

**Impact sur le produit.** C'est LUI qu'on optimise. Justifie : saisie manuelle excellente, journal de progression, tableau de bord temps, statuts fins. **= tout le MVP.**

## Persona secondaire — « L'indécis du soir » (utilisateur cible n°2, souvent la même personne)

**Qui.** Le soir, veut regarder un film mais passe 30 min à choisir et finit par ne rien lancer. Parfois seul, parfois en couple/entre amis.

**Frustrations.** Trop de choix, dispersés sur plusieurs plateformes de streaming ; ne sait plus ce qu'il a déjà vu ou voulu voir.

**Ce qu'il attend.**

1. Un outil qui **décide vite** selon l'envie du moment et le contexte (seul/à deux).
2. Savoir **où le film est disponible** en streaming en France.
3. Ne pas se voir reproposer ce qu'il a déjà vu/refusé.

**Impact sur le produit.** Justifie l'**assistant de recommandation swipe** — mais il a besoin d'un historique pour être pertinent. **= V2**, ce qui confirme l'arbitrage de phasage.

## Persona tertiaire — « Le suiveur de séries » (transverse)

**Qui.** Suit plusieurs séries en parallèle, souvent au fil des diffusions.

**Frustrations.** Oublie quel épisode il en est ; rate le retour d'une série qu'il pensait finie.

**Ce qu'il attend.**

1. Suivi à l'épisode près, marquage rapide.
2. Être prévenu qu'une série « terminée » a une nouvelle saison.

**Impact.** Suivi épisode = MVP ; notification nouvelle saison = V2 (in-app d'abord).

## Non-personas (hors cible, assumé)

- **L'utilisateur social / compétitif** (comparer, défier des amis) : hors périmètre initial — le social est en « plus tard ».
- **Le collectionneur exhaustif de trophées** en temps réel : le compteur simple suffit en V1 ; le détail viendra avec Steam (V3).
- **L'utilisateur non technique cherchant un import « magique » de toutes ses plateformes** : impossible techniquement (cf. faisabilité). On assume une saisie manuelle soignée plutôt qu'une fausse promesse.

## Ce que ces personas confirment

- Le **vrai différenciateur** est le trio suivi + budget temps + reprise, servi par une **saisie rapide** — pas les connexions plateformes (cohérent avec la décision D8).
- Le phasage MVP → V2 → V3 correspond à l'ordre naturel des besoins : d'abord centraliser et suivre, ensuite décider et se motiver, enfin connecter.
