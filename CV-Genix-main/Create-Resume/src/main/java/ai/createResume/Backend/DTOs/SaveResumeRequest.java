package ai.createResume.Backend.DTOs;

import java.util.List;
import java.util.Map;

public record SaveResumeRequest(
        String fileName,
        String template,
        List<Integer> accent,
        Map<String, Object> resumeData
) {
}
