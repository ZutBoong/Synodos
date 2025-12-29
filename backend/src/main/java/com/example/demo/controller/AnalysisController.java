package com.example.demo.controller;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.example.demo.dto.AnalysisRequest;
import com.example.demo.model.Comment;
import com.example.demo.service.AnalysisService;

@Slf4j
@RestController
@RequestMapping("/api")
public class AnalysisController {

    @Autowired
    private AnalysisService analysisService;

    /**
     * GitHub URL의 코드를 AI로 분석하고 결과를 댓글로 저장합니다.
     *
     * POST /api/analysis
     * Body: { "taskId": 123, "githubUrl": "https://github.com/...", "requesterId": 5 }
     */
    @PostMapping("/analysis")
    public ResponseEntity<?> analyzeCode(@RequestBody AnalysisRequest request) {
        log.info("Analysis request received: taskId={}, url={}, requesterId={}",
            request.getTaskId(), request.getGithubUrl(), request.getRequesterId());

        if (request.getGithubUrl() == null || request.getGithubUrl().trim().isEmpty()) {
            return ResponseEntity.badRequest().body("GitHub URL을 입력해주세요.");
        }

        try {
            Comment result = analysisService.analyzeAndSaveAsComment(
                request.getTaskId(),
                request.getGithubUrl().trim(),
                request.getRequesterId()
            );

            if (result != null) {
                return ResponseEntity.ok(result);
            } else {
                return ResponseEntity.internalServerError().body("분석 결과 저장 실패");
            }
        } catch (RuntimeException e) {
            log.error("Analysis error: {}", e.getMessage());
            return ResponseEntity.status(503).body(e.getMessage());
        }
    }
}
