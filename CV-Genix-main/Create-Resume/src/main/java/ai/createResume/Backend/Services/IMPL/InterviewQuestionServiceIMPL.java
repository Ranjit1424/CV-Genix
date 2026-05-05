package ai.createResume.Backend.Services.IMPL;

import ai.createResume.Backend.Services.InterviewQuestionService;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

@Service
public class InterviewQuestionServiceIMPL implements InterviewQuestionService {

    private static final int AI_TIMEOUT_SECONDS = 25;
    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();

    private final ChatClient chatClient;
    private final HttpClient httpClient;
    private final boolean externalApiEnabled;
    private final String externalApiUrl;
    private final String externalApiKey;
    private final String externalApiModel;
    private final double externalApiTemperature;

    public InterviewQuestionServiceIMPL(
            ChatClient.Builder builder,
            @Value("${app.interview.external-api.enabled:false}") boolean externalApiEnabled,
            @Value("${app.interview.external-api.url:}") String externalApiUrl,
            @Value("${app.interview.external-api.key:}") String externalApiKey,
            @Value("${app.interview.external-api.model:}") String externalApiModel,
            @Value("${app.interview.external-api.temperature:0.8}") double externalApiTemperature
    ) {
        this.chatClient = builder.build();
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(8))
                .build();
        this.externalApiEnabled = externalApiEnabled;
        this.externalApiUrl = clean(externalApiUrl);
        this.externalApiKey = clean(externalApiKey);
        this.externalApiModel = clean(externalApiModel);
        this.externalApiTemperature = Math.max(0.1, Math.min(1.2, externalApiTemperature));
    }

    @Override
    public Map<String, Object> generateInterviewQuestions(
            String candidateDescription,
            String targetRole,
            String jobDescription,
            Integer questionCount,
            String interviewStyle,
            String interviewSituation
    ) throws IOException {
        String normalizedCandidateDescription = clean(candidateDescription);
        String normalizedTargetRole = clean(targetRole);
        String normalizedJobDescription = clean(jobDescription);
        String normalizedInterviewStyle = clean(interviewStyle);
        String normalizedInterviewSituation = clean(interviewSituation);
        String variationToken = Long.toString(System.nanoTime());
        int safeQuestionCount = questionCount == null ? 8 : Math.max(5, Math.min(12, questionCount));

        if (normalizedCandidateDescription.length() < 20
                && normalizedJobDescription.length() < 20
                && normalizedTargetRole.isBlank()) {
            return buildMockInterviewResponse(
                    "Please provide a fuller resume summary, role, or job description for tailored questions.",
                    normalizedTargetRole,
                    normalizedInterviewStyle,
                    normalizedInterviewSituation,
                    normalizedCandidateDescription,
                    normalizedJobDescription,
                    variationToken,
                    safeQuestionCount
            );
        }

        String template = loadPromptFromFile("interview_questions_prompt.txt");
        Map<String, String> templateValues = new HashMap<>();
        templateValues.put("candidateDescription", normalizedCandidateDescription);
        templateValues.put("targetRole", normalizedTargetRole);
        templateValues.put("jobDescription", normalizedJobDescription);
        templateValues.put("questionCount", String.valueOf(safeQuestionCount));
        templateValues.put("interviewStyle", normalizedInterviewStyle.isBlank() ? "Mixed" : normalizedInterviewStyle);
        templateValues.put("interviewSituation", normalizedInterviewSituation.isBlank() ? "General interview round" : normalizedInterviewSituation);
        templateValues.put("variationToken", variationToken);
        String filledPrompt = putValuesToTemplate(template, templateValues);

        String systemPrompt = """
You are an expert interview coach. Think carefully about the candidate, target role, and any job description, but keep the reasoning hidden from the user inside <think>...</think> tags. After thinking, output ONLY JSON inside a ```json ... ``` block. Do not add any extra text before or after the code block.
""";

        try {
            Map<String, Object> externalApiResponse = tryGenerateUsingExternalApi(systemPrompt, filledPrompt);
            if (externalApiResponse != null && externalApiResponse.get("questions") != null) {
                Map<String, Object> normalized = normalizeInterviewResponse(externalApiResponse);
                enrichMissingAnswersWithLlama(
                        normalized,
                        normalizedCandidateDescription,
                        normalizedTargetRole,
                        normalizedInterviewStyle,
                        normalizedInterviewSituation
                );
                enforceQuestionVariety(
                        normalized,
                        normalizedTargetRole,
                        normalizedInterviewStyle,
                        normalizedInterviewSituation,
                        variationToken,
                        safeQuestionCount
                );
                normalized.put("variationToken", variationToken);
                normalized.put("provider", "external-api");
                normalized.put("generatedAt", System.currentTimeMillis());
                return normalized;
            }
        } catch (Exception ex) {
            System.err.println("External interview API generation failed, falling back to local Llama: " + ex.getMessage());
        }

        CompletableFuture<String> aiFuture = null;
        try {
            aiFuture = CompletableFuture.supplyAsync(() ->
                    chatClient
                            .prompt()
                            .system(systemPrompt)
                            .user(filledPrompt)
                            .call()
                            .content()
            );

            String aiResponse = aiFuture.get(AI_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            Map<String, Object> parsed = ResumeServiceIMPL.parseMultipleResponses(aiResponse);
            Map<String, Object> unwrapped = unwrapParsedResponse(parsed);
            if (unwrapped != null && unwrapped.get("questions") != null) {
                Map<String, Object> normalized = normalizeInterviewResponse(unwrapped);
                enrichMissingAnswersWithLlama(
                        normalized,
                        normalizedCandidateDescription,
                        normalizedTargetRole,
                        normalizedInterviewStyle,
                        normalizedInterviewSituation
                );
                enforceQuestionVariety(
                        normalized,
                        normalizedTargetRole,
                        normalizedInterviewStyle,
                        normalizedInterviewSituation,
                        variationToken,
                        safeQuestionCount
                );
                normalized.put("variationToken", variationToken);
                normalized.put("provider", "ollama-llama");
                normalized.put("generatedAt", System.currentTimeMillis());
                return normalized;
            }
        } catch (TimeoutException timeout) {
            System.err.println("Interview question generation timed out: " + timeout.getMessage());
            if (aiFuture != null) {
                aiFuture.cancel(true);
            }
            return buildMockInterviewResponse(
                    "AI generation timed out after " + AI_TIMEOUT_SECONDS + " seconds",
                    normalizedTargetRole,
                    normalizedInterviewStyle,
                    normalizedInterviewSituation,
                    normalizedCandidateDescription,
                    normalizedJobDescription,
                    variationToken,
                    safeQuestionCount
            );
        } catch (Exception ex) {
            System.err.println("Interview question generation failed, falling back to mock data: " + ex.getMessage());
        }

        return buildMockInterviewResponse(
                "AI generation failed, returning sample interview prep",
                normalizedTargetRole,
                normalizedInterviewStyle,
                normalizedInterviewSituation,
                normalizedCandidateDescription,
                normalizedJobDescription,
                variationToken,
                safeQuestionCount
        );
    }

    private Map<String, Object> tryGenerateUsingExternalApi(String systemPrompt, String userPrompt) {
        if (!externalApiEnabled || externalApiUrl.isBlank() || externalApiKey.isBlank() || externalApiModel.isBlank()) {
            return null;
        }

        try {
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("model", externalApiModel);
            payload.put("temperature", externalApiTemperature);
            payload.put("messages", List.of(
                    Map.of("role", "system", "content", systemPrompt),
                    Map.of("role", "user", "content", userPrompt)
            ));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(externalApiUrl))
                    .timeout(Duration.ofSeconds(AI_TIMEOUT_SECONDS))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + externalApiKey)
                    .POST(HttpRequest.BodyPublishers.ofString(OBJECT_MAPPER.writeValueAsString(payload)))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalStateException("External API returned status " + response.statusCode());
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> root = OBJECT_MAPPER.readValue(response.body(), Map.class);
            String content = extractChatContent(root);
            if (content.isBlank()) {
                return null;
            }
            Map<String, Object> parsed = ResumeServiceIMPL.parseMultipleResponses(content);
            return unwrapParsedResponse(parsed);
        } catch (Exception ex) {
            throw new IllegalStateException("External API request failed: " + ex.getMessage(), ex);
        }
    }

    private String extractChatContent(Map<String, Object> root) {
        if (root == null) {
            return "";
        }
        Object choicesObj = root.get("choices");
        if (!(choicesObj instanceof List<?> choices) || choices.isEmpty()) {
            return "";
        }
        Object first = choices.get(0);
        if (!(first instanceof Map<?, ?> choiceMap)) {
            return "";
        }
        Object messageObj = choiceMap.get("message");
        if (!(messageObj instanceof Map<?, ?> messageMap)) {
            return "";
        }
        return clean(messageMap.get("content"));
    }

    String loadPromptFromFile(String filename) throws IOException {
        ClassPathResource resource = new ClassPathResource(filename);
        return new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
    }

    String putValuesToTemplate(String template, Map<String, String> values) {
        for (Map.Entry<String, String> entry : values.entrySet()) {
            template = template.replace("{{" + entry.getKey() + "}}", entry.getValue());
        }
        return template;
    }

    private Map<String, Object> unwrapParsedResponse(Map<String, Object> parsed) {
        if (parsed == null) {
            return null;
        }

        Object data = parsed.get("data");
        if (data instanceof Map<?, ?> map) {
            @SuppressWarnings("unchecked")
            Map<String, Object> unwrapped = new HashMap<>((Map<String, Object>) map);
            if (parsed.containsKey("think") && parsed.get("think") != null) {
                unwrapped.put("think", parsed.get("think"));
            }
            return unwrapped;
        }

        return parsed;
    }

    private Map<String, Object> normalizeInterviewResponse(Map<String, Object> payload) {
        Map<String, Object> normalized = new LinkedHashMap<>(payload);
        List<Map<String, Object>> normalizedQuestions = new ArrayList<>();
        for (Map<String, Object> question : asMapList(payload.get("questions"))) {
            Map<String, Object> copy = new LinkedHashMap<>(question);
            copy.put("sampleAnswer", clean(copy.get("sampleAnswer")));
            normalizedQuestions.add(copy);
        }
        normalized.put("questions", normalizedQuestions);
        normalized.put("questionCount", normalizedQuestions.size());
        return normalized;
    }

    private List<Map<String, Object>> asMapList(Object value) {
        if (!(value instanceof List<?> list)) {
            return List.of();
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> map) {
                Map<String, Object> cast = new LinkedHashMap<>();
                map.forEach((key, val) -> cast.put(String.valueOf(key), val));
                result.add(cast);
            }
        }
        return result;
    }

    private String buildFallbackAnswer(Map<String, Object> question) {
        List<String> outline = new ArrayList<>();
        Object outlineObj = question.get("sampleAnswerOutline");
        if (outlineObj instanceof List<?> list) {
            for (Object item : list) {
                String text = clean(item);
                if (!text.isBlank()) {
                    outline.add(text);
                }
            }
        }
        if (!outline.isEmpty()) {
            return String.join(" ", outline);
        }

        String whyItMatters = clean(question.get("whyItMatters"));
        if (!whyItMatters.isBlank()) {
            return "A strong answer should focus on this: " + whyItMatters;
        }

        return "A good answer should explain your approach, your specific contribution, and the result you achieved.";
    }

    private void enrichMissingAnswersWithLlama(
            Map<String, Object> payload,
            String candidateDescription,
            String targetRole,
            String interviewStyle,
            String interviewSituation
    ) {
        List<Map<String, Object>> questions = asMapList(payload.get("questions"));
        List<Map<String, Object>> missing = new ArrayList<>();
        for (int i = 0; i < questions.size(); i++) {
            Map<String, Object> question = questions.get(i);
            String sampleAnswer = clean(question.get("sampleAnswer"));
            if (sampleAnswer.isBlank() || isWeakAnswer(sampleAnswer)) {
                Map<String, Object> item = new LinkedHashMap<>();
                item.put("index", i);
                item.put("question", clean(question.get("question")));
                item.put("category", clean(question.get("category")));
                item.put("difficulty", clean(question.get("difficulty")));
                item.put("whyItMatters", clean(question.get("whyItMatters")));
                item.put("sampleAnswerOutline", question.get("sampleAnswerOutline"));
                missing.add(item);
            }
        }
        if (missing.isEmpty()) {
            return;
        }

        String systemPrompt = """
You are an interview coach. Return only JSON inside a ```json ... ``` block.
""";
        String missingJson;
        try {
            missingJson = OBJECT_MAPPER.writeValueAsString(missing);
        } catch (Exception ex) {
            missingJson = missing.toString();
        }

        String userPrompt = """
Generate practical, interview-ready sample answers for the questions below.

Role: %s
Style: %s
Situation: %s
Candidate: %s

Questions:
%s

Answer Quality Rules:
- Write each answer in first person as if the candidate is speaking in interview.
- Use 4-6 sentences.
- Include concrete project context, action, and measurable outcome when possible.
- Avoid generic filler like "I would explain..." without an example.
- Keep claims realistic and aligned to the candidate profile.

Output JSON:
{
  "answers": [
    { "index": 0, "sampleAnswer": "..." }
  ]
}
""".formatted(
                clean(targetRole),
                clean(interviewStyle),
                clean(interviewSituation),
                clean(candidateDescription),
                missingJson
        );

        CompletableFuture<String> aiFuture = null;
        try {
            aiFuture = CompletableFuture.supplyAsync(() ->
                    chatClient
                            .prompt()
                            .system(systemPrompt)
                            .user(userPrompt)
                            .call()
                            .content()
            );
            String aiResponse = aiFuture.get(Math.max(10, AI_TIMEOUT_SECONDS - 5), TimeUnit.SECONDS);
            Map<String, Object> parsed = ResumeServiceIMPL.parseMultipleResponses(aiResponse);
            Map<String, Object> unwrapped = unwrapParsedResponse(parsed);
            for (Map<String, Object> answer : asMapList(unwrapped == null ? null : unwrapped.get("answers"))) {
                int index = parseInt(answer.get("index"), -1);
                String sampleAnswer = clean(answer.get("sampleAnswer"));
                if (index >= 0 && index < questions.size() && !sampleAnswer.isBlank() && !isWeakAnswer(sampleAnswer)) {
                    questions.get(index).put("sampleAnswer", sampleAnswer);
                }
            }
        } catch (Exception ex) {
            if (aiFuture != null) {
                aiFuture.cancel(true);
            }
        }

        for (Map<String, Object> question : questions) {
            String sampleAnswer = clean(question.get("sampleAnswer"));
            if (sampleAnswer.isBlank() || isWeakAnswer(sampleAnswer)) {
                question.put("sampleAnswer", buildFallbackAnswer(question));
            }
        }
    }

    private void enforceQuestionVariety(
            Map<String, Object> payload,
            String targetRole,
            String interviewStyle,
            String interviewSituation,
            String variationToken,
            int safeQuestionCount
    ) {
        List<Map<String, Object>> questions = new ArrayList<>(asMapList(payload.get("questions")));
        if (questions.isEmpty()) {
            List<String> focusAreas = inferFocusAreas(
                    clean(targetRole),
                    clean(interviewStyle),
                    clean(interviewSituation),
                    "",
                    ""
            );
            questions.addAll(buildQuestionList(
                    clean(targetRole).isBlank() ? "Target Role" : clean(targetRole),
                    clean(interviewStyle).isBlank() ? "Mixed" : clean(interviewStyle),
                    clean(interviewSituation).isBlank() ? "General interview round" : clean(interviewSituation),
                    focusAreas,
                    variationToken,
                    safeQuestionCount
            ));
            payload.put("questions", questions);
            payload.put("questionCount", questions.size());
            return;
        }

        Set<String> seenQuestions = new HashSet<>();
        List<String> focusAreas = inferFocusAreas(
                clean(targetRole),
                clean(interviewStyle),
                clean(interviewSituation),
                "",
                ""
        );
        List<String> categories = List.of("Technical", "Project", "Behavioral", "System Design", "HR");
        int maxQuestions = Math.max(5, Math.min(12, safeQuestionCount));

        for (int i = 0; i < questions.size(); i++) {
            Map<String, Object> question = questions.get(i);
            String category = clean(question.get("category"));
            if (category.isBlank()) {
                category = categories.get(i % categories.size());
                question.put("category", category);
            }

            String prompt = clean(question.get("question"));
            String key = normalizeForDedup(prompt);
            if (prompt.isBlank() || key.isBlank() || seenQuestions.contains(key)) {
                String focus = focusAreas.get(i % focusAreas.size());
                String rewritten = buildQuestionText(
                        category,
                        clean(targetRole).isBlank() ? "Target Role" : clean(targetRole),
                        clean(interviewStyle).isBlank() ? "Mixed" : clean(interviewStyle),
                        clean(interviewSituation).isBlank() ? "General interview round" : clean(interviewSituation),
                        focus,
                        i + maxQuestions,
                        variationToken + "-" + i
                );
                question.put("question", rewritten);
                key = normalizeForDedup(rewritten);
            }
            seenQuestions.add(key);
        }

        int index = questions.size();
        while (questions.size() < maxQuestions) {
            String category = categories.get(index % categories.size());
            String focus = focusAreas.get(index % focusAreas.size());
            Map<String, Object> extra = new LinkedHashMap<>();
            extra.put("category", category);
            extra.put("difficulty", index % 2 == 0 ? "Medium" : "Easy");
            extra.put("question", buildQuestionText(
                    category,
                    clean(targetRole).isBlank() ? "Target Role" : clean(targetRole),
                    clean(interviewStyle).isBlank() ? "Mixed" : clean(interviewStyle),
                    clean(interviewSituation).isBlank() ? "General interview round" : clean(interviewSituation),
                    focus,
                    index,
                    variationToken + "-extra"
            ));
            extra.put("whyItMatters", buildWhyItMatters(category, clean(targetRole), focus));
            extra.put("sampleAnswer", buildSampleAnswer(category, clean(targetRole), focus));
            extra.put("sampleAnswerOutline", buildSampleOutline(category, clean(targetRole), focus));
            questions.add(extra);
            index++;
        }

        long seed = Integer.toUnsignedLong(clean(variationToken).hashCode());
        if (questions.size() > 1) {
            Collections.rotate(questions, (int) (seed % questions.size()));
        }

        payload.put("questions", questions);
        payload.put("questionCount", questions.size());
    }

    private String normalizeForDedup(String value) {
        String normalized = lower(clean(value));
        if (normalized.isBlank()) {
            return normalized;
        }
        return normalized.replaceAll("[^a-z0-9 ]", " ").replaceAll("\\s+", " ").trim();
    }

    private int parseInt(Object value, int fallback) {
        try {
            return Integer.parseInt(clean(value));
        } catch (Exception ex) {
            return fallback;
        }
    }

    private boolean isWeakAnswer(String answer) {
        String normalized = lower(answer);
        if (normalized.isBlank()) {
            return true;
        }
        if (normalized.length() < 70) {
            return true;
        }
        return normalized.contains("a strong answer should focus on this")
                || normalized.contains("a good answer should explain your approach")
                || normalized.contains("i would start by explaining")
                || normalized.contains("i would outline the project goal")
                || normalized.contains("i would clarify requirements");
    }

    private Map<String, Object> buildMockInterviewResponse(
            String reason,
            String targetRole,
            String interviewStyle,
            String interviewSituation,
            String candidateDescription,
            String jobDescription,
            String variationToken,
            int questionCount
    ) {
        String roleLabel = targetRole == null || targetRole.isBlank() ? "Target Role" : targetRole.trim();
        String styleLabel = interviewStyle == null || interviewStyle.isBlank() ? "Mixed" : interviewStyle.trim();
        String situationLabel = interviewSituation == null || interviewSituation.isBlank()
                ? "General interview round"
                : interviewSituation.trim();
        List<String> focusAreas = inferFocusAreas(roleLabel, styleLabel, situationLabel, candidateDescription, jobDescription);
        List<String> strengthsToHighlight = inferStrengths(roleLabel, focusAreas);
        List<String> prepTips = List.of(
                "Use the STAR method for behavioral answers.",
                "Anchor each answer in one project, one decision, and one measurable result.",
                "Be ready to explain tradeoffs, testing, and how you handled feedback.",
                "Close with a short statement about why this role fits your long-term goals."
        );
        List<String> redFlagsToAvoid = List.of(
                "Do not memorize script-like answers; keep them natural.",
                "Avoid vague claims without a project, metric, or example.",
                "Do not skip the basics when the question is about core tools or concepts."
        );

        List<Map<String, Object>> questions = buildQuestionList(roleLabel, styleLabel, situationLabel, focusAreas, variationToken, questionCount);

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("role", roleLabel);
        response.put("interviewStyle", styleLabel);
        response.put("interviewSituation", situationLabel);
        response.put("variationToken", variationToken);
        response.put("provider", "mock-fallback");
        response.put("generatedAt", System.currentTimeMillis());
        response.put("questionCount", questions.size());
        response.put("focusAreas", focusAreas);
        response.put("questions", questions);
        response.put("prepTips", prepTips);
        response.put("strengthsToHighlight", strengthsToHighlight);
        response.put("redFlagsToAvoid", redFlagsToAvoid);
        response.put("closingAdvice", buildClosingAdvice(roleLabel, styleLabel, focusAreas));
        if (reason != null) {
            response.put("warning", reason);
        }
        response.put("think", "Mock response for testing purposes");
        return response;
    }

    private List<Map<String, Object>> buildQuestionList(
            String roleLabel,
            String styleLabel,
            String situationLabel,
            List<String> focusAreas,
            String variationToken,
            int questionCount
    ) {
        List<Map<String, Object>> questions = new ArrayList<>();
        List<String> categories = List.of("Technical", "Project", "Behavioral", "System Design", "HR");
        List<String> difficulties = List.of("Easy", "Medium", "Medium", "Hard", "Easy");

        for (int i = 0; i < questionCount; i++) {
            String category = categories.get(i % categories.size());
            String difficulty = difficulties.get(i % difficulties.size());
            String focus = focusAreas.get(i % focusAreas.size());
            Map<String, Object> question = new LinkedHashMap<>();
            question.put("category", category);
            question.put("difficulty", difficulty);
            question.put("question", buildQuestionText(category, roleLabel, styleLabel, situationLabel, focus, i, variationToken));
            question.put("whyItMatters", buildWhyItMatters(category, roleLabel, focus));
            question.put("sampleAnswer", buildSampleAnswer(category, roleLabel, focus));
            question.put("sampleAnswerOutline", buildSampleOutline(category, roleLabel, focus));
            questions.add(question);
        }

        return questions;
    }

    private String buildQuestionText(
            String category,
            String roleLabel,
            String styleLabel,
            String situationLabel,
            String focus,
            int position,
            String variationToken
    ) {
        String roundContext = situationLabel == null || situationLabel.isBlank()
                ? "this round"
                : situationLabel;
        int variant = Math.abs((category + "|" + position + "|" + clean(variationToken)).hashCode()) % 3;
        return switch (category) {
            case "Technical" -> switch (variant) {
                case 0 -> "In " + roundContext + ", how would you demonstrate strong " + focus
                        + " as a " + roleLabel + " under realistic constraints?";
                case 1 -> "For " + roundContext + ", explain a technical decision in " + focus
                        + " and how you validated it.";
                default -> "During " + roundContext + ", what is your approach to troubleshooting " + focus
                        + " issues quickly and safely?";
            };
            case "Project" -> switch (variant) {
                case 0 -> "For " + roundContext + ", walk me through a project where you used " + focus
                        + " and explain one tough tradeoff.";
                case 1 -> "Tell me about a project in " + focus + " where requirements changed late. How did you adapt?";
                default -> "Describe a project outcome tied to " + focus + " and the biggest risk you managed.";
            };
            case "Behavioral" -> switch (variant) {
                case 0 -> "In a " + styleLabel + " interview for " + roundContext
                        + ", tell me about a time you handled ambiguity or pressure.";
                case 1 -> "Share an example where collaboration broke down. What did you do to recover momentum?";
                default -> "Tell me about a difficult feedback moment and how you changed your approach after it.";
            };
            case "System Design" -> switch (variant) {
                case 0 -> "Assume this is " + roundContext
                        + ". How would you design a reliable solution that highlights " + focus + "?";
                case 1 -> "Design a scalable workflow for " + focus + " and explain your tradeoffs.";
                default -> "How would you balance performance, cost, and maintainability in a " + focus + " architecture?";
            };
            default -> switch (variant) {
                case 0 -> "For " + roundContext + ", why are you the right fit for this " + roleLabel
                        + " role and what value would you add first?";
                case 1 -> "What motivates you about this role, and how does it fit your next two years?";
                default -> "If selected, how would you onboard quickly and contribute in your first 30 days?";
            };
        };
    }

    private String buildWhyItMatters(String category, String roleLabel, String focus) {
        return switch (category) {
            case "Technical" -> "This checks whether you can explain core " + focus + " concepts clearly.";
            case "Project" -> "This reveals how you apply " + focus + " in real delivery work.";
            case "Behavioral" -> "This helps the interviewer understand your communication and learning style.";
            case "System Design" -> "This shows how you think about scale, reliability, and quality.";
            default -> "This tests motivation, fit, and how you present your story.";
        };
    }

    private List<String> buildSampleOutline(String category, String roleLabel, String focus) {
        return switch (category) {
            case "Technical" -> List.of(
                    "Start with the core concept.",
                    "Explain how you used it in a project.",
                    "Mention a concrete result or lesson."
            );
            case "Project" -> List.of(
                    "Describe the project goal.",
                    "Explain your contribution and tools.",
                    "Close with the outcome and what you learned."
            );
            case "Behavioral" -> List.of(
                    "Share the situation and your responsibility.",
                    "Explain the action you took.",
                    "Finish with the result and a reflection."
            );
            case "System Design" -> List.of(
                    "State the requirements first.",
                    "Describe the architecture at a high level.",
                    "Mention tradeoffs, scale, and monitoring."
            );
            default -> List.of(
                    "Connect your experience to the role.",
                    "Show enthusiasm without over-claiming.",
                    "End with why the company and team fit you."
            );
        };
    }

    private String buildSampleAnswer(String category, String roleLabel, String focus) {
        return switch (category) {
            case "Technical" -> "I would start by explaining the core " + focus
                    + " concept, then describe a real project where I applied it, and close with the impact I delivered.";
            case "Project" -> "I would outline the project goal, the stack I used around " + focus
                    + ", the key tradeoffs I made, and the measurable outcome.";
            case "Behavioral" -> "I would explain the situation, the action I took to learn quickly, and the result I achieved for the team.";
            case "System Design" -> "I would clarify requirements, sketch a high-level architecture, and discuss scale, reliability, and monitoring.";
            default -> "I would connect my experience to the " + roleLabel
                    + " role, show why it fits my goals, and ask a thoughtful question about the team.";
        };
    }

    private List<String> inferFocusAreas(
            String roleLabel,
            String styleLabel,
            String situationLabel,
            String candidateDescription,
            String jobDescription
    ) {
        String source = lower(roleLabel + " " + styleLabel + " " + situationLabel + " " + candidateDescription + " " + jobDescription);
        List<String> areas = new ArrayList<>();
        addIfMatches(areas, source, "java", "Java fundamentals");
        addIfMatches(areas, source, "spring", "Spring Boot APIs");
        addIfMatches(areas, source, "react", "React UI workflows");
        addIfMatches(areas, source, "python", "Python problem solving");
        addIfMatches(areas, source, "sql", "SQL and database design");
        addIfMatches(areas, source, "api", "REST API design");
        addIfMatches(areas, source, "cloud", "Cloud and deployment");
        addIfMatches(areas, source, "aws", "Cloud and deployment");
        addIfMatches(areas, source, "testing", "Testing and quality");
        addIfMatches(areas, source, "lead", "Collaboration and leadership");
        addIfMatches(areas, source, "manager", "Collaboration and leadership");
        addIfMatches(areas, source, "system design", "Architecture and scalability");
        addIfMatches(areas, source, "design", "Architecture and scalability");
        addIfMatches(areas, source, "hr", "Motivation and communication");
        addIfMatches(areas, source, "behavioral", "Conflict handling and ownership");
        addIfMatches(areas, source, "phone", "Clarity and concise communication");
        addIfMatches(areas, source, "pressure", "Decision-making under pressure");
        addIfMatches(areas, source, "incident", "Production incident handling");
        addIfMatches(areas, source, "stakeholder", "Cross-team collaboration");

        if (areas.isEmpty()) {
            areas.addAll(List.of(
                    "Core technical depth",
                    "Project walkthroughs",
                    "Problem solving",
                    "Communication"
            ));
        }

        return areas.stream().distinct().limit(5).toList();
    }

    private List<String> inferStrengths(String roleLabel, List<String> focusAreas) {
        List<String> strengths = new ArrayList<>();
        strengths.add("Your experience should connect to " + roleLabel + " clearly.");
        strengths.add("Explain how you learned and applied the top tools in your stack.");
        if (!focusAreas.isEmpty()) {
            strengths.add("Highlight examples around " + focusAreas.get(0) + ".");
        }
        strengths.add("Keep answers concise, practical, and confident.");
        return strengths.stream().distinct().limit(4).toList();
    }

    private String buildClosingAdvice(String roleLabel, String styleLabel, List<String> focusAreas) {
        String focusSummary = focusAreas.isEmpty() ? "your strongest examples" : String.join(", ", focusAreas.subList(0, Math.min(3, focusAreas.size())));
        return "Before the interview, rehearse one clear story for " + roleLabel
                + ", one project example, and one question you want to ask the team. Keep the tone "
                + styleLabel.toLowerCase(Locale.ROOT) + " and tie your answers back to " + focusSummary + ".";
    }

    private void addIfMatches(List<String> areas, String source, String needle, String label) {
        if (source.contains(needle) && !areas.contains(label)) {
            areas.add(label);
        }
    }

    private String clean(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private String lower(String value) {
        return value == null ? "" : value.toLowerCase(Locale.ROOT).trim();
    }
}
