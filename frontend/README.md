# F1 · Граф денег

Основной экран `/workspace`: KPI, глобальный рейтинг с пагинацией, поиск любого gid, направленный Cytoscape-граф, переключение роли/кластера, глубина 0–2, профиль узла, ограничения наблюдения и график по дням. Прямая ссылка на кластер имеет формат `/workspace?analysis=<analysis_id>&cluster_id=<cluster_id>`; при выборе `gid` фильтр кластера очищается.

## Запуск (PowerShell)

Использовать Node.js 24 LTS (или Node.js ≥22.15). На проверенной машине: Node.js 24.16.0.

```powershell
cd C:\Users\Default.User\Documents\GitHub\hack-84eefdc9-cr7-mentality\frontend
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Открыть http://localhost:3000/workspace. Бэкенд по умолчанию: http://localhost:8000. Кнопка «Запустить анализ» вызывает POST `/api/v1/analyze`. Прямой URL: `/workspace?analysis=<analysis_id>&gid=<gid>`.

Для демонстрации без бэкенда поставить `NEXT_PUBLIC_ENABLE_DEMO=true` в `.env.local`, перезапустить `npm run dev` и открыть `/workspace?demo=1`. На экране всегда есть жёлтая маркировка синтетических данных. Проверочные gid: `1001`, `1005` (depth 4), `9999` (изолированный seed), `9007199254740993` (проверка точности int64). Ошибка API никогда не заменяется демоданными. В production деморежим отключён независимо от переменной окружения.

## Проверки

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

Схема gid принимает канонический знаковый десятичный int64; `-0` при поиске нормализуется в `0`, ведущие нули, знак `+` и значения за пределами int64 не принимаются. Финансовые суммы форматируются через BigInt; Number используется только для координат графика. Роли и приоритет берутся с сервера без пересчёта.

Проверено в браузере на синтетических данных: поиск большого gid, изолированный seed, depth 4, неизвестный gid, история назад, сброс кластера при поиске, пагинация, глубина 0/1. Компоновка проверена при ширине 375 и 1440 px; ошибок JS не обнаружено. Живой API и деплой требуют отдельной проверки после готовности бэкенда.

## F2: можно начинать после коммита каркаса

Зависимости и UI-компоненты установлены и зафиксированы. Общие компоненты: `Button` (default/outline/ghost/secondary), `Input`, `Badge`, `Card`, `CardHeader`, `CardTitle`, `CardContent`, `Loading`, `ErrorState`. Tailwind и aliases `@/*` настроены; `components.json` совместим с shadcn.

Владение передаётся F2:

- `src/app/page.tsx` — сейчас redirect на workspace, заменить landing.
- `src/app/methodology/page.tsx`, `src/app/exports/page.tsx` — заглушки.
- `src/components/ai/AnalystPanel.tsx` — заглушка; подключена в карточке выбранного узла.
- Будущие `src/components/{ai,landing,methodology,exports}/*`, `src/hooks/useAssistant.ts`, `src/mocks/assistant.ts`.

Контракт панели уже определён в `src/features/workspace/types.ts`:

```tsx
type AnalystPanelProps = {
  analysisId: string;
  focusGids: string[];
  onSelectGid: (gid: string) => void;
};
```

Сохранить **default export** AnalystPanel. Компонент получает key по analysisId + gid и размонтируется при смене контекста. F2 владеет question/answer/loading/error и отменяет запрос через AbortController в cleanup.

Из `@/lib/api` доступны:

```ts
analyze({dataset_id: "hackalem-july-2026"}, signal?)
getDashboard(analysisId, {offset: 0, limit: 20}, signal?)
getGraph(analysisId, {focus_gid, hops: 1, max_nodes: 250}, signal?)
askAssistant(analysisId, {question, focus_gids}, signal?)
getExportUrl(analysisId, "nodes_roles.csv")
```

И именованные функции, и объект `api` экспортируются. `ApiError` содержит code/message/status/requestId/retryable. `errorMessage` и `isAbort` помогают показывать ошибки. Базовый URL берётся из `NEXT_PUBLIC_API_BASE_URL`; `/api/v1` клиент добавляет сам. `mode: fallback` нужно явно показывать в панели F2. Для экспорта использовать `getExportUrl`, не создавать CSV на клиенте. F2 не меняет lockfile, globals.css и generated API-контракт.

## BACK: контракт и интеграция

`src/contracts/api.ts` сохранён как в коммите BACK `aa75b85`, без изменений. Runtime-проверки в `src/lib/api-schema.ts` соответствуют типам и примерам BACK. В частности: `DashboardResponse.charts`, `ranking.items`, `period`, массив предупреждений; `GraphNode.metrics`, массив flags; `GraphEdge.source/target`.

В API пока нет отдельной суммы self-transfers для каждого узла: интерфейс не придумывает её. Общая сумма `stats.self_transfer_turnover_kzt` доступна в ограничениях оборота; флаг `self_transfers_excluded` показывается у узла.

Локальный CORS должен разрешать `http://localhost:3000`, методы GET/POST/OPTIONS и Content-Type. Перед живым демо проверить pipeline/API → UI, поиск реальных gid, три CSV и панель F2. Наличие этих проверок на фикстурах не означает, что живой бэкенд уже проверен.

## Railway

Root Directory `/frontend`; config `/frontend/railway.json`. Build: `npm ci && npm run build`. Start: `npm run start -- --hostname 0.0.0.0 --port $PORT`. `NEXT_PUBLIC_API_BASE_URL` установить на публичный HTTPS URL бэкенда **до сборки**, без `/api/v1`. После изменения URL пересобрать фронтенд. Деплой выполняется командой проекта отдельно.
