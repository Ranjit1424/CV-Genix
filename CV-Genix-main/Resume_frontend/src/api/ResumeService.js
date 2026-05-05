import axios from "axios";

export const baseURLL =
  (typeof import.meta !== "undefined" && import.meta.env?.VITE_API_BASE_URL) ||
  "http://localhost:8081";

export const axiosInstance = axios.create({
  baseURL: baseURLL,
});

let unauthorizedHandler = null;

axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error?.response?.status === 401) {
      unauthorizedHandler?.();
    }
    return Promise.reject(error);
  }
);

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = typeof handler === "function" ? handler : null;
};

const formatAxiosError = (error, path) => {
  const isNetwork = !error?.response;
  return {
    error: isNetwork ? error.message || "Network Error" : error?.response?.data?.error || error?.message || "Request failed",
    url: `${axiosInstance.defaults.baseURL?.replace(/\/$/, "") || baseURLL}${path.startsWith("/") ? path : `/${path}`}`,
    status: error?.response?.status || null,
    details: error?.response?.data || null,
    isNetwork,
  };
};

const remotiveBaseUrl = "https://remotive.com/api/remote-jobs";
const wikipediaSummaryBaseUrl = "https://en.wikipedia.org/api/rest_v1/page/summary";
const wikipediaSearchBaseUrl = "https://en.wikipedia.org/w/api.php";
const excludedJobTerms = ["mitre media", "jobs@mitremedia.com"];

const toTitleCase = (value = "") =>
  `${value}`
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");

const stripHtml = (value = "") =>
  `${value}`
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();

const buildSnippet = (text = "") => {
  const clean = stripHtml(text);
  return clean.length <= 180 ? clean : `${clean.slice(0, 177)}...`;
};

const keywords = [
  "java",
  "spring boot",
  "react",
  "typescript",
  "javascript",
  "python",
  "sql",
  "mysql",
  "postgresql",
  "aws",
  "azure",
  "docker",
  "kubernetes",
  "node",
  "graphql",
  "rest",
  "api",
  "full stack",
  "frontend",
  "backend",
  "devops",
  "data",
  "ai",
  "ml",
];

const extractKeywords = (text = "") => {
  const lowered = text.toLowerCase();
  return keywords.filter((item) => lowered.includes(item)).slice(0, 5);
};

const cleanCompanyQuery = (value = "") =>
  `${value}`
    .replace(/\b(incorporated|inc|llc|ltd|limited|corp|corporation|company|co|plc|pvt)\b\.?/gi, " ")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const uniqueList = (items = []) => [...new Set(items.filter(Boolean))];

const parseUrl = (value = "") => {
  if (!value?.trim()) return null;
  try {
    return new URL(value);
  } catch {
    return null;
  }
};

const getHostWithoutWww = (value = "") => {
  const parsed = parseUrl(value);
  if (!parsed?.hostname) return "";
  return parsed.hostname.replace(/^www\./i, "").toLowerCase();
};

const isLinkedInHost = (value = "") => getHostWithoutWww(value).includes("linkedin.com");

const deriveCompanyWebsite = (jobUrl = "") => {
  const parsed = parseUrl(jobUrl);
  if (!parsed) return "";
  if (isLinkedInHost(jobUrl)) return "";
  return `${parsed.protocol}//${parsed.hostname}`;
};

const extractFoundedYear = (text = "") => {
  const match = `${text}`.match(/\b(?:founded|established)\s(?:in\s)?(\d{4})\b/i);
  return match ? match[1] : "";
};

const extractHeadquarters = (text = "") => {
  const match = `${text}`.match(/\bheadquartered in ([^.;]+)/i);
  return match ? match[1].trim() : "";
};

const buildCompanyFallbackProfile = ({ company = "", description = "", location = "", jobUrl = "" } = {}) => {
  const website = deriveCompanyWebsite(jobUrl);
  const fallbackAbout = stripHtml(description) || `${company || "This company"} is currently hiring from the live jobs feed.`;

  return {
    name: company || "Unknown Company",
    tagline: "Live company details from job listing",
    about: buildSnippet(fallbackAbout),
    website,
    careersUrl: jobUrl || "",
    profileUrl: "",
    logo: "",
    headquarters: location || "",
    foundedYear: "",
    source: "Live job listing",
  };
};

