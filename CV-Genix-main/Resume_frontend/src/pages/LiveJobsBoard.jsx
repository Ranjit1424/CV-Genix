import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiBookmark,
  FiBriefcase,
  FiClock,
  FiExternalLink,
  FiFilter,
  FiGlobe,
  FiMapPin,
  FiRefreshCw,
  FiSearch,
  FiShield,
  FiStar,
  FiTrendingUp,
  FiUsers,
  FiZap,
} from "react-icons/fi";
import { fetchCompanyProfile, searchJobFeed } from "../api/ResumeService";

const CATEGORIES = [
  ["Software Development", "software-dev"],
  ["AI / ML", "ai-ml"],
  ["Data", "data"],
  ["DevOps / Sysadmin", "devops-sysadmin"],
  ["Product", "product"],
  ["Design", "design"],
  ["Marketing", "marketing"],
  ["Sales", "sales"],
  ["QA", "qa"],
  ["Writing", "writing"],
  ["Human Resources", "human-resources"],
  ["Finance / Legal", "finance-legal"],
  ["Medical", "medical"],
  ["Education", "education"],
  ["All Others", "all-others"],
];

const LOCATIONS = ["Worldwide", "Remote", "United States", "Europe", "United Kingdom", "India", "Canada", "Asia"];
const PRESETS = [
  { label: "React Developer", query: "react developer", category: "software-dev" },
  { label: "Java Engineer", query: "java spring boot", category: "software-dev" },
  { label: "Data Engineer", query: "data engineer", category: "data" },
  { label: "DevOps", query: "devops engineer", category: "devops-sysadmin" },
  { label: "Product", query: "product manager", category: "product" },
];
const DEFAULT_PROFILE =
  "Java Full Stack Developer with experience in Spring Boot, Hibernate, MySQL, React, CRUD apps, APIs, and web application development.";
const KEYWORDS = ["java", "spring boot", "react", "typescript", "javascript", "python", "sql", "mysql", "aws", "docker", "kubernetes", "devops", "data", "ai", "ml"];
const STORAGE = { saved: "resumeStudio.savedJobs", recent: "resumeStudio.recentSearches" };

const readList = (key) => {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};
const saveList = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore
  }
};
const stripHtml = (value = "") => `${value}`.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const initials = (company = "") => company.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "J";
const fmtDate = (value) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime())
    ? value || ""
    : new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
};
const extractKeywords = (text = "") => {
  const lower = text.toLowerCase();
  return KEYWORDS.filter((k) => lower.includes(k)).slice(0, 4);
};
const deriveQuery = (summary = "") => {
  const keywords = extractKeywords(summary);
  if (keywords.length) return keywords.slice(0, 3).join(" ");
  return summary.split(/[.!?\n]/)[0].trim().split(/\s+/).slice(0, 6).join(" ") || "software developer";
};

const buildLinkedInJobSearchUrl = (job) => {
  const params = new URLSearchParams();
  const keywords = [job?.title, job?.company].filter(Boolean).join(" ").trim();
  const location = `${job?.location || ""}`.trim();

  if (keywords) {
    params.set("keywords", keywords);
  }
  if (location && location.toLowerCase() !== "worldwide") {
    params.set("location", location);
  }

  return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
};

const resolveApplyUrl = (job) => {
  const rawApplyUrl = `${job?.applyUrl || ""}`.trim();
  const rawUrl = rawApplyUrl || `${job?.url || ""}`.trim();
  if (!rawUrl) {
    return buildLinkedInJobSearchUrl(job);
  }

  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    const path = parsed.pathname.toLowerCase();
    const isLinkedInHost = host.includes("linkedin.com");
    const isCompanyPage = isLinkedInHost && path.startsWith("/company");
    const isLinkedInFeed = isLinkedInHost && path.startsWith("/feed");
    const isGenericHome = path === "/" || path === "";
    const isLinkedInJobPage = isLinkedInHost && path.includes("/jobs/view/");

    // If the URL looks like a company/home profile page, open LinkedIn job search instead.
    if (isCompanyPage || isLinkedInFeed || (isLinkedInHost && isGenericHome)) {
      return buildLinkedInJobSearchUrl(job);
    }

    if (isLinkedInJobPage) {
      return parsed.toString();
    }

    return parsed.toString();
  } catch (error) {
    if (/^https?:\/\//i.test(rawUrl)) {
      return rawUrl;
    }
    return buildLinkedInJobSearchUrl(job);
  }
};

