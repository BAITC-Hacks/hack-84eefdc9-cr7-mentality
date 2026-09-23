"use client";
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
  // Number conversion is exclusively for chart coordinates, never for totals.
  const plotted = data.map((day) => ({ ...day, amount: Number(day.sum_kzt) }));
  return (
    <section className="panel flow-panel">
      <div className="panel-heading">
        <div>
          <h2>Динамика переводов</h2>
          <p>Наблюдаемые суммы по дням</p>
        </div>
        <span className="chart-key">
          <i />
          Объём, ₸
        </span>
      </div>
      <div
        className="flow-chart"
        role="img"
        aria-label="График объёма переводов по дням. Точные значения доступны в таблице ниже."
      >
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <AreaChart
            data={plotted}
            margin={{ top: 10, right: 15, bottom: 0, left: 0 }}
          >
            <defs>
              <linearGradient id="flowFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#148375" stopOpacity={0.19} />
                <stop offset="100%" stopColor="#148375" stopOpacity={0.01} />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="#eef0f0"
              strokeDasharray="3 3"
            />
            <XAxis
              dataKey="date"
              tickFormatter={dateLabel}
              tickLine={false}
              axisLine={false}
              minTickGap={40}
              tick={{ fontSize: 11, fill: "#7c8785" }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              width={50}
              tick={{ fontSize: 10, fill: "#7c8785" }}
              tickFormatter={(n) =>
                n >= 1000000
                  ? `${(n / 1000000).toFixed(1)}м`
                  : n >= 1000
                    ? `${Math.round(n / 1000)}к`
                    : String(n)
              }
            />
            <Tooltip
              content={({ active, payload }) =>
                active && payload?.length ? (
                  <div className="chart-tooltip">
                    <strong>{dateLabel(payload[0].payload.date)}</strong>
                    <span>{money(payload[0].payload.sum_kzt)}</span>
                    <small>{payload[0].payload.n_tx} транзакций</small>
                  </div>
                ) : null
              }
            />
            <Area
              type="monotone"
              dataKey="amount"
              stroke="#148375"
              strokeWidth={2}
              fill="url(#flowFill)"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <details className="chart-data">
        <summary>Точные значения по дням</summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Сумма</th>
                <th>Транзакций</th>
              </tr>
            </thead>
            <tbody>
              {data.map((day) => (
                <tr key={day.date}>
                  <td>{dateLabel(day.date)}</td>
                  <td>{money(day.sum_kzt)}</td>
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
