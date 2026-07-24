# Déploiement sur le Proxmox — pas à pas

> Cible : une VM (ou LXC) Debian/Ubuntu sur ton Proxmox, exposée uniquement via Cloudflare Tunnel (zéro port ouvert sur la box). Réf. : docs/cadrage/04 et 16.

## 1. Créer la VM/LXC

- Debian 12 ou Ubuntu Server 24.04, 2 vCPU / 2-4 GB RAM / 20 GB disque suffisent largement.
- Idéalement sur un VLAN dédié (isolation du reste du LAN).
- `apt update && apt install -y curl git && curl -fsSL https://get.docker.com | sh`
- Mises à jour auto : `apt install -y unattended-upgrades`

## 2. Créer le tunnel Cloudflare (dashboard)

1. https://one.dash.cloudflare.com → Networks → Tunnels → **Create a tunnel** (type Cloudflared).
2. Nommer `trackly`, choisir **Docker** comme environnement → copier le **token** affiché.
3. Onglet _Public Hostname_ : ajouter `trackly.<ton-domaine>` → service **HTTP** → URL `web:80`.

## 3. Déployer

```bash
mkdir -p /opt/trackly && cd /opt/trackly
# copier deploy/compose.prod.yml ici (scp/git)
cat > .env <<'EOF'
GHCR_OWNER=clemsimao   # toujours en minuscules (règle des noms d'images Docker)
TAG=latest
POSTGRES_PASSWORD=<généré : openssl rand -hex 32>
CLOUDFLARE_TUNNEL_TOKEN=<token de l'étape 2>
APP_URL=https://trackly.<ton-domaine>
# Optionnel : RESEND_API_KEY=<clé API Resend>
EOF
chmod 600 .env
docker compose -f compose.prod.yml up -d
docker compose -f compose.prod.yml logs -f api   # attendre "API Trackly démarrée"
```

→ https://trackly.<ton-domaine> doit afficher « Hello Trackly » avec l'API opérationnelle.

Si les images GHCR sont privées : `docker login ghcr.io` avec un PAT `read:packages`.

## 4. Mises à jour (pull-based)

```bash
cat > /opt/trackly/update.sh <<'EOF'
#!/bin/sh
cd /opt/trackly
# Le fichier compose évolue avec le code : le rafraîchir AVANT de tirer les images
# (leçon du Lot 2 : un compose obsolète ne transmet pas les nouvelles variables d'env)
curl -fsSL -o compose.prod.yml https://raw.githubusercontent.com/Clemsimao/Trackly/main/deploy/compose.prod.yml
docker compose -f compose.prod.yml pull --quiet
docker compose -f compose.prod.yml up -d
docker image prune -f
EOF
chmod +x /opt/trackly/update.sh
# Toutes les 30 min : la VM tire les nouvelles images publiées par la CI
crontab -l 2>/dev/null | { cat; echo "*/30 * * * * /opt/trackly/update.sh >> /var/log/trackly-update.log 2>&1"; } | crontab -
```

## 5. Sauvegardes (OBLIGATOIRE avant usage réel — RT-10)

```bash
cat > /opt/trackly/backup-db.sh <<'EOF'
#!/bin/sh
set -e
STAMP=$(date +%Y%m%d-%H%M)
DEST=/opt/trackly/backups
mkdir -p "$DEST"
docker compose -f /opt/trackly/compose.prod.yml exec -T postgres \
  pg_dump -U trackly -d trackly --format=custom > "$DEST/trackly-$STAMP.dump"
# Test de restauration dans un Postgres jetable (un backup non testé n'existe pas)
docker run --rm -v "$DEST":/b postgres:17-alpine sh -c \
  "pg_restore --list /b/trackly-$STAMP.dump > /dev/null" && echo "backup $STAMP OK"
# Rétention 7 jours en local
find "$DEST" -name '*.dump' -mtime +7 -delete
# TODO : copier chiffré HORS de la machine (NAS/rclone/R2) — à brancher selon ton infra
EOF
chmod +x /opt/trackly/backup-db.sh
crontab -l 2>/dev/null | { cat; echo "30 3 * * * /opt/trackly/backup-db.sh >> /var/log/trackly-backup.log 2>&1"; } | crontab -
```

- Sauvegarde Proxmox de la VM (vzdump) hebdomadaire vers un stockage distinct.

## 6. Supervision

- UptimeRobot (gratuit) : moniteur HTTPS sur `https://trackly.<ton-domaine>/api/health` → e-mail si down.
- `docker compose logs` pour les logs JSON structurés.
