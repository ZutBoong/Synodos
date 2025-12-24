-- =============================================
-- Synodos - 채팅 메시지 테이블
-- =============================================

CREATE SEQUENCE IF NOT EXISTS chat_seq START WITH 1 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS chat_message (
    message_id INTEGER PRIMARY KEY,
    team_id INTEGER NOT NULL REFERENCES team(team_id) ON DELETE CASCADE,
    sender_no INTEGER NOT NULL REFERENCES member(no) ON DELETE CASCADE,
    content VARCHAR(2000) NOT NULL,
    sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_team ON chat_message(team_id);
CREATE INDEX IF NOT EXISTS idx_chat_sent ON chat_message(sent_at DESC);
