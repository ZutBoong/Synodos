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

    @Value("${gemini.api.key:}")
    private String apiKey;

    @Value("${gemini.api.model:gemini-1.5-flash}")
    private String model;

    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    private static final String GEMINI_API_URL = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s";

    private static final String ANALYSIS_PROMPT = """
        시니어 개발자로서 다음 코드를 간결하게 분석해주세요.

        ## 분석 항목 (각 2-3줄로 요약)
        1. **품질**: 가독성, 구조 평가
        2. **버그**: 잠재적 문제점
        3. **보안**: 취약점 여부
        4. **제안**: 개선 방안

        ## 규칙
        - 한국어로 답변
        - 800자 이내로 핵심만 작성
        - 문제없으면 "양호" 표시

        ## 코드 (%s)
        ```
        %s
        ```
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
            log.warn("Gemini API key is not configured");
            return "[AI 분석 오류] Gemini API 키가 설정되지 않았습니다. 관리자에게 문의하세요.";
        }

        // Limit code size to prevent token overflow
        if (code.length() > 15000) {
            code = code.substring(0, 15000) + "\n\n... (코드가 너무 길어 일부만 분석합니다)";
        }

        String prompt = String.format(ANALYSIS_PROMPT, filename, code);

        try {
            String url = String.format(GEMINI_API_URL, model, apiKey);

            // Build request body
            ObjectNode requestBody = objectMapper.createObjectNode();
            ArrayNode contents = requestBody.putArray("contents");
            ObjectNode content = contents.addObject();
            ArrayNode parts = content.putArray("parts");
            ObjectNode part = parts.addObject();
            part.put("text", prompt);

            // Add generation config
            ObjectNode generationConfig = requestBody.putObject("generationConfig");
            generationConfig.put("temperature", 0.3);
            generationConfig.put("maxOutputTokens", 1024);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);

            HttpEntity<String> entity = new HttpEntity<>(
                objectMapper.writeValueAsString(requestBody),
                headers
            );

            log.info("Calling Gemini API for code analysis...");
            ResponseEntity<String> response = restTemplate.postForEntity(url, entity, String.class);

            // Parse response
            JsonNode responseJson = objectMapper.readTree(response.getBody());
            JsonNode candidates = responseJson.path("candidates");

            if (candidates.isArray() && candidates.size() > 0) {
                JsonNode firstCandidate = candidates.get(0);
                JsonNode contentNode = firstCandidate.path("content");
                JsonNode partsNode = contentNode.path("parts");

                if (partsNode.isArray() && partsNode.size() > 0) {
                    String analysisResult = partsNode.get(0).path("text").asText();
                    log.info("Code analysis completed successfully");
                    return formatAnalysisResult(analysisResult, filename);
                }
            }

            log.warn("Unexpected Gemini API response format");
            return "[AI 분석 오류] API 응답을 파싱할 수 없습니다.";

        } catch (Exception e) {
            log.error("Failed to analyze code with Gemini: {}", e.getMessage());
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
}
