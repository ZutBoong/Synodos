package com.example.demo.model;

import java.time.LocalDateTime;
import org.apache.ibatis.type.Alias;
import lombok.Data;

@Data
@Alias("comment")
public class Comment {
	private int commentId;
	private int taskId;
	private int authorNo;
	private String authorName;     // JOIN으로 조회
	private String authorUserid;   // JOIN으로 조회
	private String content;
	private LocalDateTime createdAt;
	private LocalDateTime updatedAt;
	private Long githubCommentId;  // GitHub Issue Comment ID (동기화용)
}
