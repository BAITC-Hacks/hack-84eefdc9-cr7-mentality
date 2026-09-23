# Деплой «Графа денег» на Railway

Инструкция для двух **новых сервисов** из одного репозитория: FastAPI в `/backend` и Next.js в `/frontend`. Настройки вводятся в Railway Dashboard; CLI и Infrastructure as Code для этого не требуются. Облачный деплой нужно проверить после выполнения шагов ниже: наличие этих файлов в репозитории не означает, что сайт уже опубликован.

## 1. Подготовить итоговую версию

Завершите слияния, убедитесь, что проверки из [README](../README.md) проходят, просмотрите `git diff` и отправьте итоговый `main` на GitHub. Рекомендуемое название коммита:

```text
fix: finalize AML MVP and Railway deployment guide
```

После добавления проверенных файлов в индекс:

```bash
git commit -m "fix: finalize AML MVP and Railway deployment guide"
git push origin main
```

Не добавляйте `backend/.env`, `frontend/.env.local`, API-ключи, `.venv` или `node_modules`. Обезличенные Parquet уже находятся в `backend/data` и должны оставаться доступны при сборке. Проверьте, что новые исходные файлы тоже включены в коммит.

## 2. Создать проект и два сервиса

1. В [Railway](https://railway.com/new) создайте **Empty Project**.
2. Внутри проекта создайте два **Empty Service**, назовите их `backend` и `frontend`.
3. В каждом сервисе откройте **Settings → Source → Connect Repo** и выберите `BAITC-Hacks/hack-84eefdc9-cr7-mentality`, ветку `main`.
4. Если репозиторий не виден, предоставьте Railway GitHub App доступ к этому репозиторию организации `BAITC-Hacks`. Для ограниченной организации подтверждение может потребоваться от её администратора.
5. Задайте настройки из таблицы. Применяйте подготовленные изменения через **Deploy / Deploy Changes** после заполнения конфигурации соответствующего сервиса.

| Настройка сервиса | Backend | Frontend |
|---|---|---|
| Root Directory | `/backend` | `/frontend` |
| Builder | Railpack | Railpack |
| Custom Build Command | Оставить пустым: Railpack устанавливает `requirements.txt` | `npm run build` |
| Custom Start Command | `uvicorn app.main:app --host 0.0.0.0 --port $PORT --workers 1` | `npm run start -- --hostname 0.0.0.0 --port $PORT` |
| Healthcheck Path | `/healthz` | `/workspace` |
| Healthcheck Timeout | `300` секунд | `300` секунд |
| Restart Policy | On Failure | On Failure |
| Replicas | `1` | `1` |
| Watch Paths, необязательно | `/backend/**` | `/frontend/**` |

Root Directory задаётся в настройках источника, команды сборки — в **Build**, команды запуска и healthcheck — в **Deploy**. Python закреплён файлом `backend/.python-version` на `3.12`. Node закрепляется переменной ниже. Railpack выполняет установку npm-зависимостей по `package-lock.json`; вручную добавлять `npm ci` в Build Command не нужно.

`$PORT` в командах оставьте именно так: Railway предоставляет порт автоматически. Эти команды вводятся в интерфейсе Railway, а не выполняются в локальном PowerShell.

## 3. Сначала развернуть backend без внешнего ИИ

В **backend → Variables** добавьте:

```dotenv
LLM_ENABLED=false
CORS_ORIGINS=["http://localhost:3000"]
LLM_REQUESTS_PER_MINUTE=20
LLM_MAX_CONCURRENT=2
```

Это начальная настройка: после получения публичного домена фронтенда CORS нужно заменить. API-ключ для запуска графа, ранжирования и выгрузок не нужен.

1. Примените настройки и дождитесь успешного backend deployment.
2. В **Settings → Networking → Public Networking → Generate Domain** создайте публичный HTTPS-домен.
3. Откройте `https://<backend-domain>/healthz`: ожидается HTTP 200 и `"status":"ok"`.
4. Откройте `https://<backend-domain>/docs`: должна загрузиться документация FastAPI.

При старте процесс читает Parquet и рассчитывает снимок анализа. Пока расчёт не завершён, сервис не готов. Для этого MVP отдельная база данных и Railway Volume не нужны: исходные данные включены в Git, результаты восстанавливаются после перезапуска. Локальные `.env` на Railway не переносятся.

## 4. Развернуть frontend

В **frontend → Variables**, **до первой сборки**, добавьте:

```dotenv
NEXT_PUBLIC_API_BASE_URL=https://<backend-domain>
NEXT_PUBLIC_ENABLE_DEMO=false
RAILPACK_NODE_VERSION=24
```

Замените `<backend-domain>` настоящим доменом из предыдущего шага. Значение должно быть публичным HTTPS-адресом **без `/api/v1` и без завершающего `/`**. Не используйте `localhost` или `*.railway.internal`: запрос к API делает браузер посетителя сайта.

1. Примените настройки и дождитесь успешной frontend-сборки и deployment.
2. Создайте домен: **Settings → Networking → Public Networking → Generate Domain**.
3. Сохраните оба адреса отдельно: frontend — сайт, backend — API.

`NEXT_PUBLIC_API_BASE_URL` встраивается в JavaScript при `npm run build`. После изменения этой переменной нужна **новая сборка/deployment**; простой Restart уже собранного процесса адрес не обновит.

## 5. Разрешить публичный frontend в CORS

В **backend → Variables** замените начальное значение на точный origin фронтенда:

```dotenv
CORS_ORIGINS=["https://<frontend-domain>"]
```

Origin содержит схему и домен, без пути и завершающего `/`. Если нужен одновременный доступ с локального фронта:

```dotenv
CORS_ORIGINS=["https://<frontend-domain>","http://localhost:3000"]
```

Примените изменения backend и дождитесь готовности. Теперь откройте публичный frontend, нажмите **«Начать анализ» → «Запустить анализ»**. Должны загрузиться реальные данные: 2 248 узлов, 3 119 рёбер и 4 840 транзакций.

## 6. Включить OpenAI, если нужен живой ИИ

Добавляйте эти переменные **только в backend**:

```dotenv
LLM_ENABLED=true
OPENAI_API_KEY=<настоящий_API_ключ_OpenAI>
OPENAI_MODEL=gpt-6-luna
LLM_REQUESTS_PER_MINUTE=20
LLM_MAX_CONCURRENT=2
```

Используйте API-ключ проекта OpenAI с доступом к указанной модели и API-кредитами. Код активации выданных на хакатоне кредитов или подписки — не API-ключ. Если эта модель недоступна вашему API-проекту, укажите доступную совместимую модель со Structured Outputs и проверьте живой запрос. NVIDIA для текущей реализации не требуется.

Примените изменения backend. Во frontend API-ключ не нужен; не создавайте переменную `NEXT_PUBLIC_OPENAI_API_KEY`.

Лимиты по умолчанию: не более **20 попыток обращения к платному API за минуту** и **2 одновременных запросов** на один backend-процесс. Они общие для посетителей этого процесса, сбрасываются при его перезапуске и не являются денежным лимитом расходов. Для текущего MVP оставьте `--workers 1` и одну реплику; при нескольких процессах каждый имеет собственные счётчики. При срабатывании ограничения или недоступности OpenAI интерфейс показывает резервное объяснение рассчитанных фактов. Пайплайн, граф и CSV продолжают работать без ИИ.

## 7. Проверить опубликованный сайт

Из `backend`, используя Python вашего виртуального окружения:

**Windows PowerShell:**

```powershell
.\.venv\Scripts\python.exe scripts/smoke_api.py --base-url https://<backend-domain> --origin https://<frontend-domain>
```

**macOS / Linux:**

```bash
.venv/bin/python scripts/smoke_api.py --base-url https://<backend-domain> --origin https://<frontend-domain>
```

Замените домены перед запуском. Если виртуальное окружение создано в корне репозитория, используйте `../.venv/...` вместо `.venv/...` или активированный `python`. Скрипт использует только стандартную библиотеку Python.

Он проверяет healthcheck, CORS и preflight, запуск анализа, dashboard, граф, ассистента и все три CSV. Без специального флага корректный резервный ответ считается допустимым. Для обязательной проверки **настоящего ответа OpenAI** добавьте:

```text
--require-live-ai
```

С этим флагом резервный ответ завершает проверку ошибкой с причиной. Проверка ассистента при включённом LLM отправляет реальный платный API-запрос.

Финальный сценарий в браузере:

1. Открыть frontend, запустить анализ.
2. Выбрать клиента из рейтинга: проверить роль, правило, входящие/исходящие потоки и направленные связи.
3. Найти другой `gid` из CSV; проверить переключение кластера и глубины графа.
4. Задать вопрос «Почему этот узел стоит проверить?»; при включённом OpenAI убедиться, что показан **«Ответ ИИ»**, и открыть ссылку на факт/узел.
5. Скачать `nodes_roles.csv`, `clusters.csv`, `top_nodes.csv`.
6. Переключить язык и тему, обновить страницу и убедиться, что настройки сохранились.

Healthcheck frontend проверяет доступность страницы Next.js. Успешный healthcheck сам по себе не подтверждает доступ браузера к backend; поэтому smoke и сценарий выше обязательны.

## Решение типовых проблем

| Симптом | Что проверить |
|---|---|
| GitHub-репозиторий не виден | Доступ Railway GitHub App к организации и конкретному репозиторию; правильный GitHub-аккаунт |
| Railway пытается собирать весь репозиторий | Root Directory должен быть `/backend` или `/frontend`; проверить источник и ветку `main` |
| Не найдены Python-модуль, requirements или Parquet | Root Directory `/backend`; файлы `app/`, `requirements.txt`, `data/` включены в Git |
| Frontend не собирается | Node 24 через `RAILPACK_NODE_VERSION`; lockfile в Git; изучить первую ошибку Build Logs |
| Healthcheck завершается ошибкой | Сервис слушает `0.0.0.0:$PORT`, путь правильный, нет ошибки startup; смотреть Deploy Logs. Не задавать локальный фиксированный порт |
| Страница открылась, но анализ не загружается | `NEXT_PUBLIC_API_BASE_URL` публичный HTTPS, не внутренний домен; запросы Network в браузере идут именно к backend |
| Браузер сообщает CORS | `CORS_ORIGINS` — JSON-массив с точным frontend origin, без `/`; изменения backend применены |
| После смены API URL браузер всё ещё обращается к старому адресу | Пересобрать frontend с новым `NEXT_PUBLIC_API_BASE_URL`, затем обновить страницу; Restart недостаточен |
| «ИИ-пояснения отключены» | В backend установить `LLM_ENABLED=true`, сохранить и применить изменения |
| Резервный ответ вместо ИИ | Проверить ключ, доступ модели, API-кредиты, timeout и лимиты; выполнить smoke с `--require-live-ai`. Не публиковать ключ в логах или скриншотах |
| После redeploy перестала открываться старая ссылка на analysis | Запустить анализ заново и использовать актуальный `analysis_id`; снимок привязан к данным/алгоритму |
| Push фронтендера не запустил deploy | Правильная ветка, watch paths, доступ автора; Railway может показывать запрос Approve для коммита участника без связанного Railway-аккаунта |

## Почему здесь не используется `railway.json` автоматически

По документации Railway, проверенной 23 сентября 2026, **Config as Code (`railway.json` / `railway.toml`) устарел**. Новые сервисы не могут подключить этот механизм. Для существующих сервисов, уже использующих его, файлы продолжают применяться до **1 декабря 2026** и имеют приоритет над соответствующими настройками Dashboard.

Наши `backend/railway.json` и `frontend/railway.json` сохранены как конфигурация для такого legacy-сценария. Для **новых** сервисов они не заменяют ввод настроек из таблицы выше. Не добавляйте Config File Path в обязательные шаги нового деплоя.

Только для уже подключённых legacy-сервисов абсолютные пути конфигов в репозитории — `/backend/railway.json` и `/frontend/railway.json`; они не вычисляются относительно Root Directory. Для перехода такого проекта на новый IaC используйте официальный migration guide. Новый проект с настройками через Dashboard не требует миграции. При желании позже его можно импортировать в `.railway/railway.ts` через Railway CLI.

## Официальные источники

- [Создание сервисов и подключение GitHub](https://docs.railway.com/services).
- [Изолированный монорепозиторий и Root Directory](https://docs.railway.com/deployments/monorepo).
- [Ручные Build и Start Commands](https://docs.railway.com/builds/build-and-start-commands).
- [Healthchecks и автоматический PORT](https://docs.railway.com/deployments/healthchecks).
- [Публичные домены](https://docs.railway.com/networking/public-networking).
- [Статус Config as Code и новый Infrastructure as Code](https://docs.railway.com/infrastructure-as-code).
- [Настройка версии Node в Railpack](https://railpack.com/languages/node).
- [Next.js: переменные NEXT_PUBLIC встраиваются при сборке](https://nextjs.org/docs/app/guides/environment-variables).
