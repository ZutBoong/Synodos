package com.example.demo.model;

import java.sql.Date;
import org.apache.ibatis.type.Alias;
import lombok.Data;

@Data
@Alias("taskCommit")
public class TaskCommit {
	private int taskId;
	private String commitSha;
	private String commitMessage;
	private String authorName;
	private String authorEmail;
	private Date committedAt;
	private String commitUrl;
}
