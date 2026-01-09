-- =============================================
-- Synodos - 샘플 데이터 (자동 실행)
-- =============================================
--
-- ✅ 이 파일은 Spring Boot 시작 시 자동으로 실행됩니다!
--
-- 위치: backend/src/main/resources/data.sql
-- 역할: 초기 샘플 데이터 삽입
-- 비밀번호: 1234 (BCrypt - Spring Security 생성)
--
-- ON CONFLICT DO NOTHING으로 중복 삽입을 방지합니다.
-- =============================================
--
-- 🔑 개발자용 계정 (모든 권한)
-- =============================================
-- ID: dev / PW: 1234
-- - 이메일 인증 완료
-- - GitHub 연동: 아래 SQL로 설정 가능
-- - 팀 리더 권한
--
-- GitHub 연동 방법 (본인 계정으로 변경):
-- UPDATE member SET github_username = 'YourGitHubUsername', github_access_token = 'ghp_xxxx' WHERE userid = 'dev';
-- =============================================

-- =============================================
-- 1. 회원 데이터
-- =============================================
-- 개발자 슈퍼계정 (GitHub 미연동 상태, 직접 설정 필요)
INSERT INTO member (no, userid, password, name, email, phone, email_verified, register)
VALUES (nextval('member_seq'), 'dev', '$2a$10$DYzhovtDrzm6o3IQPkhiuOE8PETt2.GR9xeAbfMQUHhLtT6pY.K2e', '개발자', 'dev@synodos.com', '010-9999-9999', true, CURRENT_TIMESTAMP)
ON CONFLICT (userid) DO NOTHING;

INSERT INTO member (no, userid, password, name, email, phone, email_verified, register)
VALUES (nextval('member_seq'), 'admin', '$2a$10$DYzhovtDrzm6o3IQPkhiuOE8PETt2.GR9xeAbfMQUHhLtT6pY.K2e', '관리자', 'admin@synodos.com', '010-0000-0000', true, CURRENT_TIMESTAMP)
ON CONFLICT (userid) DO NOTHING;

INSERT INTO member (no, userid, password, name, email, phone, email_verified, register)
VALUES (nextval('member_seq'), 'user1', '$2a$10$DYzhovtDrzm6o3IQPkhiuOE8PETt2.GR9xeAbfMQUHhLtT6pY.K2e', '김철수', 'user1@synodos.com', '010-1234-5678', true, CURRENT_TIMESTAMP)
ON CONFLICT (userid) DO NOTHING;

INSERT INTO member (no, userid, password, name, email, phone, email_verified, register)
VALUES (nextval('member_seq'), 'user2', '$2a$10$DYzhovtDrzm6o3IQPkhiuOE8PETt2.GR9xeAbfMQUHhLtT6pY.K2e', '이영희', 'user2@synodos.com', '010-2345-6789', true, CURRENT_TIMESTAMP)
ON CONFLICT (userid) DO NOTHING;

INSERT INTO member (no, userid, password, name, email, phone, email_verified, register)
VALUES (nextval('member_seq'), 'user3', '$2a$10$DYzhovtDrzm6o3IQPkhiuOE8PETt2.GR9xeAbfMQUHhLtT6pY.K2e', '박민수', 'user3@synodos.com', '010-3456-7890', true, CURRENT_TIMESTAMP)
ON CONFLICT (userid) DO NOTHING;

INSERT INTO member (no, userid, password, name, email, phone, email_verified, register)
VALUES (nextval('member_seq'), 'user4', '$2a$10$DYzhovtDrzm6o3IQPkhiuOE8PETt2.GR9xeAbfMQUHhLtT6pY.K2e', '정수진', 'user4@synodos.com', '010-4567-8901', true, CURRENT_TIMESTAMP)
ON CONFLICT (userid) DO NOTHING;

INSERT INTO member (no, userid, password, name, email, phone, email_verified, register)
VALUES (nextval('member_seq'), 'user5', '$2a$10$DYzhovtDrzm6o3IQPkhiuOE8PETt2.GR9xeAbfMQUHhLtT6pY.K2e', '강동원', 'user5@synodos.com', '010-5678-9012', true, CURRENT_TIMESTAMP)
ON CONFLICT (userid) DO NOTHING;

