-- =============================================
-- Flowtask - 회원 테이블
-- =============================================

CREATE SEQUENCE IF NOT EXISTS flowtask_member_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS flowtask_member (
    no INTEGER PRIMARY KEY,
    userid VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(100) NOT NULL,
    name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    register TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_flowtask_member_userid ON flowtask_member(userid);
CREATE INDEX IF NOT EXISTS idx_flowtask_member_email ON flowtask_member(email);
