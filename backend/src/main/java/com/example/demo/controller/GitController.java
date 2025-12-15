package com.example.demo.controller;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.demo.model.GitRepo;
import com.example.demo.model.TaskCommit;
import com.example.demo.service.GitService;

@RestController
@RequestMapping("/api/git")
public class GitController {

	@Autowired
	private GitService service;

	// 저장소 연결
	@PostMapping("/repo")
	public ResponseEntity<GitRepo> connectRepo(@RequestBody GitRepo repo) {
		GitRepo connected = service.connectRepo(repo);
		if (connected != null) {
			return ResponseEntity.ok(connected);
		}
		return ResponseEntity.badRequest().build();
	}

	// 팀별 저장소 조회
	@GetMapping("/repo/team/{teamId}")
	public ResponseEntity<GitRepo> getRepoByTeam(@PathVariable int teamId) {
		GitRepo repo = service.getRepoByTeamId(teamId);
		if (repo != null) {
			// 토큰은 마스킹하여 반환
			repo.setAccessToken(maskToken(repo.getAccessToken()));
		}
		return ResponseEntity.ok(repo);
	}

	// 저장소 연결 해제
	@DeleteMapping("/repo/{repoId}")
	public ResponseEntity<Integer> disconnectRepo(@PathVariable int repoId) {
		int result = service.disconnectRepo(repoId);
		return ResponseEntity.ok(result);
	}

	// 연결 테스트
	@PostMapping("/repo/test")
	public ResponseEntity<Map<String, Object>> testConnection(@RequestBody GitRepo repo) {
		boolean success = service.testConnection(repo);
		Map<String, Object> result = new HashMap<>();
		result.put("success", success);
		result.put("message", success ? "연결 성공" : "연결 실패");
		return ResponseEntity.ok(result);
	}

	// 커밋 동기화
	@PostMapping("/sync/{teamId}")
	public ResponseEntity<Map<String, Object>> syncCommits(@PathVariable int teamId) {
		int count = service.syncCommits(teamId);
		Map<String, Object> result = new HashMap<>();
		result.put("synced", count);
		result.put("message", count + "개의 커밋이 동기화되었습니다.");
		return ResponseEntity.ok(result);
	}

	// 태스크별 커밋 목록
	@GetMapping("/commits/task/{taskId}")
	public ResponseEntity<List<TaskCommit>> getCommitsByTask(@PathVariable int taskId) {
		List<TaskCommit> commits = service.getCommitsByTaskId(taskId);
		return ResponseEntity.ok(commits);
	}

	// 토큰 마스킹
	private String maskToken(String token) {
		if (token == null || token.length() < 10) {
			return "****";
		}
		return token.substring(0, 4) + "****" + token.substring(token.length() - 4);
	}
}
