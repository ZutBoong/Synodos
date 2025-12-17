package com.example.demo.model;

import org.apache.ibatis.type.Alias;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Alias("columnArchive")
public class ColumnArchive {
    private int archiveId;
    private int memberNo;
    private int originalColumnId;
    private Integer teamId;
    private String teamName;
    private Integer projectId;
    private String projectName;
    private String columnTitle;
    private Integer columnPosition;
    private String tasksSnapshot;  // JSON 문자열
    private String archiveNote;
    private LocalDateTime archivedAt;
}
