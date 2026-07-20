# Stratégie de déploiement, sauvegarde et exploitation

> Étape 24 du cadrage — rédigé le 2026-07-17. Cible primaire : Proxmox personnel + Cloudflare Tunnel (D3 révisée). Principe : simple, reproductible, réversible.

## Environnements

| Env       | Où                                                                                        | Usage                                                              |
| --------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| dev       | Poste local, Docker Compose                                                               | Développement quotidien (hot reload)                               |
| prod      | VM/LXC Proxmox, Docker Compose + cloudflared                                              | Usage réel via trackly.<domaine>                                   |
| (staging) | Optionnel : 2e stack sur la même VM (compose project distinct) derrière Cloudflare Access | Tester une release avant prod — à activer quand le besoin apparaît |

## Chaîne de livraison (CI/CD)

1. Push sur `main` → GitHub Actions : lint + typecheck + tests + build des images Docker (`api`, `web`) → push sur **GHCR** (registre GitHub, gratuit).
2. Déploiement sur le Proxmox : **pull-based** — un petit script/systemd timer sur la VM (ou Watchtower) tire les nouvelles images taggées `latest`/`vX.Y` et relance `docker compose up -d`. Pas de port SSH exposé à GitHub, pas de secret de prod dans la CI.
3. **Migrations Prisma** exécutées automatiquement au démarrage de l'API (`migrate deploy`), toujours rétrocompatibles d'une version (règle : déployer additif, nettoyer au déploiement suivant).
4. Rollback = re-taguer l'image précédente + `compose up -d` (+ restauration base si migration destructive — d'où la règle n°3).

## Sauvegardes (réponse à RT-10 — c'est le point sérieux de l'auto-hébergement)

- **Base** : `pg_dump` **nocturne**, chiffré (age/gpg), exporté **hors de la machine** (NAS/autre machine, et idéalement une copie cloud gratuite type R2/Backblaze free tier). Rétention : 7 quotidiennes + 4 hebdomadaires + 3 mensuelles.
- **VM** : snapshot/backup Proxmox hebdomadaire (vzdump) vers un stockage distinct du disque de la VM.
- **Restauration testée** : un test de restauration du `pg_dump` dans un Postgres jetable fait partie du job de backup (un backup non testé n'existe pas). Alerte en cas d'échec.
- Uploads utilisateurs (avatars) : inclus dans le backup (volume dédié) — volumes faibles.

## Supervision et exploitation

- **Erreurs** : Sentry (front + API), alerte e-mail sur nouvelle erreur.
- **Disponibilité** : moniteur externe gratuit (UptimeRobot) sur `/health` (sans DB) → e-mail si down ; ici pas pour le keep-alive (inutile en auto-hébergé) mais pour **savoir** quand la maison est down.
- **Logs** : JSON structurés (pino) vers stdout, rotation Docker ; pas de stack ELK (hors échelle).
- **Mises à jour** : Dependabot (deps), unattended-upgrades (OS VM), et revue mensuelle rapide des images de base.
- **Quotas fournisseurs** : compteur d'appels TMDB/IGDB en métrique interne, alerte informative — le cache doit maintenir l'usage très bas.

## PWA : mises à jour côté client

- Service worker en stratégie « app shell précaché + réseau d'abord pour l'API ».
- Nouvelle version détectée → bandeau discret « Mise à jour disponible — recharger » (jamais de reload forcé en pleine saisie).
- Versionnage du cache par hash de build ; purge des vieux caches à l'activation.

## Bascule de secours (documentée, non automatisée)

Si le Proxmox doit s'arrêter durablement : restaurer le dernier `pg_dump` sur Neon, déployer les mêmes images sur Render, pointer le DNS Cloudflare vers Pages/Render. Objectif < 1 h de travail, procédure pas-à-pas à écrire au Lot 0 et à tester une fois.
