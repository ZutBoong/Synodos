-- =============================================
-- Flowtask Project - Database Schema
-- Spring Boot Auto Initialize
-- =============================================

-- =============================================
-- 1. Sequences
-- =============================================
CREATE SEQUENCE flowtask_member_seq START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE flowtask_team_seq START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE flowtask_project_seq START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE flowtask_column_seq START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE flowtask_task_seq START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE flowtask_tag_seq START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE flowtask_comment_seq START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE flowtask_chat_seq START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;
CREATE SEQUENCE flowtask_git_repo_seq START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;

-- =============================================
-- 2. Member Table
-- =============================================
CREATE TABLE flowtask_member (
    no NUMBER PRIMARY KEY,
    userid VARCHAR2(50) NOT NULL UNIQUE,
    password VARCHAR2(100) NOT NULL,
    name VARCHAR2(50) NOT NULL,
    email VARCHAR2(100) NOT NULL UNIQUE,
    phone VARCHAR2(20),
    register DATE DEFAULT SYSDATE
);

CREATE INDEX idx_flowtask_member_userid ON flowtask_member(userid);
CREATE INDEX idx_flowtask_member_email ON flowtask_member(email);

-- =============================================
-- 3. Team Tables
-- =============================================
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

-- =============================================
-- 4. Project Table
-- =============================================
CREATE TABLE flowtask_project (
    project_id NUMBER PRIMARY KEY,
    team_id NUMBER NOT NULL,
    project_name VARCHAR2(100) NOT NULL,
    created_at DATE DEFAULT SYSDATE,
    CONSTRAINT fk_project_team FOREIGN KEY (team_id)
        REFERENCES flowtask_team(team_id) ON DELETE CASCADE
);

CREATE INDEX idx_project_team ON flowtask_project(team_id);

-- =============================================
-- 5. Board Column Table
-- =============================================
CREATE TABLE flowtask_column (
    column_id NUMBER PRIMARY KEY,
    title VARCHAR2(100) NOT NULL,
    position NUMBER NOT NULL,
    team_id NUMBER,
    project_id NUMBER,
    CONSTRAINT fk_column_team FOREIGN KEY (team_id)
        REFERENCES flowtask_team(team_id) ON DELETE CASCADE,
    CONSTRAINT fk_column_project FOREIGN KEY (project_id)
        REFERENCES flowtask_project(project_id) ON DELETE CASCADE
);

CREATE INDEX idx_flowtask_column_position ON flowtask_column(position);
CREATE INDEX idx_flowtask_column_team ON flowtask_column(team_id);
CREATE INDEX idx_flowtask_column_project ON flowtask_column(project_id);

-- =============================================
-- 6. Task Table (with Issue Tracker & Verifier)
-- =============================================
CREATE TABLE flowtask_task (
    task_id NUMBER PRIMARY KEY,
    column_id NUMBER NOT NULL,
    title VARCHAR2(200) NOT NULL,
    description VARCHAR2(1000),
    position NUMBER NOT NULL,
    created_at DATE DEFAULT SYSDATE,
    -- Issue Tracker fields
    assignee_no NUMBER,
    priority VARCHAR2(20) DEFAULT 'MEDIUM',
    due_date DATE,
    status VARCHAR2(30) DEFAULT 'OPEN',
    -- Verifier fields
    verifier_no NUMBER,
    verified_at DATE,
    verification_status VARCHAR2(20) DEFAULT 'NONE',
    verification_notes VARCHAR2(1000),
    CONSTRAINT fk_task_column FOREIGN KEY (column_id)
        REFERENCES flowtask_column(column_id) ON DELETE CASCADE,
    CONSTRAINT fk_task_assignee FOREIGN KEY (assignee_no)
        REFERENCES flowtask_member(no) ON DELETE SET NULL,
    CONSTRAINT fk_task_verifier FOREIGN KEY (verifier_no)
        REFERENCES flowtask_member(no) ON DELETE SET NULL
);

CREATE INDEX idx_flowtask_task_column ON flowtask_task(column_id);
CREATE INDEX idx_flowtask_task_position ON flowtask_task(column_id, position);
CREATE INDEX idx_task_assignee ON flowtask_task(assignee_no);
CREATE INDEX idx_task_status ON flowtask_task(status);
CREATE INDEX idx_task_priority ON flowtask_task(priority);
CREATE INDEX idx_task_due_date ON flowtask_task(due_date);
CREATE INDEX idx_task_verifier ON flowtask_task(verifier_no);
CREATE INDEX idx_task_verif_status ON flowtask_task(verification_status);

