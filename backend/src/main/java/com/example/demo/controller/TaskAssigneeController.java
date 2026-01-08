package com.example.demo.controller;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;
import com.example.demo.model.TaskAssignee;
import com.example.demo.service.TaskAssigneeService;

@RestController
@RequestMapping("/api")
public class TaskAssigneeController {

	@Autowired
	private TaskAssigneeService service;

	// 태스크별 담당자 목록 조회
	@GetMapping("task/{taskId}/assignees")
	public List<TaskAssignee> listAssignees(@PathVariable("taskId") int taskId) {
		List<TaskAssignee> list = service.listByTask(taskId);
		return list;
	}

	// 담당자 추가
	@PostMapping("task/{taskId}/assignees")
	public Integer addAssignee(
			@PathVariable("taskId") int taskId,
			@RequestBody TaskAssignee assignee,
			@RequestParam(value = "senderNo", required = false) Integer senderNo) {
		assignee.setTaskId(taskId);
		int result;
		if (senderNo != null) {
			result = service.addAssigneeWithNotification(assignee, senderNo);
		} else {
			result = service.addAssignee(assignee);
		}
		return result;
	}

	// 담당자 삭제
	@DeleteMapping("task/{taskId}/assignees/{memberNo}")
	public Integer removeAssignee(
			@PathVariable("taskId") int taskId,
			@PathVariable("memberNo") int memberNo) {
		int result = service.removeAssignee(taskId, memberNo);
		return result;
	}

	// 담당자 일괄 변경
	@SuppressWarnings("unchecked")
	@PutMapping("task/{taskId}/assignees")
	public Integer updateAssignees(
			@PathVariable("taskId") int taskId,
			@RequestBody Map<String, Object> body,
			@RequestParam(value = "senderNo", required = false) Integer senderNo) {
		List<Integer> memberNos = (List<Integer>) body.get("memberNos");
		int result;
		if (senderNo != null) {
			result = service.updateAssigneesWithNotification(taskId, memberNos, senderNo);
		} else {
			result = service.updateAssignees(taskId, memberNos, senderNo);
		}
		return result;
	}

	// 멤버별 담당 태스크 목록 (내 이슈)
	@GetMapping("assignees/member/{memberNo}")
	public List<TaskAssignee> listByMember(@PathVariable("memberNo") int memberNo) {
		List<TaskAssignee> list = service.listByMember(memberNo);
		return list;
	}
}
