import axios from "axios";

const BASE_URL = "http://localhost:8081";

export const getDashboard = async (teamId) => {
  const res = await axios.get(
    `${BASE_URL}/api/teams/${teamId}/dashboard`
  );
  return res.data;
};

// ✅ 추가: 일자별 업무 유입량
export const getWorkloadByDay = async (teamId, days = 7) => {
  const res = await axios.get(
    `${BASE_URL}/api/teams/${teamId}/dashboard/workload-by-day`,
    { params: { days } }
  );
  return res.data;
};

// 일별 데이터수집용
export const getCompletionTrend = async (teamId) => {
  const res = await axios.get(
    `${BASE_URL}/api/teams/${teamId}/dashboard/completion-trend`
  );
  return res.data;
};