-- =============================================
-- 7. Tag Tables
-- =============================================
CREATE TABLE flowtask_tag (
    tag_id NUMBER PRIMARY KEY,
    team_id NUMBER NOT NULL,
    tag_name VARCHAR2(50) NOT NULL,
    color VARCHAR2(7) DEFAULT '#6c757d',
    created_at DATE DEFAULT SYSDATE,
    CONSTRAINT fk_tag_team FOREIGN KEY (team_id)
        REFERENCES flowtask_team(team_id) ON DELETE CASCADE,
    CONSTRAINT uk_tag_team_name UNIQUE (team_id, tag_name)
);

CREATE TABLE flowtask_task_tag (
    task_id NUMBER NOT NULL,
    tag_id NUMBER NOT NULL,
    PRIMARY KEY (task_id, tag_id),
    CONSTRAINT fk_tasktag_task FOREIGN KEY (task_id)
        REFERENCES flowtask_task(task_id) ON DELETE CASCADE,
    CONSTRAINT fk_tasktag_tag FOREIGN KEY (tag_id)
        REFERENCES flowtask_tag(tag_id) ON DELETE CASCADE
);

CREATE INDEX idx_tag_team ON flowtask_tag(team_id);
CREATE INDEX idx_tasktag_task ON flowtask_task_tag(task_id);
CREATE INDEX idx_tasktag_tag ON flowtask_task_tag(tag_id);

-- =============================================
-- 8. Comment Table
-- =============================================
CREATE TABLE flowtask_comment (
    comment_id NUMBER PRIMARY KEY,
    task_id NUMBER NOT NULL,
    author_no NUMBER NOT NULL,
    content VARCHAR2(2000) NOT NULL,
    created_at DATE DEFAULT SYSDATE,
    updated_at DATE DEFAULT SYSDATE,
    CONSTRAINT fk_comment_task FOREIGN KEY (task_id)
        REFERENCES flowtask_task(task_id) ON DELETE CASCADE,
    CONSTRAINT fk_comment_author FOREIGN KEY (author_no)
        REFERENCES flowtask_member(no) ON DELETE CASCADE
);

CREATE INDEX idx_comment_task ON flowtask_comment(task_id);
CREATE INDEX idx_comment_created ON flowtask_comment(created_at DESC);

-- =============================================
-- 9. Chat Message Table
-- =============================================
CREATE TABLE flowtask_chat_message (
    message_id NUMBER PRIMARY KEY,
    team_id NUMBER NOT NULL,
    sender_no NUMBER NOT NULL,
    content VARCHAR2(2000) NOT NULL,
    sent_at DATE DEFAULT SYSDATE,
    CONSTRAINT fk_chat_team FOREIGN KEY (team_id)
        REFERENCES flowtask_team(team_id) ON DELETE CASCADE,
    CONSTRAINT fk_chat_sender FOREIGN KEY (sender_no)
        REFERENCES flowtask_member(no) ON DELETE CASCADE
);

CREATE INDEX idx_chat_team ON flowtask_chat_message(team_id);
CREATE INDEX idx_chat_sent ON flowtask_chat_message(sent_at DESC);

-- =============================================
-- 10. Git Integration Tables
-- =============================================
CREATE TABLE flowtask_git_repo (
    repo_id NUMBER PRIMARY KEY,
    team_id NUMBER NOT NULL,
    provider VARCHAR2(20) DEFAULT 'GITHUB',
    repo_owner VARCHAR2(100) NOT NULL,
    repo_name VARCHAR2(100) NOT NULL,
    access_token VARCHAR2(500),
    created_at DATE DEFAULT SYSDATE,
    CONSTRAINT fk_gitrepo_team FOREIGN KEY (team_id)
        REFERENCES flowtask_team(team_id) ON DELETE CASCADE,
    CONSTRAINT uk_gitrepo_team UNIQUE (team_id)
);

CREATE TABLE flowtask_task_commit (
    task_id NUMBER NOT NULL,
    commit_sha VARCHAR2(40) NOT NULL,
    commit_message VARCHAR2(500),
    author_name VARCHAR2(100),
    author_email VARCHAR2(200),
    committed_at DATE,
    commit_url VARCHAR2(500),
    PRIMARY KEY (task_id, commit_sha),
    CONSTRAINT fk_taskcommit_task FOREIGN KEY (task_id)
        REFERENCES flowtask_task(task_id) ON DELETE CASCADE
);

CREATE INDEX idx_gitrepo_team ON flowtask_git_repo(team_id);
CREATE INDEX idx_taskcommit_task ON flowtask_task_commit(task_id);
