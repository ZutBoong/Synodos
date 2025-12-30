package com.example.demo.dao;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

@Mapper
public interface DashboardMapper {

    @Select("""
        SELECT COUNT(*)
        FROM task t
        JOIN columns c ON t.column_id = c.column_id
        WHERE c.team_id = #{teamId}
    """)
    long countTotalTasks(@Param("teamId") Long teamId);

    @Select("""
        SELECT COUNT(*)
        FROM task t
        JOIN columns c ON t.column_id = c.column_id
        WHERE c.team_id = #{teamId}
          AND t.workflow_status = 'DONE'
    """)
    long countCompletedTasks(@Param("teamId") Long teamId);

    @Select("""
        SELECT COUNT(*)
        FROM task t
        JOIN columns c ON t.column_id = c.column_id
        WHERE c.team_id = #{teamId}
          AND t.workflow_status <> 'DONE'
    """)
    long countIncompleteTasks(@Param("teamId") Long teamId);

    @Select("""
        SELECT COUNT(*)
        FROM task t
        JOIN columns c ON t.column_id = c.column_id
        WHERE c.team_id = #{teamId}
          AND t.workflow_status <> 'DONE'
          AND t.due_date IS NOT NULL
          AND t.due_date < NOW()
    """)
    long countOverdueTasks(@Param("teamId") Long teamId);
}