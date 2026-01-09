# Synodos - Entity Relationship Diagram

## ERD 다이어그램

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    MEMBER (회원) 관련                                                    │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐       1:N        ┌─────────────────────────┐
│        member           │◄─────────────────│   member_social_link    │
├─────────────────────────┤                  ├─────────────────────────┤
│ PK no                   │                  │ PK id                   │
│    userid (UNIQUE)      │                  │ FK member_no            │
│    password             │                  │    provider             │
│    name                 │                  │    provider_id          │
│    email (UNIQUE)       │                  │    email                │
│    phone                │                  │    name                 │
│    email_verified       │                  │    linked_at            │
│    profile_image        │                  └─────────────────────────┘
│    provider             │
│    provider_id          │       1:N        ┌─────────────────────────┐
│    github_username      │◄─────────────────│   github_user_mapping   │
│    github_access_token  │                  ├─────────────────────────┤
│    github_connected_at  │                  │ PK id                   │
│    register             │                  │ FK member_no (UNIQUE)   │
└─────────────────────────┘                  │    github_username      │
       │                                     │    created_at           │
       │                                     └─────────────────────────┘
       │
       │ 1:N                1:N        ┌─────────────────────────┐
       ├──────────────────────────────►│   email_verification    │
       │                               ├─────────────────────────┤
       │                               │ PK id                   │
       │                               │    email                │
       │                               │    code                 │
       │                               │    type                 │
       │                               │    expires_at           │
       │                               │    verified             │
       │                               │    created_at           │
       │                               └─────────────────────────┘
       │
       │
┌──────┴──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    TEAM (팀) 관련                                                        │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘

       │
       │ 1:N (leader)
       ▼
┌─────────────────────────┐       M:N        ┌─────────────────────────┐
│         team            │◄─────────────────│      team_member        │
├─────────────────────────┤   (via member)   ├─────────────────────────┤
│ PK team_id              │                  │ PK,FK team_id           │
│    team_name            │                  │ PK,FK member_no         │
│    team_code (UNIQUE)   │                  │    role                 │
│ FK leader_no            │──────────────────│    joined_at            │
│    description          │                  └─────────────────────────┘
│    github_repo_url      │                           │
│    github_access_token  │                           │
│    github_issue_sync_en │       1:N                 │ (member)
│    github_default_col_id│       ▼                   ▼
│    github_column_mappngs│  ┌─────────────────────────┐
│    created_at           │  │      chat_message       │
└─────────────────────────┘  ├─────────────────────────┤
       │                     │ PK message_id           │
       │ 1:N                 │ FK team_id              │
       │                     │ FK sender_no            │
       ▼                     │    content              │
┌─────────────────────────┐  │    sent_at              │
│        project          │  └─────────────────────────┘
├─────────────────────────┤
│ PK project_id           │
│ FK team_id              │
│    project_name         │
│    created_at           │
└─────────────────────────┘
       │
       │ 1:N
       ▼
┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    BOARD (보드) 관련                                                     │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐
│        columns          │ (team 또는 project에 속함)
├─────────────────────────┤
│ PK column_id            │
│    title                │
│    position             │
│ FK team_id              │
│ FK project_id           │
│    github_prefix        │
└─────────────────────────┘
       │
       │ 1:N
       ▼
┌─────────────────────────┐
│         task            │
├─────────────────────────┤
│ PK task_id              │
│ FK column_id            │
│    title                │
│    description          │
│    position             │
│    created_at           │
│ FK created_by           │─────────────────┐
│ FK assignee_no          │                 │
│    priority             │                 │ (member 참조)
│    start_date           │                 │
│    due_date             │                 │
│    workflow_status      │                 │
│    rejection_reason     │                 │
│    rejected_at          │                 │
│ FK rejected_by          │─────────────────┤
└─────────────────────────┘                 │
       │                                    │
       │                                    ▼
       │                              [member]
       │
       │
