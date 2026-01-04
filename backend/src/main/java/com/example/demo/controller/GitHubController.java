package com.example.demo.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.demo.dao.MemberDao;
import com.example.demo.dao.TaskGitHubIssueDao;
import com.example.demo.dao.TaskGitHubPRDao;
import com.example.demo.model.Member;
import com.example.demo.model.Team;
import com.example.demo.model.TaskCommit;
import com.example.demo.model.TaskGitHubIssue;
import com.example.demo.model.TaskGitHubPR;
import com.example.demo.service.GitHubService;
import com.example.demo.service.GitHubService.GitHubBranch;
import com.example.demo.service.GitHubService.GitHubBranchComparison;
import com.example.demo.service.GitHubService.GitHubCommit;
import com.example.demo.service.GitHubService.GitHubGraphCommit;
import com.example.demo.service.GitHubService.GitHubMergeResult;
import com.example.demo.service.GitHubService.GitHubPullRequest;
import com.example.demo.service.GitHubService.GitHubRevertResult;
import com.example.demo.service.GitHubService.RepoInfo;
import com.example.demo.service.TaskCommitService;
import com.example.demo.service.TeamService;

import lombok.extern.slf4j.Slf4j;

@Slf4j
@RestController
@RequestMapping("/api/github")
public class GitHubController {

    @Autowired
    private GitHubService gitHubService;

    @Autowired
    private TeamService teamService;

    @Autowired
    private TaskCommitService taskCommitService;

    @Autowired
    private MemberDao memberDao;

    @Autowired
    private TaskGitHubIssueDao taskGitHubIssueDao;

    @Autowired
    private TaskGitHubPRDao taskGitHubPRDao;

    /**
     * 팀 저장소의 브랜치 목록을 조회합니다.
     * GET /api/github/branches/{teamId}
     */
    @GetMapping("/branches/{teamId}")
    public ResponseEntity<?> getBranches(@PathVariable int teamId) {
        try {
            Team team = teamService.findById(teamId);
            if (team == null) {
                return ResponseEntity.badRequest().body("팀을 찾을 수 없습니다.");
            }

            String repoUrl = team.getGithubRepoUrl();
            if (repoUrl == null || repoUrl.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("GitHub 저장소가 설정되지 않았습니다.");
            }

            RepoInfo repoInfo = gitHubService.parseRepoUrl(repoUrl);
            if (repoInfo == null) {
                return ResponseEntity.badRequest().body("잘못된 GitHub 저장소 URL입니다.");
            }

            // 팀장의 GitHub 액세스 토큰 조회
            String accessToken = getLeaderAccessToken(team);

            List<GitHubBranch> branches = gitHubService.listBranches(accessToken, repoInfo.owner, repoInfo.repo);
            return ResponseEntity.ok(branches);

        } catch (Exception e) {
            log.error("Failed to get branches: {}", e.getMessage());
            return ResponseEntity.status(503).body(e.getMessage());
        }
    }

    /**
     * 팀 저장소의 커밋 목록을 조회합니다.
     * GET /api/github/commits/{teamId}?branch=main&page=1
     */
    @GetMapping("/commits/{teamId}")
    public ResponseEntity<?> getCommits(
            @PathVariable int teamId,
            @RequestParam(defaultValue = "main") String branch,
            @RequestParam(defaultValue = "1") int page) {
        try {
            Team team = teamService.findById(teamId);
            if (team == null) {
                return ResponseEntity.badRequest().body("팀을 찾을 수 없습니다.");
            }

            String repoUrl = team.getGithubRepoUrl();
            if (repoUrl == null || repoUrl.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("GitHub 저장소가 설정되지 않았습니다.");
            }

            RepoInfo repoInfo = gitHubService.parseRepoUrl(repoUrl);
            if (repoInfo == null) {
                return ResponseEntity.badRequest().body("잘못된 GitHub 저장소 URL입니다.");
            }

            List<GitHubCommit> commits = gitHubService.listCommits(repoInfo.owner, repoInfo.repo, branch, page);
            return ResponseEntity.ok(commits);

        } catch (Exception e) {
            log.error("Failed to get commits: {}", e.getMessage());
            return ResponseEntity.status(503).body(e.getMessage());
        }
    }

