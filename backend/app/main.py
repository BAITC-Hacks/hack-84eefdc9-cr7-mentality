"""FastAPI facade over the reproducible offline analysis snapshot."""

from contextlib import asynccontextmanager
import asyncio
import json
import logging
import os
from pathlib import Path
from uuid import uuid4

from dotenv import load_dotenv
from fastapi import FastAPI, Query, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.concurrency import run_in_threadpool
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from .ai import explain
from .contracts import (
    AnalyzeRequest, AnalyzeResponse, AssistantRequest, AssistantResponse,
    DashboardResponse, ErrorResponse, GraphQuery, GraphResponse,
)
from .exports import NAMES
from .pipeline import (
    AnalysisSnapshot, DEFAULT_DATA_DIR, DEFAULT_OUT_DIR, VERSION,
    calculate_analysis_id, run_pipeline,
)
from .views import assistant_facts, dashboard_page, graph_view


# Resolve the local file independently of the shell's working directory.
# Deployment environment variables always take precedence over .env.
load_dotenv(Path(__file__).resolve().parents[1] / ".env", override=False)

logger = logging.getLogger(__name__)


class APIError(Exception):
    def __init__(self, status_code: int, code: str, message: str, retryable: bool = False):
        self.status_code, self.code, self.message, self.retryable = status_code, code, message, retryable


def _configured_path(variable: str, default: Path) -> Path:
    raw = os.getenv(variable)
    return Path(raw).resolve() if raw else default


def _origins() -> list[str]:
    raw = os.getenv("CORS_ORIGINS", "http://localhost:3000")
    if raw.lstrip().startswith("["):
        origins = json.loads(raw)
        if not isinstance(origins, list) or not all(isinstance(value, str) for value in origins):
            raise ValueError("CORS_ORIGINS must be a JSON array of strings")
        return origins
    return [value.strip() for value in raw.split(",") if value.strip()]


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pipeline_lock = asyncio.Lock()
    app.state.data_dir = _configured_path("DATA_DIR", DEFAULT_DATA_DIR)
    app.state.out_dir = _configured_path("ARTIFACTS_DIR", DEFAULT_OUT_DIR)
    app.state.snapshot = await run_in_threadpool(run_pipeline, app.state.data_dir, app.state.out_dir, 42)
    yield


app = FastAPI(title="Money Graph AML API", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_origins(),
    allow_credentials=False,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type"],
)


@app.exception_handler(APIError)
async def api_error_handler(request: Request, exc: APIError) -> JSONResponse:
    payload = ErrorResponse.model_validate({
        "error": {"code": exc.code, "message": exc.message,
                  "request_id": uuid4().hex, "retryable": exc.retryable}
    })
    return JSONResponse(status_code=exc.status_code, content=payload.model_dump())


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    payload = ErrorResponse.model_validate({
        "error": {"code": "INVALID_INPUT", "message": "Проверьте формат и диапазоны параметров запроса.",
                  "request_id": uuid4().hex, "retryable": False}
    })
    return JSONResponse(status_code=422, content=payload.model_dump())


def _snapshot(request: Request, analysis_id: str) -> AnalysisSnapshot:
    snapshot: AnalysisSnapshot | None = getattr(request.app.state, "snapshot", None)
    if snapshot is None or snapshot.analysis_id != analysis_id:
        raise APIError(404, "ANALYSIS_NOT_FOUND", "Анализ не найден. Запустите расчёт заново.")
    return snapshot


@app.get("/healthz")
async def healthz(request: Request) -> dict:
    return {"status": "ok" if getattr(request.app.state, "snapshot", None) else "starting"}


