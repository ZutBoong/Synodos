import "./SummaryCards.css";

function SummaryCards({ summary }) {
  return (
    <div className="summary-grid">
      <div className="card">
        <h4>총 작업</h4>
        <p>{summary.total}</p>
      </div>

      <div className="card">
        <h4>완료</h4>
        <p>{summary.completed}</p>
      </div>

      <div className="card">
        <h4>미완료</h4>
        <p>{summary.incomplete}</p>
      </div>

      <div className="card danger">
        <h4>마감 초과</h4>
        <p>{summary.overdue}</p>
      </div>
    </div>
  );
}

export default SummaryCards;