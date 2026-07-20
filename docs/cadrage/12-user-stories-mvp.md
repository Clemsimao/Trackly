# User stories du MVP avec critères d'acceptation

> Étapes 19 et 20 du cadrage — rédigé le 2026-07-17. Périmètre : V1 uniquement (les stories V2/V3 seront rédigées à l'entame de leur lot). Format compact : critères en liste vérifiable plutôt que Gherkin verbeux. « CA » = critère d'acceptation.

## Épopée A — Comptes et RGPD

**A1 — Inscription.** En tant que visiteur, je crée un compte avec e-mail et mot de passe afin d'avoir ma bibliothèque personnelle.

- CA : e-mail unique validé ; mdp ≥ 12 caractères avec indicateur de robustesse ; hachage Argon2id ; connexion automatique après inscription ; erreurs explicites sans révéler si l'e-mail existe déjà (anti-énumération).

**A2 — Connexion / déconnexion.** Session par cookie httpOnly ; « rester connecté » ; déconnexion révoque la session côté serveur.

- CA : rate limiting sur /login (verrouillage progressif) ; message d'erreur identique e-mail inconnu / mdp faux ; session expirée → redirection propre avec retour à la page demandée.

**A3 — Mot de passe oublié.** Réinitialisation par e-mail avec jeton à usage unique expirant (≤ 1 h).

- CA : réponse identique que l'e-mail existe ou non ; l'ancien lien devient invalide après usage ou nouvelle demande ; toutes les sessions révoquées après réinitialisation.

**A4 — Export de mes données.** Depuis /profil/donnees, je télécharge un JSON complet (profil, bibliothèque, progressions, avis, journal).

- CA : généré à la demande ; contient toutes les données personnelles ; format documenté.

**A5 — Suppression de compte.** Suppression définitive avec confirmation forte.

- CA : re-saisie du mot de passe ; délai de grâce 7 jours avec e-mail d'annulation ; à l'échéance, purge complète (cascade) hors obligations légales ; confirmation par e-mail.

## Épopée B — Recherche et ajout (chemin critique RF-2)

**B1 — Recherche globale.** Je cherche un jeu, un film ou une série et vois des résultats fusionnés ou filtrés par type.

- CA : debounce ≤ 300 ms ; résultats < 1 s si cache chaud ; visuel + année + type visibles ; état vide utile ; erreur API externe → message + résultats du cache local si disponibles.

**B2 — Ajout en 2 taps.** Depuis un résultat, j'ajoute le contenu avec un statut (et une plateforme pour un jeu).

- CA : bouton d'ajout directement sur la carte résultat ; statut par défaut intelligent (film → « à voir », jeu → « envie » ou « backlog » si plateforme choisie) ; toast de confirmation avec lien vers la fiche ; doublon détecté → proposer d'ouvrir l'entrée existante au lieu de dupliquer.

**B3 — Fiche préremplie.** Toute fiche ajoutée récupère automatiquement métadonnées, visuels, durées (film/épisodes) ou temps de complétion (jeu, si disponible IGDB).

- CA : champs manquants affichés comme « à compléter » et éditables ; provenance visible (auto/manuel/modifié) ; édition manuelle jamais écrasée par un rafraîchissement (test dédié).

## Épopée C — Jeux

**C1 — Statuts et possessions.** Je gère le statut de chaque jeu par plateforme possédée, avec la distinction envie (pas possédé) / backlog (possédé non commencé).

- CA : les 8 statuts du cahier des charges disponibles ; un jeu peut avoir plusieurs possessions (PS5 + PC) avec statuts/temps distincts ; passer de « envie » à « possédé » crée la possession (date d'achat optionnelle).

**C2 — Progression et reprise.** Sur un jeu en cours, je renseigne %, prochain objectif, note de reprise, et je vois l'historique de mes mises à jour.

- CA : mise à jour en ≤ 2 taps depuis la fiche ; chaque changement journalisé avec date ; note de reprise visible immédiatement en haut de fiche ; historique consultable en ordre antichronologique.

**C3 — Temps de jeu et temps restant.** Je saisis mes heures jouées ; l'app affiche le temps restant selon mon objectif de complétion.

- CA : les 3 durées (histoire / +annexes / 100 %) affichées si connues avec nombre de soumissions ; objectif de complétion sélectionnable par possession ; restant = max(0, durée(objectif) − heures jouées) sauf override ; toutes les durées éditables manuellement (provenance « modifié »).

**C4 — Trophées simples.** Je saisis « x obtenus / y total » par possession.

- CA : compteur libre, jamais bloquant ; affiché sur la fiche.

## Épopée D — Séries

**D1 — Marquage épisodes.** Je marque un épisode vu (avec date), une saison entière, et je peux annuler.

- CA : « épisode suivant » proposé en 1 tap ; marquage saison = tous les épisodes diffusés de la saison ; annulation restaure l'état antérieur ; les épisodes **non diffusés** ne sont ni marquables ni comptés dans le restant immédiat.

**D2 — Progression série.** Je vois épisodes vus/restants, %, durée regardée/restante, date du dernier épisode vu.

- CA : calculés depuis les marquages (jamais stockés en dur) ; durée réelle d'épisode si connue sinon moyenne de la série ; épisodes annoncés non diffusés affichés à part (« à venir »).

**D3 — Statuts série.** À voir / en cours / en pause / terminée / abandonnée / favorite.

- CA : passage automatique proposé (« dernier épisode vu → marquer terminée ? ») mais jamais imposé.

## Épopée E — Films

**E1 — Suivi film.** Statuts/listes du cahier des charges, note, avis, notes perso, date de visionnage, envie de revoir, « vu avec ».

- CA : marquer « vu » propose note + date en un geste ; durée du film intégrée au total « à voir » ; « proposé mais refusé » disponible (alimentera la reco V2).

## Épopée F — Tableau de bord

**F1 — Budget temps.** Je vois les heures restantes par média et le total backlog, les heures consacrées, et mes compteurs par statut.

- CA : calculs conformes au module time-budget (mêmes règles que les fiches) ; données manquantes signalées (« 3 jeux sans estimation ») et non comptées silencieusement ; ton bienveillant, pas d'alarme rouge (RF-3) ; chargement < 2 s.

## Épopée G — PWA et transverse

**G1 — Installation PWA.** J'installe Trackly sur mobile et desktop ; l'app s'ouvre plein écran avec son icône.

- CA : manifest + icônes complets ; consultation en lecture des dernières données chargées hors connexion ; bandeau clair « hors ligne » ; mise à jour du service worker sans casser la session.

**G2 — Thème et langue.** Clair/sombre/auto ; interface en français (structure i18n prête).

- CA : préférence persistée ; `prefers-color-scheme` respecté par défaut ; aucun texte en dur hors fichiers i18n.

**G3 — Accessibilité de base.** Navigation clavier complète, contrastes AA, alt sur visuels, focus géré.

- CA : audit axe/Lighthouse sans erreur bloquante sur les parcours P1-P3 ; `prefers-reduced-motion` respecté.
