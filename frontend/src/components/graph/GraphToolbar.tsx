"use client";
import { useI18n } from "@/components/preferences/PreferencesProvider";
import { useState } from "react";
import { Search } from "lucide-react";
import type { DashboardResponse } from "@/contracts/api";
import type {
  WorkspaceState,
  WorkspaceAction,
} from "@/features/workspace/types";
import { canonicalGid, validateGid } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export function GraphToolbar({
  state,
  clusters,
  act,
  onSelectGid,
}: {
  state: WorkspaceState;
  clusters: DashboardResponse["clusters"];
  act: (a: WorkspaceAction) => void;
  onSelectGid: (gid: string) => void;
}) {
  const { t } = useI18n("workspace");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  function search(event: React.FormEvent) {
    event.preventDefault();
    const issue = validateGid(query);
    setError(issue ? (/^-?(0|[1-9][0-9]*)$/.test(query.trim()) ? "search.range" : "search.invalid") : null);
    if (!issue) onSelectGid(canonicalGid(query)!);
  }
  return (
    <div className="graph-toolbar">
      <form className="search-form" onSubmit={search}>
        <Search size={16} />
        <Input
          aria-label={t("search.label")}
          placeholder={t("search.placeholder")}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setError(null);
          }}
          inputMode="text"
          aria-invalid={!!error}
          aria-describedby={error ? "gid-error" : undefined}
        />
        <Button type="submit" size="sm" variant="secondary">
          {t("search.action")}
        </Button>
      </form>
      <div className="graph-filters">
        <label>
          <span className="sr-only">{t("filter.cluster")}</span>
          <select
            value={state.selectedClusterId ?? "all"}
            onChange={(e) =>
              act({
                type: "cluster",
                id: e.target.value === "all" ? null : Number(e.target.value),
              })
            }
          >
            <option value="all">{t("filter.allClusters")}</option>
            {clusters.map((c) => (
              <option key={c.cluster_id} value={c.cluster_id}>
                {t("cluster", { id: c.cluster_id })} · {c.n_nodes}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">{t("filter.depth")}</span>
          <select
            value={state.graphHops}
            onChange={(e) =>
              act({ type: "hops", value: Number(e.target.value) as 0 | 1 | 2 })
            }
          >
            <option value={0}>{t("filter.nodeOnly")}</option>
            <option value={1}>{t("filter.oneHop")}</option>
            <option value={2}>{t("filter.twoHops")}</option>
          </select>
        </label>
      </div>
      {error && (
        <p id="gid-error" className="field-error" role="alert">
          {t(error)}
        </p>
      )}
    </div>
  );
}
