package ai.createResume.Backend.Services;

import java.io.IOException;
import java.util.Map;

public interface InterviewQuestionService {

    Map<String, Object> generateInterviewQuestions(
            String candidateDescription,
            String targetRole,
            String jobDescription,
            Integer questionCount,
            String interviewStyle,
            String interviewSituation
    ) throws IOException;
}
