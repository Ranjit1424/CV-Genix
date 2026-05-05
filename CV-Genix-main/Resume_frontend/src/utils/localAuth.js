import { axiosInstance, setUnauthorizedHandler } from "../api/ResumeService";

const SESSION_STORAGE_KEY = "resumeBuilder.session";

const parseJSON = (value, fallback) => {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

const emitAuthChange = () => {
  window.dispatchEvent(new Event("authchange"));
};

const extractErrorMessage = (error) =>
  error?.response?.data?.message ||
  error?.response?.data?.error ||
  error?.message ||
  "Request failed.";

const persistSession = (user, remember) => {
  const session = {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt,
    sessionToken: user.sessionToken,
  };

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);

  const targetStorage = remember ? window.localStorage : window.sessionStorage;
  targetStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  emitAuthChange();

  return session;
};

const buildAuthHeaders = () => {
  const session = getCurrentSession();

  if (!session?.sessionToken) {
    return {};
  }

  return {
    "X-Auth-Token": session.sessionToken,
  };
};

export const getCurrentSession = () =>
  parseJSON(window.localStorage.getItem(SESSION_STORAGE_KEY), null) ||
  parseJSON(window.sessionStorage.getItem(SESSION_STORAGE_KEY), null);

export const clearCurrentSession = () => {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  emitAuthChange();
};

setUnauthorizedHandler(() => {
  clearCurrentSession();
});

export const logoutCurrentSession = async () => {
  try {
    const headers = buildAuthHeaders();
    if (headers["X-Auth-Token"]) {
      await axiosInstance.post("/api/v1/auth/logout", {}, { headers });
    }
  } catch {
    // Ignore logout network errors and clear the local session anyway.
  } finally {
    clearCurrentSession();
  }
};

export const registerLocalUser = async ({
  name,
  email,
  password,
  remember,
}) => {
  try {
    const response = await axiosInstance.post("/api/v1/auth/signup", {
      name,
      email,
      password,
    });

    const session = persistSession(response.data.user, remember);

    return {
      ok: true,
      user: session,
      message: response.data.message,
    };
  } catch (error) {
    return {
      ok: false,
      message: extractErrorMessage(error),
    };
  }
};

export const signInLocalUser = async ({ email, password, remember }) => {
  try {
    const response = await axiosInstance.post("/api/v1/auth/signin", {
      email,
      password,
    });

    const session = persistSession(response.data.user, remember);

    return {
      ok: true,
      user: session,
      message: response.data.message,
    };
  } catch (error) {
    return {
      ok: false,
      message: extractErrorMessage(error),
    };
  }
};

export const requestPasswordReset = async (email) => {
  try {
    const response = await axiosInstance.post("/api/v1/auth/forgot-password", {
      email,
    });

    return {
      ok: true,
      message: response.data.message,
    };
  } catch (error) {
    return {
      ok: false,
      message: extractErrorMessage(error),
    };
  }
};

export const getCurrentUserProfile = async () => {
  try {
    const headers = buildAuthHeaders();

    if (!headers["X-Auth-Token"]) {
      return {
        ok: false,
        message: "Login required.",
        profile: null,
      };
    }

    const response = await axiosInstance.get("/api/v1/profile/me", {
      headers,
    });

    return {
      ok: true,
      profile: response.data,
    };
  } catch (error) {
    if (error?.response?.status === 401) {
      clearCurrentSession();
    }

    return {
      ok: false,
      message: extractErrorMessage(error),
      profile: null,
    };
  }
};

export const saveResumeToCurrentProfile = async ({
  resumeData,
  template,
  accent,
  fileName,
}) => {
  try {
    const headers = buildAuthHeaders();

    if (!headers["X-Auth-Token"]) {
      return {
        ok: false,
        message: "Login required to save resumes to your profile.",
      };
    }

    const response = await axiosInstance.post(
      "/api/v1/profile/me/resumes",
      {
        fileName,
        template,
        accent,
        resumeData,
      },
      { headers },
    );

    return {
      ok: true,
      resume: response.data.resume,
      message: response.data.message,
    };
  } catch (error) {
    if (error?.response?.status === 401) {
      clearCurrentSession();
    }

    return {
      ok: false,
      message: extractErrorMessage(error),
    };
  }
};
