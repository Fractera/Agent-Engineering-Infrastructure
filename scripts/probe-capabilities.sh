#!/bin/bash
# probe-capabilities.sh — ДОКАЗАТЕЛЬСТВО того, что платформа умеет то, что обещает.
#
# 🔒 ЗАЧЕМ ЭТОТ ФАЙЛ СУЩЕСТВУЕТ (требование владельца, 2026-08-23). Пять навыков
# описывают работу с базой, медиатекой, векторами, графом знаний и картой. Слово
# «работает» без прогона не стоит ничего: два вердикта уже оказались ложными —
# адрес карты был назван одинарным (он двойной), а регион объявлен незагруженным
# (он загружен; проверялся московский адрес против парижской карты). Выборочная
# проба ошибается в обе стороны.
#
# 🔒 ПОЭТОМУ ПРОВЕРЯЕТСЯ КАЖДАЯ ОПЕРАЦИЯ. Чтение, запись, изменение, удаление —
# по всем слоям. Удаление проверяется на том, что создано этим же прогоном: иначе
# оно либо не проверено, либо разрушительно.
#
# 🔒 НЕГАТИВНЫЕ КОНТРОЛИ ОБЯЗАТЕЛЬНЫ. Проверка, которая не может провалиться, не
# доказывает ничего. Здесь их шесть, и каждый обязан отвечать ИНАЧЕ, чем сосед.
#
# 🔒 СЕКРЕТЫ НЕ ПЕЧАТАЮТСЯ НИКОГДА — только коды ответов и счётчики.
#
# Запуск НА СЕРВЕРЕ:
#   bash /opt/fractera/scripts/probe-capabilities.sh
#   PUBLIC_DATA_HOST=https://data.example.com bash …   (добавит проверку из интернета)
set -u

DATA=http://localhost:3300
ENV_FILE=${SLOT_ENV:-/opt/fractera/app/.env.local}
RAG_ENV=${RAG_ENV:-/opt/fractera/services/rag/.env}
SAMPLE_PNG=${SAMPLE_PNG:-/tmp/probe-sample.png}
PUBLIC_HOST=${PUBLIC_DATA_HOST:-}

KEY=$(grep -E '^DATA_SECRET=' "$ENV_FILE" 2>/dev/null | head -1 | cut -d= -f2- | tr -d '\r')
if [ -z "$KEY" ]; then echo "нет DATA_SECRET в $ENV_FILE — доказывать нечем"; exit 2; fi

OK=0; FAIL=0; BLOCKED=0; TOTAL=0; FAILED_LINES=""

# probe <имя> <ожидание> <аргументы curl…>
#   ожидание: "200" — код; "200:слово" — код и подстрока; "!слово" — подстроки быть НЕ должно
# 🔒 Ожидание бывает АЛЬТЕРНАТИВНЫМ («200|404:нет наборов»), и это не поблажка.
# Пустой склад иконок обязан отвечать 404 с объяснением, полный — 200. Обе
# ветки правильны, и требовать одну значит объявить исправный сервер сломанным.
probe_any() {
  local name="$1" a="$2" b="$3"; shift 3
  local before_fail=$FAIL
  probe "$name" "$a" "$@" >/dev/null 2>&1
  if [ "$FAIL" = "$before_fail" ]; then printf "  ok      %-50s (первая ветка)
" "$name"; return; fi
  FAIL=$before_fail; OK=$((OK-0)); TOTAL=$((TOTAL-1))
  FAILED_LINES=${FAILED_LINES%"$name;"}
  probe "$name" "$b" "$@"
}

