"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type WeeklyActivityPoint = {
  key: string;
  label: string;
  sessionCount: number;
  volume: number;
};

type RoutineInsight = {
  id: string;
  label: string;
  sessionCount: number;
  totalSets: number;
  totalVolume: number;
  share: number;
};

type TrainingActivityChartProps = {
  data: WeeklyActivityPoint[];
};

type RoutineShareChartProps = {
  data: RoutineInsight[];
};

const formatVolume = (value: number) =>
  new Intl.NumberFormat("ko-KR", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const getBarColor = (index: number) => {
  const palette = [
    "rgba(111,255,220,0.95)",
    "rgba(111,255,220,0.82)",
    "rgba(111,255,220,0.7)",
    "rgba(106,129,255,0.82)",
  ];

  return palette[index % palette.length];
};

export function TrainingActivityChart({ data }: TrainingActivityChartProps) {
  return (
    <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] px-2.5 py-4 sm:px-4">
      <div className="mb-4 flex flex-wrap items-center gap-3 text-xs text-white/52">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-primary" />
          이번 주 세션 수
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-[rgba(255,196,86,0.88)]" />
          이번 주 볼륨
        </span>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 12, left: 10, bottom: 4 }}
          >
            <defs>
              <filter
                id="activity-volume-shadow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feDropShadow
                  dx="0"
                  dy="0"
                  floodColor="rgba(4,10,12,0.92)"
                  floodOpacity="0.88"
                  stdDeviation="1.2"
                />
              </filter>
            </defs>
            <CartesianGrid
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              axisLine={false}
              dataKey="label"
              interval={0}
              minTickGap={0}
              padding={{ left: 8, right: 12 }}
              tick={{ fill: "rgba(255,255,255,0.55)", fontSize: 11 }}
              tickMargin={10}
              tickLine={false}
            />
            <YAxis
              axisLine={false}
              tick={false}
              tickLine={false}
              width={0}
              yAxisId="count"
            />
            <YAxis
              axisLine={false}
              hide
              tick={false}
              tickLine={false}
              yAxisId="volume"
            />
            <Tooltip
              contentStyle={{
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "18px",
                background: "rgba(5,12,14,0.92)",
                boxShadow: "0 18px 48px rgba(0,0,0,0.34)",
                color: "white",
              }}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              formatter={(value, name) => {
                if (name === "volume") {
                  return [`${formatVolume(Number(value))}`, "볼륨"];
                }

                return [`${value}회`, "세션 수"];
              }}
              itemStyle={{ color: "rgba(255,255,255,0.82)" }}
              labelStyle={{ color: "rgba(255,255,255,0.56)" }}
              separator=" "
            />
            <Bar
              barSize={18}
              dataKey="sessionCount"
              fill="rgba(111,255,220,0.88)"
              name="sessionCount"
              radius={[999, 999, 10, 10]}
              yAxisId="count"
            />
            <Line
              dataKey="volume"
              activeDot={{
                fill: "rgba(6,16,20,0.98)",
                r: 4,
                stroke: "rgba(255,208,120,1)",
                strokeWidth: 2,
              }}
              dot={{
                fill: "rgba(255,208,120,0)",
                r: 3.25,
                stroke: "rgba(255,208,120,0.98)",
                strokeWidth: 1.75,
              }}
              filter="url(#activity-volume-shadow)"
              name="volume"
              stroke="rgba(255,208,120,1)"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={4.5}
              type="linear"
              yAxisId="volume"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function RoutineShareChart({ data }: RoutineShareChartProps) {
  const chartData = [...data].reverse();

  return (
    <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] px-3 py-4 sm:px-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-white/58">세션 비중 기준 상위 루틴</p>
        <p className="text-xs uppercase tracking-[0.18em] text-white/34">
          Top {data.length}
        </p>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 8, right: 12, left: 12, bottom: 0 }}
          >
            <CartesianGrid
              stroke="rgba(255,255,255,0.08)"
              strokeDasharray="3 3"
              horizontal={false}
            />
            <XAxis
              axisLine={false}
              domain={[0, 100]}
              tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }}
              tickFormatter={(value) => `${value}%`}
              tickLine={false}
              type="number"
            />
            <YAxis
              axisLine={false}
              dataKey="label"
              tick={{ fill: "rgba(255,255,255,0.72)", fontSize: 12 }}
              tickLine={false}
              type="category"
              width={88}
            />
            <Tooltip
              contentStyle={{
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "18px",
                background: "rgba(5,12,14,0.92)",
                boxShadow: "0 18px 48px rgba(0,0,0,0.34)",
                color: "white",
              }}
              cursor={{ fill: "rgba(255,255,255,0.04)" }}
              formatter={(value, name, item) => {
                if (name === "share") {
                  return [`${value}%`, "세션 비중"];
                }

                if (name === "totalVolume") {
                  return [`${formatVolume(Number(value))}`, "누적 볼륨"];
                }

                return [
                  `${item.payload.sessionCount}회 / ${item.payload.totalSets}세트`,
                  "기록",
                ];
              }}
              itemStyle={{ color: "rgba(255,255,255,0.82)" }}
              labelStyle={{ color: "rgba(255,255,255,0.56)" }}
              separator=" "
            />
            <Bar
              barSize={22}
              dataKey="share"
              name="share"
              radius={[999, 999, 999, 999]}
            >
              {chartData.map((entry, index) => (
                <Cell key={entry.id} fill={getBarColor(index)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
