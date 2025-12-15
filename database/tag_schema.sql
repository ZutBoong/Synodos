-- Tag System Schema for Kari Issue Tracker
-- Run this script as kari user

-- Tag sequence
CREATE SEQUENCE kari_tag_seq START WITH 1 INCREMENT BY 1 NOCACHE NOCYCLE;

-- Tag table (team-level tags/labels)
CREATE TABLE kari_tag (
    tag_id NUMBER PRIMARY KEY,
    team_id NUMBER NOT NULL,
    tag_name VARCHAR2(50) NOT NULL,
    color VARCHAR2(7) DEFAULT '#6c757d',
    created_at DATE DEFAULT SYSDATE,
    CONSTRAINT fk_tag_team FOREIGN KEY (team_id)
        REFERENCES kari_team(team_id) ON DELETE CASCADE,
    CONSTRAINT uk_tag_team_name UNIQUE (team_id, tag_name)
);

-- Task-Tag mapping table (many-to-many)
CREATE TABLE kari_task_tag (
    task_id NUMBER NOT NULL,
    tag_id NUMBER NOT NULL,
    PRIMARY KEY (task_id, tag_id),
    CONSTRAINT fk_tasktag_task FOREIGN KEY (task_id)
        REFERENCES kari_task(task_id) ON DELETE CASCADE,
    CONSTRAINT fk_tasktag_tag FOREIGN KEY (tag_id)
        REFERENCES kari_tag(tag_id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_tag_team ON kari_tag(team_id);
CREATE INDEX idx_tasktag_task ON kari_task_tag(task_id);
CREATE INDEX idx_tasktag_tag ON kari_task_tag(tag_id);

COMMIT;
