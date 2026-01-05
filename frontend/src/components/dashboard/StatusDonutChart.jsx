import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

const LABEL_COLORS = {
  완료: "#4CAF50",
  미완료: "#FFC107"
};

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

const COLORS = {
  완료: "#4CAF50",
  미완료: "#FFC107",
};

function StatusDonutChart({ summary }) {
  const data = [
  { name: "완료", value: summary.completed },
  { name: "미완료", value: summary.incomplete }
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
          {data.map((entry) => (
            <Cell key={entry.name} fill={COLORS[entry.name]} />
          ))}
        </Pie>

        <Tooltip />
        <Legend verticalAlign="bottom" height={36} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export default StatusDonutChart;