const LiveJobsBoard = () => {
  const [query, setQuery] = useState("react developer");
  const [category, setCategory] = useState("software-dev");
  const [location, setLocation] = useState("Worldwide");
  const [company, setCompany] = useState("");
  const [limit, setLimit] = useState(20);
  const [sortBy, setSortBy] = useState("latest");
  const [profileSummary, setProfileSummary] = useState(DEFAULT_PROFILE);
  const [jobs, setJobs] = useState([]);
  const [meta, setMeta] = useState({ source: "Remotive", total: 0, fetchedAt: "", note: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [selectedJobId, setSelectedJobId] = useState("");
  const [savedJobs, setSavedJobs] = useState([]);
  const [companyProfile, setCompanyProfile] = useState(null);
  const [companyProfileLoading, setCompanyProfileLoading] = useState(false);
  const [companyProfileError, setCompanyProfileError] = useState("");
  const debounceRef = useRef(null);
  const companyProfileCacheRef = useRef({});

  useEffect(() => {
    setSavedJobs(readList(STORAGE.saved));
  }, []);
  useEffect(() => saveList(STORAGE.saved, savedJobs), [savedJobs]);

  const addRecentSearch = (term) => {
    const value = term.trim();
    if (!value) return;
    const current = readList(STORAGE.recent);
    const next = [value, ...current.filter((item) => item !== value)].slice(0, 6);
    saveList(STORAGE.recent, next);
  };

  const performSearch = useCallback(
    async (overrides = {}) => {
      const request = { query, category, location, company, limit, ...overrides };
      setLoading(true);
      setError("");
      setWarning("");
      try {
        const payload = await searchJobFeed(request);
        if (payload?.error) {
          setJobs([]);
          setError(payload.error);
          toast.error(payload.error);
          return;
        }

        if (payload?.warning) {
          setWarning(payload.warning);
        }

        const nextJobs = Array.isArray(payload?.jobs) ? payload.jobs : [];
        setJobs(nextJobs);
        setMeta({
          source: payload?.source || "Remotive",
          total: payload?.total ?? nextJobs.length,
          fetchedAt: payload?.fetchedAt || "",
          note: payload?.note || "",
        });
        addRecentSearch([request.query, request.category, request.location, request.company].filter(Boolean).join(" | "));
        setSelectedJobId((current) => (nextJobs.some((job) => String(job.id) === String(current)) ? current : String(nextJobs[0]?.id || "")));
      } catch (searchError) {
        const message = searchError?.response?.data?.error || searchError?.message || "Live job search is temporarily unavailable.";
        setError(message);
        setJobs([]);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    },
    [query, category, location, company, limit]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => performSearch(), 550);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [performSearch]);

  const sortedJobs = useMemo(() => {
    const list = [...jobs];
    return list.sort((a, b) => {
      if (sortBy === "company") return (a.company || "").localeCompare(b.company || "");
      if (sortBy === "salary") return (b.salary || "").localeCompare(a.salary || "");
      return new Date(b.publicationDate || 0) - new Date(a.publicationDate || 0);
    });
  }, [jobs, sortBy]);

  const selectedJob = useMemo(
    () => sortedJobs.find((job) => String(job.id) === String(selectedJobId)) || sortedJobs[0] || null,
    [sortedJobs, selectedJobId]
  );

  const stats = useMemo(() => {
    const companies = new Set(sortedJobs.map((job) => job.company).filter(Boolean));
    return [
      { label: "Live roles", value: sortedJobs.length },
      { label: "Companies", value: companies.size },
      { label: "Saved jobs", value: savedJobs.length },
      { label: "Category", value: CATEGORIES.find((item) => item[1] === category)?.[0] || "All" },
    ];
  }, [sortedJobs, savedJobs, category]);

  const companyOpenings = useMemo(() => {
    if (!selectedJob?.company) return 0;
    const selectedCompany = `${selectedJob.company}`.trim().toLowerCase();
    return sortedJobs.filter((job) => `${job?.company || ""}`.trim().toLowerCase() === selectedCompany).length;
  }, [sortedJobs, selectedJob]);

  const toggleSaved = (job) => {
    const exists = savedJobs.some((item) => String(item.id) === String(job.id));
    setSavedJobs((current) =>
      exists ? current.filter((item) => String(item.id) !== String(job.id)) : [job, ...current].slice(0, 12)
    );
    toast.success(exists ? "Removed from saved jobs" : "Saved job");
  };

  const quickSearch = (preset) => {
    setQuery(preset.query);
    setCategory(preset.category);
    setLocation("Worldwide");
    setCompany("");
    performSearch({ query: preset.query, category: preset.category, location: "Worldwide", company: "" });
  };

  const searchFromProfile = () => {
    const derived = deriveQuery(profileSummary);
    setQuery(derived);
    setCategory("software-dev");
    performSearch({ query: derived, category: "software-dev", location, company: "" });
    toast.success("Searching from your profile");
  };

  useEffect(() => {
    if (!selectedJob?.company) {
      setCompanyProfile(null);
      setCompanyProfileError("");
      setCompanyProfileLoading(false);
      return;
    }

    const cacheKey = `${selectedJob.company}`.trim().toLowerCase();
    if (cacheKey && companyProfileCacheRef.current[cacheKey]) {
      setCompanyProfile(companyProfileCacheRef.current[cacheKey]);
      setCompanyProfileError("");
      setCompanyProfileLoading(false);
      return;
    }

    let cancelled = false;
    setCompanyProfileLoading(true);
    setCompanyProfileError("");

    fetchCompanyProfile({
      company: selectedJob.company,
      jobUrl: selectedJob.url,
      description: selectedJob.description || selectedJob.snippet || "",
      location: selectedJob.location || "",
    })
      .then((profile) => {
        if (cancelled) return;
        setCompanyProfile(profile);
        if (cacheKey) {
          companyProfileCacheRef.current[cacheKey] = profile;
        }
      })
      .catch(() => {
        if (cancelled) return;
        setCompanyProfile(null);
        setCompanyProfileError("Could not load full company profile details right now.");
      })
      .finally(() => {
        if (!cancelled) {
          setCompanyProfileLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [selectedJob]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
        <div className="absolute inset-0 opacity-40">
          <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-cyan-500/20 blur-3xl" />
          <div className="absolute right-0 top-24 h-96 w-96 rounded-full bg-violet-500/20 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-cyan-200">
              <FiGlobe /> Live job board
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold text-emerald-200">
              <FiZap /> Real-time search
            </span>
          </div>
          <div className="mt-5 grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tight sm:text-5xl">
                LinkedIn-style job discovery, built into your resume studio.
              </h1>
              <p className="mt-4 max-w-3xl text-base text-slate-300 sm:text-lg">
                Search live remote roles, filter by company and category, and save jobs while you tailor your resume.
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

          <form
            onSubmit={(event) => {
              event.preventDefault();
              performSearch();
            }}
            className="mt-8 rounded-3xl border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur-xl"
          >
            <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr]">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Search jobs</span>
                <div className="relative">
                  <FiSearch className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/70 py-3 pl-11 pr-4 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
                    placeholder="React developer, data engineer, product manager..."
                  />
                </div>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Category</span>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
                >
                  {CATEGORIES.map(([label, value]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
                  Candidate location
                </span>
                <select
                  value={location}
                  onChange={(event) => setLocation(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none focus:border-cyan-400/40"
                >
                  {LOCATIONS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">Company</span>
                <input
                  value={company}
                  onChange={(event) => setCompany(event.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-400/40"
                  placeholder="Company name"
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
                <FiFilter className="text-cyan-300" />
                <span>Results</span>
                <select value={limit} onChange={(event) => setLimit(Number(event.target.value))} className="rounded-lg bg-transparent text-white outline-none">
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={30}>30</option>
                  <option value={40}>40</option>
                </select>
              </label>
              <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
                <FiClock className="text-cyan-300" />
                <span>Sort</span>
                <select value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="rounded-lg bg-transparent text-white outline-none">
                  <option value="latest">Latest</option>
                  <option value="company">Company</option>
                  <option value="salary">Salary</option>
                </select>
              </label>
              <button type="submit" className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300">
                <FiSearch /> Search live jobs
              </button>
              <button type="button" onClick={() => performSearch()} className="inline-flex items-center gap-2 rounded-2xl border border-white/15 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10">
                <FiRefreshCw /> Refresh
              </button>
            </div>
          </form>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)_340px]">
          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <FiShield />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Profile focus</div>
                  <div className="font-semibold text-slate-900">Search jobs from your resume</div>
                </div>
              </div>
              <label className="mt-4 flex flex-col gap-2">
                <span className="text-sm font-medium text-slate-700">Your summary</span>
                <textarea
                  value={profileSummary}
                  onChange={(event) => setProfileSummary(event.target.value)}
                  className="min-h-36 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900 outline-none focus:border-sky-400"
                  placeholder="Paste a short resume summary or skill profile here."
                />
              </label>
              <button
                type="button"
                onClick={searchFromProfile}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800"
              >
                <FiStar /> Search from profile
              </button>
              <div className="mt-4 flex flex-wrap gap-2">
                {extractKeywords(profileSummary).map((keyword) => (
                  <span key={keyword} className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                    {keyword}
                  </span>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <FiTrendingUp className="text-sky-500" />
                <h2 className="font-semibold text-slate-900">Quick searches</h2>
              </div>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => quickSearch(preset)}
                    className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:bg-sky-50"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <FiBookmark className="text-amber-500" />
                <h2 className="font-semibold text-slate-900">Saved jobs</h2>
              </div>
              {savedJobs.length ? (
                <div className="space-y-3">
                  {savedJobs.map((job) => (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => setSelectedJobId(String(job.id))}
                      className="w-full rounded-2xl bg-slate-50 p-4 text-left"
                    >
                      <div className="text-sm font-semibold text-slate-900">{job.title}</div>
                      <div className="text-xs text-slate-500">{job.company}</div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Saved jobs will appear here.</p>
              )}
            </div>
          </aside>

          <section className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">Live feed</div>
                  <h2 className="text-2xl font-black text-slate-950">Recommended jobs</h2>
                </div>
                <div className="text-sm text-slate-500">{loading ? "Searching live listings..." : `${meta.total || sortedJobs.length} jobs found`}</div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500">
                <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2">
                  <FiGlobe /> {meta.source}
                </span>
                {meta.fetchedAt ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-2">
                    <FiClock /> Updated {fmtDate(meta.fetchedAt)}
                  </span>
                ) : null}
                {meta.note ? <span>{meta.note}</span> : null}
              </div>
            </div>

            {error ? <div className="rounded-3xl border border-rose-200 bg-rose-50 p-5 text-rose-700">{error}</div> : null}
            {warning ? <div className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-amber-700">{warning}</div> : null}
            {loading && !sortedJobs.length ? <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-slate-500 shadow-sm">Loading live opportunities...</div> : null}
            {!loading && !sortedJobs.length && !error ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-950 text-white">
                  <FiBriefcase />
                </div>
                <h3 className="mt-4 text-xl font-semibold text-slate-900">No jobs matched yet</h3>
                <p className="mt-2 text-slate-500">
                  Try a broader keyword, choose another category, or search from your profile summary.
                </p>
              </div>
            ) : null}

            <div className="grid gap-4">
              {sortedJobs.map((job) => {
                const isSelected = String(selectedJobId) === String(job.id);
                const isSaved = savedJobs.some((item) => String(item.id) === String(job.id));
                return (
                  <button
                    key={job.id}
                    type="button"
                    onClick={() => setSelectedJobId(String(job.id))}
                    className={`w-full rounded-3xl border p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg ${
                      isSelected ? "border-sky-300 bg-sky-50/60" : "border-slate-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="flex gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                          {job.companyLogo ? (
                            <img src={job.companyLogo} alt={`${job.company} logo`} className="h-full w-full object-contain" loading="lazy" />
                          ) : (
                            <span className="text-sm font-bold text-slate-600">{initials(job.company)}</span>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-bold text-slate-950">{job.title}</h3>
                            {job.source ? <span className="rounded-full bg-sky-100 px-2 py-1 text-xs font-semibold text-sky-700">{job.source}</span> : null}
                            {isSaved ? <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700"><FiBookmark /> Saved</span> : null}
                          </div>
                          <div className="mt-1 text-sm font-medium text-slate-700">{job.company}</div>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1"><FiMapPin /> {job.location || "Worldwide"}</span>
                            {job.jobType ? <span className="rounded-full bg-slate-100 px-3 py-1">{job.jobType}</span> : null}
                            {job.category ? <span className="rounded-full bg-slate-100 px-3 py-1">{job.category}</span> : null}
                            {job.postedAgo ? <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1"><FiClock /> {job.postedAgo}</span> : null}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {job.salary ? <span className="rounded-full bg-emerald-100 px-3 py-2 text-xs font-semibold text-emerald-700">{job.salary}</span> : null}
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleSaved(job);
                          }}
                          className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-50"
                        >
                          <FiBookmark />
                        </button>
                      </div>
                    </div>
                    <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">{job.snippet}</p>
                    {job.keywords?.length ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {job.keywords.map((keyword) => (
                          <span key={keyword} className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
                            {keyword}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </section>

          <aside className="space-y-6">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center gap-2">
                <FiUsers className="text-sky-500" />
                <h2 className="font-semibold text-slate-900">Selected job</h2>
              </div>
              {selectedJob ? (
                <div className="mt-4 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 text-white">
                      {initials(selectedJob.company)}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-slate-950">{selectedJob.title}</h3>
                      <p className="text-sm text-slate-600">{selectedJob.company}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-2"><FiMapPin className="text-slate-400" />{selectedJob.location || "Worldwide"}</div>
                    <div className="flex items-center gap-2"><FiClock className="text-slate-400" />{selectedJob.postedAgo || fmtDate(selectedJob.publicationDate)}</div>
                    <div className="flex items-center gap-2"><FiGlobe className="text-slate-400" />{selectedJob.category || "Remote role"}</div>
                    {selectedJob.source ? <div className="flex items-center gap-2"><FiZap className="text-slate-400" />{selectedJob.source}</div> : null}
                    {selectedJob.salary ? <div>{selectedJob.salary}</div> : null}
                  </div>
                  <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">{selectedJob.description || selectedJob.snippet}</p>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Company profile</div>
                      {companyProfile?.source ? <div className="text-[11px] font-medium text-slate-500">{companyProfile.source}</div> : null}
                    </div>
                    {companyProfileLoading ? (
                      <p className="mt-3 text-sm text-slate-500">Loading real company details...</p>
                    ) : companyProfile ? (
                      <div className="mt-3 space-y-3">
                        <div className="flex items-start gap-3">
                          {companyProfile.logo ? (
                            <img
                              src={companyProfile.logo}
                              alt={`${companyProfile.name} logo`}
                              className="h-12 w-12 rounded-xl border border-slate-200 bg-white object-cover"
                              loading="lazy"
                            />
                          ) : null}
                          <div>
                            <div className="text-sm font-semibold text-slate-900">{companyProfile.name || selectedJob.company}</div>
                            {companyProfile.tagline ? <div className="text-xs text-slate-600">{companyProfile.tagline}</div> : null}
                          </div>
                        </div>
                        <p className="text-sm leading-6 text-slate-700">{stripHtml(companyProfile.about) || "Company information is currently limited for this listing."}</p>
                        <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                          {companyProfile.headquarters ? <span className="rounded-full bg-white px-3 py-1">HQ: {companyProfile.headquarters}</span> : null}
                          {companyProfile.foundedYear ? <span className="rounded-full bg-white px-3 py-1">Founded: {companyProfile.foundedYear}</span> : null}
                          {companyOpenings > 0 ? <span className="rounded-full bg-white px-3 py-1">{companyOpenings} role(s) in this search</span> : null}
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {companyProfile.website ? (
                            <a
                              href={companyProfile.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              Website <FiExternalLink />
                            </a>
                          ) : null}
                          {companyProfile.profileUrl ? (
                            <a
                              href={companyProfile.profileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                            >
                              Public profile <FiExternalLink />
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500">{companyProfileError || "Company details are unavailable for this listing."}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => toggleSaved(selectedJob)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      <FiBookmark />
                      {savedJobs.some((item) => String(item.id) === String(selectedJob.id)) ? "Saved" : "Save job"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const targetUrl = resolveApplyUrl(selectedJob);
                        window.open(targetUrl, "_blank", "noopener,noreferrer");
                      }}
                      className="inline-flex items-center gap-2 rounded-2xl bg-sky-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-sky-600"
                    >
                      Apply now <FiExternalLink />
                    </button>
                  </div>
                </div>
              ) : (
                <p className="mt-4 text-sm text-slate-500">Select a listing to see details.</p>
              )}
            </div>

            <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 to-slate-800 p-6 text-white shadow-sm">
              <div className="flex items-center gap-2 text-cyan-200">
                <FiTrendingUp />
                <h2 className="font-semibold">Search tips</h2>
              </div>
              <ul className="mt-4 space-y-3 text-sm text-slate-300">
                <li>Use role keywords like React, Java, or Data Engineer.</li>
                <li>Try company names when you want targeted results.</li>
                <li>Match your profile summary to the role before searching.</li>
                <li>Save jobs first, then apply from the detail panel.</li>
              </ul>
              <div className="mt-5">
                <Link
                  to="/generate-resume"
                  className="inline-flex items-center gap-2 rounded-2xl bg-cyan-400 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  Tailor my resume <FiArrowRight />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
};

export default LiveJobsBoard;
