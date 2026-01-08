# Synodos

<div align="center">

**실시간 협업 기반 팀 프로젝트 관리 플랫폼**

[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.0-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18.2.0-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![WebSocket](https://img.shields.io/badge/WebSocket-STOMP-010101?style=for-the-badge&logo=socket.io&logoColor=white)](https://stomp.github.io/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

[주요 기능](#-주요-기능) • [기술 스택](#-기술-스택) • [시스템 아키텍처](#-시스템-아키텍처) • [설치 방법](#-설치-방법) • [API 문서](#-api-문서)

</div>

---

## 📋 프로젝트 소개

**Synodos**는 팀 기반 칸반 보드와 실시간 협업 기능을 제공하는 프로젝트 관리 플랫폼입니다.

GitHub 연동, AI 기반 코드 분석, 실시간 WebSocket 통신 등 엔터프라이즈급 기능을 갖추고 있으며, 팀원 간의 효율적인 협업과 프로젝트 진행 상황 추적을 지원합니다.

### 핵심 가치

| | 특징 | 설명 |
|:---:|:---|:---|
| 🔄 | **실시간 협업** | WebSocket 기반 실시간 보드 동기화 및 팀 채팅 |
| 🔗 | **GitHub 통합** | 이슈/PR/브랜치 양방향 동기화, AI 충돌 해결 |
| 🤖 | **AI 지원** | OpenAI 기반 코드 분석 및 머지 충돌 자동 해결 |
| 📊 | **다양한 뷰** | 칸반 보드, 리스트, 캘린더, 타임라인(Gantt) |

---

## ✨ 주요 기능

### 1. 태스크 관리 시스템

```
┌─────────────────────────────────────────────────────────────┐
│                    태스크 워크플로우                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   WAITING ──▶ IN_PROGRESS ──▶ REVIEW ──▶ DONE             │
│      │            │              │                          │
│      │            ▼              ▼                          │
│      │        DECLINED       REJECTED ──▶ (재작업)          │
│      │                                                      │
└─────────────────────────────────────────────────────────────┘
```

- **다중 담당자/검증자**: 태스크별 복수 담당자 지정 및 검증 워크플로우
- **드래그 앤 드롭**: 직관적인 칸반 보드 조작 (@hello-pangea/dnd)
- **우선순위 & 마감일**: CRITICAL/HIGH/MEDIUM/LOW 우선순위, 마감일 알림
- **반려 추적**: 반려 사유, 시간, 반려자 정보 기록

### 2. 실시간 협업

- **WebSocket 통신**: STOMP 프로토콜 기반 실시간 이벤트 브로드캐스트
- **팀 채팅**: 팀별 실시간 채팅 기능
- **온라인 상태**: 팀원 접속 상태 실시간 표시
- **이중 알림 시스템**: 실시간(WebSocket) + 영구(DB) 알림

### 3. GitHub 연동

```
┌──────────────┐                    ┌──────────────┐
│   Synodos    │◀──── 양방향 ────▶│    GitHub    │
│    Task      │      동기화       │    Issue     │
└──────────────┘                    └──────────────┘
        │                                  │
        ▼                                  ▼
   ┌─────────┐                       ┌─────────┐
   │ 상태    │ ◀─── Label 매핑 ───▶ │ Labels  │
   │ 우선순위│                       │         │
   │ 마감일  │ ◀─── Milestone ────▶ │ Due Date│
   └─────────┘                       └─────────┘
```

- **이슈 동기화**: Task ↔ GitHub Issue 양방향 자동 동기화
- **PR 관리**: Pull Request 생성, 머지, 태스크 연결
- **브랜치 관리**: 브랜치 생성/삭제/머지 시각화
- **Webhook 연동**: GitHub 이벤트 실시간 수신 및 처리
- **AI 충돌 해결**: OpenAI 기반 머지 충돌 자동 해결

### 4. 다양한 뷰 제공

| 뷰 | 설명 |
|:---|:---|
| **Board View** | 칸반 보드 - 드래그 앤 드롭으로 태스크 이동 |
| **List View** | 리스트 - 필터링/정렬 기능 제공 |
| **Calendar View** | 캘린더 - 마감일 기준 월별 뷰 |
| **Timeline View** | Gantt 차트 - 일정 시각화 |
| **Branch View** | GitHub 브랜치/커밋/PR 관리 |

### 5. 인증 & 보안

- **JWT 인증**: Stateless 토큰 기반 인증
- **소셜 로그인**: Google, Naver, Kakao, GitHub OAuth2
- **이메일 인증**: 회원가입 및 비밀번호 복구
- **역할 기반 접근 제어**: 팀별 권한 관리 (OWNER, MEMBER)

---

## 🛠 기술 스택

### Backend

| 기술 | 버전 | 용도 |
|:---|:---:|:---|
| **Spring Boot** | 3.2.0 | 핵심 프레임워크 |
| **Spring Security** | 3.2.0 | 인증 & 인가 |
| **Spring WebSocket** | 3.2.0 | 실시간 통신 |
| **MyBatis** | 3.0.3 | ORM & SQL 매핑 |
| **JJWT** | 0.12.3 | JWT 토큰 처리 |
| **PostgreSQL** | 16+ | 데이터베이스 |

### Frontend

| 기술 | 버전 | 용도 |
|:---|:---:|:---|
| **React** | 18.2.0 | UI 프레임워크 |
| **React Router** | 6.20.0 | 클라이언트 라우팅 |
| **Axios** | 1.6.2 | HTTP 클라이언트 |
| **@hello-pangea/dnd** | 16.5.0 | 드래그 앤 드롭 |
| **STOMP.js** | 7.2.1 | WebSocket 클라이언트 |
| **TailwindCSS** | 3.4.19 | 스타일링 |

### Infrastructure

| 기술 | 용도 |
|:---|:---|
| **Docker Compose** | 컨테이너 오케스트레이션 |
| **Nginx** | 리버스 프록시 & 정적 파일 서빙 |
| **AWS EC2** | 클라우드 호스팅 |
| **AWS SES** | 이메일 발송 (프로덕션) |

---

## 🏗 시스템 아키텍처

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Client Layer                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────┐    ┌─────────────┐    ┌─────────────┐            │
│   │   React     │    │  WebSocket  │    │   OAuth     │            │
│   │   SPA       │    │   Client    │    │   Redirect  │            │
│   └──────┬──────┘    └──────┬──────┘    └──────┬──────┘            │
│          │                  │                  │                    │
└──────────┼──────────────────┼──────────────────┼────────────────────┘
           │ REST API         │ STOMP            │
           ▼                  ▼                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Spring Boot Backend                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────────────────────────────────────────────────┐   │
│   │                      Controllers (20)                        │   │
│   │  Task │ Team │ Member │ GitHub │ Chat │ Notification │ ...  │   │
│   └───────────────────────────┬─────────────────────────────────┘   │
│                               │                                     │
│   ┌───────────────────────────▼─────────────────────────────────┐   │
│   │                       Services (27)                          │   │
│   │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│   │  │    Core     │  │  Workflow   │  │  GitHub Integration │  │   │
│   │  │  Services   │  │  Services   │  │      Services       │  │   │
│   │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│   └───────────────────────────┬─────────────────────────────────┘   │
│                               │                                     │
│   ┌───────────────────────────▼─────────────────────────────────┐   │
│   │                    MyBatis DAOs (19)                         │   │
│   └───────────────────────────┬─────────────────────────────────┘   │
│                               │                                     │
└───────────────────────────────┼─────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          Data Layer                                  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌─────────────────┐    ┌─────────────────┐                       │
│   │   PostgreSQL    │    │   File Storage  │                       │
│   │   (16 Tables)   │    │   (Volumes)     │                       │
│   └─────────────────┘    └─────────────────┘                       │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       External Services                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐          │
│   │  GitHub  │  │  OpenAI  │  │  OAuth   │  │   SMTP   │          │
│   │   API    │  │   API    │  │ Providers│  │  Server  │          │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 프로젝트 구조

```
Synodos/
├── backend/                          # Spring Boot 백엔드
│   └── src/main/java/com/example/demo/
│       ├── controller/               # REST API 컨트롤러 (20개)
│       ├── service/                  # 비즈니스 로직 (27개)
│       ├── dao/                      # MyBatis 매퍼 인터페이스 (19개)
│       ├── model/                    # 엔티티 모델 (20개)
│       ├── config/                   # 설정 클래스
│       ├── security/                 # JWT, 인증 필터
│       └── dto/                      # 데이터 전송 객체
│
├── frontend/                         # React 프론트엔드
│   └── src/
│       ├── pages/                    # 페이지 컴포넌트 (25개)
│       │   └── views/                # TeamView 서브뷰 (9개)
│       ├── components/               # 재사용 컴포넌트 (12개)
│       └── api/                      # API 클라이언트 (13개)
│
├── database/                         # 데이터베이스 스키마
│   └── postgresql_schema.sql         # 전체 스키마 (16 테이블)
│
├── docs/                             # 문서
│   └── flowcharts.md                 # 기능별 플로우차트
│
└── docker-compose.yml                # Docker 배포 설정
```

---

## 📊 데이터베이스 설계

### ERD 개요

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Core Entities                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌────────┐      ┌────────────┐      ┌─────────┐                  │
│   │ Member │──1:N─│ TeamMember │──N:1─│  Team   │                  │
│   └────┬───┘      └────────────┘      └────┬────┘                  │
│        │                                    │                       │
│        │              ┌─────────────────────┘                       │
│        │              │                                             │
│        │              ▼                                             │
│        │         ┌─────────┐      ┌────────┐                       │
│        │         │ Column  │──1:N─│  Task  │                       │
│        │         └─────────┘      └───┬────┘                       │
│        │                              │                             │
│        │         ┌────────────────────┼────────────────────┐       │
│        │         │                    │                    │       │
│        │         ▼                    ▼                    ▼       │
│        │   ┌──────────┐        ┌──────────┐        ┌─────────┐    │
│        └──▶│ Assignee │        │ Verifier │        │ Comment │    │
│            └──────────┘        └──────────┘        └─────────┘    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                        GitHub Integration                            │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   ┌────────┐      ┌─────────────────┐      ┌─────────────┐         │
│   │  Task  │──1:1─│ TaskGitHubIssue │──N:1─│    Team     │         │
│   └────┬───┘      └─────────────────┘      └─────────────┘         │
│        │                                                            │
│        ├──1:N─────┌─────────────┐                                  │
│        │          │ TaskCommit  │                                  │
│        │          └─────────────┘                                  │
│        │                                                            │
│        └──1:N─────┌─────────────┐                                  │
│                   │ TaskGitHubPR│                                  │
│                   └─────────────┘                                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 주요 테이블

| 테이블 | 설명 | 주요 컬럼 |
|:---|:---|:---|
| `member` | 사용자 정보 | OAuth 연동, GitHub 토큰, 프로필 |
| `team` | 팀 정보 | GitHub 저장소 URL, 동기화 설정 |
| `task` | 태스크 | 워크플로우 상태, 우선순위, 마감일, 반려 정보 |
| `task_assignee` | 담당자 | 수락/완료 상태 |
| `task_verifier` | 검증자 | 승인/반려 상태 |
| `task_github_issue` | GitHub 이슈 연동 | 동기화 상태, 충돌 감지 |

---

## 🚀 설치 방법

### 사전 요구사항

- Java 17+
- Node.js 18+
- PostgreSQL 16+
- Docker & Docker Compose (선택)

### 로컬 개발 환경

#### 1. 데이터베이스 설정

```bash
# PostgreSQL 접속
psql -U postgres

# 데이터베이스 및 사용자 생성
CREATE DATABASE synodos;
CREATE USER flow WITH PASSWORD 'flow123';
GRANT ALL PRIVILEGES ON DATABASE synodos TO flow;
\c synodos
GRANT ALL ON SCHEMA public TO flow;
```

#### 2. 백엔드 설정

```bash
cd backend

# 로컬 설정 파일 생성
cp src/main/resources/application-local.properties.example \
   src/main/resources/application-local.properties

# application-local.properties 편집 (OAuth, SMTP 등 설정)

# 실행
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

#### 3. 프론트엔드 설정

```bash
cd frontend

# 의존성 설치
npm install

# 개발 서버 실행 (포트 3000, 백엔드 8081로 프록시)
npm start
```

### Docker 배포

```bash
# 환경 변수 설정
cp .env.example .env
# .env 파일 편집

# 전체 스택 실행
docker-compose up --build -d

# 로그 확인
docker-compose logs -f
```

---

## 📡 API 문서

### 인증 API

| Method | Endpoint | 설명 |
|:---:|:---|:---|
| POST | `/api/login` | 로그인 |
| POST | `/api/register` | 회원가입 |
| GET | `/api/member/{no}` | 회원 정보 조회 |

### 태스크 API

| Method | Endpoint | 설명 |
|:---:|:---|:---|
| POST | `/api/taskwrite` | 태스크 생성 |
| GET | `/api/tasklist/team/{teamId}` | 팀별 태스크 목록 |
| GET | `/api/taskcontent/{taskId}` | 태스크 상세 |
| PUT | `/api/taskupdate` | 태스크 수정 |
| PUT | `/api/taskposition` | 태스크 위치 변경 |
| DELETE | `/api/taskdelete/{taskId}` | 태스크 삭제 |

### 워크플로우 API

| Method | Endpoint | 설명 |
|:---:|:---|:---|
| POST | `/api/task/workflow/{id}/accept` | 태스크 수락 |
| POST | `/api/task/workflow/{id}/complete` | 작업 완료 |
| POST | `/api/task/workflow/{id}/approve` | 검증 승인 |
| POST | `/api/task/workflow/{id}/reject` | 검증 반려 |

### GitHub 연동 API

| Method | Endpoint | 설명 |
|:---:|:---|:---|
| GET | `/api/github/branches/{teamId}` | 브랜치 목록 |
| GET | `/api/github/commits/{teamId}` | 커밋 목록 |
| POST | `/api/github/branch/{teamId}` | 브랜치 생성 |
| POST | `/api/github/merge/{teamId}` | 브랜치 머지 |
| POST | `/api/github/pr/{teamId}` | PR 생성 |
| POST | `/api/github/pr/{teamId}/{prNumber}/ai-resolve` | AI 충돌 해결 |

### WebSocket 엔드포인트

| 구독 채널 | 용도 |
|:---|:---|
| `/topic/team/{teamId}` | 팀 보드 이벤트 |
| `/topic/user/{memberNo}/notifications` | 개인 알림 |

---

## 🔧 환경 변수

### 필수 설정

```properties
# Database
DB_USERNAME=flow
DB_PASSWORD=flow123

# JWT
JWT_SECRET=your-secret-key

# SMTP (Gmail)
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password

# OpenAI (AI 기능)
OPENAI_API_KEY=sk-xxx
```

### OAuth 설정 (선택)

```properties
# Google
GOOGLE_CLIENT_ID=xxx
GOOGLE_CLIENT_SECRET=xxx

# Naver
NAVER_CLIENT_ID=xxx
NAVER_CLIENT_SECRET=xxx

# Kakao
KAKAO_CLIENT_ID=xxx
KAKAO_CLIENT_SECRET=xxx

# GitHub
GITHUB_OAUTH_CLIENT_ID=xxx
GITHUB_OAUTH_CLIENT_SECRET=xxx
```

---

## 📈 프로젝트 통계

| 카테고리 | 수량 |
|:---|:---:|
| Backend Controllers | 20 |
| Backend Services | 27 |
| Backend Models | 20 |
| Frontend Pages | 25 |
| Frontend Components | 12 |
| API Clients | 13 |
| Database Tables | 16 |

---

## 🧪 테스트 계정

| ID | Password | 역할 |
|:---|:---:|:---|
| `dev` | `1234` | 개발자 (슈퍼계정) |
| `admin` | `1234` | 관리자 |
| `user1` ~ `user8` | `1234` | 일반 사용자 |

---

## 📄 라이선스

이 프로젝트는 학습 및 포트폴리오 목적으로 제작되었습니다.

---

<div align="center">

**Synodos** - 팀 협업의 새로운 기준

</div>
