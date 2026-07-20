# Hébergement et coûts — objectif 0 €/mois (décision D3)

> Décision D3 — révisée le 2026-07-17 après découverte d'un **serveur Proxmox allumé 24/7** côté utilisateur, en plus du domaine Cloudflare déjà possédé. Faits vérifiés en ligne le 2026-07-17. Contrainte inchangée : **0 € de coût récurrent**.

## Recommandation : auto-hébergement sur Proxmox + Cloudflare Tunnel (nouveau primaire)

Disposer d'un Proxmox 24/7 change l'arbitrage : c'est **supérieur au cloud gratuit** sur presque tous les axes, pour le même coût (0 € marginal, l'électricité étant déjà engagée). Le cloud gratuit passe en **plan de repli documenté**.

### Cible de déploiement

- **Dev** (inchangé) : Docker Compose en local.
- **Prod perso** : une **VM (ou LXC) sur Proxmox** exécutant **Docker Compose** : `postgres` + `api` (NestJS) + `web` (front statique servi par un nginx) + `cloudflared` (le tunnel).
- **Exposition** : **Cloudflare Tunnel** route `trackly.<ton-domaine>` vers le service web/api local. **Aucun port ouvert** sur ta box, **IP maison masquée**, SSL et DDoS gérés par Cloudflare. La base Postgres **n'est jamais exposée** au tunnel (accessible uniquement sur le réseau Docker interne).

```
Internet → Cloudflare (edge, SSL, WAF, DDoS)
             │  (connexion sortante chiffrée, initiée par cloudflared)
             ▼
   Proxmox VM/LXC ── Docker Compose
     ├─ cloudflared      (tunnel, sortant only)
     ├─ web (nginx)      → sert la SPA/PWA statique
     ├─ api (NestJS)     → logique métier
     └─ postgres         → NON exposé (réseau interne uniquement)
```

### Avantages vs cloud gratuit

| Axe                  | Proxmox auto-hébergé                                 | Cloud gratuit (Render+Neon)       |
| -------------------- | ---------------------------------------------------- | --------------------------------- |
| Réveil à froid       | **Aucun** (toujours chaud)                           | 30–60 s après 15 min d'inactivité |
| Quotas base          | **Aucun** (disque/RAM de la machine)                 | 100 CU-h/mois, 0,5 GB             |
| Puissance            | CPU/RAM réels de la machine                          | Bridée                            |
| Sauvegardes          | **Snapshots Proxmox + `pg_dump`, sous ton contrôle** | Limitées en gratuit               |
| Souveraineté données | **Chez toi** (bon pour RGPD/perso)                   | Serveurs tiers (US/EU)            |
| Staging              | Facile (2e VM/LXC ou 2e stack)                       | Coûteux en gratuit                |
| Coût                 | 0 € marginal                                         | 0 €                               |

### Inconvénients et risques (à assumer en connaissance de cause)

| Risque                                                                                    | Parade                                                                                                                                                                                                                   |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Disponibilité = ta box + ton courant** (coupure ISP/électricité → app down, pas de SLA) | Acceptable pour un usage perso ; onduleur optionnel ; le cloud reste le repli si un jour il faut du 99,9 %.                                                                                                              |
| **Sauvegardes = ta responsabilité**                                                       | Snapshot Proxmox planifié **+** `pg_dump` chiffré nocturne exporté ailleurs (NAS ou stockage cloud gratuit). À mettre en place dès le déploiement (stratégie en phase D).                                                |
| **Service exposé depuis ton LAN** (surface d'attaque)                                     | Cloudflare Tunnel (zéro port ouvert) ; **VM/LXC isolée** (idéalement VLAN dédié, accès LAN restreint) ; **Cloudflare Access** (gratuit) devant les endpoints d'admin/staging ; mises à jour auto, SSH par clé, fail2ban. |
| **Panne matérielle = downtime** jusqu'à réparation                                        | Snapshots pour restaurer vite ; image Docker identique redéployable sur cloud/VPS en dépannage.                                                                                                                          |

### Pourquoi c'est sûr malgré l'auto-hébergement

- **cloudflared est sortant uniquement** : ta box n'accepte aucune connexion entrante, ton IP publique n'est jamais révélée. C'est la méthode recommandée pour exposer un service maison. Sources : [doc/tuto Cloudflare Tunnel](https://rdp.sh/en/blog/expose-a-self-hosted-app-with-cloudflare-tunnel-no-open-ports), [nouveaux ToS Cloudflare](https://blog.cloudflare.com/updated-tos/).
- **Conforme aux CGU Cloudflare** : la restriction ne vise que le streaming vidéo / gros fichiers tiers. Trackly = JSON + HTML + petites images → usage autorisé sur le plan gratuit.
- **Postgres non exposé** : seul le hostname web/api est routé par le tunnel ; la base reste sur le réseau Docker privé.

## Plan de repli (documenté, sans refactor) — le cloud gratuit

Si un jour l'auto-hébergement ne suffit plus (besoin de haute dispo, ouverture à de vrais utilisateurs externes, absence prolongée), **la même image Docker et le même Postgres** se redéploient sur :

| Composant           | Service de repli          | Plan                       | Bascule                |
| ------------------- | ------------------------- | -------------------------- | ---------------------- |
| Front statique      | Cloudflare Pages          | Gratuit                    | Build identique        |
| API NestJS          | Render (Francfort)        | Gratuit (réveil à froid)   | Même conteneur         |
| PostgreSQL          | Neon                      | Gratuit (100 CU-h, 0,5 GB) | Restaurer un `pg_dump` |
| Alternative confort | VPS Hetzner/OVH + Coolify | 6–12 €/mois                | Même image             |

C'est **exactement** l'intérêt d'avoir refusé le lock-in BaaS (option D en phase A) : le déploiement est portable partout.

## Réponse à « on déploie sur Firebase ? » (maintenue)

Firebase reste écarté : pas de Postgres gratuit chez Google, backend NestJS+jobs inadapté à Cloud Functions, et « Firebase à fond » = l'option BaaS/lock-in déjà refusée. Avec un Proxmox maison, l'auto-hébergement est de toute façon strictement meilleur et gratuit.

## Règle de conception conservée

L'endpoint de santé `/health` ne fait **aucune requête base**. Utile surtout pour le repli cloud (préserver le quota Neon) ; sans effet négatif en auto-hébergé.

## Impact sur le registre des risques

- **RT-1 (réveil à froid)** : **disparaît** en configuration primaire (serveur toujours chaud). Ne subsiste que sur le repli cloud.
- **RT-2 (quota Neon)** : **disparaît** en primaire (plus de quota). Ne concerne que le repli.
- **Nouveau RT-10** : dépendance à la disponibilité domestique (courant/ISP) et responsabilité des sauvegardes → parades ci-dessus, à formaliser dans la stratégie de déploiement/sauvegarde (phase D).

## Sources (consultées le 2026-07-17)

- Cloudflare Tunnel gratuit, sans port ouvert : [guide](https://rdp.sh/en/blog/expose-a-self-hosted-app-with-cloudflare-tunnel-no-open-ports), [tuto](https://panelica.com/blog/cloudflare-tunnel-setup-expose-self-hosted-apps-without-port-forwarding)
- Évolution des ToS Cloudflare (ex-2.8, restriction vidéo/CDN) : [blog Cloudflare](https://blog.cloudflare.com/updated-tos/)
- Repli : [Neon pricing](https://neon.com/pricing), [Render free tiers 2026](https://render.com/articles/platforms-with-a-real-free-tier-for-developers-in-2026), [Cloudflare Pages limits](https://developers.cloudflare.com/pages/platform/limits/)