┌──────┴──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    TASK 하위 엔티티                                                      │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘

       │
       ├────── 1:N ──────►┌─────────────────────────┐
       │                  │       comment           │
       │                  ├─────────────────────────┤
       │                  │ PK comment_id           │
       │                  │ FK task_id              │
       │                  │ FK author_no            │──► [member]
       │                  │    content              │
       │                  │    github_comment_id    │
       │                  │    created_at           │
       │                  │    updated_at           │
       │                  └─────────────────────────┘
       │
       ├────── M:N ──────►┌─────────────────────────┐
       │  (via assignee)  │     task_assignee       │
       │                  ├─────────────────────────┤
       │                  │ PK,FK task_id           │
       │                  │ PK,FK member_no         │──► [member]
       │                  │    assigned_at          │
       │                  │ FK assigned_by          │──► [member]
       │                  │    accepted             │
       │                  │    accepted_at          │
       │                  │    completed            │
       │                  │    completed_at         │
       │                  └─────────────────────────┘
       │
       ├────── M:N ──────►┌─────────────────────────┐
       │  (via verifier)  │     task_verifier       │
       │                  ├─────────────────────────┤
       │                  │ PK,FK task_id           │
       │                  │ PK,FK member_no         │──► [member]
       │                  │    assigned_at          │
       │                  │    approved             │
       │                  │    approved_at          │
       │                  │    rejection_reason     │
       │                  └─────────────────────────┘
       │
       ├────── M:N ──────►┌─────────────────────────┐
       │  (via favorite)  │     task_favorite       │
       │                  ├─────────────────────────┤
       │                  │ PK,FK task_id           │
       │                  │ PK,FK member_no         │──► [member]
       │                  │    created_at           │
       │                  └─────────────────────────┘
       │
       ├────── 1:N ──────►┌─────────────────────────┐
       │                  │     task_commit         │
       │                  ├─────────────────────────┤
       │                  │ PK id                   │
       │                  │ FK task_id              │
       │                  │    commit_sha           │
       │                  │    commit_message       │
       │                  │    commit_author        │
       │                  │    commit_date          │
       │                  │    github_url           │
       │                  │ FK linked_by            │──► [member]
       │                  │    linked_at            │
       │                  └─────────────────────────┘
       │
       ├────── 1:1 ──────►┌─────────────────────────┐
       │                  │   task_github_issue     │
       │                  ├─────────────────────────┤
       │                  │ PK id                   │
       │                  │ FK task_id (UNIQUE)     │
       │                  │ FK team_id              │
       │                  │    issue_number         │
       │                  │    issue_id             │
       │                  │    issue_title          │
       │                  │    issue_url            │
       │                  │    sync_status          │
       │                  │    last_synced_at       │      1:N
       │                  │    synodos_updated_at   │◄────────────┐
       │                  │    github_updated_at    │             │
       │                  │    created_at           │             │
       │                  └─────────────────────────┘             │
       │                                                          │
       │                                           ┌──────────────┴────────────┐
       │                                           │   github_issue_sync_log   │
       │                                           ├───────────────────────────┤
       │                                           │ PK id                     │
       │                                           │ FK task_github_issue_id   │
       │                                           │    task_id                │
       │                                           │    issue_number           │
       │                                           │    team_id                │
       │                                           │    sync_direction         │
       │                                           │    sync_type              │
       │                                           │    field_changed          │
       │                                           │    old_value              │
       │                                           │    new_value              │
       │                                           │    sync_status            │
       │                                           │    error_message          │
       │                                           │    triggered_by           │
       │                                           │    webhook_delivery_id    │
       │                                           │    created_at             │
       │                                           └───────────────────────────┘
       │
       └────── 1:N ──────►┌─────────────────────────┐
                         │     task_github_pr      │
                         ├─────────────────────────┤
                         │ PK id                   │
                         │ FK task_id              │
                         │ FK team_id              │
                         │    pr_number            │
                         │    pr_id                │
                         │    pr_title             │
                         │    pr_url               │
                         │    pr_state             │
                         │    merged               │
                         │    head_branch          │
                         │    base_branch          │
                         │    merged_at            │
                         │    created_at           │
                         │    updated_at           │
                         └─────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    기타 엔티티                                                           │
└─────────────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────┐                  ┌─────────────────────────┐
│      notification       │                  │        file             │
├─────────────────────────┤                  ├─────────────────────────┤
│ PK notification_id      │                  │ PK file_id              │
│ FK recipient_no         │──► [member]      │ FK team_id              │──► [team]
│ FK sender_no            │──► [member]      │ FK task_id              │──► [task]
│    notification_type    │                  │ FK uploader_no          │──► [member]
│    title                │                  │    original_name        │
│    message              │                  │    stored_name          │
│ FK team_id              │──► [team]        │    file_path            │
│ FK column_id            │──► [columns]     │    file_size            │
│ FK task_id              │──► [task]        │    mime_type            │
│    is_read              │                  │    uploaded_at          │
│    created_at           │                  └─────────────────────────┘
└─────────────────────────┘

