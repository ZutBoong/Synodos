# Synodos-Conflict-Test GitHub Repository Setup Script
# AI 머지 충돌 테스트용 저장소

param(
    [string]$RepoName = "Synodos-Conflict-Test",
    [string]$Owner = "ZutBoong"
)

$ErrorActionPreference = "Stop"

Write-Host "=== Synodos-Conflict-Test Setup ===" -ForegroundColor Cyan
Write-Host "AI 머지 충돌 테스트용 저장소를 생성합니다." -ForegroundColor Gray

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
gh repo create $RepoName --public --description "Synodos AI Merge Conflict Test Repository"

# 작업 디렉토리 생성
$WorkDir = "temp-conflict-repo"
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

# ========== 초기 파일 생성 ==========
Write-Host "4. 기본 파일 생성 중..." -ForegroundColor Yellow

# README
@"
# Synodos Conflict Test

AI 머지 충돌 해결 기능 테스트를 위한 저장소입니다.

## 충돌 시나리오

1. **feature/config-update** -> main: src/config.js 충돌
2. **feature/utils-refactor** -> main: src/utils.js 충돌

각 브랜치를 main으로 머지할 때 충돌이 발생합니다.
"@ | Out-File -FilePath "README.md" -Encoding UTF8

# src 디렉토리 생성
New-Item -ItemType Directory -Path "src" -Force | Out-Null

# config.js (기본)
@"
// Application Configuration
const config = {
    appName: 'Synodos',
    version: '1.0.0',
    apiUrl: 'http://localhost:8081/api',
    wsUrl: 'ws://localhost:8081/ws',
    theme: 'light',
    language: 'ko',
    maxFileSize: 10 * 1024 * 1024,
    supportedFormats: ['jpg', 'png', 'pdf']
};

module.exports = config;
"@ | Out-File -FilePath "src/config.js" -Encoding UTF8

# utils.js (기본)
@"
// Utility Functions
function formatDate(date) {
    return new Date(date).toLocaleDateString('ko-KR');
}

