# Stratégie de sécurité

> Étape 23 du cadrage — rédigé le 2026-07-17. Aligné OWASP ASVS niveau adapté à un projet perso multi-utilisateur, et RGPD dès la V1. Contexte : front statique + API NestJS + Postgres, auto-hébergé derrière Cloudflare Tunnel.

## Authentification et sessions

- **Mots de passe** : Argon2id (paramètres mémoire/temps recommandés OWASP), ≥ 12 caractères, indicateur de robustesse, vérification optionnelle contre les mots de passe compromis (liste locale ou k-anonymity HIBP).
- **Sessions** : cookie **httpOnly + Secure + SameSite=Lax**, identifiant opaque référencé en base (table sessions) → révocation immédiate possible (déconnexion, reset mdp, suppression de compte). Expiration glissante (ex. 30 j) + absolue (ex. 90 j).
- **Anti-brute force** : rate limiting par IP et par compte sur /login, /register, /reset (fenêtres progressives) ; réponses en temps constant ; messages identiques (anti-énumération d'e-mails).
- **Reset mdp** : jeton aléatoire à usage unique, haché en base, TTL ≤ 1 h ; toutes les sessions révoquées après reset.

## Protection de l'API

- **Validation stricte en entrée** : schémas Zod du paquet contracts appliqués côté API (source de vérité), types stricts, listes blanches ; jamais de validation « front uniquement ».
- **Injections** : requêtes paramétrées via Prisma (pas de SQL brut sans justification revue).
- **XSS** : React échappe par défaut ; interdiction de `dangerouslySetInnerHTML` (règle ESLint) ; **CSP** stricte (self + domaines d'images TMDB/IGDB), `X-Content-Type-Options`, `Referrer-Policy`, `frame-ancestors 'none'`.
- **CSRF** : SameSite=Lax couvre l'essentiel ; en complément, en-tête custom exigé sur les mutations (pattern double-submit léger) — suffisant pour une API JSON same-site.
- **CORS** : liste blanche stricte (uniquement l'origine du front).
- **Autorisation** : chaque requête scoping par `user_id` de session au niveau repository (jamais confiance à un id client) ; tests systématiques A-ne-voit-pas-B (cf. stratégie de tests).
- **Rate limiting global** par utilisateur/IP sur l'API (protège aussi nos quotas fournisseurs).

## Secrets et données

- Secrets (clés TMDB/IGDB, SMTP, chiffrement) **uniquement côté serveur**, injectés par variables d'environnement (fichier `.env` hors git + `.env.example` documenté) ; rotation documentée ; rien dans le bundle front.
- **Jetons OAuth externes (Steam V3)** : chiffrés au repos (AES-256-GCM, clé dédiée), révocables, purge à la déconnexion de la plateforme.
- **Minimisation** : on ne stocke que le nécessaire (exigence du cahier des charges pour les comptes externes).
- Journal des événements de sécurité : connexions, échecs répétés, resets, exports, suppressions — sans données sensibles dans les logs.

## RGPD (V1)

- Base légale : exécution du service ; pas de tracking tiers, pas de pub (cf. anti-scope).
- Droits outillés : **export JSON complet** (A4) et **suppression totale** avec délai de grâce (A5) ; purge en cascade vérifiée par test.
- Politique de confidentialité claire (exigée aussi par les CGU Steam pour la V3).
- Données hébergées chez l'utilisateur (Proxmox, France) — point favorable ; le repli cloud (Render Francfort / Neon UE) reste en UE, à vérifier au moment d'une bascule.

## Sécurité de l'hébergement (auto-hébergé — RT-10)

- **Aucun port entrant** : exposition uniquement via Cloudflare Tunnel (cloudflared sortant) ; Postgres jamais routé par le tunnel, accessible seulement sur le réseau Docker interne.
- VM/LXC dédiée et à jour (unattended-upgrades), SSH par clé uniquement, utilisateur non-root pour les conteneurs.
- **Cloudflare Access (gratuit) devant tout endpoint d'administration** et le staging éventuel.
- WAF/anti-DDoS de base fournis par Cloudflare ; en-têtes de vraie IP client (CF-Connecting-IP) pour un rate limiting correct.
- Sauvegardes chiffrées exportées hors machine (voir stratégie de déploiement).

## Ce qu'on ne fait pas (proportionnalité)

- Pas de 2FA en V1 (candidate V2 — TOTP simple) ; pas de WebAuthn au départ.
- Pas d'audit externe/bug bounty (hors échelle) ; en revanche `npm audit`/Dependabot actifs et revue des avis de sécurité des dépendances clés.
