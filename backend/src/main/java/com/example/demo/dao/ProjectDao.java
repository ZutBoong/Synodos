package com.example.demo.dao;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import com.example.demo.model.Project;

@Mapper
public interface ProjectDao {
	int insert(Project project);
	List<Project> listByTeam(int teamId);
	Project content(int projectId);
	int update(Project project);
	int delete(int projectId);
}
