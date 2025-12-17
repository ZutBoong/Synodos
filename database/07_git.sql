-- =============================================
-- Flowtask - Git 연동 테이블
-- =============================================

CREATE SEQUENCE IF NOT EXISTS flowtask_git_repo_seq START WITH 1 INCREMENT BY 1;

-- Git 저장소 테이블
CREATE TABLE IF NOT EXISTS flowtask_git_repo (
    repo_id INTEGER PRIMARY KEY,
    team_id INTEGER NOT NULL UNIQUE REFERENCES flowtask_team(team_id) ON DELETE CASCADE,
    provider VARCHAR(20) DEFAULT 'GITHUB',
    repo_owner VARCHAR(100) NOT NULL,
    repo_name VARCHAR(100) NOT NULL,
    access_token VARCHAR(500),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_gitrepo_team ON flowtask_git_repo(team_id);

-- 태스크-커밋 연결 테이블
CREATE TABLE IF NOT EXISTS flowtask_task_commit (
    task_id INTEGER NOT NULL REFERENCES flowtask_task(task_id) ON DELETE CASCADE,
    commit_sha VARCHAR(40) NOT NULL,
    commit_message VARCHAR(500),
    author_name VARCHAR(100),
    author_email VARCHAR(200),
    committed_at TIMESTAMP,
    commit_url VARCHAR(500),
    PRIMARY KEY (task_id, commit_sha)
);

CREATE INDEX IF NOT EXISTS idx_taskcommit_task ON flowtask_task_commit(task_id);
