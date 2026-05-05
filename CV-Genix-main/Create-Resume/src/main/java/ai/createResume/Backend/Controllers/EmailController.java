package ai.createResume.Backend.Controllers;

import ai.createResume.Backend.EmailRequest;
import ai.createResume.Backend.Services.ResumeService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

@RestController
@CrossOrigin(origins = "${app.cors.allowed-origins:http://localhost:5173}")
@RequestMapping("/api/v1/email")
public class EmailController {

    private final ResumeService resumeService;

    public EmailController(ResumeService resumeService) {
        this.resumeService = resumeService;
    }

    @PostMapping("/generate")
    public ResponseEntity<Map<String, Object>> generateEmail(@RequestBody EmailRequest request) {
        try {
            Map<String, Object> response = resumeService.generateProfessionalEmailResponse(
                    request.prompt(),
                    request.tone()
            );
            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (IOException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Could not prepare the email prompt: " + e.getMessage());
            return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Email generation service unavailable. " + e.getMessage());
            return new ResponseEntity<>(error, HttpStatus.SERVICE_UNAVAILABLE);
        }
    }
}
