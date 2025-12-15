package com.example.demo.dao;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import com.example.demo.model.TaskCommit;

@Mapper
public interface TaskCommitDao {
	int insert(TaskCommit commit);
	List<TaskCommit> listByTaskId(int taskId);
	TaskCommit getByTaskAndSha(TaskCommit commit);
	int delete(TaskCommit commit);
	int deleteByTaskId(int taskId);
}