probe() {
  local name="$1" expect="$2"; shift 2
  TOTAL=$((TOTAL+1))
  local code out want_code want_sub negative=0
  code=$(curl "$@" -s -o /tmp/probe.out -w "%{http_code}" 2>/dev/null)
  out=$(head -c 500 /tmp/probe.out 2>/dev/null)
  case "$expect" in
    "!"*) negative=1; want_code=""; want_sub=${expect#!} ;;
    *:*)  want_code=${expect%%:*}; want_sub=${expect#*:} ;;
    *)    want_code=$expect; want_sub="" ;;
  esac
  local good=1
  if [ -n "$want_code" ] && [ "$code" != "$want_code" ]; then good=0; fi
  if [ -n "$want_sub" ]; then
    if [ "$negative" = "1" ]; then
      case "$out" in *"$want_sub"*) good=0 ;; esac
    else
      case "$out" in *"$want_sub"*) : ;; *) good=0 ;; esac
    fi
  fi
  if [ "$good" = "1" ]; then
    OK=$((OK+1)); printf "  ok      %-50s %s\n" "$name" "$code"
  else
    FAIL=$((FAIL+1))
    printf "  ПРОВАЛ  %-50s код=%s ждали=%s | %s\n" "$name" "$code" "$expect" "$(printf '%s' "$out" | head -c 110)"
    FAILED_LINES="$FAILED_LINES $name;"
  fi
}

blocked() { TOTAL=$((TOTAL+1)); BLOCKED=$((BLOCKED+1)); printf "  БЛОК    %-50s %s\n" "$1" "$2"; }

AUTH=(-H "x-data-secret: $KEY")
JSON=(-H "Content-Type: application/json")

echo "==================== МАТРИЦА ВОЗМОЖНОСТЕЙ ===================="
echo
echo "-- use-data: дверь -------------------------------------------"
probe "health без учётки"                  200            "$DATA/health"
probe "capabilities секретом"              200:routes     "${AUTH[@]}" "$DATA/capabilities"
probe "НЕГАТИВНЫЙ: без секрета 401"        401            "$DATA/capabilities"
probe "прокси rag"                         200            "${AUTH[@]}" "$DATA/service/rag/health"
probe "прокси geo"                         200:state      "${AUTH[@]}" "$DATA/service/geo/geo/provision-status"
probe "прокси channels"                    200:telegram   "${AUTH[@]}" "$DATA/service/channels/status"
probe "НЕГАТИВНЫЙ: неверный секрет 401"    401            -H "x-data-secret: wrong-key-on-purpose" "$DATA/db/tables"
if [ -n "$PUBLIC_HOST" ]; then
  probe "НЕГАТИВНЫЙ: аноним из интернета"  401            "$PUBLIC_HOST/db/tables"
else
  blocked "аноним из интернета"            "не задан PUBLIC_DATA_HOST"
fi

echo
echo "-- use-database ----------------------------------------------"
T="probe_tmp_$$"
probe "список таблиц"                      200:tables     "${AUTH[@]}" "$DATA/db/tables"
probe "чтение таблицы"                     200            "${AUTH[@]}" "$DATA/db/tables/products?limit=2"
probe "поиск по таблице"                   200            "${AUTH[@]}" "$DATA/db/tables/products?search=a&limit=2"
probe "пагинация"                          200            "${AUTH[@]}" "$DATA/db/tables/products?limit=1&offset=1"
probe "НЕГАТИВНЫЙ: password не виден"      '!password'    "${AUTH[@]}" "$DATA/db/tables/users?limit=1"
probe "CREATE TABLE"                       200            "${AUTH[@]}" "${JSON[@]}" -X POST -d "{\"sql\":\"CREATE TABLE IF NOT EXISTS $T (id TEXT PRIMARY KEY, name TEXT, note TEXT)\"}" "$DATA/db/migrate"
probe "ALTER TABLE"                        200            "${AUTH[@]}" "${JSON[@]}" -X POST -d "{\"sql\":\"ALTER TABLE $T ADD COLUMN extra TEXT\"}" "$DATA/db/migrate"
probe "создать строку (строчный API)"      200            "${AUTH[@]}" "${JSON[@]}" -X POST -d '{"id":"r1","name":"first"}' "$DATA/db/tables/$T"
probe "изменить строку (строчный API)"     200            "${AUTH[@]}" "${JSON[@]}" -X PATCH -d '{"note":"changed"}' "$DATA/db/tables/$T/rows/r1"
probe "изменение читается"                 200:changed    "${AUTH[@]}" "$DATA/db/tables/$T?limit=5"
probe "INSERT через migrate"               200            "${AUTH[@]}" "${JSON[@]}" -X POST -d "{\"sql\":\"INSERT INTO $T (id,name) VALUES (?,?)\",\"params\":[\"r2\",\"secondrow\"]}" "$DATA/db/migrate"
probe "SELECT с параметрами"               200:secondrow  "${AUTH[@]}" "${JSON[@]}" -X POST -d "{\"sql\":\"SELECT name FROM $T WHERE id = ?\",\"params\":[\"r2\"]}" "$DATA/db/migrate"
probe "UPDATE через migrate"               200            "${AUTH[@]}" "${JSON[@]}" -X POST -d "{\"sql\":\"UPDATE $T SET note = ? WHERE id = ?\",\"params\":[\"upd\",\"r2\"]}" "$DATA/db/migrate"
probe "УДАЛЕНИЕ строки (только migrate)"   200            "${AUTH[@]}" "${JSON[@]}" -X POST -d "{\"sql\":\"DELETE FROM $T WHERE id = ?\",\"params\":[\"r2\"]}" "$DATA/db/migrate"
probe "строки не осталось"                 '!secondrow'   "${AUTH[@]}" "$DATA/db/tables/$T?limit=5"
probe "DROP TABLE"                         200            "${AUTH[@]}" -X DELETE "$DATA/db/tables/$T"
probe "таблицы не осталось"                "!$T"          "${AUTH[@]}" "$DATA/db/tables"