┌─────────────────────────┐
│     task_archive        │
├─────────────────────────┤
│ PK archive_id           │
│ FK member_no            │──► [member]
│    original_task_id     │
│    team_id              │
│    team_name            │
│    column_id            │
│    column_title         │
│    task_snapshot (JSONB)│
│    archive_note         │
│    archived_at          │
└─────────────────────────┘
```

---

## 관계 요약 (Cardinality Summary)

### 1:N 관계
| 부모 테이블 | 자식 테이블 | 설명 |
|------------|------------|------|
| member | member_social_link | 회원 → 소셜 연동 |
| member | team | 리더로서 |
| member | email_verification | 이메일 인증 |
| team | project | 팀 → 프로젝트 |
| team | columns | 팀 → 컬럼 |
| team | chat_message | 팀 → 채팅 |
| project | columns | 프로젝트 → 컬럼 |
| columns | task | 컬럼 → 태스크 |
| task | comment | 태스크 → 댓글 |
| task | task_commit | 태스크 → 커밋 연결 |
| task | task_github_pr | 태스크 → PR 연결 |
| task_github_issue | github_issue_sync_log | 이슈 → 동기화 로그 |

### 1:1 관계
| 테이블 A | 테이블 B | 설명 |
|---------|---------|------|
| member | github_user_mapping | 회원 → GitHub 매핑 |
| task | task_github_issue | 태스크 → GitHub 이슈 |

### M:N 관계 (연결 테이블 사용)
| 테이블 A | 테이블 B | 연결 테이블 | 설명 |
|---------|---------|------------|------|
| member | team | team_member | 팀 멤버십 |
| member | task | task_assignee | 태스크 담당자 |
| member | task | task_verifier | 태스크 검증자 |
| member | task | task_favorite | 즐겨찾기 |

---

## 테이블 목록 (21개)

| 카테고리 | 테이블 |
|---------|--------|
| **Core** | member, member_social_link, team, team_member, project |
| **Board** | columns, task |
| **Task 관련** | task_assignee, task_verifier, task_favorite, task_archive, comment |
| **Communication** | chat_message, notification |
| **File** | file |
| **Auth** | email_verification |
| **GitHub 연동** | task_commit, task_github_issue, task_github_pr, github_user_mapping, github_issue_sync_log |

---

## 테이블 상세 명세

### member (회원)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|-------|------|---------|------|
| no | INTEGER | PK | 회원 번호 |
| userid | VARCHAR(50) | UNIQUE, NOT NULL | 아이디 |
| password | VARCHAR(100) | NOT NULL | 비밀번호 (암호화) |
| name | VARCHAR(50) | NOT NULL | 이름 |
| email | VARCHAR(100) | UNIQUE, NOT NULL | 이메일 |
| phone | VARCHAR(20) | | 전화번호 |
| email_verified | BOOLEAN | DEFAULT FALSE | 이메일 인증 여부 |
| profile_image | VARCHAR(500) | | 프로필 이미지 URL |
| provider | VARCHAR(20) | | OAuth 제공자 |
| provider_id | VARCHAR(100) | | OAuth 제공자 ID |
| github_username | VARCHAR(100) | | GitHub 사용자명 |
| github_access_token | VARCHAR(500) | | GitHub 액세스 토큰 |
| github_connected_at | TIMESTAMP | | GitHub 연동 일시 |
| register | TIMESTAMP | DEFAULT NOW | 가입일 |

### team (팀)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|-------|------|---------|------|
| team_id | INTEGER | PK | 팀 ID |
| team_name | VARCHAR(100) | NOT NULL | 팀 이름 |
| team_code | VARCHAR(20) | UNIQUE, NOT NULL | 초대 코드 |
| leader_no | INTEGER | FK → member | 팀 리더 |
| description | TEXT | | 팀 설명 |
| github_repo_url | VARCHAR(500) | | GitHub 저장소 URL |
| github_access_token | VARCHAR(500) | | GitHub 토큰 |
| github_issue_sync_enabled | BOOLEAN | DEFAULT TRUE | 이슈 동기화 활성화 |
| github_default_column_id | INTEGER | | 기본 컬럼 ID |
| github_column_mappings | TEXT | | 컬럼 매핑 (JSON) |
| created_at | TIMESTAMP | DEFAULT NOW | 생성일 |

### task (태스크)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|-------|------|---------|------|
| task_id | INTEGER | PK | 태스크 ID |
| column_id | INTEGER | FK → columns | 소속 컬럼 |
| title | VARCHAR(200) | NOT NULL | 제목 |
| description | TEXT | | 설명 |
| position | INTEGER | DEFAULT 0 | 정렬 순서 |
| created_at | TIMESTAMP | DEFAULT NOW | 생성일 |
| created_by | INTEGER | FK → member | 생성자 |
| assignee_no | INTEGER | FK → member | 담당자 (레거시) |
| priority | VARCHAR(20) | | 우선순위 |
| start_date | TIMESTAMP | | 시작일 |
| due_date | TIMESTAMP | | 마감일 |
| workflow_status | VARCHAR(20) | DEFAULT 'WAITING' | 워크플로우 상태 |
| rejection_reason | TEXT | | 반려 사유 |
| rejected_at | TIMESTAMP | | 반려 일시 |
| rejected_by | INTEGER | FK → member | 반려자 |

### task_assignee (태스크 담당자)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|-------|------|---------|------|
| task_id | INTEGER | PK, FK → task | 태스크 ID |
| member_no | INTEGER | PK, FK → member | 담당자 |
| assigned_at | TIMESTAMP | DEFAULT NOW | 할당일 |
| assigned_by | INTEGER | FK → member | 할당자 |
| accepted | BOOLEAN | DEFAULT FALSE | 수락 여부 |
| accepted_at | TIMESTAMP | | 수락 일시 |
| completed | BOOLEAN | DEFAULT FALSE | 완료 여부 |
| completed_at | TIMESTAMP | | 완료 일시 |

### task_verifier (태스크 검증자)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|-------|------|---------|------|
| task_id | INTEGER | PK, FK → task | 태스크 ID |
| member_no | INTEGER | PK, FK → member | 검증자 |
| assigned_at | TIMESTAMP | DEFAULT NOW | 할당일 |
| approved | BOOLEAN | DEFAULT FALSE | 승인 여부 |
| approved_at | TIMESTAMP | | 승인 일시 |
| rejection_reason | TEXT | | 반려 사유 |

### task_github_issue (GitHub 이슈 연동)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|-------|------|---------|------|
| id | INTEGER | PK | ID |
| task_id | INTEGER | FK, UNIQUE → task | 태스크 ID |
| team_id | INTEGER | FK → team | 팀 ID |
| issue_number | INTEGER | NOT NULL | GitHub 이슈 번호 |
| issue_id | BIGINT | NOT NULL | GitHub 이슈 ID |
| issue_title | VARCHAR(500) | | 이슈 제목 |
| issue_url | VARCHAR(500) | | 이슈 URL |
| sync_status | VARCHAR(20) | DEFAULT 'SYNCED' | 동기화 상태 |
| last_synced_at | TIMESTAMP | | 마지막 동기화 |
| synodos_updated_at | TIMESTAMP | | Synodos 수정일 |
| github_updated_at | TIMESTAMP | | GitHub 수정일 |
| created_at | TIMESTAMP | DEFAULT NOW | 생성일 |

### task_github_pr (GitHub PR 연동)
| 컬럼명 | 타입 | 제약조건 | 설명 |
|-------|------|---------|------|
| id | INTEGER | PK | ID |
| task_id | INTEGER | FK → task | 태스크 ID |
| team_id | INTEGER | FK → team | 팀 ID |
| pr_number | INTEGER | NOT NULL | PR 번호 |
| pr_id | BIGINT | | PR ID |
| pr_title | VARCHAR(500) | | PR 제목 |
| pr_url | VARCHAR(500) | | PR URL |
| pr_state | VARCHAR(20) | DEFAULT 'open' | PR 상태 |
| merged | BOOLEAN | DEFAULT FALSE | 병합 여부 |
| head_branch | VARCHAR(200) | | 소스 브랜치 |
| base_branch | VARCHAR(200) | | 타겟 브랜치 |
| merged_at | VARCHAR(50) | | 병합 일시 |
| created_at | TIMESTAMP | DEFAULT NOW | 생성일 |
| updated_at | TIMESTAMP | DEFAULT NOW | 수정일 |