const fetchWikipediaSummaryByTitle = async (title = "") => {
  const cleanTitle = `${title}`.trim();
  if (!cleanTitle) return null;
  const response = await fetch(`${wikipediaSummaryBaseUrl}/${encodeURIComponent(cleanTitle)}`);
  if (!response.ok) return null;
  const payload = await response.json();
  if (!payload?.extract || payload?.type === "disambiguation") return null;
  return payload;
};

const fetchWikipediaSummaryForCompany = async (company = "") => {
  const trimmed = `${company}`.trim();
  if (!trimmed) return null;

  const candidates = uniqueList([trimmed, cleanCompanyQuery(trimmed)]);
  for (const candidate of candidates) {
    try {
      const params = new URLSearchParams({
        action: "opensearch",
        search: candidate,
        limit: "3",
        namespace: "0",
        format: "json",
        origin: "*",
      });
      const response = await fetch(`${wikipediaSearchBaseUrl}?${params.toString()}`);
      if (!response.ok) continue;
      const payload = await response.json();
      const titles = Array.isArray(payload?.[1]) ? payload[1] : [];

      for (const title of titles) {
        const summary = await fetchWikipediaSummaryByTitle(title);
        if (summary) return summary;
      }

      const direct = await fetchWikipediaSummaryByTitle(candidate);
      if (direct) return direct;
    } catch {
      // ignore and try next candidate
    }
  }

  return null;
};

const normalizeRemotiveJobs = (jobs = []) =>
  jobs
    .filter((job) => {
      const text = `${job?.title || ""} ${job?.company_name || ""} ${stripHtml(job?.description || "")}`.toLowerCase();
      return !excludedJobTerms.some((term) => text.includes(term));
    })
    .map((job) => {
    const description = stripHtml(job?.description || "");
    return {
      id: job?.id || `${job?.company_name || "company"}-${job?.title || "role"}`,
      title: job?.title || "Untitled Role",
      company: job?.company_name || "Unknown Company",
      companyLogo: job?.company_logo || "",
      category: toTitleCase(job?.category || ""),
      jobType: toTitleCase(job?.job_type || ""),
      location: job?.candidate_required_location || "Worldwide",
      salary: job?.salary || "",
      url: job?.url || "",
      applyUrl: job?.url || "",
      publicationDate: job?.publication_date || "",
      postedAgo: "",
      snippet: buildSnippet(description),
      description,
      keywords: extractKeywords(`${job?.title || ""} ${description}`),
      source: "Remotive",
    };
  });

const buildOfflineDemoJobs = (query = "") => {
  const baseRole = query?.trim() || "Software Developer";
  const now = new Date().toISOString();
  const items = [
    {
      id: `demo-1-${baseRole}`,
      title: `${baseRole} (Remote)`,
      company: "DemoTech Labs",
      category: "Software Development",
      jobType: "Full Time",
      location: "Worldwide",
      salary: "$35k - $55k",
      url: "https://www.linkedin.com/jobs/",
      applyUrl: "https://www.linkedin.com/jobs/",
      publicationDate: now,
      snippet: "Build APIs, UI workflows, and reliable integrations in a fast-paced product team.",
      description:
        "Demo listing shown because the live backend connection is unavailable. This role focuses on APIs, frontend integration, and practical delivery.",
      keywords: extractKeywords(baseRole),
      companyLogo: "",
      source: "Offline Demo",
    },
    {
      id: `demo-2-${baseRole}`,
      title: `Junior ${baseRole}`,
      company: "CloudSprint Systems",
      category: "Software Development",
      jobType: "Contract",
      location: "Remote - India",
      salary: "$20k - $40k",
      url: "https://www.linkedin.com/jobs/",
      applyUrl: "https://www.linkedin.com/jobs/",
      publicationDate: now,
      snippet: "Work with Java, Spring Boot, and SQL on internal products and client features.",
      description:
        "Demo listing shown because the live backend connection is unavailable. Good fit for candidates with Java, backend APIs, and database fundamentals.",
      keywords: extractKeywords(`java spring boot sql ${baseRole}`),
      companyLogo: "",
      source: "Offline Demo",
    },
  ];
  return items;
};

