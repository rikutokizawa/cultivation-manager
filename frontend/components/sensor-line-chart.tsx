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

type SensorLineChartProps = {
  records: SensorRecord[];
  unit: string;
  color: string;
};

function formatLabel(timestamp: string) {
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()} ${String(date.getHours()).padStart(2, "0")}:00`;
}

export function SensorLineChart({
  records,
  unit,
  color,
}: SensorLineChartProps) {
  const chartData = [...records]
    .reverse()
    .map((record) => ({
      label: formatLabel(record.timestamp),
      value: Number(record.value.toFixed(2)),
    }));

  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer>
        <LineChart data={chartData} margin={{ left: 4, right: 18, top: 18, bottom: 4 }}>
          <CartesianGrid stroke="rgba(84, 99, 113, 0.22)" strokeDasharray="4 4" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#9cadbf", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            tick={{ fill: "#9cadbf", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            domain={["dataMin - 1", "dataMax + 1"]}
            unit={unit}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 8,
              border: "1px solid rgba(84, 99, 113, 0.4)",
              backgroundColor: "rgba(31, 33, 35, 0.98)",
              color: "#ffffff",
            }}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={3}
            dot={false}
            activeDot={{ r: 5, fill: color }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
