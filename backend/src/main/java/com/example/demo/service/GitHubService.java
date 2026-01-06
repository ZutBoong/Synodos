package com.example.demo.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.http.client.HttpComponentsClientHttpRequestFactory;
import org.springframework.core.ParameterizedTypeReference;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Slf4j
@Service
public class GitHubService {

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    public GitHubService() {
        // Apache HttpClient를 사용하여 PATCH 메서드 지원
        this.restTemplate = new RestTemplate(new HttpComponentsClientHttpRequestFactory());
        this.objectMapper = new ObjectMapper();
    }

    /**
     * 저장소 URL에서 owner와 repo를 파싱합니다.
     * 예: https://github.com/owner/repo -> RepoInfo(owner, repo)
     */
    public RepoInfo parseRepoUrl(String repoUrl) {
        if (repoUrl == null || repoUrl.trim().isEmpty()) {
            return null;
        }

        // https://github.com/owner/repo 또는 https://github.com/owner/repo.git
        Pattern pattern = Pattern.compile("https://github\\.com/([^/]+)/([^/\\.]+)(?:\\.git)?/?");
        Matcher matcher = pattern.matcher(repoUrl.trim());

        if (matcher.matches()) {
            return new RepoInfo(matcher.group(1), matcher.group(2));
        }
        return null;
    }

    /**
     * 브랜치 목록을 조회합니다.
     */
    public List<GitHubBranch> listBranches(String owner, String repo) {
        return listBranches(null, owner, repo);
    }