const fetchRemotiveDirect = async ({ query = "", category = "", company = "", limit = 20 } = {}) => {
  const params = new URLSearchParams();
  if (query?.trim()) params.set("search", query.trim());
  if (category?.trim() && category !== "all") params.set("category", category.trim());
  if (company?.trim()) params.set("company_name", company.trim());
  params.set("limit", String(limit));

  const response = await fetch(`${remotiveBaseUrl}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Direct live feed request failed (${response.status})`);
  }

  const data = await response.json();
  const jobs = normalizeRemotiveJobs(Array.isArray(data?.jobs) ? data.jobs : []);
  return {
    source: "Remotive",
    total: jobs.length,
    upstreamTotal: data?.["job-count"] ?? jobs.length,
    fetchedAt: new Date().toISOString(),
    note: "Using direct feed fallback because backend proxy is unreachable.",
    warning: "Backend connection issue detected. Showing direct live feed fallback.",
    jobs,
  };
};

const fetchRemotiveBroadFallback = async ({ query = "", limit = 20 } = {}) => {
  const queryTokens = `${query}`.trim().split(/\s+/).filter(Boolean);
  const broaderQuery = queryTokens.slice(0, 2).join(" ") || "software developer";

  const params = new URLSearchParams();
  params.set("search", broaderQuery);
  params.set("limit", String(limit));

  const response = await fetch(`${remotiveBaseUrl}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`Broad fallback request failed (${response.status})`);
  }

  const data = await response.json();
  const jobs = normalizeRemotiveJobs(Array.isArray(data?.jobs) ? data.jobs : []);
  return {
    source: "Remotive",
    total: jobs.length,
    upstreamTotal: data?.["job-count"] ?? jobs.length,
    fetchedAt: new Date().toISOString(),
    note: "Using broader direct feed fallback because strict filters returned no jobs.",
    warning:
      "Strict search returned no jobs. Showing broader live matches instead.",
    jobs,
  };
};

const fetchRemotiveGeneral = async ({ limit = 20 } = {}) => {
  const params = new URLSearchParams();
  params.set("limit", String(limit));

  const response = await fetch(`${remotiveBaseUrl}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`General fallback request failed (${response.status})`);
  }

  const data = await response.json();
  const jobs = normalizeRemotiveJobs(Array.isArray(data?.jobs) ? data.jobs : []);
  return {
    source: "Remotive",
    total: jobs.length,
    upstreamTotal: data?.["job-count"] ?? jobs.length,
    fetchedAt: new Date().toISOString(),
    note: "Showing latest live jobs because exact filters returned no matches.",
    warning: "No exact matches found. Showing latest live opportunities.",
    jobs,
  };
};

export const generateResume = async (description, jobDescription = "") => {
  try {
    const response = await axiosInstance.post("/api/v1/resume/generate", {
      userDescription: description,
      jobDescription,
    });
    return response.data;
  } catch (error) {
    return formatAxiosError(error, "/api/v1/resume/generate");
  }
};

export const uploadResumeForRating = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axiosInstance.post("/api/v1/resume/upload", formData, {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    });

    return response.data;
  } catch (error) {
    return formatAxiosError(error, "/api/v1/resume/upload");
  }
};

export const analyzeResumeJobMatch = async (jobDescription, resumeData) => {
  try {
    const response = await axiosInstance.post("/api/v1/resume/job-match", {
      jobDescription,
      resumeData,
    });
    return response.data;
  } catch (error) {
    return formatAxiosError(error, "/api/v1/resume/job-match");
  }
};

export const generateInterviewQuestions = async ({
  candidateDescription = "",
  targetRole = "",
  jobDescription = "",
  questionCount = 8,
  interviewStyle = "Technical",
  interviewSituation = "Programming round",
} = {}) => {
  try {
    const response = await axiosInstance.post("/api/v1/interviews/questions", {
      candidateDescription,
      targetRole,
      jobDescription,
      questionCount,
      interviewStyle,
      interviewSituation,
    });
    return response.data;
  } catch (error) {
    return formatAxiosError(error, "/api/v1/interviews/questions");
  }
};

export const generateProfessionalEmail = async (prompt, tone = "Professional") => {
  try {
    const response = await axiosInstance.post("/api/v1/email/generate", {
      prompt,
      tone,
    });
    return response.data;
  } catch (error) {
    return formatAxiosError(error, "/api/v1/email/generate");
  }
};

export const generatePlacementOpportunities = async (description) => {
  try {
    const response = await axiosInstance.post("/api/v1/resume/placement", {
      userDescription: description,
    });
    return response.data;
  } catch (error) {
    return formatAxiosError(error, "/api/v1/resume/placement");
  }
};

