package com.example.demo.model;

import java.sql.Date;
import org.apache.ibatis.type.Alias;
import lombok.Data;

@Data
@Alias("gitRepo")
public class GitRepo {
	private int repoId;
	private int teamId;
	private String provider;     // GITHUB, GITLAB 등
	private String repoOwner;    // owner 또는 organization
	private String repoName;     // repository 이름
	private String accessToken;  // Personal Access Token
	private Date createdAt;
}
