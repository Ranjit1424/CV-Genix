import React, { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import { FaComments } from "react-icons/fa";
import { analyzeResumeJobMatch, generateResume } from "../api/ResumeService";
import { useForm, useFieldArray } from "react-hook-form";
import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";
import { useLocation } from "react-router-dom";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min?url";
import { getCurrentSession, saveResumeToCurrentProfile } from "../utils/localAuth";
import { generateInterviewQuestions } from "../api/ResumeService";
import DesignerBoundary from "../components/generate-resume/DesignerBoundary";
import ResumeBuilderForm from "../components/generate-resume/ResumeBuilderForm";
import PromptInput from "../components/generate-resume/PromptInput";
import ResumeResult from "../components/generate-resume/ResumeResult";
import ChatDock from "../components/generate-resume/ChatDock";
import TemplateChooser from "../components/generate-resume/TemplateChooser";
import DesignerPanel from "../components/generate-resume/DesignerPanel";
import TailoringInsights from "../components/generate-resume/TailoringInsights";

GlobalWorkerOptions.workerSrc = pdfWorker;

const GenerateResume = () => {
  const MIN_DESCRIPTION_LENGTH = 30;
  const emptyData = {
    personalInformation: {
      fullName: "Sarthak Khatpe",
      email: "",
      phoneNumber: "",
      location: "",
      linkedin: "",
      gitHub: "",
      portfolio: "",
    },
    summary: "",
    skills: [],
    experience: [],
    education: [],
    certifications: [],
    projects: [],
    languages: [],
    interests: [],
    achievements: [],
    rating: {
      score: null,
      feedback: "",
    },
  };

  const normalizeStringList = (value) => {
    if (Array.isArray(value)) {
      return value.map((item) => `${item ?? ""}`.trim()).filter(Boolean);
    }
    if (typeof value === "string") {
      return value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
    }
    return [];
  };

  const normalizeData = (payload = {}) => ({
    ...emptyData,
    ...payload,
    personalInformation: {
      ...emptyData.personalInformation,
      ...(payload.personalInformation || {}),
    },
    skills: payload.skills || [],
    experience: payload.experience || [],
    education: payload.education || [],
    certifications: payload.certifications || [],
    projects: (payload.projects || []).map((p) => ({
      ...p,
      technologiesUsed: normalizeStringList(p?.technologiesUsed),
    })),
    languages: payload.languages || [],
    interests: payload.interests || [],
    achievements: payload.achievements || [],
    rating: payload.rating || emptyData.rating,
  });

  const hasResumeContent = (payload) => {
    const personalInformation = payload?.personalInformation || {};
    return Boolean(
      payload?.summary?.trim() ||
        (payload?.skills || []).some((item) => item?.title?.trim()) ||
        (payload?.experience || []).some((item) => item?.jobTitle?.trim() || item?.responsibility?.trim()) ||
        (payload?.projects || []).some((item) => item?.title?.trim() || item?.description?.trim()) ||
        personalInformation?.fullName?.trim()
    );
  };

  const [data, setData] = useState(emptyData);
  const location = useLocation();
  const [builderAlert, setBuilderAlert] = useState(null);
  const [formIssues, setFormIssues] = useState([]);
  const [jobInsights, setJobInsights] = useState(null);
  const [jobInsightsLoading, setJobInsightsLoading] = useState(false);
  const [jobInsightsError, setJobInsightsError] = useState("");
  const [resumeVersions, setResumeVersions] = useState([]);
  const [linkedInUrl, setLinkedInUrl] = useState("");
  const [linkedInAnalysis, setLinkedInAnalysis] = useState(null);
  const [interviewQuestions, setInterviewQuestions] = useState([]);
  const [interviewQuestionCount, setInterviewQuestionCount] = useState(8);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const [portfolioPreviewHtml, setPortfolioPreviewHtml] = useState("");
  const [voiceMode, setVoiceMode] = useState("chat");

  const { register, handleSubmit, control, setValue, reset, getValues } = useForm({
    defaultValues: emptyData,
  });

  const [showFormUI, setShowFormUI] = useState(false);
  const [showResumeUI, setShowResumeUI] = useState(false);
  const [showPromptInput, setShowPromptInput] = useState(true);
  const [showTemplateChooser, setShowTemplateChooser] = useState(false);
  const lastUploadedText = useRef("");
  const [improvingBulletPath, setImprovingBulletPath] = useState("");

  const experienceFields = useFieldArray({ control, name: "experience" });
  const educationFields = useFieldArray({ control, name: "education" });
  const certificationsFields = useFieldArray({
    control,
    name: "certifications",
  });
  const projectsFields = useFieldArray({ control, name: "projects" });
  const languagesFields = useFieldArray({ control, name: "languages" });
  const interestsFields = useFieldArray({ control, name: "interests" });
  const skillsFields = useFieldArray({ control, name: "skills" });
  const resumeVersionStorageKey = "resumeBuilder.resumeVersions";

  const loadSavedResumeVersions = () => {
    try {
      const stored = localStorage.getItem(resumeVersionStorageKey);
      const parsed = stored ? JSON.parse(stored) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error("Could not load resume versions", error);
      return [];
    }
  };

  const persistSavedResumeVersions = (versions) => {
    setResumeVersions(versions);
    try {
      localStorage.setItem(resumeVersionStorageKey, JSON.stringify(versions));
    } catch (error) {
      console.error("Failed to persist resume versions", error);
    }
  };

  const createPortfolioPageHtml = (resumeData) => {
    const pi = resumeData.personalInformation || {};
    const skills = (resumeData.skills || []).map((skill) => skill.title).filter(Boolean);
    const experience = resumeData.experience || [];
    const projects = resumeData.projects || [];
    const education = resumeData.education || [];

    const safeText = (value) =>
      `${value || ""}`.replace(/</g, "&lt;").replace(/>/g, "&gt;");

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${safeText(pi.fullName || "My Portfolio")}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 0; padding: 0; background: #f7f8fb; color: #111827; }
    .page { max-width: 900px; margin: auto; padding: 32px; }
    .header { text-align:center; margin-bottom: 24px; }
    .header h1 { margin:0; font-size: 2.6rem; }
    .header p { margin: 8px 0 0; color: #4b5563; }
    .section { margin-bottom: 24px; }
    .section h2 { margin-bottom: 12px; font-size: 1.4rem; color: #0f172a; }
    .chip { display:inline-block; margin:4px 6px 4px 0; padding:8px 12px; background:#e2e8f0; border-radius:999px; color:#0f172a; font-size:0.92rem; }
    .card { background:#ffffff; border-radius:16px; padding:18px; box-shadow:0 8px 24px rgba(15,23,42,0.08); margin-bottom:16px; }
    a { color:#2563eb; text-decoration:none; }
  </style>
</head>
<body>
  <div class="page">
    <section class="header">
      <h1>${safeText(pi.fullName || "Your Name")}</h1>
      <p>${safeText(pi.location || "Location")} · ${safeText(pi.email || "Email")}${pi.phoneNumber ? ` · ${safeText(pi.phoneNumber)}` : ""}</p>
      <p>${safeText(pi.linkedin || "")}${pi.gitHub ? ` · <a href=\"${safeText(pi.gitHub)}\">GitHub</a>` : ""}${pi.portfolio ? ` · <a href=\"${safeText(pi.portfolio)}\">Portfolio</a>` : ""}</p>
    </section>
    <section class="section card">
      <h2>About</h2>
      <p>${safeText(resumeData.summary || "I am a motivated candidate with experience in software development and technical delivery.")}</p>
    </section>
    ${skills.length ? `<section class="section card"><h2>Skills</h2>${skills.map((skill) => `<span class="chip">${safeText(skill)}</span>`).join("")}</section>` : ""}
    ${experience.length ? `<section class="section card"><h2>Experience</h2>${experience.map((exp) => `<div><strong>${safeText(exp.jobTitle || "Role")}</strong> at ${safeText(exp.company || "Company")}<br/><em>${safeText(exp.location || "Location")} · ${safeText(exp.duration || "Duration")}</em><p>${safeText(exp.responsibility || "")}</p></div>`).join("")}</section>` : ""}
    ${projects.length ? `<section class="section card"><h2>Projects</h2>${projects.map((proj) => `<div><strong>${safeText(proj.title || "Project")}</strong><p>${safeText(proj.description || "")}</p>${(proj.technologiesUsed || []).length ? `<p><strong>Tech:</strong> ${safeText((proj.technologiesUsed || []).join(", "))}</p>` : ""}${proj.githubLink ? `<p><a href=\"${safeText(proj.githubLink)}\">View on GitHub</a></p>` : ""}</div>`).join("")}</section>` : ""}
    ${education.length ? `<section class="section card"><h2>Education</h2>${education.map((edu) => `<div><strong>${safeText(edu.degree || "Degree")}</strong> · ${safeText(edu.university || "University")}<br/><em>${safeText(edu.location || "Location")} · ${safeText(edu.graduationYear || "Year")}</em></div>`).join("")}</section>` : ""}
  </div>
</body>
</html>`;
  };

  const downloadTextFile = (filename, content, mime = "text/plain") => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const saveCurrentResumeVersion = () => {
    const title = window.prompt("Name this resume version", `Resume version ${resumeVersions.length + 1}`);
    if (!title) return;
    const roleTag = window.prompt("Target role name (optional)", "Software Developer");
    const version = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title,
      roleTag: roleTag?.trim() || "General",
      savedAt: new Date().toISOString(),
      data,
    };
    persistSavedResumeVersions([version, ...resumeVersions]);
    toast.success(`Saved version: ${title}`);
  };

  const restoreResumeVersion = (version) => {
    if (!version || !version.data) return;
    const normalized = normalizeData(version.data);
    setData(normalized);
    reset(normalized);
    setBuilderAlert({
      kind: "success",
      title: `Restored version: ${version.title}`,
      message: "You can continue editing or generate a fresh template from this version.",
    });
    setShowResumeUI(false);
    setShowFormUI(true);
    setShowPromptInput(false);
  };

  const deleteResumeVersion = (versionId) => {
    persistSavedResumeVersions(resumeVersions.filter((item) => item.id !== versionId));
    toast.success("Version removed.");
  };

  const generateInterviewTopics = async () => {
    const candidateDescription =
      data.summary?.trim() ||
      [
        data.personalInformation?.fullName,
        data.experience?.[0]?.jobTitle,
        ...(data.skills || []).slice(0, 6).map((skill) => skill?.title).filter(Boolean),
      ]
        .filter(Boolean)
        .join(", ");
    const targetRole =
      jobDescription.trim().split(/[\n\.]/)[0] ||
      data.experience?.[0]?.jobTitle ||
      data.summary ||
      "Programming role";

    setInterviewLoading(true);
    try {
      const response = await generateInterviewQuestions({
        candidateDescription,
        targetRole,
        jobDescription: jobDescription.trim(),
        questionCount: interviewQuestionCount,
        interviewStyle: "Technical",
        interviewSituation: "Programming round",
      });

      if (response?.error) {
        setInterviewQuestions([]);
        toast.error(response.error);
        return;
      }

      const questions = Array.isArray(response?.questions) ? response.questions : [];
      setInterviewQuestions(questions.slice(0, interviewQuestionCount));
      toast.success(`Generated ${questions.length || interviewQuestionCount} interview questions`);
    } catch (error) {
      const message = error?.message || "Could not generate interview questions right now.";
      toast.error(message);
      setInterviewQuestions([]);
    } finally {
      setInterviewLoading(false);
    }
  };

  const analyzeLinkedInProfile = () => {
    if (!linkedInUrl.trim()) {
      setLinkedInAnalysis({ error: "Paste a LinkedIn profile URL or copy a headline to get suggestions." });
      return;
    }
    const targetRole = jobDescription.match(/(software developer|frontend developer|backend developer|engineer|data scientist|product manager)/i)?.[0] || "your target role";
    setLinkedInAnalysis({
      headline: `Use a strong headline such as: '${targetRole} | ${data.skills?.slice(0, 3).map((skill) => skill.title).filter(Boolean).join(", ")}'`,
      summary:
        "Include your professional title, top tools, and a short impact statement. Keep it active and keyword-rich.",
      skills:
        data.skills?.length
          ? `Highlight ${data.skills.slice(0, 4).map((skill) => skill.title).filter(Boolean).join(", ")} on your LinkedIn Skills section.`
          : "Add at least 4 relevant skills to your LinkedIn profile for better recruiter matches.",
      suggestions: [
        "Use a headline that clearly states your role and strongest technologies.",
        "Write a summary that mentions measurable impact and your career focus.",
        "Add a mobile-friendly portfolio link and GitHub projects to your profile.",
      ],
    });
  };

  const createResumePortfolio = () => {
    const html = createPortfolioPageHtml(data);
    setPortfolioPreviewHtml(html);
    downloadTextFile(`${data.personalInformation.fullName?.replace(/\s+/g, "_") || "portfolio"}.html`, html, "text/html");
  };

  const skillResourceLookup = {
    react: "https://www.youtube.com/watch?v=Ke90Tje7VS0",
    javascript: "https://www.youtube.com/watch?v=W6NZfCO5SIk",
    typescript: "https://www.youtube.com/watch?v=BwuLxPH8IDs",
    java: "https://www.youtube.com/watch?v=grEKMHGYyns",
    python: "https://www.youtube.com/watch?v=_uQrJ0TkZlc",
    sql: "https://www.youtube.com/watch?v=HXV3zeQKqGY",
    aws: "https://www.youtube.com/watch?v=ulprqHHWlng",
    docker: "https://www.youtube.com/watch?v=fqMOX6JJhGo",
    kubernetes: "https://www.youtube.com/watch?v=X48VuDVv0do",
    spring: "https://www.youtube.com/watch?v=vtPkZShrvXQ",
    api: "https://www.youtube.com/watch?v=FXpIoQ_rT_c",
    cloud: "https://www.youtube.com/watch?v=3hLmDS179YE",
  };

  useEffect(() => {
    persistSavedResumeVersions(loadSavedResumeVersions());
  }, []);

  // Diverse template gallery inspired by modern AI resume builders
  const templateCatalog = [
    {
      id: "classic",
      title: "Classic",
      blurb: "Traditional single-column structure for broad ATS compatibility",
      thumb: "linear-gradient(135deg,#1d2d4a 0%,#31476f 38%,#edf3ff 38%,#ffffff 100%)",
    },
    {
      id: "modern",
      title: "Modern",
      blurb: "Bold headings and clean spacing for product and tech roles",
      thumb: "linear-gradient(135deg,#0b1727 0%,#1f2d43 37%,#eaf1ff 37%,#ffffff 100%)",
    },
    {
      id: "minimal",
      title: "Minimal",
      blurb: "Low-ink minimalist format focused on readable information flow",
      thumb: "linear-gradient(135deg,#f2f4f7 0%,#ffffff 40%,#ffffff 40%,#ffffff 100%)",
    },
    {
      id: "sleek",
      title: "Sleek",
      blurb: "Dark premium look with strong contrast and compact sections",
      thumb: "linear-gradient(135deg,#0b1220 0%,#111c31 36%,#dce8ff 36%,#ffffff 100%)",
    },
    {
      id: "navy-sidebar",
      title: "Navy Sidebar",
      blurb: "Two-column sidebar profile with quick-scan contact and skills",
      thumb: "linear-gradient(135deg,#102f57 0%,#204a7a 34%,#edf3fc 34%,#ffffff 100%)",
    },
    {
      id: "split-grid",
      title: "Split Grid",
      blurb: "Executive split layout with confident section rhythm",
      thumb: "linear-gradient(135deg,#13243f 0%,#284166 34%,#eaf0f8 34%,#ffffff 100%)",
    },
    {
      id: "timeline",
      title: "Timeline",
      blurb: "Chronological timeline emphasis for steady career progression",
      thumb: "linear-gradient(135deg,#23436b 0%,#3a6595 35%,#edf4ff 35%,#ffffff 100%)",
    },
    {
      id: "spotlight",
      title: "Spotlight",
      blurb: "Feature-first visual hierarchy for standout achievements",
      thumb: "linear-gradient(135deg,#5a3418 0%,#8a5731 34%,#fff4ea 34%,#ffffff 100%)",
    },
    {
      id: "editorial",
      title: "Editorial",
      blurb: "Magazine-inspired typography with elegant section cadence",
      thumb: "linear-gradient(135deg,#6b5841 0%,#8f7758 34%,#fdf6eb 34%,#ffffff 100%)",
    },
    {
      id: "prism",
      title: "Prism",
      blurb: "Layered information blocks with sharp modern separators",
      thumb: "linear-gradient(135deg,#183454 0%,#2a5e8e 35%,#e8f5ff 35%,#ffffff 100%)",
    },
    {
      id: "frame",
      title: "Frame",
      blurb: "Framed professional layout with subtle classic polish",
      thumb: "linear-gradient(135deg,#655246 0%,#8a7161 34%,#fbf5ee 34%,#ffffff 100%)",
    },
    {
      id: "zen",
      title: "Zen",
      blurb: "Soft neutral structure for calm and readable resumes",
      thumb: "linear-gradient(135deg,#355e58 0%,#4a7c74 34%,#ecf7f4 34%,#ffffff 100%)",
    },
    {
      id: "crimson",
      title: "Crimson",
      blurb: "Bold section accents for leadership and sales profiles",
      thumb: "linear-gradient(135deg,#5e1e1e 0%,#8b3131 34%,#fdeeee 34%,#ffffff 100%)",
    },
    {
      id: "lavender",
      title: "Lavender",
      blurb: "Clean professional layout with gentle creative tone",
      thumb: "linear-gradient(135deg,#553d78 0%,#7456a1 34%,#f6eeff 34%,#ffffff 100%)",
    },
    {
      id: "blue-accent",
      title: "Blue Accent",
      blurb: "Safe ATS-friendly structure with stronger blue hierarchy",
      thumb: "linear-gradient(135deg,#204a8b 0%,#3a6bb5 34%,#ebf3ff 34%,#ffffff 100%)",
    },
    {
      id: "atlas-pro",
      title: "Atlas Pro",
      blurb: "Corporate two-column flow with strong resume density",
      thumb: "linear-gradient(135deg,#172c48 0%,#2f4f77 34%,#e8eff8 34%,#ffffff 100%)",
    },
    {
      id: "summit-executive",
      title: "Summit Executive",
      blurb: "Refined executive style with prominent experience blocks",
      thumb: "linear-gradient(135deg,#2d2f42 0%,#49506d 34%,#eceff6 34%,#ffffff 100%)",
    },
    {
      id: "metro-clean",
      title: "Metro Clean",
      blurb: "Urban compact profile with quick-scan section headers",
      thumb: "linear-gradient(135deg,#3f4a55 0%,#5e6975 34%,#edf0f4 34%,#ffffff 100%)",
    },
    {
      id: "mono-ink",
      title: "Mono Ink",
      blurb: "Monochrome-first clean structure for conservative hiring teams",
      thumb: "linear-gradient(135deg,#1e252f 0%,#36414f 34%,#eceff3 34%,#ffffff 100%)",
    },
    {
      id: "harbor-tech",
      title: "Harbor Tech",
      blurb: "Developer-focused layout with strong project and skills framing",
      thumb: "linear-gradient(135deg,#0f2f47 0%,#1f4f73 34%,#e6f3fb 34%,#ffffff 100%)",
    },
    {
      id: "horizon-compact",
      title: "Horizon Compact",
      blurb: "Compact block layout optimized for one-page resumes",
      thumb: "linear-gradient(135deg,#29465e 0%,#406888 34%,#e9f2fa 34%,#ffffff 100%)",
    },
    {
      id: "cascade-pro",
      title: "Cascade Pro",
      blurb: "Flowing timeline resume for visible role progression",
      thumb: "linear-gradient(135deg,#274063 0%,#3f5f88 34%,#ebf1fa 34%,#ffffff 100%)",
    },
    {
      id: "nova-sidebar",
      title: "Nova Sidebar",
      blurb: "High-contrast sidebar layout with fast recruiter scanning",
      thumb: "linear-gradient(135deg,#1a3557 0%,#2e5785 34%,#e8f0fa 34%,#ffffff 100%)",
    },
    {
      id: "studio-lite",
      title: "Studio Lite",
      blurb: "Soft editorial-meets-minimal design for balanced readability",
      thumb: "linear-gradient(135deg,#456962 0%,#5f8c83 34%,#edf7f4 34%,#ffffff 100%)",
    },
    {
      id: "pine-editorial",
      title: "Pine Editorial",
      blurb: "Editorial storytelling layout tuned for product and design roles",
      thumb: "linear-gradient(135deg,#26443a 0%,#3f6758 34%,#ebf4ef 34%,#ffffff 100%)",
    },
  ];
  const templateOptions = templateCatalog.map(({ id, title, blurb }) => ({
    id,
    title,
    blurb,
  }));
  const templateThumbs = templateCatalog.reduce((acc, { id, thumb }) => {
    acc[id] = thumb;
    return acc;
  }, {});
  const templateThumbUrls = {};
  const curatedTemplateIds = new Set(templateOptions.map((tpl) => tpl.id));
  const normalizeTemplateChoice = (templateId) =>
    curatedTemplateIds.has(templateId) ? templateId : "classic";

  const renderTemplateThumb = (tpl) => (
    <div className="flex flex-col gap-2 w-full text-left">
      <div className="template-card-preview">
        <span className="template-card-chip">{tpl.id}</span>
        {templateThumbUrls[tpl.id] ? (
          <img
            src={templateThumbUrls[tpl.id]}
            alt={`${tpl.title} preview`}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
            <div
              className="w-full h-full"
              style={{ backgroundImage: templateThumbs[tpl.id] || templateThumbs.classic, backgroundSize: "cover" }}
            />
          )}
        </div>
      <div className="template-card-body">
        <div className="template-card-title">{tpl.title}</div>
        <div className="template-card-blurb">{tpl.blurb}</div>
      </div>
    </div>
  );

  const [selectedTemplate, setSelectedTemplate] = useState("classic");
  const [accentColor, setAccentColor] = useState([80, 170, 255]);
  const [showDesigner, setShowDesigner] = useState(false);
  const [designerEditMode, setDesignerEditMode] = useState(true);
  const [chatMessages, setChatMessages] = useState([
    {
      role: "assistant",
      content:
        "Hi! I'm your resume copilot (Ollama). Ask me for bullet ideas, summaries, or tips while you edit.",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatFiles, setChatFiles] = useState([]);
  const [speakerOn, setSpeakerOn] = useState(false);
  const [showChatDock, setShowChatDock] = useState(true);
  const [chatOnly, setChatOnly] = useState(false);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const voiceRetryRef = useRef(0);
  const updateResumeField = (path, value) => {
    setData((prev) => {
      const next =
        typeof structuredClone === "function"
          ? structuredClone(prev)
          : JSON.parse(JSON.stringify(prev));
      const parts = path.replace(/\[(\d+)\]/g, ".$1").split(".");
      let cursor = next;
      for (let i = 0; i < parts.length - 1; i += 1) {
        const key = parts[i];
        if (cursor[key] == null) {
          const nextKey = parts[i + 1];
          cursor[key] = /^[0-9]+$/.test(nextKey) ? [] : {};
        }
        cursor = cursor[key];
      }
      cursor[parts[parts.length - 1]] = value;
      return next;
    });
    try {
      setValue(path, value, { shouldDirty: true });
    } catch (err) {
      // ignore setValue errors for non-form fields
    }
  };
  const manualEntryFactory = {
    skills: () => ({ title: "New Skill", level: "" }),
    experience: () => ({
      jobTitle: "New Role",
      company: "Company Name",
      location: "",
      duration: "",
      responsibility: "Describe your impact and outcomes here.",
    }),
    education: () => ({
      degree: "Degree",
      university: "University Name",
      location: "",
      graduationYear: "",
    }),
    projects: () => ({
      title: "New Project",
      description: "Describe what you built and the results.",
      technologiesUsed: [],
      githubLink: "",
    }),
    certifications: () => ({
      title: "Certification",
      issuingOrganization: "Issuing Organization",
      year: "",
    }),
    languages: () => ({ name: "Language" }),
    interests: () => ({ name: "Interest" }),
    achievements: () => ({ title: "Achievement", year: "", extraInformation: "" }),
  };
  const manualSectionLabel = {
    skills: "Skill",
    experience: "Experience",
    education: "Education",
    projects: "Project",
    certifications: "Certification",
    languages: "Language",
    interests: "Interest",
    achievements: "Achievement",
  };
  const prependBySection = {
    skills: skillsFields.prepend,
    experience: experienceFields.prepend,
    education: educationFields.prepend,
    projects: projectsFields.prepend,
    certifications: certificationsFields.prepend,
    languages: languagesFields.prepend,
    interests: interestsFields.prepend,
  };
  const handleAddManualItem = (section) => {
    const builder = manualEntryFactory[section];
    if (!builder) return;

    const entry = builder();
    setData((prev) => ({
      ...prev,
      [section]: [entry, ...(Array.isArray(prev?.[section]) ? prev[section] : [])],
    }));

    const prepend = prependBySection[section];
    if (typeof prepend === "function") {
      prepend(entry);
    } else {
      const current = getValues(section);
      const safeCurrent = Array.isArray(current) ? current : [];
      setValue(section, [entry, ...safeCurrent], { shouldDirty: true });
    }

    toast.success(`${manualSectionLabel[section] || "Item"} added. Click in preview to edit.`);
  };
  const MAX_FILE_CHARS = 12000;

  const truncateText = (text) =>
    text.length > MAX_FILE_CHARS ? `${text.slice(0, MAX_FILE_CHARS)}\n...[truncated]` : text;

  const readPdfText = async (file) => {
    const data = await file.arrayBuffer();
    const pdf = await getDocument({ data }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
      fullText += `${pageText}\n`;
      if (fullText.length > MAX_FILE_CHARS) break;
    }
    return truncateText(fullText.trim());
  };

  const readFileText = async (file) => {
    const nameLower = file.name.toLowerCase();
    if (file.type === "application/pdf" || nameLower.endsWith(".pdf")) {
      return readPdfText(file);
    }
    if (file.type.startsWith("text/") || nameLower.endsWith(".txt") || nameLower.endsWith(".md")) {
      const text = await file.text();
      return truncateText(text.trim());
    }
    return null;
  };

  const generatePdfFromData = (resumeData, template = "classic", accentOverride) => {
    const doc = new jsPDF();

    const renderSleek = () => {
      const bg = [25, 25, 31];
      const text = [230, 230, 235];
      const accent = accentOverride || [80, 170, 255];
      const sub = [180, 190, 200];

      doc.setFillColor(...bg);
      doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), "F");
      doc.setTextColor(...text);

      let y = 18;
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;

      const addLine = (txt, size = 11, color = text, gap = 6) => {
        doc.setFontSize(size);
        doc.setTextColor(...color);
        const lines = doc.splitTextToSize(txt, pageWidth - margin * 2);
        lines.forEach((line) => {
          if (y > 280) {
            doc.addPage();
            doc.setFillColor(...bg);
            doc.rect(0, 0, doc.internal.pageSize.getWidth(), doc.internal.pageSize.getHeight(), "F");
            y = 18;
          }
          doc.text(line, margin, y);
          y += gap;
        });
      };

      const addSection = (title) => {
        addLine(title.toUpperCase(), 12, accent, 6);
      };

      addLine(resumeData.personalInformation.fullName || "NAME", 20, text, 8);
      const contacts = [
        resumeData.personalInformation.email,
        resumeData.personalInformation.phoneNumber,
        resumeData.personalInformation.location,
        resumeData.personalInformation.linkedin,
        resumeData.personalInformation.gitHub,
      ]
        .filter(Boolean)
        .join("   |   ");
      if (contacts) addLine(contacts, 9, sub, 10);

      if (resumeData.summary) {
        addSection("Summary");
        addLine(resumeData.summary, 11, text, 8);
      }

      if (resumeData.education?.length) {
        addSection("Education");
        resumeData.education.forEach((edu) => {
          addLine(`${edu.degree || ""} - ${edu.university || ""}`, 11, text, 6);
          addLine(`${edu.location || ""} | ${edu.graduationYear || ""}`, 9, sub, 10);
        });
      }

      if (resumeData.skills?.length) {
        addSection("Skills");
        resumeData.skills.forEach((skill) =>
          addLine(`- ${skill.title || ""} ${skill.level ? `(${skill.level})` : ""}`, 11, text, 6)
        );
      }

      if (resumeData.experience?.length) {
        addSection("Work Experience");
        resumeData.experience.forEach((exp) => {
          addLine(`${exp.jobTitle || ""} - ${exp.company || ""}`, 11, text, 6);
          addLine(`${exp.location || ""} | ${exp.duration || ""}`, 9, sub, 6);
          if (exp.responsibility) addLine(exp.responsibility, 10, text, 8);
        });
      }

      if (resumeData.projects?.length) {
        addSection("Projects");
        resumeData.projects.forEach((proj) => {
          addLine(proj.title || "", 11, text, 6);
          if (proj.description) addLine(proj.description, 10, sub, 6);
          if (proj.technologiesUsed?.length)
            addLine(`Tech: ${proj.technologiesUsed.join(", ")}`, 9, sub, 8);
        });
      }

      if (resumeData.certifications?.length) {
        addSection("Awards & Certifications");
        resumeData.certifications.forEach((cert) =>
          addLine(
            `- ${cert.title || ""} - ${cert.issuingOrganization || ""} ${cert.year ? `(${cert.year})` : ""}`,
            11,
            text,
            6
          )
        );
      }

      const extras = [];
      if (resumeData.languages?.length) {
        extras.push(`Languages: ${resumeData.languages.map((l) => l.name).join(", ")}`);
      }
      if (resumeData.interests?.length) {
        extras.push(`Interests: ${resumeData.interests.map((i) => i.name).join(", ")}`);
      }
      if (extras.length) {
        addSection("Extras");
        extras.forEach((txt) => addLine(txt, 10, sub, 6));
      }
    };

    const renderStandard = () => {
      let y = 12;
      const presets = {
        classic: { headingSize: 14, bodySize: 11, accent: 0 },
        modern: { headingSize: 16, bodySize: 11, accent: accentOverride ?? 180 },
        minimal: { headingSize: 12, bodySize: 10, accent: accentOverride ?? 120 },
      };
      const style = presets[template] || presets.classic;

      const addLine = (text, fontSize = style.bodySize, gap = 6) => {
        doc.setFontSize(fontSize);
        const lines = doc.splitTextToSize(text, 190);
        lines.forEach((line) => {
          if (y > 280) {
            doc.addPage();
            y = 12;
          }
          doc.text(line, 10, y);
          y += gap;
        });
      };

      const addSection = (title) => {
        y += 4;
        if (Array.isArray(style.accent)) {
          doc.setTextColor(...style.accent);
        } else {
          doc.setTextColor(style.accent, style.accent, style.accent);
        }
        addLine(title, style.headingSize, 7);
        doc.setTextColor(0, 0, 0);
      };

      addLine(resumeData.personalInformation.fullName || "Resume", 18, 10);
      addLine(
        [
          resumeData.personalInformation.email,
          resumeData.personalInformation.phoneNumber,
          resumeData.personalInformation.location,
        ]
          .filter(Boolean)
          .join(" | ")
      );
      addLine(
        [
          resumeData.personalInformation.linkedin,
          resumeData.personalInformation.gitHub,
          resumeData.personalInformation.portfolio,
        ]
          .filter(Boolean)
          .join(" | ")
      );

      if (resumeData.summary) {
        addSection("Summary");
        addLine(resumeData.summary);
      }

      if (resumeData.skills?.length) {
        addSection("Skills");
        resumeData.skills.forEach((skill) =>
          addLine(`- ${skill.title || ""} ${skill.level ? `(${skill.level})` : ""}`)
        );
      }

      if (resumeData.experience?.length) {
        addSection("Experience");
        resumeData.experience.forEach((exp) => {
          addLine(`${exp.jobTitle || ""} - ${exp.company || ""}`);
          addLine(`${exp.location || ""} | ${exp.duration || ""}`, 10);
          addLine(exp.responsibility || "", 10);
        });
      }

      if (resumeData.education?.length) {
        addSection("Education");
        resumeData.education.forEach((edu) => {
          addLine(`${edu.degree || ""} - ${edu.university || ""}`);
          addLine(`${edu.location || ""} | ${edu.graduationYear || ""}`, 10);
        });
      }

      if (resumeData.certifications?.length) {
        addSection("Certifications");
        resumeData.certifications.forEach((cert) =>
          addLine(`- ${cert.title || ""} - ${cert.issuingOrganization || ""} (${cert.year || ""})`)
        );
      }

      if (resumeData.projects?.length) {
        addSection("Projects");
        resumeData.projects.forEach((proj) => {
          addLine(`${proj.title || ""}`);
          if (proj.description) addLine(proj.description, 10);
          if (proj.technologiesUsed?.length) {
            addLine(`Tech: ${proj.technologiesUsed.join(", ")}`, 10);
          }
          if (proj.githubLink) addLine(`GitHub: ${proj.githubLink}`, 10);
        });
      }

      if (resumeData.achievements?.length) {
        addSection("Achievements");
        resumeData.achievements.forEach((ach) =>
          addLine(`- ${ach.title || ""} (${ach.year || ""}) ${ach.extraInformation || ""}`)
        );
      }

      if (resumeData.languages?.length) {
        addSection("Languages");
        resumeData.languages.forEach((lang) => addLine(`- ${lang.name || ""}`));
      }

      if (resumeData.interests?.length) {
        addSection("Interests");
        resumeData.interests.forEach((intr) => addLine(`- ${intr.name || ""}`));
      }
    };

    if (template === "sleek") {
      renderSleek();
    } else {
      renderStandard();
    }

    const fileName =
      resumeData.personalInformation.fullName?.trim() || "resume";
    doc.save(`${fileName.replace(/\s+/g, "_")}_${template}.pdf`);
  };

  const validateResumePayload = (resumeData) => {
    const issues = [];
    const info = resumeData?.personalInformation || {};
    const hasContactMethod = [info.email, info.phoneNumber, info.linkedin, info.gitHub, info.portfolio]
      .some((value) => (value || "").toString().trim());

    if (!info.fullName?.trim()) {
      issues.push("Add the candidate full name.");
    }
    if (!hasContactMethod) {
      issues.push("Add at least one contact method such as email, phone, LinkedIn, GitHub, or portfolio.");
    }
    if (!resumeData.summary?.trim() || resumeData.summary.trim().length < 30) {
      issues.push("Write a stronger summary with at least 30 characters.");
    }
    if ((resumeData.skills || []).filter((skill) => skill?.title?.trim()).length < 2) {
      issues.push("Add at least 2 skills so the resume has a stronger keyword base.");
    }
    const hasProofSection =
      (resumeData.experience || []).some((item) => item?.jobTitle?.trim() || item?.company?.trim()) ||
      (resumeData.projects || []).some((item) => item?.title?.trim()) ||
      (resumeData.education || []).some((item) => item?.degree?.trim() || item?.university?.trim());
    if (!hasProofSection) {
      issues.push("Add at least one experience, project, or education entry before choosing a template.");
    }

    return issues;
  };

  //handle form submit
  const onSubmit = (formData) => {
    const normalized = normalizeData(formData);
    const issues = validateResumePayload(normalized);
    if (issues.length) {
      setFormIssues(issues);
      setBuilderAlert({
        kind: "warning",
        title: "Resume needs a few essentials first",
        message: "Fix the highlighted gaps below, then choose a template.",
      });
      toast.error(issues[0]);
      return;
    }

    setFormIssues([]);
    setBuilderAlert(null);
    setData(normalized);
    reset(normalized);
    setShowTemplateChooser(true);
    // hide the form while picking a template
    setShowFormUI(false);
    setShowPromptInput(false);
    setShowResumeUI(false);
  };

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplate(normalizeTemplateChoice(templateId));
    setDesignerEditMode(true);
    setShowDesigner(true);
    setShowTemplateChooser(false);
    setShowFormUI(false);
    setShowPromptInput(false);
    setShowResumeUI(false);
  };

  const [description, setDescription] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const lastAutoDesc = useRef("");

  const fetchJobInsights = async (resumePayload = data, jobText = jobDescription, { silent = false } = {}) => {
    if (jobText.trim().length < 20 || !hasResumeContent(resumePayload)) {
      setJobInsights(null);
      setJobInsightsError("");
      setJobInsightsLoading(false);
      return;
    }

    try {
      setJobInsightsLoading(true);
      setJobInsightsError("");
      const response = await analyzeResumeJobMatch(jobText.trim(), resumePayload);
      if (response?.error) {
        throw new Error(response.error);
      }
      setJobInsights(response);
    } catch (error) {
      const message =
        error?.response?.data?.error ||
        error?.message ||
        "Could not analyze this resume against the job description.";
      setJobInsightsError(message);
      if (!silent) {
        toast.error(message);
      }
    } finally {
      setJobInsightsLoading(false);
    }
  };

  const buildImprovedBullet = (sourceText, section, title = "", insightsPayload = jobInsights) => {
    const cleaned = (sourceText || "").trim().replace(/\s+/g, " ");
    if (!cleaned) return "";

    const lower = cleaned.toLowerCase();
    const preferredVerb = section === "project" ? "Built" : "Delivered";
    const hasStrongVerb = /^(built|led|created|designed|developed|implemented|managed|delivered|optimized|launched)\b/i.test(
      cleaned
    );
    const missingKeywords = (insightsPayload?.missingKeywords || []).filter(
      (keyword) => !lower.includes(keyword.toLowerCase())
    );
    const keywordPhrase = missingKeywords.slice(0, 2).join(" and ");
    const hasMetric = /(\$\s?\d|\b\d+(?:\.\d+)?%|\b\d+\+\b)/.test(cleaned);

    let rewritten = hasStrongVerb ? cleaned : `${preferredVerb} ${cleaned.charAt(0).toLowerCase()}${cleaned.slice(1)}`;
    if (keywordPhrase) {
      rewritten += ` with emphasis on ${keywordPhrase}`;
    }
    if (!hasMetric) {
      rewritten += " to improve delivery quality, speed, or business impact";
    }
    if (!/[.!?]$/.test(rewritten)) {
      rewritten += ".";
    }
    return rewritten;
  };

  const handleImproveBullet = async ({ section, path, titlePath }) => {
    const currentText = (getValues(path) || "").trim();
    const title = (getValues(titlePath) || "").trim();
    if (!currentText) {
      toast.error("Add some text first, then use Improve bullet.");
      return;
    }

    setImprovingBulletPath(path);
    try {
      const currentResume = normalizeData(getValues());
      let latestInsights = jobInsights;

      if (jobDescription.trim().length >= 20) {
        latestInsights = await analyzeResumeJobMatch(jobDescription.trim(), currentResume);
        if (latestInsights?.error) {
          throw new Error(latestInsights.error);
        }
        setJobInsights(latestInsights);
        setJobInsightsError("");
      }

      const suggestionFromInsights = (latestInsights?.rewriteSuggestions || []).find((item) => {
        const sameSection = item.section?.toLowerCase() === (section === "projects" ? "project" : "experience");
        const sameTitle = title ? item.title?.toLowerCase() === title.toLowerCase() : true;
        return sameSection && sameTitle;
      });

      const rewritten =
        suggestionFromInsights?.suggestion ||
        buildImprovedBullet(currentText, section === "projects" ? "project" : "experience", title, latestInsights);

      updateResumeField(path, rewritten);
      toast.success("Bullet improved. Review it and adjust if needed.");
    } catch (error) {
      const fallback = buildImprovedBullet(currentText, section === "projects" ? "project" : "experience", title);
      updateResumeField(path, fallback);
      toast.success("Bullet improved with local rewrite guidance.");
    } finally {
      setImprovingBulletPath("");
    }
  };

  const buildRolePrompt = (text) => {
    const trimmed = (text || "").trim();
    if (!trimmed) return trimmed;
    const lower = trimmed.toLowerCase();
    if (trimmed.length > 120) return trimmed;

    if (lower.includes("java developer") || lower.includes("java engineer")) {
      return `${trimmed}\n\nTarget role: Java Developer. Emphasize Java, Spring Boot, Hibernate, REST APIs, SQL, Git, Maven/Gradle, testing (JUnit). Add 2 projects and 2 experiences with measurable impact.`;
    }

    return trimmed;
  };

  const extractNameFromDescription = (text = "") => {
    const match = text.match(
      /\b(i am|i'm|my name is|name is)\s+([A-Za-z][A-Za-z\s]{1,40}?)(?=,|\.|and\b|phone\b|mobile\b|email\b|linkedin\b|github\b|portfolio\b|$)/i
    );
    if (match) {
      return match[2].trim().replace(/\s+/g, " ");
    }
    return null;
  };

  const extractFieldsFromDescription = (text = "") => {
    const cleaned = (text || "").replace(/\r/g, "");
    const fields = {};

    const emailLabelMatch = cleaned.match(/\bemail\s*(is|:)?\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);
    const emailMatch = emailLabelMatch || cleaned.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    if (emailMatch) fields.email = emailMatch[0];

    const phoneLabelMatch = cleaned.match(
      /\b(phone|mobile)\s*(number)?\s*(is|:)?\s*(\+?\d[\d\s().-]{7,}\d)/i
    );
    const phoneMatch = phoneLabelMatch || cleaned.match(/(\+?\d[\d\s().-]{7,}\d)/);
    if (phoneMatch) {
      const raw = phoneLabelMatch ? phoneLabelMatch[4] : phoneMatch[1];
      fields.phoneNumber = raw.trim();
    }

    const pickUrl = (label) => {
      const re = new RegExp(`${label}\\s*[:\\-]?\\s*(https?:\\/\\/[^\\s]+)`, "i");
      const m = cleaned.match(re);
      return m ? m[1] : null;
    };
    const pickHandle = (label) => {
      const re = new RegExp(`${label}\\s*[:\\-]?\\s*([A-Za-z0-9_.-]{2,})`, "i");
      const m = cleaned.match(re);
      return m ? m[1] : null;
    };

    const linkedInUrl = pickUrl("linkedin");
    if (linkedInUrl) fields.linkedin = linkedInUrl;
    else {
      const liHandle = pickHandle("linkedin");
      if (liHandle) fields.linkedin = `https://www.linkedin.com/in/${liHandle}`;
    }

    const gitHubUrl = pickUrl("github");
    if (gitHubUrl) fields.gitHub = gitHubUrl;
    else {
      const ghHandle = pickHandle("github");
      if (ghHandle) fields.gitHub = `https://github.com/${ghHandle}`;
    }

    const portfolioUrl = pickUrl("portfolio") || pickUrl("website") || pickUrl("site");
    if (portfolioUrl) fields.portfolio = portfolioUrl;

    const locationMatch =
      cleaned.match(/\b(location|based in|i live in)\s*[:\-]?\s*([A-Za-z][A-Za-z\s,.-]{2,60})/i);
    if (locationMatch) fields.location = locationMatch[2].trim().replace(/\s+/g, " ");

    return fields;
  };

  const parseUploadedResume = (text = "") => {
    const cleaned = (text || "").replace(/\r/g, "");
    const lines = cleaned.split("\n").map((l) => l.trim()).filter(Boolean);
    const emailRe = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
    const phoneRe = /(\+?\d[\d\s().-]{7,}\d)/;
    const urlRe = /https?:\/\/\S+/i;
    const sectionHeads = [
      "summary",
      "experience",
      "education",
      "skills",
      "projects",
      "certifications",
      "achievements",
      "languages",
      "interests",
      "profile",
      "objective",
    ];

    let fullName = null;
    const skills = [];
    const fields = {};

    const headerLines = lines.slice(0, 5);
    headerLines.forEach((line) => {
      const tokens = line.split(/[\|•·]/).map((t) => t.trim()).filter(Boolean);
      tokens.forEach((token) => {
        if (!fields.email && emailRe.test(token)) {
          fields.email = token.match(emailRe)?.[0];
        }
        if (!fields.phoneNumber && phoneRe.test(token)) {
          fields.phoneNumber = token.match(phoneRe)?.[1]?.trim() || token;
        }
        if (!fields.linkedin && /linkedin/i.test(token)) {
          const url = token.match(urlRe)?.[0];
          fields.linkedin = url || `https://www.linkedin.com/in/${token.replace(/linkedin\s*[:\-]?/i, "").trim()}`;
        }
        if (!fields.gitHub && /github/i.test(token)) {
          const url = token.match(urlRe)?.[0];
          fields.gitHub = url || `https://github.com/${token.replace(/github\s*[:\-]?/i, "").trim()}`;
        }
        if (!fields.portfolio && /(portfolio|website|site)/i.test(token)) {
          const url = token.match(urlRe)?.[0];
          if (url) fields.portfolio = url;
        }
        if (!fields.location) {
          const isLocationToken =
            !emailRe.test(token) &&
            !phoneRe.test(token) &&
            !urlRe.test(token) &&
            /[A-Za-z]/.test(token) &&
            token.length <= 40;
          if (isLocationToken && /,|india|usa|uk|canada|pune|mumbai|delhi|new york/i.test(token)) {
            fields.location = token;
          }
        }
      });
    });

    if (lines.length) {
      const first = lines[0];
      const looksLikeName =
        !emailRe.test(first) && !phoneRe.test(first) && !urlRe.test(first) && /^[A-Za-z\s'.-]{3,60}$/.test(first);
      if (looksLikeName) fullName = first;
    }

    const scrubSummary = (value) => {
      let cleanedSummary = value || "";
      cleanedSummary = cleanedSummary.replace(emailRe, " ");
      cleanedSummary = cleanedSummary.replace(phoneRe, " ");
      cleanedSummary = cleanedSummary.replace(urlRe, " ");
      cleanedSummary = cleanedSummary.replace(/\s*\|\s*/g, " ");
      cleanedSummary = cleanedSummary.replace(/\s{2,}/g, " ").trim();
      return cleanedSummary;
    };

    let summary = "";
    const skillsIdx = lines.findIndex((l) => /^skills?\b/i.test(l));
    const summaryIdx = lines.findIndex((l) => /^summary\b/i.test(l));
    if (summaryIdx !== -1) {
      const collected = [];
      for (let i = summaryIdx + 1; i < lines.length; i += 1) {
        const lower = lines[i].toLowerCase();
        if (sectionHeads.some((h) => lower.startsWith(h))) break;
        collected.push(lines[i]);
      }
      summary = collected.join(" ");
    } else {
      const nonHeader = lines.filter(
        (l, idx) => idx > 0 && !(emailRe.test(l) || phoneRe.test(l) || urlRe.test(l))
      );
      summary = nonHeader.slice(0, 6).join(" ");
    }

    summary = summary.replace(/^summary\s*[:\-]?\s*/i, "").trim();
    if (summary) {
      const summaryLines = summary
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l && !(emailRe.test(l) || phoneRe.test(l) || urlRe.test(l)));
      summary = scrubSummary(summaryLines.join(" "));
    }

    if (skillsIdx !== -1) {
      const collected = [];
      for (let i = skillsIdx; i < lines.length; i += 1) {
        if (i !== skillsIdx) {
          const lowerLine = lines[i].toLowerCase();
          if (sectionHeads.some((h) => lowerLine.startsWith(h))) break;
        }
        const line = lines[i].replace(/^skills?\s*[:\-]?\s*/i, "").trim();
        if (!line) continue;
        collected.push(line);
      }
      const tokens = collected
        .join(",")
        .split(/[,|•·]/)
        .map((t) => t.replace(/^[-*]\s*/, "").trim())
        .filter(Boolean);
      tokens.forEach((t) => {
        if (t.length > 1 && t.length <= 40 && !skills.includes(t)) skills.push(t);
      });
    }

    return { fullName, fields, summary, skills };
  };

  const normalizeToken = (value = "") => value.replace(/\s+/g, " ").trim();

  const extractSkillSuggestions = (text = "") => {
    const source = text.toLowerCase();
    const catalog = [
      ["Java", ["java"]],
      ["Spring Boot", ["spring boot"]],
      ["Hibernate", ["hibernate"]],
      ["MySQL", ["mysql"]],
      ["React", ["react", "reactjs", "react.js"]],
      ["REST API", ["rest api", "restful api", "restful web applications"]],
      ["CRUD Operations", ["crud"]],
      ["API Development", ["api development"]],
      ["Backend Architecture", ["backend architecture"]],
      ["Database Integration", ["database integration"]],
      ["Console Applications", ["console-based"]],
    ];

    return catalog
      .filter(([, patterns]) => patterns.some((pattern) => source.includes(pattern)))
      .map(([label]) => ({ title: label, level: "" }));
  };

  const extractProjectSuggestions = (text = "") => {
    const source = normalizeToken(text.replace(/\r/g, " "));
    const matches = [
      ...source.matchAll(
        /\b(?:including|such as|projects including|built|developed)\s+([A-Z][A-Za-z0-9\s&/-]+?)(?=,|\sand\s|\.|$)/g
      ),
    ];

    const rawNames = matches.flatMap((match) =>
      match[1]
        .split(/\sand\s|,/)
        .map((item) => normalizeToken(item))
        .filter(Boolean)
    );

    const uniqueNames = [...new Set(rawNames)].filter(
      (name) =>
        name.length >= 6 &&
        !/^(restful|spring boot|hibernate|mysql|react|java full stack developer)$/i.test(name)
    );

    return uniqueNames.slice(0, 3).map((name) => ({
      title: name,
      description: `Built ${name.toLowerCase()} with a focus on full-stack workflows, API integration, and reliable CRUD operations.`,
      technologiesUsed: extractSkillSuggestions(text)
        .map((skill) => skill.title)
        .filter((skill) =>
          ["Java", "Spring Boot", "Hibernate", "MySQL", "React", "REST API"].includes(skill)
        ),
      githubLink: "",
    }));
  };

  const extractCertificationSuggestions = (text = "") => {
    const lines = text
      .split(/\n|•|,/)
      .map((line) => normalizeToken(line))
      .filter(Boolean);

    return lines
      .filter((line) => /\b(certified|certification|certificate)\b/i.test(line))
      .slice(0, 4)
      .map((line) => ({
        title: line,
        issuingOrganization: "",
        year: "",
      }));
  };

  const extractInterestSuggestions = (text = "") => {
    const source = text.toLowerCase();
    const suggestions = [
      source.includes("backend") ? "Backend Engineering" : null,
      source.includes("api") ? "API Design" : null,
      source.includes("react") ? "Frontend Development" : null,
      source.includes("database") ? "Database Design" : null,
    ].filter(Boolean);

    return [...new Set(suggestions)].slice(0, 4).map((name) => ({ name }));
  };

  const enrichGeneratedResume = (resumeData = {}, sourceText = "") => {
    const personalInformation = {
      ...(resumeData.personalInformation || {}),
    };
    const roleMatch = normalizeToken(sourceText).match(/^([A-Za-z][A-Za-z\s/+.-]{3,60}?)\s+with\b/i);
    if (!personalInformation.summaryTitle && roleMatch) {
      personalInformation.summaryTitle = roleMatch[1];
    }

    const skills =
      Array.isArray(resumeData.skills) && resumeData.skills.length > 0
        ? resumeData.skills
        : extractSkillSuggestions(sourceText);

    const projects =
      Array.isArray(resumeData.projects) && resumeData.projects.some((item) => item?.title || item?.description)
        ? resumeData.projects
        : extractProjectSuggestions(sourceText);

    const certifications =
      Array.isArray(resumeData.certifications) && resumeData.certifications.some((item) => item?.title)
        ? resumeData.certifications
        : extractCertificationSuggestions(sourceText);

    const interests =
      Array.isArray(resumeData.interests) && resumeData.interests.some((item) => item?.name)
        ? resumeData.interests
        : extractInterestSuggestions(sourceText);

    return {
      ...resumeData,
      personalInformation,
      summary: resumeData.summary?.trim() || sourceText.trim(),
      skills,
      projects,
      certifications,
      interests,
    };
  };

  const handleGenerate = async (isAuto = false) => {
    const effectiveDescription = buildRolePrompt(description);
    const inputSummary = description.trim();
    const maybeName = extractNameFromDescription(description);
    const extracted = extractFieldsFromDescription(description);
    if (inputSummary.length < MIN_DESCRIPTION_LENGTH) {
      const message = `Add a little more detail before generating. ${MIN_DESCRIPTION_LENGTH - inputSummary.length} more characters is enough.`;
      setBuilderAlert({
        kind: "warning",
        title: "Description is too short",
        message,
      });
      toast.error(message);
      return;
    }

    try {
      setLoading(true);
      setBuilderAlert(null);
      const responseData = await generateResume(
        effectiveDescription,
        jobDescription.trim()
      );

      if (responseData && responseData.error) {
        // Show richer error information when the API client returned a structured error
        const urlPart = responseData.url ? `\nURL: ${responseData.url}` : "";
        const detailsPart = responseData.details ? `\nDetails: ${JSON.stringify(responseData.details)}` : "";
        toast.error(`${responseData.error}${urlPart}`);
        console.error("Generate resume API error:", responseData, detailsPart);
        return;
      }

      const generatedData =
        responseData && typeof responseData === "object" && responseData.data && typeof responseData.data === "object"
          ? responseData.data
          : responseData;

      if (!generatedData || typeof generatedData !== "object") {
        toast.error("Invalid response from server. No data received.");
        return;
      }

      const enrichedData = enrichGeneratedResume(generatedData, inputSummary);
      const normalized = normalizeData({
        ...enrichedData,
        ...(inputSummary && !enrichedData.summary ? { summary: inputSummary } : {}),
        personalInformation: {
          ...(enrichedData.personalInformation || {}),
          ...(maybeName ? { fullName: maybeName } : {}),
          ...extracted,
        },
      });
      reset(normalized);
      setData((prev) => ({ ...normalized, rating: prev.rating }));
      if (inputSummary) {
        setValue("summary", inputSummary);
      }
      if (maybeName) {
        setValue("personalInformation.fullName", maybeName);
      }
      Object.entries(extracted).forEach(([key, value]) => {
        setValue(`personalInformation.${key}`, value);
      });
      setFormIssues([]);
      if (responseData.warning) {
        setBuilderAlert({
          kind: "warning",
          title: "AI fallback mode was used",
          message: `${responseData.warning} Review the content carefully before downloading.`,
        });
      } else {
        setBuilderAlert({
          kind: "success",
          title: "Resume draft ready",
          message: "Review the generated content, refine the details, and then choose a template.",
        });
      }

      toast.success(isAuto ? "Auto-generated resume from your description" : "Resume Generated Successfully!", {
        duration: 3000,
        position: "top-center",
      });
      setShowFormUI(true);
      setShowPromptInput(false);
      setShowResumeUI(false);
      setShowTemplateChooser(false);
      setShowDesigner(false);
    } catch (error) {
      console.log("Error:", error);
      const errorMessage = error.response?.data?.error || error.message || "Error Generating Resume!";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      if (!isAuto) {
        setDescription("");
      }
    }
  };

  const autoGenerateEnabled = false;
  // Auto-generate when user finishes typing a short description (disabled by default).
  useEffect(() => {
    if (!autoGenerateEnabled) return;
    if (!description || description.trim().length < 12 || loading) return;
    if (description.trim() === lastAutoDesc.current) return;

    const timer = setTimeout(() => {
      lastAutoDesc.current = description.trim();
      handleGenerate(true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [description, loading, autoGenerateEnabled]);

  const handleClear = () => {
    setDescription("");
    setJobDescription("");
    setBuilderAlert(null);
    setJobInsights(null);
    setJobInsightsError("");
  };

  const saveDownloadedResume = async ({ fileName, resumeData, template, accent }) => {
    const result = await saveResumeToCurrentProfile({
      fileName,
      resumeData,
      template,
      accent,
    });

    if (result.ok) {
      toast.success("Resume downloaded and saved to your profile.");
      return;
    }

    if (getCurrentSession()) {
      toast.error(result.message || "Could not save resume to profile.");
    } else {
      toast("PDF downloaded. Login to save it in your profile.", {
        icon: "ℹ️",
      });
    }
  };

  const handleDownloadPreviewPdf = async () => {
    if (!getCurrentSession()) {
      window.location.assign("/login");
      return;
    }

    const node = document.getElementById("resume-preview");
    if (!node) {
      toast.error("Open a preview first");
      return;
    }
    try {
      const dataUrl = await toPng(node, { quality: 1, pixelRatio: 2 });
      const pdf = new jsPDF("p", "mm", "a4");
      const imgProps = pdf.getImageProperties(dataUrl);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      pdf.addImage(dataUrl, "PNG", 0, 0, pdfWidth, pdfHeight);
      const fileName =
        (data.personalInformation.fullName || "resume").replace(/\s+/g, "_") + "_template.pdf";
      pdf.save(fileName);
      await saveDownloadedResume({
        fileName,
        resumeData: data,
        template: selectedTemplate,
        accent: accentColor,
      });
    } catch (error) {
      console.error("Download preview failed", error);
      toast.error("Download failed. Try again after opening the preview.");
    }
  };

  const ollamaHost =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_OLLAMA_HOST) ||
    "http://localhost:11434";
  const ollamaModel =
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_OLLAMA_MODEL) ||
    "llama3.1";
  const ollamaChatUrl = `${ollamaHost.replace(/\/$/, "")}/api/chat`;

  const summarizeDataForModel = useMemo(() => {
    const parts = [];
    const pi = data?.personalInformation || {};
    if (pi.fullName || pi.location) {
      parts.push(`Person: ${pi.fullName || "Name TBD"} (${pi.location || "location?"})`);
    }
    if (data?.skills?.length) {
      parts.push(`Skills: ${data.skills.map((s) => s.title).filter(Boolean).slice(0, 8).join(", ")}`);
    }
    if (data?.experience?.length) {
      const exp = data.experience[0];
      parts.push(`Latest role: ${exp.jobTitle || "Role"} at ${exp.company || "Company"}`);
    }
    if (data?.projects?.length) {
      parts.push(`Projects: ${data.projects.map((p) => p.title).filter(Boolean).slice(0, 2).join(", ")}`);
    }
    if (jobDescription.trim()) {
      parts.push(`Target role brief: ${jobDescription.trim().slice(0, 180)}`);
    }
    return parts.join(" | ");
  }, [data, jobDescription]);

  const jobMatchSummary = useMemo(() => {
    const source = jobDescription.trim().toLowerCase();
    if (source.length < 20) return null;

    const stopWords = new Set([
      "about", "after", "again", "along", "also", "and", "are", "build", "candidate",
      "company", "data", "experience", "for", "from", "have", "into", "looking",
      "must", "need", "our", "role", "team", "that", "the", "their", "this", "with",
      "will", "your", "years",
    ]);

    const rawKeywords = source.match(/[a-z][a-z0-9+#.-]{2,}/g) || [];
    const seededSkills = [
      "react", "javascript", "typescript", "java", "spring", "spring boot", "python",
      "sql", "mysql", "postgresql", "rest", "api", "microservices", "docker",
      "kubernetes", "aws", "azure", "git", "html", "css", "node", "testing",
      "junit", "agile", "leadership", "communication",
    ].filter((keyword) => source.includes(keyword));

    const keywordPool = [...new Set([...seededSkills, ...rawKeywords])]
      .filter((keyword) => keyword.length > 2 && !stopWords.has(keyword))
      .slice(0, 24);

    if (!keywordPool.length) return null;

    const resumeText = [
      data?.summary,
      ...(data?.skills || []).map((item) => `${item.title || ""} ${item.level || ""}`),
      ...(data?.experience || []).map(
        (item) => `${item.jobTitle || ""} ${item.company || ""} ${item.responsibility || ""}`
      ),
      ...(data?.projects || []).map(
        (item) => `${item.title || ""} ${item.description || ""} ${(item.technologiesUsed || []).join(" ")}`
      ),
      ...(data?.education || []).map((item) => `${item.degree || ""} ${item.university || ""}`),
    ]
      .join(" ")
      .toLowerCase();

    const matched = keywordPool.filter((keyword) => resumeText.includes(keyword));
    const missing = keywordPool.filter((keyword) => !resumeText.includes(keyword));
    const score = Math.max(25, Math.min(100, Math.round((matched.length / keywordPool.length) * 100)));
    const suggestion =
      missing.length > 0
        ? `Add or strengthen ${missing.slice(0, 4).join(", ")} in the summary, skills, or project bullets.`
        : "The resume already reflects the major keywords from this job description.";

    return {
      score,
      matched: matched.slice(0, 8),
      missing: missing.slice(0, 8),
      suggestion,
      keywordCount: keywordPool.length,
    };
  }, [data, jobDescription]);

  const skillGapInsights = useMemo(() => {
    if (!jobDescription.trim() || !jobMatchSummary) return null;
    const missing = jobMatchSummary.missing || [];
    if (!missing.length) return null;
    return missing.slice(0, 8).map((keyword) => ({
      skill: keyword,
      resource:
        skillResourceLookup[keyword.toLowerCase()] ||
        `https://www.google.com/search?q=${encodeURIComponent(keyword + " course")}`,
    }));
  }, [jobMatchSummary, jobDescription]);

  useEffect(() => {
    if (jobDescription.trim().length < 20 || !hasResumeContent(data)) {
      setJobInsights(null);
      setJobInsightsError("");
      setJobInsightsLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      fetchJobInsights(data, jobDescription, { silent: true });
    }, 700);

    return () => clearTimeout(timer);
  }, [data, jobDescription]);

  useEffect(() => {
    const navRating = location.state?.rating;
    const stored = localStorage.getItem("resumeRating");
    const storedRating = stored ? JSON.parse(stored) : null;
    const nextRating = navRating || storedRating;
    if (nextRating) {
      setData((prev) => ({ ...prev, rating: nextRating }));
    }
  }, [location.state]);

  useEffect(() => {
    const uploadedText = location.state?.uploadedResumeText;
    const uploadedResumeData = location.state?.uploadedResumeData;
    if (!uploadedText || uploadedText === lastUploadedText.current) return;
    lastUploadedText.current = uploadedText;

    if (uploadedResumeData && typeof uploadedResumeData === "object") {
      const normalizedImport = normalizeData(uploadedResumeData);
      const importSummary = normalizedImport.summary || uploadedText;

      setDescription(importSummary);
      setData((prev) => ({ ...normalizedImport, rating: prev.rating }));
      reset(normalizedImport);
      setSelectedTemplate("classic");
      setAccentColor([80, 170, 255]);
      setFormIssues([]);
      setBuilderAlert({
        kind: "success",
        title: "Uploaded resume structured",
        message: "We converted the uploaded file into editable resume sections and opened the visual preview.",
      });

      setShowFormUI(false);
      setShowPromptInput(false);
      setShowResumeUI(false);
      setShowTemplateChooser(false);
      setDesignerEditMode(true);
      setShowDesigner(true);
      return;
    }

    const parsed = parseUploadedResume(uploadedText);
    const maybeName = parsed.fullName || extractNameFromDescription(uploadedText);
    const extracted = {
      ...extractFieldsFromDescription(uploadedText),
      ...(parsed.fields || {}),
    };
    const summaryText = parsed.summary || uploadedText;
    const parsedSkills = (parsed.skills || []).map((title) => ({ title, level: "" }));
    const normalized = normalizeData({
      summary: summaryText,
      ...(parsedSkills.length ? { skills: parsedSkills } : {}),
      personalInformation: {
        ...(data.personalInformation || {}),
        ...(maybeName ? { fullName: maybeName } : {}),
        ...extracted,
      },
    });

    setDescription(summaryText);
    setData((prev) => ({ ...normalized, rating: prev.rating }));
    reset(normalized);
    setValue("summary", summaryText);
    if (parsedSkills.length) {
      setValue("skills", parsedSkills);
    }
    if (maybeName) {
      setValue("personalInformation.fullName", maybeName);
    }
    Object.entries(extracted).forEach(([key, value]) => {
      setValue(`personalInformation.${key}`, value);
    });
    setFormIssues([]);
    setBuilderAlert({
      kind: "info",
      title: "Uploaded resume imported",
      message: "We pulled readable text into the builder. Review the fields, then choose a template.",
    });

    setShowFormUI(true);
    setShowPromptInput(false);
    setShowResumeUI(false);
    setShowTemplateChooser(false);
    setShowDesigner(false);
  }, [location.state]);

  useEffect(() => {
    const savedResume = location.state?.savedResume;
    if (!savedResume) return;

    const normalized = normalizeData(savedResume);
    const nextTemplate = normalizeTemplateChoice(location.state?.template || "classic");
    const nextAccent = Array.isArray(location.state?.accent)
      ? location.state.accent
      : [80, 170, 255];

    setDescription(savedResume.summary || "");
    setData(normalized);
    reset(normalized);
    setSelectedTemplate(nextTemplate);
    setAccentColor(nextAccent);
    setFormIssues([]);
    setBuilderAlert({
      kind: "info",
      title: "Saved resume loaded",
      message: "You are editing a saved resume from your profile.",
    });
    setShowFormUI(false);
    setShowPromptInput(false);
    setShowResumeUI(false);
    setShowTemplateChooser(false);
    setDesignerEditMode(true);
    setShowDesigner(true);
  }, [location.state]);

  // Longer timeout to accommodate first-run model load on slower local setups
  const chatTimeoutMs =
    Number((typeof import.meta !== "undefined" && import.meta.env?.VITE_OLLAMA_TIMEOUT_MS) || "") ||
    30000;
  const maxHistory = 6; // keep payload small for faster local inference

  const sendChatMessage = async (evt) => {
    evt?.preventDefault();
    if (!chatInput.trim() || chatLoading) return;

    const userMessage = { role: "user", content: chatInput.trim() };
    const systemPrompt = {
      role: "system",
      content:
        "You are Resume Copilot. Reply concisely with actionable bullet points, phrasing help, and friendly guidance. Keep answers under 120 words. If file content is provided, base your answer on it. If the user asks for resume content, tailor it to the provided context.",
    };

    const recentHistory = chatMessages.slice(-maxHistory);

    let fileContextMessage = null;
    if (chatFiles.length > 0) {
      const parsed = await Promise.all(
        chatFiles.map(async (file) => {
          try {
            const text = await readFileText(file);
            return { file, text };
          } catch (err) {
            return { file, text: null };
          }
        })
      );
      const usable = parsed.filter((p) => p.text);
      const rejected = parsed.filter((p) => !p.text);
      if (rejected.length) {
        toast.error(`Unsupported or unreadable file(s): ${rejected.map((r) => r.file.name).join(", ")}`);
      }
      if (usable.length) {
        const fileBlock = usable
          .map((p) => `File: ${p.file.name}\n${p.text}`)
          .join("\n\n");
        fileContextMessage = {
          role: "system",
          content: `Uploaded resume content:\n${fileBlock}`,
        };
      }
    }

    const conversation = [
      systemPrompt,
      summarizeDataForModel ? { role: "system", content: `Current resume snapshot: ${summarizeDataForModel}` } : null,
      fileContextMessage,
      ...recentHistory,
      userMessage,
    ].filter(Boolean);

    setChatMessages((prev) => [...prev, userMessage]);
    setChatInput("");
    setChatLoading(true);
    setChatFiles([]);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), chatTimeoutMs);

    try {
      const response = await fetch(ollamaChatUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: ollamaModel,
          messages: conversation,
          stream: false,
          options: { num_predict: 180 },
          keep_alive: "5m",
        }),
        signal: controller.signal,
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || `Ollama returned ${response.status}`);
      }

      const assistantReply =
        payload?.message?.content ||
        "I'm not sure I got that. Could you try rephrasing your question?";

      setChatMessages((prev) => [...prev, { role: "assistant", content: assistantReply }]);
    } catch (error) {
      const fallback =
        error?.name === "AbortError"
          ? "Copilot timed out. Try a shorter question or wait a moment while the model warms up."
          : "I couldn't reach Ollama. Ensure ollama is running (default: http://localhost:11434) and the model is pulled.";
      // Only surface toast for non-abort errors to avoid noisy UX when user navigates away
      setChatMessages((prev) => [...prev, { role: "assistant", content: fallback }]);
      if (error?.name !== "AbortError") {
        toast.error(error?.message || "Chat request failed");
      }
    } finally {
      clearTimeout(timer);
      setChatLoading(false);
    }
  };

  const resetChat = () =>
    setChatMessages([
      {
        role: "assistant",
        content:
          "Hi! I'm your resume copilot (Ollama). Ask me for bullet ideas, summaries, or tips while you edit.",
      },
    ]);

  const startVoiceCapture = async (target = "chat") => {
    if (listening) return;
    if (typeof window === "undefined") return;
    setVoiceMode(target);
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Voice input isn't supported in this browser. Try Chrome or Edge.");
      return;
    }

    try {
      // request mic permission early to surface clearer errors
      await navigator.mediaDevices?.getUserMedia?.({ audio: true });
    } catch (err) {
      toast.error("Microphone permission denied or unavailable.");
      return;
    }

    const recognizer = new SpeechRecognition();
    recognizer.lang = "en-US";
    recognizer.interimResults = false; // use final results only to avoid duplicated text
    recognizer.continuous = false; // stop after one phrase for accuracy; user can tap again
    recognizer.maxAlternatives = 3;

    voiceRetryRef.current = 0;
    const activeTarget = target;

    recognizer.onresult = (evt) => {
      const result = evt.results?.[evt.resultIndex] || evt.results?.[evt.results.length - 1];
      const transcript = result?.[0]?.transcript?.trim();
      if (!transcript) return;
      if (!result.isFinal) return;
      voiceRetryRef.current = 0;
      if (activeTarget === "description") {
        setDescription((prev) => (prev ? `${prev} ${transcript}` : transcript));
      } else if (activeTarget === "jobDescription") {
        setJobDescription((prev) => (prev ? `${prev} ${transcript}` : transcript));
      } else {
        setChatInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };
    recognizer.onerror = (evt) => {
      const friendly =
        {
          "not-allowed": "Microphone permission denied",
          "service-not-allowed": "Mic access blocked by browser",
          network: "Network error starting speech service",
          "no-speech": "Didn't catch that. Try again closer to the mic.",
          "audio-capture": "No microphone detected",
        }[evt.error] || "Voice input error";

      // auto-retry once on no-speech
      if (evt.error === "no-speech" && voiceRetryRef.current < 1) {
        voiceRetryRef.current += 1;
        try {
          recognizer.stop();
          recognizer.start();
          return;
        } catch (err) {
          // fall through to toast
        }
      }

      toast.error(friendly);
      setListening(false);
    };
    recognizer.onend = () => {
      setListening(false);
      setVoiceMode("chat");
    };

    recognitionRef.current = recognizer;
    setListening(true);
    try {
      recognizer.start();
    } catch (err) {
      setListening(false);
      toast.error("Could not start microphone");
    }
  };

  const stopVoiceCapture = () => {
    const recognizer = recognitionRef.current;
    if (recognizer) {
      recognizer.onend = null;
      try {
        recognizer.stop();
      } catch (err) {
        // ignore stop errors
      }
    }
    voiceRetryRef.current = 0;
    setListening(false);
  };

  useEffect(() => {
    if (!speakerOn || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const lastAssistant = [...chatMessages].reverse().find((m) => m.role === "assistant");
    if (!lastAssistant?.content) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(lastAssistant.content);
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  }, [chatMessages, speakerOn]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const wantsChat = params.get("openChat") || params.get("chatOnly");
    if (wantsChat) {
      setShowChatDock(true);
      setChatOnly(Boolean(params.get("chatOnly")));
      // hide the rest when chatOnly flag is set
      if (params.get("chatOnly")) {
        setShowPromptInput(false);
        setShowFormUI(false);
        setShowResumeUI(false);
        setShowTemplateChooser(false);
        setShowDesigner(false);
      }
      // slight delay to ensure layout mounts before scrolling
      setTimeout(() => {
        const chatEl = document.getElementById("chat-dock");
        if (chatEl) chatEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("openTemplates")) {
      setShowTemplateChooser(true);
      setShowFormUI(false);
      setShowPromptInput(false);
      setShowResumeUI(false);
      setShowDesigner(false);
      setShowChatDock(false);
      setTimeout(() => {
        const chooser = document.getElementById("template-chooser");
        if (chooser) chooser.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("openJob")) {
      setShowPromptInput(true);
      setShowFormUI(false);
      setShowTemplateChooser(false);
      setShowDesigner(false);
      setShowResumeUI(false);
      setShowChatDock(true);
      setTimeout(() => {
        const prompt = document.getElementById("prompt-input");
        if (prompt) prompt.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("openAts")) {
      setShowPromptInput(true);
      setShowFormUI(false);
      setShowTemplateChooser(false);
      setShowDesigner(false);
      setShowResumeUI(false);
      setShowChatDock(true);
      setChatOnly(false);
      setTimeout(() => {
        const chatEl = document.getElementById("chat-dock") || document.getElementById("prompt-input");
        if (chatEl) chatEl.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  }, []);

  useEffect(
    () => () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          // ignore
        }
      }
    },
    []
  );

  const fieldArrays = {
    experienceFields,
    educationFields,
    certificationsFields,
    projectsFields,
    languagesFields,
    interestsFields,
    skillsFields,
  };

  const handleDescriptionChange = (val) => {
    setDescription(val);
    setValue("summary", val);
    const inferredName = extractNameFromDescription(val);
    const extracted = extractFieldsFromDescription(val);
    if (inferredName) {
      setValue("personalInformation.fullName", inferredName);
    }
    Object.entries(extracted).forEach(([key, value]) => {
      setValue(`personalInformation.${key}`, value);
    });
    setData((prev) => ({
      ...prev,
      summary: val,
      personalInformation: {
        ...(prev.personalInformation || {}),
        fullName: inferredName || prev.personalInformation?.fullName,
        ...extracted,
      },
    }));
  };

  const handleJobDescriptionChange = (val) => {
    setJobDescription(val);
    if (!val.trim()) {
      setJobInsights(null);
      setJobInsightsError("");
    }
  };

  const handleGenerateAnother = () => {
    setShowPromptInput(true);
    setShowFormUI(false);
    setShowResumeUI(false);
    setShowTemplateChooser(false);
    setShowDesigner(false);
  };

  const handleEditResume = () => {
    setShowPromptInput(false);
    setShowFormUI(true);
    setShowResumeUI(false);
    setShowTemplateChooser(false);
    setShowDesigner(false);
  };

  const handleCloseDesigner = () => {
    setShowDesigner(false);
    setShowTemplateChooser(false);
    setShowResumeUI(false);
    setShowFormUI(true);
    setShowPromptInput(false);
  };

  const layoutCols = showChatDock
    ? "grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px]"
    : "grid grid-cols-1";

  return (
    <div className="mt-5 p-6 lg:p-10 font-sans w-full">
      <div
        className={
          chatOnly
            ? "flex justify-center"
            : `${layoutCols} gap-6 items-start`
        }
      >
        {!chatOnly && (
          <div className="flex flex-col gap-3 items-center justify-start w-full">
            {(builderAlert || formIssues.length > 0) && (
              <div
                className={`status-banner w-full ${
                  builderAlert?.kind === "warning"
                    ? "status-banner-warning"
                    : builderAlert?.kind === "success"
                    ? "status-banner-success"
                    : "status-banner-info"
                }`}
              >
                <div className="status-banner-title">
                  {builderAlert?.title || "Resume checklist"}
                </div>
                <p className="status-banner-copy">
                  {builderAlert?.message || "Add the missing essentials below before moving forward."}
                </p>
                {formIssues.length > 0 && (
                  <ul className="status-banner-list">
                    {formIssues.map((issue) => (
                      <li key={issue}>{issue}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
            {jobMatchSummary && (
              <div className="status-banner status-banner-info w-full">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="status-banner-title">
                      Job match score: {jobMatchSummary.score}%
                    </div>
                    <p className="status-banner-copy">
                      Checked against {jobMatchSummary.keywordCount} keywords from the pasted job description.
                    </p>
                  </div>
                  <span className="profile-chip">
                    {jobMatchSummary.score >= 75
                      ? "Strong alignment"
                      : jobMatchSummary.score >= 55
                      ? "Partial match"
                      : "Needs tailoring"}
                  </span>
                </div>
                <p className="status-banner-copy mt-3">{jobMatchSummary.suggestion}</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {jobMatchSummary.matched.map((item) => (
                    <span key={`matched-${item}`} className="rate-tag">
                      {item}
                    </span>
                  ))}
                  {jobMatchSummary.missing.map((item) => (
                    <span key={`missing-${item}`} className="profile-chip">
                      Missing: {item}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {skillGapInsights?.length ? (
              <div className="status-banner status-banner-success w-full mt-4">
                <div className="status-banner-title">Skill gap & learning resources</div>
                <div className="status-banner-copy mt-2">
                  The job description asks for these skills that are not clearly reflected in your resume.
                </div>
                <ul className="status-banner-list mt-3">
                  {skillGapInsights.map((item) => (
                    <li key={item.skill}>
                      <strong>{item.skill}</strong> — <a href={item.resource} target="_blank" rel="noreferrer">Learning resource</a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {resumeVersions.length > 0 && (
              <div className="status-banner status-banner-info w-full mt-4">
                <div className="status-banner-title">Resume version manager</div>
                <div className="status-banner-copy mt-2">
                  Manage multiple tailored resumes for different roles and keep them ready for reuse.
                </div>
                <div className="grid gap-3 mt-3 lg:grid-cols-2">
                  {resumeVersions.map((version) => (
                    <div key={version.id} className="p-4 rounded-xl bg-slate-950/5 border border-slate-200">
                      <div className="font-semibold">{version.title}</div>
                      <div className="text-sm text-slate-500">{version.roleTag}</div>
                      <div className="text-xs text-slate-400 mt-1">Saved {new Date(version.savedAt).toLocaleString()}</div>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <button
                          type="button"
                          className="btn btn-xs btn-accent"
                          onClick={() => restoreResumeVersion(version)}
                        >
                          Restore
                        </button>
                        <button
                          type="button"
                          className="btn btn-xs btn-ghost"
                          onClick={() => deleteResumeVersion(version.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2 mt-4">
              <button type="button" className="btn btn-secondary" onClick={saveCurrentResumeVersion}>
                Save resume version
              </button>
              <button type="button" className="btn btn-primary" onClick={createResumePortfolio}>
                Generate portfolio page
              </button>
              <label className="flex items-center gap-2">
                <span className="text-sm font-medium text-slate-600">Questions</span>
                <select
                  value={interviewQuestionCount}
                  onChange={(e) => setInterviewQuestionCount(Number(e.target.value))}
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                >
                  {[5, 8, 10, 12].map((count) => (
                    <option key={count} value={count}>
                      {count}
                    </option>
                  ))}
                </select>
              </label>
              <button type="button" className="btn btn-accent" onClick={generateInterviewTopics} disabled={interviewLoading}>
                {interviewLoading ? "Generating..." : "Generate interview questions"}
              </button>
            </div>
            <div className="status-banner w-full mt-4">
              <div className="status-banner-title">LinkedIn Profile Analyzer</div>
              <p className="status-banner-copy mt-2">
                Paste your LinkedIn URL to get headline and profile improvement suggestions.
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <input
                  value={linkedInUrl}
                  onChange={(e) => setLinkedInUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/in/yourname"
                  className="resume-builder-input flex-1"
                />
                <button type="button" className="btn btn-primary" onClick={analyzeLinkedInProfile}>
                  Analyze profile
                </button>
              </div>
              {linkedInAnalysis ? (
                <div className="mt-4 space-y-2">
                  {linkedInAnalysis.error ? (
                    <div className="status-banner-status text-rose-500">{linkedInAnalysis.error}</div>
                  ) : (
                    <>
                      <div className="font-semibold">Headline suggestion</div>
                      <div>{linkedInAnalysis.headline}</div>
                      <div className="font-semibold mt-2">Summary advice</div>
                      <div>{linkedInAnalysis.summary}</div>
                      <div className="font-semibold mt-2">Skill suggestion</div>
                      <div>{linkedInAnalysis.skills}</div>
                    </>
                  )}
                </div>
              ) : null}
            </div>
            {portfolioPreviewHtml ? (
              <div className="status-banner status-banner-success w-full mt-4">
                <div className="status-banner-title">Portfolio page created</div>
                <p className="status-banner-copy mt-2">A downloadable website page was generated for your resume.</p>
              </div>
            ) : null}
            {interviewQuestions.length > 0 && (
              <div className="status-banner status-banner-info w-full mt-4">
                <div className="status-banner-title">Interview question generator</div>
                <p className="status-banner-copy mt-2">
                  Use these questions to prepare answers based on your resume and target role.
                </p>
                <ul className="status-banner-list mt-3 space-y-4">
                  {interviewQuestions.map((question, idx) => (
                    <li key={`question-${idx}`} className="rounded-xl border border-slate-200 bg-white/70 p-4">
                      <div className="font-semibold text-slate-900">
                        {idx + 1}. {question?.question || question}
                      </div>
                      {question?.whyItMatters ? <div className="mt-2 text-sm text-slate-600">Why it matters: {question.whyItMatters}</div> : null}
                      {question?.sampleAnswer ? (
                        <div className="mt-2 text-sm text-slate-700">
                          <span className="font-medium">Sample answer:</span> {question.sampleAnswer}
                        </div>
                      ) : null}
                      {Array.isArray(question?.sampleAnswerOutline) && question.sampleAnswerOutline.length > 0 ? (
                        <div className="mt-2 text-xs text-slate-500">
                          Outline: {question.sampleAnswerOutline.join(" | ")}
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {(jobDescription.trim().length >= 20 || jobInsightsLoading || jobInsightsError) && (
              <TailoringInsights
                loading={jobInsightsLoading}
                insights={jobInsights}
                error={jobInsightsError}
                onRefresh={() => fetchJobInsights(data, jobDescription)}
              />
            )}
            {showFormUI && (
              <ResumeBuilderForm
                register={register}
                handleSubmit={handleSubmit}
                onSubmit={onSubmit}
                fieldArrays={fieldArrays}
                validationIssues={formIssues}
                onImproveBullet={handleImproveBullet}
                improvingBulletPath={improvingBulletPath}
                hasJobDescription={jobDescription.trim().length >= 20}
              />
            )}
            {showPromptInput && (
              <PromptInput
                loading={loading}
                description={description}
                jobDescription={jobDescription}
                onDescriptionChange={handleDescriptionChange}
                onJobDescriptionChange={handleJobDescriptionChange}
                onGenerate={handleGenerate}
                onClear={handleClear}
                onVoiceResume={() => startVoiceCapture("description")}
                minimumLength={MIN_DESCRIPTION_LENGTH}
              />
            )}
            {showTemplateChooser && (
              <TemplateChooser
                templateOptions={templateOptions}
                onSelect={handleTemplateSelect}
                onCancel={() => setShowTemplateChooser(false)}
                renderTemplateThumb={renderTemplateThumb}
              />
            )}
            <DesignerBoundary>
              {showDesigner && (
                <DesignerPanel
                  templateOptions={templateOptions}
                  templateThumbs={templateThumbs}
                  templateThumbUrls={templateThumbUrls}
                  selectedTemplate={selectedTemplate}
                  setSelectedTemplate={setSelectedTemplate}
                  accentColor={accentColor}
                  setAccentColor={setAccentColor}
                  data={data}
                  editablePreview={designerEditMode}
                  setEditablePreview={setDesignerEditMode}
                  updateResumeField={updateResumeField}
                  onAddManualItem={handleAddManualItem}
                  saveDownloadedResume={saveDownloadedResume}
                  handleDownloadPreviewPdf={handleDownloadPreviewPdf}
                  onClose={handleCloseDesigner}
                />
              )}
            </DesignerBoundary>
            {showResumeUI && (
              <ResumeResult
                data={data}
                selectedTemplate={selectedTemplate}
                accentColor={accentColor}
                updateResumeField={updateResumeField}
                saveDownloadedResume={saveDownloadedResume}
                onGenerateAnother={handleGenerateAnother}
                onEdit={handleEditResume}
              />
            )}
          </div>
        )}

        {showChatDock && (
          <div className={chatOnly ? "w-full max-w-xl" : ""}>
            <ChatDock
              ollamaModel={ollamaModel}
              chatLoading={chatLoading}
              speakerOn={speakerOn}
              setSpeakerOn={setSpeakerOn}
              chatMessages={chatMessages}
              chatFiles={chatFiles}
              setChatFiles={setChatFiles}
              chatInput={chatInput}
              setChatInput={setChatInput}
              sendChatMessage={sendChatMessage}
              resetChat={resetChat}
              listening={listening}
              startVoiceCapture={startVoiceCapture}
              stopVoiceCapture={stopVoiceCapture}
            />
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setShowChatDock((prev) => !prev)}
        className="chat-dock-fab btn btn-circle fixed bottom-6 right-6 shadow-2xl border-0"
        title={showChatDock ? "Hide Resume Copilot" : "Show Resume Copilot"}
      >
        <FaComments />
      </button>
    </div>
  );
};

export default GenerateResume;


