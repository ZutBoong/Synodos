# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Synodos is a team-based Kanban board application with a Spring Boot backend and React frontend, using PostgreSQL database for persistence. Features include JWT authentication, real-time updates via WebSocket, task comments, verification workflow, team chat, GitHub integration (issues, PRs, branches), and AI-powered analysis via OpenAI API.

## Build and Run Commands

### Backend (Spring Boot)
```bash
cd backend
./mvnw spring-boot:run          # Start backend server (port 8081)
./mvnw clean package            # Build JAR
./mvnw test                     # Run all tests
./mvnw test -Dtest=TestClass    # Run single test class
./mvnw test -Dtest=TestClass#methodName  # Run single test method

# Windows PowerShell (use quotes around profile arg)
.\mvnw spring-boot:run "-Dspring-boot.run.profiles=local"
```

### Claude Code Bash Environment (Important)
This project runs on Windows, but Claude Code's Bash uses a Unix-like environment.
When executing Windows paths and commands, always wrap them with `cmd /c`:
```bash
# Backend compile
cmd /c "cd /d C:\Synodos\backend && mvnw.cmd compile -q"

# Backend test
cmd /c "cd /d C:\Synodos\backend && mvnw.cmd test -q"

# Frontend build
cmd /c "cd /d C:\Synodos\frontend && npm run build"
```

### Frontend (React)
```bash
cd frontend
npm install                     # Install dependencies
npm start                       # Start dev server (port 3000, proxies to 8081)
npm run build                   # Production build
npm test                        # Run tests
npm test -- --watchAll=false    # Run tests once without watch mode
```

### Database
PostgreSQL running on localhost:5432. Schema files in `database/` folder:
- `postgresql_schema.sql` - Full consolidated schema

Setup from scratch:
```sql
CREATE DATABASE synodos;
CREATE USER flow WITH PASSWORD 'flow123';
GRANT ALL PRIVILEGES ON DATABASE synodos TO flow;
\c synodos
GRANT ALL ON SCHEMA public TO flow;
```

Initialize schema:
```bash
psql -U flow -d synodos -f database/postgresql_schema.sql
```

### Docker (Full Stack)
```bash
docker-compose up --build              # Start all services
docker-compose up -d --build           # Start in background
docker-compose down                    # Stop all services
docker-compose down -v                 # Stop and remove volumes (DB reset)
```

**Docker Database Behavior:**
- First run creates tables via `schema.sql` (no seed data)
- Data persists via `postgres_data` volume
- **To reset**: `docker-compose down -v` (must delete volume)
- Restart alone preserves data

### Test Accounts (Local Development)

**샘플 데이터 자동 로드:**
- 백엔드 실행 시 `sample-data.sql`이 자동 실행됨 (Spring Boot `spring.sql.init.data-locations`)
- `ON CONFLICT DO NOTHING`으로 중복 방지 → 재시작해도 안전

**기본 테스트 계정:**
| ID | Password | 용도 |
|----|----------|------|
| `dev` | `1234` | 개발자 슈퍼계정 (GitHub 미연동) |
| `admin` | `1234` | 관리자 계정 |
| `user1`~`user8` | `1234` | 일반 사용자 |

**테스트 팀:**
- DEVTEAM1 (개발팀1) - 기본 컬럼과 태스크 포함

**GitHub 연동 설정 (선택):**
개발자 계정으로 GitHub 기능을 테스트하려면:
```sql
-- PostgreSQL에서 직접 실행
UPDATE member SET
  github_username = 'YourGitHubUsername',
  github_access_token = 'ghp_xxxx...'
WHERE userid = 'dev';
```

또는 로그인 후 마이페이지에서 GitHub 연동 버튼으로 OAuth 연결 가능.

**Local Schema Initialization:**
- Spring Boot auto-executes `schema.sql` on startup (`spring.sql.init.mode=always`)
- Uses `CREATE TABLE IF NOT EXISTS` to preserve existing data

## Architecture

### Backend Structure (Spring Boot 3.2 + MyBatis + PostgreSQL)
```
backend/src/main/java/com/example/demo/
├── controller/     # REST endpoints under /api prefix
├── service/        # Business logic layer
├── dao/            # MyBatis mapper interfaces
├── model/          # Data entities with Lombok annotations
├── config/         # WebSocket and Security configuration
├── security/       # JWT token provider and authentication filter
└── dto/            # Data transfer objects
```

