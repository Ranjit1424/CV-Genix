package ai.createResume.Backend.Services;

import java.io.IOException;
import java.util.Map;

public interface ResumeService {

    default Map<String, Object> generateResumeResponse(String userResumeDescription) throws IOException {
        return generateResumeResponse(userResumeDescription, null);
    }

    Map<String, Object> generateResumeResponse(String userResumeDescription, String jobDescription) throws IOException;

    Map<String, Object> generateResumeFromFile(org.springframework.web.multipart.MultipartFile file) throws IOException;

    Map<String, Object> analyzeJobMatch(String jobDescription, Map<String, Object> resumeData);

    default Map<String, Object> generateProfessionalEmailResponse(String emailPrompt) throws IOException {
        return generateProfessionalEmailResponse(emailPrompt, "Professional");
    }

    Map<String, Object> generateProfessionalEmailResponse(String emailPrompt, String tone) throws IOException;

    Map<String, Object> generatePlacementOpportunities(String userDescription) throws IOException;
}
