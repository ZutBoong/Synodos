-- Kari 프로젝트 Kanban Board Oracle DB 스크립트
-- 실행 전 적절한 사용자로 접속하세요

-- ========================================
-- 테이블 삭제 (존재할 경우)
-- ========================================
-- DROP TABLE kari_task CASCADE CONSTRAINTS;
-- DROP TABLE kari_column CASCADE CONSTRAINTS;
-- DROP SEQUENCE kari_task_seq;
-- DROP SEQUENCE kari_column_seq;

-- ========================================
-- 시퀀스 생성
-- ========================================
CREATE SEQUENCE kari_column_seq
    START WITH 1
    INCREMENT BY 1
    NOCACHE
    NOCYCLE;

CREATE SEQUENCE kari_task_seq
    START WITH 1
    INCREMENT BY 1
    NOCACHE
    NOCYCLE;

-- ========================================
-- Kanban 컬럼 테이블 생성
-- ========================================
CREATE TABLE kari_column (
    column_id NUMBER PRIMARY KEY,
    title VARCHAR2(100) NOT NULL,
    position NUMBER DEFAULT 0
);

CREATE INDEX idx_kari_column_position ON kari_column(position);

-- ========================================
-- Kanban 태스크 테이블 생성
-- ========================================
CREATE TABLE kari_task (
    task_id NUMBER PRIMARY KEY,
    column_id NUMBER NOT NULL,
    title VARCHAR2(200) NOT NULL,
    description CLOB,
    position NUMBER DEFAULT 0,
    created_at DATE DEFAULT SYSDATE,
    CONSTRAINT fk_task_column FOREIGN KEY (column_id)
        REFERENCES kari_column(column_id) ON DELETE CASCADE
);

CREATE INDEX idx_kari_task_column ON kari_task(column_id);
CREATE INDEX idx_kari_task_position ON kari_task(column_id, position);

-- ========================================
-- 테스트 데이터 삽입 - Kanban 컬럼
-- ========================================
INSERT INTO kari_column (column_id, title, position)
VALUES (kari_column_seq.nextval, 'To Do', 1);

INSERT INTO kari_column (column_id, title, position)
VALUES (kari_column_seq.nextval, 'In Progress', 2);

INSERT INTO kari_column (column_id, title, position)
VALUES (kari_column_seq.nextval, 'Done', 3);

-- ========================================
-- 테스트 데이터 삽입 - Kanban 태스크
-- ========================================
INSERT INTO kari_task (task_id, column_id, title, description, position)
VALUES (kari_task_seq.nextval, 1, '프로젝트 기획', '프로젝트 요구사항 분석 및 기획', 1);

INSERT INTO kari_task (task_id, column_id, title, description, position)
VALUES (kari_task_seq.nextval, 1, 'UI 디자인', '화면 설계 및 UI 디자인', 2);

INSERT INTO kari_task (task_id, column_id, title, description, position)
VALUES (kari_task_seq.nextval, 2, 'DB 설계', '데이터베이스 테이블 설계', 1);

INSERT INTO kari_task (task_id, column_id, title, description, position)
VALUES (kari_task_seq.nextval, 3, '환경 설정', '개발 환경 구축 완료', 1);

COMMIT;

-- ========================================
-- 데이터 확인
-- ========================================
SELECT * FROM kari_column ORDER BY position;
SELECT * FROM kari_task ORDER BY column_id, position;
