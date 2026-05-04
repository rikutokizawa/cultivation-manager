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

import { formatJapanChartLabel } from "@/lib/datetime";
import { sensorKeyFromRecord } from "@/lib/sensors";
import type { SensorRecord } from "@/types/api";

type SensorLineChartProps = {
  records: SensorRecord[];
  unit: string;
  color: string;
  seriesNameByKey?: Record<string, string>;
};

export function SensorLineChart({
  records,
  unit,
  color,
  seriesNameByKey = {},
}: SensorLineChartProps) {
  const seriesKeys = Array.from(new Set(records.map(sensorKeyFromRecord)));
  const colors = [color, "#9fd8cb", "#f8c471", "#d7b7ff", "#f4a7a1", "#a7d8ff"];
  const rows = new Map<string, Record<string, string | number>>();

  for (const record of [...records].reverse()) {
    const row = rows.get(record.timestamp) ?? {
      timestamp: record.timestamp,
      label: formatJapanChartLabel(record.timestamp),
    };
    row[sensorKeyFromRecord(record)] = Number(record.value.toFixed(2));
    rows.set(record.timestamp, row);
  }

  const chartData = Array.from(rows.values());

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
          {seriesKeys.map((seriesKey, index) => (
            <Line
              key={seriesKey}
              type="monotone"
              dataKey={seriesKey}
              name={seriesNameByKey[seriesKey] ?? `sensor ${index + 1}`}
              stroke={colors[index % colors.length]}
              strokeWidth={3}
              dot={false}
              connectNulls
              activeDot={{ r: 5, fill: colors[index % colors.length] }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
