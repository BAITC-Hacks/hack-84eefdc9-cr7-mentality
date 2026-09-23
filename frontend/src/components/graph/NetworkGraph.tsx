"use client";
import { useEffect, useRef, useState } from "react";
import cytoscape, { type Core } from "cytoscape";
import { Maximize, Minus, Plus } from "lucide-react";
import type { GraphResponse } from "@/contracts/api";
import { clusterColor, roles } from "@/lib/role-colors";
import { money } from "@/lib/format";
import { Button } from "@/components/ui/button";

function fitGraph(cy: Core) {
  cy.fit(undefined, 44);
  if (cy.zoom() > 1.35) {
    cy.zoom(1.35);
    cy.center();
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
  const [edgeHint, setEdgeHint] = useState<string | null>(null);
  useEffect(() => {
    callback.current = onSelectGid;
  }, [onSelectGid]);
  useEffect(() => {
    if (!container.current) return;
    const labeled = new Set([data.focus_gid]);
    data.edges.forEach((edge) => {
      if (edge.source === data.focus_gid) labeled.add(edge.target);
      if (edge.target === data.focus_gid) labeled.add(edge.source);
    });
    const cy = cytoscape({
      container: container.current,
      minZoom: 0.2,
      maxZoom: 3,
      boxSelectionEnabled: false,
      autounselectify: true,
      elements: [
        ...data.nodes.map((n) => ({
          data: {
            id: n.gid,
            label: labeled.has(n.gid) ? n.gid : "",
            roleColor: roles[n.role].color,
            clusterColor: clusterColor(n.cluster_id),
            size: n.gid === data.focus_gid ? 54 : 28 + n.priority_score * 14,
          },
          classes: [
            n.gid === data.focus_gid ? "focus" : "",
            n.is_seed ? "seed" : "",
            n.flags.includes("depth4_censored") ? "censored" : "",
          ].join(" "),
        })),
        ...data.edges.map((e, i) => ({
          data: {
            id: `edge:${i}`,
            source: e.source,
            target: e.target,
            amount: e.sum_kzt,
            n_tx: e.n_tx,
          },
        })),
      ],
      style: [
        {
          selector: "node",
          style: {
            "background-color": "data(roleColor)",
            "background-opacity": 0.2,
            "border-color": "data(roleColor)",
            "border-width": 1.7,
            width: "data(size)",
            height: "data(size)",
            label: "data(label)",
            "font-size": 10,
            color: "#41534e",
            "font-family": "Segoe UI, sans-serif",
            "text-valign": "bottom",
            "text-margin-y": 7,
            "text-background-color": "#fafcfb",
            "text-background-opacity": 0.9,
            "text-background-padding": "2px",
          },
        },
        {
          selector: "node.focus",
          style: {
            "border-width": 3,
            "font-weight": "bold",
            "font-size": 12,
            "background-opacity": 0.3,
          },
        },
        {
          selector: "node.seed",
          style: { "border-width": 3.5, "border-color": "#345c52" },
        },
        {
          selector: "node.censored",
          style: { "border-style": "dashed", "border-width": 2.5 },
        },
        {
          selector: "edge",
          style: {
            width: 1.6,
            "line-color": "#bac9c0",
            "target-arrow-color": "#7f988a",
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            "arrow-scale": 1.1,
            opacity: 0.95,
          },
        },
        {
          selector: "edge.hover",
          style: {
            width: 2.5,
            "line-color": "#138576",
            "target-arrow-color": "#138576",
            opacity: 1,
          },
        },
      ],
      layout: {
        name: "concentric",
        concentric: (node) => (node.id() === data.focus_gid ? 2 : 1),
        levelWidth: () => 1,
        minNodeSpacing: 27,
        padding: 48,
        animate: false,
      },
    });
    instance.current = cy;
    cy.on("tap", "node", (event) => callback.current(event.target.id()));
    cy.on("mouseover", "edge", (event) => {
      event.target.addClass("hover");
      setEdgeHint(
        `${event.target.data("source")} → ${event.target.data("target")} · ${money(event.target.data("amount"))} · ${event.target.data("n_tx")} транзакций`,
      );
    });
    cy.on("mouseout", "edge", (event) => {
      event.target.removeClass("hover");
      setEdgeHint(null);
    });
    const observer = new ResizeObserver(() => {
      cy.resize();
      fitGraph(cy);
    });
    observer.observe(container.current);
    return () => {
      observer.disconnect();
      cy.destroy();
      instance.current = null;
    };
  }, [data]);
  useEffect(() => {
    const cy = instance.current;
    if (!cy) return;
    cy.batch(() =>
      cy.nodes().forEach((node) => {
        const color = node.data(
          colorBy === "role" ? "roleColor" : "clusterColor",
        );
        node.style("background-color", color);
        node.style("border-color", node.hasClass("seed") ? "#345c52" : color);
      }),
    );
  }, [colorBy, data]);
  const zoom = (factor: number) => {
    const cy = instance.current;
    if (cy)
      cy.zoom({
        level: cy.zoom() * factor,
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
        <span>
          <i />
          Локальная окрестность
        </span>
        <small>
          {data.nodes.length} узлов · {data.edges.length} связей
        </small>
      </div>
      <div className="zoom-controls">
        <Button
          variant="outline"
          size="icon"
          aria-label="Увеличить граф"
          onClick={() => zoom(1.2)}
        >
          <Plus size={17} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Уменьшить граф"
          onClick={() => zoom(0.8)}
        >
          <Minus size={17} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          aria-label="Показать весь подграф"
          onClick={() => {
            if (instance.current) fitGraph(instance.current);
          }}
        >
          <Maximize size={16} />
        </Button>
      </div>
      {edgeHint && (
        <div className="edge-hint" role="status">
          {edgeHint}
        </div>
      )}
      {data.edges.length === 0 && (
        <p className="graph-empty-note">
          {data.nodes[0]?.flags.includes("isolated")
            ? "У этого узла нет наблюдаемых связей."
            : "В выбранной окрестности нет связей. Попробуйте увеличить число переходов."}
        </p>
      )}
    </div>
  );
}
