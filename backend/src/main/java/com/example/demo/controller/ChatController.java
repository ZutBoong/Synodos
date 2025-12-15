package com.example.demo.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.demo.model.ChatMessage;
import com.example.demo.service.ChatService;

@RestController
@RequestMapping("/api/chat")
public class ChatController {

	@Autowired
	private ChatService service;

	// 메시지 전송
	@PostMapping("/send")
	public ResponseEntity<ChatMessage> sendMessage(@RequestBody ChatMessage message) {
		ChatMessage created = service.sendMessage(message);
		if (created != null) {
			return ResponseEntity.ok(created);
		}
		return ResponseEntity.badRequest().build();
	}

	// 팀별 최근 메시지 조회 (기본 100개)
	@GetMapping("/team/{teamId}")
	public ResponseEntity<List<ChatMessage>> getRecentMessages(
			@PathVariable int teamId,
			@RequestParam(defaultValue = "100") int limit) {
		List<ChatMessage> messages = service.getRecentMessages(teamId, limit);
		return ResponseEntity.ok(messages);
	}

	// 이전 메시지 로드 (무한 스크롤용)
	@GetMapping("/team/{teamId}/before/{messageId}")
	public ResponseEntity<List<ChatMessage>> getMessagesBefore(
			@PathVariable int teamId,
			@PathVariable int messageId,
			@RequestParam(defaultValue = "50") int limit) {
		List<ChatMessage> messages = service.getMessagesBefore(teamId, messageId, limit);
		return ResponseEntity.ok(messages);
	}

	// 메시지 삭제
	@DeleteMapping("/{messageId}")
	public ResponseEntity<Integer> deleteMessage(@PathVariable int messageId) {
		int result = service.deleteMessage(messageId);
		return ResponseEntity.ok(result);
	}
}
