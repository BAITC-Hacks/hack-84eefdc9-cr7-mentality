import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { startAnalysis, fetchDashboard, exportDownloadUrl } from "../src/lib/analysis-api";
import { postAssistant } from "../src/lib/assistant-api";

const examples = JSON.parse(
  readFileSync(new URL("../../docs/api-examples.json", import.meta.url), "utf8"),
);

test("landing, exports and assistant use the backend origin with and without configuration", async (t) => {
  const original = process.env.NEXT_PUBLIC_API_BASE_URL;
  const urls: string[] = [];
  t.mock.method(globalThis, "fetch", async (url: string) => {
    urls.push(url);
    return Response.json(
      url.endsWith("/assistant") ? examples.assistant_response
        : url.endsWith("/analyze") ? examples.analyze_response
          : examples.dashboard_response,
    );
  });
  try {
    for (const configured of [undefined, "https://api.example.test/api/v1/"]) {
      if (configured === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
      else process.env.NEXT_PUBLIC_API_BASE_URL = configured;
      urls.length = 0;
      const origin = configured ? "https://api.example.test" : "http://localhost:8000";
      const signal = new AbortController().signal;
      await startAnalysis(signal);
      await fetchDashboard("a_0123456789abcdef", signal);
      await postAssistant("a_0123456789abcdef", { question: "Что проверить?", focus_gids: ["123"] }, signal);
      assert.deepEqual(urls, [
        `${origin}/api/v1/analyze`,
        `${origin}/api/v1/analyses/a_0123456789abcdef?offset=0&limit=20`,
        `${origin}/api/v1/analyses/a_0123456789abcdef/assistant`,
      ]);
      assert.equal(exportDownloadUrl("a_0123456789abcdef", "nodes_roles.csv"),
        `${origin}/api/v1/analyses/a_0123456789abcdef/exports/nodes_roles.csv`);
    }
  } finally {
    if (original === undefined) delete process.env.NEXT_PUBLIC_API_BASE_URL;
    else process.env.NEXT_PUBLIC_API_BASE_URL = original;
  }
});
