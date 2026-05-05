package ai.createResume.Backend.Controllers;

import ai.createResume.Backend.Services.JobSearchService;
import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@CrossOrigin(origins = "${app.cors.allowed-origins:http://localhost:5173}")
@RequestMapping("/api/v1/jobs")
public class JobSearchController {

    private final JobSearchService jobSearchService;

    public JobSearchController(JobSearchService jobSearchService) {
        this.jobSearchService = jobSearchService;
    }

    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchJobs(
            @RequestParam(defaultValue = "") String q,
            @RequestParam(defaultValue = "") String category,
            @RequestParam(defaultValue = "") String location,
            @RequestParam(defaultValue = "") String company,
            @RequestParam(defaultValue = "20") Integer limit
    ) {
        try {
            Map<String, Object> response = jobSearchService.searchJobs(q, category, location, company, limit);
            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (IOException e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Could not reach the live jobs feed. " + e.getMessage());
            return new ResponseEntity<>(error, HttpStatus.BAD_GATEWAY);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            Map<String, Object> error = new HashMap<>();
            error.put("error", "The live jobs request was interrupted.");
            return new ResponseEntity<>(error, HttpStatus.SERVICE_UNAVAILABLE);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Live job search unavailable. " + e.getMessage());
            return new ResponseEntity<>(error, HttpStatus.SERVICE_UNAVAILABLE);
        }
    }
}
