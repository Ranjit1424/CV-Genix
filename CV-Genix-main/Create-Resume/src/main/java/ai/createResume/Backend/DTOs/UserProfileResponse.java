package ai.createResume.Backend.DTOs;

import java.util.List;

public record UserProfileResponse(
        Long id,
        String name,
        String email,
        String createdAt,
        List<SavedResumeResponse> resumes
) {
}
