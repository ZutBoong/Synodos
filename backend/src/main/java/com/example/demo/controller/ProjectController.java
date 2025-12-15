package com.example.demo.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.example.demo.model.Project;
import com.example.demo.service.ProjectService;

@RestController
@CrossOrigin("*")
@RequestMapping("/api/project")
public class ProjectController {

	@Autowired
	private ProjectService service;

	// 프로젝트 생성
	@PostMapping("/create")
	public Project create(@RequestBody Project project) {
		System.out.println("project create: " + project);
		int result = service.insert(project);
		if (result == 1) {
			return service.content(project.getProjectId());
		}
		return null;
	}

	// 팀별 프로젝트 목록
	@GetMapping("/list/{teamId}")
	public List<Project> listByTeam(@PathVariable("teamId") int teamId) {
		List<Project> list = service.listByTeam(teamId);
		System.out.println("project list by team: " + list);
		return list;
	}

	// 프로젝트 상세
	@GetMapping("/{projectId}")
	public Project content(@PathVariable("projectId") int projectId) {
		Project result = service.content(projectId);
		System.out.println("project content: " + result);
		return result;
	}

	// 프로젝트 수정
	@PutMapping("/update")
	public Integer update(@RequestBody Project project) {
		System.out.println("project update: " + project);
		return service.update(project);
	}

	// 프로젝트 삭제
	@DeleteMapping("/{projectId}")
	public Integer delete(@PathVariable("projectId") int projectId) {
		System.out.println("project delete: " + projectId);
		return service.delete(projectId);
	}
}
