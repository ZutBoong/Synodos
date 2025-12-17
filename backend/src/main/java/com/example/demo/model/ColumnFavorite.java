package com.example.demo.model;

import org.apache.ibatis.type.Alias;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Alias("columnFavorite")
public class ColumnFavorite {
    private int columnId;
    private int memberNo;
    private LocalDateTime createdAt;

    // 조인용 필드
    private String columnTitle;
    private int teamId;
    private String teamName;
    private int projectId;
    private String projectName;
    private int position;
}
