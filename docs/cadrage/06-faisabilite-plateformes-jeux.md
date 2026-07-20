# Faisabilité des connexions aux plateformes de jeu

> Étape 14 du cadrage — rédigé le 2026-07-17. Sources primaires vérifiées le 2026-07-17. Rappel des règles fermes du projet : **jamais de mot de passe tiers demandé ou stocké**, **jamais de scraping ou de contournement de protection**, OAuth ou équivalent officiel quand il existe, sinon alternatives légales (import de fichier, saisie manuelle, données publiques autorisées).

## Synthèse : une seule intégration « propre » aujourd'hui

| Plateforme           | API officielle pour bibliothèque/temps de jeu/succès ?                                          | Verdict Trackly                       |
| -------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------- |
| **Steam**            | ✅ Oui — Steam Web API officielle                                                               | ✅ **Recommandé** (cible V3)          |
| **Xbox**             | 🟡 Non publique directe ; passerelle tierce OpenXBL                                             | 🟡 Possible avec réserves (V3+)       |
| **PlayStation**      | ❌ Aucune API publique officielle                                                               | 🔴 À éviter en direct → import/manuel |
| **Nintendo**         | ❌ Aucune API publique officielle                                                               | 🔴 Manuel uniquement                  |
| **Epic Games Store** | ❌ Pas d'API publique de bibliothèque                                                           | 🔴 Manuel uniquement                  |
| **GOG**              | 🟡 SDK GALAXY, mais pensé pour les _jeux_, pas pour lire la bibliothèque d'un utilisateur tiers | 🔴 Manuel en pratique                 |

**Conclusion de cadrage : le modèle de données doit rester multi-fournisseurs (déjà acté en phase A), mais une seule intégration automatique réaliste et propre existe — Steam.** Tout le reste passe par la **saisie manuelle** (V1) puis l'**import de fichier** quand une plateforme fournit un export officiel. Ceci confirme et affine le périmètre : import Steam en **V3**, les autres restent manuels sans date d'engagement.

## 1. Steam — ✅ recommandé (la seule voie officielle)

