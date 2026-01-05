import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from "recharts";

function TimeProgressAreaChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div style={{ textAlign: "center", color: "#999", padding: 40 }}>
        표시할 데이터가 없습니다
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={320}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="totalGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#c7d2fe" stopOpacity={0.8} />
            <stop offset="95%" stopColor="#c7d2fe" stopOpacity={0.1} />
          </linearGradient>

          <linearGradient id="completedGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.9} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.2} />
          </linearGradient>
        </defs>

        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis allowDecimals={false} />
        <Tooltip />
        <Legend />

        <Area
          type="monotone"
          dataKey="total"
          name="전체 작업"
          stroke="#a5b4fc"
          fill="url(#totalGradient)"
        />

        <Area
          type="monotone"
          dataKey="completed"
          name="완료된 작업"
          stroke="#4f46e5"
          fill="url(#completedGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default TimeProgressAreaChart;
