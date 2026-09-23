# hack-84eefdc9-cr7-mentality
Hackathon team repository for CR7 Mentality


## Project handoff

- [Технический паспорт проекта](docs/PROJECT_PASSPORT.md)
- [OpenAPI request/response JSON Schema](docs/api-contract.schema.json)
- [Примеры запросов и ответов](docs/api-examples.json)
- [Структурированные контракты FastAPI/Pydantic](backend/app/contracts.py)
- [Общие TypeScript-типы фронтенда](frontend/src/contracts/api.ts)
- Исходные Parquet: `backend/data/`

Бэкенд реализован; интерфейс Next.js разрабатывается параллельно.

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

На выданном наборе: 2 248 узлов, 3 119 рёбер, 4 840 транзакций; 86 кластеров и 35 слабосвязных компонент, включая 19 изолированных seed. Сумма транзакций — `365890012.01 KZT` (в ТЗ округлено до целого). Локальный расчёт уложился в лимит 5 минут.

Критерии всех шести ролей, пороги, формулы баллов, ограничения данных, схема решения и план масштабирования описаны в [техническом паспорте](docs/PROJECT_PASSPORT.md). `role_score` — выраженность признаков, а не вероятность преступления. Исходящие потоки на четвёртом колене обрезаны; входящие seed неполны; переводы меньше 5 000 KZT и вне банка не видны. Выводы служат гипотезами для ручной проверки.

Для Railway создайте два сервиса из одного репозитория: Root Directory `/backend` и `/frontend`. Для бэкенда задайте Config File Path `/backend/railway.json`: Root Directory сам по себе не меняет путь конфигурационного файла. Бэкенд использует [`backend/railway.json`](backend/railway.json) и `/healthz`; фронтенд должен получить публичный URL API через `NEXT_PUBLIC_API_BASE_URL` до сборки. Коды активации кредитов не являются API-ключом. Необязательный OpenAI-ключ задаётся только на сервере; образец переменных — [`backend/.env.example`](backend/.env.example).
