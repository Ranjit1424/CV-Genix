package ai.createResume.Backend.Services.IMPL;

import ai.createResume.Backend.Services.ResumeService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.apache.poi.xwpf.extractor.XWPFWordExtractor;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class ResumeServiceIMPL implements ResumeService {

    // Allow a longer window for cold-started local models (Ollama needs time to load)
    private static final int AI_TIMEOUT_SECONDS = 25;

    private ChatClient chatClient;

    public ResumeServiceIMPL(ChatClient.Builder builder) {
        this.chatClient = builder.build();
    }

    @Override
    public Map<String, Object> generateResumeFromFile(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("No file uploaded or file is empty");
        }

        String extractedText = extractTextFromFile(file);
        Map<String, Object> response = buildResumeAnalysisResponse(extractedText, file.getOriginalFilename());
        Map<String, Object> structuredResume = extractStructuredResumeFromUploadedText(extractedText);
        if (structuredResume != null && !structuredResume.isEmpty()) {
            response.put("structuredResume", structuredResume);
        }
        return response;
    }

    @Override
    public Map<String, Object> analyzeJobMatch(String jobDescription, Map<String, Object> resumeData) {
        String normalizedJobDescription = jobDescription == null ? "" : jobDescription.trim();
        if (normalizedJobDescription.length() < 20) {
            throw new IllegalArgumentException("Paste a fuller job description before running match analysis.");
        }
        if (resumeData == null || resumeData.isEmpty()) {
            throw new IllegalArgumentException("Resume data is required for job match analysis.");
        }

        List<String> extractedKeywords = extractJobKeywords(normalizedJobDescription);
        if (extractedKeywords.isEmpty()) {
            throw new IllegalArgumentException("Could not extract enough useful keywords from the job description.");
        }

        String resumeCorpus = buildResumeCorpus(resumeData).toLowerCase(Locale.ROOT);
        List<String> matchedKeywords = extractedKeywords.stream()
                .filter(keyword -> resumeCorpus.contains(keyword.toLowerCase(Locale.ROOT)))
                .toList();
        List<String> missingKeywords = extractedKeywords.stream()
                .filter(keyword -> !resumeCorpus.contains(keyword.toLowerCase(Locale.ROOT)))
                .toList();

        int score = (int) Math.max(25, Math.min(100,
                Math.round((matchedKeywords.size() * 100.0) / extractedKeywords.size())));

        Map<String, Object> response = new HashMap<>();
        response.put("score", score);
        response.put("matchedKeywords", matchedKeywords);
        response.put("missingKeywords", missingKeywords);
        response.put("extractedKeywords", extractedKeywords);
        response.put("summary", buildMatchSummary(score, matchedKeywords, missingKeywords));
        response.put("rewriteSuggestions", buildRewriteSuggestions(resumeData, missingKeywords, extractedKeywords));
        response.put("sectionSignals", buildSectionSignals(resumeData));
        return response;
    }

    @Override
    public Map<String, Object> generateProfessionalEmailResponse(String emailPrompt, String tone) throws IOException {
        String normalizedPrompt = emailPrompt == null ? "" : emailPrompt.trim();
        String normalizedTone = tone == null || tone.trim().isBlank() ? "Professional" : tone.trim();

        if (normalizedPrompt.length() < 20) {
            Map<String, Object> quick = buildMockEmailResponse("Prompt too short; showing a sample email.");
            quick.put("warning", "Provide a fuller prompt so the email can be tailored properly.");
            return quick;
        }

        String template = loadPromptFromFile("email_prompt.txt");
        String filledPrompt = putValuesToTemplate(
                template,
                Map.of(
                        "emailPrompt", normalizedPrompt,
                        "tone", normalizedTone
                )
        );
        String systemPrompt = """
You are an expert professional email writer. Think carefully about the user's request, but keep the reasoning hidden from the user inside <think>...</think> tags. After thinking, output ONLY JSON inside a ```json ... ``` block. Do not add any extra text before or after the code block.
""";

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
            Map<String, Object> parsed = parseMultipleResponses(aiResponse);
            Map<String, Object> unwrapped = unwrapParsedResponse(parsed);
            if (unwrapped != null && unwrapped.get("body") != null) {
                return unwrapped;
            }
        } catch (TimeoutException timeout) {
            System.err.println("Email generation timed out: " + timeout.getMessage());
            if (aiFuture != null) {
                aiFuture.cancel(true);
            }
            return buildMockEmailResponse("AI generation timed out after " + AI_TIMEOUT_SECONDS + " seconds");
        } catch (Exception ex) {
            System.err.println("Email generation failed, falling back to mock data: " + ex.getMessage());
        }

        return buildMockEmailResponse("AI generation failed, returning sample email");
    }

    @Override
    @Cacheable(value = "placementOpportunities", key = "#userDescription")
    public Map<String, Object> generatePlacementOpportunities(String userDescription) throws IOException {
        String normalizedDescription = userDescription == null ? "" : userDescription.trim();

        if (normalizedDescription.length() < 30) {
            Map<String, Object> quick = new HashMap<>();
            quick.put("opportunities", List.of());
            quick.put("careerAdvice", "Please provide more details about your skills, experience, and background for better placement recommendations.");
            quick.put("warning", "Description too short; provide at least 2-3 sentences for tailored advice.");
            return quick;
        }

        String template = loadPromptFromFile("placement_prompt.txt");
        String filledPrompt = putValuesToTemplate(template, Map.of("userDescription", normalizedDescription));

        String systemPrompt = """
You are a career advisor specializing in IT placements. Think step-by-step about the candidate's profile and current job market, but keep the reasoning hidden from the user inside <think>...</think> tags. After thinking, output ONLY JSON that matches the provided schema inside a ```json ... ``` block. Do not add any extra text before or after these two sections.
""";

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
            Map<String, Object> parsed = parseMultipleResponses(aiResponse);
            Map<String, Object> unwrapped = unwrapParsedResponse(parsed);
            if (unwrapped != null && unwrapped.get("opportunities") != null) {
                return unwrapped;
            }
        } catch (TimeoutException timeout) {
            System.err.println("Placement generation timed out: " + timeout.getMessage());
            if (aiFuture != null) {
                aiFuture.cancel(true);
            }
        } catch (Exception ex) {
            System.err.println("Placement generation failed, falling back to mock data: " + ex.getMessage());
        }

        return buildMockPlacementResponse("AI generation failed, returning sample opportunities");
    }

    @Override
    public Map<String, Object> generateResumeResponse(String userResumeDescription) throws IOException {
        return generateResumeResponse(userResumeDescription, null);
    }

    @Override
    public Map<String, Object> generateResumeResponse(String userResumeDescription, String jobDescription) throws IOException {
        if (userResumeDescription == null || userResumeDescription.trim().length() < 30) {
            Map<String, Object> quick = buildMockResponse("Description too short; showing sample resume.");
            quick.put("warning", "Provide at least 2-3 sentences for a tailored resume.");
            return quick;
        }

        // Build the resume prompt by injecting the user description into the template
        String template = loadPromptFromFile("resume_prompt.txt");
        String filledPrompt = putValuesToTemplate(template, Map.of("userDescription", userResumeDescription));
        String trimmedJobDescription = jobDescription == null ? "" : jobDescription.trim();
        if (!trimmedJobDescription.isBlank()) {
            filledPrompt += "\n\nTarget Job Description:\n\"" + trimmedJobDescription + "\""
                    + "\n\nTailoring Requirements:"
                    + "\n- Match the resume tone and keywords to this job description."
                    + "\n- Prioritize relevant skills, technologies, achievements, and experience."
                    + "\n- If the user background is incomplete, keep unsupported claims conservative."
                    + "\n- Make the summary and bullets feel aligned to this role.";
        }
        final String finalPrompt = filledPrompt;

        String systemPrompt = """
You are an ATS-aware professional resume writer. Think step-by-step about the role and the candidate, but keep the reasoning hidden from the user inside <think>...</think> tags. After thinking, output ONLY a JSON resume that matches the provided schema inside a ```json ... ``` block. Do not add any extra text before or after these two sections.
""";

        CompletableFuture<String> aiFuture = null;
        try {
            aiFuture = CompletableFuture.supplyAsync(() ->
                    chatClient
                            .prompt()
                            .system(systemPrompt)
                            .user(finalPrompt)
                            .call()
                            .content()
            );

            String aiResponse = aiFuture.get(AI_TIMEOUT_SECONDS, TimeUnit.SECONDS); // cap latency

            Map<String, Object> parsed = parseMultipleResponses(aiResponse);
            Map<String, Object> unwrapped = unwrapParsedResponse(parsed);
            // If the model responded correctly, return it; otherwise fall back to mock data
            if (unwrapped != null && unwrapped.get("personalInformation") != null) {
                return unwrapped;
            }
        } catch (TimeoutException timeout) {
            System.err.println("AI generation timed out: " + timeout.getMessage());
            // Stop the background task to avoid leaking work
            if (aiFuture != null) {
                aiFuture.cancel(true);
            }
            return buildMockResponse("AI generation timed out after " + AI_TIMEOUT_SECONDS + " seconds");
        } catch (Exception ex) {
            // Fall through to mock data so the UI keeps working when the model is down
            System.err.println("AI generation failed, falling back to mock data: " + ex.getMessage());
        }

        return buildMockResponse("AI generation failed, returning sample data");
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

    public static Map<String, Object> parseMultipleResponses(String response) {
        Map<String, Object> jsonResponse = new HashMap<>();

        // Extract content inside <think> tags
        int thinkStartIdx = response.indexOf("<think>");
        int thinkEnd = response.indexOf("</think>");
        if (thinkStartIdx != -1 && thinkEnd != -1) {
            String thinkContent = response.substring(thinkStartIdx + 7, thinkEnd).trim();
            jsonResponse.put("think", thinkContent);
        } else {
            jsonResponse.put("think", null); // Handle missing <think> tags
        }

        // Extract JSON content either from a fenced block or from the first JSON object found.
        String jsonContent = null;
        int jsonStartIdx = response.indexOf("```json");
        int jsonEnd = response.lastIndexOf("```");
        if (jsonStartIdx != -1 && jsonEnd != -1 && jsonStartIdx < jsonEnd) {
            int jsonStart = jsonStartIdx + 7; // Start after ```json
            jsonContent = response.substring(jsonStart, jsonEnd).trim();
        } else {
            int firstBrace = response.indexOf('{');
            int lastBrace = response.lastIndexOf('}');
            if (firstBrace != -1 && lastBrace != -1 && firstBrace < lastBrace) {
                jsonContent = response.substring(firstBrace, lastBrace + 1).trim();
            }
        }

        if (jsonContent != null) {
            try {
                ObjectMapper objectMapper = new ObjectMapper();
                Map<String, Object> dataContent = objectMapper.readValue(jsonContent, Map.class);
                jsonResponse.put("data", dataContent);
            } catch (Exception e) {
                jsonResponse.put("data", null); // Handle invalid JSON
                System.err.println("Invalid JSON format in the response: " + e.getMessage());
            }
        } else {
            jsonResponse.put("data", null); // Handle missing JSON
        }
        return jsonResponse;
    }

    private Map<String, Object> unwrapParsedResponse(Map<String, Object> parsed) {
        if (parsed == null) {
            return null;
        }

        Object data = parsed.get("data");
        if (data instanceof Map<?, ?>) {
            @SuppressWarnings("unchecked")
            Map<String, Object> unwrapped = new HashMap<>((Map<String, Object>) data);
            if (parsed.containsKey("think") && parsed.get("think") != null) {
                unwrapped.put("think", parsed.get("think"));
            }
            return unwrapped;
        }

        return parsed;
    }

    private Map<String, Object> buildMockResponse(String reason) {
        Map<String, Object> mockData = new HashMap<>();
        mockData.put("personalInformation", Map.of(
                "fullName", "sarthak khatpe",
                "email", "sarthakkhatpe24@gmail.com",
                "phoneNumber", "7559463115",
                "location", "Maharashtra, pune",
                "linkedin", "https://www.linkedin.com/in/sarthak-khatpe-943911327/",
                "gitHub", "https://github.com/sarthak425",
                "portfolio", "https://sarthak425.github.io/my_Portfolio/"
        ));
        mockData.put("summary", "i am a full-stack development, specializing in Java, Python, and Reach web technologies.");
        mockData.put("skills", java.util.Arrays.asList(
                Map.of("title", "Java", "level", "Expert"),
                Map.of("title", "JavaScript", "level", "Advanced"),
                Map.of("title", "React", "level", "Intermediate"),
                Map.of("title", "Python", "level", "Advanced")
        ));
        mockData.put("experience", java.util.Arrays.asList(
                Map.of(
                        "jobTitle", "Senior Software Engineer",
                        "company", "Tech Corp",
                        "location", "Pune Maharashtra",
                        "duration", "2020 - Present",
                        "responsibility", "Led development of microservices architecture, mentored junior developers, and improved system performance by 40%."
                )
        ));
        mockData.put("education", java.util.Arrays.asList(
                Map.of(
                        "degree", "Bachelor of Science in Computer Science",
                        "university", "State University",
                        "location", "Pune Maharashtra",
                        "graduationYear", "2019"
                )
        ));

        if (reason != null) {
            mockData.put("warning", reason);
        }
        mockData.put("think", "Mock response for testing purposes");
        return mockData;
    }

    private Map<String, Object> buildMockEmailResponse(String reason) {
        Map<String, Object> email = new HashMap<>();
        email.put("subject", "Thank you for your time and consideration");
        email.put("body", """
Dear Hiring Manager,

Thank you for taking the time to review my application. I am excited about the opportunity to contribute my skills and experience to your team.

I would welcome the chance to discuss how my background aligns with your needs and how I can add value to your organization.

Please let me know if there is anything else I can share.

Best regards,
Your Name
""".trim());
        email.put("tone", "Professional");
        email.put("highlights", List.of(
                "Clear subject line",
                "Polished opening and closing",
                "Professional, ready-to-send wording"
        ));
        email.put("preview", "Subject: " + email.get("subject") + "\n\n" + email.get("body"));

        if (reason != null) {
            email.put("warning", reason);
        }
        email.put("think", "Mock response for testing purposes");
        return email;
    }

    private Map<String, Object> buildMockPlacementResponse(String reason) {
        List<Map<String, Object>> opportunities = List.of(
                Map.of(
                        "role", "Software Engineer",
                        "companies", List.of("Google", "Microsoft", "Amazon"),
                        "locations", List.of("Bangalore", "Hyderabad", "Pune"),
                        "priority", "High",
                        "reason", "Strong match based on technical skills and experience level."
                ),
                Map.of(
                        "role", "Full Stack Developer",
                        "companies", List.of("Meta", "Netflix", "Uber"),
                        "locations", List.of("Mumbai", "Delhi", "Remote"),
                        "priority", "Medium",
                        "reason", "Good fit with some additional learning required."
                )
        );

        Map<String, Object> placement = new HashMap<>();
        placement.put("opportunities", opportunities);
        placement.put("careerAdvice", "Focus on building a strong portfolio and networking. Consider certifications in cloud technologies to increase opportunities.");
        if (reason != null) {
            placement.put("warning", reason);
        }
        placement.put("think", "Mock response for testing purposes");
        return placement;
    }

    // Overload to preserve existing behaviour
    private Map<String, Object> buildMockResponse() {
        return buildMockResponse(null);
    }

    private String extractTextFromFile(MultipartFile file) throws IOException {
        String originalFilename = file.getOriginalFilename() == null
                ? ""
                : file.getOriginalFilename().toLowerCase(Locale.ROOT);

        if (originalFilename.endsWith(".docx")) {
            return extractTextFromDocx(file);
        }

        if (originalFilename.endsWith(".txt") || originalFilename.endsWith(".md") || file.getContentType() != null
                && file.getContentType().toLowerCase(Locale.ROOT).startsWith("text/")) {
            return new String(file.getBytes(), StandardCharsets.UTF_8);
        }

        if (originalFilename.endsWith(".pdf") || "application/pdf".equalsIgnoreCase(file.getContentType())) {
            return extractTextFromPdf(file);
        }

        throw new IllegalArgumentException("Supported files: .txt, .pdf, and .docx resumes.");
    }

    private Map<String, Object> buildResumeAnalysisResponse(String extractedText, String fileName) {
        String cleanedText = extractedText == null ? "" : extractedText.replace("\r", "").trim();
        if (cleanedText.isBlank()) {
            throw new IllegalArgumentException("The uploaded file did not contain readable text.");
        }

        String lower = cleanedText.toLowerCase(Locale.ROOT);
        int wordCount = cleanedText.split("\\s+").length;
        int bulletCount = countMatches(cleanedText, "(?m)^\\s*[-*•]");
        int metricHits = countMatches(cleanedText, "(?i)(\\$\\s?\\d[\\d,]*|\\b\\d+(?:\\.\\d+)?%|\\b\\d+\\+\\b)");
        boolean hasEmail = Pattern.compile("[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}", Pattern.CASE_INSENSITIVE).matcher(cleanedText).find();
        boolean hasPhone = Pattern.compile("(\\+?\\d[\\d\\s().-]{7,}\\d)").matcher(cleanedText).find();
        boolean hasLinkedIn = lower.contains("linkedin");
        boolean hasGitHub = lower.contains("github");
        boolean hasPortfolio = lower.contains("portfolio") || lower.contains("website");

        List<String> sectionKeywords = List.of(
                "summary", "experience", "education", "skills", "projects",
                "certifications", "achievements", "languages", "interests"
        );
        int sectionHits = (int) sectionKeywords.stream().filter(lower::contains).count();

        List<String> atsKeywords = List.of(
                "achieved", "built", "created", "delivered", "designed", "developed",
                "improved", "increased", "led", "managed", "optimized", "reduced",
                "implemented", "launched", "automated", "collaborated", "analyzed",
                "tested", "deployed", "mentored", "sql", "react", "java", "spring",
                "python", "api", "cloud", "agile"
        );
        LinkedHashSet<String> matchedKeywords = new LinkedHashSet<>();
        atsKeywords.forEach(keyword -> {
            if (lower.contains(keyword)) {
                matchedKeywords.add(keyword);
            }
        });

        int keywordHits = matchedKeywords.size();

        double rawScore = 2.6;
        rawScore += Math.min(2.4, sectionHits * 0.38);
        rawScore += hasEmail ? 0.35 : 0;
        rawScore += hasPhone ? 0.35 : 0;
        rawScore += (hasLinkedIn || hasGitHub || hasPortfolio) ? 0.5 : 0;
        rawScore += Math.min(1.6, keywordHits * 0.12);
        rawScore += Math.min(1.2, bulletCount * 0.08);
        rawScore += Math.min(1.2, metricHits * 0.18);
        if (wordCount >= 220 && wordCount <= 850) {
            rawScore += 0.9;
        } else if (wordCount >= 160 && wordCount <= 1000) {
            rawScore += 0.45;
        }

        double score = Math.max(1.0, Math.min(10.0, Math.round(rawScore * 10.0) / 10.0));
        String band = score >= 8.5 ? "Strong" : score >= 7 ? "Good" : score >= 5.5 ? "Fair" : "Needs work";

        List<String> strengths = new java.util.ArrayList<>();
        List<String> improvements = new java.util.ArrayList<>();

        if (hasEmail && hasPhone) {
            strengths.add("Contact information is present, which helps recruiters reach you quickly.");
        } else {
            improvements.add("Add both email and phone number so the resume is easy to contact from ATS exports.");
        }

        if (sectionHits >= 4) {
            strengths.add("The resume includes several core sections, which improves ATS scanability.");
        } else {
            improvements.add("Add clearer section headings like Summary, Experience, Skills, Projects, and Education.");
        }

        if (bulletCount >= 4) {
            strengths.add("Bullet points are present, which makes achievements easier to scan.");
        } else {
            improvements.add("Use more bullet points for experience and projects instead of dense paragraphs.");
        }

        if (metricHits >= 2) {
            strengths.add("You already include measurable outcomes, which strengthens impact.");
        } else {
            improvements.add("Add metrics such as percentages, revenue, users, performance gains, or delivery timelines.");
        }

        if (keywordHits >= 8) {
            strengths.add("The resume contains a healthy mix of action verbs and skill keywords.");
        } else {
            improvements.add("Add more role-specific keywords and action verbs like built, optimized, led, and deployed.");
        }

        if (wordCount < 180) {
            improvements.add("The resume is quite short. Add more detail to responsibilities, projects, and outcomes.");
        } else if (wordCount > 950) {
            improvements.add("The resume is long for most roles. Tighten content so the strongest points stand out.");
        } else {
            strengths.add("The resume length is in a workable range for most applications.");
        }

        if (!(hasLinkedIn || hasGitHub || hasPortfolio)) {
            improvements.add("Add LinkedIn, GitHub, or portfolio links to strengthen your profile section.");
        }

        if (improvements.isEmpty()) {
            improvements.add("Tailor the keywords and impact bullets to each job description before applying.");
        }

        String feedback = improvements.stream().limit(3).reduce((a, b) -> a + " " + b).orElse(
                "Strong resume foundation. Tailor it further for the exact role you want."
        );

        Map<String, Object> metrics = new HashMap<>();
        metrics.put("wordCount", wordCount);
        metrics.put("bulletCount", bulletCount);
        metrics.put("sectionCount", sectionHits);
        metrics.put("keywordHits", keywordHits);
        metrics.put("metricHits", metricHits);

        Map<String, Object> analysis = new HashMap<>();
        analysis.put("band", band);
        analysis.put("metrics", metrics);
        analysis.put("strengths", strengths);
        analysis.put("improvements", improvements);
        analysis.put("matchedKeywords", List.copyOf(matchedKeywords));
        analysis.put("fileName", fileName == null || fileName.isBlank() ? "uploaded resume" : fileName);

        Map<String, Object> response = new HashMap<>();
        response.put("score", score);
        response.put("feedback", feedback);
        response.put("uploadedText", cleanedText);
        response.put("analysis", analysis);
        return response;
    }

    private Map<String, Object> extractStructuredResumeFromUploadedText(String extractedText) {
        String cleanedText = extractedText == null ? "" : extractedText.replace("\r", "").trim();
        if (cleanedText.length() < 80) {
            return null;
        }

        String systemPrompt = """
You extract structured resume data from existing resume text.
Return ONLY a JSON object inside a ```json``` block.
Do not invent facts. If something is missing, use empty strings or empty arrays.
Use exactly this shape:
{
  "personalInformation": {
    "fullName": "",
    "email": "",
    "phoneNumber": "",
    "location": "",
    "linkedin": "",
    "gitHub": "",
    "portfolio": ""
  },
  "summary": "",
  "skills": [{"title": "", "level": ""}],
  "experience": [{
    "jobTitle": "",
    "company": "",
    "location": "",
    "duration": "",
    "responsibility": ""
  }],
  "education": [{
    "degree": "",
    "university": "",
    "location": "",
    "graduationYear": ""
  }],
  "certifications": [{
    "title": "",
    "issuingOrganization": "",
    "year": ""
  }],
  "projects": [{
    "title": "",
    "description": "",
    "technologiesUsed": [],
    "githubLink": ""
  }],
  "achievements": [{
    "title": "",
    "year": "",
    "extraInformation": ""
  }],
  "languages": [{"name": ""}],
  "interests": [{"name": ""}]
}
""";

        String userPrompt = """
Extract the candidate's information from this existing resume text.

Rules:
- Preserve facts from the resume; do not add unsupported claims.
- Split combined skill lines into separate skill objects.
- Return at most 10 strong, relevant skills.
- Never include section headings, labels like "Frontend:" or "Tools:", company names, locations, education names, or work-history text in the skills list.
- Convert work history into structured experience entries where possible.
- Keep bullet text concise but faithful to the original resume.
- Ignore junk project titles or isolated short tokens.
- Prefer "linkedin" as the key name.

Resume text:
\"\"\"
%s
\"\"\"
""".formatted(cleanedText);

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

            String aiResponse = aiFuture.get(AI_TIMEOUT_SECONDS, TimeUnit.SECONDS);
            return parseStructuredResumePayload(aiResponse);
        } catch (TimeoutException timeoutException) {
            if (aiFuture != null) {
                aiFuture.cancel(true);
            }
            System.err.println("Resume import structuring timed out: " + timeoutException.getMessage());
            return null;
        } catch (Exception exception) {
            System.err.println("Resume import structuring failed: " + exception.getMessage());
            return null;
        }
    }

    private Map<String, Object> parseStructuredResumePayload(String response) {
        Map<String, Object> wrapped = parseMultipleResponses(response);
        Object parsedData = wrapped.get("data");
        Map<String, Object> fromWrapped = asMap(parsedData);
        if (fromWrapped != null && !fromWrapped.isEmpty()) {
            return normalizeStructuredResume(fromWrapped);
        }

        String cleaned = response == null ? "" : response.trim();
        if (cleaned.startsWith("{") && cleaned.endsWith("}")) {
            try {
                ObjectMapper objectMapper = new ObjectMapper();
                Map<String, Object> direct = objectMapper.readValue(cleaned, Map.class);
                return normalizeStructuredResume(direct);
            } catch (Exception exception) {
                System.err.println("Could not parse direct JSON resume payload: " + exception.getMessage());
            }
        }

        return null;
    }

    private Map<String, Object> normalizeStructuredResume(Map<String, Object> resumeData) {
        if (resumeData == null || resumeData.isEmpty()) {
            return null;
        }

        Map<String, Object> normalized = new HashMap<>(resumeData);
        Map<String, Object> personalInformation = asMap(resumeData.get("personalInformation"));
        if (personalInformation == null) {
            personalInformation = new HashMap<>();
        } else {
            personalInformation = new HashMap<>(personalInformation);
        }

        if (!personalInformation.containsKey("linkedin") && personalInformation.containsKey("linkedIn")) {
            personalInformation.put("linkedin", personalInformation.get("linkedIn"));
        }
        if (!personalInformation.containsKey("gitHub") && personalInformation.containsKey("github")) {
            personalInformation.put("gitHub", personalInformation.get("github"));
        }

        normalized.put("personalInformation", normalizePersonalInformation(personalInformation));
        normalized.put("summary", cleanTextBlock(extractString(resumeData.get("summary"))));
        normalized.put("skills", normalizeSkills(asMapList(resumeData.get("skills"))));
        normalized.put("experience", normalizeExperienceEntries(asMapList(resumeData.get("experience"))));
        normalized.put("education", normalizeEducationEntries(asMapList(resumeData.get("education"))));
        normalized.put("projects", normalizeProjectEntries(asMapList(resumeData.get("projects"))));
        normalized.put("certifications", normalizeCertificationEntries(asMapList(resumeData.get("certifications"))));
        normalized.put("achievements", normalizeAchievementEntries(asMapList(resumeData.get("achievements"))));
        normalized.put("languages", normalizeNamedEntries(asMapList(resumeData.get("languages")), "name", 5));
        normalized.put("interests", normalizeNamedEntries(asMapList(resumeData.get("interests")), "name", 5));
        return normalized;
    }

    private Map<String, Object> normalizePersonalInformation(Map<String, Object> personalInformation) {
        Map<String, Object> normalized = new HashMap<>();
        normalized.put("fullName", cleanTextBlock(extractString(personalInformation.get("fullName"))));
        normalized.put("email", extractString(personalInformation.get("email")));
        normalized.put("phoneNumber", extractString(personalInformation.get("phoneNumber")));
        normalized.put("location", cleanTextBlock(extractString(personalInformation.get("location"))));
        normalized.put("linkedin", extractString(
                personalInformation.getOrDefault("linkedin", personalInformation.get("linkedIn"))
        ));
        normalized.put("gitHub", extractString(
                personalInformation.getOrDefault("gitHub", personalInformation.get("github"))
        ));
        normalized.put("portfolio", extractString(personalInformation.get("portfolio")));
        return normalized;
    }

    private List<Map<String, Object>> normalizeSkills(List<Map<String, Object>> rawSkills) {
        LinkedHashSet<String> uniqueSkills = new LinkedHashSet<>();
        for (Map<String, Object> rawSkill : rawSkills) {
            String title = extractString(rawSkill.get("title"));
            if (title.isBlank()) {
                continue;
            }

            extractSkillTokens(title).stream()
                    .filter(token -> !token.isBlank())
                    .forEach(uniqueSkills::add);
        }

        return uniqueSkills.stream()
                .limit(10)
                .map(skill -> Map.<String, Object>of("title", skill, "level", ""))
                .toList();
    }

    private List<String> extractSkillTokens(String rawValue) {
        if (rawValue == null || rawValue.isBlank()) {
            return List.of();
        }

        String cleaned = rawValue
                .replace('\n', ',')
                .replace("•", ",")
                .replace("â€¢", ",")
                .trim();

        String lower = cleaned.toLowerCase(Locale.ROOT);
        List<String> prefixes = List.of(
                "programming languages", "languages", "frontend", "backend", "database",
                "tools", "tools & technology", "technology", "technologies", "frameworks", "libraries"
        );

        for (String prefix : prefixes) {
            if (lower.startsWith(prefix + ":")) {
                cleaned = cleaned.substring(cleaned.indexOf(':') + 1).trim();
                lower = cleaned.toLowerCase(Locale.ROOT);
                break;
            }
        }

        cleaned = cleaned.replace(" / ", ",");
        cleaned = cleaned.replace(" | ", ",");
        cleaned = cleaned.replace(" and ", ", ");

        LinkedHashSet<String> tokens = new LinkedHashSet<>();
        for (String piece : cleaned.split(",")) {
            String token = piece
                    .replaceAll("^[-*]+\\s*", "")
                    .replaceAll("\\(.*?\\)", "")
                    .replaceAll("\\.$", "")
                    .trim();

            String normalized = normalizeSkillName(token);
            if (!normalized.isBlank() && !isNoiseSkill(normalized)) {
                tokens.add(normalized);
            }
        }

        return List.copyOf(tokens);
    }

    private String normalizeSkillName(String token) {
        String cleaned = token == null ? "" : token.trim();
        if (cleaned.isBlank()) {
            return "";
        }

        Map<String, String> aliases = Map.ofEntries(
                Map.entry("java", "Java"),
                Map.entry("javascript", "JavaScript"),
                Map.entry("c++", "C++"),
                Map.entry("html", "HTML"),
                Map.entry("css", "CSS"),
                Map.entry("react", "React"),
                Map.entry("reactjs", "React.js"),
                Map.entry("react.js", "React.js"),
                Map.entry("spring boot", "Spring Boot"),
                Map.entry("spring mvc", "Spring MVC"),
                Map.entry("hibernate", "Hibernate"),
                Map.entry("mysql", "MySQL"),
                Map.entry("git", "Git"),
                Map.entry("github", "GitHub"),
                Map.entry("postman", "Postman"),
                Map.entry("intellij idea", "IntelliJ IDEA"),
                Map.entry("eclipse", "Eclipse"),
                Map.entry("bootstrap", "Bootstrap"),
                Map.entry("restful apis", "REST APIs"),
                Map.entry("restful api", "REST API"),
                Map.entry("rest api", "REST API")
        );

        String lowered = cleaned.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ");
        if (aliases.containsKey(lowered)) {
            return aliases.get(lowered);
        }

        return cleaned.replaceAll("\\s+", " ").trim();
    }

    private boolean isNoiseSkill(String token) {
        String lower = token.toLowerCase(Locale.ROOT);
        if (lower.isBlank()) {
            return true;
        }

        List<String> bannedExact = List.of(
                "summary", "skills", "experience", "work experience", "education",
                "projects", "project", "details", "profile", "social links",
                "case studies", "work history", "location"
        );
        if (bannedExact.contains(lower)) {
            return true;
        }

        return lower.contains("@")
                || lower.contains("http")
                || lower.contains("linkedin")
                || lower.contains("academy")
                || lower.contains("university")
                || lower.contains("onsite")
                || lower.contains("india")
                || lower.contains("pune")
                || lower.contains("experience")
                || lower.contains("developer")
                || lower.contains("intern")
                || lower.length() < 2
                || lower.length() > 28;
    }

    private List<Map<String, Object>> normalizeExperienceEntries(List<Map<String, Object>> entries) {
        List<Map<String, Object>> normalized = new ArrayList<>();
        for (Map<String, Object> entry : entries) {
            Map<String, Object> cleaned = new HashMap<>();
            cleaned.put("jobTitle", cleanTextBlock(extractString(entry.get("jobTitle"))));
            cleaned.put("company", cleanTextBlock(extractString(entry.get("company"))));
            cleaned.put("location", cleanTextBlock(extractString(entry.get("location"))));
            cleaned.put("duration", cleanTextBlock(extractString(entry.get("duration"))));
            cleaned.put("responsibility", cleanTextBlock(extractString(entry.get("responsibility"))));

            boolean hasMeaningfulContent = cleaned.values().stream()
                    .map(this::extractString)
                    .anyMatch(value -> !value.isBlank());
            if (hasMeaningfulContent) {
                normalized.add(cleaned);
            }
        }
        return normalized;
    }

    private List<Map<String, Object>> normalizeEducationEntries(List<Map<String, Object>> entries) {
        List<Map<String, Object>> normalized = new ArrayList<>();
        for (Map<String, Object> entry : entries) {
            Map<String, Object> cleaned = new HashMap<>();
            cleaned.put("degree", cleanTextBlock(extractString(entry.get("degree"))));
            cleaned.put("university", cleanTextBlock(extractString(entry.get("university"))));
            cleaned.put("location", cleanTextBlock(extractString(entry.get("location"))));
            cleaned.put("graduationYear", cleanTextBlock(extractString(entry.get("graduationYear"))));

            boolean hasMeaningfulContent = cleaned.values().stream()
                    .map(this::extractString)
                    .anyMatch(value -> !value.isBlank());
            if (hasMeaningfulContent) {
                normalized.add(cleaned);
            }
        }
        return normalized;
    }

    private List<Map<String, Object>> normalizeProjectEntries(List<Map<String, Object>> entries) {
        List<Map<String, Object>> normalized = new ArrayList<>();
        for (Map<String, Object> entry : entries) {
            String title = cleanTextBlock(extractString(entry.get("title")));
            String description = cleanTextBlock(extractString(entry.get("description")));
            if (isNoiseProjectTitle(title) && description.length() < 20) {
                continue;
            }

            List<String> technologies = new ArrayList<>();
            Object technologiesUsed = entry.get("technologiesUsed");
            if (technologiesUsed instanceof List<?> list) {
                for (Object item : list) {
                    extractSkillTokens(extractString(item)).forEach(technologies::add);
                }
            }

            Map<String, Object> cleaned = new HashMap<>();
            cleaned.put("title", title);
            cleaned.put("description", description);
            cleaned.put("technologiesUsed", technologies.stream().distinct().limit(6).toList());
            cleaned.put("githubLink", extractString(entry.get("githubLink")));

            boolean hasMeaningfulContent =
                    !title.isBlank() ||
                    !description.isBlank() ||
                    !technologies.isEmpty() ||
                    !extractString(entry.get("githubLink")).isBlank();
            if (hasMeaningfulContent) {
                normalized.add(cleaned);
            }
        }
        return normalized;
    }

    private boolean isNoiseProjectTitle(String title) {
        String lower = title == null ? "" : title.trim().toLowerCase(Locale.ROOT);
        return lower.isBlank()
                || lower.length() < 3
                || List.of("df", "rg", "project", "projects", "case study", "case studies").contains(lower);
    }

    private List<Map<String, Object>> normalizeCertificationEntries(List<Map<String, Object>> entries) {
        List<Map<String, Object>> normalized = new ArrayList<>();
        for (Map<String, Object> entry : entries) {
            Map<String, Object> cleaned = new HashMap<>();
            cleaned.put("title", cleanTextBlock(extractString(entry.get("title"))));
            cleaned.put("issuingOrganization", cleanTextBlock(extractString(entry.get("issuingOrganization"))));
            cleaned.put("year", cleanTextBlock(extractString(entry.get("year"))));
            if (cleaned.values().stream().map(this::extractString).anyMatch(value -> !value.isBlank())) {
                normalized.add(cleaned);
            }
        }
        return normalized;
    }

    private List<Map<String, Object>> normalizeAchievementEntries(List<Map<String, Object>> entries) {
        List<Map<String, Object>> normalized = new ArrayList<>();
        for (Map<String, Object> entry : entries) {
            Map<String, Object> cleaned = new HashMap<>();
            cleaned.put("title", cleanTextBlock(extractString(entry.get("title"))));
            cleaned.put("year", cleanTextBlock(extractString(entry.get("year"))));
            cleaned.put("extraInformation", cleanTextBlock(extractString(entry.get("extraInformation"))));
            if (cleaned.values().stream().map(this::extractString).anyMatch(value -> !value.isBlank())) {
                normalized.add(cleaned);
            }
        }
        return normalized;
    }

    private List<Map<String, Object>> normalizeNamedEntries(List<Map<String, Object>> entries, String key, int limit) {
        LinkedHashSet<String> unique = new LinkedHashSet<>();
        for (Map<String, Object> entry : entries) {
            String value = cleanTextBlock(extractString(entry.get(key)));
            if (!value.isBlank()) {
                unique.add(value);
            }
        }

        return unique.stream()
                .limit(limit)
                .map(value -> Map.<String, Object>of(key, value))
                .toList();
    }

    private String cleanTextBlock(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value
                .replace('\r', ' ')
                .replace("â€¢", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private int countMatches(String text, String regex) {
        Matcher matcher = Pattern.compile(regex).matcher(text);
        int count = 0;
        while (matcher.find()) {
            count += 1;
        }
        return count;
    }

    private String extractTextFromDocx(MultipartFile file) throws IOException {
        try (XWPFDocument document = new XWPFDocument(file.getInputStream());
             XWPFWordExtractor extractor = new XWPFWordExtractor(document)) {
            return extractor.getText();
        }
    }

    private String extractTextFromPdf(MultipartFile file) throws IOException {
        try (PDDocument document = Loader.loadPDF(file.getBytes())) {
            PDFTextStripper stripper = new PDFTextStripper();
            return stripper.getText(document);
        }
    }

    private List<String> extractJobKeywords(String jobDescription) {
        String source = jobDescription.toLowerCase(Locale.ROOT);
        LinkedHashSet<String> keywords = new LinkedHashSet<>();
        List<String> seededPhrases = List.of(
                "spring boot", "microservices", "rest api", "machine learning",
                "data analysis", "react", "typescript", "javascript", "java",
                "python", "sql", "mysql", "postgresql", "docker", "kubernetes",
                "aws", "azure", "git", "html", "css", "node", "testing",
                "junit", "agile", "communication", "leadership", "ci/cd"
        );
        seededPhrases.stream()
                .filter(source::contains)
                .forEach(keywords::add);

        Map<String, Integer> frequency = new HashMap<>();
        Matcher matcher = Pattern.compile("[a-z][a-z0-9+#./-]{2,}").matcher(source);
        List<String> stopWords = List.of(
                "about", "after", "again", "along", "also", "and", "applicant", "applications",
                "build", "candidate", "collaborate", "company", "deliver", "experienced", "experience",
                "from", "have", "into", "join", "looking", "must", "need", "responsible",
                "role", "should", "team", "that", "their", "these", "they", "using",
                "with", "work", "your", "years"
        );
        while (matcher.find()) {
            String token = matcher.group();
            if (stopWords.contains(token) || token.chars().allMatch(Character::isDigit)) {
                continue;
            }
            frequency.merge(token, 1, Integer::sum);
        }

        frequency.entrySet().stream()
                .sorted(Map.Entry.<String, Integer>comparingByValue(Comparator.reverseOrder()))
                .map(Map.Entry::getKey)
                .limit(18)
                .forEach(keywords::add);

        return keywords.stream().limit(16).toList();
    }

    private String buildResumeCorpus(Map<String, Object> resumeData) {
        StringBuilder builder = new StringBuilder();
        builder.append(extractString(resumeData.get("summary"))).append(' ');
        appendPersonalInformation(builder, asMap(resumeData.get("personalInformation")));
        appendMapList(builder, asMapList(resumeData.get("skills")), List.of("title", "level"));
        appendMapList(builder, asMapList(resumeData.get("experience")),
                List.of("jobTitle", "company", "location", "duration", "responsibility"));
        appendMapList(builder, asMapList(resumeData.get("projects")),
                List.of("title", "description", "githubLink"));
        appendMapList(builder, asMapList(resumeData.get("education")),
                List.of("degree", "university", "location", "graduationYear"));
        appendMapList(builder, asMapList(resumeData.get("certifications")),
                List.of("title", "issuingOrganization", "year"));
        appendMapList(builder, asMapList(resumeData.get("achievements")),
                List.of("title", "year", "extraInformation"));
        appendMapList(builder, asMapList(resumeData.get("languages")), List.of("name"));
        appendMapList(builder, asMapList(resumeData.get("interests")), List.of("name"));
        return builder.toString().replaceAll("\\s+", " ").trim();
    }

    private void appendPersonalInformation(StringBuilder builder, Map<String, Object> personalInformation) {
        if (personalInformation == null) {
            return;
        }
        personalInformation.values().stream()
                .map(this::extractString)
                .filter(value -> !value.isBlank())
                .forEach(value -> builder.append(value).append(' '));
    }

    private void appendMapList(StringBuilder builder, List<Map<String, Object>> items, List<String> keys) {
        for (Map<String, Object> item : items) {
            for (String key : keys) {
                builder.append(extractString(item.get(key))).append(' ');
            }
            Object technologiesUsed = item.get("technologiesUsed");
            if (technologiesUsed instanceof List<?> list) {
                list.stream()
                        .map(this::extractString)
                        .filter(value -> !value.isBlank())
                        .forEach(value -> builder.append(value).append(' '));
            }
        }
    }

    private String buildMatchSummary(int score, List<String> matchedKeywords, List<String> missingKeywords) {
        if (score >= 80) {
            return "The resume already aligns well with the target job. Focus on sharpening impact and metrics.";
        }
        if (score >= 60) {
            return "The resume has a solid base match, but it can be tailored further with missing role-specific keywords.";
        }
        return "The resume needs stronger tailoring to reflect the target role, especially in skills and achievement bullets.";
    }

    private List<Map<String, Object>> buildRewriteSuggestions(
            Map<String, Object> resumeData,
            List<String> missingKeywords,
            List<String> extractedKeywords
    ) {
        List<Map<String, Object>> suggestions = new ArrayList<>();
        List<String> fallbackKeywords = missingKeywords.isEmpty() ? extractedKeywords : missingKeywords;

        for (Map<String, Object> experience : asMapList(resumeData.get("experience"))) {
            addSuggestionIfPresent(
                    suggestions,
                    "Experience",
                    extractString(experience.get("jobTitle")),
                    extractString(experience.get("responsibility")),
                    fallbackKeywords,
                    "Delivered"
            );
            if (suggestions.size() >= 4) {
                return suggestions;
            }
        }

        for (Map<String, Object> project : asMapList(resumeData.get("projects"))) {
            addSuggestionIfPresent(
                    suggestions,
                    "Project",
                    extractString(project.get("title")),
                    extractString(project.get("description")),
                    fallbackKeywords,
                    "Built"
            );
            if (suggestions.size() >= 4) {
                return suggestions;
            }
        }

        return suggestions;
    }

    private void addSuggestionIfPresent(
            List<Map<String, Object>> suggestions,
            String section,
            String title,
            String original,
            List<String> keywords,
            String preferredVerb
    ) {
        String cleaned = original == null ? "" : original.trim();
        if (cleaned.isBlank()) {
            return;
        }

        List<String> supportingKeywords = keywords.stream()
                .filter(Objects::nonNull)
                .filter(keyword -> !keyword.isBlank())
                .filter(keyword -> !cleaned.toLowerCase(Locale.ROOT).contains(keyword.toLowerCase(Locale.ROOT)))
                .limit(2)
                .toList();

        String rewritten = cleaned;
        if (!Pattern.compile("^(built|led|created|designed|developed|implemented|managed|delivered|optimized|launched)\\b",
                Pattern.CASE_INSENSITIVE).matcher(rewritten).find()) {
            rewritten = preferredVerb + " " + decapitalize(rewritten);
        }
        if (!supportingKeywords.isEmpty()) {
            rewritten += " with emphasis on " + String.join(" and ", supportingKeywords);
        }
        if (!Pattern.compile("(\\$\\s?\\d|\\b\\d+(?:\\.\\d+)?%|\\b\\d+\\+\\b)").matcher(rewritten).find()) {
            rewritten += " to improve delivery, quality, or measurable business impact";
        }
        rewritten = ensureSentence(rewritten);

        suggestions.add(Map.of(
                "section", section,
                "title", title == null || title.isBlank() ? section + " bullet" : title,
                "original", ensureSentence(cleaned),
                "suggestion", rewritten,
                "reason", supportingKeywords.isEmpty()
                        ? "Add a stronger action/result structure."
                        : "Bring in role-specific keywords from the job description."
        ));
    }

    private Map<String, Object> buildSectionSignals(Map<String, Object> resumeData) {
        return Map.of(
                "skillsCount", asMapList(resumeData.get("skills")).size(),
                "experienceCount", asMapList(resumeData.get("experience")).size(),
                "projectCount", asMapList(resumeData.get("projects")).size(),
                "educationCount", asMapList(resumeData.get("education")).size()
        );
    }

    private Map<String, Object> asMap(Object value) {
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> cast = new HashMap<>();
            map.forEach((key, val) -> cast.put(String.valueOf(key), val));
            return cast;
        }
        return null;
    }

    private List<Map<String, Object>> asMapList(Object value) {
        if (!(value instanceof List<?> list)) {
            return List.of();
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object item : list) {
            Map<String, Object> map = asMap(item);
            if (map != null) {
                result.add(map);
            }
        }
        return result;
    }

    private String extractString(Object value) {
        return value == null ? "" : String.valueOf(value).trim();
    }

    private String decapitalize(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return Character.toLowerCase(value.charAt(0)) + value.substring(1);
    }

    private String ensureSentence(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        String trimmed = value.trim();
        if (trimmed.endsWith(".") || trimmed.endsWith("!") || trimmed.endsWith("?")) {
            return trimmed;
        }
        return trimmed + ".";
    }
}
