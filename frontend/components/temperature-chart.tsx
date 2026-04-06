"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { SensorRecord } from "@/types/api";

type TemperatureChartProps = {
  records: SensorRecord[];
};

function formatLabel(timestamp: string) {
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:00`;
}

export function TemperatureChart({ records }: TemperatureChartProps) {
  const chartData = [...records]
    .reverse()
    .map((record) => ({
      label: formatLabel(record.timestamp),
      value: Number(record.value.toFixed(2)),
    }));

  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ left: 4, right: 18, top: 18, bottom: 4 }}>
          <CartesianGrid stroke="rgba(19, 38, 29, 0.08)" strokeDasharray="4 4" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#496457", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: "#496457", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            domain={["dataMin - 1", "dataMax + 1"]}
            unit="C"
          />
          <Tooltip
            contentStyle={{
              borderRadius: 16,
              border: "1px solid rgba(19, 38, 29, 0.08)",
              backgroundColor: "rgba(255,255,255,0.96)",
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#38795b"
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5, fill: "#204f3a" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

