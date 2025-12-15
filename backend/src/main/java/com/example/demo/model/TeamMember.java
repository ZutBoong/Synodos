package com.example.demo.model;

import java.sql.Date;
import org.apache.ibatis.type.Alias;
import lombok.Data;

@Data
@Alias("teamMember")
public class TeamMember {
	private int teamId;
	private int memberNo;
	private String role; // LEADER, MEMBER
	private Date joinedAt;
	private String memberName; // 조회용
	private String memberUserid; // 조회용
}
