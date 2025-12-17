package com.example.demo.controller;

import java.util.List;
import java.util.Map;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.example.demo.model.Notification;
import com.example.demo.service.NotificationService;

@RestController
@RequestMapping("/api/notification")
public class NotificationController {

    @Autowired
    private NotificationService service;

    // 알림 목록 조회
    @GetMapping("/list/{memberNo}")
    public ResponseEntity<List<Notification>> getNotifications(
            @PathVariable int memberNo,
            @RequestParam(defaultValue = "50") int limit) {
        return ResponseEntity.ok(service.getNotifications(memberNo, limit));
    }

    // 읽지 않은 알림 목록
    @GetMapping("/unread/{memberNo}")
    public ResponseEntity<List<Notification>> getUnreadNotifications(@PathVariable int memberNo) {
        return ResponseEntity.ok(service.getUnreadNotifications(memberNo));
    }

    // 읽지 않은 알림 수
    @GetMapping("/unread/count/{memberNo}")
    public ResponseEntity<?> getUnreadCount(@PathVariable int memberNo) {
        return ResponseEntity.ok(Map.of("count", service.getUnreadCount(memberNo)));
    }

    // 읽음 처리
    @PutMapping("/{notificationId}/read")
    public ResponseEntity<?> markAsRead(@PathVariable int notificationId) {
        int result = service.markAsRead(notificationId);
        return ResponseEntity.ok(Map.of("success", result > 0));
    }

    // 모두 읽음 처리
    @PutMapping("/read-all/{memberNo}")
    public ResponseEntity<?> markAllAsRead(@PathVariable int memberNo) {
        int result = service.markAllAsRead(memberNo);
        return ResponseEntity.ok(Map.of("success", true, "count", result));
    }

    // 알림 삭제
    @DeleteMapping("/{notificationId}")
    public ResponseEntity<?> deleteNotification(@PathVariable int notificationId) {
        int result = service.deleteNotification(notificationId);
        return ResponseEntity.ok(Map.of("success", result > 0));
    }

    // 모든 알림 삭제
    @DeleteMapping("/all/{memberNo}")
    public ResponseEntity<?> deleteAllNotifications(@PathVariable int memberNo) {
        int result = service.deleteAllNotifications(memberNo);
        return ResponseEntity.ok(Map.of("success", true, "count", result));
    }
}
