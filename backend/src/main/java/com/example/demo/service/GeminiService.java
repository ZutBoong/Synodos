package com.example.demo.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;

@Slf4j
@Service
public class GeminiService {

    @Value("${openai.api.key:}")
    private String apiKey;

    @Value("${openai.api.model:gpt-4o-mini}")
    private String model;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    private static final String OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

    private static final String ANALYSIS_SYSTEM_PROMPT = """
        당신은 시니어 개발자입니다. 코드를 간결하게 분석해주세요.

        ## 분석 항목 (각 2-3줄로 요약)
        1. **품질**: 가독성, 구조 평가
        2. **버그**: 잠재적 문제점
        3. **보안**: 취약점 여부
        4. **제안**: 개선 방안

        ## 규칙
        - 한국어로 답변
        - 800자 이내로 핵심만 작성
        - 문제없으면 "양호" 표시
        """;

    public GeminiService() {
        this.restTemplate = new RestTemplate();
        this.objectMapper = new ObjectMapper();
    }

    /**
     * 코드를 분석합니다.
     */
    public String analyzeCode(String code, String filename) {
        if (apiKey == null || apiKey.isEmpty()) {
            log.warn("OpenAI API key is not configured");
            return "[AI 분석 오류] OpenAI API 키가 설정되지 않았습니다. 관리자에게 문의하세요.";
        }

        // Limit code size to prevent token overflow
        if (code.length() > 15000) {
            code = code.substring(0, 15000) + "\n\n... (코드가 너무 길어 일부만 분석합니다)";
        }

        String userPrompt = String.format("## 코드 (%s)\n```\n%s\n```", filename, code);

        try {
            String responseText = callOpenAI(ANALYSIS_SYSTEM_PROMPT, userPrompt, 0.3, 1024);
            if (responseText != null) {
                log.info("Code analysis completed successfully");
                return formatAnalysisResult(responseText, filename);
            }

            log.warn("Unexpected OpenAI API response format");
            return "[AI 분석 오류] API 응답을 파싱할 수 없습니다.";

        } catch (Exception e) {
            log.error("Failed to analyze code with OpenAI: {}", e.getMessage());
            return "[AI 분석 오류] " + e.getMessage();
        }
    }

    /**
     * 분석 결과에 헤더를 추가합니다.
     */
    private String formatAnalysisResult(String result, String filename) {
        StringBuilder sb = new StringBuilder();
        sb.append("🤖 **AI 코드 분석 결과**\n");
        sb.append("📁 파일: `").append(filename).append("`\n\n");

        // 결과가 너무 길면 먼저 자르기
        if (result.length() > 1800) {
            result = result.substring(0, 1800);
        }
        sb.append(result);

        // Ensure result fits in comment field (2000 chars)
        if (sb.length() > 1900) {
            return sb.substring(0, 1900) + "\n\n... (생략됨)";
        }

        return sb.toString();
    }

    // ==================== Git 충돌 해결 ====================

    private static final String CONFLICT_SYSTEM_PROMPT = """
        당신은 시니어 개발자입니다. Git 머지 충돌을 해결해야 합니다.
        3가지 해결 옵션을 제시해주세요.

        ## 요청사항
        1. 두 버전의 변경 의도를 분석하세요
        2. 3가지 다른 해결 방법을 제시하세요:
           - 옵션1: 양쪽 통합 (두 변경사항 모두 유지)
           - 옵션2: Head 브랜치 우선 (PR의 새 기능 유지)
           - 옵션3: Base 브랜치 우선 (기존 코드 유지)

        ## 응답 형식 (반드시 이 형식을 따르세요)
        ---ANALYSIS---
        (충돌 분석 내용을 한국어로 2-3줄)

        ---OPTION1_TITLE---
        양쪽 통합
        ---OPTION1_DESC---
        (이 옵션에 대한 설명 1줄)
        ---OPTION1_CODE---
        (해결된 전체 코드)

        ---OPTION2_TITLE---
        Head 브랜치 우선
        ---OPTION2_DESC---
        (이 옵션에 대한 설명 1줄)
        ---OPTION2_CODE---
        (해결된 전체 코드)

        ---OPTION3_TITLE---
        Base 브랜치 우선
        ---OPTION3_DESC---
        (이 옵션에 대한 설명 1줄)
        ---OPTION3_CODE---
        (해결된 전체 코드)
        """;

    /**
     * Git 충돌을 AI로 해결합니다.
     */
    public ConflictResolutionResult resolveConflict(String filename, String baseRef, String headRef,
                                                     String baseContent, String headContent) {
        if (apiKey == null || apiKey.isEmpty()) {
            log.warn("OpenAI API key is not configured");
            ConflictResolutionResult result = new ConflictResolutionResult();
            result.setSuccess(false);
            result.setError("OpenAI API 키가 설정되지 않았습니다.");
            return result;
        }

        // 코드 크기 제한
        String limitedBaseContent = baseContent;
        String limitedHeadContent = headContent;
        if (baseContent != null && baseContent.length() > 10000) {
            limitedBaseContent = baseContent.substring(0, 10000) + "\n... (truncated)";
        }
        if (headContent != null && headContent.length() > 10000) {
            limitedHeadContent = headContent.substring(0, 10000) + "\n... (truncated)";
        }

        String userPrompt = String.format("""
            ## 상황
            - 파일: %s
            - Base 브랜치 (%s): 머지 대상 브랜치
            - Head 브랜치 (%s): PR 소스 브랜치

            ## Base 브랜치 버전
            ```
            %s
            ```

            ## Head 브랜치 버전
            ```
            %s
            ```
            """,
            filename, baseRef, headRef,
            limitedBaseContent != null ? limitedBaseContent : "(파일 없음 - 새 파일)",
            limitedHeadContent != null ? limitedHeadContent : "(파일 없음 - 삭제됨)");

        try {
            log.info("Calling OpenAI API for conflict resolution: {}", filename);
            String aiResponse = callOpenAI(CONFLICT_SYSTEM_PROMPT, userPrompt, 0.2, 8192);

            if (aiResponse != null) {
                return parseConflictResolution(aiResponse);
            }

            ConflictResolutionResult result = new ConflictResolutionResult();
            result.setSuccess(false);
            result.setError("AI 응답을 파싱할 수 없습니다.");
            return result;

        } catch (Exception e) {
            log.error("Failed to resolve conflict with OpenAI: {}", e.getMessage());
            ConflictResolutionResult result = new ConflictResolutionResult();
            result.setSuccess(false);
            result.setError("AI 충돌 해결 실패: " + e.getMessage());
            return result;
        }
    }

