# Synodos

팀 기반 칸반 보드 및 실시간 협업 애플리케이션입니다.

## 기술 스택

### 런타임 환경
| 기술 | 버전 |
|------|------|
| Java | 17 |
| Node.js | 18+ |
| PostgreSQL | 16+ |

### Backend
| 라이브러리 | 버전 |
|------------|------|
| Spring Boot | 3.2.0 |
| Spring Boot Security | 3.2.0 |
| Spring Boot WebSocket | 3.2.0 |
| Spring Boot Mail | 3.2.0 |
| MyBatis Spring Boot Starter | 3.0.3 |
| JJWT (JWT) | 0.12.3 |
| Apache HttpClient5 | 5.3 |
| Lombok | Spring 관리 |

### Frontend
| 라이브러리 | 버전 |
|------------|------|
| React | 18.2.0 |
| React Router DOM | 6.20.0 |
| Axios | 1.6.2 |
| @hello-pangea/dnd | 16.5.0 |
| @stomp/stompjs | 7.2.1 |
| sockjs-client | 1.6.1 |
| Framer Motion | 12.23.0 |
| TailwindCSS | 3.4.0 |

## 주요 기능

### 태스크 관리
- 칸반 보드 (드래그 앤 드롭)
- 복수 담당자/검증자 지정
- 태스크 워크플로우 (대기 → 진행중 → 검토 → 완료/반려)
- 태스크 댓글
- 우선순위 및 마감일 관리
- 즐겨찾기 및 아카이브

### 팀 협업
- 팀/프로젝트 관리
- 팀 채팅 (실시간 WebSocket)
- 실시간 알림 (WebSocket + DB 저장)
- 마감일 알림 (스케줄러)
- 파일 첨부 및 관리

### 다양한 뷰
- **Board View**: 칸반 보드 형태
- **List View**: 목록 형태 (필터/정렬)
- **Calendar View**: 캘린더 뷰 (마감일 기준)
- **Timeline View**: 간트 차트 형태
- **Branch View**: GitHub 브랜치/커밋 시각화

### GitHub 통합
- **저장소 연결**: 팀별 GitHub 저장소 연동
- **이슈 동기화**: 태스크 ↔ GitHub Issue 양방향 동기화
- **PR 통합**: 브랜치에서 PR 생성, 머지
- **커밋 연동**: 태스크와 Git 커밋 연결
- **Webhook**: GitHub 이벤트 실시간 수신
- **AI 충돌 해결**: 머지 충돌 시 AI가 해결책 제안

#### GitHub 테스트 저장소 설정

GitHub 기능 테스트를 위한 샘플 저장소를 자동 생성하는 스크립트가 제공됩니다.

