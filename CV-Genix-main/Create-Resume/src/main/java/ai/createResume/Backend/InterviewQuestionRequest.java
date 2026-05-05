package ai.createResume.Backend;

public record InterviewQuestionRequest(
        String candidateDescription,
        String targetRole,
        String jobDescription,
        Integer questionCount,
        String interviewStyle,
        String interviewSituation
) {}
