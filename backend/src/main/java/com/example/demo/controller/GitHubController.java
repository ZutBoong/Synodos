package com.example.demo.controller;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.demo.dao.MemberDao;
import com.example.demo.dao.TaskGitHubIssueDao;
import com.example.demo.dao.TaskGitHubPRDao;
import com.example.demo.dao.TaskVerifierDao;
import com.example.demo.model.Member;
import com.example.demo.model.TaskVerifier;
import com.example.demo.model.Team;
import com.example.demo.model.TaskCommit;
import com.example.demo.model.TaskGitHubIssue;
import com.example.demo.model.TaskGitHubPR;
import com.example.demo.service.GeminiService;
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
    private GeminiService geminiService;

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

    @Autowired
    private TaskVerifierDao taskVerifierDao;

    /**
     * 팀 저장소의 브랜치 목록을 조회합니다.
     * GET /api/github/branches/{teamId}?memberNo=123
     */
    @GetMapping("/branches/{teamId}")
    public ResponseEntity<?> getBranches(
            @PathVariable int teamId,
            @RequestParam(required = false, defaultValue = "0") int memberNo) {
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

            // 회원 토큰 우선, 없으면 팀장 토큰 사용
            String accessToken = memberNo > 0 ? getMemberAccessToken(memberNo) : null;
            if (accessToken == null) {
                accessToken = getLeaderAccessToken(team);
            }

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
     * GET /api/github/default-branch/{teamId}?memberNo=123
     */
    @GetMapping("/default-branch/{teamId}")
    public ResponseEntity<?> getDefaultBranch(
            @PathVariable int teamId,
            @RequestParam(required = false, defaultValue = "0") int memberNo) {
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

            // 회원 토큰 우선, 없으면 팀장 토큰 사용
            String accessToken = memberNo > 0 ? getMemberAccessToken(memberNo) : null;
            if (accessToken == null) {
                accessToken = getLeaderAccessToken(team);
            }

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
     * GET /api/github/graph/{teamId}?branches=main,develop&depth=50&memberNo=123
     */
    @GetMapping("/graph/{teamId}")
    public ResponseEntity<?> getCommitsGraph(
            @PathVariable int teamId,
            @RequestParam(defaultValue = "") String branches,
            @RequestParam(defaultValue = "50") int depth,
            @RequestParam(required = false, defaultValue = "0") int memberNo) {
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

            // 회원 토큰 우선, 없으면 팀장 토큰 사용
            String accessToken = memberNo > 0 ? getMemberAccessToken(memberNo) : null;
            if (accessToken == null) {
                accessToken = getLeaderAccessToken(team);
            }

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
     * GET /api/github/compare/{teamId}?base=main&head=feature&memberNo=123
     */
    @GetMapping("/compare/{teamId}")
    public ResponseEntity<?> compareBranches(
            @PathVariable int teamId,
            @RequestParam String base,
            @RequestParam String head,
            @RequestParam(required = false, defaultValue = "0") int memberNo) {
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

            // 회원 토큰 우선, 없으면 팀장 토큰 사용
            String accessToken = memberNo > 0 ? getMemberAccessToken(memberNo) : null;
            if (accessToken == null) {
                accessToken = getLeaderAccessToken(team);
            }

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
     * Body: { "branchName": "feature/xxx", "fromSha": "abc123", "memberNo": 123 }
     */
    @PostMapping("/branch/{teamId}")
    public ResponseEntity<?> createBranch(
            @PathVariable int teamId,
            @RequestBody Map<String, Object> request) {
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

            String branchName = (String) request.get("branchName");
            String fromSha = (String) request.get("fromSha");
            Integer memberNo = request.get("memberNo") != null ? ((Number) request.get("memberNo")).intValue() : null;

            if (branchName == null || branchName.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("브랜치 이름이 필요합니다.");
            }
            if (fromSha == null || fromSha.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("분기할 커밋 SHA가 필요합니다.");
            }

            // 회원의 GitHub 연결 상태 확인 (필수)
            GitHubConnectionCheck check = memberNo != null
                ? checkMemberGitHubConnection(memberNo)
                : GitHubConnectionCheck.failure("GitHub 작업을 수행하려면 로그인이 필요합니다.");

            if (!check.connected) {
                return ResponseEntity.badRequest().body(check.errorMessage);
            }

            GitHubBranch newBranch = gitHubService.createBranch(
                check.accessToken, repoInfo.owner, repoInfo.repo, branchName.trim(), fromSha.trim()
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
     * Body: { "base": "main", "head": "feature/xxx", "commitMessage": "...", "memberNo": 123 }
     */
    @PostMapping("/merge/{teamId}")
    public ResponseEntity<?> mergeBranches(
            @PathVariable int teamId,
            @RequestBody Map<String, Object> request) {
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

            String base = (String) request.get("base");
            String head = (String) request.get("head");
            String commitMessage = (String) request.get("commitMessage");
            Integer memberNo = request.get("memberNo") != null ? ((Number) request.get("memberNo")).intValue() : null;

            if (base == null || base.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("머지 대상 브랜치(base)가 필요합니다.");
            }
            if (head == null || head.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("머지할 브랜치(head)가 필요합니다.");
            }

            // 회원의 GitHub 연결 상태 확인 (필수)
            GitHubConnectionCheck check = memberNo != null
                ? checkMemberGitHubConnection(memberNo)
                : GitHubConnectionCheck.failure("GitHub 작업을 수행하려면 로그인이 필요합니다.");

            if (!check.connected) {
                return ResponseEntity.badRequest().body(check.errorMessage);
            }

            GitHubMergeResult mergeResult = gitHubService.mergeBranches(
                check.accessToken, repoInfo.owner, repoInfo.repo, base.trim(), head.trim(), commitMessage
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
     * DELETE /api/github/branch/{teamId}/{branchName}?memberNo=123
     */
    @DeleteMapping("/branch/{teamId}/{branchName}")
    public ResponseEntity<?> deleteBranch(
            @PathVariable int teamId,
            @PathVariable String branchName,
            @RequestParam int memberNo) {
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

            // 회원의 GitHub 연결 상태 확인 (필수)
            GitHubConnectionCheck check = checkMemberGitHubConnection(memberNo);
            if (!check.connected) {
                return ResponseEntity.badRequest().body(check.errorMessage);
            }

            // 기본 브랜치 삭제 방지
            String defaultBranch = gitHubService.getDefaultBranch(check.accessToken, repoInfo.owner, repoInfo.repo);
            if (branchName.equals(defaultBranch)) {
                return ResponseEntity.badRequest().body("기본 브랜치는 삭제할 수 없습니다.");
            }

            gitHubService.deleteBranch(check.accessToken, repoInfo.owner, repoInfo.repo, branchName.trim());

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
     * Body: { "branch": "main", "commitSha": "abc123...", "memberNo": 123 }
     */
    @PostMapping("/revert/{teamId}")
    public ResponseEntity<?> revertCommit(
            @PathVariable int teamId,
            @RequestBody Map<String, Object> request) {
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

            String branch = (String) request.get("branch");
            String commitSha = (String) request.get("commitSha");
            Integer memberNo = request.get("memberNo") != null ? ((Number) request.get("memberNo")).intValue() : null;

            if (branch == null || branch.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("브랜치 이름이 필요합니다.");
            }
            if (commitSha == null || commitSha.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("되돌릴 커밋 SHA가 필요합니다.");
            }

            // 회원의 GitHub 연결 상태 확인 (필수)
            GitHubConnectionCheck check = memberNo != null
                ? checkMemberGitHubConnection(memberNo)
                : GitHubConnectionCheck.failure("GitHub 작업을 수행하려면 로그인이 필요합니다.");

            if (!check.connected) {
                return ResponseEntity.badRequest().body(check.errorMessage);
            }

            GitHubRevertResult revertResult = gitHubService.revertCommit(
                check.accessToken, repoInfo.owner, repoInfo.repo, branch.trim(), commitSha.trim()
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
     * Body: { "head": "feature/xxx", "base": "main", "title": "PR Title", "body": "...", "memberNo": 123 }
     */
    @PostMapping("/pr/{teamId}")
    public ResponseEntity<?> createPullRequest(
            @PathVariable int teamId,
            @RequestBody Map<String, Object> request) {
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

            String head = (String) request.get("head");
            String base = (String) request.get("base");
            String title = (String) request.get("title");
            String body = (String) request.get("body");
            Integer memberNo = request.get("memberNo") != null ? ((Number) request.get("memberNo")).intValue() : null;

            if (head == null || head.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("소스 브랜치(head)가 필요합니다.");
            }
            if (title == null || title.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("PR 제목이 필요합니다.");
            }

            // 회원의 GitHub 연결 상태 확인 (필수)
            GitHubConnectionCheck check = memberNo != null
                ? checkMemberGitHubConnection(memberNo)
                : GitHubConnectionCheck.failure("GitHub 작업을 수행하려면 로그인이 필요합니다.");

            if (!check.connected) {
                return ResponseEntity.badRequest().body(check.errorMessage);
            }

            // 기본 브랜치 설정
            if (base == null || base.trim().isEmpty()) {
                base = gitHubService.getDefaultBranch(check.accessToken, repoInfo.owner, repoInfo.repo);
            }

            // PR 생성
            GitHubPullRequest pr = gitHubService.createPullRequest(
                check.accessToken, repoInfo.owner, repoInfo.repo,
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
     * POST /api/github/task/{taskId}/branch?teamId=1&memberNo=123
     */
    @PostMapping("/task/{taskId}/branch")
    public ResponseEntity<?> createTaskBranch(
            @PathVariable int taskId,
            @RequestParam int teamId,
            @RequestParam int memberNo,
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

            // 회원의 GitHub 연결 상태 확인 (필수)
            GitHubConnectionCheck check = checkMemberGitHubConnection(memberNo);
            if (!check.connected) {
                return ResponseEntity.badRequest().body(check.errorMessage);
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
            String defaultBranch = gitHubService.getDefaultBranch(check.accessToken, repoInfo.owner, repoInfo.repo);
            String baseSha = body.get("baseSha");
            if (baseSha == null || baseSha.isEmpty()) {
                // 기본 브랜치의 최신 커밋 SHA 조회
                List<GitHubCommit> commits = gitHubService.listCommits(repoInfo.owner, repoInfo.repo, defaultBranch, 1);
                if (commits.isEmpty()) {
                    return ResponseEntity.badRequest().body("기본 브랜치의 커밋을 찾을 수 없습니다.");
                }
                baseSha = commits.get(0).getSha();
            }

            gitHubService.createBranch(check.accessToken, repoInfo.owner, repoInfo.repo, branchName.trim(), baseSha);

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
     * POST /api/github/task/{taskId}/pr?teamId=1&memberNo=123
     */
    @PostMapping("/task/{taskId}/pr")
    public ResponseEntity<?> createTaskPR(
            @PathVariable int taskId,
            @RequestParam int teamId,
            @RequestParam int memberNo,
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

            // 회원의 GitHub 연결 상태 확인 (필수)
            GitHubConnectionCheck check = checkMemberGitHubConnection(memberNo);
            if (!check.connected) {
                return ResponseEntity.badRequest().body(check.errorMessage);
            }

            String headBranch = body.get("head");
            String baseBranch = body.get("base");
            String title = body.get("title");
            String prBody = body.get("body");

            if (headBranch == null || headBranch.isEmpty()) {
                return ResponseEntity.badRequest().body("소스 브랜치가 필요합니다.");
            }

            if (baseBranch == null || baseBranch.isEmpty()) {
                baseBranch = gitHubService.getDefaultBranch(check.accessToken, repoInfo.owner, repoInfo.repo);
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
                check.accessToken, repoInfo.owner, repoInfo.repo,
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

            // Task Verifier를 PR Reviewer로 추가
            List<String> requestedReviewers = syncVerifiersToReviewers(
                taskId, pr.getNumber(), repoInfo.owner, repoInfo.repo, check.accessToken
            );

            Map<String, Object> result = new HashMap<>();
            result.put("success", true);
            result.put("pr", pr);
            result.put("issueNumber", issueNumber);
            result.put("requestedReviewers", requestedReviewers);
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
     * GET /api/github/task/{taskId}/prs?teamId=1&memberNo=123
     */
    @GetMapping("/task/{taskId}/prs")
    public ResponseEntity<?> getTaskPRs(
            @PathVariable int taskId,
            @RequestParam int teamId,
            @RequestParam(required = false, defaultValue = "0") int memberNo) {
        try {
            Team team = teamService.findById(teamId);
            if (team == null) {
                return ResponseEntity.badRequest().body("팀을 찾을 수 없습니다.");
            }

            String repoUrl = team.getGithubRepoUrl();
            RepoInfo repoInfo = repoUrl != null ? gitHubService.parseRepoUrl(repoUrl) : null;
            // 회원 토큰 우선, 없으면 팀장 토큰 사용
            String accessToken = memberNo > 0 ? getMemberAccessToken(memberNo) : null;
            if (accessToken == null) {
                accessToken = getLeaderAccessToken(team);
            }

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
            log.info("Task {} linked issue: {}, repoInfo: {}, hasToken: {}",
                taskId,
                linkedIssue != null ? "#" + linkedIssue.getIssueNumber() : "null",
                repoInfo != null ? repoInfo.owner + "/" + repoInfo.repo : "null",
                accessToken != null);
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
     * GET /api/github/prs/{teamId}?memberNo=123
     */
    @GetMapping("/prs/{teamId}")
    public ResponseEntity<?> getTeamPRs(
            @PathVariable int teamId,
            @RequestParam(defaultValue = "all") String state,
            @RequestParam(required = false, defaultValue = "0") int memberNo) {
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

            // 회원 토큰 우선, 없으면 팀장 토큰 사용
            String accessToken = memberNo > 0 ? getMemberAccessToken(memberNo) : null;
            if (accessToken == null) {
                accessToken = getLeaderAccessToken(team);
            }
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
     * PR 상세 정보 조회 (머지 가능 여부, 충돌 파일 포함)
     * GET /api/github/pr/{teamId}/{prNumber}/detail?memberNo=123
     */
    @GetMapping("/pr/{teamId}/{prNumber}/detail")
    public ResponseEntity<?> getPRDetail(
            @PathVariable int teamId,
            @PathVariable int prNumber,
            @RequestParam(required = false, defaultValue = "0") int memberNo) {
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

            // 회원 토큰 우선, 없으면 팀장 토큰 사용
            String accessToken = memberNo > 0 ? getMemberAccessToken(memberNo) : null;
            if (accessToken == null) {
                accessToken = getLeaderAccessToken(team);
            }
            if (accessToken == null) {
                return ResponseEntity.badRequest().body("GitHub 액세스 토큰이 없습니다.");
            }

            GitHubService.PRDetailInfo detail = gitHubService.getPullRequestDetail(
                accessToken, repoInfo.owner, repoInfo.repo, prNumber
            );

            return ResponseEntity.ok(detail);

        } catch (Exception e) {
            log.error("Failed to get PR detail: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * PR을 머지합니다.
     * PUT /api/github/pr/{teamId}/{prNumber}/merge
     * Body: { "commitTitle": "...", "mergeMethod": "merge", "memberNo": 123 }
     */
    @PutMapping("/pr/{teamId}/{prNumber}/merge")
    public ResponseEntity<?> mergePR(
            @PathVariable int teamId,
            @PathVariable int prNumber,
            @RequestBody(required = false) Map<String, Object> body) {
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

            String commitTitle = body != null ? (String) body.get("commitTitle") : null;
            String mergeMethod = body != null ? (String) body.get("mergeMethod") : "merge";
            Integer memberNo = body != null && body.get("memberNo") != null ? ((Number) body.get("memberNo")).intValue() : null;

            // 회원의 GitHub 연결 상태 확인 (필수)
            GitHubConnectionCheck check = memberNo != null
                ? checkMemberGitHubConnection(memberNo)
                : GitHubConnectionCheck.failure("GitHub 작업을 수행하려면 로그인이 필요합니다.");

            if (!check.connected) {
                return ResponseEntity.badRequest().body(check.errorMessage);
            }

            GitHubMergeResult result = gitHubService.mergePullRequest(
                check.accessToken, repoInfo.owner, repoInfo.repo, prNumber, commitTitle, mergeMethod
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

    // ==================== AI 충돌 해결 API ====================

    /**
     * 충돌 파일의 양쪽 버전을 조회합니다.
     * GET /api/github/pr/{teamId}/{prNumber}/conflict/{filename}?memberNo=123
     */
    @GetMapping("/pr/{teamId}/{prNumber}/conflict/{filename:.+}")
    public ResponseEntity<?> getConflictFileVersions(
            @PathVariable int teamId,
            @PathVariable int prNumber,
            @PathVariable String filename,
            @RequestParam(required = false, defaultValue = "0") int memberNo) {
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

            // 회원 토큰 우선, 없으면 팀장 토큰 사용
            String accessToken = memberNo > 0 ? getMemberAccessToken(memberNo) : null;
            if (accessToken == null) {
                accessToken = getLeaderAccessToken(team);
            }
            if (accessToken == null) {
                return ResponseEntity.badRequest().body("GitHub 액세스 토큰이 없습니다.");
            }

            // PR 정보 조회하여 head/base 브랜치 확인
            GitHubPullRequest pr = gitHubService.getPullRequest(
                accessToken, repoInfo.owner, repoInfo.repo, prNumber
            );
            if (pr == null) {
                return ResponseEntity.badRequest().body("PR을 찾을 수 없습니다.");
            }

            // 양쪽 버전 조회
            GitHubService.ConflictFileVersions versions = gitHubService.getConflictFileVersions(
                accessToken, repoInfo.owner, repoInfo.repo,
                filename, pr.getHeadRef(), pr.getBaseRef()
            );

            return ResponseEntity.ok(versions);

        } catch (Exception e) {
            log.error("Failed to get conflict file versions: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * AI를 사용하여 충돌을 해결합니다.
     * POST /api/github/pr/{teamId}/{prNumber}/ai-resolve
     * Body: { "filename": "path/to/file.java", "memberNo": 123 }
     */
    @PostMapping("/pr/{teamId}/{prNumber}/ai-resolve")
    public ResponseEntity<?> aiResolveConflict(
            @PathVariable int teamId,
            @PathVariable int prNumber,
            @RequestBody Map<String, Object> body) {
        try {
            String filename = (String) body.get("filename");
            Integer memberNo = body.get("memberNo") != null ? ((Number) body.get("memberNo")).intValue() : null;

            if (filename == null || filename.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("파일명이 필요합니다.");
            }

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

            // 회원 토큰 우선, 없으면 팀장 토큰 사용 (읽기 작업이므로 폴백 허용)
            String accessToken = memberNo != null && memberNo > 0 ? getMemberAccessToken(memberNo) : null;
            if (accessToken == null) {
                accessToken = getLeaderAccessToken(team);
            }
            if (accessToken == null) {
                return ResponseEntity.badRequest().body("GitHub 액세스 토큰이 없습니다.");
            }

            // PR 정보 조회
            GitHubPullRequest pr = gitHubService.getPullRequest(
                accessToken, repoInfo.owner, repoInfo.repo, prNumber
            );
            if (pr == null) {
                return ResponseEntity.badRequest().body("PR을 찾을 수 없습니다.");
            }

            // 양쪽 버전 조회
            GitHubService.ConflictFileVersions versions = gitHubService.getConflictFileVersions(
                accessToken, repoInfo.owner, repoInfo.repo,
                filename, pr.getHeadRef(), pr.getBaseRef()
            );

            if (versions.getHeadContent() == null && versions.getBaseContent() == null) {
                return ResponseEntity.badRequest().body("파일 내용을 조회할 수 없습니다.");
            }

            // AI로 충돌 해결
            GeminiService.ConflictResolutionResult result = geminiService.resolveConflict(
                filename, pr.getBaseRef(), pr.getHeadRef(),
                versions.getBaseContent(), versions.getHeadContent()
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", result.isSuccess());
            response.put("analysis", result.getAnalysis());
            response.put("options", result.getOptions());  // 여러 해결 옵션
            response.put("error", result.getError());
            response.put("filename", filename);
            response.put("headRef", pr.getHeadRef());
            response.put("baseRef", pr.getBaseRef());
            // 파일 SHA 정보도 포함 (커밋 시 필요)
            response.put("headSha", versions.getHeadSha());
            response.put("baseSha", versions.getBaseSha());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to AI resolve conflict: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * AI가 해결한 코드를 GitHub에 커밋합니다.
     * POST /api/github/pr/{teamId}/{prNumber}/apply-resolution
     * Body: { "filename": "...", "resolvedCode": "...", "headSha": "...", "memberNo": 123 }
     */
    @PostMapping("/pr/{teamId}/{prNumber}/apply-resolution")
    public ResponseEntity<?> applyResolution(
            @PathVariable int teamId,
            @PathVariable int prNumber,
            @RequestBody Map<String, Object> body) {
        try {
            String filename = (String) body.get("filename");
            String resolvedCode = (String) body.get("resolvedCode");
            String headSha = (String) body.get("headSha");
            Integer memberNo = body.get("memberNo") != null ? ((Number) body.get("memberNo")).intValue() : null;

            if (filename == null || filename.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("파일명이 필요합니다.");
            }
            if (resolvedCode == null) {
                return ResponseEntity.badRequest().body("해결된 코드가 필요합니다.");
            }
            if (headSha == null || headSha.trim().isEmpty()) {
                return ResponseEntity.badRequest().body("파일 SHA가 필요합니다.");
            }

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

            // 회원의 GitHub 연결 상태 확인 (필수 - 쓰기 작업)
            GitHubConnectionCheck check = memberNo != null
                ? checkMemberGitHubConnection(memberNo)
                : GitHubConnectionCheck.failure("GitHub 작업을 수행하려면 로그인이 필요합니다.");

            if (!check.connected) {
                return ResponseEntity.badRequest().body(check.errorMessage);
            }

            // PR 정보 조회
            GitHubPullRequest pr = gitHubService.getPullRequest(
                check.accessToken, repoInfo.owner, repoInfo.repo, prNumber
            );
            if (pr == null) {
                return ResponseEntity.badRequest().body("PR을 찾을 수 없습니다.");
            }

            // 머지 커밋 생성 (base 브랜치를 head 브랜치에 머지하면서 충돌 해결)
            GitHubService.FileUpdateResult updateResult = gitHubService.createMergeCommitWithResolvedFile(
                check.accessToken, repoInfo.owner, repoInfo.repo,
                pr.getHeadRef(), pr.getBaseRef(),
                filename, resolvedCode
            );

            Map<String, Object> response = new HashMap<>();
            response.put("success", updateResult.isSuccess());
            response.put("commitSha", updateResult.getCommitSha());
            response.put("message", updateResult.isSuccess()
                ? "충돌이 해결되었습니다: " + filename
                : "충돌 해결 실패: " + updateResult.getError());
            response.put("error", updateResult.getError());

            return ResponseEntity.ok(response);

        } catch (Exception e) {
            log.error("Failed to apply resolution: {}", e.getMessage());
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }

    /**
     * 팀장의 GitHub 액세스 토큰을 조회합니다.
     * @deprecated 개별 회원 토큰 사용으로 변경됨. getMemberAccessToken 사용 권장.
     */
    @Deprecated
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

    /**
     * 특정 회원의 GitHub 액세스 토큰을 조회합니다.
     */
    private String getMemberAccessToken(int memberNo) {
        if (memberNo <= 0) {
            return null;
        }
        Member member = memberDao.findByNo(memberNo);
        if (member != null && member.getGithubAccessToken() != null && !member.getGithubAccessToken().isEmpty()) {
            return member.getGithubAccessToken();
        }
        return null;
    }

    /**
     * 회원의 GitHub 연결 상태 확인 결과를 담는 클래스
     */
    public static class GitHubConnectionCheck {
        public final boolean connected;
        public final String accessToken;
        public final String errorMessage;

        private GitHubConnectionCheck(boolean connected, String accessToken, String errorMessage) {
            this.connected = connected;
            this.accessToken = accessToken;
            this.errorMessage = errorMessage;
        }

        public static GitHubConnectionCheck success(String accessToken) {
            return new GitHubConnectionCheck(true, accessToken, null);
        }

        public static GitHubConnectionCheck failure(String errorMessage) {
            return new GitHubConnectionCheck(false, null, errorMessage);
        }
    }

    /**
     * 회원의 GitHub 연결 상태를 확인하고 토큰을 반환합니다.
     */
    private GitHubConnectionCheck checkMemberGitHubConnection(int memberNo) {
        if (memberNo <= 0) {
            return GitHubConnectionCheck.failure("회원 정보가 필요합니다.");
        }
        String accessToken = getMemberAccessToken(memberNo);
        if (accessToken == null) {
            return GitHubConnectionCheck.failure("GitHub 계정을 연결해주세요. 마이페이지 > 소셜 계정 연동에서 GitHub를 연결할 수 있습니다.");
        }
        return GitHubConnectionCheck.success(accessToken);
    }

    /**
     * Task의 Verifier들을 PR Reviewer로 동기화합니다.
     * @param taskId 태스크 ID
     * @param prNumber PR 번호
     * @param owner 저장소 소유자
     * @param repo 저장소 이름
     * @param accessToken GitHub 액세스 토큰
     * @return 요청된 리뷰어 목록
     */
    private List<String> syncVerifiersToReviewers(int taskId, int prNumber, String owner, String repo, String accessToken) {
        try {
            // Task의 Verifier 목록 조회
            List<TaskVerifier> verifiers = taskVerifierDao.listByTask(taskId);
            if (verifiers == null || verifiers.isEmpty()) {
                log.debug("No verifiers found for task #{}", taskId);
                return new ArrayList<>();
            }

            // Verifier의 memberNo → GitHub username 변환
            List<String> githubUsernames = new ArrayList<>();
            for (TaskVerifier verifier : verifiers) {
                Member member = memberDao.findByNo(verifier.getMemberNo());
                if (member != null && member.getGithubUsername() != null && !member.getGithubUsername().isEmpty()) {
                    githubUsernames.add(member.getGithubUsername());
                }
            }

            if (githubUsernames.isEmpty()) {
                log.debug("No GitHub usernames found for task #{} verifiers", taskId);
                return new ArrayList<>();
            }

            // GitHub PR에 Reviewer 요청
            List<String> requestedReviewers = gitHubService.requestReviewers(
                accessToken, owner, repo, prNumber, githubUsernames
            );

            log.info("Synced {} verifiers to PR #{} as reviewers: {}",
                     requestedReviewers.size(), prNumber, requestedReviewers);
            return requestedReviewers;

        } catch (Exception e) {
            log.warn("Failed to sync verifiers to reviewers for task #{}: {}", taskId, e.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * GitHub Reviewer를 Task의 Verifier로 동기화합니다.
     * @param taskId 태스크 ID
     * @param teamId 팀 ID
     * @param reviewerUsernames GitHub 리뷰어 username 목록
     */
    public void syncReviewersToVerifiers(int taskId, int teamId, List<String> reviewerUsernames) {
        try {
            if (reviewerUsernames == null || reviewerUsernames.isEmpty()) {
                return;
            }

            // 현재 Verifier 목록
            List<TaskVerifier> currentVerifiers = taskVerifierDao.listByTask(taskId);

            for (String username : reviewerUsernames) {
                // GitHub username으로 멤버 조회
                Member member = memberDao.findByGithubUsername(username);
                if (member == null) {
                    log.debug("No member found for GitHub username: {}", username);
                    continue;
                }

                // 이미 Verifier인지 확인
                boolean alreadyVerifier = currentVerifiers.stream()
                    .anyMatch(v -> v.getMemberNo() == member.getNo());

                if (!alreadyVerifier) {
                    // 새 Verifier 추가
                    TaskVerifier newVerifier = new TaskVerifier();
                    newVerifier.setTaskId(taskId);
                    newVerifier.setMemberNo(member.getNo());
                    taskVerifierDao.insert(newVerifier);
                    log.info("Added verifier {} to task #{} from GitHub reviewer",
                             member.getName(), taskId);
                }
            }
        } catch (Exception e) {
            log.warn("Failed to sync reviewers to verifiers for task #{}: {}", taskId, e.getMessage());
        }
    }
}
