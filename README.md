# hack-84eefdc9-cr7-mentality
Hackathon team repository for CR7 Mentality


## Project handoff

- [Технический паспорт проекта](docs/PROJECT_PASSPORT.md)
- [OpenAPI request/response JSON Schema](docs/api-contract.schema.json)
- [Примеры запросов и ответов](docs/api-examples.json)
- [Структурированные контракты FastAPI/Pydantic](backend/app/contracts.py)
- [Общие TypeScript-типы фронтенда](frontend/src/contracts/api.ts)
- Исходные Parquet: `backend/data/`

Реализованы FastAPI-бэкенд и интерфейс Next.js: лендинг, граф, поиск клиентов, рейтинг, пояснения ассистента и CSV-выгрузки.

## Быстрый запуск бэкенда

Требуется Python 3.12. Данные уже находятся в `backend/data/`. После установки зависимостей одна команда создаёт три обязательных CSV без API-ключа:

```bash
cd backend
python -m venv .venv
# Далее используйте Python созданного окружения:
python -m pip install -r requirements.txt
python -m app.pipeline --data-dir data --out-dir artifacts --seed 42
```

На Windows Python окружения — `.venv/Scripts/python.exe`, на Linux/macOS — `.venv/bin/python`. Выходы: `backend/artifacts/nodes_roles.csv`, `clusters.csv`, `top_nodes.csv`. Для HTTP API: `python -m uvicorn app.main:app --host 127.0.0.1 --port 8000`, интерактивные схемы доступны на `http://127.0.0.1:8000/docs`.

Для локальной настройки скопируйте `backend/.env.example` в `backend/.env`, если файл ещё не создан. FastAPI автоматически читает этот файл при запуске; переменные процесса имеют приоритет. Для OpenAI укажите `OPENAI_API_KEY`, доступную вашему API-проекту модель в `OPENAI_MODEL` и `LLM_ENABLED=true`, затем перезапустите API. При `LLM_ENABLED=false` ассистент показывает рассчитанные факты без обращения к OpenAI. Ключ хранится только в `backend/.env`, который исключён из Git.

## Запуск интерфейса

Во втором терминале из корня репозитория:

```bash
cd frontend
npm ci
npm run dev
```

Откройте `http://localhost:3000`, нажмите «Начать анализ», затем «Запустить анализ». Все экраны по умолчанию обращаются к `http://localhost:8000`. Чтобы изменить адрес, создайте `frontend/.env.local` по `frontend/.env.example`, задайте `NEXT_PUBLIC_API_BASE_URL` и перезапустите Next.js. Локальный origin интерфейса должен входить в `CORS_ORIGINS` бэкенда.

На выданном наборе: 2 248 узлов, 3 119 рёбер, 4 840 транзакций; 86 кластеров и 35 слабосвязных компонент, включая 19 изолированных seed. Сумма транзакций — `365890012.01 KZT` (в ТЗ округлено до целого). Локальный расчёт уложился в лимит 5 минут.

Критерии всех шести ролей, пороги, формулы баллов, ограничения данных, схема решения и план масштабирования описаны в [техническом паспорте](docs/PROJECT_PASSPORT.md). `role_score` — выраженность признаков, а не вероятность преступления. Исходящие потоки на четвёртом колене обрезаны; входящие seed неполны; переводы меньше 5 000 KZT и вне банка не видны. Выводы служат гипотезами для ручной проверки.

Для Railway создайте два сервиса из одного репозитория: Root Directory `/backend` и `/frontend`. Для бэкенда задайте Config File Path `/backend/railway.json`: Root Directory сам по себе не меняет путь конфигурационного файла. Бэкенд использует [`backend/railway.json`](backend/railway.json) и `/healthz`; фронтенд должен получить публичный URL API через `NEXT_PUBLIC_API_BASE_URL` до сборки. Коды активации кредитов не являются API-ключом. Необязательный OpenAI-ключ задаётся только на сервере; образец переменных — [`backend/.env.example`](backend/.env.example).

## Проверка интеграции перед демо

После запуска API выполните из корня репозитория:

```bash
python backend/scripts/smoke_api.py --base-url http://127.0.0.1:8000
```

Скрипт проходит полный сценарий: готовность API → анализ → дашборд → поиск узла на графе → объяснение ассистента → скачивание и чтение всех трёх CSV. Он проверяет схему данных и завершает работу с ошибкой при первом сбое. Для публичного Railway URL используйте `--base-url https://<backend-domain>`; после публикации фронтенда добавьте `--origin https://<frontend-domain>` для проверки CORS. Для демонстрации произвольного клиента добавьте `--gid <gid>`.

На Railway для backend укажите `CORS_ORIGINS=["https://<frontend-domain>"]` после выдачи домена фронтенду. `LLM_ENABLED=false` оставляет работающий детерминированный ответ ассистента; после активации OpenAI-кредита можно задать `OPENAI_API_KEY`, `OPENAI_MODEL` и `LLM_ENABLED=true` **только в переменных backend-сервиса**. Для фронтенда `NEXT_PUBLIC_API_BASE_URL` должен содержать публичный URL backend **до сборки** Next.js. Публичный демо-прогон проверяйте скриптом повторно после каждого изменения этих переменных.
