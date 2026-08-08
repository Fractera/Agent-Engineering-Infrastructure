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

# osmium нужен и для склейки нескольких карт, и для вычисления центра региона из заголовка PBF — ставим всегда.
command -v osmium >/dev/null 2>&1 || { apt-get update -y >/dev/null 2>&1; apt-get install -y osmium-tool >/dev/null 2>&1; }

if [ "${#FILES[@]}" -gt 1 ]; then
  write_status "processing" "merge"
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

# Центр и рамка активного региона из заголовка PBF — чтобы карта в продукте центрировалась на него, а не на
# фиксированный Париж. header.boxes[0] = [minlon,minlat,maxlon,maxlat]. ВАЖНО: переменные CONFIG/REGION/BBOX
# передаём как ОКРУЖЕНИЕ (префикс перед node), а не как argv — прежняя версия писала их в argv, поэтому
# process.env был пуст и geo-config.json не создавался вовсе.
BBOX=$(osmium fileinfo -j "$PBF" 2>/dev/null | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const b=JSON.parse(s).header.boxes[0];process.stdout.write(JSON.stringify(b))}catch{process.stdout.write("null")}})' 2>/dev/null)
CFG="$CONFIG" REG="$REGION" BBOX="$BBOX" node -e '
const fs=require("fs");
const p=process.env.CFG;
let c={}; try{c=JSON.parse(fs.readFileSync(p,"utf8"))}catch{}
c.region=process.env.REG;
try{
  const b=JSON.parse(process.env.BBOX);            // [minlon,minlat,maxlon,maxlat]
  if(Array.isArray(b)&&b.length===4){
    c.bbox=[b[1],b[0],b[3],b[2]];                  // [minLat,minLon,maxLat,maxLon]
    c.center=[(b[1]+b[3])/2,(b[0]+b[2])/2];        // [lat,lon]
  }
}catch{}
fs.writeFileSync(p,JSON.stringify(c,null,2));
' 2>/dev/null || true

# УБОРКА (шаг 501, 2026-08-08). Прежде скрипт не удалял ничего, и папка росла с
# каждым регионом: замер на живом сервере — 1,2 ГБ, из которых 210 МБ занимал
# отработавший `canary-islands`, а 57 МБ — временный файл склейки `src_0.osm.pbf`.
# Движок держит РОВНО ОДИН регион (он запущен одной командой на один `.osrm`),
# поэтому файлы прежних выгрузок не запасной вариант, а мусор: вернуть регион
# нажатием нельзя, его всё равно готовят заново.
#
# Убираем ПОСЛЕДНИМ шагом и только дойдя до него: до этой строки любой `fail`
# завершает скрипт, значит удалять предыдущий регион, пока новый не заработал,
# невозможно. Никогда не «почистим сначала, потом скачаем» — упавшая загрузка
# оставила бы сервер вообще без карты.
#
# Удаляется всё, что НЕ начинается с имени текущего региона, плюс временные
# `src_*.osm.pbf` (они уже склеены в `$PBF`).
write_status "processing" "cleanup"
find "$OSRM_DIR" -maxdepth 1 -type f \
  ! -name "$REGION.*" \
  \( -name '*.osm.pbf' -o -name '*.osrm' -o -name '*.osrm.*' \) \
  -delete 2>/dev/null || true
rm -f "$OSRM_DIR"/src_*.osm.pbf 2>/dev/null || true

write_status "ready" "done"
