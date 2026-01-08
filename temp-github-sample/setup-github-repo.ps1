# Synodos-Test GitHub Repository Setup Script
# 이 스크립트를 실행하면 자동으로 저장소가 설정됩니다.

param(
    [string]$RepoName = "Synodos-Test",
    [string]$Owner = "ZutBoong"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Synodos-Test GitHub Repository Setup ===" -ForegroundColor Cyan

# gh CLI 확인
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "gh CLI가 설치되어 있지 않습니다. 설치해주세요: winget install GitHub.cli" -ForegroundColor Red
    exit 1
}

# 인증 확인
$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "GitHub 인증이 필요합니다. 'gh auth login'을 실행해주세요." -ForegroundColor Red
    exit 1
}

# 기존 저장소 삭제
Write-Host "1. 기존 저장소 삭제 중..." -ForegroundColor Yellow
$deleteResult = gh repo delete "$Owner/$RepoName" --yes 2>&1
if ($LASTEXITCODE -eq 0) {
    Write-Host "   기존 저장소 삭제 완료" -ForegroundColor Gray
    Start-Sleep -Seconds 2
} else {
    Write-Host "   저장소가 없거나 삭제 권한 없음 (계속 진행)" -ForegroundColor Gray
}

Write-Host "2. GitHub 저장소 생성 중..." -ForegroundColor Yellow
gh repo create $RepoName --public --description "Synodos GitHub Integration Test Repository"

# 작업 디렉토리 생성
$WorkDir = "temp-test-repo"
if (Test-Path $WorkDir) {
    Remove-Item -Recurse -Force $WorkDir
}
New-Item -ItemType Directory -Path $WorkDir | Out-Null
Set-Location $WorkDir

# Git 초기화
Write-Host "3. Git 저장소 초기화..." -ForegroundColor Yellow
git init
git remote add origin "https://github.com/$Owner/$RepoName.git"

# 사용자 설정
git config user.email "synodos@example.com"
git config user.name "Synodos Bot"

# ========== 파일 생성 및 MAIN 브랜치 커밋들 ==========
Write-Host "4. Main 브랜치 커밋 생성 중..." -ForegroundColor Yellow

# src 디렉토리 생성
New-Item -ItemType Directory -Path "src" -Force | Out-Null

# 커밋 1: README
@"
# Synodos-Test Repository

This is a test repository for Synodos GitHub integration testing.

## Features
- Branch management
- Commit history
- PR testing
- Merge conflict resolution

## Setup
```bash
npm install
npm start
```
"@ | Out-File -FilePath "README.md" -Encoding UTF8
git add README.md
git commit -m "Initial commit: Add README"

# 커밋 2: config.js
@"
// Application Configuration
const config = {
    appName: 'Synodos Test App',
    version: '1.0.0',
    apiUrl: 'https://api.example.com',
    debug: false
};

module.exports = config;
"@ | Out-File -FilePath "src/config.js" -Encoding UTF8
git add src/config.js
git commit -m "feat: Add application configuration"

# 커밋 3: utils.js
@"
// Utility Functions
function formatDate(date) {
    return date.toISOString().split('T')[0];
}

function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { formatDate, generateId, delay };
"@ | Out-File -FilePath "src/utils.js" -Encoding UTF8
git add src/utils.js
git commit -m "feat: Add utility functions"

# 커밋 4: api.js
@"
// API Client
const config = require('./config');

class ApiClient {
    constructor() {
        this.baseUrl = config.apiUrl;
    }

    async get(endpoint) {
        const response = await fetch(this.baseUrl + endpoint);
        return response.json();
    }

    async post(endpoint, data) {
        const response = await fetch(this.baseUrl + endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return response.json();
    }
}

module.exports = new ApiClient();
"@ | Out-File -FilePath "src/api.js" -Encoding UTF8
git add src/api.js
git commit -m "feat: Add API client"

# main으로 브랜치 이름 변경 및 푸시
git branch -M main
git push -u origin main --force

Write-Host "5. Feature 브랜치들 생성 중..." -ForegroundColor Yellow

# ========== feature/user-auth 브랜치 (많은 커밋 + PR 대기) ==========
git checkout -b feature/user-auth

# auth.js 생성 - 여러 커밋으로 나눠서
@"
// Authentication Module - Step 1
class AuthService {
    constructor() {
        this.user = null;
    }
}
module.exports = AuthService;
"@ | Out-File -FilePath "src/auth.js" -Encoding UTF8
git add src/auth.js
git commit -m "feat(auth): Initialize AuthService class"

# 커밋 2
@"
// Authentication Module - Step 2
class AuthService {
    constructor() {
        this.user = null;
        this.token = null;
    }

