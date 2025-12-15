package com.example.demo.dao;

import java.util.List;
import java.util.Map;
import org.apache.ibatis.annotations.Mapper;
import com.example.demo.model.ChatMessage;

@Mapper
public interface ChatMessageDao {
	int insert(ChatMessage message);
	List<ChatMessage> listByTeam(Map<String, Object> params);
	List<ChatMessage> listRecentByTeam(Map<String, Object> params);
	ChatMessage content(int messageId);
	int delete(int messageId);
}
