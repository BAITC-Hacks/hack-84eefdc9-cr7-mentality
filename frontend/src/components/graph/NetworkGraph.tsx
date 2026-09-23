"use client";
import { useEffect, useRef, useState } from "react";
import cytoscape, { type Core } from "cytoscape";
import { Maximize, Minus, Plus, RotateCcw } from "lucide-react";
import type { GraphResponse } from "@/contracts/api";
import { clusterColor, roles } from "@/lib/role-colors";
import { money } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { initialGraphPositions, organicLayout, visibleGraphLabels } from "./graph-layout";

function fitGraph(cy: Core, animate = false) {
  if (cy.nodes().empty() || !cy.width() || !cy.height()) return;
  // Labels use screen-sized type; excluding them prevents zoom/fit feedback.
  const bounds = cy.nodes().boundingBox({ includeLabels: false, includeOverlays: false });
  const padding = Math.min(64, cy.width() * 0.14);
  const zoom = Math.max(cy.minZoom(), Math.min(1.35,
    (cy.width() - padding * 2) / (bounds.w + 32),
    (cy.height() - padding * 2) / (bounds.h + 32),
  ));
  const pan = {
    x: cy.width() / 2 - (bounds.x1 + bounds.x2) / 2 * zoom,
    y: cy.height() / 2 - (bounds.y1 + bounds.y2) / 2 * zoom,
  };
  cy.stop();
  if (animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    cy.animate({ zoom, pan }, { duration: 220, easing: "ease-out-cubic" });
  } else {
    cy.viewport({ zoom, pan });
  }
}

