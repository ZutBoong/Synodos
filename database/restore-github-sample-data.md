# GitHub 샘플 데이터 복원 가이드

`github-sample-data.json` 파일의 데이터를 GitHub에 다시 올리는 방법입니다.

## 사전 준비

1. GitHub Personal Access Token (PAT) 필요
   - Settings > Developer settings > Personal access tokens
   - 권한: `repo` (Full control of private repositories)

2. gh CLI 설치 (선택사항)
   ```bash
   # Windows
   winget install GitHub.cli

   # Mac
   brew install gh
   ```

## 방법 1: Claude Code에게 요청

Claude Code에게 다음과 같이 요청하세요:

```
database/github-sample-data.json 파일을 읽고 ZutBoong/Synodos-Test 저장소에
동일한 Labels, Milestones, Issues를 생성해줘
```

## 방법 2: gh CLI 사용

```bash
# 인증
gh auth login

# Labels 생성
gh label create "status:waiting" --color "94a3b8" --description "Task is waiting to be started" -R ZutBoong/Synodos-Test
gh label create "status:in-progress" --color "3b82f6" --description "Task is in progress" -R ZutBoong/Synodos-Test
gh label create "status:review" --color "f59e0b" --description "Task is under review" -R ZutBoong/Synodos-Test
gh label create "status:done" --color "10b981" --description "Task is completed" -R ZutBoong/Synodos-Test
gh label create "status:rejected" --color "ef4444" --description "Task was rejected" -R ZutBoong/Synodos-Test
gh label create "status:declined" --color "6b7280" --description "Task was declined" -R ZutBoong/Synodos-Test

# Milestones 생성
gh api repos/ZutBoong/Synodos-Test/milestones -f title="Sprint 1" -f description="First sprint" -f due_on="2026-01-15T00:00:00Z"
gh api repos/ZutBoong/Synodos-Test/milestones -f title="Sprint 2" -f description="Second sprint" -f due_on="2026-01-31T00:00:00Z"
gh api repos/ZutBoong/Synodos-Test/milestones -f title="v1.0 Release" -f description="Version 1.0 release" -f due_on="2026-02-15T00:00:00Z"

# Issues 생성 (예시 - 각 Issue마다 실행)
gh issue create --title "[Feature] Login Implementation" --body "## Description..." --label "status:done" --milestone "Sprint 1" -R ZutBoong/Synodos-Test
```

## 방법 3: GitHub API 직접 호출

```bash
# 환경변수 설정
export GITHUB_TOKEN="your_token_here"
export REPO="ZutBoong/Synodos-Test"

# Label 생성
curl -X POST -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/$REPO/labels \
  -d '{"name":"status:waiting","color":"94a3b8","description":"Task is waiting to be started"}'

# Milestone 생성
curl -X POST -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/$REPO/milestones \
  -d '{"title":"Sprint 1","description":"First sprint","due_on":"2026-01-15T00:00:00Z"}'

# Issue 생성
curl -X POST -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/repos/$REPO/issues \
  -d '{"title":"[Feature] Login Implementation","body":"## Description...","labels":["status:done"],"milestone":1}'
```

## 주의사항

- Issue 번호는 자동 생성되므로 원본과 다를 수 있음
- Milestone은 먼저 생성해야 Issue에 연결 가능
- 기존 데이터가 있으면 중복 생성될 수 있으므로 먼저 정리 필요
