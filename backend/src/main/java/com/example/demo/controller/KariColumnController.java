package com.example.demo.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.example.demo.model.KariColumn;
import com.example.demo.service.KariColumnService;

@RestController
@CrossOrigin("*")
@RequestMapping("/api")
public class KariColumnController {

	@Autowired
	private KariColumnService service;

	// 컬럼 생성
	@PostMapping("columnwrite")
	public Integer columnwrite(@RequestBody KariColumn column) {
		System.out.println("column insert: " + column);
		int result = service.insert(column);
		if (result == 1)
			System.out.println("컬럼 생성 성공");
		return result;
	}

	// 컬럼 목록 (전체)
	@GetMapping("columnlist")
	public List<KariColumn> columnlist() {
		List<KariColumn> list = service.list();
		System.out.println("columnlist: " + list);
		return list;
	}

	// 팀별 컬럼 목록
	@GetMapping("columnlist/team/{teamId}")
	public List<KariColumn> columnlistByTeam(@PathVariable("teamId") int teamId) {
		List<KariColumn> list = service.listByTeam(teamId);
		System.out.println("columnlist by team: " + list);
		return list;
	}

	// 프로젝트별 컬럼 목록
	@GetMapping("columnlist/project/{projectId}")
	public List<KariColumn> columnlistByProject(@PathVariable("projectId") int projectId) {
		List<KariColumn> list = service.listByProject(projectId);
		System.out.println("columnlist by project: " + list);
		return list;
	}

	// 컬럼 상세
	@GetMapping("columncontent/{columnId}")
	public KariColumn columncontent(@PathVariable("columnId") int columnId) {
		KariColumn result = service.content(columnId);
		System.out.println("column content: " + result);
		return result;
	}

	// 컬럼 수정
	@PutMapping("columnupdate")
	public Integer columnupdate(@RequestBody KariColumn column) {
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
	public Integer columnposition(@RequestBody KariColumn column) {
		System.out.println("column position update: " + column);
		int result = service.updatePosition(column);
		return result;
	}
}
