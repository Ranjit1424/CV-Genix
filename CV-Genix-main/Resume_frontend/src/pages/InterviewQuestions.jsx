import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import {
  FiAlertTriangle,
  FiBookOpen,
  FiCheckCircle,
  FiChevronRight,
  FiClock,
  FiCopy,
  FiFilter,
  FiMessageCircle,
  FiRefreshCw,
  FiTarget,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import { generateInterviewQuestions } from "../api/ResumeService";

const DEFAULT_CANDIDATE =
  "Java Full Stack Developer with experience in Java, Spring Boot, React, MySQL, REST APIs, and CRUD applications.";
const DEFAULT_ROLE = "Java Full Stack Developer";
const DEFAULT_JOB_DESCRIPTION =
  "Build production web applications, debug backend services, work with SQL databases, and collaborate with product teams.";
const STYLE_OPTIONS = ["Mixed", "Technical", "Behavioral", "Project-based", "HR Focused"];
const SITUATION_OPTIONS = [
  "General interview round",
  "Phone screening round",
  "Technical coding round",
  "System design round",
  "Hiring manager round",
  "Behavioral round",
  "HR final round",
  "Production incident scenario",
  "High pressure deadline scenario",
];
const QUESTION_COUNTS = [6, 8, 10, 12];

const fmtDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }).format(date);
};

const copyToClipboard = async (value, successMessage) => {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(successMessage);
  } catch {
    toast.error("Could not copy to clipboard.");
  }
};

const getSampleAnswerText = (question = {}) => {
  if (question?.sampleAnswer && `${question.sampleAnswer}`.trim()) {
    return `${question.sampleAnswer}`.trim();
  }

  const outline = Array.isArray(question?.sampleAnswerOutline)
    ? question.sampleAnswerOutline.filter(Boolean)
    : [];
  if (outline.length > 0) {
    return outline.join(" ");
  }

  const whyItMatters = `${question?.whyItMatters || ""}`.trim();
  if (whyItMatters) {
    return `A strong answer should focus on this: ${whyItMatters}`;
  }

  return "A good answer should explain your approach, your specific contribution, and the result you achieved.";
};

