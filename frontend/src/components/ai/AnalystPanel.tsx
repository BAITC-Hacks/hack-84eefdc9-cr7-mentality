"use client";
// F2 handoff stub. F2 owns this file after the initial scaffold.
import { Sparkles } from "lucide-react";
import type { AnalystPanelProps } from "@/features/workspace/types";
export function AnalystPanel({ focusGids }: AnalystPanelProps) {
  return (
    <section className="analyst-placeholder">
      <h3>
        <Sparkles size={16} />
        Помощник аналитика<span className="badge">F2</span>
      </h3>
      <p>
        Место для объяснения выбранного узла {focusGids.join(", ")}. Панель
        подключается вторым фронтендером.
      </p>
    </section>
  );
}
export default AnalystPanel;
