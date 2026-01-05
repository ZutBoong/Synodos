import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend
} from "recharts";

const LABEL_COLORS = {
  "미완료": "#f5c84c",
  "마감 초과": "#ef4444"
};

// 왼쪽 그래프와 톤 맞춤
const COLORS = ["#f5c84c", "#ef4444"]; // 미완료(정상), 마감 초과

const renderLabel = ({ cx, cy, midAngle, outerRadius, value, payload }) => {
  if (value === 0) return null;

  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 18;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cx ? "start" : "end"}
      dominantBaseline="central"
      fill={LABEL_COLORS[payload.name] || "#555"}  // 🔥 여기
      fontSize={13}
      fontWeight={600}
    >
      {value}
    </text>
  );
};

function OverdueDonutChart({ summary }) {
  if (!summary) return null;

  const normalIncomplete =
    Math.max(summary.incomplete - summary.overdue, 0);

  const overdue = summary.overdue;

  // 둘 다 0이면 안내 문구
  if (normalIncomplete === 0 && overdue === 0) {
    return (
      <div
        style={{
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#999",
          fontSize: "14px"
        }}
      >
        표시할 데이터가 없습니다
      </div>
    );
  }

  const data = [
    { name: "미완료", value: normalIncomplete },
    { name: "마감 초과", value: overdue }
  ];

  return (
   <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={100}
          label={renderLabel}
          labelLine={false}
        >
          {data.map((entry, index) => (
            <Cell key={entry.name} fill={COLORS[index]} />
            ))}
        </Pie>

        <Tooltip />
        <Legend verticalAlign="bottom" height={36} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default OverdueDonutChart;