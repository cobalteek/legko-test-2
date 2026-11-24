# Adrobot

Обёртка над Keitaro с интерфейсом на Vue 3, backend на FastAPI и локальным хранилищем метаданных на SQLAlchemy.

Браузер обращается только к собственному backend API. Ключ Keitaro хранится на сервере в `backend/.env` и не попадает во frontend bundle.

## Возможности

- загрузка кампаний, потоков, офферов, групп, доменов и источников из Keitaro;
- кнопка полной повторной загрузки данных из Keitaro — «Загрузить из KT»;
- создание кампании с двумя потоками: GEO-поток с редиректом на Google и поток с выбранным оффером;
- добавление, удаление, восстановление и изменение долей офферов;
- сохранение изменений потоков через Keitaro Admin API;
- предупреждение об отсутствии активных офферов только когда их нет во всех потоках кампании;
- SQLAlchemy и Alembic для локальных метаданных и истории офферов, которые нужны wrapper для восстановления;
- без mock-данных и без `localStorage`.

## Структура

- `src/` — Vue-интерфейс и работа с собственным API;
- `backend/app/` — FastAPI, схемы, SQLAlchemy-модели и интеграция с Keitaro;
- `backend/alembic/` — миграции базы данных;
- `.env.example` — настройки frontend;
- `backend/.env.example` — настройки backend и Keitaro.

## Настройка

Установить зависимости frontend:

```bash
npm install
```

Создать виртуальное окружение и установить зависимости backend:

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
```

Создать настройки backend:

```bash
cp backend/.env.example backend/.env
```

В `backend/.env` указать настоящий ключ API:

```env
KEITARO_API_URL=https://keitaro-for-tests.etolegko.com/admin_api/v1
KEITARO_API_KEY=your-api-key
DATABASE_URL=sqlite:///./backend/data/adrobot.sqlite3
FRONTEND_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

Ключ Keitaro должен находиться только в `backend/.env`.

Применить миграции:

```bash
.venv/bin/alembic -c backend/alembic.ini upgrade head
```

## Запуск

Backend запускается в первом терминале:

```bash
.venv/bin/uvicorn backend.app.main:app --reload --port 8000
```

Frontend запускается во втором терминале:

```bash
npm run dev
```

Открыть [http://127.0.0.1:5173](http://127.0.0.1:5173).

Vite проксирует запросы `/api` на `http://127.0.0.1:8000`. Другой адрес backend можно указать через `VITE_API_URL` в корневом `.env`.

## Как работает интеграция

При начальной загрузке и по кнопке «Загрузить из KT» frontend получает данные только через backend. Backend запрашивает Keitaro и объединяет ответ с локальными метаданными кампаний и потоков.

Создание кампании выполняет запросы в Keitaro и создаёт два потока:

1. regular-поток с выбранным GEO и редиректом на `https://google.com`;
2. default-поток с выбранным оффером.

Изменения офферов сначала остаются черновиком. После сохранения доли нормализуются до целых процентов с суммой `100`. Кампания переводится в disabled только если активных офферов нет ни в одном её потоке.

Локальная SQLite-база хранит дополнительные данные кампаний и потоков: GEO, домен, группу, источник, fallback URL и известные офферы потоков. Если оффер исчез из ответа Keitaro, wrapper возвращает его в поток со статусом `removed`, чтобы его можно было восстановить через `Bring Back`.

## API backend

- `GET /api/health` — проверка backend;
- `GET /api/campaigns` — список кампаний;
- `GET /api/campaigns/{campaign_id}/streams` — потоки кампании;
- `GET /api/offers` — офферы;
- `GET /api/offers/deleted` — известные офферы, которых больше нет в каталоге Keitaro;
- `GET /api/groups` — группы;
- `GET /api/domains` — домены;
- `GET /api/traffic_sources` — источники трафика;
- `POST /api/campaigns` — создание кампании;
- `POST /api/streams` — создание потока;
- `PUT /api/streams/{stream_id}` — изменение потока;
- `DELETE /api/streams/{stream_id}?campaign_id={campaign_id}` — удаление потока;
- `POST /api/campaigns/{campaign_id}/state` — изменение состояния кампании;
- `PUT /api/campaigns/{campaign_id}/metadata` — изменение локальных метаданных.

Состояние кампании передаётся в Keitaro через Admin API `/enable` и `/disable`.

## Миграции

```bash
.venv/bin/alembic -c backend/alembic.ini upgrade head
.venv/bin/alembic -c backend/alembic.ini downgrade -1
.venv/bin/alembic -c backend/alembic.ini current
```

SQLite-файл создаётся в `backend/data/adrobot.sqlite3`.

## Проверки

```bash
npm run typecheck
npm run build
python3 -m compileall -q backend
git diff --check
```

Если backend возвращает `401 Unauthorized`, нужно проверить `KEITARO_API_KEY` в `backend/.env` и перезапустить uvicorn.
