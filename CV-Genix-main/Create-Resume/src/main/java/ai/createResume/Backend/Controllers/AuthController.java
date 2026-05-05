package ai.createResume.Backend.Controllers;

import ai.createResume.Backend.DTOs.AuthSignInRequest;
import ai.createResume.Backend.DTOs.AuthSignUpRequest;
import ai.createResume.Backend.DTOs.ForgotPasswordRequest;
import ai.createResume.Backend.DTOs.SessionUserResponse;
import ai.createResume.Backend.Services.UserAccountService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@CrossOrigin(origins = "${app.cors.allowed-origins:http://localhost:5173}")
@RequestMapping("/api/v1/auth")
public class AuthController {

    private final UserAccountService userAccountService;

    public AuthController(UserAccountService userAccountService) {
        this.userAccountService = userAccountService;
    }

    @PostMapping("/signup")
    public ResponseEntity<Map<String, Object>> signUp(@RequestBody AuthSignUpRequest request) {
        try {
            SessionUserResponse user = userAccountService.register(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(Map.of(
                    "message", "Account created successfully.",
                    "user", user
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/signin")
    public ResponseEntity<Map<String, Object>> signIn(@RequestBody AuthSignInRequest request) {
        try {
            SessionUserResponse user = userAccountService.signIn(request);
            return ResponseEntity.ok(Map.of(
                    "message", "Login successful.",
                    "user", user
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<Map<String, Object>> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        try {
            return ResponseEntity.ok(Map.of(
                    "message", userAccountService.requestPasswordReset(request)
            ));
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of("message", ex.getMessage()));
        }
    }

    @PostMapping("/logout")
    public ResponseEntity<Map<String, Object>> logout(
            @RequestHeader(value = "X-Auth-Token", required = false) String authToken
    ) {
        userAccountService.logout(authToken);
        return ResponseEntity.ok(Map.of("message", "Logout successful."));
    }
}