echo
echo "-- use-object-storage ----------------------------------------"
# 🔒 Образец ПОРОЖДАЕТСЯ здесь же, а не ищется в проекте: путь к чужому файлу
# — это зависимость от чужого дерева, и она уже подвела (файла не оказалось,
# загрузка ушла без тела, а проба сказала «не работает»).
printf '%s' 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==' | base64 -d > "$SAMPLE_PNG"

probe "список медиа"                       200            "${AUTH[@]}" "$DATA/media"
MID=""
if [ -f "$SAMPLE_PNG" ]; then
  MID=$(curl -s "${AUTH[@]}" -F "file=@$SAMPLE_PNG" "$DATA/media/upload" | node -e "let s='';process.stdin.on('data',function(d){s+=d}).on('end',function(){try{var j=JSON.parse(s);console.log(j.id||(j.media&&j.media.id)||'')}catch(e){console.log('')}})")
fi
TOTAL=$((TOTAL+1))
if [ -n "$MID" ]; then
  OK=$((OK+1)); printf "  ok      %-50s id получен\n" "загрузка файла"
  probe "чтение файла"                     200            "${AUTH[@]}" "$DATA/media/$MID/file"
  probe "превью thumb"                     200            "${AUTH[@]}" "$DATA/media/$MID/thumb"
  probe "правка метаданных PATCH"          200            "${AUTH[@]}" "${JSON[@]}" -X PATCH -d '{"title":"probetitle","description":"tmp"}' "$DATA/media/$MID"
  probe "метаданные записались"            200:probetitle "${AUTH[@]}" "$DATA/media"
  probe "НЕГАТИВНЫЙ: trim не для картинки" 400            "${AUTH[@]}" "${JSON[@]}" -X POST -d '{"start":0,"end":1}' "$DATA/media/$MID/trim"
  probe "удаление файла"                   200            "${AUTH[@]}" -X DELETE "$DATA/media/$MID"
  probe "файла не осталось"                404            "${AUTH[@]}" "$DATA/media/$MID/file"
else
  FAIL=$((FAIL+1)); printf "  ПРОВАЛ  %-50s id не получен\n" "загрузка файла"
  FAILED_LINES="$FAILED_LINES загрузка файла;"
  blocked "чтение/превью/правка/подрезка/удаление" "загрузка не удалась"
fi
probe "иконки: список"                     200            "${AUTH[@]}" "$DATA/media/icons"
probe_any "иконки: текущий набор" 200 "404:No icon sets"   "${AUTH[@]}" "$DATA/media/icons/current"
blocked "файл иконки" "наборов нет; генерация оставила бы на сервере значок сайта — разрушительно для чужого продукта"

