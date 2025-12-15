package com.example.demo.model;

import java.util.Date;

public class Project {
	private int projectId;
	private int teamId;
	private String projectName;
	private Date createdAt;

	public int getProjectId() {
		return projectId;
	}

	public void setProjectId(int projectId) {
		this.projectId = projectId;
	}

	public int getTeamId() {
		return teamId;
	}

	public void setTeamId(int teamId) {
		this.teamId = teamId;
	}

	public String getProjectName() {
		return projectName;
	}

	public void setProjectName(String projectName) {
		this.projectName = projectName;
	}

	public Date getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(Date createdAt) {
		this.createdAt = createdAt;
	}

	@Override
	public String toString() {
		return "Project [projectId=" + projectId + ", teamId=" + teamId + ", projectName=" + projectName + ", createdAt=" + createdAt + "]";
	}
}
