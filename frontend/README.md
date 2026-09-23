# Frontend · Граф денег

Интерфейс AML-аналитика: Next.js 16, React 19, TypeScript, Tailwind CSS, Cytoscape и Recharts. Работает с FastAPI из `../backend`.

Полный запуск проекта, данные и методология: [корневой README](../README.md). Публикация двух сервисов: [инструкция Railway](../docs/RAILWAY.md).

## Локальный запуск

Нужны Git, **Node.js 24** и npm. Команды ниже выполняются из корня клонированного репозитория. Сначала запустите backend по корневому README, затем откройте второй терминал.

**Windows PowerShell:**

```powershell
cd frontend
npm ci
if (-not (Test-Path .env.local)) { Copy-Item .env.example .env.local }
npm run dev
```

**macOS / Linux:**

```bash
cd frontend
npm ci
test -f .env.local || cp .env.example .env.local
npm run dev
```

Откройте [http://localhost:3000](http://localhost:3000), нажмите **«Начать анализ» → «Запустить анализ»**. Подготовленный набор HackAlem рассчитывается на backend. Формы загрузки новых Parquet в текущем интерфейсе нет.

Минимальное содержимое `frontend/.env.local`:

```dotenv
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_ENABLE_DEMO=false
```

Указывайте origin API без `/api/v1`. Если вы открыли интерфейс через `http://127.0.0.1:3000`, добавьте этот origin в backend `CORS_ORIGINS` либо используйте `localhost` последовательно. Изменение env при разработке требует перезапуска dev-сервера.

**OpenAI-ключ хранится только на backend.** Frontend отправляет вопрос своему API и никогда не обращается к OpenAI напрямую.

## Production-сборка локально

Завершите работающий dev-сервер перед запуском production на том же порту. Значение `NEXT_PUBLIC_API_BASE_URL` должно быть задано до сборки.

```bash
npm ci
npm run build
npm run start -- --hostname 0.0.0.0 --port 3000
```

`NEXT_PUBLIC_*` встраиваются в браузерный JavaScript при сборке. После смены адреса backend выполните новую `npm run build`; одного перезапуска `npm run start` недостаточно.

## Проверки

Из папки `frontend`:

```bash
npm test
npm run lint
npm run build
npm run typecheck
```

Build поставлен перед отдельным typecheck, чтобы в чистом checkout Next.js успел создать свои файлы типов. Тесты проверяют контракт, точность gid и сумм, состояние рабочего пространства, общую адресацию API и настройки локализации. Они не заменяют проверку браузера с запущенным backend.

После сборки проверьте сценарий: анализ → выбор клиента из рейтинга → поиск другого gid → переключение кластера → вопрос ассистенту → скачивание трёх CSV. Проверка всего API описана в корневом README и руководстве Railway.

## Страницы и сценарии

| URL | Назначение |
|---|---|
| `/` | Главная страница и переход к запуску анализа |
| `/workspace` | Запуск расчёта подготовленного набора |
| `/workspace?analysis=<analysis_id>` | KPI, рейтинг, граф, карточка узла и ассистент |
| `/workspace?analysis=<analysis_id>&gid=<gid>` | Анализ с выбранным клиентом |
| `/workspace?analysis=<analysis_id>&cluster_id=<cluster_id>` | Выбранное сообщество |
| `/methodology` | Правила ролей, формула приоритета и ограничения |
| `/exports?analysis=<analysis_id>` | Скачивание трёх CSV выбранного анализа |

`analysis_id` приходит из ответа `POST /api/v1/analyze`. Не подставляйте в опубликованный сайт идентификатор анализа с другого набора данных.

В workspace доступны направленные связи, окраска по ролям или кластерам, окружение узла глубиной 0–2, поиск любого gid, пагинация рейтинга, наблюдаемые потоки и разбивка приоритета. При выборе gid фильтр кластера снимается. Граф может быть ограничен 250 узлами; интерфейс показывает уведомление об усечении. Это ограничение визуального представления, а не расчёта ролей или CSV.

Ассистент объясняет выбранный узел с привязкой к серверным фактам. Интерфейс различает настоящий ответ модели, отключённый ИИ, timeout и резервный ответ; при ограничении частоты сервер показывает причину в тексте пояснения. Без API-ключа основной анализ остаётся доступен.

## API и точность данных

Основной клиент — `src/lib/api.ts`; типы — `src/contracts/api.ts`; проверка ответов во время выполнения — `src/lib/api-schema.ts`. Модули `analysis-api.ts` и `assistant-api.ts` используют тот же базовый URL.

| Запрос | Назначение |
|---|---|
| `POST /api/v1/analyze` | Анализ `{"dataset_id":"hackalem-july-2026"}` |
| `GET /api/v1/analyses/{analysis_id}` | Dashboard и рейтинг |
| `GET /api/v1/analyses/{analysis_id}/graph` | Граф с `focus_gid`, `cluster_id`, `hops`, `max_nodes` |
| `POST /api/v1/analyses/{analysis_id}/assistant` | Вопрос и `focus_gids` |
| `GET /api/v1/analyses/{analysis_id}/exports/{filename}` | Серверные CSV |

`gid` — строка с десятичным int64, а не JavaScript Number. Поиск сохраняет идентификаторы больше `Number.MAX_SAFE_INTEGER`; `-0` нормализуется в `0`, ведущие нули и знак `+` не принимаются. Денежные значения приходят десятичными строками; форматирование использует BigInt, Number применяется для координат графика. Роли, ранги, факты и CSV определяет backend; frontend их не пересчитывает.

## Языки и темы

Поддерживаются русский (`ru`), қазақша (`kk`) и English (`en`), светлая и тёмная темы. Каталоги находятся в `src/locales/{ru,kk,en}`. При добавлении строки внесите одинаковый ключ и одинаковые параметры `{name}` во все три языка.

Выбор сохраняется на год в cookies `money-graph-locale` и `money-graph-theme`. Сервер читает их при загрузке, выставляет `lang` и тему; заголовок вкладки обновляется при смене языка. Свободный текст доказательств и ответов API показывается на языке источника: язык запроса в backend-контракт пока не передаётся.

## Синтетические данные для разработки

Только для разработки без backend:

```dotenv
NEXT_PUBLIC_ENABLE_DEMO=true
```

Перезапустите `npm run dev` и откройте `/workspace?demo=1`. Синтетические данные явно помечены; примеры gid: `1001`, `1005` (depth 4), `9999` (изолированный seed), `9007199254740993` (проверка точности int64).

В production synthetic demo выключен независимо от env. Главная страница ведёт в рабочее пространство с реальным набором. Ошибка API не подменяется фикстурами. ИИ и серверные CSV проверяйте на настоящем backend.

## Основные файлы

```text
src/
  app/                       страницы и общий layout
  features/workspace/        состояние и компоновка рабочего экрана
  components/
    analytics/               KPI, рейтинг, карточка узла, график
    graph/                   Cytoscape, фильтры и легенда
    ai/                      пояснения, факты и ссылки на gid
    landing/                 главная страница
    exports/                 серверные CSV
    methodology/             правила и ограничения
    preferences/             языки и темы
  contracts/api.ts            типы API
  lib/                       API-клиенты, схемы, форматирование, режим demo
  locales/                   ru, kk, en
  mocks/                     синтетические данные для разработки
tests/                       тесты на Node.js
public/landing/              локальный графический ресурс
```

## Railway

Используйте [пошаговую инструкцию](../docs/RAILWAY.md): Root Directory `/frontend`, Railpack, Node 24, Build Command `npm run build`, Start Command `npm run start -- --hostname 0.0.0.0 --port $PORT`, healthcheck `/workspace`.

Публичный HTTPS origin backend задаётся в `NEXT_PUBLIC_API_BASE_URL` **до сборки**. Для новых Railway-сервисов настройки вводятся в Dashboard: `railway.json` — legacy-конфигурация, а не автоматическая настройка нового сервиса. Публичный деплой и CORS необходимо проверить после публикации.