    async login(email, password) {
        // TODO: Implement login
        return { success: true };
    }
}
module.exports = AuthService;
"@ | Out-File -FilePath "src/auth.js" -Encoding UTF8
git add src/auth.js
git commit -m "feat(auth): Add login method skeleton"

# 커밋 3
@"
// Authentication Module - Step 3
const api = require('./api');

class AuthService {
    constructor() {
        this.user = null;
        this.token = null;
    }

    async login(email, password) {
        const response = await api.post('/auth/login', { email, password });
        if (response.token) {
            this.token = response.token;
            this.user = response.user;
            api.setToken(this.token);
        }
        return response;
    }

    logout() {
        this.user = null;
        this.token = null;
        api.setToken(null);
    }
}
module.exports = AuthService;
"@ | Out-File -FilePath "src/auth.js" -Encoding UTF8
git add src/auth.js
git commit -m "feat(auth): Implement login with API integration"

# 커밋 4
@"
// Authentication Module - Step 4
const api = require('./api');

class AuthService {
    constructor() {
        this.user = null;
        this.token = null;
        this.refreshToken = null;
    }

    async login(email, password) {
        const response = await api.post('/auth/login', { email, password });
        if (response.token) {
            this.token = response.token;
            this.refreshToken = response.refreshToken;
            this.user = response.user;
            api.setToken(this.token);
            this.saveToStorage();
        }
        return response;
    }

    logout() {
        this.user = null;
        this.token = null;
        this.refreshToken = null;
        api.setToken(null);
        this.clearStorage();
    }

    saveToStorage() {
        localStorage.setItem('token', this.token);
        localStorage.setItem('refreshToken', this.refreshToken);
        localStorage.setItem('user', JSON.stringify(this.user));
    }

    clearStorage() {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
    }
}
module.exports = AuthService;
"@ | Out-File -FilePath "src/auth.js" -Encoding UTF8
git add src/auth.js
git commit -m "feat(auth): Add token storage and refresh token support"

# 커밋 5
@"
// Authentication Module - Complete
const api = require('./api');

class AuthService {
    constructor() {
        this.user = null;
        this.token = null;
        this.refreshToken = null;
        this.loadFromStorage();
    }

    async login(email, password) {
        const response = await api.post('/auth/login', { email, password });
        if (response.token) {
            this.token = response.token;
            this.refreshToken = response.refreshToken;
            this.user = response.user;
            api.setToken(this.token);
            this.saveToStorage();
        }
        return response;
    }

    async register(email, password, name) {
        const response = await api.post('/auth/register', { email, password, name });
        return response;
    }

    async refreshAccessToken() {
        if (!this.refreshToken) return false;
        const response = await api.post('/auth/refresh', { refreshToken: this.refreshToken });
        if (response.token) {
            this.token = response.token;
            api.setToken(this.token);
            this.saveToStorage();
            return true;
        }
        return false;
    }

    logout() {
        this.user = null;
        this.token = null;
        this.refreshToken = null;
        api.setToken(null);
        this.clearStorage();
    }

    isAuthenticated() {
        return !!this.token;
    }

    saveToStorage() {
        localStorage.setItem('token', this.token);
        localStorage.setItem('refreshToken', this.refreshToken);
        localStorage.setItem('user', JSON.stringify(this.user));
    }

    loadFromStorage() {
        this.token = localStorage.getItem('token');
        this.refreshToken = localStorage.getItem('refreshToken');
        const userStr = localStorage.getItem('user');
        this.user = userStr ? JSON.parse(userStr) : null;
        if (this.token) {
            api.setToken(this.token);
        }
    }

