package com.example.demo.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.example.demo.model.Comment;
import com.example.demo.service.GitHubService.GitHubContent;

@Slf4j
@Service
public class AnalysisService {

    @Autowired
    private GitHubService gitHubService;

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private CommentService commentService;

    /**
     * GitHub URL에서 코드를 가져와 AI로 분석하고 결과를 댓글로 저장합니다.
     */
    public Comment analyzeAndSaveAsComment(int taskId, String githubUrl, int requesterId) {
        log.info("Starting code analysis for task {} from URL: {}", taskId, githubUrl);

        try {
            // Step 1: GitHub에서 코드 가져오기
            GitHubContent content = gitHubService.fetchCodeFromUrl(githubUrl);
            log.info("Fetched code from GitHub: {} ({} chars)", content.filename, content.code.length());

            // Step 2: Gemini로 코드 분석
            String analysisResult = geminiService.analyzeCode(content.code, content.filename);
            log.info("Code analysis completed");

            // Step 3: 분석 결과를 댓글로 저장 (2000자 제한)
            if (analysisResult.length() > 1900) {
                analysisResult = analysisResult.substring(0, 1900) + "\n\n...(생략)";
            }
            Comment comment = new Comment();
            comment.setTaskId(taskId);
            comment.setAuthorNo(requesterId);
            comment.setContent(analysisResult);

            Comment savedComment = commentService.insert(comment);
            log.info("Analysis result saved as comment {}", savedComment != null ? savedComment.getCommentId() : "null");

            return savedComment;

        } catch (IllegalArgumentException e) {
            log.error("Invalid GitHub URL: {}", e.getMessage());
            throw new RuntimeException("GitHub URL 오류: " + e.getMessage());

        } catch (Exception e) {
            log.error("Analysis failed: {}", e.getMessage());
            // 429 에러 등은 댓글로 저장하지 않고 예외로 전달
            throw new RuntimeException("분석 실패: " + e.getMessage());
        }
    }

    /**
     * 에러 메시지를 댓글로 저장합니다.
     */
    private Comment saveErrorComment(int taskId, int requesterId, String errorMessage) {
        // 에러 메시지가 너무 길면 자르기
        if (errorMessage.length() > 500) {
            errorMessage = errorMessage.substring(0, 500) + "...";
        }
        Comment comment = new Comment();
        comment.setTaskId(taskId);
        comment.setAuthorNo(requesterId);
        comment.setContent(errorMessage);
        return commentService.insert(comment);
    }
}
