package com.example.demo.model;

import java.sql.Date;
import java.time.LocalDateTime;
import java.util.List;
import org.apache.ibatis.type.Alias;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Alias("task")
public class Task {
	private int taskId;

	@Positive(message = "컬럼 ID는 양수여야 합니다")
	private int columnId;

	@NotBlank(message = "제목은 필수입니다")
	@Size(max = 200, message = "제목은 200자를 초과할 수 없습니다")
	private String title;

	@Size(max = 5000, message = "설명은 5000자를 초과할 수 없습니다")
	private String description;
	private int position;
	private Date createdAt;

	// Issue Tracker 확장 필드
	private Integer assigneeNo;      // 담당자 (FK to Member.no, nullable) - 레거시 유지
	private String assigneeName;     // 담당자 이름 (JOIN으로 조회)
	private String priority;         // CRITICAL, HIGH, MEDIUM, LOW
	private Date startDate;          // 시작일 (타임라인용)
	private Date dueDate;            // 마감일

	// 워크플로우 필드
	private String workflowStatus;   // WAITING, IN_PROGRESS, REVIEW, DONE, REJECTED
	private String rejectionReason;  // 반려 사유
	private LocalDateTime rejectedAt; // 반려 시간
	private Integer rejectedBy;      // 반려자 (FK to Member.no)

	// 태스크 생성자 (알림용)
	private Integer createdBy;       // 생성자 (FK to Member.no)

	// 조인용 필드
	private Integer teamId;          // 팀 ID (JOIN으로 조회)

	// 복수 담당자 목록
	private List<TaskAssignee> assignees;

	// 복수 검증자 목록 (NEW)
	private List<TaskVerifier> verifiers;
}
