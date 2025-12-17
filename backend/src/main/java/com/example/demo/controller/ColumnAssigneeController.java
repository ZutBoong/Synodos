package com.example.demo.controller;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.demo.model.ColumnAssignee;
import com.example.demo.service.ColumnAssigneeService;

@RestController
@RequestMapping("/api/column")
public class ColumnAssigneeController {

    @Autowired
    private ColumnAssigneeService service;

    // 컬럼 담당자 추가
    @PostMapping("/{columnId}/assignees/{memberNo}")
    public ResponseEntity<?> addAssignee(
            @PathVariable int columnId,
            @PathVariable int memberNo) {
        int result = service.addAssignee(columnId, memberNo);
        return ResponseEntity.ok(Map.of("success", result > 0));
    }

    // 컬럼 담당자 삭제
    @DeleteMapping("/{columnId}/assignees/{memberNo}")
    public ResponseEntity<?> removeAssignee(
            @PathVariable int columnId,
            @PathVariable int memberNo) {
        int result = service.removeAssignee(columnId, memberNo);
        return ResponseEntity.ok(Map.of("success", result > 0));
    }

    // 컬럼 담당자 목록 조회
    @GetMapping("/{columnId}/assignees")
    public ResponseEntity<List<ColumnAssignee>> getAssignees(@PathVariable int columnId) {
        return ResponseEntity.ok(service.getAssigneesByColumn(columnId));
    }

    // 컬럼 담당자 일괄 설정
    @PutMapping("/{columnId}/assignees")
    public ResponseEntity<?> setAssignees(
            @PathVariable int columnId,
            @RequestBody Map<String, Object> body) {
        @SuppressWarnings("unchecked")
        List<Integer> memberNos = (List<Integer>) body.get("memberNos");
        Integer senderNo = (Integer) body.get("senderNo");

        if (memberNos == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "memberNos is required"));
        }

        // senderNo가 있으면 알림 포함하여 설정
        if (senderNo != null) {
            service.setAssigneesWithNotification(columnId, memberNos, senderNo);
        } else {
            service.setAssignees(columnId, memberNos);
        }
        return ResponseEntity.ok(Map.of("success", true));
    }

    // 멤버별 담당 컬럼 목록
    @GetMapping("/assignees/member/{memberNo}")
    public ResponseEntity<List<ColumnAssignee>> getColumnsByMember(@PathVariable int memberNo) {
        return ResponseEntity.ok(service.getColumnsByMember(memberNo));
    }
}
