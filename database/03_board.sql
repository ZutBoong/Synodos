-- =============================================
-- Flowtask - 보드 (컬럼 & 태스크) 테이블
-- =============================================

CREATE SEQUENCE IF NOT EXISTS flowtask_column_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS flowtask_task_seq START WITH 1 INCREMENT BY 1;

-- 컬럼 테이블
CREATE TABLE IF NOT EXISTS flowtask_column (
    column_id INTEGER PRIMARY KEY,
    title VARCHAR(100) NOT NULL,
    position INTEGER NOT NULL,
    team_id INTEGER REFERENCES flowtask_team(team_id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES flowtask_project(project_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_flowtask_column_position ON flowtask_column(position);
CREATE INDEX IF NOT EXISTS idx_flowtask_column_team ON flowtask_column(team_id);
CREATE INDEX IF NOT EXISTS idx_flowtask_column_project ON flowtask_column(project_id);

-- 태스크 테이블 (이슈 트래커 + 검증자 필드 포함)
CREATE TABLE IF NOT EXISTS flowtask_task (
    task_id INTEGER PRIMARY KEY,
    column_id INTEGER NOT NULL REFERENCES flowtask_column(column_id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Issue tracker fields
    assignee_no INTEGER REFERENCES flowtask_member(no) ON DELETE SET NULL,
    priority VARCHAR(20) DEFAULT 'MEDIUM',
    due_date TIMESTAMP,
    status VARCHAR(30) DEFAULT 'OPEN',
    -- Verifier fields
    verifier_no INTEGER REFERENCES flowtask_member(no) ON DELETE SET NULL,
    verified_at TIMESTAMP,
    verification_status VARCHAR(20) DEFAULT 'NONE',
    verification_notes VARCHAR(1000)
);

CREATE INDEX IF NOT EXISTS idx_flowtask_task_column ON flowtask_task(column_id);
CREATE INDEX IF NOT EXISTS idx_flowtask_task_position ON flowtask_task(column_id, position);
CREATE INDEX IF NOT EXISTS idx_task_assignee ON flowtask_task(assignee_no);
CREATE INDEX IF NOT EXISTS idx_task_status ON flowtask_task(status);
CREATE INDEX IF NOT EXISTS idx_task_priority ON flowtask_task(priority);
CREATE INDEX IF NOT EXISTS idx_task_due_date ON flowtask_task(due_date);
CREATE INDEX IF NOT EXISTS idx_task_verifier ON flowtask_task(verifier_no);
CREATE INDEX IF NOT EXISTS idx_task_verif_status ON flowtask_task(verification_status);
