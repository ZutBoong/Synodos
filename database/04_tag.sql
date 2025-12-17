-- =============================================
-- Flowtask - 태그 테이블
-- =============================================

CREATE SEQUENCE IF NOT EXISTS flowtask_tag_seq START WITH 1 INCREMENT BY 1;

-- 태그 테이블
CREATE TABLE IF NOT EXISTS flowtask_tag (
    tag_id INTEGER PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES flowtask_team(team_id) ON DELETE CASCADE,
    tag_name VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#6c757d',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (team_id, tag_name)
);

CREATE INDEX IF NOT EXISTS idx_tag_team ON flowtask_tag(team_id);

-- 태스크-태그 매핑 테이블
CREATE TABLE IF NOT EXISTS flowtask_task_tag (
    task_id INTEGER NOT NULL REFERENCES flowtask_task(task_id) ON DELETE CASCADE,
    tag_id INTEGER NOT NULL REFERENCES flowtask_tag(tag_id) ON DELETE CASCADE,
    PRIMARY KEY (task_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_tasktag_task ON flowtask_task_tag(task_id);
CREATE INDEX IF NOT EXISTS idx_tasktag_tag ON flowtask_task_tag(tag_id);
