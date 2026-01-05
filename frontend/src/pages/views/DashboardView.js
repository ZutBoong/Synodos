import { useEffect, useState } from "react";

import SummaryCards from "../../components/dashboard/SummaryCards";
import StatusDonutChart from "../../components/dashboard/StatusDonutChart";
import OverdueDonutChart from "../../components/dashboard/OverdueDonutChart";
import TimeProgressAreaChart from "../../components/dashboard/TimeProgressAreaChart";
import { getDashboard, getCompletionTrend } from "../../api/dashboardApi";

import "./DashboardView.css";

function DashboardView({ team }) {
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);
  const [trendData, setTrendData] = useState([]);

useEffect(() => {
  if (!team?.teamId) return;

  const fetchDashboard = async () => {
    try {
      const [summaryRes, trendRes] = await Promise.all([
        getDashboard(team.teamId),
        getCompletionTrend(team.teamId)
      ]);

      setSummary(summaryRes);
      setTrendData(trendRes);
    } catch (e) {
      setError("대시보드 데이터를 불러오지 못했습니다.");
    }
  };

  fetchDashboard();
}, [team?.teamId]);

  if (error) return <div className="dashboard-error">{error}</div>;
  if (!summary) return <div className="dashboard-loading">로딩 중...</div>;

  return (
    <div className="dashboard-container">
      {/* 1️⃣ 요약 카드 */}
      <SummaryCards summary={summary} />

      {/* 2️⃣ 도넛 차트 영역 */}
      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3 className="dashboard-card-title">작업 상태 분포</h3>
          <div className="chart-wrapper">
            <StatusDonutChart summary={summary} />
          </div>
        </div>

        <div className="dashboard-card">
          <h3 className="dashboard-card-title">미완료 / 마감 초과</h3>
          <div className="chart-wrapper">
            <OverdueDonutChart summary={summary} />
          </div>
        </div>
      </div>

  <div className="dashboard-card" style={{ marginTop: "40px" }}>
    <h3>시간 경과에 따른 작업 완료</h3>
    <p style={{ color: "#666", fontSize: "0.9rem", marginBottom: 12 }}>
      전체 작업 대비 완료된 작업의 누적 추이
    </p>

    <TimeProgressAreaChart data={trendData} />

    <p style={{ marginTop: 8, color: "#999", fontSize: "0.8rem" }}>
      * 날짜별 누적 기준
    </p>
  </div>

    </div>
  );
}

export default DashboardView;