export const searchJobFeed = async ({ query = "", category = "", location = "", company = "", limit = 20 } = {}) => {
  try {
    const response = await axiosInstance.get("/api/v1/jobs/search", {
      params: {
        q: query,
        category,
        location,
        company,
        limit,
      },
    });
    const primaryPayload = response.data;
    const primaryJobs = Array.isArray(primaryPayload?.jobs) ? primaryPayload.jobs : [];
    if (primaryPayload?.error || primaryJobs.length > 0) {
      return primaryPayload;
    }

    const queryTokens = `${query}`.trim().split(/\s+/).filter(Boolean);
    const broaderQuery = queryTokens.slice(0, 2).join(" ");
    if (broaderQuery && broaderQuery.toLowerCase() !== `${query}`.trim().toLowerCase()) {
      try {
        const broaderResponse = await axiosInstance.get("/api/v1/jobs/search", {
          params: {
            q: broaderQuery,
            category: "",
            location,
            company: "",
            limit,
          },
        });
        const broaderPayload = broaderResponse.data;
        const broaderJobs = Array.isArray(broaderPayload?.jobs) ? broaderPayload.jobs : [];
        if (broaderJobs.length > 0) {
          return {
            ...broaderPayload,
            note: "Exact filters had no matches. Showing broader live matches.",
            warning: "No exact jobs found for this full query. Showing broader live results.",
          };
        }
      } catch {
        // ignore and continue to general direct fallback
      }
    }

    try {
      const general = await fetchRemotiveGeneral({ limit });
      if (Array.isArray(general?.jobs) && general.jobs.length > 0) {
        return general;
      }
    } catch {
      // ignore and return the original empty payload
    }

    return {
      ...primaryPayload,
      warning: primaryPayload?.warning || "No live jobs matched this search yet. Try broader keywords.",
    };
  } catch (error) {
    const formatted = formatAxiosError(error, "/api/v1/jobs/search");

    // First fallback: try direct live feed from browser when backend is unreachable.
    if (formatted.isNetwork) {
      try {
        const direct = await fetchRemotiveDirect({ query, category, company, limit });
        if (Array.isArray(direct?.jobs) && direct.jobs.length > 0) {
          return direct;
        }

        const broader = await fetchRemotiveBroadFallback({ query, limit });
        if (Array.isArray(broader?.jobs) && broader.jobs.length > 0) {
          return broader;
        }

        const general = await fetchRemotiveGeneral({ limit });
        if (Array.isArray(general?.jobs) && general.jobs.length > 0) {
          return {
            ...general,
            note: "Strict and broad query fallbacks returned no matches. Showing latest live jobs.",
            warning: "No exact jobs found for this search. Showing latest live opportunities.",
          };
        }

        return {
          ...broader,
          source: "Offline Demo",
          total: 2,
          note: "No live jobs matched this strict query. Showing demo results.",
          warning:
            "No live jobs matched this query right now. Showing demo results so the board stays usable.",
          jobs: buildOfflineDemoJobs(query),
        };
      } catch (fallbackError) {
        // Second fallback: keep the UI usable with demo listings.
        return {
          source: "Offline Demo",
          total: 2,
          fetchedAt: new Date().toISOString(),
          note: "Live feed unavailable. Showing demo jobs so the board stays usable.",
          warning:
            "Could not connect to backend or live jobs source. Start backend on http://localhost:8081 or set VITE_API_BASE_URL.",
          jobs: buildOfflineDemoJobs(query),
        };
      }
    }

    return formatted;
  }
};

export const fetchCompanyProfile = async ({ company = "", jobUrl = "", description = "", location = "" } = {}) => {
  const fallback = buildCompanyFallbackProfile({ company, description, location, jobUrl });
  const wikipedia = await fetchWikipediaSummaryForCompany(company);
  if (!wikipedia) {
    return fallback;
  }

  const about = stripHtml(wikipedia?.extract || "") || fallback.about;
  const tagline = stripHtml(wikipedia?.description || "") || fallback.tagline;
  const profileUrl = wikipedia?.content_urls?.desktop?.page || "";
  const logo = wikipedia?.thumbnail?.source || "";

  return {
    ...fallback,
    name: wikipedia?.title || fallback.name,
    tagline,
    about: buildSnippet(about),
    profileUrl,
    logo,
    foundedYear: extractFoundedYear(about),
    headquarters: extractHeadquarters(about) || fallback.headquarters,
    source: "Wikipedia + live job listing",
  };
};
