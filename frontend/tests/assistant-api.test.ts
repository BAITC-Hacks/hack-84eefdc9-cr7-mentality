import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { postAssistant } from "../src/lib/assistant-api";

const examples = JSON.parse(
  readFileSync(new URL("../../docs/api-examples.json", import.meta.url), "utf8"),
);
const response = examples.assistant_response;
const request = { question: "Explain this node", focus_gids: ["9007199254740993"] };

test("assistant preserves the question, large gids and a validated live answer", async (t) => {
  let sent: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
    sent = init;
    return Response.json(response);
  });
  const result = await postAssistant(response.analysis_id, request, new AbortController().signal);
  assert.equal(sent?.method, "POST");
  assert.equal(new Headers(sent?.headers).get("Content-Type"), "application/json");
  assert.deepEqual(JSON.parse(String(sent?.body)), request);
  assert.deepEqual(result, response);
});

test("assistant preserves a factual fallback and its reason", async (t) => {
  const fallback = { ...response, mode: "fallback", fallback_reason: "disabled" };
  t.mock.method(globalThis, "fetch", async () => Response.json(fallback));
  assert.deepEqual(
    await postAssistant(response.analysis_id, request, new AbortController().signal),
    fallback,
  );
});

test("assistant rejects successful responses that would crash the answer panel", async (t) => {
  let payload: unknown = {};
  t.mock.method(globalThis, "fetch", async () => Response.json(payload));
  for (payload of [{}, { ...response, answer: { summary: "Missing required lists" } }]) {
    await assert.rejects(
      postAssistant(response.analysis_id, request, new AbortController().signal),
      { code: "CONTRACT_MISMATCH" },
    );
  }
});

test("assistant reports invalid JSON as a contract error", async (t) => {
  t.mock.method(globalThis, "fetch", async () => new Response("not json", { status: 200 }));
  await assert.rejects(
    postAssistant(response.analysis_id, request, new AbortController().signal),
    { code: "CONTRACT_MISMATCH" },
  );
});

test("assistant preserves backend error details instead of accepting them as an answer", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json(examples.error_response, { status: 404 }));
  await assert.rejects(
    postAssistant(response.analysis_id, request, new AbortController().signal),
    { code: "GID_NOT_FOUND", status: 404, requestId: "req_example_01" },
  );
});

test("assistant cancellation reaches the pending request", async (t) => {
  t.mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) =>
    new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    }),
  );
  const controller = new AbortController();
  const pending = postAssistant(response.analysis_id, request, controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
});

test("assistant stops a stalled request after 25 seconds with a retryable timeout", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  let requestSignal: AbortSignal | null | undefined;
  t.mock.method(globalThis, "fetch", async (_url: string, init: RequestInit) => {
    requestSignal = init.signal;
    return new Promise((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    });
  });
  const controller = new AbortController();
  const pending = postAssistant(response.analysis_id, request, controller.signal);
  try {
    t.mock.timers.tick(25_000);
    assert.equal(requestSignal?.aborted, true);
    await assert.rejects(pending, { code: "TIMEOUT", retryable: true });
    assert.equal(controller.signal.aborted, false);
  } finally {
    controller.abort();
    await pending.catch(() => undefined);
  }
});
