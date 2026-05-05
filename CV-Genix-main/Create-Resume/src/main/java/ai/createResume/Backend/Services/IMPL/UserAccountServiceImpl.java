package ai.createResume.Backend.Services.IMPL;

import ai.createResume.Backend.DTOs.*;
import ai.createResume.Backend.Models.AppUser;
import ai.createResume.Backend.Models.SavedResume;
import ai.createResume.Backend.Repositories.AppUserRepository;
import ai.createResume.Backend.Repositories.SavedResumeRepository;
import ai.createResume.Backend.Services.UserAccountService;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.transaction.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
@Transactional
public class UserAccountServiceImpl implements UserAccountService {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ISO_LOCAL_DATE_TIME;

    private final AppUserRepository appUserRepository;
    private final SavedResumeRepository savedResumeRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;

    public UserAccountServiceImpl(
            AppUserRepository appUserRepository,
            SavedResumeRepository savedResumeRepository,
            PasswordEncoder passwordEncoder,
            ObjectMapper objectMapper
    ) {
        this.appUserRepository = appUserRepository;
        this.savedResumeRepository = savedResumeRepository;
        this.passwordEncoder = passwordEncoder;
        this.objectMapper = objectMapper;
    }

    @Override
    public SessionUserResponse register(AuthSignUpRequest request) {
        String fullName = normalizeText(request.name(), "Full name is required.");
        String email = normalizeEmail(request.email());
        String password = normalizePassword(request.password());

        if (appUserRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new IllegalArgumentException("An account with this email already exists.");
        }

        AppUser appUser = new AppUser();
        appUser.setFullName(fullName);
        appUser.setEmail(email);
        appUser.setPasswordHash(passwordEncoder.encode(password));
        appUser.setSessionToken(UUID.randomUUID().toString());

        return toSessionUser(appUserRepository.save(appUser));
    }

    @Override
    public SessionUserResponse signIn(AuthSignInRequest request) {
        String email = normalizeEmail(request.email());
        String password = normalizePassword(request.password());

        AppUser appUser = appUserRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new IllegalArgumentException("Invalid email or password."));

        if (!passwordEncoder.matches(password, appUser.getPasswordHash())) {
            throw new IllegalArgumentException("Invalid email or password.");
        }

        appUser.setSessionToken(UUID.randomUUID().toString());
        return toSessionUser(appUserRepository.save(appUser));
    }

    @Override
    public String requestPasswordReset(ForgotPasswordRequest request) {
        String email = normalizeEmail(request.email());
        boolean exists = appUserRepository.findByEmailIgnoreCase(email).isPresent();
        if (exists) {
            return "Reset instructions prepared for " + email + ".";
        }
        return "No account found with that email address.";
    }

    @Override
    public void logout(String authToken) {
        if (authToken == null || authToken.isBlank()) {
            return;
        }

        appUserRepository.findBySessionToken(authToken.trim()).ifPresent(user -> {
            user.setSessionToken(null);
            appUserRepository.save(user);
        });
    }

    @Override
    @Transactional
    public UserProfileResponse getCurrentProfile(String authToken) {
        AppUser appUser = getUserFromToken(authToken);
        List<SavedResumeResponse> resumes = savedResumeRepository
                .findByUserIdOrderBySavedAtDesc(appUser.getId())
                .stream()
                .map(this::toSavedResumeResponse)
                .toList();

        return new UserProfileResponse(
                appUser.getId(),
                appUser.getFullName(),
                appUser.getEmail(),
                DATE_TIME_FORMATTER.format(appUser.getCreatedAt()),
                resumes
        );
    }

    @Override
    public SavedResumeResponse saveResume(String authToken, SaveResumeRequest request) {
        AppUser appUser = getUserFromToken(authToken);

        if (request.resumeData() == null || request.resumeData().isEmpty()) {
            throw new IllegalArgumentException("Resume data is required.");
        }

        SavedResume savedResume = new SavedResume();
        savedResume.setUser(appUser);
        savedResume.setFileName(normalizeFileName(request.fileName()));
        savedResume.setTemplateName(normalizeTemplate(request.template()));

        try {
            savedResume.setAccentJson(objectMapper.writeValueAsString(
                    request.accent() == null ? List.of() : request.accent()
            ));
            savedResume.setResumeDataJson(objectMapper.writeValueAsString(request.resumeData()));
        } catch (Exception ex) {
            throw new IllegalArgumentException("Resume payload could not be stored.");
        }

        return toSavedResumeResponse(savedResumeRepository.save(savedResume));
    }

    private AppUser getUserFromToken(String authToken) {
        if (authToken == null || authToken.isBlank()) {
            throw new IllegalArgumentException("Missing auth token.");
        }

        return appUserRepository.findBySessionToken(authToken.trim())
                .orElseThrow(() -> new IllegalArgumentException("Invalid or expired session."));
    }

    private SessionUserResponse toSessionUser(AppUser appUser) {
        return new SessionUserResponse(
                appUser.getId(),
                appUser.getFullName(),
                appUser.getEmail(),
                DATE_TIME_FORMATTER.format(appUser.getCreatedAt()),
                appUser.getSessionToken()
        );
    }

    private SavedResumeResponse toSavedResumeResponse(SavedResume savedResume) {
        try {
            List<Integer> accent = objectMapper.readValue(
                    savedResume.getAccentJson() == null ? "[]" : savedResume.getAccentJson(),
                    new TypeReference<>() {
                    }
            );
            Map<String, Object> resumeData = objectMapper.readValue(
                    savedResume.getResumeDataJson(),
                    new TypeReference<>() {
                    }
            );

            return new SavedResumeResponse(
                    savedResume.getId(),
                    savedResume.getFileName(),
                    savedResume.getTemplateName(),
                    accent,
                    resumeData,
                    DATE_TIME_FORMATTER.format(savedResume.getSavedAt())
            );
        } catch (Exception ex) {
            throw new IllegalStateException("Saved resume data could not be read.");
        }
    }

    private String normalizeText(String value, String errorMessage) {
        if (value == null || value.trim().isBlank()) {
            throw new IllegalArgumentException(errorMessage);
        }
        return value.trim();
    }

    private String normalizeEmail(String email) {
        String normalized = normalizeText(email, "Email is required.").toLowerCase(Locale.ROOT);
        if (!normalized.contains("@")) {
            throw new IllegalArgumentException("Enter a valid email address.");
        }
        return normalized;
    }

    private String normalizePassword(String password) {
        String normalized = normalizeText(password, "Password is required.");
        if (normalized.length() < 6) {
            throw new IllegalArgumentException("Password must be at least 6 characters.");
        }
        return normalized;
    }

    private String normalizeFileName(String fileName) {
        if (fileName == null || fileName.trim().isBlank()) {
            return "resume.pdf";
        }
        return fileName.trim();
    }

    private String normalizeTemplate(String template) {
        if (template == null || template.trim().isBlank()) {
            return "classic";
        }
        return template.trim();
    }
}
