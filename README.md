# Flowtask

프로젝트 관리 및 실시간 협업 애플리케이션입니다.

## 기술 스택

- **Backend**: Spring Boot 3.2, MyBatis, Java 17
- **Frontend**: React 18, React Router
- **Database**: PostgreSQL
- **Real-time**: WebSocket (STOMP)
- **Auth**: JWT

## 주요 기능

- 팀/프로젝트 관리
- 보드 (드래그 앤 드롭)
- 태스크 관리 (담당자, 마감일, 우선순위)
- 태스크 댓글
- 태그 시스템
- 검증자 워크플로우
- 팀 채팅 (실시간)
- 캘린더 뷰
- Git 연동

## 필수 요구사항

- Java 17+
- Node.js 18+
- PostgreSQL 15+

## 초기 설정

### 1. 데이터베이스 설정

PostgreSQL에 데이터베이스와 사용자를 생성합니다.

```sql
-- PostgreSQL에 접속 후
CREATE DATABASE flowtask;
CREATE USER flow WITH PASSWORD 'flow123';
GRANT ALL PRIVILEGES ON DATABASE flowtask TO flow;

-- flowtask DB에 접속 후 스키마 권한 부여
\c flowtask
GRANT ALL ON SCHEMA public TO flow;
```

flow 사용자로 접속 후 스키마 파일 실행:

```bash
psql -U flow -d flowtask -f database/postgresql_schema.sql
```

### 2. Backend 실행

```bash
cd backend
./mvnw spring-boot:run
```

서버가 `http://localhost:8081`에서 시작됩니다.

### 3. Frontend 실행

```bash
cd frontend
npm install
npm start
```

브라우저에서 `http://localhost:3000`으로 접속합니다.

## 프로젝트 구조

```
Flowtask/
├── backend/                 # Spring Boot 백엔드
│   ├── src/main/java/      # Java 소스
│   └── src/main/resources/ # 설정 및 MyBatis 매퍼
├── frontend/               # React 프론트엔드
│   └── src/
│       ├── api/           # API 클라이언트
│       ├── components/    # 재사용 컴포넌트
│       └── pages/         # 페이지 컴포넌트
└── database/              # SQL 스키마 파일
```

## 설정 변경

### 데이터베이스 연결 정보

`backend/src/main/resources/application.properties`:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/flowtask
spring.datasource.username=flow
spring.datasource.password=flow123
```

## 라이선스

MIT License
