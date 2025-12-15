package com.example.demo.model;

import java.sql.Timestamp;
import org.apache.ibatis.type.Alias;
import lombok.Data;

@Data
@Alias("chatMessage")
public class ChatMessage {
	private int messageId;
	private int teamId;
	private int senderNo;
	private String senderName;     // JOIN으로 조회
	private String senderUserid;   // JOIN으로 조회
	private String content;
	private Timestamp sentAt;
}
