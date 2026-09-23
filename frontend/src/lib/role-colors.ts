import type { GraphNode } from "@/contracts/api";
export type Role = GraphNode["role"];
export const roles: Record<
  Role,
  { label: string; color: string; soft: string }
> = {
  coordinator: { label: "Координатор", color: "#8b5cf6", soft: "#f1eafe" },
  consolidator: { label: "Консолидатор", color: "#c99120", soft: "#fcf2d9" },
  distributor: { label: "Распределитель", color: "#4c80e8", soft: "#eaf0ff" },
  transit: { label: "Транзитный", color: "#16a597", soft: "#e2f5f1" },
  terminal: { label: "Конечный", color: "#db729d", soft: "#fceaf2" },
  peripheral: { label: "Периферийный", color: "#8b95a3", soft: "#edf0f3" },
};
export const clusterColor = (id: number) =>
  [
    "#16a597",
    "#8b5cf6",
    "#4c80e8",
    "#c99120",
    "#db729d",
    "#748b4b",
    "#c87550",
    "#6576a1",
  ][id % 8];
