#!/bin/sh
set -eu
umask 077

exec 9>/run/lock/aliva-rsvp-backup.lock
flock -n 9 || exit 0
backup_dir=/opt/apps/rsvp/backups
stamp=$(date -u +%Y%m%dT%H%M%SZ)
mkdir -p "$backup_dir"
chmod 700 "$backup_dir"
container=$(docker compose --env-file /opt/apps/aliva/release.env -p aliva \
  -f /opt/apps/aliva/compose.yaml -f /opt/apps/aliva/compose.production.yaml ps -q api)
test -n "$container"
backup_image=$(docker inspect --format '{{.Image}}' "$container")
docker run --rm --network none --read-only --cap-drop ALL --security-opt no-new-privileges \
  --mount type=bind,src=/opt/apps/rsvp/data,dst=/data \
  --mount type=bind,src="$backup_dir",dst=/backup \
  "$backup_image" node --experimental-sqlite backup.cjs /data/rsvp.sqlite "/backup/rsvp-$stamp.sqlite"

# Keep all snapshots for now; review capacity monthly before deleting any.
find "$backup_dir" -maxdepth 1 -type f -name 'rsvp-*.sqlite' -printf '%f %s bytes\n'