    /**
     * 브랜치 목록을 조회합니다 (인증 포함).
     */
    public List<GitHubBranch> listBranches(String accessToken, String owner, String repo) {
        String apiUrl = String.format("https://api.github.com/repos/%s/%s/branches?per_page=100", owner, repo);
        log.info("Fetching branches from: {}", apiUrl);

        try {
            HttpHeaders headers = accessToken != null ? createAuthHeaders(accessToken) : createGitHubHeaders();
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl, HttpMethod.GET, entity, String.class
            );

            List<GitHubBranch> branches = new ArrayList<>();
            JsonNode jsonArray = objectMapper.readTree(response.getBody());

            for (JsonNode node : jsonArray) {
                String name = node.path("name").asText();

                // PR 관련 브랜치 필터링 (pull/, pr/, pr- 등)
                if (isPullRequestBranch(name)) {
                    continue;
                }

                String sha = node.path("commit").path("sha").asText();
                branches.add(new GitHubBranch(name, sha));
            }

            return branches;
        } catch (Exception e) {
            log.error("Failed to fetch branches: {}", e.getMessage());
            throw new RuntimeException("브랜치 목록을 가져오는데 실패했습니다: " + e.getMessage(), e);
        }
    }

    /**
     * 특정 브랜치의 커밋 목록을 조회합니다.
     */
    public List<GitHubCommit> listCommits(String owner, String repo, String branch, int page) {
        String apiUrl = String.format(
            "https://api.github.com/repos/%s/%s/commits?sha=%s&per_page=20&page=%d",
            owner, repo, branch, page
        );
        log.info("Fetching commits from: {}", apiUrl);

        try {
            HttpHeaders headers = createGitHubHeaders();
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl, HttpMethod.GET, entity, String.class
            );

            List<GitHubCommit> commits = new ArrayList<>();
            JsonNode jsonArray = objectMapper.readTree(response.getBody());

            for (JsonNode node : jsonArray) {
                String sha = node.path("sha").asText();
                String message = node.path("commit").path("message").asText();
                String authorName = node.path("commit").path("author").path("name").asText();
                String authorLogin = node.path("author").path("login").asText("");
                String date = node.path("commit").path("author").path("date").asText();
                String htmlUrl = node.path("html_url").asText();

                // 메시지가 너무 길면 자르기
                if (message.length() > 100) {
                    message = message.substring(0, 100) + "...";
                }

                commits.add(new GitHubCommit(sha, message, authorName, authorLogin, date, htmlUrl));
            }

            return commits;
        } catch (Exception e) {
            log.error("Failed to fetch commits: {}", e.getMessage());
            throw new RuntimeException("커밋 목록을 가져오는데 실패했습니다. Public repository인지 확인해주세요.", e);
        }
    }

    /**
     * PR 관련 브랜치인지 확인합니다.
     * GitHub에서 PR 생성 시 자동으로 생성되는 브랜치들을 필터링합니다.
     */
    private boolean isPullRequestBranch(String branchName) {
        if (branchName == null) return false;
        String lower = branchName.toLowerCase();
        // PR 관련 패턴: pull/123/head, pr/123, pr-123, refs/pull/...
        return lower.startsWith("pull/") ||
               lower.startsWith("pr/") ||
               lower.matches("^pr-\\d+.*") ||
               lower.startsWith("refs/pull/");
    }

    /**
     * GitHub API 요청용 헤더를 생성합니다.
     */
    private HttpHeaders createGitHubHeaders() {
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "Synodos-App");
        headers.set("Accept", "application/vnd.github.v3+json");
        return headers;
    }

    /**
     * GitHub URL에서 코드를 가져옵니다.
     * 지원 형식:
     * - https://github.com/owner/repo/blob/branch/path/to/file.java
     * - https://github.com/owner/repo/commit/sha
     */
    public GitHubContent fetchCodeFromUrl(String githubUrl) {
        log.info("Fetching code from GitHub URL: {}", githubUrl);

        GitHubUrlInfo urlInfo = parseGitHubUrl(githubUrl);
        if (urlInfo == null) {
            throw new IllegalArgumentException("지원하지 않는 GitHub URL 형식입니다: " + githubUrl);
        }

        String code;
        String filename;

        if ("blob".equals(urlInfo.type)) {
            // File URL - fetch raw content
            code = fetchRawFileContent(urlInfo);
            filename = urlInfo.path.substring(urlInfo.path.lastIndexOf('/') + 1);
        } else if ("commit".equals(urlInfo.type)) {
            // Commit URL - fetch commit diff
            code = fetchCommitDiff(urlInfo);
            filename = "commit_" + urlInfo.ref.substring(0, 7);
        } else {
            throw new IllegalArgumentException("지원하지 않는 URL 타입입니다: " + urlInfo.type);
        }

        return new GitHubContent(code, filename, urlInfo);
    }

    /**
     * GitHub URL을 파싱합니다.
     */
    public GitHubUrlInfo parseGitHubUrl(String url) {
        // File URL: https://github.com/owner/repo/blob/branch/path/to/file
        Pattern filePattern = Pattern.compile(
            "https://github\\.com/([^/]+)/([^/]+)/blob/([^/]+)/(.+)"
        );
        Matcher fileMatcher = filePattern.matcher(url);
        if (fileMatcher.matches()) {
            return new GitHubUrlInfo(
                fileMatcher.group(1),  // owner
                fileMatcher.group(2),  // repo
                "blob",                // type
                fileMatcher.group(3),  // ref (branch/tag)
                fileMatcher.group(4)   // path
            );
        }

        // Commit URL: https://github.com/owner/repo/commit/sha
        Pattern commitPattern = Pattern.compile(
            "https://github\\.com/([^/]+)/([^/]+)/commit/([a-f0-9]+)"
        );
        Matcher commitMatcher = commitPattern.matcher(url);
        if (commitMatcher.matches()) {
            return new GitHubUrlInfo(
                commitMatcher.group(1),  // owner
                commitMatcher.group(2),  // repo
                "commit",                // type
                commitMatcher.group(3),  // ref (commit sha)
                null                     // path (not applicable)
            );
        }

        return null;
    }

    /**
     * GitHub raw 파일 내용을 가져옵니다.
     */
    private String fetchRawFileContent(GitHubUrlInfo urlInfo) {
        // Use raw.githubusercontent.com for raw file content
        String rawUrl = String.format(
            "https://raw.githubusercontent.com/%s/%s/%s/%s",
            urlInfo.owner, urlInfo.repo, urlInfo.ref, urlInfo.path
        );

        log.info("Fetching raw content from: {}", rawUrl);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Synodos-App");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                rawUrl, HttpMethod.GET, entity, String.class
            );

            return response.getBody();
        } catch (Exception e) {
            log.error("Failed to fetch raw content: {}", e.getMessage());
            throw new RuntimeException("GitHub에서 파일을 가져오는데 실패했습니다. Public repository인지 확인해주세요.", e);
        }
    }

    /**
     * GitHub commit diff를 가져옵니다.
     */
    private String fetchCommitDiff(GitHubUrlInfo urlInfo) {
        // GitHub API for commit
        String apiUrl = String.format(
            "https://api.github.com/repos/%s/%s/commits/%s",
            urlInfo.owner, urlInfo.repo, urlInfo.ref
        );

        log.info("Fetching commit from: {}", apiUrl);

        try {
            HttpHeaders headers = new HttpHeaders();
            headers.set("User-Agent", "Synodos-App");
            headers.set("Accept", "application/vnd.github.v3.diff");
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl, HttpMethod.GET, entity, String.class
            );

            String diff = response.getBody();

            // Limit diff size to prevent token overflow
            if (diff != null && diff.length() > 10000) {
                diff = diff.substring(0, 10000) + "\n\n... (truncated, diff too large)";
            }

            return diff;
        } catch (Exception e) {
            log.error("Failed to fetch commit: {}", e.getMessage());
            throw new RuntimeException("GitHub에서 커밋을 가져오는데 실패했습니다. Public repository인지 확인해주세요.", e);
        }
    }

    /**
     * GitHub URL 정보를 담는 클래스
     */
    public static class GitHubUrlInfo {
        public final String owner;
        public final String repo;
        public final String type;  // "blob" or "commit"
        public final String ref;   // branch/tag or commit sha
        public final String path;  // file path (null for commits)

        public GitHubUrlInfo(String owner, String repo, String type, String ref, String path) {
            this.owner = owner;
            this.repo = repo;
            this.type = type;
            this.ref = ref;
            this.path = path;
        }
    }

    /**
     * GitHub에서 가져온 콘텐츠를 담는 클래스
     */
    public static class GitHubContent {
        public final String code;
        public final String filename;
        public final GitHubUrlInfo urlInfo;

        public GitHubContent(String code, String filename, GitHubUrlInfo urlInfo) {
            this.code = code;
            this.filename = filename;
            this.urlInfo = urlInfo;
        }
    }

    // ==================== 저장소 목록 및 Webhook 관리 ====================

    /**
     * 사용자의 GitHub 저장소 목록을 조회합니다.
     */
    public List<GitHubRepository> listUserRepositories(String accessToken) {
        String apiUrl = "https://api.github.com/user/repos?per_page=100&sort=updated";
        log.info("Fetching user repositories");

        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl, HttpMethod.GET, entity, String.class
            );

            List<GitHubRepository> repos = new ArrayList<>();
            JsonNode jsonArray = objectMapper.readTree(response.getBody());

            for (JsonNode node : jsonArray) {
                GitHubRepository repo = new GitHubRepository();
                repo.setId(node.path("id").asLong());
                repo.setName(node.path("name").asText());
                repo.setFullName(node.path("full_name").asText());
                repo.setHtmlUrl(node.path("html_url").asText());
                repo.setDescription(node.path("description").asText(null));
                repo.setPrivateRepo(node.path("private").asBoolean());
                repo.setOwner(node.path("owner").path("login").asText());
                repos.add(repo);
            }

            return repos;
        } catch (Exception e) {
            log.error("Failed to fetch repositories: {}", e.getMessage());
            throw new RuntimeException("저장소 목록을 가져오는데 실패했습니다.", e);
        }
    }

    /**
     * 저장소에 Webhook을 등록합니다.
     */
    public GitHubWebhook createWebhook(String accessToken, String owner, String repo, String webhookUrl, String secret) {
        String apiUrl = String.format("https://api.github.com/repos/%s/%s/hooks", owner, repo);
        log.info("Creating webhook for {}/{}", owner, repo);

        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            headers.set("Content-Type", "application/json");

            // Webhook 설정
            Map<String, Object> config = Map.of(
                "url", webhookUrl,
                "content_type", "json",
                "secret", secret != null ? secret : "",
                "insecure_ssl", "0"
            );

            Map<String, Object> body = Map.of(
                "name", "web",
                "active", true,
                "events", List.of("issues", "push", "issue_comment"),
                "config", config
            );

            String jsonBody = objectMapper.writeValueAsString(body);
            HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl, HttpMethod.POST, entity, String.class
            );

            JsonNode node = objectMapper.readTree(response.getBody());
            GitHubWebhook webhook = new GitHubWebhook();
            webhook.setId(node.path("id").asLong());
            webhook.setUrl(node.path("config").path("url").asText());
            webhook.setActive(node.path("active").asBoolean());

            log.info("Webhook created successfully: id={}", webhook.getId());
            return webhook;
        } catch (Exception e) {
            log.error("Failed to create webhook: {}", e.getMessage());
            // 이미 존재하는 경우 등 에러 처리
            if (e.getMessage().contains("422") || e.getMessage().contains("already exists")) {
                throw new RuntimeException("이미 Webhook이 등록되어 있습니다.", e);
            }
            throw new RuntimeException("Webhook 등록에 실패했습니다: " + e.getMessage(), e);
        }
    }

    /**
     * 저장소의 기존 Webhook 목록을 조회합니다.
     */
    public List<GitHubWebhook> listWebhooks(String accessToken, String owner, String repo) {
        String apiUrl = String.format("https://api.github.com/repos/%s/%s/hooks", owner, repo);
        log.info("Listing webhooks for {}/{}", owner, repo);

        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl, HttpMethod.GET, entity, String.class
            );

            List<GitHubWebhook> webhooks = new ArrayList<>();
            JsonNode jsonArray = objectMapper.readTree(response.getBody());

            for (JsonNode node : jsonArray) {
                GitHubWebhook webhook = new GitHubWebhook();
                webhook.setId(node.path("id").asLong());
                webhook.setUrl(node.path("config").path("url").asText());
                webhook.setActive(node.path("active").asBoolean());
                webhooks.add(webhook);
            }

            return webhooks;
        } catch (Exception e) {
            log.error("Failed to list webhooks: {}", e.getMessage());
            throw new RuntimeException("Webhook 목록을 가져오는데 실패했습니다.", e);
        }
    }

    /**
     * Webhook을 삭제합니다.
     */
    public void deleteWebhook(String accessToken, String owner, String repo, long hookId) {
        String apiUrl = String.format("https://api.github.com/repos/%s/%s/hooks/%d", owner, repo, hookId);
        log.info("Deleting webhook {} for {}/{}", hookId, owner, repo);

        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            restTemplate.exchange(apiUrl, HttpMethod.DELETE, entity, String.class);
            log.info("Webhook deleted successfully");
        } catch (Exception e) {
            log.error("Failed to delete webhook: {}", e.getMessage());
            throw new RuntimeException("Webhook 삭제에 실패했습니다.", e);
        }
    }

    /**
     * 인증 헤더를 생성합니다.
     */
    private HttpHeaders createAuthHeaders(String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.set("User-Agent", "Synodos-App");
        headers.set("Accept", "application/vnd.github.v3+json");
        headers.set("Authorization", "Bearer " + accessToken);
        return headers;
    }

    // ==================== DTO Classes ====================

    /**
     * 저장소 정보를 담는 클래스
     */
    public static class RepoInfo {
        public final String owner;
        public final String repo;

        public RepoInfo(String owner, String repo) {
            this.owner = owner;
            this.repo = repo;
        }
    }

    /**
     * 브랜치 정보를 담는 클래스
     */
    public static class GitHubBranch {
        public final String name;
        public final String sha;

        public GitHubBranch(String name, String sha) {
            this.name = name;
            this.sha = sha;
        }

        // JSON 직렬화를 위한 getter
        public String getName() { return name; }
        public String getSha() { return sha; }
    }

    /**
     * 커밋 정보를 담는 클래스
     */
    public static class GitHubCommit {
        public final String sha;
        public final String message;
        public final String authorName;
        public final String authorLogin;
        public final String date;
        public final String htmlUrl;

        public GitHubCommit(String sha, String message, String authorName, String authorLogin, String date, String htmlUrl) {
            this.sha = sha;
            this.message = message;
            this.authorName = authorName;
            this.authorLogin = authorLogin;
            this.date = date;
            this.htmlUrl = htmlUrl;
        }

        // JSON 직렬화를 위한 getter
        public String getSha() { return sha; }
        public String getMessage() { return message; }
        public String getAuthorName() { return authorName; }
        public String getAuthorLogin() { return authorLogin; }
        public String getDate() { return date; }
        public String getHtmlUrl() { return htmlUrl; }
        public String getShortSha() { return sha.substring(0, 7); }
    }

    /**
     * GitHub 저장소 정보
     */
    @lombok.Data
    public static class GitHubRepository {
        private long id;
        private String name;
        private String fullName;
        private String htmlUrl;
        private String description;
        private boolean privateRepo;
        private String owner;
    }

    /**
     * GitHub Webhook 정보
     */
    @lombok.Data
    public static class GitHubWebhook {
        private long id;
        private String url;
        private boolean active;
    }

    // ==================== 브랜치 그래프 시각화 API ====================

    /**
     * 저장소의 기본 브랜치를 조회합니다.
     */
    public String getDefaultBranch(String accessToken, String owner, String repo) {
        String apiUrl = String.format("https://api.github.com/repos/%s/%s", owner, repo);
        log.info("Fetching default branch for {}/{}", owner, repo);

        try {
            HttpHeaders headers = accessToken != null ? createAuthHeaders(accessToken) : createGitHubHeaders();
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl, HttpMethod.GET, entity, String.class
            );

            JsonNode node = objectMapper.readTree(response.getBody());
            return node.path("default_branch").asText("main");
        } catch (Exception e) {
            log.error("Failed to fetch default branch: {}", e.getMessage());
            return "main"; // 기본값
        }
    }

    /**
     * 커밋 목록을 parent 정보와 함께 조회합니다 (그래프 시각화용).
     * 페이지네이션을 사용하여 maxCommits 개수까지 모든 커밋을 가져옵니다.
     */
    public List<GitHubGraphCommit> listCommitsWithParents(String accessToken, String owner, String repo, String branch, int maxCommits) {
        List<GitHubGraphCommit> allCommits = new ArrayList<>();
        int perPage = 100; // GitHub API 최대값
        int page = 1;

        log.info("Fetching commits with parents for {}/{} branch {} (maxCommits={})", owner, repo, branch, maxCommits);

        try {
            HttpHeaders headers = accessToken != null ? createAuthHeaders(accessToken) : createGitHubHeaders();
            HttpEntity<String> entity = new HttpEntity<>(headers);

            while (allCommits.size() < maxCommits) {
                String apiUrl = String.format(
                    "https://api.github.com/repos/%s/%s/commits?sha=%s&per_page=%d&page=%d",
                    owner, repo, branch, perPage, page
                );

                ResponseEntity<String> response = restTemplate.exchange(
                    apiUrl, HttpMethod.GET, entity, String.class
                );

                JsonNode jsonArray = objectMapper.readTree(response.getBody());

                if (!jsonArray.isArray() || jsonArray.size() == 0) {
                    break; // 더 이상 커밋 없음
                }

                for (JsonNode node : jsonArray) {
                    if (allCommits.size() >= maxCommits) {
                        break;
                    }

                    GitHubGraphCommit commit = new GitHubGraphCommit();
                    commit.setSha(node.path("sha").asText());
                    commit.setShortSha(node.path("sha").asText().substring(0, 7));

                    String message = node.path("commit").path("message").asText();
                    // 첫 줄만 사용
                    int newlineIndex = message.indexOf('\n');
                    if (newlineIndex > 0) {
                        message = message.substring(0, newlineIndex);
                    }
                    if (message.length() > 60) {
                        message = message.substring(0, 57) + "...";
                    }
                    commit.setMessage(message);

                    commit.setAuthorName(node.path("commit").path("author").path("name").asText());
                    commit.setAuthorLogin(node.path("author").path("login").asText(""));
                    commit.setDate(node.path("commit").path("author").path("date").asText());
                    commit.setHtmlUrl(node.path("html_url").asText());
                    commit.setBranch(branch);

                    // Parent 커밋 SHA 목록 추출
                    List<String> parents = new ArrayList<>();
                    JsonNode parentsNode = node.path("parents");
                    if (parentsNode.isArray()) {
                        for (JsonNode parent : parentsNode) {
                            parents.add(parent.path("sha").asText());
                        }
                    }
                    commit.setParents(parents);

                    allCommits.add(commit);
                }

                // 마지막 페이지면 종료
                if (jsonArray.size() < perPage) {
                    break;
                }

                page++;
            }

            log.info("Fetched {} commits for branch {}", allCommits.size(), branch);
            return allCommits;
        } catch (Exception e) {
            log.error("Failed to fetch commits with parents: {}", e.getMessage());
            throw new RuntimeException("커밋 목록을 가져오는데 실패했습니다.", e);
        }
    }

    /**
     * 두 브랜치를 비교하여 분기점(merge base)과 ahead/behind 정보를 조회합니다.
     */
    public GitHubBranchComparison compareBranches(String accessToken, String owner, String repo, String baseBranch, String headBranch) {
        String apiUrl = String.format(
            "https://api.github.com/repos/%s/%s/compare/%s...%s",
            owner, repo, baseBranch, headBranch
        );
        log.info("Comparing branches {}/{}: {} vs {}", owner, repo, baseBranch, headBranch);

        try {
            HttpHeaders headers = accessToken != null ? createAuthHeaders(accessToken) : createGitHubHeaders();
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl, HttpMethod.GET, entity, String.class
            );

            JsonNode node = objectMapper.readTree(response.getBody());

            GitHubBranchComparison comparison = new GitHubBranchComparison();
            comparison.setBaseBranch(baseBranch);
            comparison.setHeadBranch(headBranch);
            comparison.setMergeBaseSha(node.path("merge_base_commit").path("sha").asText());
            comparison.setAheadBy(node.path("ahead_by").asInt(0));
            comparison.setBehindBy(node.path("behind_by").asInt(0));
            comparison.setStatus(node.path("status").asText());
            comparison.setTotalCommits(node.path("total_commits").asInt(0));

            return comparison;
        } catch (Exception e) {
            log.error("Failed to compare branches: {}", e.getMessage());
            // 비교 실패 시 빈 결과 반환
            GitHubBranchComparison comparison = new GitHubBranchComparison();
            comparison.setBaseBranch(baseBranch);
            comparison.setHeadBranch(headBranch);
            comparison.setMergeBaseSha(null);
            comparison.setAheadBy(0);
            comparison.setBehindBy(0);
            return comparison;
        }
    }

    /**
     * 그래프 시각화용 커밋 정보 (parent 포함)
     */
    @lombok.Data
    public static class GitHubGraphCommit {
        private String sha;
        private String shortSha;
        private String message;
        private String authorName;
        private String authorLogin;
        private String date;
        private String htmlUrl;
        private String branch;
        private List<String> parents;
    }

    /**
     * 브랜치 비교 결과
     */
    @lombok.Data
    public static class GitHubBranchComparison {
        private String baseBranch;
        private String headBranch;
        private String mergeBaseSha;
        private int aheadBy;
        private int behindBy;
        private String status;  // ahead, behind, identical, diverged
        private int totalCommits;
    }

    // ==================== 브랜치 작업 API ====================

    /**
     * 새 브랜치를 생성합니다.
     * @param accessToken GitHub 액세스 토큰
     * @param owner 저장소 소유자
     * @param repo 저장소 이름
     * @param branchName 생성할 브랜치 이름
     * @param fromSha 분기할 커밋 SHA
     * @return 생성된 브랜치 정보
     */
    public GitHubBranch createBranch(String accessToken, String owner, String repo, String branchName, String fromSha) {
        String apiUrl = String.format("https://api.github.com/repos/%s/%s/git/refs", owner, repo);
        log.info("Creating branch {}/{}: {} from {}", owner, repo, branchName, fromSha);

        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            headers.set("Content-Type", "application/json");

            Map<String, String> body = Map.of(
                "ref", "refs/heads/" + branchName,
                "sha", fromSha
            );

            String jsonBody = objectMapper.writeValueAsString(body);
            HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl, HttpMethod.POST, entity, String.class
            );

            JsonNode node = objectMapper.readTree(response.getBody());
            String ref = node.path("ref").asText();
            String sha = node.path("object").path("sha").asText();
            String name = ref.replace("refs/heads/", "");

            log.info("Branch created successfully: {}", name);
            return new GitHubBranch(name, sha);
        } catch (Exception e) {
            log.error("Failed to create branch: {}", e.getMessage());
            if (e.getMessage().contains("422")) {
                throw new RuntimeException("이미 존재하는 브랜치 이름입니다: " + branchName, e);
            }
            throw new RuntimeException("브랜치 생성에 실패했습니다: " + e.getMessage(), e);
        }
    }

    /**
     * 브랜치를 머지합니다.
     * @param accessToken GitHub 액세스 토큰
     * @param owner 저장소 소유자
     * @param repo 저장소 이름
     * @param base 머지 대상 브랜치 (예: main)
     * @param head 머지할 브랜치 (예: feature/xxx)
     * @param commitMessage 머지 커밋 메시지 (선택)
     * @return 머지 결과
     */
    public GitHubMergeResult mergeBranches(String accessToken, String owner, String repo,
                                            String base, String head, String commitMessage) {
        String apiUrl = String.format("https://api.github.com/repos/%s/%s/merges", owner, repo);
        log.info("Merging {}/{}: {} <- {}", owner, repo, base, head);

        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            headers.set("Content-Type", "application/json");

            Map<String, String> body = new java.util.HashMap<>();
            body.put("base", base);
            body.put("head", head);
            if (commitMessage != null && !commitMessage.isEmpty()) {
                body.put("commit_message", commitMessage);
            }

            String jsonBody = objectMapper.writeValueAsString(body);
            HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl, HttpMethod.POST, entity, String.class
            );

            GitHubMergeResult result = new GitHubMergeResult();

            // 204 No Content = 이미 최신 상태 (머지할 변경사항 없음)
            if (response.getStatusCode().value() == 204 || response.getBody() == null || response.getBody().isEmpty()) {
                result.setMerged(true);
                result.setMessage("이미 최신 상태입니다. 머지할 변경사항이 없습니다.");
                log.info("Already up to date: {} <- {}", base, head);
                return result;
            }

            // 201 Created = 머지 성공
            JsonNode node = objectMapper.readTree(response.getBody());
            result.setSha(node.path("sha").asText());
            result.setMerged(true);
            result.setMessage("머지가 완료되었습니다.");

            log.info("Merge successful: {}", result.getSha());
            return result;
        } catch (Exception e) {
            log.error("Failed to merge branches: {}", e.getMessage());

            GitHubMergeResult result = new GitHubMergeResult();
            result.setMerged(false);

            String errorMsg = e.getMessage() != null ? e.getMessage() : "";
            if (errorMsg.contains("409")) {
                result.setMessage("머지 충돌이 있습니다. GitHub에서 직접 해결해주세요.");
            } else if (errorMsg.contains("404")) {
                result.setMessage("브랜치를 찾을 수 없습니다.");
            } else {
                result.setMessage("머지에 실패했습니다: " + errorMsg);
            }

            return result;
        }
    }

    /**
     * 브랜치를 삭제합니다.
     * @param accessToken GitHub 액세스 토큰
     * @param owner 저장소 소유자
     * @param repo 저장소 이름
     * @param branchName 삭제할 브랜치 이름
     */
    public void deleteBranch(String accessToken, String owner, String repo, String branchName) {
        String apiUrl = String.format("https://api.github.com/repos/%s/%s/git/refs/heads/%s",
                                      owner, repo, branchName);
        log.info("Deleting branch {}/{}: {}", owner, repo, branchName);

        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            restTemplate.exchange(apiUrl, HttpMethod.DELETE, entity, String.class);
            log.info("Branch deleted successfully: {}", branchName);
        } catch (Exception e) {
            log.error("Failed to delete branch: {}", e.getMessage());
            if (e.getMessage().contains("422")) {
                throw new RuntimeException("보호된 브랜치는 삭제할 수 없습니다.", e);
            }
            throw new RuntimeException("브랜치 삭제에 실패했습니다: " + e.getMessage(), e);
        }
    }

    /**
     * 머지 결과
     */
    @lombok.Data
    public static class GitHubMergeResult {
        private String sha;           // 머지 커밋 SHA
        private boolean merged;       // 성공 여부
        private String message;       // 상태 메시지
    }

    /**
     * 커밋을 되돌립니다 (Revert).
     * 지정된 커밋의 변경사항을 되돌리는 새 커밋을 생성합니다.
     * @param accessToken GitHub 액세스 토큰
     * @param owner 저장소 소유자
     * @param repo 저장소 이름
     * @param branch 브랜치 이름
     * @param commitSha 되돌릴 커밋 SHA
     * @return Revert 결과
     */
    public GitHubRevertResult revertCommit(String accessToken, String owner, String repo,
                                            String branch, String commitSha) {
        log.info("Reverting commit {} on branch {} in {}/{}", commitSha, branch, owner, repo);

        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            headers.set("Content-Type", "application/json");

            // 1. 되돌릴 커밋 정보 조회
            String commitUrl = String.format("https://api.github.com/repos/%s/%s/commits/%s", owner, repo, commitSha);
            HttpEntity<String> getEntity = new HttpEntity<>(headers);

            ResponseEntity<String> commitResponse = restTemplate.exchange(
                commitUrl, HttpMethod.GET, getEntity, String.class
            );
            JsonNode commitNode = objectMapper.readTree(commitResponse.getBody());
            String commitMessage = commitNode.path("commit").path("message").asText();
            String shortSha = commitSha.substring(0, 7);

            // 부모 커밋이 없으면 revert 불가
            JsonNode parentsNode = commitNode.path("parents");
            if (!parentsNode.isArray() || parentsNode.size() == 0) {
                GitHubRevertResult result = new GitHubRevertResult();
                result.setSuccess(false);
                result.setMessage("최초 커밋은 되돌릴 수 없습니다.");
                return result;
            }
            String parentSha = parentsNode.get(0).path("sha").asText();

            // 2. 현재 브랜치의 최신 커밋(HEAD) 조회
            String branchUrl = String.format("https://api.github.com/repos/%s/%s/git/refs/heads/%s", owner, repo, branch);
            ResponseEntity<String> branchResponse = restTemplate.exchange(
                branchUrl, HttpMethod.GET, getEntity, String.class
            );
            JsonNode branchNode = objectMapper.readTree(branchResponse.getBody());
            String headSha = branchNode.path("object").path("sha").asText();

            // 3. 커밋에서 변경된 파일 목록 조회 (상세 diff 포함)
            String compareUrl = String.format("https://api.github.com/repos/%s/%s/compare/%s...%s",
                owner, repo, parentSha, commitSha);
            ResponseEntity<String> compareResponse = restTemplate.exchange(
                compareUrl, HttpMethod.GET, getEntity, String.class
            );
            JsonNode compareNode = objectMapper.readTree(compareResponse.getBody());
            JsonNode filesNode = compareNode.path("files");

            if (!filesNode.isArray() || filesNode.size() == 0) {
                GitHubRevertResult result = new GitHubRevertResult();
                result.setSuccess(false);
                result.setMessage("되돌릴 변경사항이 없습니다.");
                return result;
            }

            // 4. 현재 HEAD의 트리 조회
            String headCommitUrl = String.format("https://api.github.com/repos/%s/%s/git/commits/%s", owner, repo, headSha);
            ResponseEntity<String> headCommitResponse = restTemplate.exchange(
                headCommitUrl, HttpMethod.GET, getEntity, String.class
            );
            JsonNode headCommitNode = objectMapper.readTree(headCommitResponse.getBody());
            String baseTreeSha = headCommitNode.path("tree").path("sha").asText();

            // 5. 변경된 파일들을 되돌리는 새 트리 생성
            List<Map<String, Object>> treeItems = new ArrayList<>();

            for (JsonNode fileNode : filesNode) {
                String filename = fileNode.path("filename").asText();
                String status = fileNode.path("status").asText();

                Map<String, Object> treeItem = new java.util.HashMap<>();
                treeItem.put("path", filename);
                treeItem.put("mode", "100644");  // 일반 파일
                treeItem.put("type", "blob");

                if ("added".equals(status)) {
                    // 추가된 파일 -> 삭제
                    treeItem.put("sha", (Object) null);
                } else if ("removed".equals(status)) {
                    // 삭제된 파일 -> 부모 커밋에서 복원
                    String blobSha = getFileBlobSha(accessToken, owner, repo, parentSha, filename);
                    if (blobSha != null) {
                        treeItem.put("sha", blobSha);
                    } else {
                        continue; // 복원할 수 없으면 건너뛰기
                    }
                } else if ("modified".equals(status) || "renamed".equals(status)) {
                    // 수정/이름변경된 파일 -> 부모 커밋 상태로 복원
                    String previousFilename = fileNode.path("previous_filename").asText(filename);
                    String blobSha = getFileBlobSha(accessToken, owner, repo, parentSha, previousFilename);
                    if (blobSha != null) {
                        if ("renamed".equals(status)) {
                            // 이름 변경된 경우: 현재 파일 삭제하고 이전 이름으로 복원
                            Map<String, Object> deleteItem = new java.util.HashMap<>();
                            deleteItem.put("path", filename);
                            deleteItem.put("mode", "100644");
                            deleteItem.put("type", "blob");
                            deleteItem.put("sha", (Object) null);
                            treeItems.add(deleteItem);

                            treeItem.put("path", previousFilename);
                        }
                        treeItem.put("sha", blobSha);
                    } else {
                        continue;
                    }
                }

                treeItems.add(treeItem);
            }

            if (treeItems.isEmpty()) {
                GitHubRevertResult result = new GitHubRevertResult();
                result.setSuccess(false);
                result.setMessage("되돌릴 변경사항을 처리할 수 없습니다.");
                return result;
            }

            // 6. 새 트리 생성
            String createTreeUrl = String.format("https://api.github.com/repos/%s/%s/git/trees", owner, repo);
            Map<String, Object> treeBody = new java.util.HashMap<>();
            treeBody.put("base_tree", baseTreeSha);
            treeBody.put("tree", treeItems);

            String treeJson = objectMapper.writeValueAsString(treeBody);
            HttpEntity<String> treeEntity = new HttpEntity<>(treeJson, headers);

            ResponseEntity<String> treeResponse = restTemplate.exchange(
                createTreeUrl, HttpMethod.POST, treeEntity, String.class
            );
            JsonNode newTreeNode = objectMapper.readTree(treeResponse.getBody());
            String newTreeSha = newTreeNode.path("sha").asText();

            // 7. Revert 커밋 생성
            String createCommitUrl = String.format("https://api.github.com/repos/%s/%s/git/commits", owner, repo);

            // 커밋 메시지 첫 줄만 사용
            String firstLine = commitMessage.split("\n")[0];
            if (firstLine.length() > 50) {
                firstLine = firstLine.substring(0, 47) + "...";
            }
            String revertMessage = String.format("Revert \"%s\"\n\nThis reverts commit %s.", firstLine, shortSha);

            Map<String, Object> commitBody = new java.util.HashMap<>();
            commitBody.put("message", revertMessage);
            commitBody.put("tree", newTreeSha);
            commitBody.put("parents", List.of(headSha));

            String commitJson = objectMapper.writeValueAsString(commitBody);
            HttpEntity<String> commitEntity = new HttpEntity<>(commitJson, headers);

            ResponseEntity<String> newCommitResponse = restTemplate.exchange(
                createCommitUrl, HttpMethod.POST, commitEntity, String.class
            );
            JsonNode newCommitNode = objectMapper.readTree(newCommitResponse.getBody());
            String newCommitSha = newCommitNode.path("sha").asText();

            // 8. 브랜치 참조 업데이트
            String updateRefUrl = String.format("https://api.github.com/repos/%s/%s/git/refs/heads/%s", owner, repo, branch);
            Map<String, Object> refBody = Map.of("sha", newCommitSha, "force", false);

            String refJson = objectMapper.writeValueAsString(refBody);
            HttpEntity<String> refEntity = new HttpEntity<>(refJson, headers);

            restTemplate.exchange(updateRefUrl, HttpMethod.PATCH, refEntity, String.class);

            log.info("Commit reverted successfully: {}", newCommitSha);

            GitHubRevertResult result = new GitHubRevertResult();
            result.setSuccess(true);
            result.setSha(newCommitSha);
            result.setMessage(String.format("커밋 %s이(가) 성공적으로 되돌려졌습니다.", shortSha));
            result.setRevertedCommitSha(commitSha);
            return result;

        } catch (Exception e) {
            log.error("Failed to revert commit: {}", e.getMessage());

            GitHubRevertResult result = new GitHubRevertResult();
            result.setSuccess(false);

            if (e.getMessage().contains("409")) {
                result.setMessage("충돌이 발생했습니다. 수동으로 해결해주세요.");
            } else if (e.getMessage().contains("404")) {
                result.setMessage("커밋 또는 브랜치를 찾을 수 없습니다.");
            } else if (e.getMessage().contains("422")) {
                result.setMessage("유효하지 않은 요청입니다. 브랜치가 보호되어 있을 수 있습니다.");
            } else {
                result.setMessage("커밋 되돌리기에 실패했습니다: " + e.getMessage());
            }

            return result;
        }
    }

    /**
     * 특정 커밋에서 파일의 blob SHA를 조회합니다.
     */
    private String getFileBlobSha(String accessToken, String owner, String repo, String commitSha, String path) {
        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            String url = String.format("https://api.github.com/repos/%s/%s/contents/%s?ref=%s",
                owner, repo, java.net.URLEncoder.encode(path, "UTF-8"), commitSha);

            ResponseEntity<String> response = restTemplate.exchange(
                url, HttpMethod.GET, entity, String.class
            );

            JsonNode node = objectMapper.readTree(response.getBody());
            return node.path("sha").asText();
        } catch (Exception e) {
            log.warn("Failed to get blob SHA for {}: {}", path, e.getMessage());
            return null;
        }
    }

    /**
     * Revert 결과
     */
    @lombok.Data
    public static class GitHubRevertResult {
        private boolean success;
        private String sha;              // 새로 생성된 revert 커밋 SHA
        private String message;
        private String revertedCommitSha; // 되돌린 원래 커밋 SHA
    }

    // ==================== Pull Request API ====================

    /**
     * Pull Request 생성
     * @param accessToken GitHub 액세스 토큰
     * @param owner 저장소 소유자
     * @param repo 저장소 이름
     * @param title PR 제목
     * @param body PR 본문
     * @param head 소스 브랜치 (예: feature/xxx)
     * @param base 대상 브랜치 (예: main)
     * @return 생성된 PR 정보
     */
    public GitHubPullRequest createPullRequest(String accessToken, String owner, String repo,
                                                String title, String body, String head, String base) {
        String apiUrl = String.format("https://api.github.com/repos/%s/%s/pulls", owner, repo);
        log.info("Creating PR in {}/{}: {} <- {}", owner, repo, base, head);

        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            headers.set("Content-Type", "application/json");

            Map<String, String> requestBody = new java.util.HashMap<>();
            requestBody.put("title", title);
            requestBody.put("body", body);
            requestBody.put("head", head);
            requestBody.put("base", base);

            String jsonBody = objectMapper.writeValueAsString(requestBody);
            HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl, HttpMethod.POST, entity, String.class
            );

            JsonNode node = objectMapper.readTree(response.getBody());
            return parsePullRequest(node);
        } catch (Exception e) {
            log.error("Failed to create PR: {}", e.getMessage());
            if (e.getMessage().contains("422")) {
                if (e.getMessage().contains("already exists")) {
                    throw new RuntimeException("이미 동일한 브랜치에서 생성된 PR이 있습니다.", e);
                }
                throw new RuntimeException("PR 생성에 실패했습니다. 브랜치를 확인해주세요.", e);
            }
            throw new RuntimeException("PR 생성에 실패했습니다: " + e.getMessage(), e);
        }
    }

    /**
     * Pull Request 목록 조회
     * @param accessToken GitHub 액세스 토큰
     * @param owner 저장소 소유자
     * @param repo 저장소 이름
     * @param state 상태 필터 (open, closed, all)
     * @param page 페이지 번호
     * @return PR 목록
     */
    public List<GitHubPullRequest> listPullRequests(String accessToken, String owner, String repo,
                                                     String state, int page) {
        String apiUrl = String.format("https://api.github.com/repos/%s/%s/pulls?state=%s&page=%d&per_page=30",
                                      owner, repo, state, page);
        log.debug("Listing PRs in {}/{}, state={}", owner, repo, state);

        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl, HttpMethod.GET, entity, String.class
            );

            JsonNode arrayNode = objectMapper.readTree(response.getBody());
            List<GitHubPullRequest> prs = new ArrayList<>();

            for (JsonNode node : arrayNode) {
                prs.add(parsePullRequest(node));
            }

            return prs;
        } catch (Exception e) {
            log.error("Failed to list PRs: {}", e.getMessage());
            throw new RuntimeException("PR 목록 조회에 실패했습니다: " + e.getMessage(), e);
        }
    }

    /**
     * Pull Request 상세 조회
     * @param accessToken GitHub 액세스 토큰
     * @param owner 저장소 소유자
     * @param repo 저장소 이름
     * @param prNumber PR 번호
     * @return PR 정보
     */
    public GitHubPullRequest getPullRequest(String accessToken, String owner, String repo, int prNumber) {
        String apiUrl = String.format("https://api.github.com/repos/%s/%s/pulls/%d", owner, repo, prNumber);
        log.debug("Getting PR #{} in {}/{}", prNumber, owner, repo);

        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl, HttpMethod.GET, entity, String.class
            );

            JsonNode node = objectMapper.readTree(response.getBody());
            return parsePullRequest(node);
        } catch (Exception e) {
            log.error("Failed to get PR: {}", e.getMessage());
            throw new RuntimeException("PR 조회에 실패했습니다: " + e.getMessage(), e);
        }
    }

    /**
     * Pull Request 머지
     * @param accessToken GitHub 액세스 토큰
     * @param owner 저장소 소유자
     * @param repo 저장소 이름
     * @param prNumber PR 번호
     * @param commitTitle 머지 커밋 제목
     * @param mergeMethod 머지 방법 (merge, squash, rebase)
     * @return 머지 결과
     */
    public GitHubMergeResult mergePullRequest(String accessToken, String owner, String repo,
                                               int prNumber, String commitTitle, String mergeMethod) {
        String apiUrl = String.format("https://api.github.com/repos/%s/%s/pulls/%d/merge", owner, repo, prNumber);
        log.info("Merging PR #{} in {}/{}", prNumber, owner, repo);

        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            headers.set("Content-Type", "application/json");

            Map<String, String> body = new java.util.HashMap<>();
            if (commitTitle != null && !commitTitle.isEmpty()) {
                body.put("commit_title", commitTitle);
            }
            if (mergeMethod != null && !mergeMethod.isEmpty()) {
                body.put("merge_method", mergeMethod); // merge, squash, rebase
            }

            String jsonBody = objectMapper.writeValueAsString(body);
            HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl, HttpMethod.PUT, entity, String.class
            );

            JsonNode node = objectMapper.readTree(response.getBody());

            GitHubMergeResult result = new GitHubMergeResult();
            result.setSha(node.path("sha").asText());
            result.setMerged(node.path("merged").asBoolean());
            result.setMessage(node.path("message").asText("PR이 머지되었습니다."));

            log.info("PR merge successful: {}", result.getSha());
            return result;
        } catch (Exception e) {
            log.error("Failed to merge PR: {}", e.getMessage());

            GitHubMergeResult result = new GitHubMergeResult();
            result.setMerged(false);

            if (e.getMessage().contains("405")) {
                result.setMessage("이 PR은 머지할 수 없습니다. (충돌 또는 리뷰 필요)");
            } else if (e.getMessage().contains("409")) {
                result.setMessage("PR의 HEAD가 변경되었습니다. 새로고침 후 다시 시도해주세요.");
            } else {
                result.setMessage("PR 머지에 실패했습니다: " + e.getMessage());
            }

            return result;
        }
    }

    /**
     * Issue/PR에 연결된 PR 목록 조회 (특정 Issue를 참조하는 PR들)
     * @param accessToken GitHub 액세스 토큰
     * @param owner 저장소 소유자
     * @param repo 저장소 이름
     * @param issueNumber Issue 번호
     * @return 연결된 PR 목록
     */
    public List<GitHubPullRequest> listPullRequestsForIssue(String accessToken, String owner, String repo,
                                                            int issueNumber) {
        // GitHub Search API를 사용하여 Issue를 참조하는 PR 검색
        String query = String.format("repo:%s/%s is:pr %d in:body", owner, repo, issueNumber);
        String apiUrl = "https://api.github.com/search/issues?q=" + java.net.URLEncoder.encode(query, java.nio.charset.StandardCharsets.UTF_8);

        log.debug("Searching PRs for issue #{} in {}/{}", issueNumber, owner, repo);

        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl, HttpMethod.GET, entity, String.class
            );

            JsonNode root = objectMapper.readTree(response.getBody());
            JsonNode items = root.path("items");
            List<GitHubPullRequest> prs = new ArrayList<>();

            for (JsonNode node : items) {
                if (node.has("pull_request")) {
                    // 검색 결과는 간략한 정보만 제공하므로 필요한 필드 추출
                    GitHubPullRequest pr = new GitHubPullRequest();
                    pr.setNumber(node.path("number").asInt());
                    pr.setTitle(node.path("title").asText());
                    pr.setState(node.path("state").asText());
                    pr.setHtmlUrl(node.path("html_url").asText());
                    pr.setCreatedAt(node.path("created_at").asText());
                    pr.setUpdatedAt(node.path("updated_at").asText());

                    JsonNode userNode = node.path("user");
                    if (!userNode.isMissingNode()) {
                        pr.setUserLogin(userNode.path("login").asText());
                        pr.setUserAvatarUrl(userNode.path("avatar_url").asText());
                    }

                    prs.add(pr);
                }
            }

            return prs;
        } catch (Exception e) {
            log.error("Failed to search PRs for issue: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * 브랜치에서 생성된 PR 조회
     * @param accessToken GitHub 액세스 토큰
     * @param owner 저장소 소유자
     * @param repo 저장소 이름
     * @param head 소스 브랜치 이름
     * @return PR 정보 (없으면 null)
     */
    public GitHubPullRequest getPullRequestByHead(String accessToken, String owner, String repo, String head) {
        String apiUrl = String.format("https://api.github.com/repos/%s/%s/pulls?head=%s:%s&state=all",
                                      owner, repo, owner, head);
        log.debug("Getting PR by head branch {} in {}/{}", head, owner, repo);

        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl, HttpMethod.GET, entity, String.class
            );

            JsonNode arrayNode = objectMapper.readTree(response.getBody());
            if (arrayNode.isArray() && arrayNode.size() > 0) {
                return parsePullRequest(arrayNode.get(0));
            }
            return null;
        } catch (Exception e) {
            log.error("Failed to get PR by head: {}", e.getMessage());
            return null;
        }
    }

    private GitHubPullRequest parsePullRequest(JsonNode node) {
        GitHubPullRequest pr = new GitHubPullRequest();
        pr.setId(node.path("id").asLong());
        pr.setNumber(node.path("number").asInt());
        pr.setTitle(node.path("title").asText());
        pr.setBody(node.path("body").asText());
        pr.setState(node.path("state").asText());
        pr.setHtmlUrl(node.path("html_url").asText());
        pr.setDiffUrl(node.path("diff_url").asText());
        pr.setCreatedAt(node.path("created_at").asText());
        pr.setUpdatedAt(node.path("updated_at").asText());
        pr.setMergedAt(node.path("merged_at").asText(null));
        pr.setClosedAt(node.path("closed_at").asText(null));
        pr.setMerged(node.path("merged").asBoolean(false));
        pr.setMergeable(node.path("mergeable").asBoolean(true));
        pr.setMergeableState(node.path("mergeable_state").asText());

        JsonNode headNode = node.path("head");
        if (!headNode.isMissingNode()) {
            pr.setHeadRef(headNode.path("ref").asText());
            pr.setHeadSha(headNode.path("sha").asText());
        }

        JsonNode baseNode = node.path("base");
        if (!baseNode.isMissingNode()) {
            pr.setBaseRef(baseNode.path("ref").asText());
        }

        JsonNode userNode = node.path("user");
        if (!userNode.isMissingNode()) {
            pr.setUserLogin(userNode.path("login").asText());
            pr.setUserAvatarUrl(userNode.path("avatar_url").asText());
        }

        return pr;
    }

    /**
     * PR의 변경된 파일 목록을 조회합니다 (충돌 확인용).
     */
    public List<PRFile> getPullRequestFiles(String accessToken, String owner, String repo, int prNumber) {
        String apiUrl = String.format("https://api.github.com/repos/%s/%s/pulls/%d/files?per_page=100",
                                      owner, repo, prNumber);
        log.debug("Getting PR files for PR #{} in {}/{}", prNumber, owner, repo);

        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl, HttpMethod.GET, entity, String.class
            );

            List<PRFile> files = new ArrayList<>();
            JsonNode arrayNode = objectMapper.readTree(response.getBody());

            for (JsonNode node : arrayNode) {
                PRFile file = new PRFile();
                file.setFilename(node.path("filename").asText());
                file.setStatus(node.path("status").asText());
                file.setAdditions(node.path("additions").asInt());
                file.setDeletions(node.path("deletions").asInt());
                file.setChanges(node.path("changes").asInt());
                file.setPatch(node.path("patch").asText(null));
                files.add(file);
            }

            return files;
        } catch (Exception e) {
            log.error("Failed to get PR files: {}", e.getMessage());
            return new ArrayList<>();
        }
    }

    /**
     * PR 상세 정보 조회 (mergeable 상태 포함)
     * GitHub API는 mergeable을 별도 요청에서만 정확히 반환합니다.
     */
    public PRDetailInfo getPullRequestDetail(String accessToken, String owner, String repo, int prNumber) {
        String apiUrl = String.format("https://api.github.com/repos/%s/%s/pulls/%d", owner, repo, prNumber);
        log.debug("Getting PR detail for PR #{} in {}/{}", prNumber, owner, repo);

        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl, HttpMethod.GET, entity, String.class
            );

            JsonNode node = objectMapper.readTree(response.getBody());

            PRDetailInfo detail = new PRDetailInfo();
            detail.setNumber(node.path("number").asInt());
            detail.setTitle(node.path("title").asText());
            detail.setState(node.path("state").asText());
            detail.setMerged(node.path("merged").asBoolean(false));

            // mergeable이 null일 수 있음 (GitHub이 아직 계산 중)
            JsonNode mergeableNode = node.path("mergeable");
            if (mergeableNode.isNull()) {
                detail.setMergeable(null); // 아직 확인 중
                detail.setMergeableState("unknown");
            } else {
                detail.setMergeable(mergeableNode.asBoolean());
                detail.setMergeableState(node.path("mergeable_state").asText());
            }

            detail.setHtmlUrl(node.path("html_url").asText());
            detail.setHeadRef(node.path("head").path("ref").asText());
            detail.setBaseRef(node.path("base").path("ref").asText());
            detail.setHeadSha(node.path("head").path("sha").asText());

            // 충돌 상태면 파일 목록도 조회
            if (Boolean.FALSE.equals(detail.getMergeable()) || "dirty".equals(detail.getMergeableState())) {
                detail.setConflictFiles(getPullRequestFiles(accessToken, owner, repo, prNumber));
                detail.setHasConflicts(true);
            } else {
                detail.setHasConflicts(false);
                detail.setConflictFiles(new ArrayList<>());
            }

            return detail;
        } catch (Exception e) {
            log.error("Failed to get PR detail: {}", e.getMessage());
            throw new RuntimeException("PR 상세 조회에 실패했습니다: " + e.getMessage(), e);
        }
    }

    /**
     * Pull Request 정보
     */
    @lombok.Data
    public static class GitHubPullRequest {
        private long id;
        private int number;
        private String title;
        private String body;
        private String state;          // open, closed
        private String htmlUrl;
        private String diffUrl;
        private String createdAt;
        private String updatedAt;
        private String mergedAt;
        private String closedAt;
        private boolean merged;
        private boolean mergeable;
        private String mergeableState; // clean, dirty, unstable, blocked, unknown
        private String headRef;        // 소스 브랜치
        private String headSha;
        private String baseRef;        // 대상 브랜치
        private String userLogin;
        private String userAvatarUrl;
    }

    /**
     * PR 상세 정보 (충돌 상태 포함)
     */
    @lombok.Data
    public static class PRDetailInfo {
        private int number;
        private String title;
        private String state;
        private boolean merged;
        private Boolean mergeable;      // null = 확인 중
        private String mergeableState;  // clean, dirty, unstable, blocked, unknown
        private String htmlUrl;
        private String headRef;
        private String baseRef;
        private String headSha;
        private boolean hasConflicts;
        private List<PRFile> conflictFiles;
    }

    /**
     * PR 변경 파일 정보
     */
    @lombok.Data
    public static class PRFile {
        private String filename;
        private String status;      // added, removed, modified, renamed
        private int additions;
        private int deletions;
        private int changes;
        private String patch;       // diff 내용 (일부)
    }

    // ==================== 파일 조회/업데이트 API (충돌 해결용) ====================

    /**
     * 특정 브랜치에서 파일 내용을 조회합니다.
     */
    public FileContent getFileContent(String accessToken, String owner, String repo, String path, String ref) {
        String encodedPath = path;
        try {
            encodedPath = java.net.URLEncoder.encode(path, "UTF-8").replace("+", "%20");
        } catch (Exception e) {
            // ignore
        }

        String apiUrl = String.format("https://api.github.com/repos/%s/%s/contents/%s?ref=%s",
                                      owner, repo, encodedPath, ref);
        log.debug("Getting file content: {} at {}", path, ref);

        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl, HttpMethod.GET, entity, String.class
            );

            JsonNode node = objectMapper.readTree(response.getBody());

            FileContent content = new FileContent();
            content.setPath(node.path("path").asText());
            content.setSha(node.path("sha").asText());
            content.setSize(node.path("size").asInt());

            // Base64 디코딩
            String encodedContent = node.path("content").asText().replaceAll("\\s", "");
            if (!encodedContent.isEmpty()) {
                byte[] decodedBytes = java.util.Base64.getDecoder().decode(encodedContent);
                content.setContent(new String(decodedBytes, java.nio.charset.StandardCharsets.UTF_8));
            } else {
                content.setContent("");
            }

            return content;
        } catch (Exception e) {
            log.error("Failed to get file content: {}", e.getMessage());
            return null;
        }
    }

    /**
     * 파일을 업데이트합니다 (새 커밋 생성).
     */
    public FileUpdateResult updateFileContent(String accessToken, String owner, String repo,
                                               String path, String content, String message,
                                               String branch, String sha) {
        String encodedPath = path;
        try {
            encodedPath = java.net.URLEncoder.encode(path, "UTF-8").replace("+", "%20");
        } catch (Exception e) {
            // ignore
        }

        String apiUrl = String.format("https://api.github.com/repos/%s/%s/contents/%s",
                                      owner, repo, encodedPath);
        log.info("Updating file: {} on branch {}", path, branch);

        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            headers.set("Content-Type", "application/json");

            // Base64 인코딩
            String encodedContent = java.util.Base64.getEncoder().encodeToString(
                content.getBytes(java.nio.charset.StandardCharsets.UTF_8)
            );

            Map<String, Object> body = new java.util.HashMap<>();
            body.put("message", message);
            body.put("content", encodedContent);
            body.put("branch", branch);
            if (sha != null && !sha.isEmpty()) {
                body.put("sha", sha);
            }

            String jsonBody = objectMapper.writeValueAsString(body);
            HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);

            ResponseEntity<String> response = restTemplate.exchange(
                apiUrl, HttpMethod.PUT, entity, String.class
            );

            JsonNode node = objectMapper.readTree(response.getBody());

            FileUpdateResult result = new FileUpdateResult();
            result.setSuccess(true);
            result.setCommitSha(node.path("commit").path("sha").asText());
            result.setMessage("파일이 성공적으로 업데이트되었습니다.");

            return result;
        } catch (Exception e) {
            log.error("Failed to update file: {}", e.getMessage());
            FileUpdateResult result = new FileUpdateResult();
            result.setSuccess(false);
            result.setMessage("파일 업데이트 실패: " + e.getMessage());
            return result;
        }
    }

    /**
     * 충돌 파일의 양쪽 버전을 조회합니다.
     */
    public ConflictFileVersions getConflictFileVersions(String accessToken, String owner, String repo,
                                                         String filename, String headRef, String baseRef) {
        log.info("Getting conflict file versions: {} (head: {}, base: {})", filename, headRef, baseRef);

        ConflictFileVersions versions = new ConflictFileVersions();
        versions.setFilename(filename);
        versions.setHeadRef(headRef);
        versions.setBaseRef(baseRef);

        // Head 브랜치 버전 조회
        FileContent headContent = getFileContent(accessToken, owner, repo, filename, headRef);
        if (headContent != null) {
            versions.setHeadContent(headContent.getContent());
            versions.setHeadSha(headContent.getSha());
        }

        // Base 브랜치 버전 조회
        FileContent baseContent = getFileContent(accessToken, owner, repo, filename, baseRef);
        if (baseContent != null) {
            versions.setBaseContent(baseContent.getContent());
            versions.setBaseSha(baseContent.getSha());
        }

        return versions;
    }

    /**
     * 파일 내용 정보
     */
    @lombok.Data
    public static class FileContent {
        private String path;
        private String sha;
        private int size;
        private String content;
    }

    /**
     * 파일 업데이트 결과
     */
    @lombok.Data
    public static class FileUpdateResult {
        private boolean success;
        private String commitSha;
        private String message;
        private String error;
    }

    /**
     * 충돌 파일의 양쪽 버전
     */
    @lombok.Data
    public static class ConflictFileVersions {
        private String filename;
        private String headRef;
        private String baseRef;
        private String headContent;
        private String baseContent;
        private String headSha;
        private String baseSha;
    }

    /**
     * 충돌이 해결된 파일로 머지 커밋을 생성합니다.
     * Git Data API를 사용하여 head 브랜치에 base 브랜치를 머지하는 커밋을 생성합니다.
     *
     * @param accessToken GitHub 액세스 토큰
     * @param owner 저장소 소유자
     * @param repo 저장소 이름
     * @param headRef head 브랜치 (PR 소스)
     * @param baseRef base 브랜치 (PR 대상)
     * @param filename 충돌 파일 경로
     * @param resolvedContent 해결된 파일 내용
     * @return 머지 커밋 결과
     */
    public FileUpdateResult createMergeCommitWithResolvedFile(
            String accessToken, String owner, String repo,
            String headRef, String baseRef,
            String filename, String resolvedContent) {

        log.info("Creating merge commit with resolved file: {} (merging {} into {})", filename, baseRef, headRef);

        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            headers.set("Content-Type", "application/json");

            // 1. head와 base 브랜치의 최신 커밋 SHA 가져오기
            String headCommitSha = getBranchCommitSha(accessToken, owner, repo, headRef);
            String baseCommitSha = getBranchCommitSha(accessToken, owner, repo, baseRef);

            if (headCommitSha == null || baseCommitSha == null) {
                FileUpdateResult result = new FileUpdateResult();
                result.setSuccess(false);
                result.setError("브랜치 커밋을 찾을 수 없습니다.");
                return result;
            }

            log.info("Head commit: {}, Base commit: {}", headCommitSha, baseCommitSha);

            // 2. head 커밋의 tree SHA 가져오기
            String headTreeSha = getCommitTreeSha(accessToken, owner, repo, headCommitSha);

            // 3. 해결된 파일 내용으로 blob 생성
            String blobSha = createBlob(accessToken, owner, repo, resolvedContent);
            log.info("Created blob: {}", blobSha);

            // 4. 새 tree 생성 (head tree 기반 + 해결된 파일)
            String newTreeSha = createTreeWithFile(accessToken, owner, repo, headTreeSha, filename, blobSha);
            log.info("Created tree: {}", newTreeSha);

            // 5. 머지 커밋 생성 (두 개의 부모: head와 base)
            String commitMessage = String.format("Merge branch '%s' into %s\n\nResolved conflict in %s via AI\nAI-assisted conflict resolution by Synodos",
                    baseRef, headRef, filename);

            String newCommitSha = createCommit(accessToken, owner, repo, commitMessage, newTreeSha,
                    new String[]{headCommitSha, baseCommitSha});
            log.info("Created merge commit: {}", newCommitSha);

            // 6. head 브랜치 ref 업데이트
            boolean refUpdated = updateBranchRef(accessToken, owner, repo, headRef, newCommitSha);

            if (refUpdated) {
                FileUpdateResult result = new FileUpdateResult();
                result.setSuccess(true);
                result.setCommitSha(newCommitSha);
                result.setMessage("머지 커밋이 생성되었습니다.");
                return result;
            } else {
                FileUpdateResult result = new FileUpdateResult();
                result.setSuccess(false);
                result.setError("브랜치 업데이트에 실패했습니다.");
                return result;
            }

        } catch (Exception e) {
            log.error("Failed to create merge commit: {}", e.getMessage(), e);
            FileUpdateResult result = new FileUpdateResult();
            result.setSuccess(false);
            result.setError("머지 커밋 생성 실패: " + e.getMessage());
            return result;
        }
    }

    /**
     * 브랜치의 최신 커밋 SHA를 가져옵니다.
     */
    private String getBranchCommitSha(String accessToken, String owner, String repo, String branch) {
        String apiUrl = String.format("https://api.github.com/repos/%s/%s/git/refs/heads/%s", owner, repo, branch);

        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(apiUrl, HttpMethod.GET, entity, String.class);
            JsonNode node = objectMapper.readTree(response.getBody());

            return node.path("object").path("sha").asText();
        } catch (Exception e) {
            log.error("Failed to get branch commit SHA: {}", e.getMessage());
            return null;
        }
    }

    /**
     * 커밋의 tree SHA를 가져옵니다.
     */
    private String getCommitTreeSha(String accessToken, String owner, String repo, String commitSha) {
        String apiUrl = String.format("https://api.github.com/repos/%s/%s/git/commits/%s", owner, repo, commitSha);

        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            HttpEntity<String> entity = new HttpEntity<>(headers);

            ResponseEntity<String> response = restTemplate.exchange(apiUrl, HttpMethod.GET, entity, String.class);
            JsonNode node = objectMapper.readTree(response.getBody());

            return node.path("tree").path("sha").asText();
        } catch (Exception e) {
            log.error("Failed to get commit tree SHA: {}", e.getMessage());
            return null;
        }
    }

    /**
     * 파일 내용으로 blob을 생성합니다.
     */
    private String createBlob(String accessToken, String owner, String repo, String content) throws Exception {
        String apiUrl = String.format("https://api.github.com/repos/%s/%s/git/blobs", owner, repo);

        HttpHeaders headers = createAuthHeaders(accessToken);
        headers.set("Content-Type", "application/json");

        Map<String, Object> body = new java.util.HashMap<>();
        body.put("content", content);
        body.put("encoding", "utf-8");

        String jsonBody = objectMapper.writeValueAsString(body);
        HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);

        ResponseEntity<String> response = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, String.class);
        JsonNode node = objectMapper.readTree(response.getBody());

        return node.path("sha").asText();
    }

    /**
     * 기존 tree 기반으로 파일을 추가/수정한 새 tree를 생성합니다.
     */
    private String createTreeWithFile(String accessToken, String owner, String repo,
                                       String baseTreeSha, String filename, String blobSha) throws Exception {
        String apiUrl = String.format("https://api.github.com/repos/%s/%s/git/trees", owner, repo);

        HttpHeaders headers = createAuthHeaders(accessToken);
        headers.set("Content-Type", "application/json");

        // tree 항목 생성
        Map<String, Object> treeItem = new java.util.HashMap<>();
        treeItem.put("path", filename);
        treeItem.put("mode", "100644"); // regular file
        treeItem.put("type", "blob");
        treeItem.put("sha", blobSha);

        Map<String, Object> body = new java.util.HashMap<>();
        body.put("base_tree", baseTreeSha);
        body.put("tree", new Object[]{treeItem});

        String jsonBody = objectMapper.writeValueAsString(body);
        HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);

        ResponseEntity<String> response = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, String.class);
        JsonNode node = objectMapper.readTree(response.getBody());

        return node.path("sha").asText();
    }

    /**
     * 새 커밋을 생성합니다.
     */
    private String createCommit(String accessToken, String owner, String repo,
                                 String message, String treeSha, String[] parentShas) throws Exception {
        String apiUrl = String.format("https://api.github.com/repos/%s/%s/git/commits", owner, repo);

        HttpHeaders headers = createAuthHeaders(accessToken);
        headers.set("Content-Type", "application/json");

        Map<String, Object> body = new java.util.HashMap<>();
        body.put("message", message);
        body.put("tree", treeSha);
        body.put("parents", parentShas);

        String jsonBody = objectMapper.writeValueAsString(body);
        HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);

        ResponseEntity<String> response = restTemplate.exchange(apiUrl, HttpMethod.POST, entity, String.class);
        JsonNode node = objectMapper.readTree(response.getBody());

        return node.path("sha").asText();
    }

    /**
     * 브랜치 ref를 새 커밋으로 업데이트합니다.
     */
    private boolean updateBranchRef(String accessToken, String owner, String repo,
                                     String branch, String commitSha) {
        String apiUrl = String.format("https://api.github.com/repos/%s/%s/git/refs/heads/%s", owner, repo, branch);

        try {
            HttpHeaders headers = createAuthHeaders(accessToken);
            headers.set("Content-Type", "application/json");

            Map<String, Object> body = new java.util.HashMap<>();
            body.put("sha", commitSha);
            body.put("force", false);

            String jsonBody = objectMapper.writeValueAsString(body);
            HttpEntity<String> entity = new HttpEntity<>(jsonBody, headers);

            restTemplate.exchange(apiUrl, HttpMethod.PATCH, entity, String.class);
            return true;
        } catch (Exception e) {
            log.error("Failed to update branch ref: {}", e.getMessage());
            return false;
        }
    }
}
