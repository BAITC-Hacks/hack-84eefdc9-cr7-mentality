import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { money, validateGid } from "../src/lib/format";
import {
  initialWorkspace,
  workspaceReducer,
} from "../src/features/workspace/types";
import {
  analyzeResponseSchema,
  assistantResponseSchema,
  dashboardSchema,
  graphResponseSchema,
} from "../src/lib/api-schema";
import { ApiError, getDashboard, getGraph, getExportUrl } from "../src/lib/api";
import { demoDashboard, demoGraph, DEMO_ID } from "../src/mocks/analytics";

const examples = JSON.parse(
  readFileSync(
    new URL("../../docs/api-examples.json", import.meta.url),
    "utf8",
  ),
);
test("BACK examples match every runtime response reader", () => {
  analyzeResponseSchema.parse(examples.analyze_response);
  dashboardSchema.parse(examples.dashboard_response);
  graphResponseSchema.parse(examples.graph_response);
  assistantResponseSchema.parse(examples.assistant_response);
});
test("money preserves large decimals and rounds without binary floats", () => {
  assert.equal(
    money("9007199254740993.99").replaceAll(/\s/g, ""),
    "9007199254740993,99₸",
  );
  assert.equal(money("999.995", false).replaceAll(/\s/g, ""), "1000,00");
  assert.equal(money("0.004", false), "0,00");
});
test("gid retains int64 precision and rejects malformed identifiers", () => {
  assert.equal(validateGid("9223372036854775807"), null);
  assert.equal(validateGid("9007199254740993"), null);
  assert.ok(validateGid("9223372036854775808"));
  assert.ok(validateGid("1e3"));
  assert.ok(validateGid(""));
});
test("selecting a gid clears the cluster; a new analysis resets dependent selection", () => {
  const state = {
    ...initialWorkspace("a", "1001"),
    selectedClusterId: 2,
    offset: 20,
    graphHops: 2 as const,
  };
  assert.equal(
    workspaceReducer(state, { type: "select", gid: "9999" }).selectedClusterId,
    null,
  );
  assert.deepEqual(
    workspaceReducer(state, { type: "analysis", id: "b" }),
    initialWorkspace("b", null),
  );
});
test("synthetic fixtures cover isolated, depth4, large gid, paging and truncation", () => {
  dashboardSchema.parse(demoDashboard());
  graphResponseSchema.parse(demoGraph({}));
  const isolate = demoGraph({ focus_gid: "9999" });
  assert.equal(isolate.nodes.length, 1);
  assert.equal(isolate.edges.length, 0);
  assert.ok(isolate.nodes[0].flags.includes("isolated"));
  assert.ok(
    demoGraph({ focus_gid: "1005" }).nodes[0].flags.includes("depth4_censored"),
  );
  assert.equal(
    demoGraph({ focus_gid: "9007199254740993" }).focus_gid,
    "9007199254740993",
  );
  assert.equal(demoDashboard(20).ranking.items.length, 8);
  const cut = demoGraph({ max_nodes: 1 });
  assert.equal(cut.truncated, true);
  assert.equal(cut.nodes[0].gid, "1001");
  assert.throws(() => demoGraph({ focus_gid: "888888" }), {
    code: "GID_NOT_FOUND",
  });
});
test("GET has no JSON header; gid and query params are preserved", async (t) => {
  let calledUrl = "";
  let calledInit: RequestInit | undefined;
  const payload = demoGraph({ focus_gid: "9007199254740993" });
  t.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    calledUrl = url;
    calledInit = init;
    return Response.json(payload);
  });
  await getGraph(DEMO_ID, { focus_gid: "9007199254740993", cluster_id: null });
  assert.equal(
    new URL(calledUrl).searchParams.get("focus_gid"),
    "9007199254740993",
  );
  assert.equal(new URL(calledUrl).searchParams.has("cluster_id"), false);
  assert.equal(new Headers(calledInit?.headers).has("Content-Type"), false);
});
test("API errors stay errors and never silently switch to mock data", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json(examples.error_response, { status: 404 }),
  );
  await assert.rejects(
    getGraph("missing"),
    (e: unknown) =>
      e instanceof ApiError &&
      e.code === "GID_NOT_FOUND" &&
      e.requestId === "req_example_01",
  );
});
test("malformed successful responses surface contract errors", async (t) => {
  t.mock.method(globalThis, "fetch", async () =>
    Response.json({ stats: { n_nodes: 5 } }),
  );
  await assert.rejects(getDashboard("a"), { code: "CONTRACT_MISMATCH" });
});
test("graph rejects dangling references, wrong analysis and missing focus", async (t) => {
  const cases = [
    {
      ...examples.graph_response,
      edges: [{ ...examples.graph_response.edges[0], target: "999999" }],
    },
    { ...examples.graph_response, analysis_id: "wrong" },
    { ...examples.graph_response, focus_gid: "999999" },
  ];
  let index = 0;
  t.mock.method(globalThis, "fetch", async () => Response.json(cases[index++]));
  for (let i = 0; i < cases.length; i++)
    await assert.rejects(getGraph(examples.graph_response.analysis_id), {
      code: "CONTRACT_MISMATCH",
    });
});
test("abort reaches fetch and remains identifiable to the workspace", async (t) => {
  t.mock.method(
    globalThis,
    "fetch",
    async (_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => {
        init.signal?.addEventListener(
          "abort",
          () => reject(new DOMException("aborted", "AbortError")),
          { once: true },
        );
      }),
  );
  const controller = new AbortController();
  const pending = getDashboard("a", {}, controller.signal);
  controller.abort();
  await assert.rejects(pending, { name: "AbortError" });
});
test("export URLs use the analysis and filename whitelist", () => {
  assert.ok(
    getExportUrl("a_one", "nodes_roles.csv").endsWith(
      "/api/v1/analyses/a_one/exports/nodes_roles.csv",
    ),
  );
  assert.throws(() => getExportUrl("a", "../../secret" as "nodes_roles.csv"));
});
