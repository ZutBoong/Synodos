package com.example.demo.model;

import org.apache.ibatis.type.Alias;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Alias("columnAssignee")
public class ColumnAssignee {
    private int columnId;
    private int memberNo;
    private LocalDateTime assignedAt;

    // 조인용 필드
    private String memberName;
    private String memberUserid;
}