    /**
     * 태스크에 커밋을 연결합니다.
     * POST /api/github/task/{taskId}/commit
     */
    @PostMapping("/task/{taskId}/commit")
    public ResponseEntity<?> linkCommit(
            @PathVariable int taskId,
            @RequestBody Map<String, Object> request) {
        try {
            String commitSha = (String) request.get("commitSha");
            String commitMessage = (String) request.get("commitMessage");
            String commitAuthor = (String) request.get("commitAuthor");
            String commitDate = (String) request.get("commitDate");
            String githubUrl = (String) request.get("githubUrl");
            Integer linkedBy = (Integer) request.get("linkedBy");

            if (commitSha == null || commitSha.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("커밋 SHA가 필요합니다.");
            }
            if (linkedBy == null) {
                return ResponseEntity.badRequest().body("사용자 정보가 필요합니다.");
            }

            TaskCommit taskCommit = taskCommitService.linkCommit(
                taskId, commitSha.trim(), commitMessage, commitAuthor, commitDate, githubUrl, linkedBy
            );

            return ResponseEntity.ok(taskCommit);

        } catch (RuntimeException e) {
            log.error("Failed to link commit: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * 태스크에서 커밋 연결을 해제합니다.
     * DELETE /api/github/task/{taskId}/commit/{commitId}
     */
    @DeleteMapping("/task/{taskId}/commit/{commitId}")
    public ResponseEntity<?> unlinkCommit(
            @PathVariable int taskId,
            @PathVariable int commitId) {
        try {
            TaskCommit existing = taskCommitService.findById(commitId);
            if (existing == null) {
                return ResponseEntity.badRequest().body("커밋 연결을 찾을 수 없습니다.");
            }
            if (existing.getTaskId() != taskId) {
                return ResponseEntity.badRequest().body("해당 태스크의 커밋이 아닙니다.");
            }

            taskCommitService.unlinkCommit(commitId);

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("message", "커밋 연결이 해제되었습니다.");
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Failed to unlink commit: {}", e.getMessage());
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    /**
     * 태스크에 연결된 커밋 목록을 조회합니다.
     * GET /api/github/task/{taskId}/commits
     */
    @GetMapping("/task/{taskId}/commits")
    public ResponseEntity<?> getTaskCommits(@PathVariable int taskId) {
        try {
            List<TaskCommit> commits = taskCommitService.listByTask(taskId);
            return ResponseEntity.ok(commits);
        } catch (Exception e) {
            log.error("Failed to get task commits: {}", e.getMessage());
            return ResponseEntity.status(500).body(e.getMessage());
        }
    }

    /**
     * 팀 저장소의 기본 브랜치를 조회합니다.
     * GET /api/github/default-branch/{teamId}
     */
    @GetMapping("/default-branch/{teamId}")
    public ResponseEntity<?> getDefaultBranch(@PathVariable int teamId) {
        try {
            Team team = teamService.findById(teamId);
            if (team == null) {
                return ResponseEntity.badRequest().body("팀을 찾을 수 없습니다.");
            }

            String repoUrl = team.getGithubRepoUrl();
            if (repoUrl == null || repoUrl.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("GitHub 저장소가 설정되지 않았습니다.");
            }

            RepoInfo repoInfo = gitHubService.parseRepoUrl(repoUrl);
            if (repoInfo == null) {
                return ResponseEntity.badRequest().body("잘못된 GitHub 저장소 URL입니다.");
            }

            // 팀장의 GitHub 액세스 토큰 조회
            String accessToken = getLeaderAccessToken(team);

            String defaultBranch = gitHubService.getDefaultBranch(accessToken, repoInfo.owner, repoInfo.repo);

            Map<String, Object> result = new HashMap<>();
            result.put("defaultBranch", defaultBranch);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Failed to get default branch: {}", e.getMessage());
            return ResponseEntity.status(503).body(e.getMessage());
        }
    }

    /**
     * 브랜치 그래프 시각화용 커밋 데이터를 조회합니다.
     * GET /api/github/graph/{teamId}?branches=main,develop&depth=50
     */
    @GetMapping("/graph/{teamId}")
    public ResponseEntity<?> getCommitsGraph(
            @PathVariable int teamId,
            @RequestParam(defaultValue = "") String branches,
            @RequestParam(defaultValue = "50") int depth) {
        try {
            Team team = teamService.findById(teamId);
            if (team == null) {
                return ResponseEntity.badRequest().body("팀을 찾을 수 없습니다.");
            }

            String repoUrl = team.getGithubRepoUrl();
            if (repoUrl == null || repoUrl.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("GitHub 저장소가 설정되지 않았습니다.");
            }

            RepoInfo repoInfo = gitHubService.parseRepoUrl(repoUrl);
            if (repoInfo == null) {
                return ResponseEntity.badRequest().body("잘못된 GitHub 저장소 URL입니다.");
            }

            // 팀장의 GitHub 액세스 토큰 조회
            String accessToken = getLeaderAccessToken(team);

            // 브랜치 목록 파싱
            String[] branchList;
            if (branches == null || branches.trim().isEmpty()) {
                // 기본 브랜치만 조회
                String defaultBranch = gitHubService.getDefaultBranch(accessToken, repoInfo.owner, repoInfo.repo);
                branchList = new String[] { defaultBranch };
            } else {
                branchList = branches.split(",");
            }

            // 각 브랜치의 커밋 조회
            Map<String, List<GitHubGraphCommit>> commitsByBranch = new HashMap<>();
            for (String branch : branchList) {
                String branchName = branch.trim();
                if (!branchName.isEmpty()) {
                    List<GitHubGraphCommit> commits = gitHubService.listCommitsWithParents(
                        accessToken, repoInfo.owner, repoInfo.repo, branchName, depth
                    );
                    commitsByBranch.put(branchName, commits);
                }
            }

            Map<String, Object> result = new HashMap<>();
            result.put("commitsByBranch", commitsByBranch);
            result.put("branches", branchList);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Failed to get commits graph: {}", e.getMessage());
            return ResponseEntity.status(503).body(e.getMessage());
        }
    }

    /**
     * 두 브랜치를 비교하여 분기점(merge base)을 조회합니다.
     * GET /api/github/compare/{teamId}?base=main&head=feature
     */
    @GetMapping("/compare/{teamId}")
    public ResponseEntity<?> compareBranches(
            @PathVariable int teamId,
            @RequestParam String base,
            @RequestParam String head) {
        try {
            Team team = teamService.findById(teamId);
            if (team == null) {
                return ResponseEntity.badRequest().body("팀을 찾을 수 없습니다.");
            }

            String repoUrl = team.getGithubRepoUrl();
            if (repoUrl == null || repoUrl.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("GitHub 저장소가 설정되지 않았습니다.");
            }

            RepoInfo repoInfo = gitHubService.parseRepoUrl(repoUrl);
            if (repoInfo == null) {
                return ResponseEntity.badRequest().body("잘못된 GitHub 저장소 URL입니다.");
            }

            if (base == null || base.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("base 브랜치가 필요합니다.");
            }
            if (head == null || head.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("head 브랜치가 필요합니다.");
            }

            // 팀장의 GitHub 액세스 토큰 조회
            String accessToken = getLeaderAccessToken(team);

            GitHubBranchComparison comparison = gitHubService.compareBranches(
                accessToken, repoInfo.owner, repoInfo.repo, base.trim(), head.trim()
            );
            return ResponseEntity.ok(comparison);

        } catch (Exception e) {
            log.error("Failed to compare branches: {}", e.getMessage());
            return ResponseEntity.status(503).body(e.getMessage());
        }
    }

    // ==================== 브랜치 작업 API ====================

    /**
     * 새 브랜치를 생성합니다.
     * POST /api/github/branch/{teamId}
     * Body: { "branchName": "feature/xxx", "fromSha": "abc123" }
     */
    @PostMapping("/branch/{teamId}")
    public ResponseEntity<?> createBranch(
            @PathVariable int teamId,
            @RequestBody Map<String, String> request) {
        try {
            Team team = teamService.findById(teamId);
            if (team == null) {
                return ResponseEntity.badRequest().body("팀을 찾을 수 없습니다.");
            }

            String repoUrl = team.getGithubRepoUrl();
            if (repoUrl == null || repoUrl.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("GitHub 저장소가 설정되지 않았습니다.");
            }

            RepoInfo repoInfo = gitHubService.parseRepoUrl(repoUrl);
            if (repoInfo == null) {
                return ResponseEntity.badRequest().body("잘못된 GitHub 저장소 URL입니다.");
            }

            String branchName = request.get("branchName");
            String fromSha = request.get("fromSha");

            if (branchName == null || branchName.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("브랜치 이름이 필요합니다.");
            }
            if (fromSha == null || fromSha.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("분기할 커밋 SHA가 필요합니다.");
            }

            String accessToken = getLeaderAccessToken(team);
            if (accessToken == null) {
                return ResponseEntity.badRequest().body("GitHub 액세스 토큰이 없습니다. 팀장이 GitHub에 로그인해야 합니다.");
            }

            GitHubBranch newBranch = gitHubService.createBranch(
                accessToken, repoInfo.owner, repoInfo.repo, branchName.trim(), fromSha.trim()
            );

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("branch", newBranch);
            result.put("message", "브랜치가 생성되었습니다: " + newBranch.getName());
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Failed to create branch: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * 브랜치를 머지합니다.
     * POST /api/github/merge/{teamId}
     * Body: { "base": "main", "head": "feature/xxx", "commitMessage": "..." }
     */
    @PostMapping("/merge/{teamId}")
    public ResponseEntity<?> mergeBranches(
            @PathVariable int teamId,
            @RequestBody Map<String, String> request) {
        try {
            Team team = teamService.findById(teamId);
            if (team == null) {
                return ResponseEntity.badRequest().body("팀을 찾을 수 없습니다.");
            }

            String repoUrl = team.getGithubRepoUrl();
            if (repoUrl == null || repoUrl.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("GitHub 저장소가 설정되지 않았습니다.");
            }

            RepoInfo repoInfo = gitHubService.parseRepoUrl(repoUrl);
            if (repoInfo == null) {
                return ResponseEntity.badRequest().body("잘못된 GitHub 저장소 URL입니다.");
            }

            String base = request.get("base");
            String head = request.get("head");
            String commitMessage = request.get("commitMessage");

            if (base == null || base.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("머지 대상 브랜치(base)가 필요합니다.");
            }
            if (head == null || head.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("머지할 브랜치(head)가 필요합니다.");
            }

            String accessToken = getLeaderAccessToken(team);
            if (accessToken == null) {
                return ResponseEntity.badRequest().body("GitHub 액세스 토큰이 없습니다. 팀장이 GitHub에 로그인해야 합니다.");
            }

            GitHubMergeResult mergeResult = gitHubService.mergeBranches(
                accessToken, repoInfo.owner, repoInfo.repo, base.trim(), head.trim(), commitMessage
            );

            Map<String, Object> result = new HashMap<>();
            result.put("success", mergeResult.isMerged());
            result.put("sha", mergeResult.getSha());
            result.put("message", mergeResult.getMessage());
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Failed to merge branches: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * 브랜치를 삭제합니다.
     * DELETE /api/github/branch/{teamId}/{branchName}
     */
    @DeleteMapping("/branch/{teamId}/{branchName}")
    public ResponseEntity<?> deleteBranch(
            @PathVariable int teamId,
            @PathVariable String branchName) {
        try {
            Team team = teamService.findById(teamId);
            if (team == null) {
                return ResponseEntity.badRequest().body("팀을 찾을 수 없습니다.");
            }

            String repoUrl = team.getGithubRepoUrl();
            if (repoUrl == null || repoUrl.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("GitHub 저장소가 설정되지 않았습니다.");
            }

            RepoInfo repoInfo = gitHubService.parseRepoUrl(repoUrl);
            if (repoInfo == null) {
                return ResponseEntity.badRequest().body("잘못된 GitHub 저장소 URL입니다.");
            }

            if (branchName == null || branchName.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("브랜치 이름이 필요합니다.");
            }

            String accessToken = getLeaderAccessToken(team);
            if (accessToken == null) {
                return ResponseEntity.badRequest().body("GitHub 액세스 토큰이 없습니다. 팀장이 GitHub에 로그인해야 합니다.");
            }

            // 기본 브랜치 삭제 방지
            String defaultBranch = gitHubService.getDefaultBranch(accessToken, repoInfo.owner, repoInfo.repo);
            if (branchName.equals(defaultBranch)) {
                return ResponseEntity.badRequest().body("기본 브랜치는 삭제할 수 없습니다.");
            }

            gitHubService.deleteBranch(accessToken, repoInfo.owner, repoInfo.repo, branchName.trim());

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("message", "브랜치가 삭제되었습니다: " + branchName);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Failed to delete branch: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * 커밋을 되돌립니다 (Revert).
     * POST /api/github/revert/{teamId}
     * Body: { "branch": "main", "commitSha": "abc123..." }
     */
    @PostMapping("/revert/{teamId}")
    public ResponseEntity<?> revertCommit(
            @PathVariable int teamId,
            @RequestBody Map<String, String> request) {
        try {
            Team team = teamService.findById(teamId);
            if (team == null) {
                return ResponseEntity.badRequest().body("팀을 찾을 수 없습니다.");
            }

            String repoUrl = team.getGithubRepoUrl();
            if (repoUrl == null || repoUrl.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("GitHub 저장소가 설정되지 않았습니다.");
            }

            RepoInfo repoInfo = gitHubService.parseRepoUrl(repoUrl);
            if (repoInfo == null) {
                return ResponseEntity.badRequest().body("잘못된 GitHub 저장소 URL입니다.");
            }

            String branch = request.get("branch");
            String commitSha = request.get("commitSha");

            if (branch == null || branch.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("브랜치 이름이 필요합니다.");
            }
            if (commitSha == null || commitSha.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("되돌릴 커밋 SHA가 필요합니다.");
            }

            String accessToken = getLeaderAccessToken(team);
            if (accessToken == null) {
                return ResponseEntity.badRequest().body("GitHub 액세스 토큰이 없습니다. 팀장이 GitHub에 로그인해야 합니다.");
            }

            GitHubRevertResult revertResult = gitHubService.revertCommit(
                accessToken, repoInfo.owner, repoInfo.repo, branch.trim(), commitSha.trim()
            );

            Map<String, Object> result = new HashMap<>();
            result.put("success", revertResult.isSuccess());
            result.put("sha", revertResult.getSha());
            result.put("message", revertResult.getMessage());
            result.put("revertedCommitSha", revertResult.getRevertedCommitSha());
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Failed to revert commit: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    // ==================== Pull Request API ====================

    /**
     * Pull Request를 생성합니다 (Task 연결 없이).
     * POST /api/github/pr/{teamId}
     * Body: { "head": "feature/xxx", "base": "main", "title": "PR Title", "body": "..." }
     */
    @PostMapping("/pr/{teamId}")
    public ResponseEntity<?> createPullRequest(
            @PathVariable int teamId,
            @RequestBody Map<String, String> request) {
        try {
            Team team = teamService.findById(teamId);
            if (team == null) {
                return ResponseEntity.badRequest().body("팀을 찾을 수 없습니다.");
            }

            String repoUrl = team.getGithubRepoUrl();
            if (repoUrl == null || repoUrl.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("GitHub 저장소가 설정되지 않았습니다.");
            }

            RepoInfo repoInfo = gitHubService.parseRepoUrl(repoUrl);
            if (repoInfo == null) {
                return ResponseEntity.badRequest().body("잘못된 GitHub 저장소 URL입니다.");
            }

            String head = request.get("head");
            String base = request.get("base");
            String title = request.get("title");
            String body = request.get("body");

            if (head == null || head.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("소스 브랜치(head)가 필요합니다.");
            }
            if (title == null || title.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("PR 제목이 필요합니다.");
            }

            String accessToken = getLeaderAccessToken(team);
            if (accessToken == null) {
                return ResponseEntity.badRequest().body("GitHub 액세스 토큰이 없습니다. 팀장이 GitHub에 로그인해야 합니다.");
            }

            // 기본 브랜치 설정
            if (base == null || base.trim().isEmpty()) {
                base = gitHubService.getDefaultBranch(accessToken, repoInfo.owner, repoInfo.repo);
            }

            // PR 생성
            GitHubPullRequest pr = gitHubService.createPullRequest(
                accessToken, repoInfo.owner, repoInfo.repo,
                title.trim(), body != null ? body : "", head.trim(), base.trim()
            );

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("pr", pr);
            result.put("number", pr.getNumber());
            result.put("htmlUrl", pr.getHtmlUrl());
            result.put("message", "PR #" + pr.getNumber() + "이(가) 생성되었습니다.");
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Failed to create PR: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Task에서 작업용 브랜치를 생성합니다.
     * POST /api/github/task/{taskId}/branch
     */
    @PostMapping("/task/{taskId}/branch")
    public ResponseEntity<?> createTaskBranch(
            @PathVariable int taskId,
            @RequestParam int teamId,
            @RequestBody Map<String, String> body) {
        try {
            Team team = teamService.findById(teamId);
            if (team == null) {
                return ResponseEntity.badRequest().body("팀을 찾을 수 없습니다.");
            }

            String repoUrl = team.getGithubRepoUrl();
            if (repoUrl == null || repoUrl.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("GitHub 저장소가 설정되지 않았습니다.");
            }

            RepoInfo repoInfo = gitHubService.parseRepoUrl(repoUrl);
            if (repoInfo == null) {
                return ResponseEntity.badRequest().body("잘못된 GitHub 저장소 URL입니다.");
            }

            String accessToken = getLeaderAccessToken(team);
            if (accessToken == null) {
                return ResponseEntity.badRequest().body("GitHub 액세스 토큰이 없습니다. 팀장이 GitHub에 로그인해야 합니다.");
            }

            // 연결된 Issue 번호 조회
            TaskGitHubIssue issueMapping = taskGitHubIssueDao.findByTaskId(taskId);
            Integer issueNumber = issueMapping != null ? issueMapping.getIssueNumber() : null;

            // 브랜치 이름 생성 (사용자 지정 또는 자동 생성)
            String branchName = body.get("branchName");
            if (branchName == null || branchName.trim().isEmpty()) {
                // 자동 생성: feature/issue-{issueNumber} 또는 feature/task-{taskId}
                if (issueNumber != null) {
                    branchName = "feature/issue-" + issueNumber;
                } else {
                    branchName = "feature/task-" + taskId;
                }
            }

            // 기본 브랜치에서 분기
            String defaultBranch = gitHubService.getDefaultBranch(accessToken, repoInfo.owner, repoInfo.repo);
            String baseSha = body.get("baseSha");
            if (baseSha == null || baseSha.isEmpty()) {
                // 기본 브랜치의 최신 커밋 SHA 조회
                List<GitHubCommit> commits = gitHubService.listCommits(repoInfo.owner, repoInfo.repo, defaultBranch, 1);
                if (commits.isEmpty()) {
                    return ResponseEntity.badRequest().body("기본 브랜치의 커밋을 찾을 수 없습니다.");
                }
                baseSha = commits.get(0).getSha();
            }

            gitHubService.createBranch(accessToken, repoInfo.owner, repoInfo.repo, branchName.trim(), baseSha);

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("branchName", branchName);
            result.put("issueNumber", issueNumber);
            result.put("message", "브랜치가 생성되었습니다: " + branchName);
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Failed to create task branch: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Task에서 Pull Request를 생성합니다.
     * POST /api/github/task/{taskId}/pr
     */
    @PostMapping("/task/{taskId}/pr")
    public ResponseEntity<?> createTaskPR(
            @PathVariable int taskId,
            @RequestParam int teamId,
            @RequestBody Map<String, String> body) {
        try {
            Team team = teamService.findById(teamId);
            if (team == null) {
                return ResponseEntity.badRequest().body("팀을 찾을 수 없습니다.");
            }

            String repoUrl = team.getGithubRepoUrl();
            if (repoUrl == null || repoUrl.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("GitHub 저장소가 설정되지 않았습니다.");
            }

            RepoInfo repoInfo = gitHubService.parseRepoUrl(repoUrl);
            if (repoInfo == null) {
                return ResponseEntity.badRequest().body("잘못된 GitHub 저장소 URL입니다.");
            }

            String accessToken = getLeaderAccessToken(team);
            if (accessToken == null) {
                return ResponseEntity.badRequest().body("GitHub 액세스 토큰이 없습니다. 팀장이 GitHub에 로그인해야 합니다.");
            }

            String headBranch = body.get("head");
            String baseBranch = body.get("base");
            String title = body.get("title");
            String prBody = body.get("body");

            if (headBranch == null || headBranch.isEmpty()) {
                return ResponseEntity.badRequest().body("소스 브랜치가 필요합니다.");
            }

            if (baseBranch == null || baseBranch.isEmpty()) {
                baseBranch = gitHubService.getDefaultBranch(accessToken, repoInfo.owner, repoInfo.repo);
            }

            // 연결된 Issue 번호 조회
            TaskGitHubIssue issueMapping = taskGitHubIssueDao.findByTaskId(taskId);
            Integer issueNumber = issueMapping != null ? issueMapping.getIssueNumber() : null;

            // PR 본문에 Issue 참조 추가
            if (prBody == null) prBody = "";
            if (issueNumber != null && !prBody.contains("Closes #") && !prBody.contains("Fixes #")) {
                prBody += "\n\nCloses #" + issueNumber;
            }
            prBody += "\n\n---\n*Created from Synodos Task #" + taskId + "*";

            // PR 생성
            GitHubPullRequest pr = gitHubService.createPullRequest(
                accessToken, repoInfo.owner, repoInfo.repo,
                title, prBody, headBranch, baseBranch
            );

            // DB에 PR 매핑 저장
            TaskGitHubPR prMapping = new TaskGitHubPR();
            prMapping.setTaskId(taskId);
            prMapping.setTeamId(teamId);
            prMapping.setPrNumber(pr.getNumber());
            prMapping.setPrId(pr.getId());
            prMapping.setPrTitle(pr.getTitle());
            prMapping.setPrUrl(pr.getHtmlUrl());
            prMapping.setPrState(pr.getState());
            prMapping.setMerged(pr.isMerged());
            prMapping.setHeadBranch(headBranch);
            prMapping.setBaseBranch(baseBranch);
            taskGitHubPRDao.insert(prMapping);

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("pr", pr);
            result.put("issueNumber", issueNumber);
            result.put("message", "PR이 생성되었습니다: #" + pr.getNumber());
            return ResponseEntity.ok(result);

        } catch (Exception e) {
            log.error("Failed to create task PR: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * Task에 연결된 PR 목록을 조회합니다.
     * - Synodos에서 직접 생성한 PR (task_github_pr 테이블)
     * - Task에 연결된 Issue를 참조하는 PR (GitHub API에서 검색)
     * GET /api/github/task/{taskId}/prs
     */
    @GetMapping("/task/{taskId}/prs")
    public ResponseEntity<?> getTaskPRs(@PathVariable int taskId, @RequestParam int teamId) {
        try {
            Team team = teamService.findById(teamId);
            if (team == null) {
                return ResponseEntity.badRequest().body("팀을 찾을 수 없습니다.");
            }

            String repoUrl = team.getGithubRepoUrl();
            RepoInfo repoInfo = repoUrl != null ? gitHubService.parseRepoUrl(repoUrl) : null;
            String accessToken = getLeaderAccessToken(team);

            // 1. DB에서 저장된 PR 목록 조회
            List<TaskGitHubPR> prs = taskGitHubPRDao.listByTask(taskId);
            java.util.Set<Integer> existingPrNumbers = new java.util.HashSet<>();
            for (TaskGitHubPR pr : prs) {
                existingPrNumbers.add(pr.getPrNumber());
            }

            // 2. GitHub에서 최신 상태 업데이트
            if (repoInfo != null && accessToken != null && !prs.isEmpty()) {
                for (TaskGitHubPR pr : prs) {
                    try {
                        GitHubPullRequest ghPR = gitHubService.getPullRequest(
                            accessToken, repoInfo.owner, repoInfo.repo, pr.getPrNumber()
                        );
                        if (ghPR != null) {
                            boolean needsUpdate = !ghPR.getState().equals(pr.getPrState()) ||
                                                  ghPR.isMerged() != pr.isMerged();
                            if (needsUpdate) {
                                taskGitHubPRDao.updateState(
                                    teamId, pr.getPrNumber(),
                                    ghPR.getState(), ghPR.isMerged(), ghPR.getMergedAt()
                                );
                                pr.setPrState(ghPR.getState());
                                pr.setMerged(ghPR.isMerged());
                                pr.setMergedAt(ghPR.getMergedAt());
                            }
                            // 추가 정보 업데이트
                            pr.setPrTitle(ghPR.getTitle());
                            pr.setPrUrl(ghPR.getHtmlUrl());
                        }
                    } catch (Exception e) {
                        log.warn("Failed to update PR #{} status: {}", pr.getPrNumber(), e.getMessage());
                    }
                }
            }

            // 3. Task에 연결된 Issue가 있으면 해당 Issue를 참조하는 PR도 검색
            TaskGitHubIssue linkedIssue = taskGitHubIssueDao.findByTaskId(taskId);
            if (linkedIssue != null && repoInfo != null && accessToken != null) {
                try {
                    List<GitHubPullRequest> issuePRs = gitHubService.listPullRequestsForIssue(
                        accessToken, repoInfo.owner, repoInfo.repo, linkedIssue.getIssueNumber()
                    );

                    // 중복되지 않는 PR만 추가
                    for (GitHubPullRequest ghPR : issuePRs) {
                        if (!existingPrNumbers.contains(ghPR.getNumber())) {
                            TaskGitHubPR newPR = new TaskGitHubPR();
                            newPR.setTaskId(taskId);
                            newPR.setTeamId(teamId);
                            newPR.setPrNumber(ghPR.getNumber());
                            newPR.setPrId(ghPR.getId());
                            newPR.setPrTitle(ghPR.getTitle());
                            newPR.setPrUrl(ghPR.getHtmlUrl());
                            newPR.setPrState(ghPR.getState());
                            newPR.setMerged(ghPR.isMerged());
                            newPR.setHeadBranch(ghPR.getHeadRef());
                            newPR.setBaseBranch(ghPR.getBaseRef());
                            newPR.setMergedAt(ghPR.getMergedAt());
                            newPR.setFromGitHub(true); // GitHub에서 발견된 PR 표시

                            prs.add(newPR);
                            existingPrNumbers.add(ghPR.getNumber());

                            // DB에도 저장 (나중에 빠른 조회를 위해)
                            try {
                                taskGitHubPRDao.insert(newPR);
                            } catch (Exception insertEx) {
                                log.debug("PR already exists or insert failed: {}", insertEx.getMessage());
                            }
                        }
                    }
                } catch (Exception e) {
                    log.warn("Failed to search PRs for issue #{}: {}", linkedIssue.getIssueNumber(), e.getMessage());
                }
            }

            return ResponseEntity.ok(prs);
        } catch (Exception e) {
            log.error("Failed to get task PRs: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * 팀의 모든 PR 목록을 조회합니다.
     * GET /api/github/prs/{teamId}
     */
    @GetMapping("/prs/{teamId}")
    public ResponseEntity<?> getTeamPRs(
            @PathVariable int teamId,
            @RequestParam(defaultValue = "all") String state) {
        try {
            Team team = teamService.findById(teamId);
            if (team == null) {
                return ResponseEntity.badRequest().body("팀을 찾을 수 없습니다.");
            }

            String repoUrl = team.getGithubRepoUrl();
            if (repoUrl == null || repoUrl.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("GitHub 저장소가 설정되지 않았습니다.");
            }

            RepoInfo repoInfo = gitHubService.parseRepoUrl(repoUrl);
            if (repoInfo == null) {
                return ResponseEntity.badRequest().body("잘못된 GitHub 저장소 URL입니다.");
            }

            String accessToken = getLeaderAccessToken(team);
            if (accessToken == null) {
                return ResponseEntity.badRequest().body("GitHub 액세스 토큰이 없습니다.");
            }

            List<GitHubPullRequest> prs = gitHubService.listPullRequests(
                accessToken, repoInfo.owner, repoInfo.repo, state, 1
            );

            return ResponseEntity.ok(prs);
        } catch (Exception e) {
            log.error("Failed to get team PRs: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * PR을 머지합니다.
     * PUT /api/github/pr/{teamId}/{prNumber}/merge
     */
    @PutMapping("/pr/{teamId}/{prNumber}/merge")
    public ResponseEntity<?> mergePR(
            @PathVariable int teamId,
            @PathVariable int prNumber,
            @RequestBody(required = false) Map<String, String> body) {
        try {
            Team team = teamService.findById(teamId);
            if (team == null) {
                return ResponseEntity.badRequest().body("팀을 찾을 수 없습니다.");
            }

            String repoUrl = team.getGithubRepoUrl();
            if (repoUrl == null || repoUrl.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("GitHub 저장소가 설정되지 않았습니다.");
            }

            RepoInfo repoInfo = gitHubService.parseRepoUrl(repoUrl);
            if (repoInfo == null) {
                return ResponseEntity.badRequest().body("잘못된 GitHub 저장소 URL입니다.");
            }

            String accessToken = getLeaderAccessToken(team);
            if (accessToken == null) {
                return ResponseEntity.badRequest().body("GitHub 액세스 토큰이 없습니다.");
            }

            String commitTitle = body != null ? body.get("commitTitle") : null;
            String mergeMethod = body != null ? body.get("mergeMethod") : "merge";

            GitHubMergeResult result = gitHubService.mergePullRequest(
                accessToken, repoInfo.owner, repoInfo.repo, prNumber, commitTitle, mergeMethod
            );

            // DB 상태 업데이트
            if (result.isMerged()) {
                taskGitHubPRDao.updateState(teamId, prNumber, "closed", true, null);
            }

            Map<String, Object> response = new HashMap<>();
            response.put("success", result.isMerged());
            response.put("sha", result.getSha());
            response.put("message", result.getMessage());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to merge PR: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * 팀장의 GitHub 액세스 토큰을 조회합니다.
     */
    private String getLeaderAccessToken(Team team) {
        if (team == null || team.getLeaderNo() <= 0) {
            return null;
        }
        Member leader = memberDao.findByNo(team.getLeaderNo());
        if (leader != null && leader.getGithubAccessToken() != null && !leader.getGithubAccessToken().isEmpty()) {
            return leader.getGithubAccessToken();
        }
        return null;
    }
}
