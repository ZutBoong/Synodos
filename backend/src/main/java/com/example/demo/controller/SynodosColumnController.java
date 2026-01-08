package com.example.demo.controller;

import java.util.List;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.example.demo.model.SynodosColumn;
import com.example.demo.service.SynodosColumnService;

@RestController
@RequestMapping("/api")
public class SynodosColumnController {

	@Autowired
	private SynodosColumnService service;

	// 컬럼 생성
	@PostMapping("columnwrite")
	public Integer columnwrite(@RequestBody SynodosColumn column) {
		int result = service.insert(column);
		return result;
	}

	// 컬럼 목록 (전체)
	@GetMapping("columnlist")
	public List<SynodosColumn> columnlist() {
		List<SynodosColumn> list = service.list();
		return list;
	}

	// 팀별 컬럼 목록
	@GetMapping("columnlist/team/{teamId}")
	public List<SynodosColumn> columnlistByTeam(@PathVariable("teamId") int teamId) {
		List<SynodosColumn> list = service.listByTeam(teamId);
		return list;
	}

	// 컬럼 상세
	@GetMapping("columncontent/{columnId}")
	public SynodosColumn columncontent(@PathVariable("columnId") int columnId) {
		SynodosColumn result = service.content(columnId);
		return result;
	}

	// 컬럼 수정
	@PutMapping("columnupdate")
	public Integer columnupdate(@RequestBody SynodosColumn column) {
		int result = service.update(column);
		return result;
	}

	// 컬럼 삭제
	@DeleteMapping("columndelete/{columnId}")
	public Integer columndelete(@PathVariable("columnId") int columnId) {
		int result = service.delete(columnId);
		return result;
	}

	// 컬럼 위치 변경
	@PutMapping("columnposition")
	public Integer columnposition(@RequestBody SynodosColumn column) {
		int result = service.updatePosition(column);
		return result;
	}
}