export default function NetworkGraph({
  data,
  colorBy,
  onSelectGid,
}: {
  data: GraphResponse;
  colorBy: "role" | "cluster";
  onSelectGid: (gid: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<Core | null>(null);
  const callback = useRef(onSelectGid);
  const viewportChanged = useRef(false);
  const resetPositions = useRef<(() => void) | null>(null);
  const [edgeHint, setEdgeHint] = useState<{ graph: GraphResponse; text: string } | null>(null);
  useEffect(() => {
    callback.current = onSelectGid;
  }, [onSelectGid]);
  useEffect(() => {
    if (!container.current) return;
    const positions = initialGraphPositions(data.nodes);
    const sortedNodes = [...data.nodes].sort((a, b) => a.gid < b.gid ? -1 : a.gid > b.gid ? 1 : 0);
    const sortedEdges = [...data.edges].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
    viewportChanged.current = false;
    const cy = cytoscape({
      container: container.current,
      minZoom: 0.02,
      maxZoom: 3,
      boxSelectionEnabled: false,
      autounselectify: true,
      elements: [
        ...sortedNodes.map((n) => ({
          position: { ...positions.get(n.gid)! },
          data: {
            id: n.gid,
            label: n.gid,
            roleColor: roles[n.role].color,
            clusterColor: clusterColor(n.cluster_id),
            priority: n.priority_score,
            size: n.gid === data.focus_gid ? 58 : 26 + Math.max(0, Math.min(1, n.priority_score)) * 16,
          },
          classes: [
            n.gid === data.focus_gid ? "focus" : "",
            n.is_seed ? "seed" : "",
            n.flags.includes("depth4_censored") ? "censored" : "",
          ].join(" "),
        })),
        ...sortedEdges.map((e) => ({
          data: { id: `edge:${e.id}`, source: e.source, target: e.target, amount: e.sum_kzt, n_tx: e.n_tx },
          classes: e.source === data.focus_gid || e.target === data.focus_gid ? "focus-edge" : "",
        })),
      ],
      style: [
        {
          selector: "node",
          style: {
            "background-color": "data(roleColor)",
            "background-opacity": 1,
            "border-color": "#ffffff",
            "border-width": 2,
            width: "data(size)",
            height: "data(size)",
            label: "",
            "font-size": 11,
            color: "#343b39",
            "font-family": "Arial, sans-serif",
            "text-valign": "bottom",
            "text-margin-y": 8,
            "text-background-color": "#ffffff",
            "text-background-opacity": 0.94,
            "text-background-padding": "3px",
            "text-wrap": "ellipsis",
            "text-max-width": "148px",
            "overlay-opacity": 0,
          },
        },
        { selector: "node.label-visible", style: { label: "data(label)" } },
        {
          selector: "node.seed",
          style: { "border-width": 3, "border-color": "#182D2A" },
        },
        {
          selector: "node.censored",
          style: { "border-style": "dashed", "border-width": 3, "border-color": "#626967" },
        },
        {
          selector: "node.focus",
          style: {
            "font-weight": "bold",
            "z-index": 5,
            // Cytoscape 3.34 supports outlines; the older @types omit these keys.
            ...{ "outline-color": "#182D2A", "outline-width": 6, "outline-offset": 5, "outline-style": "double" },
          },
        },
        {
          selector: "node.hover",
          style: { "underlay-color": "#182D2A", "underlay-opacity": 0.09, "underlay-padding": 8, "underlay-shape": "ellipse" },
        },
        {
          selector: "edge",
          style: {
            width: 1.25,
            "line-color": "#aeb6b2",
            "target-arrow-color": "#8b9690",
            "target-arrow-shape": "triangle",
            "curve-style": "unbundled-bezier",
            "control-point-distances": 20,
            "control-point-weights": 0.5,
            "arrow-scale": 0.85,
            opacity: 0.68,
          },
        },
        {
          selector: "edge.focus-edge",
          style: { width: 1.65, "line-color": "#727d77", "target-arrow-color": "#727d77", opacity: 0.85 },
        },
        {
          selector: "edge.hover, edge.path",
          style: { width: 2.5, "line-color": "#343d38", "target-arrow-color": "#343d38", opacity: 1, "z-index": 4 },
        },
      ],
      layout: { name: "preset", fit: false },
    });
    instance.current = cy;
    let labelFrame = 0;
    let resizeFrame = 0;
    const updateLabels = () => {
      labelFrame = 0;
      const zoom = cy.zoom();
      const visible = visibleGraphLabels(cy.nodes().map((node) => ({
        id: node.id(),
        ...node.renderedPosition(),
        radius: node.renderedOuterWidth() / 2 + (node.hasClass("focus") ? 8 * zoom : 0),
        priority: node.hasClass("focus") ? 3 : node.hasClass("hover") ? 2 : node.data("priority"),
      })), { width: cy.width(), height: cy.height() });
      cy.batch(() => cy.nodes().forEach((node) => {
        node.toggleClass("label-visible", visible.has(node.id()));
        node.style({
          "font-size": (node.hasClass("focus") ? 12 : 11) / zoom,
          "text-max-width": 148 / zoom,
          "text-margin-y": 8 / zoom + (node.hasClass("focus") ? 8 : 0),
          "text-background-padding": `${3 / zoom}px`,
        });
      }));
    };
    const scheduleLabels = () => {
      if (!labelFrame) labelFrame = requestAnimationFrame(updateLabels);
    };
    cy.on("tap", "node", (event) => callback.current(event.target.id()));
    cy.on("mouseover", "node", (event) => {
      const node = event.target;
      node.addClass("hover");
      const focus = data.focus_gid ? cy.getElementById(data.focus_gid) : cy.collection();
      if (focus.nonempty() && !focus.same(node)) {
        const forward = cy.elements().aStar({ root: focus, goal: node, directed: true });
        const path = forward.found ? forward : cy.elements().aStar({ root: node, goal: focus, directed: true });
        if (path.found) path.path.edges().addClass("path");
      }
      scheduleLabels();
    });
    cy.on("mouseout", "node", (event) => {
      event.target.removeClass("hover");
      cy.edges().removeClass("path");
      scheduleLabels();
    });
    const showEdgeHint = (event: cytoscape.EventObject) => {
      cy.edges().removeClass("hover");
      event.target.addClass("hover");
      setEdgeHint({ graph: data, text:
        `${event.target.data("source")} → ${event.target.data("target")} · ${money(event.target.data("amount"))} · ${event.target.data("n_tx")} транзакций`,
      });
    };
    cy.on("mouseover tap", "edge", showEdgeHint);
    cy.on("mouseout", "edge", (event) => {
      event.target.removeClass("hover");
      setEdgeHint(null);
    });
    cy.on("tap", (event) => {
      if (event.target === cy) {
        cy.edges().removeClass("hover");
        setEdgeHint(null);
      }
    });
    cy.on("dragpan scrollzoom pinchzoom grab", () => {
      viewportChanged.current = true;
      cy.stop();
    });
    cy.on("zoom pan position", scheduleLabels);
    cy.layout(organicLayout).run();
    const settledPositions = new Map(cy.nodes().map((node) => [node.id(), { ...node.position() }]));
    resetPositions.current = () => {
      cy.nodes().positions((node) => settledPositions.get(node.id())!);
      viewportChanged.current = false;
      fitGraph(cy, true);
    };
    fitGraph(cy);
    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      cy.zoom({ level: cy.zoom() * 0.94, renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 } });
      fitGraph(cy, true);
    }
    scheduleLabels();
    let previousSize = { width: cy.width(), height: cy.height() };
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(resizeFrame);
      resizeFrame = requestAnimationFrame(() => {
        const pan = cy.pan();
        cy.resize();
        const size = { width: cy.width(), height: cy.height() };
        if (!size.width || !size.height) return;
        if (size.width === previousSize.width && size.height === previousSize.height) return;
        if (viewportChanged.current) {
          cy.pan({ x: pan.x + (size.width - previousSize.width) / 2, y: pan.y + (size.height - previousSize.height) / 2 });
        } else {
          fitGraph(cy);
        }
        previousSize = size;
        scheduleLabels();
      });
    });
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(labelFrame);
      cancelAnimationFrame(resizeFrame);
      cy.destroy();
      instance.current = null;
      resetPositions.current = null;
    };
  }, [data]);
  useEffect(() => {
    const cy = instance.current;
    if (!cy) return;
    cy.batch(() => cy.nodes().forEach((node) => {
      node.style("background-color", node.data(colorBy === "role" ? "roleColor" : "clusterColor"));
    }));
  }, [colorBy, data]);
  const zoom = (factor: number) => {
    const cy = instance.current;
    if (!cy) return;
    viewportChanged.current = true;
    cy.stop();
    cy.zoom({
      level: Math.min(cy.maxZoom(), Math.max(cy.minZoom(), cy.zoom() * factor)),
      renderedPosition: { x: cy.width() / 2, y: cy.height() / 2 },
    });
  };
  return (
    <div className="network-viewport">
      <div
        ref={container}
        className="network-canvas"
        role="img"
        aria-label={`Направленный граф: ${data.nodes.length} узлов, ${data.edges.length} связей. Выбрать узел с клавиатуры можно в списке под графом.`}
      />
      <div className="graph-overlay">
        <span><i />Локальная окрестность</span>
        <small>{data.nodes.length} узлов · {data.edges.length} связей</small>
      </div>
      <div className="zoom-controls">
        <Button variant="outline" size="icon" aria-label="Увеличить граф" title="Увеличить граф" onClick={() => zoom(1.2)}>
          <Plus size={17} />
        </Button>
        <Button variant="outline" size="icon" aria-label="Уменьшить граф" title="Уменьшить граф" onClick={() => zoom(1 / 1.2)}>
          <Minus size={17} />
        </Button>
        <Button variant="outline" size="icon" aria-label="Показать весь подграф" title="Показать весь подграф" onClick={() => {
          viewportChanged.current = false;
          if (instance.current) fitGraph(instance.current, true);
        }}>
          <Maximize size={16} />
        </Button>
        <Button variant="outline" size="icon" aria-label="Сбросить расположение графа" title="Сбросить расположение графа" onClick={() => resetPositions.current?.()}>
          <RotateCcw size={16} />
        </Button>
      </div>
      {edgeHint?.graph === data && (
        <div className="edge-hint" role="status" style={{ left: 56, right: 12, bottom: 64 }}>{edgeHint.text}</div>
      )}
      {data.edges.length === 0 && (
        <p className="graph-empty-note" style={{ left: 56, right: 16, bottom: 64, margin: 0 }}>
          {data.nodes[0]?.flags.includes("isolated")
            ? "У этого узла нет наблюдаемых связей."
            : "В выбранной окрестности нет связей. Попробуйте увеличить число переходов."}
        </p>
      )}
    </div>
  );
}
