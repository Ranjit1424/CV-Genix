package ai.createResume.Backend.Controllers;

import ai.createResume.Backend.DTOs.SaveResumeRequest;
import ai.createResume.Backend.DTOs.SavedResumeResponse;
import ai.createResume.Backend.DTOs.UserProfileResponse;
import ai.createResume.Backend.Services.UserAccountService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@CrossOrigin(origins = "${app.cors.allowed-origins:http://localhost:5173}")
@RequestMapping("/api/v1/profile")
public class ProfileController {

    private final UserAccountService userAccountService;

    public ProfileController(UserAccountService userAccountService) {
        this.userAccountService = userAccountService;
    }

    @GetMapping("/me")
    public ResponseEntity<?> getProfile(
            @RequestHeader(value = "X-Auth-Token", required = false) String authToken
    ) {
        try {
            UserProfileResponse response = userAccountService.getCurrentProfile(authToken);
            return ResponseEntity.ok(response);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/me/resumes")
    public ResponseEntity<?> saveResume(
            @RequestHeader(value = "X-Auth-Token", required = false) String authToken,
            @RequestBody SaveResumeRequest request
    ) {
        try {
            SavedResumeResponse response = userAccountService.saveResume(authToken, request);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "message", "Resume saved to profile.",
                    "resume", response
            ));
        } catch (IllegalArgumentException ex) {
            HttpStatus status = ex.getMessage() != null &&
                    (ex.getMessage().toLowerCase().contains("token") || ex.getMessage().toLowerCase().contains("session"))
                    ? HttpStatus.UNAUTHORIZED
                    : HttpStatus.BAD_REQUEST;
            return ResponseEntity.status(status).body(Map.of("message", ex.getMessage()));
        }
    }
}
