-- =============================================
-- Synodos - 팀 & 프로젝트 테이블
-- =============================================

CREATE SEQUENCE IF NOT EXISTS team_seq START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE IF NOT EXISTS project_seq START WITH 1 INCREMENT BY 1;

-- 팀 테이블
CREATE TABLE IF NOT EXISTS team (
    team_id INTEGER PRIMARY KEY,
    team_name VARCHAR(100) NOT NULL,
    team_code VARCHAR(20) NOT NULL UNIQUE,
    leader_no INTEGER NOT NULL REFERENCES member(no),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_team_leader ON team(leader_no);
CREATE INDEX IF NOT EXISTS idx_team_code ON team(team_code);

-- 팀 멤버 테이블
CREATE TABLE IF NOT EXISTS team_member (
    team_id INTEGER NOT NULL REFERENCES team(team_id) ON DELETE CASCADE,
    member_no INTEGER NOT NULL REFERENCES member(no) ON DELETE CASCADE,
    role VARCHAR(20) DEFAULT 'MEMBER',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (team_id, member_no)
);

CREATE INDEX IF NOT EXISTS idx_teammember_team ON team_member(team_id);
CREATE INDEX IF NOT EXISTS idx_teammember_member ON team_member(member_no);

-- 프로젝트 테이블
CREATE TABLE IF NOT EXISTS project (
    project_id INTEGER PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES team(team_id) ON DELETE CASCADE,
    project_name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_project_team ON project(team_id);
