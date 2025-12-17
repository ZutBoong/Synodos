-- =============================================
-- Flowtask - 채팅 메시지 테이블
-- =============================================

CREATE SEQUENCE IF NOT EXISTS flowtask_chat_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS flowtask_chat_message (
    message_id INTEGER PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES flowtask_team(team_id) ON DELETE CASCADE,
    sender_no INTEGER NOT NULL REFERENCES flowtask_member(no) ON DELETE CASCADE,
    content VARCHAR(2000) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_team ON flowtask_chat_message(team_id);
CREATE INDEX IF NOT EXISTS idx_chat_sent ON flowtask_chat_message(sent_at DESC);
