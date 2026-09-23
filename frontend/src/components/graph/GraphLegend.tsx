import type { GraphResponse } from "@/contracts/api";
import { clusterColor, roles, type Role } from "@/lib/role-colors";
export function GraphLegend({
  colorBy,
  data,
}: {
  colorBy: "role" | "cluster";
  data?: GraphResponse;
}) {
  return (
    <div className="graph-legend">
      <div className="legend-colors">
        {colorBy === "role"
          ? (Object.keys(roles) as Role[]).map((role) => (
              <span key={role}>
                <i style={{ background: roles[role].color }} />
                {roles[role].label}
              </span>
            ))
          : [...new Set(data?.nodes.map((n) => n.cluster_id) ?? [])].map(
              (id) => (
                <span key={id}>
                  <i style={{ background: clusterColor(id) }} />
                  Кластер {id}
                </span>
              ),
            )}
      </div>
      <div className="legend-outline">
        <span>
          <i className="legend-seed" />
          Исходный seed
        </span>
        <span>
          <i className="legend-depth" />
          Обрыв на 4-м колене
        </span>
        <span>→ Направление перевода</span>
      </div>
    </div>
  );
}
