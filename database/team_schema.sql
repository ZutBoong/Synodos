-- Team & Project Schema
-- 팀, 팀 멤버, 프로젝트 관련 테이블

-- ========================================
-- 시퀀스 생성
-- ========================================
CREATE SEQUENCE flowtask_team_seq START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE flowtask_project_seq START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;

-- ========================================
-- 팀 테이블
-- ========================================
CREATE TABLE flowtask_team (
    team_id NUMBER PRIMARY KEY,
    team_name VARCHAR2(100) NOT NULL,
    team_code VARCHAR2(20) NOT NULL UNIQUE,
    leader_no NUMBER NOT NULL,
    created_at DATE DEFAULT SYSDATE,
    CONSTRAINT fk_team_leader FOREIGN KEY (leader_no)
        REFERENCES flowtask_member(no)
);

CREATE INDEX idx_team_leader ON flowtask_team(leader_no);
CREATE INDEX idx_team_code ON flowtask_team(team_code);

-- ========================================
-- 팀 멤버 테이블
-- ========================================
CREATE TABLE flowtask_team_member (
    team_id NUMBER NOT NULL,
    member_no NUMBER NOT NULL,
    role VARCHAR2(20) DEFAULT 'MEMBER',
    joined_at DATE DEFAULT SYSDATE,
    PRIMARY KEY (team_id, member_no),
    CONSTRAINT fk_teammember_team FOREIGN KEY (team_id)
        REFERENCES flowtask_team(team_id) ON DELETE CASCADE,
    CONSTRAINT fk_teammember_member FOREIGN KEY (member_no)
        REFERENCES flowtask_member(no) ON DELETE CASCADE
);

CREATE INDEX idx_teammember_team ON flowtask_team_member(team_id);
CREATE INDEX idx_teammember_member ON flowtask_team_member(member_no);

-- ========================================
-- 프로젝트 테이블
-- ========================================
CREATE TABLE flowtask_project (
    project_id NUMBER PRIMARY KEY,
    team_id NUMBER NOT NULL,
    project_name VARCHAR2(100) NOT NULL,
    created_at DATE DEFAULT SYSDATE,
    CONSTRAINT fk_project_team FOREIGN KEY (team_id)
        REFERENCES flowtask_team(team_id) ON DELETE CASCADE
);

CREATE INDEX idx_project_team ON flowtask_project(team_id);

COMMIT;
