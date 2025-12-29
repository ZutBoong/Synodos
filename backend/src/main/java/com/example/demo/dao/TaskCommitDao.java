package com.example.demo.dao;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import com.example.demo.model.TaskCommit;

@Mapper
public interface TaskCommitDao {

    int insert(TaskCommit taskCommit);

    int delete(@Param("id") int id);

    int deleteByTaskId(@Param("taskId") int taskId);

    TaskCommit findById(@Param("id") int id);

    List<TaskCommit> listByTask(@Param("taskId") int taskId);

    int countByTaskAndSha(@Param("taskId") int taskId, @Param("commitSha") String commitSha);
}
