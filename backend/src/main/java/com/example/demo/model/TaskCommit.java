package com.example.demo.model;

import java.sql.Timestamp;
import org.apache.ibatis.type.Alias;
import lombok.Data;

@Data
@Alias("taskCommit")
public class TaskCommit {
    private int id;
    private int taskId;
    private String commitSha;
    private String commitMessage;
    private String commitAuthor;
    private Timestamp commitDate;
    private String githubUrl;
    private Integer linkedBy;
    private Timestamp linkedAt;

    // 조회용 필드
    private String linkedByName;
}