    /**
     * OpenAI API를 호출합니다.
     */
    private String callOpenAI(String systemPrompt, String userPrompt, double temperature, int maxTokens) throws Exception {
        ObjectNode requestBody = objectMapper.createObjectNode();
        requestBody.put("model", model);
        requestBody.put("temperature", temperature);
        requestBody.put("max_tokens", maxTokens);

        ArrayNode messages = requestBody.putArray("messages");

        // System message
        ObjectNode systemMessage = messages.addObject();
        systemMessage.put("role", "system");
        systemMessage.put("content", systemPrompt);

        // User message
        ObjectNode userMessage = messages.addObject();
        userMessage.put("role", "user");
        userMessage.put("content", userPrompt);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.setBearerAuth(apiKey);

        HttpEntity<String> entity = new HttpEntity<>(
            objectMapper.writeValueAsString(requestBody),
            headers
        );

        ResponseEntity<String> response = restTemplate.postForEntity(OPENAI_API_URL, entity, String.class);

        // Parse response
        JsonNode responseJson = objectMapper.readTree(response.getBody());
        JsonNode choices = responseJson.path("choices");

        if (choices.isArray() && choices.size() > 0) {
            JsonNode firstChoice = choices.get(0);
            JsonNode message = firstChoice.path("message");
            return message.path("content").asText();
        }

        return null;
    }

    /**
     * AI 응답을 파싱합니다.
     */
    private ConflictResolutionResult parseConflictResolution(String aiResponse) {
        ConflictResolutionResult result = new ConflictResolutionResult();

        try {
            // 분석 내용 추출
            String analysis = extractSection(aiResponse, "---ANALYSIS---", "---OPTION1_TITLE---");
            result.setAnalysis(analysis != null ? analysis.trim() : "분석 내용 없음");

            // 3가지 옵션 추출
            java.util.List<ResolutionOption> options = new java.util.ArrayList<>();

            for (int i = 1; i <= 3; i++) {
                String titleMarker = "---OPTION" + i + "_TITLE---";
                String descMarker = "---OPTION" + i + "_DESC---";
                String codeMarker = "---OPTION" + i + "_CODE---";
                String nextMarker = i < 3 ? "---OPTION" + (i + 1) + "_TITLE---" : null;

                String title = extractSection(aiResponse, titleMarker, descMarker);
                String desc = extractSection(aiResponse, descMarker, codeMarker);
                String code = extractSection(aiResponse, codeMarker, nextMarker);

                if (code != null) {
                    code = cleanCodeBlock(code);
                }

                if (title != null && code != null && !code.isEmpty()) {
                    ResolutionOption option = new ResolutionOption();
                    option.setTitle(title.trim());
                    option.setDescription(desc != null ? desc.trim() : "");
                    option.setCode(code);
                    options.add(option);
                }
            }

            result.setOptions(options);
            result.setSuccess(!options.isEmpty());

            if (!result.isSuccess()) {
                result.setError("해결 옵션을 추출할 수 없습니다.");
            }

        } catch (Exception e) {
            result.setSuccess(false);
            result.setError("AI 응답 파싱 실패: " + e.getMessage());
        }

        return result;
    }

    /**
     * 코드 블록 마커를 제거합니다.
     */
    private String cleanCodeBlock(String code) {
        if (code == null) return null;
        code = code.trim();
        if (code.startsWith("```")) {
            int firstNewline = code.indexOf('\n');
            if (firstNewline > 0) {
                code = code.substring(firstNewline + 1);
            }
        }
        if (code.endsWith("```")) {
            code = code.substring(0, code.length() - 3);
        }
        return code.trim();
    }

    /**
     * 응답에서 특정 섹션을 추출합니다.
     */
    private String extractSection(String text, String startMarker, String endMarker) {
        int startIdx = text.indexOf(startMarker);
        if (startIdx < 0) return null;

        startIdx += startMarker.length();

        int endIdx;
        if (endMarker != null) {
            endIdx = text.indexOf(endMarker, startIdx);
            if (endIdx < 0) endIdx = text.length();
        } else {
            endIdx = text.length();
        }

        return text.substring(startIdx, endIdx);
    }

    /**
     * 해결 옵션
     */
    @lombok.Data
    public static class ResolutionOption {
        private String title;           // 옵션 제목 (예: "양쪽 통합")
        private String description;     // 옵션 설명
        private String code;            // 해결된 코드
    }

    /**
     * 충돌 해결 결과
     */
    @lombok.Data
    public static class ConflictResolutionResult {
        private boolean success;
        private String analysis;                            // 충돌 분석 내용
        private java.util.List<ResolutionOption> options;   // 해결 옵션 목록
        private String error;                               // 에러 메시지
    }
}
