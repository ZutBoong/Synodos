package com.example.demo.dao;

import com.example.demo.model.TaskGitHubPR;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface TaskGitHubPRDao {

    void insert(TaskGitHubPR pr);

    void update(TaskGitHubPR pr);

    void delete(int id);

    void deleteByTaskId(int taskId);

    TaskGitHubPR findById(int id);

    TaskGitHubPR findByTaskId(int taskId);

    TaskGitHubPR findByPrNumber(@Param("teamId") int teamId, @Param("prNumber") int prNumber);

    List<TaskGitHubPR> listByTask(int taskId);

    List<TaskGitHubPR> listByTeam(int teamId);

    List<TaskGitHubPR> listOpenByTeam(int teamId);

    int countByTaskId(int taskId);

    int countByTeamAndPr(@Param("teamId") int teamId, @Param("prNumber") int prNumber);

    void updateState(@Param("teamId") int teamId, @Param("prNumber") int prNumber,
                     @Param("state") String state, @Param("merged") boolean merged,
                     @Param("mergedAt") String mergedAt);

    /**
     * 브랜치 이름으로 PR 조회
     */
    TaskGitHubPR findByHeadBranch(@Param("teamId") int teamId, @Param("headBranch") String headBranch);
}