echo
echo "-- use-vector-memory -----------------------------------------"
VEC=$(node -e "console.log(JSON.stringify(Array.from({length:1536},function(_,i){return i===0?1:0})))")
VEC2=$(node -e "console.log(JSON.stringify(Array.from({length:1536},function(_,i){return i===1?1:0})))")
probe "статус склада"                      200:dims       "${AUTH[@]}" "$DATA/vectors/status"
probe "запись со своим вектором"           200            "${AUTH[@]}" "${JSON[@]}" -X POST -d "{\"id\":\"probe-v1\",\"collection\":\"probe\",\"text\":\"probe record one\",\"embedding\":$VEC}" "$DATA/vectors"
probe "вторая запись"                      200            "${AUTH[@]}" "${JSON[@]}" -X POST -d "{\"id\":\"probe-v2\",\"collection\":\"probe\",\"text\":\"probe record two\",\"embedding\":$VEC2}" "$DATA/vectors"
probe "поиск по вектору"                   200:probe      "${AUTH[@]}" "${JSON[@]}" -X POST -d "{\"embedding\":$VEC,\"k\":2}" "$DATA/vectors/search"
probe "поиск с фильтром коллекции"         200:probe      "${AUTH[@]}" "${JSON[@]}" -X POST -d "{\"collection\":\"probe\",\"embedding\":$VEC,\"k\":2}" "$DATA/vectors/search"
probe "НЕГАТИВНЫЙ: чужая коллекция пуста"  '!probe-v1'    "${AUTH[@]}" "${JSON[@]}" -X POST -d "{\"collection\":\"no-such-collection\",\"embedding\":$VEC,\"k\":2}" "$DATA/vectors/search"
probe "НЕГАТИВНЫЙ: без вектора и без ключа" 500           "${AUTH[@]}" "${JSON[@]}" -X POST -d '{"collection":"probe","text":"no embedding given"}' "$DATA/vectors"
probe "удаление первой записи"             200            "${AUTH[@]}" -X DELETE "$DATA/vectors/probe-v1"
probe "удаление второй записи"             200            "${AUTH[@]}" -X DELETE "$DATA/vectors/probe-v2"
probe "записей не осталось"                '!probe-v1'    "${AUTH[@]}" "${JSON[@]}" -X POST -d "{\"embedding\":$VEC,\"k\":5}" "$DATA/vectors/search"

echo
echo "-- use-agentic-rag -------------------------------------------"
RAG_KEYED=$(grep -cE "^LLM_BINDING_API_KEY=.+" "$RAG_ENV" 2>/dev/null || true)
probe "здоровье графа"                     200            "${AUTH[@]}" "$DATA/service/rag/health"
probe "список документов"                  200            "${AUTH[@]}" "${JSON[@]}" -X POST -d '{"page":1,"page_size":10}' "$DATA/service/rag/documents/paginated"
probe "статус конвейера"                   200            "${AUTH[@]}" "$DATA/service/rag/documents/pipeline_status"
probe "запрос к базе"                      200            "${AUTH[@]}" "${JSON[@]}" -X POST -d '{"query":"probe","mode":"naive"}' "$DATA/service/rag/query"
if [ "${RAG_KEYED:-0}" != "0" ]; then
  probe "загрузка текста"                  200            "${AUTH[@]}" "${JSON[@]}" -X POST -d '{"text":"Fractera probe document. The courier visits Paris every morning.","file_source":"probe-doc.txt"}' "$DATA/service/rag/documents/text"
  sleep 20
  probe "запрос после загрузки"            200:courier    "${AUTH[@]}" "${JSON[@]}" -X POST -d '{"query":"what does the courier do","mode":"hybrid"}' "$DATA/service/rag/query"
  probe "удаление документа"               200            "${AUTH[@]}" "${JSON[@]}" -X DELETE -d '{"doc_ids":["probe-doc.txt"]}' "$DATA/service/rag/documents/delete_document"
