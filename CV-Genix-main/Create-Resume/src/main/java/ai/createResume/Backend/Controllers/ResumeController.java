package ai.createResume.Backend.Controllers;

import ai.createResume.Backend.ResumeRequest;
import ai.createResume.Backend.Services.ResumeService;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@CrossOrigin("*")
@RequestMapping("/api/v1/resume")
public class ResumeController {

    private ResumeService resumeService;

    public ResumeController(ResumeService resumeService) {
        this.resumeService = resumeService;
    }

    @PostMapping("/generate")
    public ResponseEntity<Map<String, Object>> getResumeData(
            @RequestBody ResumeRequest resumeRequest
    ) {
        try {
            Map<String, Object> response = resumeService.generateResumeResponse(
                    resumeRequest.userDescription(),
                    resumeRequest.jobDescription()
            );
            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (IOException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "File reading error: " + e.getMessage());
            return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Ollama service not available. Please ensure Ollama is running on localhost:11434. " + e.getMessage());
            return new ResponseEntity<>(error, HttpStatus.SERVICE_UNAVAILABLE);
        }
    }

    @PostMapping("/job-match")
    public ResponseEntity<Map<String, Object>> analyzeJobMatch(@RequestBody Map<String, Object> payload) {
        try {
            String jobDescription = payload.getOrDefault("jobDescription", "").toString();
            Object resumeDataObj = payload.get("resumeData");
            if (!(resumeDataObj instanceof Map)) {
                throw new IllegalArgumentException("Resume data is required for job match analysis.");
            }
            @SuppressWarnings("unchecked")
            Map<String, Object> resumeData = (Map<String, Object>) resumeDataObj;
            Map<String, Object> response = resumeService.analyzeJobMatch(jobDescription, resumeData);
            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (IllegalArgumentException badRequest) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", badRequest.getMessage());
            return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Job match analysis failed. " + e.getMessage());
            return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PostMapping("/upload")
    public ResponseEntity<Map<String, Object>> rateResumeFromFile(@RequestParam("file") MultipartFile file) {
        try {
            Map<String, Object> response = resumeService.generateResumeFromFile(file);
            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (IllegalArgumentException badFile) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", badFile.getMessage());
            return new ResponseEntity<>(error, HttpStatus.BAD_REQUEST);
        } catch (IOException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Could not read Word file: " + e.getMessage());
            return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "ATS rating service unavailable. " + e.getMessage());
            return new ResponseEntity<>(error, HttpStatus.SERVICE_UNAVAILABLE);
        }
    }

    @PostMapping("/placement")
    public ResponseEntity<Map<String, Object>> getPlacementOpportunities(
            @RequestBody ResumeRequest resumeRequest
    ) {
        try {
            Map<String, Object> response = resumeService.generatePlacementOpportunities(resumeRequest.userDescription());
            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (IOException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "File reading error: " + e.getMessage());
            return new ResponseEntity<>(error, HttpStatus.INTERNAL_SERVER_ERROR);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Ollama service not available. Please ensure Ollama is running on localhost:11434. " + e.getMessage());
            return new ResponseEntity<>(error, HttpStatus.SERVICE_UNAVAILABLE);
        }
    }
}
