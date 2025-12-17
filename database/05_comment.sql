-- =============================================
-- Flowtask - 댓글 테이블
-- =============================================

CREATE SEQUENCE IF NOT EXISTS flowtask_comment_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS flowtask_comment (
    comment_id INTEGER PRIMARY KEY,
    task_id INTEGER NOT NULL REFERENCES flowtask_task(task_id) ON DELETE CASCADE,
    author_no INTEGER NOT NULL REFERENCES flowtask_member(no) ON DELETE CASCADE,
    content VARCHAR(2000) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_comment_task ON flowtask_comment(task_id);
CREATE INDEX IF NOT EXISTS idx_comment_created ON flowtask_comment(created_at DESC);
