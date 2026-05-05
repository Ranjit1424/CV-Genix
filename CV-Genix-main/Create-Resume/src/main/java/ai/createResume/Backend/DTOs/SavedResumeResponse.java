package ai.createResume.Backend.DTOs;

import java.util.List;
import java.util.Map;

public record SavedResumeResponse(
        Long id,
        String fileName,
        String template,
        List<Integer> accent,
        Map<String, Object> resumeData,
        String savedAt
) {
}
