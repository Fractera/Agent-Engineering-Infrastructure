#!/bin/bash
# provision-region.sh — скачать и подготовить карту РЕГИОНА(ОВ) для fractera-geo (тяжёлая операция).
# Запускается фоном из server.js (дверь /geo/provision). Пишет прогресс в geo-provision-status.json,
# чтобы страница настроек показывала «идёт загрузка / готово / ошибка».
# Аргументы: <region-id> <pbf-url> [<pbf-url> ...]. Несколько url'ов (отмеченные чекбоксы) склеиваются
# в один датасет через `osmium merge` — так маршруты и адреса работают через границу между регионами.
#
# Те же шаги, что в bootstrap.sh (OSRM extract/partition/customize + Nominatim import), но по ЛОКАЛЬНОМУ
# файлу карты (единый источник для обоих движков).
set -u
REGION="$1"; shift
URLS=("$@")
STATUS="${GEO_STATUS_PATH:-/opt/fractera/services/geo/geo-provision-status.json}"
CONFIG="${GEO_CONFIG_PATH:-/opt/fractera/services/geo/geo-config.json}"
OSRM_DIR=/opt/fractera-geo/osrm
PBF="$REGION.osm.pbf"
OSRM="$REGION.osrm"

write_status() { printf '{"region":"%s","state":"%s","step":"%s","at":"%s"}\n' "$REGION" "$1" "$2" "$(date -u +%FT%TZ)" > "$STATUS"; }
fail() { write_status "error" "$1"; exit 1; }

mkdir -p "$OSRM_DIR" && cd "$OSRM_DIR" || fail "workdir"

write_status "downloading" "download"
FILES=()
i=0
for u in "${URLS[@]}"; do
  f="src_${i}.osm.pbf"
  curl -fsSL -o "$f" "$u" || fail "download"
  FILES+=("$f"); i=$((i+1))
done

if [ "${#FILES[@]}" -gt 1 ]; then
  write_status "processing" "merge"
  command -v osmium >/dev/null 2>&1 || { apt-get update -y >/dev/null 2>&1; apt-get install -y osmium-tool >/dev/null 2>&1; }
  osmium merge "${FILES[@]}" -o "$PBF" --overwrite || fail "osmium-merge"
else
  cp -f "${FILES[0]}" "$PBF" || fail "copy"
fi

write_status "processing" "osrm-extract"
docker run --rm -v "$OSRM_DIR":/data osrm/osrm-backend osrm-extract   -p /opt/car.lua "/data/$PBF"  || fail "osrm-extract"
write_status "processing" "osrm-partition"
docker run --rm -v "$OSRM_DIR":/data osrm/osrm-backend osrm-partition "/data/$OSRM"                 || fail "osrm-partition"
write_status "processing" "osrm-customize"
docker run --rm -v "$OSRM_DIR":/data osrm/osrm-backend osrm-customize "/data/$OSRM"                 || fail "osrm-customize"

write_status "processing" "osrm-restart"
docker rm -f fractera-osrm >/dev/null 2>&1
docker run -d --name fractera-osrm --restart unless-stopped -p 127.0.0.1:5000:5000 -v "$OSRM_DIR":/data osrm/osrm-backend osrm-routed --algorithm mld "/data/$OSRM" || fail "osrm-run"

write_status "processing" "nominatim-import"
docker rm -f fractera-nominatim >/dev/null 2>&1
# Импорт по ЛОКАЛЬНОМУ файлу (PBF_PATH), а не по url — источник тот же, что у OSRM (в т.ч. склейка).
docker run -d --name fractera-nominatim --restart unless-stopped \
  -e PBF_PATH="/nominatim-data/$PBF" -e IMPORT_STYLE=address -e NOMINATIM_PASSWORD=fractera_geo_pw \
  -v "$OSRM_DIR":/nominatim-data \
  -p 127.0.0.1:8080:8080 mediagis/nominatim:4.4 || fail "nominatim-run"

node -e 'const fs=require("fs");const p=process.env.CFG;let c={};try{c=JSON.parse(fs.readFileSync(p))}catch{}; c.region=process.env.REG; fs.writeFileSync(p,JSON.stringify(c,null,2))' CFG="$CONFIG" REG="$REGION" 2>/dev/null || true

write_status "ready" "done"
