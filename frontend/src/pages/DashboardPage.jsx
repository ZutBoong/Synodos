// 이 페이지는 통계페이지 기능 구현 작성을위해 제작된 페이지로, 현재 사용하지않음.
// 추후 기본베이스가 되기위해 남겨둠 - 25.12.30 윤희망

// import { useEffect, useState } from "react";
// import { getDashboard } from "../api/dashboardApi";
// import SummaryCards from "../components/dashboard/SummaryCards";
// import StatusDonutChart from "../components/dashboard/StatusDonutChart";

// function DashboardPage() {
//   const [summary, setSummary] = useState(null);
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     getDashboard(1)
//       .then((data) => {
//         setSummary(data);
//       })
//       .catch(() => {
//         setError("대시보드 데이터를 불러오지 못했습니다.");
//       });
//   }, []);

//   if (error) {
//     return <div>{error}</div>;
//   }

//   if (!summary) {
//     return <div>로딩 중...</div>;
//   }

//   return (
//   <div style={{ padding: "24px" }}>
//     <h2>대시보드</h2>

//     <SummaryCards summary={summary} />

//     <div style={{ marginTop: "40px" }}>
//       <h3>작업 상태 분포</h3>
//       <StatusDonutChart summary={summary} />
//     </div>
//   </div>
// );
// }

// export default DashboardPage;
