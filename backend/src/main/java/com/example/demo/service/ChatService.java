package com.example.demo.service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import com.example.demo.dao.ChatMessageDao;
import com.example.demo.model.ChatMessage;

@Service
public class ChatService {

	@Autowired
	private ChatMessageDao dao;

	@Autowired
	private SimpMessagingTemplate messagingTemplate;

	public ChatMessage sendMessage(ChatMessage message) {
		int result = dao.insert(message);
		if (result == 1) {
			// 생성된 메시지 조회 (발신자 정보 포함)
			ChatMessage created = dao.content(message.getMessageId());
			// WebSocket으로 팀원들에게 브로드캐스트
			broadcastMessage(created);
			return created;
		}
		return null;
	}

	public List<ChatMessage> getRecentMessages(int teamId, int limit) {
		Map<String, Object> params = new HashMap<>();
		params.put("teamId", teamId);
		params.put("limit", limit > 0 ? limit : 100);
		return dao.listRecentByTeam(params);
	}

	public List<ChatMessage> getMessagesBefore(int teamId, int beforeId, int limit) {
		Map<String, Object> params = new HashMap<>();
		params.put("teamId", teamId);
		params.put("beforeId", beforeId);
		params.put("limit", limit > 0 ? limit : 50);
		return dao.listByTeam(params);
	}

	public ChatMessage getMessage(int messageId) {
		return dao.content(messageId);
	}

	public int deleteMessage(int messageId) {
		return dao.delete(messageId);
	}

	private void broadcastMessage(ChatMessage message) {
		String destination = "/topic/team/" + message.getTeamId() + "/chat";
		messagingTemplate.convertAndSend(destination, message);
	}
}