### Controllers (Complete List)
| Controller | Description |
|------------|-------------|
| `MemberController` | Authentication, registration, profile |
| `TeamController` | Team CRUD, member management, GitHub repo linking |
| `TaskController` | Task CRUD, drag-drop, filters, calendar |
| `SynodosColumnController` | Board columns management |
| `CommentController` | Task comments |
| `ChatController` | Team chat messaging |
| `FileController` | File upload/download |
| `NotificationController` | Notification CRUD |
| `PresenceController` | WebSocket presence tracking |
| `TaskWorkflowController` | Task workflow transitions |
| `TaskAssigneeController` | Multiple assignees management |
| `TaskVerifierController` | Multiple verifiers management |
| `TaskFavoriteController` | Task favorites/bookmarks |
| `TaskArchiveController` | Task archiving |
| `AnalysisController` | AI code analysis |
| `EmailVerificationController` | Email verification |
| `GitHubController` | Branch/commit/PR operations, conflict resolution |
| `GitHubOAuthController` | GitHub OAuth flow |
| `GitHubWebhookController` | GitHub webhook events |
| `GitHubIssueSyncController` | GitHub issue sync |

### Models (Complete List)
| Model | Description |
|-------|-------------|
| `Member` | User with OAuth, GitHub integration |
| `MemberSocialLink` | Multiple social account linking |
| `Team` | Team with GitHub repo config |
| `TeamMember` | Team membership with roles |
| `SynodosColumn` | Kanban board columns |
| `Task` | Task with workflow, priority, dates |
| `TaskAssignee` | Task assignees (multiple) |
| `TaskVerifier` | Task verifiers (multiple) |
| `Comment` | Task comments with GitHub sync |
| `ChatMessage` | Team chat messages |
| `Notification` | System notifications |
| `ProjectFile` | File attachments |
| `TaskFavorite` | User's favorite tasks |
| `TaskArchive` | Archived task snapshots (JSONB) |
| `EmailVerification` | Verification codes |
| `TaskCommit` | Task-to-commit linking |
| `TaskGitHubIssue` | Task-to-GitHub-issue sync |
| `TaskGitHubPR` | Task-to-PR linking |
| `GitHubIssueSyncLog` | Sync operation history |
| `GitHubUserMapping` | User-to-GitHub mapping |

### Services (Complete List)

**Core Services:**
- `MemberService` - User management, authentication
- `TeamService` - Team operations, GitHub repo integration
- `TaskService` - Task CRUD, workflow, filters
- `SynodosColumnService` - Column management
- `CommentService` - Comment CRUD
- `ChatService` - Chat messaging
- `FileService` - File operations

**Workflow Services:**
- `TaskWorkflowService` - Task state machine
- `TaskAssigneeService` - Multiple assignees, acceptance workflow
- `TaskVerifierService` - Multiple verifiers, approval workflow

**Feature Services:**
- `TaskFavoriteService` - Favorite management
- `TaskArchiveService` - Archive operations
- `NotificationService` - Persistent notifications
- `BoardNotificationService` - Real-time WebSocket notifications
- `DeadlineSchedulerService` - Scheduled deadline alerts
- `PresenceService` - User online status

**GitHub Integration Services:**
- `GitHubService` - Branch/commit/PR operations, merge, revert
- `GitHubIssueService` - GitHub issue API operations
- `GitHubIssueSyncService` - Bidirectional task-issue sync
- `GitHubCommentSyncService` - Comment sync with GitHub issues
- `GitHubLabelService` - Label management
- `GitHubWebhookService` - Webhook event processing

**External Services:**
- `GeminiService` - OpenAI API for code analysis, conflict resolution
- `EmailService` - SMTP/AWS SES email
- `EmailVerificationService` - Verification codes

### External Integrations
- **OpenAI API**: `GeminiService` calls OpenAI for AI-powered analysis and conflict resolution
- **GitHub**: Branch/commit operations, PR creation/merge, issue sync, webhooks
- **OAuth2**: Google, Naver, Kakao, GitHub social login
- **Email**: Gmail SMTP (default) or AWS SES

### MyBatis Conventions
- Mapper XMLs in `resources/mapper/` (one per entity)
- Standard method names: `insert`, `update`, `delete`, `content` (get by ID), `listAll`, `listByColumn`, `listByTeam`
- Database uses `snake_case`, Java uses `camelCase` (auto-mapped via `map-underscore-to-camel-case=true`)
- Use `@Param` annotations in DAO interfaces for named parameters

