"""Errors raised by the offline AML pipeline."""


class DataValidationError(ValueError):
    """The provided Parquet files violate the documented input contract."""
