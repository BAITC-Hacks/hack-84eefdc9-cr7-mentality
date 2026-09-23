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
}: {
  data: DashboardResponse;
  selectedGid: string | null;
  onSelectGid: (gid: string) => void;
  onPage: (offset: number) => void;
}) {
  return (
    <section
      className="panel priority-panel"
      aria-label="Рейтинг приоритета проверки"
    >
      <div className="panel-heading">
        <div>
          <h2>
            Приоритет проверки{" "}
            <span className="count-tag">{data.ranking.total}</span>
          </h2>
          <p>Узлы, с которых стоит начать</p>
        </div>
        <ArrowDownWideNarrow size={18} />
      </div>
      <div className="ranking-head">
        <span>УЗЕЛ / РОЛЬ</span>
        <span>SCORE</span>
      </div>
      <div className="ranking-list">
        {data.ranking.items.length === 0 ? (
          <p className="empty-text">В этом анализе нет узлов.</p>
        ) : (
          data.ranking.items.map((node) => (
            <button
              key={node.gid}
              className={`ranking-row ${selectedGid === node.gid ? "selected" : ""}`}
              onClick={() => onSelectGid(node.gid)}
              aria-pressed={selectedGid === node.gid}
              title={node.why}
            >
              <span className="rank">{String(node.rank).padStart(2, "0")}</span>
              <span className="rank-node">
                <strong className="mono">{node.gid}</strong>
                <span>
                  <i style={{ background: roles[node.role].color }} />
                  {roles[node.role].label}
                </span>
              </span>
              <span className="rank-score">
                {scoreLabel(node.priority_score)}
                <MoveUpRight size={12} />
              </span>
            </button>
          ))
        )}
      </div>
      <div className="pagination">
        <span>
          {data.ranking.total ? data.ranking.offset + 1 : 0}–
          {Math.min(
            data.ranking.offset + data.ranking.items.length,
            data.ranking.total,
          )}{" "}
          из {data.ranking.total}
        </span>
        <div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Предыдущие узлы"
            disabled={data.ranking.offset === 0}
            onClick={() => onPage(data.ranking.offset - data.ranking.limit)}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Следующие узлы"
            disabled={
              data.ranking.offset + data.ranking.limit >= data.ranking.total
            }
            onClick={() => onPage(data.ranking.offset + data.ranking.limit)}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
      <p className="panel-footnote">Score — приоритет ручной проверки.</p>
    </section>
  );
}
