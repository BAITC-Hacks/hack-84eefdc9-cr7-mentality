import { test } from "node:test";
import assert from "node:assert/strict";
import cytoscape from "cytoscape";
import {
  initialGraphPositions,
  organicLayout,
  visibleGraphLabels,
} from "../src/components/graph/graph-layout";

test("initial placement is stable across API ordering and preserves int64 gids", () => {
  const nodes = ["9007199254740993", "-17", "9007199254740992", "1001"]
    .map((gid) => ({ gid }));
  const before = structuredClone(nodes);
  const first = initialGraphPositions(nodes);
  assert.deepEqual(first, initialGraphPositions([...nodes].reverse()));
  assert.deepEqual(nodes, before);
  assert.equal(first.size, 4);
  assert.notDeepEqual(first.get(nodes[0].gid), first.get(nodes[2].gid));
  assert.deepEqual(initialGraphPositions([]), new Map());
});

test("250 initial nodes have finite, distinct positions with room for node bodies", () => {
  const positions = [...initialGraphPositions(
    Array.from({ length: 250 }, (_, i) => ({ gid: String(i) })),
  ).values()];
  assert.equal(positions.length, 250);
  for (const [i, a] of positions.entries()) {
    assert.ok(Number.isFinite(a.x) && Number.isFinite(a.y));
    for (const b of positions.slice(i + 1)) {
      assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 50);
    }
  }
});

test("COSE finishes a 250-node graph with disconnected nodes without overlap or lost edges", () => {
  const nodes = Array.from({ length: 250 }, (_, i) => ({ gid: String(i) }));
  const positions = initialGraphPositions(nodes);
  const cy = cytoscape({
    headless: true,
    styleEnabled: true,
    layout: { name: "preset" },
    style: [{ selector: "node", style: { width: 34, height: 34 } }],
    elements: [
      ...nodes.map(({ gid }) => ({ data: { id: gid }, position: { ...positions.get(gid)! } })),
      ...nodes.slice(1, 240).map(({ gid }, i) => ({
        data: { id: `e${gid}`, source: String(Math.floor(i / 3)), target: gid },
      })),
    ],
  });
  try {
    cy.layout(organicLayout).run();
    assert.equal(cy.nodes().length, 250);
    assert.equal(cy.edges().length, 239);
    const first = cy.nodes().map((n) => ({ ...n.position() }));
    for (const [i, a] of first.entries()) {
      assert.ok(Number.isFinite(a.x) && Number.isFinite(a.y));
      for (const b of first.slice(i + 1)) {
        assert.ok(Math.hypot(a.x - b.x, a.y - b.y) >= 34);
      }
    }
    cy.nodes().positions((n) => positions.get(n.id())!);
    cy.layout(organicLayout).run();
    assert.deepEqual(cy.nodes().map((n) => ({ ...n.position() })), first);
  } finally {
    cy.destroy();
  }
});

test("focus label wins collisions; labels avoid other nodes and offscreen positions", () => {
  const labels = visibleGraphLabels([
    { id: "neighbor", x: 140, y: 110, radius: 18, priority: 0 },
    { id: "focus", x: 140, y: 110, radius: 18, priority: 3 },
    { id: "blocked", x: 260, y: 120, radius: 18, priority: 0 },
    { id: "body", x: 260, y: 163, radius: 20, priority: 0 },
    { id: "offscreen", x: -80, y: 100, radius: 18, priority: 0 },
  ], { width: 400, height: 300 });
  assert.ok(labels.has("focus"));
  assert.ok(!labels.has("neighbor"));
  assert.ok(!labels.has("blocked"));
  assert.ok(!labels.has("offscreen"));
});

test("mobile labels stay bounded in a dense graph while retaining focus", () => {
  const nodes = Array.from({ length: 250 }, (_, i) => ({
    id: String(100000 + i),
    x: 30 + (i % 10) * 27,
    y: 80 + Math.floor(i / 10) * 16,
    radius: 5,
    priority: i === 85 ? 3 : 0,
  }));
  const labels = visibleGraphLabels(nodes, { width: 350, height: 540 });
  assert.ok(labels.has("100085"));
  assert.ok(labels.size <= 30);
  assert.deepEqual(labels, visibleGraphLabels([...nodes].reverse(), { width: 350, height: 540 }));
  assert.deepEqual(visibleGraphLabels([], { width: 0, height: 0 }), new Set());
});

test("labels leave room for the mobile control row and desktop control column", () => {
  const labels = visibleGraphLabels([
    { id: "bottom", x: 180, y: 315, radius: 14, priority: 0 },
    { id: "left", x: 36, y: 260, radius: 14, priority: 0 },
    { id: "center", x: 180, y: 180, radius: 14, priority: 0 },
  ], { width: 350, height: 383 });
  assert.deepEqual(labels, new Set(["center"]));
});
