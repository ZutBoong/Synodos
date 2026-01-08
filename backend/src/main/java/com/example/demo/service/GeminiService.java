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

    // ==================== 단계별 Git 충돌 해결 (새로운 방식) ====================

    private static final String STEP_BASED_CONFLICT_PROMPT = """
        당신은 시니어 개발자입니다. Git 머지 충돌을 단계별로 해결해야 합니다.

        ## 분석 방법
        1. 두 버전의 코드를 비교하여 충돌 지점을 찾으세요
        2. 각 충돌 지점을 독립적인 "결정 포인트"로 분리하세요
        3. 각 결정 포인트마다 2-4개의 선택지를 제시하세요
        4. 각 선택지가 코드에 미치는 영향을 명확히 설명하세요

        ## 결정 포인트 분류 기준 (AI가 판단)
        - import/의존성 변경
        - 함수/메소드 시그니처 변경
        - 로직 변경
        - 변수/상수 변경
        - 설정/구성 변경
        - 기타 (AI가 적절히 판단)

        ## 응답 형식 (반드시 JSON으로 응답하세요)
        ```json
        {
          "summary": "이 충돌에 대한 전체 요약 (1-2문장)",
          "totalSteps": 숫자,
          "steps": [
            {
              "stepNumber": 1,
              "category": "분류 (예: import, 함수 로직, 변수 등)",
              "title": "이 단계의 제목",
              "description": "이 결정이 필요한 이유 설명",
              "baseSnippet": "Base 브랜치의 해당 코드 부분",
              "headSnippet": "Head 브랜치의 해당 코드 부분",
              "choices": [
                {
                  "id": "A",
                  "label": "선택지 라벨 (짧게)",
                  "description": "이 선택의 상세 설명",
                  "code": "이 선택 시 적용될 코드",
                  "impact": "이 선택이 미치는 영향 (기능적 변화)"
                }
              ]
            }
          ]
        }
        ```

        ## 중요 규칙
        - 반드시 유효한 JSON으로 응답하세요
        - 단계는 코드 순서대로 배치하세요
        - 각 선택지의 code는 해당 부분만 포함하세요 (전체 파일 X)
        - impact는 사용자가 이해하기 쉽게 한국어로 작성하세요
        - 충돌이 단순하면 1단계만, 복잡하면 여러 단계로 나누세요
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

    // ==================== 단계별 충돌 해결 메소드 및 모델 ====================

    /**
     * Git 충돌을 단계별로 분석합니다.
     */
    public StepBasedResolutionResult resolveConflictStepBased(String filename, String baseRef, String headRef,
                                                               String baseContent, String headContent) {
        if (apiKey == null || apiKey.isEmpty()) {
            log.warn("OpenAI API key is not configured");
            StepBasedResolutionResult result = new StepBasedResolutionResult();
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

            두 버전을 분석하고 단계별 선택지를 JSON으로 제시해주세요.
            """,
            filename, baseRef, headRef,
            limitedBaseContent != null ? limitedBaseContent : "(파일 없음 - 새 파일)",
            limitedHeadContent != null ? limitedHeadContent : "(파일 없음 - 삭제됨)");

        try {
            log.info("Calling OpenAI API for step-based conflict resolution: {}", filename);
            String aiResponse = callOpenAI(STEP_BASED_CONFLICT_PROMPT, userPrompt, 0.2, 8192);

            if (aiResponse != null) {
                return parseStepBasedResolution(aiResponse, baseContent, headContent);
            }

            StepBasedResolutionResult result = new StepBasedResolutionResult();
            result.setSuccess(false);
            result.setError("AI 응답을 파싱할 수 없습니다.");
            return result;

        } catch (Exception e) {
            log.error("Failed to resolve conflict with OpenAI: {}", e.getMessage());
            StepBasedResolutionResult result = new StepBasedResolutionResult();
            result.setSuccess(false);
            result.setError("AI 충돌 해결 실패: " + e.getMessage());
            return result;
        }
    }

    /**
     * 단계별 AI 응답을 파싱합니다.
     */
    private StepBasedResolutionResult parseStepBasedResolution(String aiResponse, String baseContent, String headContent) {
        StepBasedResolutionResult result = new StepBasedResolutionResult();

        try {
            // JSON 블록 추출
            String jsonContent = aiResponse;
            if (aiResponse.contains("```json")) {
                int start = aiResponse.indexOf("```json") + 7;
                int end = aiResponse.indexOf("```", start);
                if (end > start) {
                    jsonContent = aiResponse.substring(start, end).trim();
                }
            } else if (aiResponse.contains("```")) {
                int start = aiResponse.indexOf("```") + 3;
                int end = aiResponse.indexOf("```", start);
                if (end > start) {
                    jsonContent = aiResponse.substring(start, end).trim();
                }
            }

            JsonNode root = objectMapper.readTree(jsonContent);

            result.setSummary(root.path("summary").asText("충돌 분석 결과"));
            result.setTotalSteps(root.path("totalSteps").asInt(1));
            result.setBaseContent(baseContent);
            result.setHeadContent(headContent);

            java.util.List<ConflictStep> steps = new java.util.ArrayList<>();
            JsonNode stepsNode = root.path("steps");

            if (stepsNode.isArray()) {
                for (JsonNode stepNode : stepsNode) {
                    ConflictStep step = new ConflictStep();
                    step.setStepNumber(stepNode.path("stepNumber").asInt());
                    step.setCategory(stepNode.path("category").asText("기타"));
                    step.setTitle(stepNode.path("title").asText());
                    step.setDescription(stepNode.path("description").asText());
                    step.setBaseSnippet(stepNode.path("baseSnippet").asText());
                    step.setHeadSnippet(stepNode.path("headSnippet").asText());

                    java.util.List<StepChoice> choices = new java.util.ArrayList<>();
                    JsonNode choicesNode = stepNode.path("choices");

                    if (choicesNode.isArray()) {
                        for (JsonNode choiceNode : choicesNode) {
                            StepChoice choice = new StepChoice();
                            choice.setId(choiceNode.path("id").asText());
                            choice.setLabel(choiceNode.path("label").asText());
                            choice.setDescription(choiceNode.path("description").asText());
                            choice.setCode(choiceNode.path("code").asText());
                            choice.setImpact(choiceNode.path("impact").asText());
                            choices.add(choice);
                        }
                    }

                    step.setChoices(choices);
                    steps.add(step);
                }
            }

            result.setSteps(steps);
            result.setSuccess(!steps.isEmpty());

            if (!result.isSuccess()) {
                result.setError("단계별 선택지를 추출할 수 없습니다.");
            }

        } catch (Exception e) {
            log.error("Failed to parse step-based resolution: {}", e.getMessage());
            result.setSuccess(false);
            result.setError("AI 응답 파싱 실패: " + e.getMessage());
        }

        return result;
    }

    /**
     * 사용자 선택을 기반으로 최종 코드를 생성합니다.
     */
    public FinalCodeResult generateFinalCode(String filename, String baseContent, String headContent,
                                              java.util.List<ConflictStep> steps,
                                              java.util.Map<Integer, String> selections) {
        if (apiKey == null || apiKey.isEmpty()) {
            FinalCodeResult result = new FinalCodeResult();
            result.setSuccess(false);
            result.setError("OpenAI API 키가 설정되지 않았습니다.");
            return result;
        }

        // 선택 정보를 문자열로 구성
        StringBuilder selectionsInfo = new StringBuilder();
        for (ConflictStep step : steps) {
            String selectedId = selections.get(step.getStepNumber());
            if (selectedId != null) {
                for (StepChoice choice : step.getChoices()) {
                    if (choice.getId().equals(selectedId)) {
                        selectionsInfo.append(String.format(
                            "- 단계 %d (%s): '%s' 선택 → 코드: %s\n",
                            step.getStepNumber(), step.getTitle(), choice.getLabel(), choice.getCode()
                        ));
                        break;
                    }
                }
            }
        }

        String systemPrompt = """
            당신은 시니어 개발자입니다. 사용자의 선택을 기반으로 최종 머지된 코드를 생성해야 합니다.

            ## 규칙
            1. 사용자가 각 단계에서 선택한 코드를 올바른 위치에 적용하세요
            2. 전체 파일의 완전한 코드를 출력하세요
            3. 코드만 출력하세요 (설명 없이)
            4. 코드 블록 마커(```) 없이 순수 코드만 출력하세요
            """;

        String userPrompt = String.format("""
            ## 파일: %s

            ## Base 브랜치 원본
            ```
            %s
            ```

            ## Head 브랜치 원본
            ```
            %s
            ```

            ## 사용자 선택
            %s

            위 선택을 반영하여 최종 머지된 전체 코드를 생성해주세요.
            """,
            filename,
            baseContent != null ? baseContent : "(없음)",
            headContent != null ? headContent : "(없음)",
            selectionsInfo.toString());

        try {
            String finalCode = callOpenAI(systemPrompt, userPrompt, 0.1, 8192);

            FinalCodeResult result = new FinalCodeResult();
            if (finalCode != null) {
                // 코드 블록 마커 제거
                finalCode = cleanCodeBlock(finalCode);
                result.setSuccess(true);
                result.setCode(finalCode);
            } else {
                result.setSuccess(false);
                result.setError("최종 코드 생성 실패");
            }
            return result;

        } catch (Exception e) {
            log.error("Failed to generate final code: {}", e.getMessage());
            FinalCodeResult result = new FinalCodeResult();
            result.setSuccess(false);
            result.setError("최종 코드 생성 실패: " + e.getMessage());
            return result;
        }
    }

    // ==================== 단계별 충돌 해결 모델 클래스 ====================

    /**
     * 단계별 충돌 해결 결과
     */
    @lombok.Data
    public static class StepBasedResolutionResult {
        private boolean success;
        private String summary;                             // 전체 요약
        private int totalSteps;                             // 총 단계 수
        private java.util.List<ConflictStep> steps;         // 단계 목록
        private String baseContent;                         // Base 브랜치 전체 코드
        private String headContent;                         // Head 브랜치 전체 코드
        private String error;                               // 에러 메시지
    }

    /**
     * 충돌 해결 단계
     */
    @lombok.Data
    public static class ConflictStep {
        private int stepNumber;                             // 단계 번호
        private String category;                            // 분류 (import, 함수 로직 등)
        private String title;                               // 단계 제목
        private String description;                         // 설명
        private String baseSnippet;                         // Base 브랜치 코드 조각
        private String headSnippet;                         // Head 브랜치 코드 조각
        private java.util.List<StepChoice> choices;         // 선택지 목록
    }

    /**
     * 단계별 선택지
     */
    @lombok.Data
    public static class StepChoice {
        private String id;                                  // 선택지 ID (A, B, C 등)
        private String label;                               // 짧은 라벨
        private String description;                         // 상세 설명
        private String code;                                // 이 선택 시 적용될 코드
        private String impact;                              // 이 선택이 미치는 영향
    }

    /**
     * 최종 코드 생성 결과
     */
    @lombok.Data
    public static class FinalCodeResult {
        private boolean success;
        private String code;                                // 최종 머지된 코드
        private String error;                               // 에러 메시지
    }
}