**사전 준비:**
1. [GitHub CLI](https://cli.github.com/) 설치
2. `gh auth login`으로 인증
3. PowerShell 실행 권한 설정: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`

**스크립트 위치:** `temp-github-sample/`

| 스크립트 | 용도 | 생성되는 저장소 |
|----------|------|----------------|
| `setup-github-repo.ps1` | 일반 테스트 (자동 머지 가능) | `Synodos-Test` |
| `setup-conflict-repo.ps1` | 충돌 테스트 (머지 충돌 발생) | `Synodos-Conflict-Test` |

**실행 방법:**
```powershell
cd temp-github-sample

# 일반 테스트 저장소
.\setup-github-repo.ps1 -Owner "YourGitHubUsername"

# 충돌 테스트 저장소 (AI 충돌 해결 테스트용)
.\setup-conflict-repo.ps1 -Owner "YourGitHubUsername"
```

**생성되는 내용:**
- 브랜치: `main`, `feature/*` 등 여러 브랜치
- PR: 머지 대기 중인 Pull Request
- Issues: PR과 연결된 이슈 (충돌 테스트용)
- Labels: 상태 라벨 (`feature`, `refactor`, `conflict` 등)

> **참고**: 스크립트 재실행 시 동명의 저장소가 있으면 자동 삭제 후 재생성됩니다.

### 인증
- JWT 토큰 인증
- 소셜 로그인 (Google, Naver, Kakao, GitHub)
- 이메일 인증 (회원가입, 비밀번호 찾기)

### AI 기능
- 코드 분석 (OpenAI API)
- Git 충돌 자동 해결 제안

---

## 빠른 시작 (Docker)

Docker만 설치되어 있으면 바로 실행할 수 있습니다.

```bash
# 클론
git clone https://github.com/your-repo/Synodos.git
cd Synodos

# 환경 변수 설정
cp .env.example .env
nano .env  # SMTP, OAuth 설정 입력

# 실행
docker-compose up --build
```

브라우저에서 http://localhost 접속

### Docker 명령어

```bash
# 백그라운드 실행
docker-compose up -d --build

# 로그 확인
docker-compose logs -f

# 종료
docker-compose down

# 데이터 포함 완전 삭제
docker-compose down -v
```

### 접속 정보

| 서비스 | URL |
|--------|-----|
| Frontend | http://localhost |
| Backend API | http://localhost:8081 |
| PostgreSQL | localhost:5432 |

### 테스트 계정

샘플 데이터가 자동으로 생성됩니다. (비밀번호는 모두 `1234`)

| 아이디 | 이름 | 역할 | 용도 |
|--------|------|------|------|
| **dev** | 개발자 | 슈퍼계정 | 개발/테스트용 (GitHub 미연동) |
| admin | 관리자 | 팀 소유자 | 일반 테스트 |
| user1~user8 | 테스트 유저 | 팀 멤버 | 멀티유저 테스트 |

**개발자 계정 GitHub 연동 (선택):**
```sql
-- PostgreSQL에서 실행
UPDATE member SET
  github_username = 'YourGitHubUsername',
  github_access_token = 'ghp_xxxx...'
WHERE userid = 'dev';
```
또는 로그인 후 마이페이지에서 GitHub OAuth 연결

---

## 로컬 개발 환경 (Docker 없이)

### 필수 요구사항

- Java 17+
- Node.js 18+
- PostgreSQL 16+

### 1. 데이터베이스 설정

```sql
CREATE DATABASE synodos;
CREATE USER flow WITH PASSWORD 'flow123';
GRANT ALL PRIVILEGES ON DATABASE synodos TO flow;
\c synodos
GRANT ALL ON SCHEMA public TO flow;
```

```bash
psql -U flow -d synodos -f database/postgresql_schema.sql
```

### 데이터베이스 관리

```bash
# 데이터베이스 전체 리셋 (모든 테이블 삭제)
psql -U flow -d synodos -f database/reset.sql
```

> **참고**: 백엔드 실행 시 `schema.sql`(테이블 구조)과 `sample-data.sql`(테스트 데이터)이 자동 실행됩니다. `ON CONFLICT DO NOTHING`으로 중복 방지되어 재시작해도 안전합니다.

### 2. SMTP 설정 (이메일 인증용)

Gmail 앱 비밀번호 발급:
1. [Google 계정](https://myaccount.google.com/) > 보안 > 2단계 인증 활성화
2. [앱 비밀번호](https://myaccount.google.com/apppasswords) 생성
3. `application-local.properties` 파일 생성:

```properties
# backend/src/main/resources/application-local.properties
spring.mail.username=your-email@gmail.com
spring.mail.password=your-16-digit-app-password
```

### 3. Backend 실행

```bash
cd backend

# Windows PowerShell
.\mvnw spring-boot:run "-Dspring-boot.run.profiles=local"
#or
mvn spring-boot:run "-Dspring-boot.run.profiles=local"

# Mac/Linux
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

### 4. Frontend 실행

```bash
cd frontend
npm install
npm start
```

브라우저에서 http://localhost:3000 접속

---

## 프로젝트 구조

```
Synodos/
├── backend/                     # Spring Boot 백엔드
│   └── src/main/java/com/example/demo/
│       ├── controller/         # REST API 엔드포인트
│       ├── service/            # 비즈니스 로직
│       ├── dao/                # MyBatis 매퍼 인터페이스
│       ├── model/              # 엔티티 클래스
│       ├── dto/                # 데이터 전송 객체
│       ├── config/             # WebSocket, Security 설정
│       └── security/           # JWT, OAuth2 처리
├── frontend/                    # React 프론트엔드
│   └── src/
│       ├── api/               # API 클라이언트
│       ├── components/        # 재사용 컴포넌트
│       ├── pages/             # 페이지 컴포넌트
│       └── pages/views/       # 팀 뷰 컴포넌트
└── database/                    # SQL 스키마 파일
```

### 핵심 엔티티

| 엔티티 | 설명 |
|--------|------|
| Member | 사용자 (OAuth, GitHub 연동 포함) |
| Team | 팀 (GitHub 저장소 설정) |
| SynodosColumn | 칸반 컬럼 |
| Task | 태스크 (워크플로우 상태, 우선순위, 마감일) |
| TaskAssignee | 태스크 담당자 (복수) |
| TaskVerifier | 태스크 검증자 (복수) |
| Comment | 태스크 댓글 (GitHub 동기화) |
| ChatMessage | 팀 채팅 |
| Notification | 알림 |
| TaskGitHubIssue | 태스크-GitHub Issue 연결 |
| TaskGitHubPR | 태스크-PR 연결 |

---

## AWS EC2 배포

### 아키텍처

```
[사용자] --> [EC2: nginx (포트 80)] --> [EC2: Spring Boot (포트 8081)] --> [EC2: PostgreSQL (Docker)]
```

모든 서비스가 EC2 한 대에서 Docker로 실행됩니다.

### 1. EC2 인스턴스 생성

| 설정 | 권장값 |
|------|--------|
| AMI | Ubuntu 22.04 |
| 인스턴스 유형 | t3.small 이상 |
| 스토리지 | 20GB 이상 |

**보안 그룹 인바운드 규칙:**
- SSH (22) - 내 IP
- HTTP (80) - 0.0.0.0/0

### 2. Docker 설치 (Ubuntu)

```bash
sudo apt update
sudo apt install -y docker.io docker-compose git
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker ubuntu
exit
```

### 3. 배포

```bash
# 프로젝트 클론
git clone https://github.com/your-repo/Synodos.git
cd Synodos

# 환경 변수 설정
cp .env.example .env
nano .env
```

`.env` 파일 내용:
```properties
# DB 설정
DB_USERNAME=flow
DB_PASSWORD=flow123

# JWT 시크릿 (프로덕션용으로 변경)
JWT_SECRET=your-production-secret-key

# SMTP 설정 (Gmail 앱 비밀번호)
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-16-digit-app-password

# OAuth2 (선택)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NAVER_CLIENT_ID=...
NAVER_CLIENT_SECRET=...
KAKAO_CLIENT_ID=...
KAKAO_CLIENT_SECRET=...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...

# GitHub Webhook (외부 접근 가능한 URL)
GITHUB_WEBHOOK_BASE_URL=https://your-domain.com
```

```bash
# 배포 실행
docker-compose up -d --build
```

브라우저에서 `http://EC2-퍼블릭-IP` 접속

### 4. 유용한 명령어

```bash
# 컨테이너 상태 확인
docker-compose ps

# 로그 확인
docker-compose logs -f

# 백엔드 로그만
docker logs -f synodos-backend

# 재시작
docker-compose restart

# 중지
docker-compose down

# 이미지 재빌드
docker-compose up -d --build

# DB 데이터 백업
docker exec synodos-db pg_dump -U flow synodos > backup.sql

# DB 데이터 복원
cat backup.sql | docker exec -i synodos-db psql -U flow synodos
```

### 5. 도메인 및 HTTPS 설정 (선택)

**Route 53 도메인 연결:**
1. Route 53 > 호스팅 영역 생성
2. A 레코드 추가 > EC2 퍼블릭 IP

**Let's Encrypt SSL:**
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

### 비용 참고 (서울 리전)

| 서비스 | 사양 | 월 예상 비용 |
|--------|------|-------------|
| EC2 | t3.small | ~$15 |

프리 티어 (t2.micro) 적용 시 12개월간 무료

---

## 환경 변수 설정

### 파일 구조

| 파일 | Git | 용도 |
|------|-----|------|
| `.env.example` | O | 템플릿 (예시값) |
| `.env` | X | 실제 설정값 (Docker용) |
| `application.properties` | O | Spring Boot 기본 설정 |
| `application-local.properties` | X | 로컬 개발용 민감 정보 |

### 환경별 설정 방법

| 환경 | 설정 방법 |
|------|----------|
| 로컬 (mvn) | `application-local.properties` + `-Dspring-boot.run.profiles=local` |
| Docker / AWS | `.env` 파일에 환경변수 설정 |

---

## API 엔드포인트

### 인증
- `POST /api/member/login` - 로그인
- `POST /api/member/register` - 회원가입
- `POST /api/email/send-verification` - 이메일 인증 코드 발송
- `POST /api/email/verify` - 이메일 인증 확인

### 태스크
- `POST /api/taskwrite` - 태스크 생성
- `GET /api/tasklist/team/{teamId}` - 팀 태스크 목록
- `GET /api/taskcontent/{id}` - 태스크 상세
- `PUT /api/taskupdate` - 태스크 수정
- `DELETE /api/taskdelete/{id}` - 태스크 삭제
- `PUT /api/taskposition` - 위치 변경 (드래그 앤 드롭)

### 워크플로우
- `POST /api/task/workflow/{id}/accept` - 작업 수락
- `POST /api/task/workflow/{id}/complete` - 작업 완료
- `POST /api/task/workflow/{id}/approve` - 검토 승인
- `POST /api/task/workflow/{id}/reject` - 검토 반려
- `POST /api/task/workflow/{id}/decline` - 작업 거절

### GitHub
- `GET /api/github/branches/{teamId}` - 브랜치 목록
- `GET /api/github/commits/{teamId}` - 커밋 목록
- `POST /api/github/branch/{teamId}` - 브랜치 생성
- `POST /api/github/merge/{teamId}` - 머지
- `POST /api/github/pr/{teamId}` - PR 생성
- `POST /api/github/conflict/resolve` - AI 충돌 해결

### WebSocket
- 엔드포인트: `/ws` (STOMP over SockJS)
- 구독: `/topic/team/{teamId}` (보드 이벤트)
- 구독: `/topic/user/{memberNo}/notifications` (개인 알림)

---

## 라이선스

MIT License