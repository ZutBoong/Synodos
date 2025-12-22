# Flowtask v0 Prompts

Flowtask 프로젝트의 UI를 v0로 재현하기 위한 프롬프트 모음입니다.

---

## 1. 디자인 시스템

```
Create a design system for a Kanban board application called "Flowtask" with:

Color Palette:
- Primary gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%)
- Success: #10b981
- Warning: #f59e0b
- Error: #ef4444
- Background: #f8fafc
- Text primary: #1e293b
- Text secondary: #64748b
- Border: #e2e8f0

Typography:
- Font family: system-ui, -apple-system, sans-serif
- Headings: font-weight 700
- Body: font-weight 400

Border radius: 12px for cards/inputs, 8px for buttons
Box shadow: 0 4px 6px -1px rgba(0,0,0,0.1)

Button styles:
- Primary: purple gradient with hover lift effect (translateY -2px)
- Secondary: gray background #f1f5f9
- Danger: red gradient
```

---

## 2. 로그인 페이지

```
Create a modern login page for "Flowtask" kanban application with:

Layout:
- Centered card on gradient background (purple to pink gradient)
- Logo at top with app name "Flowtask"
- Tagline: "팀 협업을 위한 스마트 칸반 보드"

Form fields:
- User ID input with user icon
- Password input with lock icon and show/hide toggle
- "Remember me" checkbox
- Login button (purple gradient, full width)

Additional links below form:
- "아이디 찾기" | "비밀번호 찾기" | "회원가입"

Style:
- White card with rounded corners (16px)
- Subtle shadow
- Smooth focus states on inputs (purple border glow)
- Korean language labels
```

---

## 3. 사이드바 네비게이션

```
Create a collapsible sidebar navigation for a Kanban app with:

Header section:
- App logo and name "Flowtask"
- Collapse/expand button

Navigation items with icons:
- 내 활동 (Activity icon)
- 캘린더 (Calendar icon)
- 마이페이지 (User icon)

Teams section:
- "내 팀" header with "+" button to create team
- List of team items showing:
  - Team color dot
  - Team name (truncated if long)
  - Member count badge
- Active team highlighted with purple background

Bottom section:
- Current user info (avatar with initials, name)
- Settings gear icon
- Logout button

Style:
- Width: 260px expanded, 60px collapsed
- Dark sidebar (#1e293b) or light (#ffffff)
- Smooth slide animation on collapse
- Hover effects on nav items
```

---

## 4. 칸반 보드 (메인 화면)

```
Create a Kanban board interface with:

Header:
- Team name with dropdown
- Tab navigation: 개요 | 목록 | 보드 | 타임라인 | 캘린더 | 파일
- Search input
- Filter button with badge
- Online members avatars (stacked, max 5 shown)

Board layout:
- Horizontal scrollable columns
- Each column has:
  - Header with title, task count, 3-dot menu
  - Droppable area for task cards
  - "새 태스크 추가" button at bottom

Task cards showing:
- Title (bold)
- Priority badge (CRITICAL red, HIGH orange, MEDIUM blue, LOW gray)
- Due date with calendar icon
- Assignee avatars (up to 3)
- Tag chips (colored)
- Comment count icon
- Attachment count icon
- Favorite star toggle

Add column button:
- Dashed border card with "+" icon
- "새 컬럼 추가" text

Style:
- Column width: 300px
- Card gap: 8px
- Drag shadow effect on cards
- Smooth reorder animation
```

---

## 5. 태스크 상세 모달

```
Create a task detail modal for a Kanban app with:

Layout: Two-column (main content left, metadata right)

Left column (60%):
- Editable title (large, bold)
- Description textarea with markdown support hint
- Comments section:
  - Comment list with author avatar, name, time, content
  - New comment input at bottom

Right column (40%):
- Status dropdown: 대기중 | 진행중 | 검토중 | 완료 | 반려
- Priority dropdown: 긴급 | 높음 | 보통 | 낮음
- Assignees section:
  - Label "담당자"
  - Member chips with X to remove
  - "+ 추가" button with member search dropdown
- Verifiers section (same pattern as assignees)
- Dates:
  - Start date picker
  - Due date picker with time
- Tags:
  - Tag chips (colored, removable)
  - "+ 태그 추가" with color picker
- Attachments:
  - File list with icon, name, size
  - Upload button
- Section dropdown (for grouping)

Footer:
- Archive button (left)
- Delete button (left, red)
- Close button (right)

Workflow buttons (conditional):
- "작업 수락" (when assigned)
- "완료 요청" (when in progress)
- "승인" / "반려" (for verifiers)

Style:
- Modal width: 900px max
- Overlay with blur effect
- Slide-up animation
- Section dividers
```

---

## 6. 필터 바

```
Create a filter bar component for task filtering with:

Layout: Horizontal bar with multiple filter controls

Filters:
- Search input with magnifying glass icon (placeholder: "태스크 검색...")
- Priority multi-select dropdown (긴급, 높음, 보통, 낮음)
- Status multi-select dropdown (대기중, 진행중, 검토중, 완료, 반려)
- Assignee dropdown with member avatars
- Tag multi-select with colored chips
- Due date filter (오늘, 이번 주, 이번 달, 기한 지남, 기한 없음)

Active filter indicators:
- Show count badge on each filter when active
- "필터 초기화" button when any filter active

Collapsible:
- Expand/collapse button
- Show active filter summary when collapsed

Style:
- Sticky positioning
- Light background
- Rounded dropdowns
- Checkbox items in dropdowns
```

