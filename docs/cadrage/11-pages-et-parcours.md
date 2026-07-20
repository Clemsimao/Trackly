# Pages principales et parcours utilisateurs

> Étapes 17 et 18 du cadrage — rédigé le 2026-07-17. Mobile-first ; navigation par barre inférieure sur mobile, latérale sur desktop.

## Arborescence des pages (V1, sauf mention)

```
Public (non connecté)
├─ / ................... Accueil / présentation + connexion
├─ /inscription
├─ /connexion
└─ /mot-de-passe-oublie (+ /reinitialisation)

Connecté — navigation principale (barre à 5 entrées)
├─ /accueil ............ Tableau de bord (budget temps, en cours, reprises rapides)
├─ /bibliotheque ....... Vue unifiée 3 médias + filtres (type, statut, genre, plateforme)
│  ├─ /jeux  /series  /films (mêmes vues pré-filtrées)
│  ├─ /backlog  /envies  /en-cours  /termines (raccourcis par statut)
│  └─ /media/:type/:id . Fiche détail (jeu / série / film)
├─ /recherche .......... Recherche globale (le « + » central : chemin critique d'ajout)
├─ /stats .............. Statistiques et temps restant (V1 simple, V2 graphiques+objectifs)
└─ /profil
   ├─ /profil/parametres ......... profil, thème, langue
   ├─ /profil/donnees ............ RGPD : export, suppression de compte
   ├─ /profil/comptes-externes ... V3 (Steam)
   └─ /profil/preferences-reco ... V2

V2 : /reco (assistant swipe films) · /activite (historique) · /listes
```

## Parcours critiques (à tester en E2E — étape 22)

### P1 — Premier contact : inscription → premier ajout (le parcours qui décide de tout)

1. Inscription (e-mail + mdp) → écran de bienvenue court (pas de tunnel d'onboarding lourd).
2. Invite unique : « Ajoute ton premier contenu » → recherche.
3. Tape 3 lettres → résultats instantanés (cache) → fiche préremplie.
4. Choisit type d'entrée : statut + (jeux) plateforme → **ajouté en ≤ 2 taps** depuis le résultat.
5. Retour bibliothèque : le contenu est là, avec temps estimé affiché.
   **Critère de succès produit : < 60 s entre l'inscription et le premier contenu ajouté.**

### P2 — Reprendre un jeu après une pause

Accueil → carte « En cours » → fiche du jeu → **note de reprise + prochain objectif visibles immédiatement** (pas cachés dans un onglet) → l'utilisateur met à jour sa progression en 1 tap (« +2 h », « chapitre suivant », % ) → le journal s'enrichit, le temps restant se recalcule.

### P3 — Marquer sa soirée série

Accueil ou fiche série → épisode courant proposé (« S02E05 suivant ») → tap « vu » → progression et durée restante mises à jour → option « marquer la saison ».

### P4 — Décider quoi regarder (V1 simple, V2 swipe)

V1 : liste « films à voir » triable par durée (« j'ai 1 h 30 ») + dispo streaming sur la fiche. V2 : parcours swipe complet avec envies du moment.

### P5 — Consulter son budget temps

Accueil (résumé) → /stats : heures restantes par média + total backlog, heures consacrées, compteurs. Ton bienveillant (RF-3), formulations positives.

### P6 — RGPD : exporter puis supprimer son compte

/profil/donnees → export JSON téléchargeable → suppression avec confirmation forte (mot de passe + délai de grâce) → e-mail de confirmation.

## Principes UX transverses

- Le « + » (ajout via recherche) toujours accessible : **c'est le geste n°1** (RF-2).
- Progression, statut, temps restant, prochaine étape = visibles **au premier écran** de chaque fiche (exigence du cahier des charges).
- Attribution TMDB globale (À propos) + **JustWatch sur chaque fiche** affichant la dispo streaming (contrainte légale D6).
- États : squelettes de chargement, vides engageants (« rien ici — ajoute ton premier jeu »), erreurs réseau avec retry.
- Accessibilité : cibles ≥ 44 px, focus visible, navigation clavier, contrastes AA, `prefers-reduced-motion`.