    clearStorage() {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
    }
}

module.exports = new AuthService();
"@ | Out-File -FilePath "src/auth.js" -Encoding UTF8
git add src/auth.js
git commit -m "feat(auth): Complete authentication module with register and refresh"

git push -u origin feature/user-auth --force

# ========== feature/dark-mode 브랜치 (PR 대기) ==========
git checkout main
git checkout -b feature/dark-mode

@"
// Theme Configuration
const themes = {
    light: {
        name: 'Light',
        background: '#ffffff',
        text: '#1e293b',
        primary: '#3b82f6',
        secondary: '#64748b',
        accent: '#8b5cf6',
        border: '#e2e8f0'
    },
    dark: {
        name: 'Dark',
        background: '#0f172a',
        text: '#f8fafc',
        primary: '#60a5fa',
        secondary: '#94a3b8',
        accent: '#a78bfa',
        border: '#334155'
    }
};

let currentTheme = 'light';

function setTheme(themeName) {
    if (themes[themeName]) {
        currentTheme = themeName;
        applyTheme(themes[themeName]);
        localStorage.setItem('theme', themeName);
    }
}

function getTheme() {
    return themes[currentTheme];
}

function applyTheme(theme) {
    const root = document.documentElement;
    Object.entries(theme).forEach(([key, value]) => {
        if (key !== 'name') {
            root.style.setProperty('--color-' + key, value);
        }
    });
}

function initTheme() {
    const saved = localStorage.getItem('theme');
    if (saved && themes[saved]) {
        setTheme(saved);
    }
}

module.exports = { themes, setTheme, getTheme, initTheme };
"@ | Out-File -FilePath "src/theme.js" -Encoding UTF8
git add src/theme.js
git commit -m "feat: Add dark mode theme support"

git push -u origin feature/dark-mode --force

# ========== feature/notifications 브랜치 (PR 없음) ==========
git checkout main
git checkout -b feature/notifications

@"
// Notification Service
class NotificationService {
    constructor() {
        this.notifications = [];
        this.listeners = [];
    }

    add(notification) {
        const id = Date.now();
        const newNotification = { id, ...notification, read: false, createdAt: new Date() };
        this.notifications.unshift(newNotification);
        this.notify();
        return id;
    }

    markAsRead(id) {
        const notification = this.notifications.find(n => n.id === id);
        if (notification) {
            notification.read = true;
            this.notify();
        }
    }

    remove(id) {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.notify();
    }

    getUnreadCount() {
        return this.notifications.filter(n => !n.read).length;
    }

    subscribe(listener) {
        this.listeners.push(listener);
        return () => {
            this.listeners = this.listeners.filter(l => l !== listener);
        };
    }

    notify() {
        this.listeners.forEach(listener => listener(this.notifications));
    }
}

module.exports = new NotificationService();
"@ | Out-File -FilePath "src/notifications.js" -Encoding UTF8
git add src/notifications.js
git commit -m "feat: Add notification service"

git push -u origin feature/notifications --force

# ========== feature/search 브랜치 (PR 없음) ==========
git checkout main
git checkout -b feature/search

@"
// Search Module
class SearchService {
    constructor() {
        this.cache = new Map();
        this.debounceTime = 300;
    }

    async search(query, options = {}) {
        const cacheKey = JSON.stringify({ query, options });

        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }

        const results = await this.performSearch(query, options);
        this.cache.set(cacheKey, results);

        return results;
    }

    async performSearch(query, options) {
        // API call would go here
        return [];
    }

    clearCache() {
        this.cache.clear();
    }
}

module.exports = new SearchService();
"@ | Out-File -FilePath "src/search.js" -Encoding UTF8
git add src/search.js
git commit -m "feat: Add search service with caching"

git push -u origin feature/search --force

# ========== PR 생성 ==========
Write-Host "6. Pull Request 생성 중..." -ForegroundColor Yellow

# feature/user-auth PR
gh pr create --repo "$Owner/$RepoName" --head feature/user-auth --base main --title "feat: User Authentication System" --body @"
## Summary
Complete user authentication system with login, register, and token refresh.

## Changes
- AuthService class with full authentication flow
- Token storage in localStorage
- Automatic token refresh support

## Test Plan
- [ ] Test login flow
- [ ] Test registration
- [ ] Test token refresh
- [ ] Test logout
"@

# feature/dark-mode PR
gh pr create --repo "$Owner/$RepoName" --head feature/dark-mode --base main --title "feat: Dark Mode Support" --body @"
## Summary
Add dark mode theme toggle functionality.

## Changes
- Theme configuration with light/dark themes
- CSS variable-based theming
- Theme persistence in localStorage
"@

# ========== Labels 생성 ==========
Write-Host "7. Labels 생성 중..." -ForegroundColor Yellow

gh label create "status:waiting" --color "94a3b8" --description "Task is waiting to be started" --repo "$Owner/$RepoName" 2>$null
gh label create "status:in-progress" --color "3b82f6" --description "Task is in progress" --repo "$Owner/$RepoName" 2>$null
gh label create "status:review" --color "f59e0b" --description "Task is under review" --repo "$Owner/$RepoName" 2>$null
gh label create "status:done" --color "10b981" --description "Task is completed" --repo "$Owner/$RepoName" 2>$null
gh label create "status:rejected" --color "ef4444" --description "Task was rejected" --repo "$Owner/$RepoName" 2>$null
gh label create "status:declined" --color "6b7280" --description "Task was declined" --repo "$Owner/$RepoName" 2>$null

