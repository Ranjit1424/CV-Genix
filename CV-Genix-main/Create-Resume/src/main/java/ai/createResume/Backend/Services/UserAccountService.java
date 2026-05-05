package ai.createResume.Backend.Services;

import ai.createResume.Backend.DTOs.*;

public interface UserAccountService {

    SessionUserResponse register(AuthSignUpRequest request);

    SessionUserResponse signIn(AuthSignInRequest request);

    String requestPasswordReset(ForgotPasswordRequest request);

    void logout(String authToken);

    UserProfileResponse getCurrentProfile(String authToken);

    SavedResumeResponse saveResume(String authToken, SaveResumeRequest request);
}
