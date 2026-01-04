package com.example.demo.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.demo.dao.MemberDao;
import com.example.demo.model.Member;
import com.example.demo.model.Team;
import com.example.demo.model.TaskCommit;
import com.example.demo.service.GitHubService;
import com.example.demo.service.GitHubService.GitHubBranch;
import com.example.demo.service.GitHubService.GitHubBranchComparison;
import com.example.demo.service.GitHubService.GitHubCommit;
import com.example.demo.service.GitHubService.GitHubGraphCommit;
import com.example.demo.service.GitHubService.GitHubMergeResult;
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
