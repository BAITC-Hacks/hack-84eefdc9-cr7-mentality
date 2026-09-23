"use client";
import { useI18n } from "@/components/preferences/PreferencesProvider";
import type { GraphResponse } from "@/contracts/api";
import { clusterColor, roles, type Role } from "@/lib/role-colors";
export function GraphLegend({
  colorBy,
  data,
}: {
  colorBy: "role" | "cluster";
  data?: GraphResponse;
}) {
  const { t } = useI18n("workspace");
  return (
    <div className="graph-legend">
      <div className="legend-colors">
        {colorBy === "role"
          ? (Object.keys(roles) as Role[]).map((role) => (
              <span key={role}>
                <i style={{ background: roles[role].color }} />
                {t(`role.${role}`)}
              </span>
            ))
          : [...new Set(data?.nodes.map((n) => n.cluster_id) ?? [])].map(
              (id) => (
                <span key={id}>
                  <i style={{ background: clusterColor(id) }} />
                  {t("cluster", { id })}
                </span>
              ),
            )}
      </div>
      <div className="legend-outline">
        <span>
          <i className="legend-seed" />
          {t("legend.seed")}
        </span>
        <span>
          <i className="legend-depth" />
          {t("legend.depth")}
        </span>
        <span>{t("legend.direction")}</span>
      </div>
    </div>
  );
}
