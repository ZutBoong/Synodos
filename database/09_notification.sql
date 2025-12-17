-- =============================================
-- Flowtask - 알림 테이블
-- =============================================

CREATE SEQUENCE IF NOT EXISTS flowtask_notification_seq START WITH 1 INCREMENT BY 1;

-- 알림 테이블
CREATE TABLE IF NOT EXISTS flowtask_notification (
    notification_id INTEGER PRIMARY KEY,
    recipient_no INTEGER NOT NULL REFERENCES flowtask_member(no) ON DELETE CASCADE,
    sender_no INTEGER REFERENCES flowtask_member(no) ON DELETE SET NULL,
    notification_type VARCHAR(50) NOT NULL,
    -- 알림 타입: TEAM_INVITE, COLUMN_ASSIGNEE, TASK_ASSIGNEE, COLUMN_UPDATED, TASK_UPDATED
    title VARCHAR(200) NOT NULL,
    message VARCHAR(500),
    -- 관련 엔티티 참조 (선택적)
    team_id INTEGER REFERENCES flowtask_team(team_id) ON DELETE CASCADE,
    column_id INTEGER REFERENCES flowtask_column(column_id) ON DELETE CASCADE,
    task_id INTEGER REFERENCES flowtask_task(task_id) ON DELETE CASCADE,
    -- 상태
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_notification_recipient ON flowtask_notification(recipient_no);
CREATE INDEX IF NOT EXISTS idx_notification_type ON flowtask_notification(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_read ON flowtask_notification(is_read);
CREATE INDEX IF NOT EXISTS idx_notification_created ON flowtask_notification(created_at DESC);
