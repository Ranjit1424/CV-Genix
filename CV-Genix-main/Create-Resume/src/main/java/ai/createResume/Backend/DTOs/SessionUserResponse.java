package ai.createResume.Backend.DTOs;

public record SessionUserResponse(
        Long id,
        String name,
        String email,
        String createdAt,
        String sessionToken
) {
}
