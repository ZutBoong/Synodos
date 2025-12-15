package com.example.demo.service;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.example.demo.dao.ProjectDao;
import com.example.demo.model.Project;

@Service
public class ProjectService {

	@Autowired
	private ProjectDao dao;

	public int insert(Project project) {
		return dao.insert(project);
	}

	public List<Project> listByTeam(int teamId) {
		return dao.listByTeam(teamId);
	}

	public Project content(int projectId) {
		return dao.content(projectId);
	}

	public int update(Project project) {
		return dao.update(project);
	}

	public int delete(int projectId) {
		return dao.delete(projectId);
	}
}
