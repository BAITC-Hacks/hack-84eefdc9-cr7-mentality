"""Read the supplied Parquet batch and validate its structural contract."""

from dataclasses import dataclass
from datetime import date
from decimal import Decimal
from pathlib import Path

import pandas as pd
from pandas.api.types import is_bool_dtype, is_integer_dtype

from .errors import DataValidationError


FILES = ("nodes.parquet", "edges.parquet", "transactions.parquet")
COLUMNS = {
    "nodes.parquet": {"gid", "depth", "is_seed"},
    "edges.parquet": {"src", "dst", "sum_kzt", "n_tx", "depth"},
    "transactions.parquet": {"src", "dst", "date", "sum_kzt"},
}


@dataclass(frozen=True)
class Dataset:
    nodes: pd.DataFrame
    edges: pd.DataFrame
    transactions: pd.DataFrame
    warnings: tuple[str, ...]


def money(value: object) -> Decimal:
    try:
        result = Decimal(str(value))
    except Exception as exc:
        raise DataValidationError(f"Invalid KZT amount: {value!r}") from exc
    if not result.is_finite() or result < 0:
        raise DataValidationError(f"Invalid KZT amount: {value!r}")
    return result


def load_dataset(data_dir: Path) -> Dataset:
    data_dir = Path(data_dir)
    frames = {}
    for name in FILES:
        path = data_dir / name
        if not path.is_file():
            raise DataValidationError(f"Missing input file: {path}")
        try:
            frame = pd.read_parquet(path, engine="pyarrow")
        except Exception as exc:
            raise DataValidationError(f"Cannot read {path.name}: {exc}") from exc
        missing = COLUMNS[name] - set(frame.columns)
        if missing:
            raise DataValidationError(f"{name}: missing columns {sorted(missing)}")
        frames[name] = frame[list(sorted(COLUMNS[name]))].copy()

    nodes = frames["nodes.parquet"]
    edges = frames["edges.parquet"]
    tx = frames["transactions.parquet"]
    for frame, columns, filename in (
        (nodes, ("gid", "depth"), "nodes.parquet"),
        (edges, ("src", "dst", "n_tx"), "edges.parquet"),
        (tx, ("src", "dst"), "transactions.parquet"),
    ):
        for column in columns:
            if not is_integer_dtype(frame[column]) or frame[column].isna().any():
                raise DataValidationError(f"{filename}.{column} must contain non-null integers")
        if frame.empty:
            raise DataValidationError(f"{filename} is empty")

    if not is_bool_dtype(nodes["is_seed"]) or nodes["is_seed"].isna().any():
        raise DataValidationError("nodes.is_seed must contain non-null booleans")
    if nodes["gid"].duplicated().any():
        raise DataValidationError("nodes.gid must be unique")
    if not nodes["depth"].between(0, 4).all():
        raise DataValidationError("nodes.depth must be in 0..4")
    if not edges["depth"].dropna().between(0, 4).all():
        raise DataValidationError("edges.depth must be in 0..4 when provided")
    if edges[["src", "dst"]].duplicated().any():
        raise DataValidationError("edges must have one aggregated row per ordered pair")
    if not (edges["n_tx"] > 0).all():
        raise DataValidationError("edges.n_tx must be positive")

    known = set(int(gid) for gid in nodes["gid"])
    for frame, filename in ((edges, "edges.parquet"), (tx, "transactions.parquet")):
        for column in ("src", "dst"):
            unknown = set(int(value) for value in frame[column]) - known
            if unknown:
                raise DataValidationError(f"{filename}.{column}: unknown gid {min(unknown)}")
        if frame["sum_kzt"].isna().any():
            raise DataValidationError(f"{filename}.sum_kzt has null values")
        for value in frame["sum_kzt"]:
            money(value)

    try:
        dates = pd.to_datetime(tx["date"], errors="raise").dt.date
    except Exception as exc:
        raise DataValidationError("transactions.date contains invalid dates") from exc
    if any(not isinstance(value, date) for value in dates):
        raise DataValidationError("transactions.date contains null values")
    tx["date"] = dates

    # Transactions may repeat exactly: without transaction_id, repetition is not a duplicate.
    pair_counts = tx.groupby(["src", "dst"]).size().to_dict()
    edge_counts = {(int(row.src), int(row.dst)): int(row.n_tx) for row in edges.itertuples(index=False)}
    warnings = []
    if pair_counts != edge_counts:
        mismatch = len(set(pair_counts) ^ set(edge_counts)) + sum(
            pair_counts[pair] != edge_counts[pair] for pair in set(pair_counts) & set(edge_counts)
        )
        warnings.append(f"PAIR_COUNT_MISMATCH:{mismatch}")
    pair_sums: dict[tuple[int, int], Decimal] = {}
    for row in tx.itertuples(index=False):
        pair = (int(row.src), int(row.dst))
        pair_sums[pair] = pair_sums.get(pair, Decimal(0)) + money(row.sum_kzt)
    amount_mismatch = 0
    for row in edges.itertuples(index=False):
        pair = (int(row.src), int(row.dst))
        actual = pair_sums.get(pair)
        if actual is None or abs(actual - money(row.sum_kzt)) > Decimal("0.01") * int(row.n_tx):
            amount_mismatch += 1
    if amount_mismatch:
        warnings.append(f"PAIR_AMOUNT_MISMATCH:{amount_mismatch}")

    nodes.sort_values("gid", inplace=True)
    edges.sort_values(["src", "dst"], inplace=True)
    tx.sort_values(["date", "src", "dst"], kind="stable", inplace=True)
    return Dataset(nodes.reset_index(drop=True), edges.reset_index(drop=True), tx.reset_index(drop=True), tuple(warnings))
