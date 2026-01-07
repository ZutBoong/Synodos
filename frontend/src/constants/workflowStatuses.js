/**
 * 태스크 워크플로우 상태 상수
 * 칸반 보드, 리스트 뷰, 캘린더 뷰 등에서 공통으로 사용
 */
export const WORKFLOW_STATUSES = {
    WAITING: { label: 'Waiting', color: '#94a3b8' },
    IN_PROGRESS: { label: 'In Progress', color: '#3b82f6' },
    REVIEW: { label: 'Review', color: '#f59e0b' },
    DONE: { label: 'Done', color: '#10b981' },
    REJECTED: { label: 'Rejected', color: '#ef4444' },
    DECLINED: { label: 'Declined', color: '#6b7280' }
};

/**
 * 워크플로우 상태 라벨 가져오기
 */
export const getWorkflowLabel = (status) => {
    return WORKFLOW_STATUSES[status]?.label || status || '대기';
};

/**
 * 워크플로우 상태 색상 가져오기
 */
export const getWorkflowColor = (status) => {
    return WORKFLOW_STATUSES[status]?.color || '#94a3b8';
};