# ========== Milestones 생성 ==========
Write-Host "8. Milestones 생성 중..." -ForegroundColor Yellow

gh api repos/$Owner/$RepoName/milestones -f title="Sprint 1" -f description="First sprint" -f due_on="2026-01-15T00:00:00Z" 2>$null
gh api repos/$Owner/$RepoName/milestones -f title="Sprint 2" -f description="Second sprint" -f due_on="2026-01-31T00:00:00Z" 2>$null
gh api repos/$Owner/$RepoName/milestones -f title="v1.0 Release" -f description="Version 1.0 release" -f due_on="2026-02-15T00:00:00Z" 2>$null

# ========== Issues 생성 ==========
Write-Host "9. Issues 생성 중..." -ForegroundColor Yellow

# Sprint 1 Issues (milestone 1)
gh issue create --repo "$Owner/$RepoName" --title "[Feature] Login Implementation" --body "Implement user login functionality with JWT authentication." --label "status:done" --milestone "Sprint 1"
gh issue create --repo "$Owner/$RepoName" --title "[Feature] Dashboard Enhancement" --body "Add widgets and improve dashboard UX." --label "status:in-progress" --milestone "Sprint 1"
gh issue create --repo "$Owner/$RepoName" --title "[Bug] Token Expiration Handling" --body "Token refresh not working properly when token expires." --label "status:waiting" --milestone "Sprint 1"

# Sprint 2 Issues (milestone 2)
gh issue create --repo "$Owner/$RepoName" --title "[Feature] User profile page" --body "Create user profile page with avatar upload and settings." --label "status:review" --milestone "Sprint 2"
gh issue create --repo "$Owner/$RepoName" --title "[Bug] Search results not updating" --body "Search results don't update in real-time when filters change." --label "status:in-progress" --milestone "Sprint 2"
gh issue create --repo "$Owner/$RepoName" --title "[Feature] Dark mode support" --body "Add dark mode theme toggle to the application." --label "status:review" --milestone "Sprint 2"
gh issue create --repo "$Owner/$RepoName" --title "[Bug] Memory leak in WebSocket" --body "WebSocket connections not properly cleaned up on component unmount." --label "status:in-progress" --milestone "Sprint 2"

# v1.0 Release Issues (milestone 3)
gh issue create --repo "$Owner/$RepoName" --title "[Feature] Export to PDF" --body "Allow users to export reports and data to PDF format." --label "status:waiting" --milestone "v1.0 Release"
gh issue create --repo "$Owner/$RepoName" --title "[Bug] Notification sound not playing" --body "Desktop notifications work but sound doesn't play on Windows." --label "status:waiting" --milestone "v1.0 Release"
gh issue create --repo "$Owner/$RepoName" --title "[Feature] Calendar integration" --body "Integrate with Google Calendar for task scheduling." --label "status:waiting" --milestone "v1.0 Release"

# 작업 디렉토리로 복귀
Set-Location ..

Write-Host ""
Write-Host "=== 설정 완료! ===" -ForegroundColor Green
Write-Host ""
Write-Host "생성된 브랜치:" -ForegroundColor Cyan
Write-Host "  - main (기본 브랜치, 커밋 4개)"
Write-Host "  - feature/user-auth (커밋 5개, PR 대기)"
Write-Host "  - feature/dark-mode (커밋 1개, PR 대기)"
Write-Host "  - feature/notifications (커밋 1개, PR 없음)"
Write-Host "  - feature/search (커밋 1개, PR 없음)"
Write-Host ""
Write-Host "Issues (10개):" -ForegroundColor Cyan
Write-Host "  - Sprint 1: 3개 (done 1, in-progress 1, waiting 1)"
Write-Host "  - Sprint 2: 4개 (review 2, in-progress 2)"
Write-Host "  - v1.0 Release: 3개 (waiting 3)"
Write-Host ""
Write-Host "Milestones (마감일 포함):" -ForegroundColor Cyan
Write-Host "  - Sprint 1: 2026-01-15"
Write-Host "  - Sprint 2: 2026-01-31"
Write-Host "  - v1.0 Release: 2026-02-15"
Write-Host ""
Write-Host "저장소 URL: https://github.com/$Owner/$RepoName" -ForegroundColor Cyan
