package com.example.demo.model;

import lombok.Data;
import org.apache.ibatis.type.Alias;

import java.time.LocalDateTime;

/**
 * Synodos Task와 GitHub Pull Request 간의 매핑 엔티티
 */
@Data
@Alias("taskGitHubPR")
public class TaskGitHubPR {
    private int id;
    private int taskId;
    private int teamId;
    private int prNumber;
    private long prId;
    private String prTitle;
    private String prUrl;
    private String prState;        // open, closed
    private boolean merged;
    private String headBranch;     // 소스 브랜치
    private String baseBranch;     // 대상 브랜치 (main)
    private String mergedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    // Join fields
    private String taskTitle;
    private String teamName;
    private Integer issueNumber;   // 연결된 Issue 번호

    // Transient fields (not stored in DB)
    private transient boolean fromGitHub;  // GitHub에서 발견된 PR (Synodos에서 생성하지 않음)

    // 상태 상수
    public static final String STATE_OPEN = "open";
    public static final String STATE_CLOSED = "closed";

    /**
     * PR이 머지 가능한 상태인지 확인
     */
    public boolean isOpen() {
        return STATE_OPEN.equals(prState);
    }

    /**
     * PR이 머지되었는지 확인
     */
    public boolean isMergedOrClosed() {
        return merged || STATE_CLOSED.equals(prState);
    }
}