### Task Workflow States
Tasks use `workflow_status` field:
- `WAITING` → `IN_PROGRESS` (assignee accepts) → `REVIEW` (submitted for review) → `DONE` (approved)
- `REJECTED` (verifier rejected, needs rework)
- `DECLINED` (assignee declined the task)

Rejections store `rejection_reason`, `rejected_at`, and `rejected_by` fields.

### Service Layer Patterns
```java
// Pattern: Populate relations after DAO fetch, trigger notifications after mutations
Task task = dao.content(id);
populateRelations(task);  // Load assignees, verifiers
dao.update(task);
notificationService.notifyTaskUpdated(task, teamId);
```

### Frontend Structure (React 18 + React Router)
```
frontend/src/
├── api/            # Axios API clients
├── components/     # Reusable UI components
├── pages/          # Route page components
└── pages/views/    # Team sub-views
```

### Frontend API Clients
| API Client | Description |
|------------|-------------|
| `axiosInstance.js` | Axios config with JWT injection |
| `boardApi.js` | Task/column CRUD, workflow, favorites |
| `teamApi.js` | Team CRUD, member management |
| `memberApi.js` | Auth, profile, password reset |
| `commentApi.js` | Comment CRUD |
| `chatApi.js` | Chat messaging |
| `fileApi.js` | File upload/download |
| `notificationApi.js` | Notification CRUD |
| `analysisApi.js` | AI code analysis |
| `emailApi.js` | Email verification |
| `githubApi.js` | Branch/commit/PR operations |
| `githubIssueApi.js` | GitHub issue sync |
| `websocketService.js` | WebSocket STOMP client |

### Frontend Pages
| Page | Description |
|------|-------------|
| `Home.js` | Dashboard/team selection |
| `TeamView.js` | Main team workspace |
| `MyPage.js` | User profile |
| `MyActivity.js` | User's tasks/notifications |
| `NotificationsPage.js` | Notification center |
| `Login.js`, `Register.js` | Authentication |
| `FindId.js`, `FindPassword.js` | Account recovery |
| `OAuth2Redirect.js` | OAuth callback handler |
| `SocialSignupComplete.js` | Social signup setup |
| `CreateTeam.js` | Team creation |
| `Invite.js` | Team invitation |
| `GitHubCallback.js` | GitHub OAuth callback |

### Frontend Views (Team Sub-views)
| View | Description |
|------|-------------|
| `OverviewView.js` | Team dashboard with statistics |
| `BoardView.js` | Kanban board with drag-drop |
| `ListView.js` | Task list with filters/sorting |
| `CalendarView.js` | Calendar grid (deadline-based) |
| `TimelineView.js` | Gantt chart visualization |
| `BranchView.js` | GitHub branch/commit/PR management |
| `ChatView.js` | Team chat interface |
| `FilesView.js` | File management |
| `AdminView.js` | Team admin settings |
| `SettingsView.js` | GitHub integration config |

### Key Components
| Component | Description |
|-----------|-------------|
| `Header.js` | Top navigation, team switcher |
| `Sidebar.js` | Team menu and navigation |
| `TaskDetailView.js` | Task editor panel (right sidebar) |
| `TaskCreateModal.js` | Quick task creation |
| `CommentSection.js` | Comment threading |
| `CommitBrowser.js` | GitHub commit viewer |
| `LinkedCommits.js` | Task-to-commit display |
| `GitHubIssueLink.js` | GitHub issue status |
| `FilterBar.js` | Task filtering UI |
| `ChatPanel.js` | Chat UI |
| `NotificationBell.js` | Notification indicator |

### Frontend State Management
- Component-level state with React Hooks (no Redux/Context)
- localStorage keys: `token` (JWT), `member` (user info), `currentTeam`
- Axios interceptors: auto token injection, 401 redirects to login

### Real-Time Communication (WebSocket)
- Endpoint: `/ws` (STOMP over SockJS)
- Subscribe: `/topic/team/{teamId}` for board events
- Subscribe: `/topic/user/{memberNo}/notifications` for personal notifications
- Publish: `/app/presence/join/{teamId}`, `/app/presence/leave/{teamId}`
- Event types: `TASK_CREATED`, `TASK_UPDATED`, `TASK_MOVED`, `TASK_DELETED`, `COLUMN_CREATED`, etc.

