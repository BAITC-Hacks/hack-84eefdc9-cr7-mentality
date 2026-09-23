"use client";
import { useI18n } from "@/components/preferences/PreferencesProvider";
import {
  ArrowDownWideNarrow,
  ChevronLeft,
  ChevronRight,
  MoveUpRight,
} from "lucide-react";
import type { DashboardResponse } from "@/contracts/api";
import { roles } from "@/lib/role-colors";
import { scoreLabel } from "@/lib/format";
import { Button } from "@/components/ui/button";
export function PriorityTable({
  data,
  selectedGid,
  onSelectGid,
  onPage,
  isDemo = false,
}: {
  data: DashboardResponse;
  isDemo?: boolean;
  selectedGid: string | null;
  onSelectGid: (gid: string) => void;
  onPage: (offset: number) => void;
}) {
  const { t, intlLocale } = useI18n("workspace");
  return (
    <section
      className="panel priority-panel"
      aria-label={t("ranking.label")}
    >
      <div className="panel-heading">
        <div>
          <h2>
            {t("ranking.title")}{" "}
            <span className="count-tag">{data.ranking.total}</span>
          </h2>
          <p>{t("ranking.description")}</p>
        </div>
        <ArrowDownWideNarrow size={18} />
      </div>
      <div className="ranking-head">
        <span>{t("ranking.nodeRole")}</span>
        <span>{t("ranking.score")}</span>
      </div>
      <div className="ranking-list">
        {data.ranking.items.length === 0 ? (
          <p className="empty-text">{t("ranking.empty")}</p>
        ) : (
          data.ranking.items.map((node) => (
            <button
              key={node.gid}
              className={`ranking-row ${selectedGid === node.gid ? "selected" : ""}`}
              onClick={() => onSelectGid(node.gid)}
              aria-pressed={selectedGid === node.gid}
              title={isDemo ? t(node.priority_score === 0 ? "graph.isolated" : "demo.why") : node.why}
            >
              <span className="rank">{String(node.rank).padStart(2, "0")}</span>
              <span className="rank-node">
                <strong className="mono">{node.gid}</strong>
                <span>
                  <i style={{ background: roles[node.role].color }} />
                  {t(`role.${node.role}`)}
                </span>
              </span>
              <span className="rank-score">
                {scoreLabel(node.priority_score, intlLocale)}
                <MoveUpRight size={12} />
              </span>
            </button>
          ))
        )}
      </div>
      <div className="pagination">
        <span>
          {t("ranking.page", { start: data.ranking.total ? data.ranking.offset + 1 : 0, end: Math.min(data.ranking.offset + data.ranking.items.length, data.ranking.total), total: data.ranking.total })}
        </span>
        <div>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("ranking.previous")}
            disabled={data.ranking.offset === 0}
            onClick={() => onPage(data.ranking.offset - data.ranking.limit)}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("ranking.next")}
            disabled={
              data.ranking.offset + data.ranking.limit >= data.ranking.total
            }
            onClick={() => onPage(data.ranking.offset + data.ranking.limit)}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
      <p className="panel-footnote">{t("ranking.note")}</p>
    </section>
  );
}
