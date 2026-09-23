"""Bound paid API attempts per process; use one worker/replica for the demo."""

from collections import deque
import os
from time import monotonic
from typing import Callable


class LLMBudget:
    """Admission is synchronous on the API event loop; no waiting queue."""

    def __init__(self, per_minute: int = 20, concurrency: int = 2, clock: Callable[[], float] = monotonic):
        if per_minute < 1 or concurrency < 1:
            raise ValueError("LLM limits must be positive integers")
        self.per_minute = per_minute
        self.concurrency = concurrency
        self.clock = clock
        self.attempts: deque[float] = deque()
        self.in_flight = 0

    @classmethod
    def from_environment(cls) -> "LLMBudget":
        return cls(
            per_minute=int(os.getenv("LLM_REQUESTS_PER_MINUTE", "20")),
            concurrency=int(os.getenv("LLM_MAX_CONCURRENT", "2")),
        )

    def try_acquire(self) -> bool:
        now = self.clock()
        while self.attempts and self.attempts[0] <= now - 60:
            self.attempts.popleft()
        if self.in_flight >= self.concurrency or len(self.attempts) >= self.per_minute:
            return False
        self.attempts.append(now)
        self.in_flight += 1
        return True

    def release(self) -> None:
        self.in_flight -= 1
