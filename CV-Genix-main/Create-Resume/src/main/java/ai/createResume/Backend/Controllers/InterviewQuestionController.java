package ai.createResume.Backend.Controllers;

import ai.createResume.Backend.InterviewQuestionRequest;
import ai.createResume.Backend.Services.InterviewQuestionService;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "${app.cors.allowed-origins:http://localhost:5173}")
@RequestMapping("/api/v1/interviews")
public class InterviewQuestionController {

    private final InterviewQuestionService interviewQuestionService;

    public InterviewQuestionController(InterviewQuestionService interviewQuestionService) {
        this.interviewQuestionService = interviewQuestionService;
    }

    @PostMapping("/questions")
    public ResponseEntity<Map<String, Object>> buildInterviewQuestions(@RequestBody InterviewQuestionRequest request) {
        try {
            if (request == null) {
                throw new IllegalArgumentException("Interview input is required.");
            }

            Map<String, Object> response = interviewQuestionService.generateInterviewQuestions(
                    request.candidateDescription(),
                    request.targetRole(),
                    request.jobDescription(),
                    request.questionCount(),
                    request.interviewStyle(),
                    request.interviewSituation()
            );
            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (IllegalArgumentException badRequest) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", badRequest.getMessage());
            return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
        } catch (IOException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Could not load interview prompt. " + e.getMessage());
            return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Interview question service unavailable. " + e.getMessage());
            return new ResponseEntity<>(error, HttpStatus.SERVICE_UNAVAILABLE);
        }
    }
}