const buildPrepText = (payload, fallbackRole, fallbackStyle) => {
  const focusAreas = Array.isArray(payload?.focusAreas) ? payload.focusAreas : [];
  const questions = Array.isArray(payload?.questions) ? payload.questions : [];
  const prepTips = Array.isArray(payload?.prepTips) ? payload.prepTips : [];

  return [
    `Role: ${payload?.role || fallbackRole}`,
    `Style: ${payload?.interviewStyle || fallbackStyle}`,
    payload?.interviewSituation ? `Situation: ${payload.interviewSituation}` : "",
    focusAreas.length ? `Focus areas: ${focusAreas.join(", ")}` : "",
    "",
    ...questions.map((question, index) => {
      const outline = Array.isArray(question?.sampleAnswerOutline) ? question.sampleAnswerOutline : [];
      return [
        `${index + 1}. [${question?.category || "Question"}] ${question?.question || ""}`,
        `Why it matters: ${question?.whyItMatters || ""}`,
        `Sample answer: ${getSampleAnswerText(question)}`,
        outline.length ? `Outline: ${outline.join(" | ")}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    }),
    "",
    prepTips.length ? `Prep tips:\n- ${prepTips.join("\n- ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");
};

const InterviewQuestions = () => {
  const [candidateDescription, setCandidateDescription] = useState(DEFAULT_CANDIDATE);
  const [targetRole, setTargetRole] = useState(DEFAULT_ROLE);
  const [jobDescription, setJobDescription] = useState(DEFAULT_JOB_DESCRIPTION);
  const [questionCount, setQuestionCount] = useState(8);
  const [interviewStyle, setInterviewStyle] = useState("Mixed");
  const [interviewSituation, setInterviewSituation] = useState("General interview round");
  const [payload, setPayload] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedQuestionIndex, setSelectedQuestionIndex] = useState(0);
  const [lastUpdated, setLastUpdated] = useState("");
  const debounceRef = useRef(null);

  const generateQuestions = useCallback(
    async ({ silent = false } = {}) => {
      const trimmedCandidateDescription = candidateDescription.trim();
      const trimmedTargetRole = targetRole.trim();
      const trimmedJobDescription = jobDescription.trim();

      if (!trimmedCandidateDescription && !trimmedTargetRole && !trimmedJobDescription) {
        setPayload(null);
        return;
      }

      setLoading(true);
      setError("");
      setWarning("");
      try {
        const response = await generateInterviewQuestions({
          candidateDescription: trimmedCandidateDescription,
          targetRole: trimmedTargetRole,
          jobDescription: trimmedJobDescription,
          questionCount,
          interviewStyle,
          interviewSituation,
        });

        if (response?.error) {
          setPayload(null);
          setError(response.error);
          toast.error(response.error);
          return;
        }

        setPayload(response);
        setLastUpdated(response?.fetchedAt || new Date().toISOString());
        setSelectedQuestionIndex(0);
        if (response?.warning) {
          setWarning(response.warning);
        }
        if (!silent) {
          toast.success("Interview questions refreshed");
        }
      } catch (requestError) {
        const message = requestError?.message || "Could not build interview questions right now.";
        setError(message);
        setPayload(null);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [candidateDescription, targetRole, jobDescription, questionCount, interviewStyle, interviewSituation]
  );

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      generateQuestions({ silent: true });
    }, 650);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [generateQuestions]);

  const questions = Array.isArray(payload?.questions) ? payload.questions : [];
  const filteredQuestions =
    selectedCategory === "All"
      ? questions
      : questions.filter((question) => `${question?.category || ""}`.toLowerCase() === selectedCategory.toLowerCase());
  const selectedQuestion = filteredQuestions[selectedQuestionIndex] || filteredQuestions[0] || null;

  useEffect(() => {
    setSelectedQuestionIndex(0);
  }, [selectedCategory, payload]);

  useEffect(() => {
    if (filteredQuestions.length === 0) {
      setSelectedQuestionIndex(0);
      return;
    }
    if (selectedQuestionIndex >= filteredQuestions.length) {
      setSelectedQuestionIndex(0);
    }
  }, [filteredQuestions, selectedQuestionIndex]);

  const categories = useMemo(() => {
    const unique = new Set(["All"]);
    questions.forEach((question) => {
      if (question?.category) {
        unique.add(question.category);
      }
    });
    return Array.from(unique);
  }, [questions]);

  const stats = useMemo(
    () => [
      { label: "Questions", value: questions.length || questionCount },
      { label: "Focus areas", value: Array.isArray(payload?.focusAreas) ? payload.focusAreas.length : 0 },
      { label: "Prep tips", value: Array.isArray(payload?.prepTips) ? payload.prepTips.length : 0 },
      { label: "Style", value: payload?.interviewStyle || interviewStyle },
      { label: "Situation", value: payload?.interviewSituation || interviewSituation },
    ],
    [questions.length, payload, questionCount, interviewStyle, interviewSituation]
  );

  const handleCopyQuestion = async (question) => {
    if (!question) return;
    const outline = Array.isArray(question.sampleAnswerOutline) ? question.sampleAnswerOutline : [];
    await copyToClipboard(
      [
        question.question,
        `Why it matters: ${question.whyItMatters || ""}`,
        `Sample answer: ${getSampleAnswerText(question)}`,
        outline.length ? `Outline: ${outline.join(" | ")}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
      "Question copied"
    );
  };

  const handleCopyPrepPack = async () => {
    if (!payload) return;
    await copyToClipboard(buildPrepText(payload, targetRole, interviewStyle), "Prep pack copied");
  };

  const resetSample = () => {
    setCandidateDescription(DEFAULT_CANDIDATE);
    setTargetRole(DEFAULT_ROLE);
    setJobDescription(DEFAULT_JOB_DESCRIPTION);
    setQuestionCount(8);
    setInterviewStyle("Mixed");
    setInterviewSituation("General interview round");
    setSelectedCategory("All");
    setSelectedQuestionIndex(0);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="absolute right-0 top-24 h-96 w-96 rounded-full bg-fuchsia-500/20 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
              <FiMessageCircle /> Live interview prep
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-200">
              <FiZap /> Auto-refresh
            </span>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                Build interview questions from your resume, role, and job description.
              </h1>
              <p className="mt-4 max-w-3xl text-base text-slate-300 sm:text-lg">
                Use this live prep feature to generate technical, behavioral, project, and HR questions that match the job you want.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur">
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-xs uppercase tracking-[0.18em] text-slate-300">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur-xl">
            <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Candidate summary</span>
                <textarea
                  value={candidateDescription}
                  onChange={(event) => setCandidateDescription(event.target.value)}
                  className="min-h-36 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
                  placeholder="Paste your resume summary or a short professional profile..."
                />
              </label>
              <div className="grid gap-4">
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Target role</span>
                  <input
                    value={targetRole}
                    onChange={(event) => setTargetRole(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
                    placeholder="Java Developer, React Engineer, Data Analyst..."
                  />
                </label>
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Job description</span>
                  <textarea
                    value={jobDescription}
                    onChange={(event) => setJobDescription(event.target.value)}
                    className="min-h-24 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
                    placeholder="Paste the job description if you have one..."
                  />
                </label>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Interview style</span>
                <select
                  value={interviewStyle}
                  onChange={(event) => setInterviewStyle(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
                >
                  {STYLE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Question count</span>
                <select
                  value={questionCount}
                  onChange={(event) => setQuestionCount(Number(event.target.value))}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
                >
                  {QUESTION_COUNTS.map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Situation</span>
                <select
                  value={interviewSituation}
                  onChange={(event) => setInterviewSituation(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
                >
                  {SITUATION_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="flex items-end gap-3">
                <button
                  type="button"
                  onClick={() => generateQuestions({ silent: false })}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  <FiRefreshCw /> Generate
                </button>
                <button
                  type="button"
                  onClick={resetSample}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 font-semibold text-white transition hover:bg-white/10"
                >
                  <FiFilter /> Sample
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Live output</div>
                  <h2 className="text-2xl font-black text-slate-950">Interview questions</h2>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500">
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2">
                    <FiClock /> {loading ? "Generating..." : lastUpdated ? `Updated ${fmtDate(lastUpdated)}` : "Waiting for input"}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyPrepPack}
                    disabled={!payload}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <FiCopy /> Copy prep pack
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700">
                  <FiTarget /> {payload?.role || targetRole || "Target role"}
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-2 text-sm font-medium text-amber-700">
                  <FiFilter /> {payload?.interviewSituation || interviewSituation}
                </span>
                {Array.isArray(payload?.focusAreas)
                  ? payload.focusAreas.map((focus) => (
                      <span key={focus} className="rounded-full bg-slate-100 px-3 py-2 text-sm text-slate-600">
                        {focus}
                      </span>
                    ))
                  : null}
              </div>
            </div>

            {error ? <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-700">{error}</div> : null}
            {warning ? <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-700">{warning}</div> : null}
            {loading && !questions.length ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">
                Building interview questions...
              </div>
            ) : null}

            {!loading && !questions.length && !error ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <FiBookOpen />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-slate-900">No questions yet</h3>
                <p className="mt-2 text-slate-500">Add a role or resume summary and the live builder will generate a prep pack for you.</p>
              </div>
            ) : null}

            <div className="grid gap-3">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    selectedCategory === category ? "bg-slate-950 text-white" : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-200 hover:bg-slate-50"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="grid gap-4">
              {filteredQuestions.map((question, index) => {
                const active = index === selectedQuestionIndex;
                return (
                  <article
                    key={`${question.category}-${index}`}
                    className={`rounded-3xl border p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
                      active ? "border-cyan-300 bg-cyan-50/60" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{question.category}</span>
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                            {question.difficulty || "Medium"}
                          </span>
                        </div>
                        <h3 className="mt-3 text-lg font-bold text-slate-950">{question.question}</h3>
                        <p className="mt-2 text-sm leading-6 text-slate-600">{question.whyItMatters}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedQuestionIndex(index)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          View <FiChevronRight />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleCopyQuestion(question)}
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                        >
                          <FiCopy />
                        </button>
                      </div>
                    </div>

                    {question.sampleAnswerOutline?.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {question.sampleAnswerOutline.map((item) => (
                          <span key={item} className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                            {item}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <FiUsers className="text-cyan-500" />
                <h2 className="font-semibold text-slate-900">Selected question</h2>
              </div>
              {selectedQuestion ? (
                <div className="mt-4 space-y-4">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">{selectedQuestion.category}</span>
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {selectedQuestion.difficulty || "Medium"}
                      </span>
                    </div>
                    <h3 className="mt-3 text-lg font-bold text-slate-950">{selectedQuestion.question}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{selectedQuestion.whyItMatters}</p>
                  </div>
                  <div className="rounded-2xl bg-white p-4 shadow-inner ring-1 ring-slate-200">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sample answer</div>
                    <p className="mt-3 text-sm leading-6 text-slate-700">{getSampleAnswerText(selectedQuestion)}</p>
                  </div>
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Sample answer outline</div>
                    <ul className="mt-3 space-y-2 text-sm text-slate-700">
                      {selectedQuestion.sampleAnswerOutline?.map((item) => (
                        <li key={item} className="flex gap-2">
                          <FiCheckCircle className="mt-0.5 shrink-0 text-emerald-500" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">Pick a question to see how to structure a strong answer.</p>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <FiBookOpen className="text-cyan-500" />
                <h2 className="font-semibold text-slate-900">Preparation tips</h2>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                {(payload?.prepTips || []).map((tip) => (
                  <li key={tip} className="flex gap-2">
                    <FiCheckCircle className="mt-0.5 shrink-0 text-emerald-500" />
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <FiTarget className="text-cyan-500" />
                <h2 className="font-semibold text-slate-900">Strengths to highlight</h2>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-slate-700">
                {(payload?.strengthsToHighlight || []).map((item) => (
                  <li key={item} className="flex gap-2">
                    <FiCheckCircle className="mt-0.5 shrink-0 text-sky-500" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm">
              <div className="flex items-center gap-2 text-amber-700">
                <FiAlertTriangle />
                <h2 className="font-semibold">Avoid these</h2>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-amber-900">
                {(payload?.redFlagsToAvoid || []).map((item) => (
                  <li key={item} className="flex gap-2">
                    <FiChevronRight className="mt-0.5 shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {payload?.closingAdvice ? <p className="mt-4 text-sm leading-6 text-amber-900">{payload.closingAdvice}</p> : null}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 to-slate-800 p-6 text-white shadow-sm">
              <div className="flex items-center gap-2 text-cyan-200">
                <FiZap />
                <h2 className="font-semibold">Next steps</h2>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                <li>Generate a resume first, then use this page to practice the same role.</li>
                <li>Paste a real job description to make the questions more realistic.</li>
                <li>Use the copy button to save the prep pack into your notes.</li>
              </ul>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link to="/generate-resume" className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300">
                  Tailor resume <FiChevronRight />
                </Link>
                <Link to="/placement-opportunities" className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
                  Explore roles <FiChevronRight />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default InterviewQuestions;
