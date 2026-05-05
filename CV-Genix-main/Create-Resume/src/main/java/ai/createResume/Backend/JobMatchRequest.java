package ai.createResume.Backend;

import java.util.Map;

public record JobMatchRequest(String jobDescription, Map<String, Object> resumeData) {}
