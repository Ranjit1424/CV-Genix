import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FiArrowRight,
  FiCheck,
  FiEye,
  FiEyeOff,
  FiInfo,
  FiLock,
  FiMail,
  FiUser,
} from "react-icons/fi";
import toast from "react-hot-toast";
import {
  getCurrentSession,
  registerLocalUser,
  requestPasswordReset,
  signInLocalUser,
} from "../utils/localAuth";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState("signin");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showResetPanel, setShowResetPanel] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    remember: true,
  });
  const [resetEmail, setResetEmail] = useState("");

  const isSignUp = mode === "signup";
  const redirectPath = useMemo(() => location.state?.from || "/profile", [location.state]);

  useEffect(() => {
    if (getCurrentSession()?.sessionToken) {
      navigate(redirectPath, { replace: true });
    }
  }, [navigate, redirectPath]);

  const handleInputChange = (event) => {
    const { name, value, type, checked } = event.target;
    setFormData((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      remember: true,
    });
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const email = formData.email.trim();
    const password = formData.password.trim();

    if (!email || !password) {
      toast.error("Email and password are required.");
      return;
    }

    if (isSignUp) {
      if (!formData.name.trim()) {
        toast.error("Full name is required.");
        return;
      }

      if (password.length < 6) {
        toast.error("Password must be at least 6 characters.");
        return;
      }

      if (password !== formData.confirmPassword.trim()) {
        toast.error("Passwords do not match.");
        return;
      }

      const result = await registerLocalUser({
        name: formData.name,
        email,
        password,
        remember: formData.remember,
      });

      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(`Account created for ${result.user.name}.`);
      resetForm();
      navigate(redirectPath, { replace: true });
      return;
    }

    const result = await signInLocalUser({
      email,
      password,
      remember: formData.remember,
    });

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(`Welcome back, ${result.user.name}.`);
    resetForm();
    navigate(redirectPath, { replace: true });
  };

  const handleForgotPassword = async (event) => {
    event.preventDefault();

    if (!resetEmail.trim()) {
      toast.error("Enter your email to reset the password.");
      return;
    }

    const result = await requestPasswordReset(resetEmail);

    if (!result.ok) {
      toast.error(result.message);
      return;
    }

    toast.success(result.message);
    setResetEmail("");
    setShowResetPanel(false);
  };

  const handleSocialLogin = (provider) => {
    const links = {
      Google: "https://accounts.google.com/",
      LinkedIn: "https://www.linkedin.com/login",
    };

    window.open(links[provider], "_blank", "noopener,noreferrer");
    toast.success(`${provider} login opened in a new tab.`);
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setShowResetPanel(false);
    resetForm();
  };

  return (
    <main className="min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[-8rem] top-[-10rem] h-72 w-72 rounded-full bg-rose-500/20 blur-3xl" />
        <div className="absolute right-[-6rem] top-20 h-80 w-80 rounded-full bg-cyan-400/15 blur-3xl" />
        <div className="absolute bottom-[-8rem] left-1/3 h-80 w-80 rounded-full bg-amber-300/10 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-7xl items-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid w-full overflow-hidden rounded-[2rem] border border-white/10 bg-white/[0.04] shadow-[0_40px_120px_rgba(15,23,42,0.55)] backdrop-blur xl:grid-cols-[1.05fr_0.95fr]">
          <section className="relative flex min-h-[340px] flex-col justify-between bg-[radial-gradient(circle_at_top_left,_rgba(251,113,133,0.28),_transparent_35%),linear-gradient(135deg,_#0f172a_0%,_#111827_45%,_#1e293b_100%)] p-8 sm:p-10 lg:p-12">
            <div className="flex items-center justify-between">
              <Link
                to="/"
                className="inline-flex items-center gap-3 text-sm font-medium tracking-[0.25em] text-slate-200/90 uppercase"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-lg shadow-lg shadow-black/20">
                  R
                </span>
                ResumeAI
              </Link>

              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.3em] text-slate-200/80">
                Smart Access
              </span>
            </div>

            <div className="mt-10 max-w-xl">
              <p className="mb-4 text-sm font-medium uppercase tracking-[0.35em] text-rose-200/75">
                Career Toolkit
              </p>
              <h1 className="max-w-lg font-['Trebuchet_MS','Segoe_UI',sans-serif] text-4xl font-semibold leading-tight text-white sm:text-5xl">
                Sign in to keep your resume workflow sharp and fast.
              </h1>
              <p className="mt-6 max-w-md text-base leading-7 text-slate-300 sm:text-lg">
                Save drafts, manage job-specific versions, and continue building
                from any device with one focused workspace.
              </p>
            </div>

            <div className="mt-10 grid gap-5 sm:grid-cols-2">
              <div className="rounded-[1.75rem] border border-white/10 bg-white/10 p-5 backdrop-blur">
                <div className="mb-5 flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-100">
                    Weekly activity
                  </span>
                  <span className="rounded-full bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-200">
                    +18%
                  </span>
                </div>
                <div className="flex h-28 items-end gap-3">
                  {[44, 58, 39, 76, 71, 92].map((height, index) => (
                    <div
                      key={index}
                      className="flex-1 rounded-t-2xl bg-gradient-to-t from-rose-400 via-orange-300 to-amber-200"
                      style={{ height: `${height}%` }}
                    />
                  ))}
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/50 p-5">
                <p className="text-sm font-medium text-slate-100">
                  Why teams use it
                </p>
                <div className="mt-5 space-y-4 text-sm text-slate-300">
                  {[
                    "One login for resume building, scoring, and templates",
                    "Private drafts synced across interview cycles",
                    "Faster turnaround for tailored applications",
                  ].map((item) => (
                    <div key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-200">
                        <FiCheck size={14} />
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pointer-events-none absolute -bottom-12 right-10 hidden h-56 w-56 rounded-full border border-white/10 bg-white/5 blur-[1px] lg:block" />
          </section>

          <section className="bg-[#fffaf3] p-8 text-slate-900 sm:p-10 lg:p-12">
            <div className="mx-auto flex h-full w-full max-w-md flex-col justify-center">
              <p className="text-sm font-medium uppercase tracking-[0.35em] text-slate-500">
                {isSignUp ? "Create Profile" : "Welcome Back"}
              </p>
              <h2 className="mt-3 font-['Trebuchet_MS','Segoe_UI',sans-serif] text-4xl font-semibold tracking-tight text-slate-950">
                {isSignUp ? "Create your account" : "Login to your account"}
              </h2>
              <p className="mt-4 text-base leading-7 text-slate-600">
                {isSignUp
                  ? "Create a database-backed account to save resume work."
                  : "Continue where you left off and manage your resumes in one place."}
              </p>

              <div className="mt-8 inline-flex rounded-full bg-slate-200/70 p-1 text-sm">
                <button
                  type="button"
                  onClick={() => switchMode("signin")}
                  className={`rounded-full px-4 py-2 font-medium transition ${
                    !isSignUp
                      ? "bg-slate-950 text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className={`rounded-full px-4 py-2 font-medium transition ${
                    isSignUp
                      ? "bg-slate-950 text-white"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Create Account
                </button>
              </div>

              <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
                {isSignUp ? (
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Full Name
                    </span>
                    <span className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition focus-within:border-slate-400">
                      <FiUser className="text-slate-400" size={18} />
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Your full name"
                        className="w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                      />
                    </span>
                  </label>
                ) : null}

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Email
                  </span>
                  <span className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition focus-within:border-slate-400">
                    <FiMail className="text-slate-400" size={18} />
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="you@example.com"
                      className="w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </span>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">
                    Password
                  </span>
                  <span className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition focus-within:border-slate-400">
                    <FiLock className="text-slate-400" size={18} />
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter your password"
                      className="w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="text-slate-500 transition hover:text-slate-900"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                    </button>
                  </span>
                </label>

                {isSignUp ? (
                  <label className="block">
                    <span className="mb-2 block text-sm font-medium text-slate-700">
                      Confirm Password
                    </span>
                    <span className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm transition focus-within:border-slate-400">
                      <FiLock className="text-slate-400" size={18} />
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleInputChange}
                        placeholder="Confirm your password"
                        className="w-full bg-transparent text-base text-slate-900 outline-none placeholder:text-slate-400"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword((value) => !value)
                        }
                        className="text-slate-500 transition hover:text-slate-900"
                        aria-label={
                          showConfirmPassword
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                      >
                        {showConfirmPassword ? (
                          <FiEyeOff size={18} />
                        ) : (
                          <FiEye size={18} />
                        )}
                      </button>
                    </span>
                  </label>
                ) : null}

                <div className="flex flex-col gap-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      name="remember"
                      checked={formData.remember}
                      onChange={handleInputChange}
                      className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                    />
                    <span>Remember me</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setShowResetPanel((value) => !value)}
                    className="font-medium text-slate-900 underline underline-offset-4"
                  >
                    Forgot password?
                  </button>
                </div>

                {showResetPanel ? (
                  <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
                    <p className="text-sm font-semibold text-slate-900">
                      Reset password
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      This checks the email stored in your SQL user table and
                      returns a reset response.
                    </p>
                    <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                      <input
                        type="email"
                        value={resetEmail}
                        onChange={(event) => setResetEmail(event.target.value)}
                        placeholder="Enter account email"
                        className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition focus:border-slate-400"
                      />
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
                      >
                        Send Link
                      </button>
                    </div>
                  </div>
                ) : null}

                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-slate-950 px-6 py-4 text-base font-medium text-white transition hover:bg-slate-800"
                >
                  {isSignUp ? "Create Account" : "Sign In"}
                  <FiArrowRight size={18} />
                </button>
              </form>

              <div className="my-8 flex items-center gap-4">
                <div className="h-px flex-1 bg-slate-200" />
                <span className="text-sm text-slate-400">or continue with</span>
                <div className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleSocialLogin("Google")}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialLogin("LinkedIn")}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  LinkedIn
                </button>
              </div>

              <p className="mt-8 text-sm text-slate-500">
                {isSignUp ? "Already have an account? " : "New here? "}
                <button
                  type="button"
                  onClick={() => switchMode(isSignUp ? "signin" : "signup")}
                  className="font-semibold text-slate-900 underline underline-offset-4"
                >
                  {isSignUp ? "Sign in" : "Create an account"}
                </button>
              </p>

              <div className="mt-6 flex items-start gap-3 rounded-[1.5rem] border border-slate-200 bg-white/80 p-4 text-sm text-slate-500">
                <FiInfo className="mt-0.5 shrink-0 text-slate-400" size={16} />
                <p>
                  This login uses your Spring Boot backend and stores user
                  accounts in the MySQL database `mca`.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export default Login;
