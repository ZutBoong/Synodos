package com.example.demo.model;

import java.sql.Date;
import org.apache.ibatis.type.Alias;
import lombok.Data;

@Data
@Alias("team")
public class Team {
	private int teamId;
	private String teamName;
	private String teamCode;
	private int leaderNo;
	private String leaderName; // 조회용
	private String description; // 팀 설명
	private String githubRepoUrl; // GitHub 저장소 URL
	private String githubAccessToken; // GitHub Personal Access Token
	private Boolean githubIssueSyncEnabled; // GitHub Issue 동기화 활성화 여부
	private Integer githubDefaultColumnId; // Issue에서 Task 생성 시 기본 컬럼
	private Date createdAt;
}
