-- Synodos 데이터베이스 리셋 스크립트
-- 실행 방법: psql -U flow -d synodos -f reset.sql

-- 모든 데이터 삭제 (외래키 순서 고려)
TRUNCATE task_commit CASCADE;
TRUNCATE task_archive CASCADE;
TRUNCATE task_favorite CASCADE;
TRUNCATE task_verifier CASCADE;
TRUNCATE task_assignee CASCADE;
TRUNCATE comment CASCADE;
TRUNCATE file CASCADE;
TRUNCATE notification CASCADE;
TRUNCATE task CASCADE;
TRUNCATE columns CASCADE;
TRUNCATE chat_message CASCADE;
TRUNCATE team_member CASCADE;
TRUNCATE team CASCADE;
TRUNCATE email_verification CASCADE;
TRUNCATE member CASCADE;

-- 시퀀스 초기화
ALTER SEQUENCE IF EXISTS member_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS team_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS column_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS task_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS comment_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS chat_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS file_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS notification_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS task_archive_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS email_verification_seq RESTART WITH 1;

-- 완료 메시지
DO $$
BEGIN
    RAISE NOTICE '데이터베이스가 리셋되었습니다. 백엔드를 재시작하면 새 샘플 데이터가 생성됩니다.';
END $$;