### Notification System (Dual-Channel)
- **Real-time:** `BoardNotificationService` → WebSocket `/topic/team/{teamId}`
- **Persistent:** `NotificationService` → database `notification` table

Notification types:
- `TEAM_INVITE`, `TASK_ASSIGNEE`, `TASK_VERIFIER`, `TASK_REVIEW`
- `DEADLINE_APPROACHING`, `DEADLINE_PASSED`, `TASK_REJECTED`
- `COMMENT_ADDED`, `MENTION`

### GitHub Issue Sync
- Tasks can be linked to GitHub issues via `TaskGitHubIssue` entity
- `GitHubWebhookController` receives webhook events from GitHub
- `GitHubIssueSyncService` handles bidirectional sync between tasks and issues
- User mappings stored in `GitHubUserMapping` table
- Conflict detection with 5-minute window

**GitHub Repository Connection Flow:**
1. Click "Connect GitHub Repository" in team settings
2. Fetch user's GitHub repository list (`GitHubService.listUserRepositories`)
3. On repository selection, auto-register webhook (`GitHubService.createWebhook`)
4. Webhook URL from `GITHUB_WEBHOOK_BASE_URL` environment variable
   - Not set + localhost → Frontend prompts for ngrok URL
   - Set → Automatically uses that URL
5. Webhook events: `issues`, `issue_comment`, `push`

### GitHub PR Integration
- `TaskGitHubPR` entity manages Task-PR connections
- `BranchView` allows Direct Merge or PR creation on branch merge
- PR creation offers Task linking option
- `TaskDetailView` displays linked PRs:
  - PRs created in Synodos
  - PRs referencing GitHub Issues (auto-discovered, shows "Issue Reference" badge)

### API Endpoint Pattern
Backend endpoints: `/api/{resource}{action}` (e.g., `/api/taskwrite`, `/api/tasklist`, `/api/taskdelete/{id}`)
Frontend proxy forwards all `/api/*` requests to backend port 8081.

### Key API Endpoints

**Task Operations:**
- `POST /api/taskwrite` - Create
- `GET /api/tasklist[/columnId][/team/{teamId}]` - List
- `GET /api/taskcontent/{id}` - Detail
- `PUT /api/taskupdate` - Update
- `DELETE /api/taskdelete/{id}` - Delete
- `PUT /api/taskposition` - Drag-drop
- `GET /api/task/calendar/{teamId}` - Calendar view data
- `GET /api/tasklist/verification/pending/{memberNo}` - Pending reviews

**Workflow:**
- `POST /api/task/workflow/{id}/accept?memberNo={no}` - Accept
- `POST /api/task/workflow/{id}/complete?memberNo={no}` - Complete
- `POST /api/task/workflow/{id}/approve?memberNo={no}` - Approve
- `POST /api/task/workflow/{id}/reject?memberNo={no}` - Reject
- `POST /api/task/workflow/{id}/decline?memberNo={no}` - Decline
- `POST /api/task/workflow/{id}/restart?memberNo={no}` - Restart

**Assignees/Verifiers:**
- `GET/POST /api/task/{id}/[verifiers|assignees]` - Manage multiple
- `DELETE /api/task/{id}/verifier/{memberNo}` - Remove

**GitHub:**
- `GET /api/github/branches/{teamId}` - List branches
- `GET /api/github/commits/{teamId}` - List commits
- `POST /api/github/branch/{teamId}` - Create branch
- `POST /api/github/merge/{teamId}` - Merge branches
- `DELETE /api/github/branch/{teamId}/{name}` - Delete branch
- `POST /api/github/pr/{teamId}` - Create PR
- `GET /api/github/task/{id}/pr` - Get task PRs
- `POST /api/github/task/{id}/pr/{prId}/merge` - Merge PR
- `POST /api/github/conflict/resolve` - AI conflict resolution

**GitHub Issue Sync:**
- `GET /api/github-issue/team/{teamId}/status` - Sync status
- `POST /api/github-issue/task/{taskId}/link` - Link task to issue
- `POST /api/github-issue/team/{teamId}/sync` - Trigger sync

## Key Configuration
- Backend port: 8081, Frontend dev port: 3000 (proxies to 8081)
- DB credentials: flow/flow123@localhost:5432/synodos
- Java 17, Node 18+

### Configuration Files

| File | Purpose | Git |
|------|---------|-----|
| `.env` | Docker deployment | .gitignore |
| `application-local.properties` | Local development | .gitignore |

