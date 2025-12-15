-- Kari 프로젝트 Oracle DB 스크립트
-- 실행 전 적절한 사용자로 접속하세요

-- 테이블 삭제 (존재할 경우)
-- DROP TABLE kari_board CASCADE CONSTRAINTS;
-- DROP TABLE kari_member CASCADE CONSTRAINTS;
-- DROP SEQUENCE kari_board_seq;
-- DROP SEQUENCE kari_member_seq;

-- =============================================
-- 회원 테이블
-- =============================================

-- 회원 시퀀스 생성
CREATE SEQUENCE kari_member_seq
    START WITH 1
    INCREMENT BY 1
    NOCACHE
    NOCYCLE;

-- 회원 테이블 생성
CREATE TABLE kari_member (
    no NUMBER PRIMARY KEY,
    userid VARCHAR2(50) NOT NULL UNIQUE,
    password VARCHAR2(100) NOT NULL,
    name VARCHAR2(50) NOT NULL,
    email VARCHAR2(100) NOT NULL UNIQUE,
    phone VARCHAR2(20),
    register DATE DEFAULT SYSDATE
);

-- 회원 인덱스 생성
CREATE INDEX idx_kari_member_userid ON kari_member(userid);
CREATE INDEX idx_kari_member_email ON kari_member(email);

-- =============================================
-- 게시판 테이블
-- =============================================

-- 시퀀스 생성
CREATE SEQUENCE kari_board_seq
    START WITH 1
    INCREMENT BY 1
    NOCACHE
    NOCYCLE;

-- 게시판 테이블 생성
CREATE TABLE kari_board (
    no NUMBER PRIMARY KEY,
    writer VARCHAR2(50) NOT NULL,
    title VARCHAR2(200) NOT NULL,
    content CLOB,
    register DATE DEFAULT SYSDATE
);

-- 인덱스 생성
CREATE INDEX idx_kari_board_register ON kari_board(register DESC);

-- 테스트 데이터 삽입
INSERT INTO kari_board (no, writer, title, content, register)
VALUES (kari_board_seq.nextval, '홍길동', '첫 번째 게시글', '안녕하세요. 첫 번째 게시글입니다.', SYSDATE);

INSERT INTO kari_board (no, writer, title, content, register)
VALUES (kari_board_seq.nextval, '김철수', '두 번째 게시글', '두 번째 게시글 내용입니다.', SYSDATE);

INSERT INTO kari_board (no, writer, title, content, register)
VALUES (kari_board_seq.nextval, '이영희', '세 번째 게시글', '세 번째 게시글 내용입니다.', SYSDATE);

COMMIT;

-- 데이터 확인
SELECT * FROM kari_board ORDER BY no DESC;
