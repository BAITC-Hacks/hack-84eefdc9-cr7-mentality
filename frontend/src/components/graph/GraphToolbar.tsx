import { useState } from "react";
import { ArrowRight, Search } from "lucide-react";
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
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  function search(event: React.FormEvent) {
    event.preventDefault();
    const issue = validateGid(query);
    setError(issue);
    if (!issue) onSelectGid(canonicalGid(query)!);
  }
  return (
    <div className="graph-toolbar">
      <form className="search-form" onSubmit={search}>
        <Search size={16} />
        <Input
          aria-label="Поиск узла по gid"
          placeholder="Найти любой gid…"
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
          <ArrowRight size={16} aria-hidden="true" /><span className="sr-only">Найти узел</span>
        </Button>
      </form>
      <div className="graph-filters">
        <label>
          <span className="sr-only">Глубина окрестности</span>
          <select aria-label="Глубина окрестности" value={state.graphHops} onChange={(e) => act({ type: "hops", value: Number(e.target.value) as 0 | 1 | 2 })}>
            <option value={0}>Только узел</option>
            <option value={1}>1 шаг</option>
            <option value={2}>2 шага</option>
          </select>
        </label>
        <div className="segmented" role="group" aria-label="Окраска графа">
          <button type="button" aria-pressed={state.colorBy === "role"} onClick={() => act({ type: "color", value: "role" })}>Роли</button>
          <button type="button" aria-pressed={state.colorBy === "cluster"} onClick={() => act({ type: "color", value: "cluster" })}>Кластеры</button>
        </div>
        <label>
          <span className="sr-only">Кластер</span>
          <select
            aria-label="Кластер"
            value={state.selectedClusterId ?? "all"}
            onChange={(e) =>
              act({
                type: "cluster",
                id: e.target.value === "all" ? null : Number(e.target.value),
              })
            }
          >
            <option value="all">Все кластеры</option>
            {clusters.map((c) => (
              <option key={c.cluster_id} value={c.cluster_id}>
                Кластер {c.cluster_id} · {c.n_nodes}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <p id="gid-error" className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