### Environment Variable Pattern (Important)

This project separates local/deployment environments with this pattern:

1. **`application.properties`**: Define environment variable references
   ```properties
   github.webhook.base-url=${GITHUB_WEBHOOK_BASE_URL:}
   # ${VAR_NAME:default} format - uses default if env var not set
   ```

2. **Local Development**: Set values directly in `application-local.properties`
   ```properties
   github.oauth.client-id=actual-value-here
   ```

3. **Docker Deployment**: `.env` → injected via `docker-compose.yml`
   ```yaml
   # docker-compose.yml
   environment:
     GITHUB_WEBHOOK_BASE_URL: ${GITHUB_WEBHOOK_BASE_URL:-}
   ```

**New Environment Variable Checklist:**
- [ ] Add `${VAR_NAME:}` reference to `application.properties`
- [ ] Add with description to `.env.example`
- [ ] Add actual value to `.env`
- [ ] Add to `docker-compose.yml` backend environment
- [ ] Add local value to `application-local.properties` if needed

**Sensitivity Guidelines:**
- Sensitive: API keys, passwords, OAuth secrets → `.env`, `application-local.properties` (gitignored)
- Non-sensitive: Public URLs, ports, mode settings → `application.properties` directly or as defaults

### Local Development (application-local.properties)
Copy `application-local.properties.example` and configure:
```properties
# SMTP (Gmail App Password)
spring.mail.username=your-email@gmail.com
spring.mail.password=your-16-digit-app-password

# AI API (OpenAI)
gemini.api.key=your-openai-api-key

# OAuth2 - Google
spring.security.oauth2.client.registration.google.client-id=your-client-id
spring.security.oauth2.client.registration.google.client-secret=your-client-secret

# OAuth2 - Naver
spring.security.oauth2.client.registration.naver.client-id=your-client-id
spring.security.oauth2.client.registration.naver.client-secret=your-client-secret

# OAuth2 - Kakao
spring.security.oauth2.client.registration.kakao.client-id=your-client-id
spring.security.oauth2.client.registration.kakao.client-secret=your-client-secret

# GitHub
github.oauth.client-id=your-client-id
github.oauth.client-secret=your-client-secret
```

### Docker Deployment (.env)
Copy `.env.example` to `.env` and configure:
- `DB_USERNAME`, `DB_PASSWORD` - Database credentials
- `JWT_SECRET` - JWT signing key
- `SMTP_USERNAME`, `SMTP_PASSWORD` - Gmail SMTP
- `GEMINI_API_KEY` - OpenAI API key
- OAuth credentials (GOOGLE, NAVER, KAKAO, GITHUB)
- `GITHUB_WEBHOOK_BASE_URL` - External webhook URL

### Email Configuration
- `email.environment=dev` - Logs emails to console
- `email.environment=prod` - Sends via SMTP (default)

## Data Hierarchy
```
Team → SynodosColumn → Task → [Comments, TaskAssignee, TaskVerifier, TaskGitHubIssue, TaskGitHubPR]
     → TeamMember (links Member to Team with role)
     → ChatMessage
     → ProjectFile
```
- Drag-and-drop uses `@hello-pangea/dnd` library
- File uploads: max 50MB per file (`spring.servlet.multipart.max-file-size`)

## Database Schema (20+ tables)

### Core Tables
- `member` - Users (20+ columns including OAuth, GitHub, email verification)
- `member_social_link` - Multiple social account mapping
- `team` - Teams with GitHub repo integration
- `team_member` - Membership with roles
- `columns` - Kanban columns with GitHub prefix mapping
- `task` - Tasks with workflow status, priority, dates, rejection tracking
- `task_assignee` - Multiple assignees with acceptance/completion status
- `task_verifier` - Multiple verifiers with approval status

### Communication Tables
- `comment` - Task comments with GitHub sync
- `chat_message` - Team chat
- `notification` - System notifications

### Feature Tables
- `task_favorite` - Favorites bookmarks
- `task_archive` - Archived task snapshots (JSONB)
- `file` - File attachments
- `email_verification` - Verification codes

### GitHub Integration Tables
- `task_commit` - Commit linking
- `task_github_issue` - GitHub issue sync with conflict detection
- `task_github_pr` - PR linking
- `github_issue_sync_log` - Sync history
- `github_user_mapping` - User-to-GitHub-account mapping