else
  blocked "загрузка текста"                "LLM_BINDING_API_KEY пуст: извлечение сущностей невозможно"
  blocked "запрос после загрузки"          "то же — отвечать нечем"
  blocked "удаление документа"             "нечего удалять, пока нельзя загрузить"
fi

echo
echo "-- use-map ---------------------------------------------------"
G="$DATA/service/geo/geo"
REGION=$(curl -s "${AUTH[@]}" "$G/config" | node -e "let s='';process.stdin.on('data',function(d){s+=d}).on('end',function(){try{console.log(JSON.parse(s).region||'')}catch(e){console.log('')}})")
echo "  (настроенный регион: ${REGION:-нет})"
probe "состояние подготовки"               200:state      "${AUTH[@]}" "$G/provision-status"
probe "настройки карты"                    200:region     "${AUTH[@]}" "$G/config"
probe "геокодинг адреса региона"           200:lat        "${AUTH[@]}" "${JSON[@]}" -X POST -d '{"q":"Tour Eiffel, Paris"}' "$G/geocode"
probe "НЕГАТИВНЫЙ: адрес вне региона"      404            "${AUTH[@]}" "${JSON[@]}" -X POST -d '{"q":"Tverskaya 7, Moscow"}' "$G/geocode"
probe "маршрут в заданном порядке"         200:geometry   "${AUTH[@]}" "${JSON[@]}" -X POST -d '{"coords":[{"lat":48.8584,"lon":2.2945},{"lat":48.8606,"lon":2.3376}]}' "$G/route"
probe "матрица расстояний"                 200:distances  "${AUTH[@]}" "${JSON[@]}" -X POST -d '{"coords":[{"lat":48.8584,"lon":2.2945},{"lat":48.8606,"lon":2.3376}]}' "$G/matrix"
probe "порядок объезда"                    200:order      "${AUTH[@]}" "${JSON[@]}" -X POST -d '{"coords":[{"lat":48.8584,"lon":2.2945},{"lat":48.8738,"lon":2.2950},{"lat":48.8606,"lon":2.3376}]}' "$G/optimize"
probe "НЕГАТИВНЫЙ: одна точка отвергнута"  400            "${AUTH[@]}" "${JSON[@]}" -X POST -d '{"coords":[{"lat":48.8584,"lon":2.2945}]}' "$G/optimize"
probe "НЕГАТИВНЫЙ: одинарный адрес не работает" '!"lat"'  "${AUTH[@]}" "${JSON[@]}" -X POST -d '{"q":"Tour Eiffel, Paris"}' "$DATA/service/geo/geocode"

echo
echo "-- use-channels ----------------------------------------------"
probe "состояние каналов"                  200:configured "${AUTH[@]}" "$DATA/service/channels/status"
probe "НЕГАТИВНЫЙ: связка без токена"      422            "${AUTH[@]}" "${JSON[@]}" -X POST -d '{}' "$DATA/service/channels/telegram/link/start"

echo
echo "-- настройки панели и журнал развёртываний -------------------"
PKEY="probe-$$"
probe "запись настройки панели"            200            "${AUTH[@]}" "${JSON[@]}" -X PUT -d '{"value":{"probe":true}}' "$DATA/panel-settings/$PKEY"
probe "чтение настройки панели"            200:probe      "${AUTH[@]}" "$DATA/panel-settings/$PKEY"
probe "журнал развёртываний"               200            "${AUTH[@]}" "$DATA/deploy-runs"

rm -f /tmp/probe.out 2>/dev/null

echo
echo "=============================================================="
printf "  доказано: %s | провалов: %s | заблокировано: %s | всего: %s\n" "$OK" "$FAIL" "$BLOCKED" "$TOTAL"
if [ "$FAIL" != "0" ]; then
  printf "  ПРОВАЛИЛИСЬ: %s\n" "$FAILED_LINES"
  echo "===CAPABILITIES_FAILED==="
  exit 1
fi
echo "===CAPABILITIES_PROVEN=== $OK/$TOTAL (заблокировано отсутствием ключа: $BLOCKED)"
