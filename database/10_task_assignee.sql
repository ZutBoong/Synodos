-- =============================================
-- Synodos - 태스크 담당자 테이블 (복수 담당자 지원)
-- =============================================

-- 태스크 담당자 테이블 (M:N)
CREATE TABLE IF NOT EXISTS task_assignee (
    task_id INTEGER NOT NULL REFERENCES task(task_id) ON DELETE CASCADE,
    member_no INTEGER NOT NULL REFERENCES member(no) ON DELETE CASCADE,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_by INTEGER REFERENCES member(no) ON DELETE SET NULL,
    PRIMARY KEY (task_id, member_no)
);

CREATE INDEX IF NOT EXISTS idx_task_assignee_task ON task_assignee(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignee_member ON task_assignee(member_no);