INSERT INTO member (no, userid, password, name, email, phone, email_verified, register)
VALUES (nextval('member_seq'), 'user6', '$2a$10$DYzhovtDrzm6o3IQPkhiuOE8PETt2.GR9xeAbfMQUHhLtT6pY.K2e', '윤서연', 'user6@synodos.com', '010-6789-0123', true, CURRENT_TIMESTAMP)
ON CONFLICT (userid) DO NOTHING;

INSERT INTO member (no, userid, password, name, email, phone, email_verified, register)
VALUES (nextval('member_seq'), 'user7', '$2a$10$DYzhovtDrzm6o3IQPkhiuOE8PETt2.GR9xeAbfMQUHhLtT6pY.K2e', '한지민', 'user7@synodos.com', '010-7890-1234', true, CURRENT_TIMESTAMP)
ON CONFLICT (userid) DO NOTHING;

INSERT INTO member (no, userid, password, name, email, phone, email_verified, register)
VALUES (nextval('member_seq'), 'user8', '$2a$10$DYzhovtDrzm6o3IQPkhiuOE8PETt2.GR9xeAbfMQUHhLtT6pY.K2e', '오준혁', 'user8@synodos.com', '010-8901-2345', true, CURRENT_TIMESTAMP)
ON CONFLICT (userid) DO NOTHING;

INSERT INTO member (no, userid, password, name, email, phone, email_verified, register)
VALUES (nextval('member_seq'), 'user9', '$2a$10$DYzhovtDrzm6o3IQPkhiuOE8PETt2.GR9xeAbfMQUHhLtT6pY.K2e', '서예린', 'user9@synodos.com', '010-9012-3456', true, CURRENT_TIMESTAMP)
ON CONFLICT (userid) DO NOTHING;