function formatTime(date) {
    return new Date(date).toLocaleTimeString('ko-KR');
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function truncate(str, length) {
    if (str.length <= length) return str;
    return str.slice(0, length) + '...';
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

module.exports = {
    formatDate,
    formatTime,
    capitalize,
    truncate,
    debounce
};
"@ | Out-File -FilePath "src/utils.js" -Encoding UTF8

# 초기 커밋
git add .
git commit -m "Initial commit: Base configuration"

git branch -M main
git push -u origin main --force

# ========== feature/config-update 브랜치 ==========
Write-Host "5. 충돌 브랜치 생성 중..." -ForegroundColor Yellow

git checkout -b feature/config-update

@"
// Application Configuration - Updated for Production
const config = {
    appName: 'Synodos Pro',
    version: '2.0.0',
    apiUrl: 'https://api.synodos.com/v2',
    wsUrl: 'wss://ws.synodos.com',
    theme: 'auto',
    language: 'ko',
    maxFileSize: 100 * 1024 * 1024,
    supportedFormats: ['jpg', 'png', 'gif', 'pdf', 'doc', 'docx', 'xls', 'xlsx'],
    features: {
        darkMode: true,
        notifications: true,
        analytics: true
    }
};

module.exports = config;
"@ | Out-File -FilePath "src/config.js" -Encoding UTF8
git add src/config.js
git commit -m "feat: Update config for production"

git push -u origin feature/config-update --force

# ========== feature/utils-refactor 브랜치 ==========
git checkout main
git checkout -b feature/utils-refactor

@"
// Utility Functions - Refactored with ES6+
const formatDate = (date, locale = 'ko-KR') => {
    return new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(new Date(date));
};

const formatTime = (date, locale = 'ko-KR') => {
    return new Intl.DateTimeFormat(locale, {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).format(new Date(date));
};

const formatDateTime = (date, locale = 'ko-KR') => {
    return formatDate(date, locale) + ' ' + formatTime(date, locale);
};

const capitalize = (str) => str ? str.charAt(0).toUpperCase() + str.slice(1).toLowerCase() : '';

const truncate = (str, length = 100, suffix = '...') => {
    if (!str || str.length <= length) return str;
    return str.slice(0, length - suffix.length) + suffix;
};

const debounce = (func, wait = 300) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
};

const throttle = (func, limit = 300) => {
    let inThrottle;
    return (...args) => {
        if (!inThrottle) {
            func(...args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
};

const deepClone = (obj) => JSON.parse(JSON.stringify(obj));

const isEmpty = (value) => {
    if (value == null) return true;
    if (Array.isArray(value) || typeof value === 'string') return value.length === 0;
    if (typeof value === 'object') return Object.keys(value).length === 0;
    return false;
};

module.exports = {
    formatDate,
    formatTime,
    formatDateTime,
    capitalize,
    truncate,
    debounce,
    throttle,
    deepClone,
    isEmpty
};
"@ | Out-File -FilePath "src/utils.js" -Encoding UTF8
git add src/utils.js
git commit -m "refactor: Modernize utils with ES6+"

git push -u origin feature/utils-refactor --force

# ========== main 브랜치에서 같은 파일 수정 (충돌 유발) ==========
Write-Host "6. Main 브랜치 수정 (충돌 유발)..." -ForegroundColor Yellow

git checkout main

# config.js 수정
@"
// Application Configuration - Hotfix
const config = {
    appName: 'Synodos',
    version: '1.1.0',
    apiUrl: 'http://localhost:8081/api',
    wsUrl: 'ws://localhost:8081/ws',
    theme: 'light',
    language: 'ko',
    maxFileSize: 50 * 1024 * 1024,
    supportedFormats: ['jpg', 'png', 'pdf', 'doc'],
    debug: false,
    logLevel: 'error'
};

module.exports = config;
"@ | Out-File -FilePath "src/config.js" -Encoding UTF8
git add src/config.js
git commit -m "fix: Add debug and logLevel to config"

# utils.js 수정
@"
// Utility Functions - Updated
function formatDate(date) {
    return new Date(date).toLocaleDateString('ko-KR');
}

function formatTime(date) {
    return new Date(date).toLocaleTimeString('ko-KR');
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function truncate(str, length) {
    if (str.length <= length) return str;
    return str.slice(0, length) + '...';
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// New utility: Generate unique ID
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// New utility: Sleep function
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
    formatDate,
    formatTime,
    capitalize,
    truncate,
    debounce,
    generateId,
    sleep
};
"@ | Out-File -FilePath "src/utils.js" -Encoding UTF8
git add src/utils.js
git commit -m "feat: Add generateId and sleep utilities"

git push origin main --force

# ========== Labels 생성 ==========
Write-Host "7. Labels 생성 중..." -ForegroundColor Yellow

gh label create "feature" --color "0e8a16" --description "New feature" --repo "$Owner/$RepoName" 2>$null
gh label create "refactor" --color "1d76db" --description "Code refactoring" --repo "$Owner/$RepoName" 2>$null
gh label create "conflict" --color "d93f0b" --description "Has merge conflict" --repo "$Owner/$RepoName" 2>$null
gh label create "config" --color "fef2c0" --description "Configuration changes" --repo "$Owner/$RepoName" 2>$null

# ========== Issues 생성 ==========
Write-Host "8. Issues 생성 중..." -ForegroundColor Yellow

# Issue #1: Production Config
gh issue create --repo "$Owner/$RepoName" --title "[Feature] Production Configuration" --body @"
## Description
Update application configuration for production deployment.

## Requirements
- Change API URLs to production endpoints
- Increase file size limits
- Add feature flags for dark mode, notifications, analytics

## Technical Notes
- File: src/config.js
- This will conflict with recent hotfix changes on main
"@ --label "feature,config,conflict"

# Issue #2: Utils Refactor
gh issue create --repo "$Owner/$RepoName" --title "[Refactor] Modernize Utility Functions" --body @"
## Description
Refactor utility functions to use modern ES6+ syntax.

## Requirements
- Convert to arrow functions
- Add default parameters
- Add new utilities: throttle, deepClone, isEmpty, formatDateTime

## Technical Notes
- File: src/utils.js
- This will conflict with recent utility additions on main
"@ --label "refactor,conflict"

# ========== PR 생성 (Issue 연결) ==========
Write-Host "9. Pull Request 생성 중..." -ForegroundColor Yellow

gh pr create --repo "$Owner/$RepoName" --head feature/config-update --base main --title "feat: Production Configuration Update" --body @"
## Summary
Update configuration for production deployment.

Closes #1

## Changes
- New API URLs for production
- Increased file size limits
- Added feature flags

## Note
This PR has conflicts with main branch (src/config.js).
"@

gh pr create --repo "$Owner/$RepoName" --head feature/utils-refactor --base main --title "refactor: Modernize Utility Functions" --body @"
## Summary
Refactor utility functions using ES6+ syntax and add new utilities.

Closes #2

## Changes
- Arrow functions
- Default parameters
- New functions: throttle, deepClone, isEmpty, formatDateTime

## Note
This PR has conflicts with main branch (src/utils.js).
"@

# 작업 디렉토리로 복귀
Set-Location ..

Write-Host ""
Write-Host "=== 설정 완료! ===" -ForegroundColor Green
Write-Host ""
Write-Host "생성된 브랜치:" -ForegroundColor Cyan
Write-Host "  - main (기본 브랜치, 충돌 유발 커밋 포함)"
Write-Host "  - feature/config-update (PR #1 - Issue #1 연결)"
Write-Host "  - feature/utils-refactor (PR #2 - Issue #2 연결)"
Write-Host ""
Write-Host "충돌 테스트:" -ForegroundColor Yellow
Write-Host "  - feature/config-update -> main: src/config.js 충돌 (중간 난이도)"
Write-Host "  - feature/utils-refactor -> main: src/utils.js 충돌 (높은 난이도)"
Write-Host ""
Write-Host "Issues:" -ForegroundColor Cyan
Write-Host "  - #1: [Feature] Production Configuration (PR #1과 연결)"
Write-Host "  - #2: [Refactor] Modernize Utility Functions (PR #2와 연결)"
Write-Host ""
Write-Host "Labels:" -ForegroundColor Cyan
Write-Host "  - feature, refactor, conflict, config"
Write-Host ""
Write-Host "저장소 URL: https://github.com/$Owner/$RepoName" -ForegroundColor Cyan