@app.post("/api/v1/analyze", response_model=AnalyzeResponse)
async def analyze(body: AnalyzeRequest, request: Request) -> dict:
    data_dir: Path = request.app.state.data_dir
    if not all((data_dir / name).is_file() for name in ("nodes.parquet", "edges.parquet", "transactions.parquet")):
        raise APIError(404, "DATASET_NOT_FOUND", "Файлы датасета отсутствуют на сервере.")
    lock: asyncio.Lock = request.app.state.pipeline_lock
    if lock.locked():
        raise APIError(409, "ANALYSIS_BUSY", "Расчёт уже выполняется.", retryable=True)
    async with lock:
        snapshot: AnalysisSnapshot | None = getattr(request.app.state, "snapshot", None)
        current_id = await run_in_threadpool(calculate_analysis_id, data_dir, 42)
        cached = snapshot is not None and snapshot.analysis_id == current_id
        if not cached:
            try:
                snapshot = await run_in_threadpool(run_pipeline, data_dir, request.app.state.out_dir, 42)
            except Exception as exc:
                logger.exception("Pipeline failed")
                raise APIError(500, "PIPELINE_FAILED", "Не удалось пересчитать анализ.", retryable=True) from exc
            request.app.state.snapshot = snapshot
        assert snapshot is not None
        return {
            "analysis_id": snapshot.analysis_id,
            "status": "ready",
            "cached": cached,
            "algorithm_version": VERSION,
            "runtime_ms": snapshot.runtime_ms,
            "summary_url": f"/api/v1/analyses/{snapshot.analysis_id}",
        }


@app.get("/api/v1/analyses/{analysis_id}", response_model=DashboardResponse)
async def dashboard(
    analysis_id: str, request: Request,
    offset: int = Query(0, ge=0), limit: int = Query(20, ge=1, le=100),
) -> dict:
    return dashboard_page(_snapshot(request, analysis_id), offset, limit)


@app.get("/api/v1/analyses/{analysis_id}/graph", response_model=GraphResponse)
async def graph(
    analysis_id: str, request: Request,
    focus_gid: str | None = None,
    hops: int = 1,
    cluster_id: int | None = None,
    max_nodes: int = 250,
) -> dict:
    snapshot = _snapshot(request, analysis_id)
    try:
        query = GraphQuery.model_validate({
            "focus_gid": focus_gid, "hops": hops,
            "cluster_id": cluster_id, "max_nodes": max_nodes,
        })
    except ValidationError as exc:
        raise APIError(422, "INVALID_INPUT", "Недопустимые параметры графа.") from exc
    try:
        return graph_view(snapshot, query)
    except KeyError as exc:
        if exc.args[0] == "GID_NOT_FOUND":
            raise APIError(404, "GID_NOT_FOUND", "Узел отсутствует в этом анализе.") from exc
        raise APIError(422, "INVALID_INPUT", "Кластер отсутствует в этом анализе.") from exc
    except ValueError as exc:
        raise APIError(422, "INVALID_INPUT", str(exc)) from exc


@app.post("/api/v1/analyses/{analysis_id}/assistant", response_model=AssistantResponse)
async def assistant(analysis_id: str, body: AssistantRequest, request: Request) -> AssistantResponse:
    snapshot = _snapshot(request, analysis_id)
    for gid in body.focus_gids:
        if int(gid) not in snapshot.metrics.nodes:
            raise APIError(404, "GID_NOT_FOUND", "Узел отсутствует в этом анализе.")
    facts = assistant_facts(snapshot, body.focus_gids)
    limitations = [warning["message"] for warning in snapshot.dashboard["warnings"]]
    return await explain(snapshot.analysis_id, body, facts, limitations)


@app.get("/api/v1/analyses/{analysis_id}/exports/{filename}")
async def export(analysis_id: str, filename: str, request: Request) -> FileResponse:
    snapshot = _snapshot(request, analysis_id)
    if filename not in NAMES:
        raise APIError(404, "EXPORT_NOT_FOUND", "Неизвестный файл выгрузки.")
    path = snapshot.out_dir / filename
    if not path.is_file():
        raise APIError(404, "EXPORT_NOT_FOUND", "Файл выгрузки отсутствует.")
    return FileResponse(path, media_type="text/csv; charset=utf-8", filename=filename)