---

## 7. 팀 채팅 패널

```
Create a team chat panel component with:

Header:
- "팀 채팅" title
- Online member count
- Minimize/expand button

Message list:
- Messages grouped by date
- Each message shows:
  - Sender avatar (initials)
  - Sender name
  - Timestamp
  - Message content
- Current user messages aligned right, others left
- Different background for own messages

Input area:
- Text input (multiline)
- Send button with arrow icon
- Emoji picker button (optional)

Style:
- Panel width: 320px
- Position: fixed right side or bottom
- Max height with scroll
- Smooth scroll to bottom on new message
- Subtle message bubble style
```

---

## 8. 알림 벨 드롭다운

```
Create a notification bell dropdown component with:

Bell icon:
- Badge showing unread count (red circle)
- Animation pulse when new notification

Dropdown panel:
- Header: "알림" with "모두 읽음" button
- Notification list:
  - Icon by type (task assigned, comment, mention, etc.)
  - Title (bold)
  - Message preview (truncated)
  - Time ago (e.g., "5분 전")
  - Unread indicator (blue dot)
- Empty state: "새로운 알림이 없습니다"

Notification types with icons:
- TASK_ASSIGNED: user-plus icon
- COMMENT_ADDED: message icon
- TASK_COMPLETED: check-circle icon
- MENTION: at-sign icon

Style:
- Dropdown width: 360px
- Max 5 visible, scroll for more
- Hover highlight
- Click to navigate and mark read
```

---

## 9. 목록 뷰 (ListView)

```
Create a list view for tasks with:

Layout: Table-like structure grouped by columns

Group headers (collapsible):
- Column name
- Task count
- Chevron icon for expand/collapse

Task rows showing:
- Drag handle
- Checkbox (for bulk actions)
- Priority indicator (colored dot)
- Title (clickable)
- Status badge
- Assignee avatars
- Due date (red if overdue)
- Tags (first 2, +N for more)

Features:
- Sortable columns
- Inline quick edit on double-click
- Row hover actions (edit, delete, favorite)
- Drag to reorder within group

Empty state:
- Illustration
- "이 컬럼에 태스크가 없습니다" message
- "새 태스크 추가" button

Style:
- Alternating row backgrounds
- Sticky group headers
- Compact row height (48px)
```

---

## 10. 캘린더 뷰

```
Create a calendar view for task due dates with:

Header:
- Month/Year display with navigation arrows
- Today button
- View toggle: 월 | 주

Calendar grid:
- Day headers (일 월 화 수 목 금 토)
- Date cells with:
  - Date number (today highlighted)
  - Task dots or mini cards
  - "+N more" if many tasks

Task display on date:
- Colored bar by priority
- Title (truncated)
- Click to open task modal

Mini task popup on hover:
- Title, assignee, priority, status

Style:
- Current month dates darker, other months lighter
- Today: purple circle background
- Weekend columns slightly different background
- Responsive grid
```

---

## 11. 타임라인 뷰

```
Create a timeline/roadmap view with:

Header:
- Date range selector
- Zoom controls (일 | 주 | 월)
- Section filter dropdown

Timeline structure:
- Left sidebar: Section names (collapsible groups)
- Right area: Gantt-style bars

Task bars:
- Horizontal bar from start_date to due_date
- Color by priority or status
- Task title inside bar
- Resize handles on edges
- Drag to move dates

Today indicator:
- Vertical red line

Dependencies (optional):
- Arrow connections between tasks

Style:
- Horizontal scroll for long timelines
- Sticky left sidebar
- Grid lines for date divisions
- Hover tooltip with task details
```

---

## 12. 팀 설정 모달

```
Create a team settings modal with tabs:

Tabs: 일반 | 멤버 | Git 연동

General tab:
- Team name input
- Team description textarea
- Team code display with regenerate button
- Leave team button (danger)
- Delete team button (leader only, danger)

Members tab:
- Member list with:
  - Avatar, name, email
  - Role badge (팀장/멤버)
  - Remove button (X)
- Invite section:
  - Search input for users
  - Search results dropdown
  - Add button
- Pending invites list

Git Integration tab:
- Provider select (GitHub, GitLab)
- Repository owner input
- Repository name input
- Access token input (password field)
- Test connection button
- Save button

Style:
- Modal width: 600px
- Tab underline indicator
- Form sections with labels
- Danger buttons in red
```

---

## 13. 내 활동 페이지

