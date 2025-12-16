package com.example.demo.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.example.demo.model.FlowtaskColumn;
import com.example.demo.service.FlowtaskColumnService;

@RestController
@CrossOrigin("*")
@RequestMapping("/api")
public class FlowtaskColumnController {

	@Autowired
	private FlowtaskColumnService service;

	// 컬럼 생성
	@PostMapping("columnwrite")
	public Integer columnwrite(@RequestBody FlowtaskColumn column) {
		System.out.println("column insert: " + column);
		int result = service.insert(column);
		if (result == 1)
			System.out.println("컬럼 생성 성공");
		return result;
	}

	// 컬럼 목록 (전체)
	@GetMapping("columnlist")
	public List<FlowtaskColumn> columnlist() {
		List<FlowtaskColumn> list = service.list();
		System.out.println("columnlist: " + list);
		return list;
	}

	// 팀별 컬럼 목록
	@GetMapping("columnlist/team/{teamId}")
	public List<FlowtaskColumn> columnlistByTeam(@PathVariable("teamId") int teamId) {
		List<FlowtaskColumn> list = service.listByTeam(teamId);
		System.out.println("columnlist by team: " + list);
		return list;
	}

	// 프로젝트별 컬럼 목록
	@GetMapping("columnlist/project/{projectId}")
	public List<FlowtaskColumn> columnlistByProject(@PathVariable("projectId") int projectId) {
		List<FlowtaskColumn> list = service.listByProject(projectId);
		System.out.println("columnlist by project: " + list);
		return list;
	}

	// 컬럼 상세
	@GetMapping("columncontent/{columnId}")
	public FlowtaskColumn columncontent(@PathVariable("columnId") int columnId) {
		FlowtaskColumn result = service.content(columnId);
		System.out.println("column content: " + result);
		return result;
	}

	// 컬럼 수정
	@PutMapping("columnupdate")
	public Integer columnupdate(@RequestBody FlowtaskColumn column) {
		System.out.println("column update: " + column);
		int result = service.update(column);
		if (result == 1)
			System.out.println("컬럼 수정 성공");
		return result;
	}

	// 컬럼 삭제
	@DeleteMapping("columndelete/{columnId}")
	public Integer columndelete(@PathVariable("columnId") int columnId) {
		System.out.println("column delete: " + columnId);
		int result = service.delete(columnId);
		if (result == 1)
			System.out.println("컬럼 삭제 성공");
		return result;
	}

	// 컬럼 위치 변경
	@PutMapping("columnposition")
	public Integer columnposition(@RequestBody FlowtaskColumn column) {
		System.out.println("column position update: " + column);
		int result = service.updatePosition(column);
		return result;
	}
}