-- =============================================
-- 2. 팀 데이터
-- =============================================
-- 기본 테스트 팀 (admin 리더)
INSERT INTO team (team_id, team_name, description, leader_no, team_code, github_issue_sync_enabled, created_at)
VALUES (nextval('team_seq'), 'Synodos 테스트 프로젝트', 'GitHub 연동 테스트를 위한 프로젝트입니다.',
        (SELECT no FROM member WHERE userid = 'admin'), 'SYNODOS1', TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (team_code) DO NOTHING;

-- 개발자용 팀 (dev 리더, GitHub 저장소는 직접 설정)
-- GitHub 저장소 연결: 팀 설정에서 연결하거나 아래 SQL 실행
-- UPDATE team SET github_repo_url = 'https://github.com/YourUsername/YourRepo' WHERE team_code = 'DEVTEAM1';
INSERT INTO team (team_id, team_name, description, leader_no, team_code, github_issue_sync_enabled, created_at)
VALUES (nextval('team_seq'), '개발자 테스트팀', '개발자 테스트용 팀입니다. GitHub 저장소를 연결하여 사용하세요.',
        (SELECT no FROM member WHERE userid = 'dev'), 'DEVTEAM1', TRUE, CURRENT_TIMESTAMP)
ON CONFLICT (team_code) DO NOTHING;

-- =============================================
-- 3. 팀 멤버 데이터
-- =============================================
-- SYNODOS1 팀 멤버
INSERT INTO team_member (team_id, member_no, role, joined_at)
SELECT t.team_id, m.no, 'LEADER', CURRENT_TIMESTAMP
FROM team t, member m WHERE t.team_code = 'SYNODOS1' AND m.userid = 'admin'
ON CONFLICT (team_id, member_no) DO NOTHING;

-- DEVTEAM1 팀 멤버 (dev가 리더, 모든 사용자 포함)
INSERT INTO team_member (team_id, member_no, role, joined_at)
SELECT t.team_id, m.no, 'LEADER', CURRENT_TIMESTAMP
FROM team t, member m WHERE t.team_code = 'DEVTEAM1' AND m.userid = 'dev'
ON CONFLICT (team_id, member_no) DO NOTHING;

INSERT INTO team_member (team_id, member_no, role, joined_at)
SELECT t.team_id, m.no, 'MEMBER', CURRENT_TIMESTAMP
FROM team t, member m WHERE t.team_code = 'DEVTEAM1' AND m.userid = 'admin'
ON CONFLICT (team_id, member_no) DO NOTHING;

INSERT INTO team_member (team_id, member_no, role, joined_at)
SELECT t.team_id, m.no, 'MEMBER', CURRENT_TIMESTAMP
FROM team t CROSS JOIN member m WHERE t.team_code = 'DEVTEAM1' AND m.userid LIKE 'user%'
ON CONFLICT (team_id, member_no) DO NOTHING;

INSERT INTO team_member (team_id, member_no, role, joined_at)
SELECT t.team_id, m.no, 'MEMBER', CURRENT_TIMESTAMP
FROM team t, member m WHERE t.team_code = 'SYNODOS1' AND m.userid = 'user1'
ON CONFLICT (team_id, member_no) DO NOTHING;

INSERT INTO team_member (team_id, member_no, role, joined_at)
SELECT t.team_id, m.no, 'MEMBER', CURRENT_TIMESTAMP
FROM team t, member m WHERE t.team_code = 'SYNODOS1' AND m.userid = 'user2'
ON CONFLICT (team_id, member_no) DO NOTHING;

INSERT INTO team_member (team_id, member_no, role, joined_at)
SELECT t.team_id, m.no, 'MEMBER', CURRENT_TIMESTAMP
FROM team t, member m WHERE t.team_code = 'SYNODOS1' AND m.userid = 'user3'
ON CONFLICT (team_id, member_no) DO NOTHING;

INSERT INTO team_member (team_id, member_no, role, joined_at)
SELECT t.team_id, m.no, 'MEMBER', CURRENT_TIMESTAMP
FROM team t, member m WHERE t.team_code = 'SYNODOS1' AND m.userid = 'user4'
ON CONFLICT (team_id, member_no) DO NOTHING;

INSERT INTO team_member (team_id, member_no, role, joined_at)
SELECT t.team_id, m.no, 'MEMBER', CURRENT_TIMESTAMP
FROM team t, member m WHERE t.team_code = 'SYNODOS1' AND m.userid = 'user5'
ON CONFLICT (team_id, member_no) DO NOTHING;

INSERT INTO team_member (team_id, member_no, role, joined_at)
SELECT t.team_id, m.no, 'MEMBER', CURRENT_TIMESTAMP
FROM team t, member m WHERE t.team_code = 'SYNODOS1' AND m.userid = 'user6'
ON CONFLICT (team_id, member_no) DO NOTHING;

INSERT INTO team_member (team_id, member_no, role, joined_at)
SELECT t.team_id, m.no, 'MEMBER', CURRENT_TIMESTAMP
FROM team t, member m WHERE t.team_code = 'SYNODOS1' AND m.userid = 'user7'
ON CONFLICT (team_id, member_no) DO NOTHING;

INSERT INTO team_member (team_id, member_no, role, joined_at)
SELECT t.team_id, m.no, 'MEMBER', CURRENT_TIMESTAMP
FROM team t, member m WHERE t.team_code = 'SYNODOS1' AND m.userid = 'user8'
ON CONFLICT (team_id, member_no) DO NOTHING;

INSERT INTO team_member (team_id, member_no, role, joined_at)
SELECT t.team_id, m.no, 'MEMBER', CURRENT_TIMESTAMP
FROM team t, member m WHERE t.team_code = 'SYNODOS1' AND m.userid = 'user9'
ON CONFLICT (team_id, member_no) DO NOTHING;

-- =============================================
-- 4. 컬럼 데이터
-- =============================================
INSERT INTO columns (column_id, team_id, title, position)
SELECT nextval('column_seq'), team_id, 'Backlog', 0 FROM team WHERE team_code = 'SYNODOS1'
ON CONFLICT DO NOTHING;

INSERT INTO columns (column_id, team_id, title, position)
SELECT nextval('column_seq'), team_id, 'To Do', 1 FROM team WHERE team_code = 'SYNODOS1'
ON CONFLICT DO NOTHING;

INSERT INTO columns (column_id, team_id, title, position)
SELECT nextval('column_seq'), team_id, 'In Progress', 2 FROM team WHERE team_code = 'SYNODOS1'
ON CONFLICT DO NOTHING;

INSERT INTO columns (column_id, team_id, title, position)
SELECT nextval('column_seq'), team_id, 'Review', 3 FROM team WHERE team_code = 'SYNODOS1'
ON CONFLICT DO NOTHING;

INSERT INTO columns (column_id, team_id, title, position)
SELECT nextval('column_seq'), team_id, 'Done', 4 FROM team WHERE team_code = 'SYNODOS1'
ON CONFLICT DO NOTHING;

-- DEVTEAM1 컬럼
INSERT INTO columns (column_id, team_id, title, position)
SELECT nextval('column_seq'), team_id, 'Backlog', 0 FROM team WHERE team_code = 'DEVTEAM1'
ON CONFLICT DO NOTHING;

INSERT INTO columns (column_id, team_id, title, position)
SELECT nextval('column_seq'), team_id, 'To Do', 1 FROM team WHERE team_code = 'DEVTEAM1'
ON CONFLICT DO NOTHING;

INSERT INTO columns (column_id, team_id, title, position)
SELECT nextval('column_seq'), team_id, 'In Progress', 2 FROM team WHERE team_code = 'DEVTEAM1'
ON CONFLICT DO NOTHING;

INSERT INTO columns (column_id, team_id, title, position)
SELECT nextval('column_seq'), team_id, 'Review', 3 FROM team WHERE team_code = 'DEVTEAM1'
ON CONFLICT DO NOTHING;

INSERT INTO columns (column_id, team_id, title, position)
SELECT nextval('column_seq'), team_id, 'Done', 4 FROM team WHERE team_code = 'DEVTEAM1'
ON CONFLICT DO NOTHING;

-- =============================================
-- 5. 태스크 데이터
-- =============================================
-- Backlog
INSERT INTO task (task_id, column_id, title, description, position, priority, workflow_status, start_date, due_date, created_by)
SELECT nextval('task_seq'), c.column_id, 'subtract 함수 추가', 'main.js에 뺄셈 함수를 추가합니다.',
       0, 'MEDIUM', 'WAITING', CURRENT_DATE - 7, CURRENT_DATE + 7, (SELECT no FROM member WHERE userid = 'admin')
FROM columns c JOIN team t ON c.team_id = t.team_id
WHERE t.team_code = 'SYNODOS1' AND c.title = 'Backlog';

INSERT INTO task (task_id, column_id, title, description, position, priority, workflow_status, start_date, due_date, created_by)
SELECT nextval('task_seq'), c.column_id, 'divide 함수 추가', 'main.js에 나눗셈 함수를 추가합니다.',
       1, 'MEDIUM', 'WAITING', CURRENT_DATE - 5, CURRENT_DATE + 10, (SELECT no FROM member WHERE userid = 'admin')
FROM columns c JOIN team t ON c.team_id = t.team_id
WHERE t.team_code = 'SYNODOS1' AND c.title = 'Backlog';

-- To Do
INSERT INTO task (task_id, column_id, title, description, position, priority, workflow_status, start_date, due_date, created_by)
SELECT nextval('task_seq'), c.column_id, '테스트 코드 작성', 'Jest를 사용하여 테스트 코드를 작성합니다.',
       0, 'HIGH', 'WAITING', CURRENT_DATE - 4, CURRENT_DATE + 5, (SELECT no FROM member WHERE userid = 'admin')
FROM columns c JOIN team t ON c.team_id = t.team_id
WHERE t.team_code = 'SYNODOS1' AND c.title = 'To Do';

INSERT INTO task (task_id, column_id, title, description, position, priority, workflow_status, start_date, due_date, created_by)
SELECT nextval('task_seq'), c.column_id, 'ESLint 설정 추가', '코드 품질을 위한 ESLint 설정을 추가합니다.',
       1, 'MEDIUM', 'WAITING', CURRENT_DATE - 3, CURRENT_DATE + 7, (SELECT no FROM member WHERE userid = 'admin')
FROM columns c JOIN team t ON c.team_id = t.team_id
WHERE t.team_code = 'SYNODOS1' AND c.title = 'To Do';

-- In Progress
INSERT INTO task (task_id, column_id, title, description, position, priority, workflow_status, start_date, due_date, created_by)
SELECT nextval('task_seq'), c.column_id, 'modulo 함수 구현', 'main.js에 나머지 연산 함수를 구현 중입니다.',
       0, 'MEDIUM', 'IN_PROGRESS', CURRENT_DATE - 6, CURRENT_DATE + 3, (SELECT no FROM member WHERE userid = 'user1')
FROM columns c JOIN team t ON c.team_id = t.team_id
WHERE t.team_code = 'SYNODOS1' AND c.title = 'In Progress';

INSERT INTO task (task_id, column_id, title, description, position, priority, workflow_status, start_date, due_date, created_by)
SELECT nextval('task_seq'), c.column_id, '로깅 유틸 추가', 'utils.js에 로깅 유틸리티 함수를 추가 중입니다.',
       1, 'HIGH', 'IN_PROGRESS', CURRENT_DATE - 5, CURRENT_DATE + 2, (SELECT no FROM member WHERE userid = 'user2')
FROM columns c JOIN team t ON c.team_id = t.team_id
WHERE t.team_code = 'SYNODOS1' AND c.title = 'In Progress';

-- Review
INSERT INTO task (task_id, column_id, title, description, position, priority, workflow_status, start_date, due_date, created_by)
SELECT nextval('task_seq'), c.column_id, 'power 함수 구현', '거듭제곱 함수를 구현했습니다. 리뷰 부탁드립니다.',
       0, 'MEDIUM', 'REVIEW', CURRENT_DATE - 8, CURRENT_DATE + 1, (SELECT no FROM member WHERE userid = 'user3')
FROM columns c JOIN team t ON c.team_id = t.team_id
WHERE t.team_code = 'SYNODOS1' AND c.title = 'Review';

-- Done
INSERT INTO task (task_id, column_id, title, description, position, priority, workflow_status, start_date, due_date, created_by)
SELECT nextval('task_seq'), c.column_id, '프로젝트 초기 설정', 'package.json 및 기본 구조를 설정했습니다.',
       0, 'HIGH', 'DONE', CURRENT_DATE - 14, CURRENT_DATE - 7, (SELECT no FROM member WHERE userid = 'admin')
FROM columns c JOIN team t ON c.team_id = t.team_id
WHERE t.team_code = 'SYNODOS1' AND c.title = 'Done';

INSERT INTO task (task_id, column_id, title, description, position, priority, workflow_status, start_date, due_date, created_by)
SELECT nextval('task_seq'), c.column_id, 'add 함수 구현', 'main.js에 덧셈 함수를 구현 완료했습니다.',
       1, 'MEDIUM', 'DONE', CURRENT_DATE - 11, CURRENT_DATE - 4, (SELECT no FROM member WHERE userid = 'user5')
FROM columns c JOIN team t ON c.team_id = t.team_id
WHERE t.team_code = 'SYNODOS1' AND c.title = 'Done';

-- =============================================
-- 6. 담당자 데이터
-- =============================================
INSERT INTO task_assignee (task_id, member_no, accepted, completed, assigned_at)
SELECT t.task_id, m.no, true, false, CURRENT_TIMESTAMP
FROM task t, member m, columns c, team tm
WHERE t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = 'modulo 함수 구현' AND m.userid = 'user1';

INSERT INTO task_assignee (task_id, member_no, accepted, completed, assigned_at)
SELECT t.task_id, m.no, true, false, CURRENT_TIMESTAMP
FROM task t, member m, columns c, team tm
WHERE t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = '로깅 유틸 추가' AND m.userid = 'user2';

INSERT INTO task_assignee (task_id, member_no, accepted, completed, assigned_at)
SELECT t.task_id, m.no, true, true, CURRENT_TIMESTAMP
FROM task t, member m, columns c, team tm
WHERE t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = 'power 함수 구현' AND m.userid = 'user3';

INSERT INTO task_assignee (task_id, member_no, accepted, completed, assigned_at)
SELECT t.task_id, m.no, true, true, CURRENT_TIMESTAMP
FROM task t, member m, columns c, team tm
WHERE t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = '프로젝트 초기 설정' AND m.userid = 'admin';

INSERT INTO task_assignee (task_id, member_no, accepted, completed, assigned_at)
SELECT t.task_id, m.no, true, true, CURRENT_TIMESTAMP
FROM task t, member m, columns c, team tm
WHERE t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = 'add 함수 구현' AND m.userid = 'user5';

-- =============================================
-- 7. 검증자 데이터
-- =============================================
INSERT INTO task_verifier (task_id, member_no, approved, assigned_at)
SELECT t.task_id, m.no, false, CURRENT_TIMESTAMP
FROM task t, member m, columns c, team tm
WHERE t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = 'power 함수 구현' AND m.userid = 'admin';

INSERT INTO task_verifier (task_id, member_no, approved, assigned_at)
SELECT t.task_id, m.no, true, CURRENT_TIMESTAMP
FROM task t, member m, columns c, team tm
WHERE t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = '프로젝트 초기 설정' AND m.userid = 'admin';

-- =============================================
-- 8. 댓글 데이터
-- =============================================
INSERT INTO comment (comment_id, task_id, author_no, content, created_at, updated_at)
SELECT nextval('comment_seq'), t.task_id, m.no, '진행 상황 업데이트합니다.', CURRENT_TIMESTAMP - INTERVAL '2 days', CURRENT_TIMESTAMP - INTERVAL '2 days'
FROM task t, member m, columns c, team tm
WHERE t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = 'modulo 함수 구현' AND m.userid = 'user1';

INSERT INTO comment (comment_id, task_id, author_no, content, created_at, updated_at)
SELECT nextval('comment_seq'), t.task_id, m.no, '코드 확인했습니다. LGTM!', CURRENT_TIMESTAMP - INTERVAL '1 day', CURRENT_TIMESTAMP - INTERVAL '1 day'
FROM task t, member m, columns c, team tm
WHERE t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = 'power 함수 구현' AND m.userid = 'admin';

-- =============================================
-- 9. 알림 데이터
-- =============================================
INSERT INTO notification (notification_id, recipient_no, sender_no, notification_type, title, message, team_id, task_id, is_read, created_at)
SELECT nextval('notification_seq'), r.no, s.no, 'TASK_ASSIGNED', '새 태스크가 배정되었습니다',
       'modulo 함수 구현 태스크가 배정되었습니다.', tm.team_id, t.task_id, false, CURRENT_TIMESTAMP - INTERVAL '3 days'
FROM member r, member s, task t, columns c, team tm
WHERE r.userid = 'user1' AND s.userid = 'admin'
  AND t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = 'modulo 함수 구현';

INSERT INTO notification (notification_id, recipient_no, sender_no, notification_type, title, message, team_id, task_id, is_read, created_at)
SELECT nextval('notification_seq'), r.no, s.no, 'TASK_ASSIGNED', '새 태스크가 배정되었습니다',
       '로깅 유틸 추가 태스크가 배정되었습니다.', tm.team_id, t.task_id, false, CURRENT_TIMESTAMP - INTERVAL '2 days'
FROM member r, member s, task t, columns c, team tm
WHERE r.userid = 'user2' AND s.userid = 'admin'
  AND t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = '로깅 유틸 추가';

INSERT INTO notification (notification_id, recipient_no, sender_no, notification_type, title, message, team_id, task_id, is_read, created_at)
SELECT nextval('notification_seq'), r.no, s.no, 'COMMENT_ADDED', '새 댓글이 달렸습니다',
       'power 함수 구현에 새 댓글이 달렸습니다.', tm.team_id, t.task_id, false, CURRENT_TIMESTAMP - INTERVAL '1 day'
FROM member r, member s, task t, columns c, team tm
WHERE r.userid = 'user3' AND s.userid = 'admin'
  AND t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = 'power 함수 구현';

INSERT INTO notification (notification_id, recipient_no, sender_no, notification_type, title, message, team_id, task_id, is_read, created_at)
SELECT nextval('notification_seq'), r.no, s.no, 'VERIFICATION_REQUESTED', '검증 요청이 도착했습니다',
       'power 함수 구현 태스크의 검증을 요청받았습니다.', tm.team_id, t.task_id, false, CURRENT_TIMESTAMP - INTERVAL '20 hours'
FROM member r, member s, task t, columns c, team tm
WHERE r.userid = 'admin' AND s.userid = 'user3'
  AND t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = 'power 함수 구현';

INSERT INTO notification (notification_id, recipient_no, sender_no, notification_type, title, message, team_id, task_id, is_read, created_at)
SELECT nextval('notification_seq'), r.no, s.no, 'TASK_COMPLETED', '태스크가 완료되었습니다',
       '프로젝트 초기 설정 태스크가 완료되었습니다.', tm.team_id, t.task_id, true, CURRENT_TIMESTAMP - INTERVAL '7 days'
FROM member r, member s, task t, columns c, team tm
WHERE r.userid = 'admin' AND s.userid = 'admin'
  AND t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = '프로젝트 초기 설정';

INSERT INTO notification (notification_id, recipient_no, sender_no, notification_type, title, message, team_id, task_id, is_read, created_at)
SELECT nextval('notification_seq'), r.no, NULL, 'TASK_DUE_SOON', '마감일이 임박했습니다',
       'modulo 함수 구현 태스크의 마감일이 3일 남았습니다.', tm.team_id, t.task_id, false, CURRENT_TIMESTAMP - INTERVAL '6 hours'
FROM member r, task t, columns c, team tm
WHERE r.userid = 'user1'
  AND t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'SYNODOS1' AND t.title = 'modulo 함수 구현';

INSERT INTO notification (notification_id, recipient_no, sender_no, notification_type, title, message, team_id, is_read, created_at)
SELECT nextval('notification_seq'), r.no, s.no, 'TEAM_INVITED', '팀에 초대되었습니다',
       'Synodos 테스트 프로젝트 팀에 초대되었습니다.', tm.team_id, true, CURRENT_TIMESTAMP - INTERVAL '5 days'
FROM member r, member s, team tm
WHERE r.userid = 'user9' AND s.userid = 'admin' AND tm.team_code = 'SYNODOS1';

-- =============================================
-- 10. DEVTEAM1 태스크 데이터
-- =============================================
-- To Do (GitHub 연동 테스트용)
INSERT INTO task (task_id, column_id, title, description, position, priority, workflow_status, start_date, due_date, created_by)
SELECT nextval('task_seq'), c.column_id, 'GitHub Issue 연동 테스트', 'GitHub Issue와 연동되는지 테스트합니다.',
       0, 'HIGH', 'WAITING', CURRENT_DATE, CURRENT_DATE + 7, (SELECT no FROM member WHERE userid = 'dev')
FROM columns c JOIN team t ON c.team_id = t.team_id
WHERE t.team_code = 'DEVTEAM1' AND c.title = 'To Do';

INSERT INTO task (task_id, column_id, title, description, position, priority, workflow_status, start_date, due_date, created_by)
SELECT nextval('task_seq'), c.column_id, 'PR 생성 테스트', 'Task에서 PR을 생성하는 기능을 테스트합니다.',
       1, 'MEDIUM', 'WAITING', CURRENT_DATE, CURRENT_DATE + 14, (SELECT no FROM member WHERE userid = 'dev')
FROM columns c JOIN team t ON c.team_id = t.team_id
WHERE t.team_code = 'DEVTEAM1' AND c.title = 'To Do';

-- In Progress
INSERT INTO task (task_id, column_id, title, description, position, priority, workflow_status, start_date, due_date, created_by)
SELECT nextval('task_seq'), c.column_id, '브랜치 뷰 테스트', 'GitHub 브랜치 시각화 기능을 테스트합니다.',
       0, 'HIGH', 'IN_PROGRESS', CURRENT_DATE - 3, CURRENT_DATE + 5, (SELECT no FROM member WHERE userid = 'dev')
FROM columns c JOIN team t ON c.team_id = t.team_id
WHERE t.team_code = 'DEVTEAM1' AND c.title = 'In Progress';

INSERT INTO task (task_id, column_id, title, description, position, priority, workflow_status, start_date, due_date, created_by)
SELECT nextval('task_seq'), c.column_id, 'AI 머지 충돌 해결 테스트', 'AI를 사용한 머지 충돌 해결 기능을 테스트합니다.',
       1, 'CRITICAL', 'IN_PROGRESS', CURRENT_DATE - 2, CURRENT_DATE + 3, (SELECT no FROM member WHERE userid = 'dev')
FROM columns c JOIN team t ON c.team_id = t.team_id
WHERE t.team_code = 'DEVTEAM1' AND c.title = 'In Progress';

-- Done
INSERT INTO task (task_id, column_id, title, description, position, priority, workflow_status, start_date, due_date, created_by)
SELECT nextval('task_seq'), c.column_id, '프로젝트 환경 설정', '개발 환경 설정을 완료했습니다.',
       0, 'HIGH', 'DONE', CURRENT_DATE - 10, CURRENT_DATE - 5, (SELECT no FROM member WHERE userid = 'dev')
FROM columns c JOIN team t ON c.team_id = t.team_id
WHERE t.team_code = 'DEVTEAM1' AND c.title = 'Done';

-- =============================================
-- 11. DEVTEAM1 담당자 데이터
-- =============================================
INSERT INTO task_assignee (task_id, member_no, accepted, completed, assigned_at)
SELECT t.task_id, m.no, true, false, CURRENT_TIMESTAMP
FROM task t, member m, columns c, team tm
WHERE t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'DEVTEAM1' AND t.title = '브랜치 뷰 테스트' AND m.userid = 'dev';

INSERT INTO task_assignee (task_id, member_no, accepted, completed, assigned_at)
SELECT t.task_id, m.no, true, false, CURRENT_TIMESTAMP
FROM task t, member m, columns c, team tm
WHERE t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'DEVTEAM1' AND t.title = 'AI 머지 충돌 해결 테스트' AND m.userid = 'dev';

INSERT INTO task_assignee (task_id, member_no, accepted, completed, assigned_at)
SELECT t.task_id, m.no, true, true, CURRENT_TIMESTAMP
FROM task t, member m, columns c, team tm
WHERE t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'DEVTEAM1' AND t.title = '프로젝트 환경 설정' AND m.userid = 'dev';

-- =============================================
-- 12. DEVTEAM1 검증자 데이터
-- =============================================
-- PR 생성 테스트: admin이 검증자 (dev가 담당자이므로 admin이 PR 머지 가능)
INSERT INTO task_verifier (task_id, member_no, approved, assigned_at)
SELECT t.task_id, m.no, false, CURRENT_TIMESTAMP
FROM task t, member m, columns c, team tm
WHERE t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'DEVTEAM1' AND t.title = 'PR 생성 테스트' AND m.userid = 'admin';

-- 브랜치 뷰 테스트: user1이 검증자
INSERT INTO task_verifier (task_id, member_no, approved, assigned_at)
SELECT t.task_id, m.no, false, CURRENT_TIMESTAMP
FROM task t, member m, columns c, team tm
WHERE t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'DEVTEAM1' AND t.title = '브랜치 뷰 테스트' AND m.userid = 'user1';

-- AI 머지 충돌 해결 테스트: admin이 검증자
INSERT INTO task_verifier (task_id, member_no, approved, assigned_at)
SELECT t.task_id, m.no, false, CURRENT_TIMESTAMP
FROM task t, member m, columns c, team tm
WHERE t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'DEVTEAM1' AND t.title = 'AI 머지 충돌 해결 테스트' AND m.userid = 'admin';

-- GitHub Issue 연동 테스트: user2가 검증자
INSERT INTO task_verifier (task_id, member_no, approved, assigned_at)
SELECT t.task_id, m.no, false, CURRENT_TIMESTAMP
FROM task t, member m, columns c, team tm
WHERE t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'DEVTEAM1' AND t.title = 'GitHub Issue 연동 테스트' AND m.userid = 'user2';

-- 프로젝트 환경 설정 (완료됨): admin이 검증 완료
INSERT INTO task_verifier (task_id, member_no, approved, assigned_at)
SELECT t.task_id, m.no, true, CURRENT_TIMESTAMP
FROM task t, member m, columns c, team tm
WHERE t.column_id = c.column_id AND c.team_id = tm.team_id
  AND tm.team_code = 'DEVTEAM1' AND t.title = '프로젝트 환경 설정' AND m.userid = 'admin';
