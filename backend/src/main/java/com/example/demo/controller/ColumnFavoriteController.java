package com.example.demo.controller;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.demo.model.ColumnFavorite;
import com.example.demo.service.ColumnFavoriteService;

@RestController
@RequestMapping("/api/column")
public class ColumnFavoriteController {

    @Autowired
    private ColumnFavoriteService service;

    // 즐겨찾기 추가
    @PostMapping("/{columnId}/favorite/{memberNo}")
    public ResponseEntity<?> addFavorite(
            @PathVariable int columnId,
            @PathVariable int memberNo) {
        int result = service.addFavorite(columnId, memberNo);
        return ResponseEntity.ok(Map.of("success", result > 0, "isFavorite", true));
    }

    // 즐겨찾기 삭제
    @DeleteMapping("/{columnId}/favorite/{memberNo}")
    public ResponseEntity<?> removeFavorite(
            @PathVariable int columnId,
            @PathVariable int memberNo) {
        int result = service.removeFavorite(columnId, memberNo);
        return ResponseEntity.ok(Map.of("success", result > 0, "isFavorite", false));
    }

    // 즐겨찾기 토글
    @PostMapping("/{columnId}/favorite/{memberNo}/toggle")
    public ResponseEntity<?> toggleFavorite(
            @PathVariable int columnId,
            @PathVariable int memberNo) {
        boolean isFavorite = service.toggleFavorite(columnId, memberNo);
        return ResponseEntity.ok(Map.of("success", true, "isFavorite", isFavorite));
    }

    // 즐겨찾기 여부 확인
    @GetMapping("/{columnId}/favorite/{memberNo}")
    public ResponseEntity<?> checkFavorite(
            @PathVariable int columnId,
            @PathVariable int memberNo) {
        boolean isFavorite = service.isFavorite(columnId, memberNo);
        return ResponseEntity.ok(Map.of("isFavorite", isFavorite));
    }

    // 멤버별 즐겨찾기 목록
    @GetMapping("/favorites/member/{memberNo}")
    public ResponseEntity<List<ColumnFavorite>> getFavoritesByMember(@PathVariable int memberNo) {
        return ResponseEntity.ok(service.getFavoritesByMember(memberNo));
    }
}