```
Create a "My Activity" dashboard page with:

Layout: Sidebar + Main content

Sections:

1. My Tasks:
- Tab filters: 전체 | 진행중 | 검토중 | 완료
- Task cards in grid (2-3 columns)
- Each card: title, team name, due date, priority

2. My Calendar (mini):
- Small month view
- Dots on dates with tasks
- Click date to filter tasks

3. Archived Items:
- Accordion sections:
  - 아카이브된 컬럼
  - 아카이브된 태스크
- Each item: name, archived date, restore button

4. Recent Activity:
- Timeline of recent actions
- Icon, description, timestamp

Stats summary cards:
- 진행중 태스크 count
- 오늘 마감 count
- 이번 주 완료 count

Style:
- Card-based layout
- Section headers with icons
- Responsive grid
```

---

## 14. 회원가입 페이지

```
Create a registration page with:

Form fields:
- 아이디 (username) with availability check
- 비밀번호 with strength indicator
- 비밀번호 확인 with match validation
- 이름
- 이메일 with format validation
- 전화번호 (optional)

Validation:
- Real-time validation messages
- Green check for valid, red X for invalid
- Password requirements list

Terms:
- Checkbox for terms agreement
- Link to terms page

Submit button:
- "회원가입" (disabled until valid)

Already have account:
- "이미 계정이 있으신가요? 로그인" link

Style:
- Same card style as login
- Progress indicator or step numbers (optional)
- Animated validation feedback
```

---

## 15. 마이페이지

```
Create a user profile page with tabs:

Tabs: 프로필 | 비밀번호 변경 | 알림 설정

Profile tab:
- Avatar with upload button
- 아이디 (read-only)
- 이름 input
- 이메일 input
- 전화번호 input
- Save button

Password tab:
- 현재 비밀번호 input
- 새 비밀번호 input with strength meter
- 새 비밀번호 확인 input
- Change button

Notification settings tab:
- Toggle switches for:
  - 이메일 알림
  - 태스크 할당 알림
  - 댓글 알림
  - 마감일 알림

Account section:
- 가입일 display
- 로그아웃 button
- 회원탈퇴 button (danger)

Style:
- Clean form layout
- Avatar circle with camera icon overlay
- Section dividers
```

---

## 16. 팀 생성 페이지

```
Create a team creation page with:

Header:
- "새 팀 만들기" title
- Stepper: 팀 정보 → 멤버 초대 → 완료

Step 1 - Team info:
- 팀 이름 input (required)
- 팀 설명 textarea
- 팀 컬러 picker (optional)

Step 2 - Invite members:
- Search input for users
- Search results with checkbox
- Selected members list with remove button
- Skip button

Step 3 - Complete:
- Success illustration
- Team code display with copy button
- "팀 코드를 멤버에게 공유하세요" message
- "팀으로 이동" button

Navigation:
- Back/Next buttons
- Step indicators

Style:
- Centered card layout
- Progress bar
- Smooth step transitions
```

---

## 17. 빈 상태 컴포넌트들

```
Create empty state components for:

1. No tasks in column:
- Illustration (empty box or clipboard)
- "태스크가 없습니다"
- "새 태스크를 추가해보세요" sub-text
- "+ 태스크 추가" button

2. No teams:
- Illustration (people or building)
- "아직 팀이 없습니다"
- "팀을 만들거나 팀 코드로 참여하세요"
- "팀 만들기" and "팀 참여" buttons

3. No notifications:
- Bell illustration
- "새로운 알림이 없습니다"
- Light gray text

4. No search results:
- Search illustration
- "검색 결과가 없습니다"
- "'${query}'에 대한 결과를 찾을 수 없습니다"
- "다른 키워드로 검색해보세요"

5. No comments:
- Chat bubble illustration
- "아직 댓글이 없습니다"
- "첫 댓글을 남겨보세요"

Style:
- Centered layout
- Soft colors
- Small illustrations (64-128px)
- Subtle animations (optional)
```

---

## 전체 앱 프롬프트 (통합)

```
Create a complete Kanban board application called "Flowtask" for team collaboration with:

Core features:
- User authentication (login, register, password reset)
- Team management (create, join with code, invite members)
- Kanban board with drag-and-drop columns and tasks
- Multiple views: Board, List, Calendar, Timeline
- Task management with priority, status, assignees, verifiers, due dates, tags
- Real-time updates indicator
- Team chat panel
- Notification system
- File attachments
- Comments on tasks
- Task archiving

Design:
- Purple gradient primary color (#667eea to #764ba2)
- Clean, modern UI with rounded corners
- Smooth animations and transitions
- Responsive layout
- Korean language interface

Components needed:
- Collapsible sidebar with team list
- Kanban board with draggable cards
- Task detail modal (two-column layout)
- Filter bar with multiple criteria
- Calendar view with task dots
- Timeline/Gantt view
- Team settings modal
- Chat panel
- Notification dropdown
- User profile pages

Tech considerations:
- React with hooks
- Drag and drop functionality
- Modal system
- Form validation
- Loading states
- Empty states
- Error handling
```

---

## 사용법

1. [v0.dev](https://v0.dev)에 접속
2. 원하는 섹션의 프롬프트를 복사
3. v0에 붙여넣기
4. 생성된 코드를 프로젝트에 적용

각 프롬프트는 독립적으로 사용하거나, "전체 앱 프롬프트"로 전체 구조를 먼저 생성한 후 개별 컴포넌트를 세부 조정할 수 있습니다.