- **API officielle et gratuite.** Valve : « Valve makes the Steam Web API available free. » Clé développeur gratuite. Source : [Steam Web API ToU](https://steamcommunity.com/dev/apiterms).
- **Données accessibles** via `IPlayerService` (source : [doc partenaire](https://partner.steamgames.com/doc/webapi/IPlayerService)) :
  - `GetOwnedGames` → **bibliothèque possédée + temps de jeu** (`playtime_forever`, en minutes),
  - `GetRecentlyPlayedGames` → jeux récemment lancés,
  - succès disponibles via `ISteamUserStats`.
- **Authentification** : liaison de compte par **OpenID Steam** (l'utilisateur se connecte chez Steam, Trackly ne voit **jamais** son mot de passe — conforme à nos règles). Les appels de données utilisent la clé développeur de Trackly.
- **⚠️ Conditions à respecter** :
  - **Le profil Steam de l'utilisateur (et ses détails de jeux) doit être public** pour que `GetOwnedGames` renvoie les données → prévoir un message clair guidant l'utilisateur.
  - Consentement explicite requis (« only retrieve Steam Data ... as requested by the end user »).
  - **Politique de confidentialité obligatoire** dès qu'on stocke des données Steam (cohérent avec notre RGPD V1).
  - Limite de **100 000 appels/jour** (très large ; import par lots + cache).
  - Pas de suggestion d'endossement par Valve ; données « as is ».
- **Verdict** : ✅ **cible de la V3**, exactement comme prévu. C'est la brique qui justifie d'avoir conçu le multi-fournisseurs dès le départ.

## 2. Xbox — 🟡 possible avec réserves

- **Pas d'API grand public directe** pour lire la bibliothèque/succès d'un utilisateur ; l'authentification Xbox Live (XSTS) est complexe et non prévue pour ce cas d'usage tiers.
- **OpenXBL (xbl.io)** est une **passerelle tierce** (Bstack Networks LLC / BitBoss Development), **pas** un produit Microsoft (« OpenXBL does not own or control Xbox Live services »). Auth liée au compte Microsoft de l'utilisateur, **offre par paliers payants** (existence d'un free tier non confirmée). Source : [xbl.io/agreement](https://xbl.io/agreement).
- **Risques** : dépendance à un intermédiaire non officiel (pérennité, coût, conformité vis-à-vis de Microsoft) ; à examiner sérieusement avant tout engagement.
- **Verdict** : 🟡 **possible avec réserves, post-V3**. Ne pas en faire une dépendance structurante. Alternative sûre par défaut : import/manuel.

## 3. PlayStation — 🔴 à éviter en connexion directe

- **Aucune API publique officielle** pour la bibliothèque/temps de jeu/trophées.
- **psn-api** (bibliothèque communautaire) est **non officiel** : il s'authentifie via un **token NPSSO** récupéré depuis un cookie d'une session PlayStation connectée — ce token est **équivalent à un mot de passe**. Source : [psn-api](https://github.com/achievements-app/psn-api).
- **Pourquoi c'est écarté** : reposer sur un token de session personnel = zone grise vis-à-vis des CGU Sony, fragilité (casse à chaque changement côté PSN), et manipulation d'un secret sensible côté serveur → **contraire aux règles du projet**. On ne demande pas et on ne stocke pas ce type d'identifiant.
- **Alternative retenue** : **saisie manuelle** (V1), et surveiller si Sony ouvre un export officiel. Les données de trophées publiques via un service tiers reconnu pourront être réévaluées, sans jamais manipuler d'identifiant de session.

## 4. Nintendo — 🔴 manuel uniquement

- **Aucune API publique officielle** pour les jeux possédés / temps de jeu. Le Nintendo Developer Portal sert à **publier** des jeux, pas à lire la bibliothèque d'un joueur. Les accès existants sont des **API reverse-engineerées** de l'app Switch (non officielles) → exclues par nos règles. Source : [Nintendo Developer Portal](https://developer.nintendo.com/), [projet communautaire reverse-engineeré](https://github.com/ZekeSnider/NintendoSwitchRESTAPI).
- **Verdict** : **saisie manuelle uniquement**.

## 5. Epic Games Store — 🔴 manuel uniquement

- **Epic Online Services (EOS)** est destiné aux **développeurs de jeux** (services de compte/ecom pour leurs propres titres), **pas** à lire la bibliothèque Epic d'un utilisateur tiers. Les wrappers de la boutique (ex. `epicstore_api`) sont **non officiels** et contournent des protections anti-bot → exclus. Sources : [EOS Web API](https://dev.epicgames.com/docs/web-api-ref/web-api-introduction), [wrapper non officiel](https://github.com/SD4RK/epicstore_api).
- **Verdict** : **saisie manuelle uniquement**.

## 6. GOG — 🔴 manuel en pratique

- Le **SDK GALAXY** existe et est documenté, mais il s'adresse aux **jeux intégrant GALAXY** (succès, multi, cloud) et requiert des credentials **par jeu** ; l'API Python d'intégrations (`get_owned_games`) sert à **écrire des connecteurs pour le client GALAXY**, pas à exposer une API serveur lisant la bibliothèque d'un utilisateur tiers. Sources : [docs.gog.com/sdk](https://docs.gog.com/sdk/), [galaxy-integrations-python-api](https://github.com/gogcom/galaxy-integrations-python-api).
- **Verdict** : pas de voie officielle simple pour notre cas → **saisie manuelle** ; réévaluer si GOG publie un export utilisateur.

## Conséquences pour l'architecture (à intégrer en phase C)

1. **Interface `ExternalGameLibraryProvider`** commune, avec pour l'instant **une seule implémentation propre : `SteamProvider`** (V3). Les autres plateformes = entrées manuelles rattachées au même modèle « possession par plateforme ».
2. **Aucun stockage d'identifiant de session tiers** (NPSSO, cookies) — l'architecture ne doit même pas offrir ce chemin. Seuls des jetons OAuth/OpenID officiels, chiffrés et révocables, sont admis (cas Steam).
3. **Import de fichier générique** prévu comme point d'extension (CSV/JSON) pour absorber les exports officiels futurs et les migrations depuis d'autres apps (Backloggd, Exophase…), sans coder une intégration par plateforme.
4. Le **multi-possession** d'un même jeu (ex. PSN manuel + Steam importé) est déjà au cœur du modèle — la faisabilité confirme que c'est le bon niveau d'abstraction.

## Points non couverts / à revérifier

- Existence d'un free tier OpenXBL et sa pérennité (à vérifier avant tout engagement Xbox).
- Évolutions officielles côté Sony/Nintendo/Epic/GOG (exports RGPD, portails développeurs) — à re-scanner avant la V3.
- Faisabilité d'un import via export **RGPD** que ces plateformes doivent fournir sur demande (piste légale intéressante, format non standardisé — à tester).
