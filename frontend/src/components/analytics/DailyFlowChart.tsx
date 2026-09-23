"use client";
import { useI18n, usePreferences } from "@/components/preferences/PreferencesProvider";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { DashboardResponse } from "@/contracts/api";
import { dateLabel, money } from "@/lib/format";
export function DailyFlowChart({
  data,
}: {
  data: DashboardResponse["charts"]["daily_flow"];
}) {
  const { t, intlLocale } = useI18n("workspace");
  const { theme } = usePreferences();
  const chartColor = theme === "dark" ? "#5ed899" : "#148375";
  const axisColor = theme === "dark" ? "#a6bab2" : "#667772";
  // Number conversion is exclusively for chart coordinates, never for totals.
  const plotted = data.map((day) => ({ ...day, amount: Number(day.sum_kzt) }));
  return (
    <section className="panel flow-panel">
      <div className="panel-heading">
        <div>
          <h2>{t("chart.title")}</h2>
          <p>{t("chart.description")}</p>
        </div>
        <span className="chart-key">
          <i />
          {t("chart.volume")}
        </span>
      </div>
      <div
        className="flow-chart"
        role="img"
        aria-label={t("chart.label")}
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart
            data={plotted}
            margin={{ top: 10, right: 15, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="flowFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={chartColor} stopOpacity={0.19} />
                <stop offset="100%" stopColor={chartColor} stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke={theme === "dark" ? "#344c43" : "#eef0f0"}
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="date"
              tickFormatter={(value) => dateLabel(value, intlLocale)}
              tickLine={false}
              axisLine={false}
              minTickGap={40}
              tick={{ fontSize: 11, fill: axisColor }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={50}
              tick={{ fontSize: 10, fill: axisColor }}
              tickFormatter={(n) =>
                new Intl.NumberFormat(intlLocale, { notation: "compact", maximumFractionDigits: 1 }).format(n)
              }
            />
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="chart-tooltip">
                    <strong>{dateLabel(payload[0].payload.date, intlLocale)}</strong>
                    <span>{money(payload[0].payload.sum_kzt, true, intlLocale)}</span>
                    <small>{t("transactions.count", { count: payload[0].payload.n_tx })}</small>
                  </div>
                ) : null
              }
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke={chartColor}
              strokeWidth={2}
              fill="url(#flowFill)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <details className="chart-data">
        <summary>{t("chart.exact")}</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>{t("date")}</th>
                <th>{t("amount")}</th>
                <th>{t("transactions")}</th>
              </tr>
            </thead>
            <tbody>
              {data.map((day) => (
                <tr key={day.date}>
                  <td>{dateLabel(day.date, intlLocale)}</td>
                  <td>{money(day.sum_kzt, true, intlLocale)}</td>
                  <td>{day.n_tx}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
