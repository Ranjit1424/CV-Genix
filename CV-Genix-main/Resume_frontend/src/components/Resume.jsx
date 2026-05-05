import React, { useRef } from "react";
import "daisyui/dist/full.css";
import { FaGithub, FaLinkedin, FaPhone, FaEnvelope } from "react-icons/fa";
import { toPng } from "html-to-image";
import { jsPDF } from "jspdf";
import { getCurrentSession } from "../utils/localAuth";

const DEFAULT_SKILL_BANK = [
  "Java",
  "Spring Boot",
  "REST APIs",
  "MySQL",
  "React",
  "JavaScript",
  "HTML",
  "CSS",
  "Git",
  "Postman",
];

const ensureArray = (value) => (Array.isArray(value) ? value : []);
const toText = (value) => (typeof value === "string" ? value.trim() : "");

const splitSummarySkills = (text) => {
  const summary = toText(text).toLowerCase();
  if (!summary) return [];

  const skillPairs = [
    ["java", "Java"],
    ["spring boot", "Spring Boot"],
    ["hibernate", "Hibernate"],
    ["mysql", "MySQL"],
    ["postgresql", "PostgreSQL"],
    ["react", "React"],
    ["javascript", "JavaScript"],
    ["typescript", "TypeScript"],
    ["html", "HTML"],
    ["css", "CSS"],
    ["rest", "REST APIs"],
    ["microservice", "Microservices"],
    ["git", "Git"],
    ["postman", "Postman"],
    ["docker", "Docker"],
  ];

  return skillPairs
    .filter(([needle]) => summary.includes(needle))
    .map(([, label]) => label);
};

const cleanSkillTitle = (value) => {
  const text = toText(value)
    .replace(
      /^(programming languages?|frontend|backend|database|tools?\s*&?\s*technology|tools?)\s*:\s*/i,
      ""
    )
    .replace(/\s+/g, " ");

  if (!text) return "";
  if (text.length > 34) return "";
  return text;
};

const uniqueByLower = (items) => {
  const seen = new Set();
  return items.filter((item) => {
    const key = toText(item).toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const buildRenderableData = (input) => {
  const source = input && typeof input === "object" ? input : {};
  const personal = { ...(source.personalInformation || {}) };
  const experiences = ensureArray(source.experience).map((item) => ({ ...(item || {}) }));
  const education = ensureArray(source.education).map((item) => ({ ...(item || {}) }));
  const projects = ensureArray(source.projects).map((item) => ({
    ...(item || {}),
    technologiesUsed: Array.isArray(item?.technologiesUsed)
      ? item.technologiesUsed
      : typeof item?.technologiesUsed === "string"
        ? item.technologiesUsed.split(",").map((v) => v.trim()).filter(Boolean)
        : [],
  }));
  const certifications = ensureArray(source.certifications).map((item) => ({ ...(item || {}) }));
  const languages = ensureArray(source.languages).map((item) => ({ ...(item || {}) }));
  const interests = ensureArray(source.interests).map((item) => ({ ...(item || {}) }));
  const achievements = ensureArray(source.achievements).map((item) => ({ ...(item || {}) }));

  const rawSkillObjects = ensureArray(source.skills).map((item) =>
    typeof item === "string" ? { title: item, level: "" } : { ...(item || {}) }
  );
  const cleanedSkillTitles = rawSkillObjects
    .map((item) => cleanSkillTitle(item?.title))
    .filter(Boolean);
  const inferredSkillTitles = splitSummarySkills(source.summary);
  const mergedSkillTitles = uniqueByLower([
    ...cleanedSkillTitles,
    ...inferredSkillTitles,
    ...DEFAULT_SKILL_BANK,
  ]).slice(0, 10);

  const normalizedSkills = mergedSkillTitles.map((title) => {
    const existing = rawSkillObjects.find((item) => toText(item?.title).toLowerCase() === title.toLowerCase());
    return {
      title,
      level: toText(existing?.level),
    };
  });

  const fullName = toText(personal.fullName) || "Your Name";
  const location = toText(personal.location) || "City, Country";
  const role =
    toText(personal.summaryTitle) ||
    toText(experiences[0]?.jobTitle) ||
    "Software Developer";

  const summary =
    toText(source.summary) ||
    `${role} focused on building reliable applications and delivering measurable impact across backend and frontend systems.`;

  const fallbackExperience = {
    jobTitle: role,
    company: "Tech Company",
    location,
    duration: "2022 - Present",
    responsibility:
      "Built and maintained production-ready features, collaborated with cross-functional teams, and improved performance, quality, and delivery speed.",
  };

  const fallbackEducation = {
    degree: "Bachelor of Computer Science",
    university: "State University",
    location,
    graduationYear: "2024",
  };

  const fallbackProject = {
    title: "Professional Web Application",
    description:
      "Developed an end-to-end application with clean architecture, robust APIs, and responsive UI focused on usability and reliability.",
    technologiesUsed: mergedSkillTitles.slice(0, 4),
  };

  const fallbackCertification = {
    title: "Professional Development Certification",
    issuingOrganization: "Online Learning Platform",
    year: "2025",
  };

  const fallbackAchievement = {
    title: "Improved team productivity by delivering reusable modules and cleaner code practices.",
    year: "2025",
    extraInformation: "",
  };

  return {
    ...source,
    personalInformation: {
      ...personal,
      fullName,
      location,
      summaryTitle: role,
    },
    summary,
    skills: normalizedSkills,
    experience: experiences.length ? experiences : [fallbackExperience],
    education: education.length ? education : [fallbackEducation],
    projects: projects.length ? projects : [fallbackProject],
    certifications: certifications.length ? certifications : [fallbackCertification],
    languages: languages.length ? languages : [{ name: "English" }],
    interests: interests.length ? interests : [{ name: "Problem Solving" }, { name: "Continuous Learning" }],
    achievements: achievements.length ? achievements : [fallbackAchievement],
    rating: source.rating || null,
  };
};

// Visual templates inspired by the reference image
const Resume = ({
  data: rawData,
  template = "classic",
  accent = [80, 170, 255],
  editable = false,
  onChange,
  onDownloadSuccess,
}) => {
  const resumeRef = useRef(null);
  const data = buildRenderableData(rawData);

  const dossierBasePalette = {
    background: "#f8fafc",
    card: "#ffffff",
    text: "#172235",
    muted: "#64748b",
    border: "#d6deeb",
    accent: null,
    sidebar: "#eef2f6",
    heading: "#3c4c63",
    sidebarText: "#46566f",
    rule: "#aeb9ca",
  };
  const dossierVariantPalettes = {
    "dossier-slate": {
      background: "#f4f7fb",
      text: "#142033",
      muted: "#5f6f86",
      border: "#cfd8e6",
      sidebar: "#e6edf5",
      heading: "#314760",
      sidebarText: "#445871",
      rule: "#a4b3c6",
    },
    "dossier-cloud": {
      background: "#f8fbff",
      text: "#102033",
      muted: "#61738d",
      border: "#d8e5f2",
      sidebar: "#edf4fb",
      heading: "#35516f",
      sidebarText: "#48627c",
      rule: "#b4c7dc",
    },
    "dossier-graphite": {
      background: "#f3f5f8",
      text: "#1a2536",
      muted: "#5f6b7f",
      border: "#cfd6e1",
      sidebar: "#e7ecf2",
      heading: "#2f4058",
      sidebarText: "#41546e",
      rule: "#a7b3c4",
    },
    "dossier-ivory": {
      background: "#fbf9f6",
      text: "#2f2a24",
      muted: "#74685c",
      border: "#e4ddd1",
      sidebar: "#f2ece4",
      heading: "#5e5042",
      sidebarText: "#6d5d4d",
      rule: "#c5b8a5",
    },
    "dossier-emerald": {
      background: "#f5faf8",
      text: "#16342f",
      muted: "#4f6f69",
      border: "#d4e6de",
      sidebar: "#e7f2ec",
      heading: "#285148",
      sidebarText: "#3c645b",
      rule: "#a9c7bc",
    },
    "dossier-cobalt": {
      background: "#f4f7fd",
      text: "#17274a",
      muted: "#53698d",
      border: "#d2dbef",
      sidebar: "#e7edf9",
      heading: "#2b4479",
      sidebarText: "#3c578f",
      rule: "#a8b8d7",
    },
    "dossier-amber": {
      background: "#fcfaf5",
      text: "#3a301e",
      muted: "#7a6a45",
      border: "#e7ddc7",
      sidebar: "#f2ecdc",
      heading: "#64512a",
      sidebarText: "#7a6438",
      rule: "#c5b285",
    },
    "dossier-rose": {
      background: "#fbf7fa",
      text: "#322338",
      muted: "#766078",
      border: "#e5d9e5",
      sidebar: "#f0e6ef",
      heading: "#5f4561",
      sidebarText: "#775879",
      rule: "#c4acc4",
    },
    "dossier-forest": {
      background: "#f5faf7",
      text: "#1d3328",
      muted: "#5a7566",
      border: "#d4e4da",
      sidebar: "#e6f1ea",
      heading: "#345948",
      sidebarText: "#466b58",
      rule: "#abc5b6",
    },
    "dossier-arctic": {
      background: "#f4f9fd",
      text: "#173245",
      muted: "#547286",
      border: "#d2e2ee",
      sidebar: "#e6f1f8",
      heading: "#2f566e",
      sidebarText: "#3f6880",
      rule: "#a7c0d0",
    },
    "dossier-noir": {
      background: "#f3f4f6",
      text: "#202733",
      muted: "#646d7b",
      border: "#d0d6de",
      sidebar: "#e8ebf0",
      heading: "#374252",
      sidebarText: "#4a5567",
      rule: "#a9b1be",
    },
    "dossier-stone": {
      background: "#f5f6f8",
      text: "#262d37",
      muted: "#646d7a",
      border: "#d4d9e0",
      sidebar: "#e8ecf1",
      heading: "#3f4b5c",
      sidebarText: "#525f71",
      rule: "#acb5c3",
    },
    "dossier-marine": {
      background: "#f3f8fc",
      text: "#152d44",
      muted: "#55708a",
      border: "#d2deeb",
      sidebar: "#e5eef6",
      heading: "#2a4d6b",
      sidebarText: "#3b607f",
      rule: "#a8bbcf",
    },
    "dossier-sand": {
      background: "#faf8f4",
      text: "#2f2a22",
      muted: "#776a58",
      border: "#e4dccc",
      sidebar: "#f1eadf",
      heading: "#594e3f",
      sidebarText: "#6f604f",
      rule: "#c2b4a0",
    },
    "dossier-plum": {
      background: "#f8f5fb",
      text: "#2b2236",
      muted: "#6f627d",
      border: "#ded6e7",
      sidebar: "#ece4f2",
      heading: "#4f3c63",
      sidebarText: "#634e77",
      rule: "#b7a7c8",
    },
    "dossier-steel": {
      background: "#f4f7fa",
      text: "#1d2b3d",
      muted: "#5a6f85",
      border: "#d3dce6",
      sidebar: "#e6edf4",
      heading: "#36506e",
      sidebarText: "#476386",
      rule: "#aab9cb",
    },
    "dossier-ocean": {
      background: "#f2f8fc",
      text: "#133147",
      muted: "#4e6f86",
      border: "#d1deea",
      sidebar: "#e3eef6",
      heading: "#285570",
      sidebarText: "#3a6984",
      rule: "#a5bccf",
    },
    "dossier-olive": {
      background: "#f7f9f3",
      text: "#2a3220",
      muted: "#6a745a",
      border: "#dce2cf",
      sidebar: "#ebf0e2",
      heading: "#4b5937",
      sidebarText: "#5d6b47",
      rule: "#b7c2a1",
    },
    "dossier-ink": {
      background: "#f3f6fb",
      text: "#1a2638",
      muted: "#5b6b82",
      border: "#d3dbe8",
      sidebar: "#e7ecf5",
      heading: "#344a66",
      sidebarText: "#455e7e",
      rule: "#a9b8cc",
    },
    "dossier-skyline": {
      background: "#f3f8fd",
      text: "#1b3550",
      muted: "#56738f",
      border: "#d3e0ed",
      sidebar: "#e7f0f8",
      heading: "#345f86",
      sidebarText: "#46739b",
      rule: "#acc2d6",
    },
    "dossier-charcoal": {
      background: "#f4f5f7",
      text: "#202733",
      muted: "#636c79",
      border: "#d2d7df",
      sidebar: "#e8ebf0",
      heading: "#374353",
      sidebarText: "#4a5567",
      rule: "#aab3c0",
    },
    "dossier-mist": {
      background: "#f8fbff",
      text: "#1b2d40",
      muted: "#61758b",
      border: "#dbe4ef",
      sidebar: "#edf3f9",
      heading: "#3a5573",
      sidebarText: "#4c6885",
      rule: "#b5c5d7",
    },
    "dossier-royal": {
      background: "#f3f5fc",
      text: "#1b2850",
      muted: "#586793",
      border: "#d3daee",
      sidebar: "#e6eaf8",
      heading: "#334b8a",
      sidebarText: "#445e9f",
      rule: "#aab7da",
    },
    "dossier-teal": {
      background: "#f3faf9",
      text: "#17363b",
      muted: "#4f7276",
      border: "#d1e4e3",
      sidebar: "#e4f1f0",
      heading: "#2d5b62",
      sidebarText: "#3d7078",
      rule: "#a9c7c8",
    },
    "dossier-warmgray": {
      background: "#f8f7f5",
      text: "#2d2a27",
      muted: "#726b64",
      border: "#ddd8d2",
      sidebar: "#ece8e3",
      heading: "#58524b",
      sidebarText: "#68615a",
      rule: "#b8aea4",
    },
    "dossier-midnight": {
      background: "#f3f6fb",
      text: "#182848",
      muted: "#566a8b",
      border: "#d2daea",
      sidebar: "#e5ebf6",
      heading: "#304d7d",
      sidebarText: "#416192",
      rule: "#a8b8d4",
    },
    "dossier-copper": {
      background: "#faf6f3",
      text: "#332720",
      muted: "#786357",
      border: "#e3d7cf",
      sidebar: "#f0e7e1",
      heading: "#60463a",
      sidebarText: "#76584a",
      rule: "#c1ab9f",
    },
  };
  const palettes = {
    classic: { background: "#f8fafc", card: "#ffffff", text: "#0f172a", muted: "#475569", border: "#e2e8f0", accent: null },
    modern: { background: "#0b1727", card: "#111827", text: "#e5e7eb", muted: "#94a3b8", border: "#1f2937", accent: null },
    minimal: { background: "#ffffff", card: "#ffffff", text: "#0f172a", muted: "#64748b", border: "#e2e8f0", accent: null },
    sleek: { background: "linear-gradient(135deg,#0b1220,#0f172a)", card: "rgba(255,255,255,0.06)", text: "#e2e8f0", muted: "#94a3b8", border: "rgba(255,255,255,0.1)", accent: null },
    "navy-sidebar": { background: "#f5f7fb", card: "#ffffff", text: "#0f172a", muted: "#475569", border: "#d8dee9", accent: null, sidebar: "#0b2c55" },
    crimson: { background: "#ffffff", card: "#ffffff", text: "#1f0f0f", muted: "#6b1a1a", border: "#f3d4d4", accent: null },
    lavender: { background: "#faf5ff", card: "#ffffff", text: "#261b35", muted: "#6b5c7a", border: "#e9d5ff", accent: null },
    "blue-accent": { background: "#f7fbff", card: "#ffffff", text: "#0f172a", muted: "#475569", border: "#dbeafe", accent: null },
    editorial: { background: "#fcfaf7", card: "#fffdf9", text: "#1f2937", muted: "#6b7280", border: "#eadfce", accent: null },
    "split-grid": { background: "#eef4ff", card: "#ffffff", text: "#0f172a", muted: "#475569", border: "#d7e3f4", accent: null, sidebar: "#14253f" },
    timeline: { background: "#f8fbff", card: "#ffffff", text: "#132136", muted: "#5f7088", border: "#d9e4f2", accent: null },
    spotlight: { background: "#fffaf5", card: "#fffdfb", text: "#221b16", muted: "#75665a", border: "#edd9c7", accent: null },
    prism: { background: "#f7fbff", card: "#ffffff", text: "#132136", muted: "#62748c", border: "#dce7f5", accent: null },
    dossier: dossierBasePalette,
    ...Object.fromEntries(
      Object.entries(dossierVariantPalettes).map(([key, value]) => [
        key,
        { ...dossierBasePalette, ...value },
      ])
    ),
    frame: { background: "#fffdf8", card: "#fffdf8", text: "#231c16", muted: "#7b6d60", border: "#e8d9ca", accent: null },
    zen: { background: "#fbfdfc", card: "#ffffff", text: "#10201a", muted: "#667a73", border: "#d8e7e1", accent: null },
  };

  const templateAliases = {
    "atlas-pro": "split-grid",
    "summit-executive": "frame",
    "metro-clean": "dossier",
    "mono-ink": "classic",
    "harbor-tech": "modern",
    "horizon-compact": "dossier",
    "cascade-pro": "timeline",
    "nova-sidebar": "navy-sidebar",
    "studio-lite": "zen",
    "pine-editorial": "editorial",
  };
  const templatePaletteOverrides = {
    "atlas-pro": {
      background: "#edf3fb",
      border: "#cfdbec",
      sidebar: "#1f3558",
      text: "#13253d",
      muted: "#53657f",
    },
    "summit-executive": {
      background: "#f7f6f4",
      border: "#dfd8cf",
      text: "#2c261f",
      muted: "#75695d",
    },
    "metro-clean": {
      background: "#f4f6f8",
      border: "#d3d9e1",
      sidebar: "#e8edf3",
      text: "#1c2a3c",
      muted: "#607086",
      heading: "#385171",
      sidebarText: "#485c76",
      rule: "#b2bfce",
    },
    "mono-ink": {
      background: "#f6f7f9",
      border: "#d8dde3",
      text: "#1e232a",
      muted: "#606975",
    },
    "harbor-tech": {
      background: "#0f1f30",
      card: "#152b42",
      border: "#243a55",
      text: "#dbeafe",
      muted: "#94a9c1",
    },
    "horizon-compact": {
      background: "#f5f9fd",
      border: "#d5e0ed",
      sidebar: "#e7eff8",
      text: "#163049",
      muted: "#5a7390",
      heading: "#35597f",
      sidebarText: "#476788",
      rule: "#b3c5d9",
    },
    "cascade-pro": {
      background: "#f2f7fc",
      border: "#d1dfec",
      text: "#1b3552",
      muted: "#5a7592",
    },
    "nova-sidebar": {
      background: "#eef4fb",
      border: "#d0dbea",
      sidebar: "#1a3559",
      text: "#16263a",
      muted: "#586b84",
    },
    "studio-lite": {
      background: "#f4faf7",
      border: "#d2e3dc",
      text: "#173129",
      muted: "#5b756d",
    },
    "pine-editorial": {
      background: "#f6faf7",
      border: "#d4e2d9",
      text: "#1e342b",
      muted: "#62786f",
    },
  };
  const resolvedTemplate = templateAliases[template] || template;
  const isDossierTemplate =
    resolvedTemplate === "dossier" || resolvedTemplate.startsWith("dossier-");
  const accentCss = Array.isArray(accent) ? `rgb(${accent.join(",")})` : accent;
  const basePalette =
    palettes[template] ||
    palettes[resolvedTemplate] ||
    (isDossierTemplate ? palettes.dossier : palettes.classic);
  const palette = templatePaletteOverrides[template]
    ? { ...basePalette, ...templatePaletteOverrides[template] }
    : basePalette;
  const accentColor = accentCss || palette.accent || "rgb(80, 170, 255)";
  const theme = { ...palette, accent: accentColor };
  const linkedin = data.personalInformation.linkedin || data.personalInformation.linkedIn;
  const rating = data.rating;
  const pageStyle = {
    width: "100%",
    maxWidth: "920px", // give a bit more breathing room for long contact lines
    minHeight:
      data.experience.length + data.projects.length + data.education.length >= 5
        ? "1123px"
        : "920px",
    margin: "0 auto",
    boxSizing: "border-box",
    overflow: "hidden",
  };

  const handleDownloadPdf = () => {
    if (!getCurrentSession()) {
      window.location.assign("/login");
      return;
    }

    toPng(resumeRef.current, { quality: 1.0 })
      .then((dataUrl) => {
        const pdf = new jsPDF("p", "mm", "a4");
        pdf.addImage(dataUrl, "PNG", 10, 10, 190, 0);
        const fileName = `${data.personalInformation.fullName || "resume"}.pdf`;
        pdf.save(fileName);
        if (onDownloadSuccess) {
          onDownloadSuccess({ fileName, resumeData: data, template, accent });
        }
      })
      .catch((err) => console.error("Error generating PDF", err));
  };

  const sectionHeading = (text, color = accentColor) => (
    <h2 className="text-xl font-semibold mb-2" style={{ color }}>
      {text}
    </h2>
  );

  const safeText = (value) => (typeof value === "string" ? value.trim() : "");
  const hasText = (value) => safeText(value).length > 0;
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
  const experiences = (data.experience || []).filter(
    (item) =>
      hasText(item?.jobTitle) ||
      hasText(item?.company) ||
      hasText(item?.duration) ||
      hasText(item?.responsibility)
  );
  const educationEntries = (data.education || []).filter(
    (item) =>
      hasText(item?.degree) ||
      hasText(item?.university) ||
      hasText(item?.graduationYear)
  );
  const projectEntries = (data.projects || []).filter(
    (item) => hasText(item?.title) || hasText(item?.description)
  );
  const skillEntries = (data.skills || []).map((item, index) => ({
    ...item,
    _originalIndex: index,
  })).filter((item) => hasText(item?.title));
  const sidebarSkillEntries = skillEntries.slice(0, 10);
  const certificationEntries = (data.certifications || []).filter(
    (item) =>
      hasText(item?.title) ||
      hasText(item?.issuingOrganization) ||
      hasText(item?.year)
  );
  const achievementEntries = (data.achievements || []).filter(
    (item) =>
      hasText(item?.title) ||
      hasText(item?.year) ||
      hasText(item?.extraInformation)
  );
  const languageEntries = (data.languages || []).filter((item) => hasText(item?.name));
  const socialLinks = [
    { label: "LinkedIn", value: linkedin, path: "personalInformation.linkedin" },
    { label: "GitHub", value: data.personalInformation.gitHub, path: "personalInformation.gitHub" },
    { label: "Portfolio", value: data.personalInformation.portfolio, path: "personalInformation.portfolio" },
  ].filter((item) => hasText(item.value));
  const templatesWithProjectSection = new Set([
    "prism",
    "editorial",
    "split-grid",
    "timeline",
    "spotlight",
    "frame",
    "zen",
    "dossier",
  ]);
  const templateShowsProjectSection =
    templatesWithProjectSection.has(resolvedTemplate) || resolvedTemplate.startsWith("dossier-");
  const templateShowsExtendedSections =
    resolvedTemplate === "dossier" || resolvedTemplate.startsWith("dossier-");

  const supplementalExperienceEntries = [];
  if (!templateShowsProjectSection) {
    projectEntries.slice(0, 2).forEach((project) => {
      supplementalExperienceEntries.push({
        jobTitle: `Project: ${project.title || "Key Project"}`,
        company: normalizeStringList(project.technologiesUsed).slice(0, 4).join(", ") || "Project Work",
        location: "",
        duration: "",
        responsibility: project.description || "Delivered an end-to-end project with clean architecture and measurable outcomes.",
      });
    });
  }
  if (!templateShowsExtendedSections) {
    certificationEntries.slice(0, 2).forEach((cert) => {
      supplementalExperienceEntries.push({
        jobTitle: `Certification: ${cert.title || "Professional Certification"}`,
        company: cert.issuingOrganization || "Certification Platform",
        location: "",
        duration: cert.year || "",
        responsibility: "Completed professional upskilling and validated practical domain knowledge.",
      });
    });
    achievementEntries.slice(0, 2).forEach((achievement) => {
      supplementalExperienceEntries.push({
        jobTitle: "Achievement",
        company: achievement.year || "",
        location: "",
        duration: achievement.year || "",
        responsibility:
          achievement.title ||
          achievement.extraInformation ||
          "Delivered measurable outcomes through ownership and collaboration.",
      });
    });
    if (languageEntries.length || data.interests.length) {
      supplementalExperienceEntries.push({
        jobTitle: "Languages & Interests",
        company: "",
        location: "",
        duration: "",
        responsibility: [
          languageEntries.length
            ? `Languages: ${languageEntries.map((item) => item.name).join(", ")}`
            : "",
          data.interests.length
            ? `Interests: ${data.interests.map((item) => item.name).join(", ")}`
            : "",
        ]
          .filter(Boolean)
          .join(" | "),
      });
    }
  }
  if (socialLinks.length > 1) {
    supplementalExperienceEntries.push({
      jobTitle: "Professional Links",
      company: "",
      location: "",
      duration: "",
      responsibility: socialLinks.map((link) => `${link.label}: ${link.value}`).join(" | "),
    });
  }
  const displayExperience = [...experiences, ...supplementalExperienceEntries];
  const primaryRole =
    safeText(data.personalInformation.summaryTitle) ||
    safeText(experiences[0]?.jobTitle) ||
    "Software Developer";

  // ---------------- Specific layouts ----------------

  const renderRating = () =>
    rating?.score ? (
      <div className="flex items-center gap-2 text-sm font-semibold rounded-full px-3 py-1 w-fit"
           style={{ background: theme.border, color: theme.text, border: `1px solid ${theme.border}` }}>
        ⭐ Rating: {rating.score}/10
        {rating.feedback ? <span className="text-xs text-slate-500 ml-2" style={{ color: theme.muted }}>{rating.feedback.slice(0, 80)}</span> : null}
      </div>
    ) : null;

  const renderNavySidebar = () => (
    <div
      id="resume-preview"
      ref={resumeRef}
      className="rounded-lg overflow-hidden shadow-2xl"
      style={{ ...pageStyle, background: theme.background, border: `1px solid ${theme.border}` }}
    >
      <div className="grid grid-cols-3">
        <aside className="col-span-1 text-white p-6 space-y-4" style={{ background: theme.sidebar }}>
          <div className="space-y-1">
            <div className="text-2xl font-bold">
              <EditableText value={data.personalInformation.fullName} path="personalInformation.fullName" />
            </div>
            <div className="text-sm opacity-90">{data.personalInformation.summaryTitle || "Senior Sales Associate"}</div>
          </div>
          <div className="text-sm space-y-1">
            {data.personalInformation.location && (
              <div>
                <EditableText value={data.personalInformation.location} path="personalInformation.location" />
              </div>
            )}
            {data.personalInformation.phoneNumber && (
              <div>
                <EditableText value={data.personalInformation.phoneNumber} path="personalInformation.phoneNumber" />
              </div>
            )}
            {data.personalInformation.email && (
              <div className="break-all">
                <EditableText value={data.personalInformation.email} path="personalInformation.email" />
              </div>
            )}
            {linkedin && (
              <div>
                <EditableText value={linkedin} path="personalInformation.linkedin" />
              </div>
            )}
          </div>
          {data.skills?.length ? (
            <div>
              <div className="text-sm font-semibold uppercase tracking-wide">Skills</div>
              <ul className="mt-2 space-y-1 text-sm">
                {data.skills.map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-white/80" />
                    <EditableText value={s.title} path={`skills.${i}.title`} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>

        <main className="col-span-2 p-6 space-y-5" style={{ background: theme.card, color: theme.text }}>
          {renderRating()}
          <section>
            {sectionHeading("Work History", accentColor)}
            <div className="space-y-3">
              {displayExperience.map((exp, idx) => (
                <div key={idx} className="p-3 rounded-lg" style={{ border: `1px solid ${theme.border}` }}>
                  <div className="flex justify-between text-sm font-semibold">
                    <EditableText value={exp.jobTitle} path={`experience.${idx}.jobTitle`} />
                    <span style={{ color: theme.muted }}>
                      <EditableText value={exp.duration} path={`experience.${idx}.duration`} />
                    </span>
                  </div>
                  <div className="text-sm" style={{ color: theme.muted }}>
                    <EditableText value={exp.company} path={`experience.${idx}.company`} />   -{" "}
                    <EditableText value={exp.location} path={`experience.${idx}.location`} />
                  </div>
                  {exp.responsibility ? (
                    <ul className="list-disc pl-5 mt-1 space-y-1" style={{ color: theme.text }}>
                      <li>
                        <EditableText
                          value={exp.responsibility}
                          path={`experience.${idx}.responsibility`}
                          multiline
                        />
                      </li>
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          {data.education?.length ? (
            <section>
              {sectionHeading("Education", accentColor)}
              <div className="space-y-2 text-sm">
                {data.education.map((edu, idx) => (
                  <div key={idx}>
                    <div className="font-semibold">
                      <EditableText value={edu.degree} path={`education.${idx}.degree`} />   -{" "}
                      <EditableText value={edu.university} path={`education.${idx}.university`} />
                    </div>
                    <div style={{ color: theme.muted }}>
                      <EditableText value={edu.location} path={`education.${idx}.location`} />{" "}
                      <EditableText value={edu.graduationYear} path={`education.${idx}.graduationYear`} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );

  const renderColorHeader = (headerColor) => (
    <div
      id="resume-preview"
      ref={resumeRef}
      className="shadow-2xl rounded-lg overflow-hidden"
      style={{ ...pageStyle, background: theme.card, border: `1px solid ${theme.border}` }}
    >
      <div className="p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-white" style={{ background: headerColor }}>
        <div>
          <div className="text-3xl font-bold">
            <EditableText value={data.personalInformation.fullName} path="personalInformation.fullName" />
          </div>
          <div className="text-sm opacity-90">{data.personalInformation.summaryTitle || "Senior Sales Associate"}</div>
        </div>
        <div className="text-sm text-right space-y-1">
          {data.personalInformation.location && (
            <div>
              <EditableText value={data.personalInformation.location} path="personalInformation.location" />
            </div>
          )}
          {data.personalInformation.phoneNumber && (
            <div>
              <EditableText value={data.personalInformation.phoneNumber} path="personalInformation.phoneNumber" />
            </div>
          )}
          {data.personalInformation.email && (
            <div>
              <EditableText value={data.personalInformation.email} path="personalInformation.email" />
            </div>
          )}
          {linkedin && (
            <div>
              <EditableText value={linkedin} path="personalInformation.linkedin" />
            </div>
          )}
          {data.personalInformation.portfolio && (
            <div>
              <EditableText value={data.personalInformation.portfolio} path="personalInformation.portfolio" />
            </div>
          )}
        </div>
      </div>

      <div className="p-6 grid md:grid-cols-3 gap-6" style={{ color: theme.text }}>
        {renderRating()}
        <section className="md:col-span-2 space-y-4">
          <div>
            {sectionHeading("Work History", headerColor)}
            <div className="space-y-3">
              {displayExperience.map((exp, idx) => (
                <div key={idx} className="text-sm">
                  <div className="flex justify-between font-semibold">
                    <EditableText value={exp.jobTitle} path={`experience.${idx}.jobTitle`} />
                    <span style={{ color: theme.muted }}>
                      <EditableText value={exp.duration} path={`experience.${idx}.duration`} />
                    </span>
                  </div>
                  <div style={{ color: theme.muted }}>
                    <EditableText value={exp.company} path={`experience.${idx}.company`} />   -{" "}
                    <EditableText value={exp.location} path={`experience.${idx}.location`} />
                  </div>
                  {exp.responsibility ? (
                    <ul className="list-disc pl-5 mt-1 space-y-1" style={{ color: theme.text }}>
                      <li>
                        <EditableText
                          value={exp.responsibility}
                          path={`experience.${idx}.responsibility`}
                          multiline
                        />
                      </li>
                    </ul>
                  ) : null}
                </div>
              ))}
            </div>
          </div>

          {data.education?.length ? (
            <div>
              {sectionHeading("Education", headerColor)}
              {data.education.map((edu, idx) => (
                <div key={idx} className="text-sm mt-1">
                  <div className="font-semibold">
                    <EditableText value={edu.degree} path={`education.${idx}.degree`} />   -{" "}
                    <EditableText value={edu.university} path={`education.${idx}.university`} />
                  </div>
                  <div style={{ color: theme.muted }}>
                    <EditableText value={edu.location} path={`education.${idx}.location`} />{" "}
                    <EditableText value={edu.graduationYear} path={`education.${idx}.graduationYear`} />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <aside className="space-y-4">
          <div>
            {sectionHeading("Contact", headerColor)}
            <div className="text-sm space-y-1" style={{ color: theme.muted }}>
              {data.personalInformation.location && (
                <div>
                  <EditableText value={data.personalInformation.location} path="personalInformation.location" />
                </div>
              )}
              {data.personalInformation.phoneNumber && (
                <div>
                  <EditableText value={data.personalInformation.phoneNumber} path="personalInformation.phoneNumber" />
                </div>
              )}
              {data.personalInformation.email && (
                <div>
                  <EditableText value={data.personalInformation.email} path="personalInformation.email" />
                </div>
              )}
              {linkedin && (
                <div>
                  <EditableText value={linkedin} path="personalInformation.linkedin" />
                </div>
              )}
            </div>
          </div>

          {data.skills?.length ? (
            <div>
              {sectionHeading("Skills", headerColor)}
              <ul className="space-y-1 text-sm" style={{ color: theme.text }}>
                {data.skills.map((s, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full" style={{ background: headerColor }} />
                    <EditableText value={s.title} path={`skills.${i}.title`} />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );

  const renderModern = () => (
    <div
      id="resume-preview"
      ref={resumeRef}
      className="rounded-lg shadow-2xl p-8 space-y-6"
      style={{ ...pageStyle, background: theme.card, color: theme.text, border: `1px solid ${theme.border}` }}
    >
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="text-3xl font-bold">
            <EditableText value={data.personalInformation.fullName} path="personalInformation.fullName" />
          </div>
          <div className="text-sm" style={{ color: theme.muted }}>
            <EditableText value={data.personalInformation.location} path="personalInformation.location" />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-sm" style={{ color: theme.muted }}>
          {data.personalInformation.email && (
            <span>
              <EditableText value={data.personalInformation.email} path="personalInformation.email" />
            </span>
          )}
          {data.personalInformation.phoneNumber && (
            <span>
              <EditableText value={data.personalInformation.phoneNumber} path="personalInformation.phoneNumber" />
            </span>
          )}
          {linkedin && (
            <span>
              <EditableText value={linkedin} path="personalInformation.linkedin" />
            </span>
          )}
          {data.personalInformation.portfolio && (
            <span>
              <EditableText value={data.personalInformation.portfolio} path="personalInformation.portfolio" />
            </span>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {renderRating()}
        <section className="md:col-span-2 space-y-4">
          {sectionHeading("Work History", accentColor)}
          {displayExperience.map((exp, idx) => (
            <div key={idx} className="p-4 rounded-lg" style={{ background: "#0d1b2a", border: `1px solid ${theme.border}` }}>
              <div className="flex justify-between text-sm font-semibold">
                <EditableText value={exp.jobTitle} path={`experience.${idx}.jobTitle`} />
                <span style={{ color: theme.muted }}>
                  <EditableText value={exp.duration} path={`experience.${idx}.duration`} />
                </span>
              </div>
              <div className="text-sm" style={{ color: theme.muted }}>
                <EditableText value={exp.company} path={`experience.${idx}.company`} />   -{" "}
                <EditableText value={exp.location} path={`experience.${idx}.location`} />
              </div>
              {exp.responsibility ? (
                <p className="mt-2 text-sm" style={{ color: theme.text }}>
                  <EditableText value={exp.responsibility} path={`experience.${idx}.responsibility`} multiline />
                </p>
              ) : null}
            </div>
          ))}
        </section>

        <aside className="space-y-4">
          {sectionHeading("Skills", accentColor)}
          <div className="flex flex-wrap gap-2">
            {data.skills.map((s, i) => (
              <span key={i} className="px-3 py-1 rounded-full text-xs" style={{ background: "#12263a", border: `1px solid ${accentColor}` }}>
                <EditableText value={s.title} path={`skills.${i}.title`} />
              </span>
            ))}
          </div>
          {sectionHeading("Education", accentColor)}
          {data.education.map((edu, idx) => (
            <div key={idx} className="text-sm">
              <div className="font-semibold">
                <EditableText value={edu.degree} path={`education.${idx}.degree`} />
              </div>
              <div style={{ color: theme.muted }}>
                <EditableText value={edu.university} path={`education.${idx}.university`} />{" "}
                <EditableText value={edu.graduationYear} path={`education.${idx}.graduationYear`} />
              </div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );

  const renderMinimal = () => (
    <div
      id="resume-preview"
      ref={resumeRef}
      className="rounded-lg shadow-lg p-10 space-y-6"
      style={{ ...pageStyle, background: theme.card, color: theme.text, border: `1px solid ${theme.border}` }}
    >
      <div>
        <div className="text-3xl font-bold">
          <EditableText value={data.personalInformation.fullName} path="personalInformation.fullName" />
        </div>
        <div className="text-sm" style={{ color: theme.muted }}>
          <EditableText value={data.personalInformation.email} path="personalInformation.email" />{" "}
          <EditableText value={data.personalInformation.phoneNumber} path="personalInformation.phoneNumber" />{" "}
          <EditableText value={data.personalInformation.location} path="personalInformation.location" />
        </div>
      </div>

      {renderRating()}

      <div className="space-y-4">
        {sectionHeading("Summary", accentColor)}
        <p style={{ color: theme.muted }}>
          <EditableText value={data.summary} path="summary" multiline />
        </p>

        {sectionHeading("Experience", accentColor)}
        {displayExperience.map((exp, idx) => (
          <div key={idx} className="pb-3 border-b" style={{ borderColor: theme.border }}>
            <div className="flex justify-between">
              <EditableText value={exp.jobTitle} path={`experience.${idx}.jobTitle`} className="font-semibold" />
              <span style={{ color: theme.muted }}>
                <EditableText value={exp.duration} path={`experience.${idx}.duration`} />
              </span>
            </div>
            <div style={{ color: theme.muted }}>
              <EditableText value={exp.company} path={`experience.${idx}.company`} />,{" "}
              <EditableText value={exp.location} path={`experience.${idx}.location`} />
            </div>
            <p className="mt-2" style={{ color: theme.text }}>
              <EditableText value={exp.responsibility} path={`experience.${idx}.responsibility`} multiline />
            </p>
          </div>
        ))}

        {sectionHeading("Education", accentColor)}
        {data.education.map((edu, idx) => (
          <div key={idx}>
            <div className="font-semibold">
              <EditableText value={edu.degree} path={`education.${idx}.degree`} />   -{" "}
              <EditableText value={edu.university} path={`education.${idx}.university`} />
            </div>
            <div style={{ color: theme.muted }}>
              <EditableText value={edu.location} path={`education.${idx}.location`} />{" "}
              <EditableText value={edu.graduationYear} path={`education.${idx}.graduationYear`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderSleek = () => (
    <div
      id="resume-preview"
      ref={resumeRef}
      className="rounded-2xl shadow-2xl p-8 space-y-6"
      style={{ ...pageStyle, background: theme.background, color: theme.text, border: `1px solid ${theme.border}` }}
    >
      <div className="bg-white/5 rounded-xl p-5 flex flex-col md:flex-row md:items-center md:justify-between backdrop-blur border" style={{ borderColor: theme.border }}>
        <div>
          <div className="text-3xl font-bold" style={{ color: accentColor }}>
            <EditableText value={data.personalInformation.fullName} path="personalInformation.fullName" />
          </div>
          <div className="text-sm" style={{ color: theme.muted }}>
            <EditableText value={data.personalInformation.location} path="personalInformation.location" />
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-sm" style={{ color: theme.muted }}>
          {data.personalInformation.email && (
            <span>
              <EditableText value={data.personalInformation.email} path="personalInformation.email" />
            </span>
          )}
          {data.personalInformation.phoneNumber && (
            <span>
              <EditableText value={data.personalInformation.phoneNumber} path="personalInformation.phoneNumber" />
            </span>
          )}
          {linkedin && (
            <span>
              <EditableText value={linkedin} path="personalInformation.linkedin" />
            </span>
          )}
        </div>
      </div>

      {renderRating()}

      <div className="grid md:grid-cols-3 gap-5">
        <section className="md:col-span-2 space-y-3">
          {sectionHeading("Experience", accentColor)}
          {displayExperience.map((exp, idx) => (
            <div key={idx} className="p-4 rounded-xl border bg-white/5" style={{ borderColor: theme.border }}>
              <div className="flex justify-between text-sm font-semibold">
                <EditableText value={exp.jobTitle} path={`experience.${idx}.jobTitle`} />
                <span style={{ color: theme.muted }}>
                  <EditableText value={exp.duration} path={`experience.${idx}.duration`} />
                </span>
              </div>
              <div style={{ color: theme.muted }}>
                <EditableText value={exp.company} path={`experience.${idx}.company`} />   -{" "}
                <EditableText value={exp.location} path={`experience.${idx}.location`} />
              </div>
              <p className="mt-2 text-sm" style={{ color: theme.text }}>
                <EditableText value={exp.responsibility} path={`experience.${idx}.responsibility`} multiline />
              </p>
            </div>
          ))}
        </section>

        <aside className="space-y-4">
          {sectionHeading("Skills", accentColor)}
          <div className="flex flex-wrap gap-2">
            {data.skills.map((s, i) => (
              <span key={i} className="px-3 py-1 rounded-full text-xs border" style={{ borderColor: theme.border }}>
                <EditableText value={s.title} path={`skills.${i}.title`} />
              </span>
            ))}
          </div>

          {sectionHeading("Education", accentColor)}
          {data.education.map((edu, idx) => (
            <div key={idx} className="text-sm">
              <div className="font-semibold">
                <EditableText value={edu.degree} path={`education.${idx}.degree`} />
              </div>
              <div style={{ color: theme.muted }}>
                <EditableText value={edu.university} path={`education.${idx}.university`} />{" "}
                <EditableText value={edu.graduationYear} path={`education.${idx}.graduationYear`} />
              </div>
            </div>
          ))}
        </aside>
      </div>
    </div>
  );

  const renderEditorial = () => (
    <div
      id="resume-preview"
      ref={resumeRef}
      className="rounded-[28px] shadow-2xl overflow-hidden"
      style={{ ...pageStyle, background: theme.background, color: theme.text, border: `1px solid ${theme.border}` }}
    >
      <div className="px-8 py-10" style={{ background: `linear-gradient(135deg, ${accentColor}, #f8d9b4)` }}>
        <div className="grid md:grid-cols-[1.25fr_0.75fr] gap-6 items-end">
          <div>
            <div className="text-xs uppercase tracking-[0.35em] text-black/60 mb-3">Editorial Resume</div>
            <div className="text-5xl font-bold leading-none text-slate-900">
              <EditableText value={data.personalInformation.fullName} path="personalInformation.fullName" />
            </div>
            <div className="mt-3 text-base text-slate-800/80">
              <EditableText value={data.personalInformation.location} path="personalInformation.location" />
            </div>
          </div>
          <div className="text-sm space-y-2 text-slate-900/80 md:text-right">
            {data.personalInformation.email ? (
              <div><EditableText value={data.personalInformation.email} path="personalInformation.email" /></div>
            ) : null}
            {data.personalInformation.phoneNumber ? (
              <div><EditableText value={data.personalInformation.phoneNumber} path="personalInformation.phoneNumber" /></div>
            ) : null}
            {linkedin ? (
              <div><EditableText value={linkedin} path="personalInformation.linkedin" /></div>
            ) : null}
            {data.personalInformation.portfolio ? (
              <div><EditableText value={data.personalInformation.portfolio} path="personalInformation.portfolio" /></div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="p-8 grid md:grid-cols-[0.82fr_1.18fr] gap-8">
        <aside className="space-y-6">
          {renderRating()}
          <section>
            {sectionHeading("Profile", accentColor)}
            <p style={{ color: theme.muted }}>
              <EditableText value={data.summary} path="summary" multiline />
            </p>
          </section>
          {data.skills?.length ? (
            <section>
              {sectionHeading("Skills", accentColor)}
              <div className="flex flex-wrap gap-2">
                {data.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full text-xs"
                    style={{ background: "#f2ebe1", color: theme.text, border: `1px solid ${theme.border}` }}
                  >
                    <EditableText value={skill.title} path={`skills.${idx}.title`} />
                  </span>
                ))}
              </div>
            </section>
          ) : null}
          {data.education?.length ? (
            <section>
              {sectionHeading("Education", accentColor)}
              <div className="space-y-3 text-sm">
                {data.education.map((edu, idx) => (
                  <div key={idx}>
                    <div className="font-semibold">
                      <EditableText value={edu.degree} path={`education.${idx}.degree`} />
                    </div>
                    <div style={{ color: theme.muted }}>
                      <EditableText value={edu.university} path={`education.${idx}.university`} />{" "}
                      <EditableText value={edu.graduationYear} path={`education.${idx}.graduationYear`} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </aside>

        <main className="space-y-6">
          <section>
            {sectionHeading("Experience", accentColor)}
            <div className="space-y-4">
              {displayExperience.map((exp, idx) => (
                <div
                  key={idx}
                  className="rounded-2xl p-5"
                  style={{ background: theme.card, border: `1px solid ${theme.border}` }}
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <div className="text-xl font-bold">
                        <EditableText value={exp.jobTitle} path={`experience.${idx}.jobTitle`} />
                      </div>
                      <div className="text-sm" style={{ color: theme.muted }}>
                        <EditableText value={exp.company} path={`experience.${idx}.company`} />{" "}
                        <EditableText value={exp.location} path={`experience.${idx}.location`} />
                      </div>
                    </div>
                    <div className="text-sm font-medium" style={{ color: theme.muted }}>
                      <EditableText value={exp.duration} path={`experience.${idx}.duration`} />
                    </div>
                  </div>
                  {exp.responsibility ? (
                    <p className="mt-4 text-sm leading-7" style={{ color: theme.text }}>
                      <EditableText
                        value={exp.responsibility}
                        path={`experience.${idx}.responsibility`}
                        multiline
                      />
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          {data.projects?.length ? (
            <section>
              {sectionHeading("Selected Projects", accentColor)}
              <div className="grid md:grid-cols-2 gap-4">
                {data.projects.map((project, idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl p-4"
                    style={{ background: "#fff7ef", border: `1px solid ${theme.border}` }}
                  >
                    <div className="font-semibold">
                      <EditableText value={project.title} path={`projects.${idx}.title`} />
                    </div>
                    {project.description ? (
                      <p className="mt-2 text-sm" style={{ color: theme.muted }}>
                        <EditableText
                          value={project.description}
                          path={`projects.${idx}.description`}
                          multiline
                        />
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );

  const renderSplitGrid = () => (
    <div
      id="resume-preview"
      ref={resumeRef}
      className="rounded-[28px] overflow-hidden shadow-2xl"
      style={{ ...pageStyle, background: theme.background, color: theme.text, border: `1px solid ${theme.border}` }}
    >
      <div className="grid md:grid-cols-[0.92fr_1.08fr] min-h-[1123px]">
        <aside className="p-8 space-y-6 text-white" style={{ background: theme.sidebar }}>
          {renderAvatar(132)}
          <div>
            <div className="text-3xl font-bold leading-tight">
              <EditableText value={data.personalInformation.fullName} path="personalInformation.fullName" />
            </div>
            <div className="mt-2 text-sm text-white/75">
              <EditableText value={data.personalInformation.location} path="personalInformation.location" />
            </div>
          </div>
          {renderRating()}
          <section>
            <div className="text-xs uppercase tracking-[0.25em] text-cyan-200 mb-3">About</div>
            <p className="text-sm leading-7 text-white/80">
              <EditableText value={data.summary} path="summary" multiline />
            </p>
          </section>
          <section>
            <div className="text-xs uppercase tracking-[0.25em] text-cyan-200 mb-3">Contact</div>
            <div className="space-y-2 text-sm text-white/80">
              {data.personalInformation.email ? <div><EditableText value={data.personalInformation.email} path="personalInformation.email" /></div> : null}
              {data.personalInformation.phoneNumber ? <div><EditableText value={data.personalInformation.phoneNumber} path="personalInformation.phoneNumber" /></div> : null}
              {linkedin ? <div><EditableText value={linkedin} path="personalInformation.linkedin" /></div> : null}
              {data.personalInformation.portfolio ? <div><EditableText value={data.personalInformation.portfolio} path="personalInformation.portfolio" /></div> : null}
            </div>
          </section>
          {data.skills?.length ? (
            <section>
              <div className="text-xs uppercase tracking-[0.25em] text-cyan-200 mb-3">Core Skills</div>
              <div className="flex flex-wrap gap-2">
                {data.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full text-xs border"
                    style={{ borderColor: "rgba(255,255,255,0.18)", background: "rgba(255,255,255,0.08)" }}
                  >
                    <EditableText value={skill.title} path={`skills.${idx}.title`} />
                  </span>
                ))}
              </div>
            </section>
          ) : null}
        </aside>

        <main className="p-8 space-y-6">
          <section>
            {sectionHeading("Experience", accentColor)}
            <div className="grid gap-4">
              {displayExperience.map((exp, idx) => (
                <div
                  key={idx}
                  className="rounded-3xl p-5"
                  style={{ background: theme.card, border: `1px solid ${theme.border}`, boxShadow: "0 16px 40px rgba(15, 23, 42, 0.08)" }}
                >
                  <div className="flex justify-between gap-4">
                    <div>
                      <div className="text-lg font-bold">
                        <EditableText value={exp.jobTitle} path={`experience.${idx}.jobTitle`} />
                      </div>
                      <div className="text-sm" style={{ color: theme.muted }}>
                        <EditableText value={exp.company} path={`experience.${idx}.company`} />{" "}
                        <EditableText value={exp.location} path={`experience.${idx}.location`} />
                      </div>
                    </div>
                    <div className="text-sm font-medium" style={{ color: theme.muted }}>
                      <EditableText value={exp.duration} path={`experience.${idx}.duration`} />
                    </div>
                  </div>
                  {exp.responsibility ? (
                    <p className="mt-3 text-sm leading-7" style={{ color: theme.text }}>
                      <EditableText value={exp.responsibility} path={`experience.${idx}.responsibility`} multiline />
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <div className="grid md:grid-cols-2 gap-5">
            {data.education?.length ? (
              <section className="rounded-3xl p-5" style={{ background: "#f7fbff", border: `1px solid ${theme.border}` }}>
                {sectionHeading("Education", accentColor)}
                <div className="space-y-3 text-sm">
                  {data.education.map((edu, idx) => (
                    <div key={idx}>
                      <div className="font-semibold">
                        <EditableText value={edu.degree} path={`education.${idx}.degree`} />
                      </div>
                      <div style={{ color: theme.muted }}>
                        <EditableText value={edu.university} path={`education.${idx}.university`} />{" "}
                        <EditableText value={edu.graduationYear} path={`education.${idx}.graduationYear`} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
            {data.projects?.length ? (
              <section className="rounded-3xl p-5" style={{ background: "#f7fbff", border: `1px solid ${theme.border}` }}>
                {sectionHeading("Projects", accentColor)}
                <div className="space-y-3 text-sm">
                  {data.projects.map((project, idx) => (
                    <div key={idx}>
                      <div className="font-semibold">
                        <EditableText value={project.title} path={`projects.${idx}.title`} />
                      </div>
                      <div style={{ color: theme.muted }}>
                        <EditableText value={project.description} path={`projects.${idx}.description`} multiline />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );

  const renderTimeline = () => (
    <div
      id="resume-preview"
      ref={resumeRef}
      className="rounded-[28px] shadow-2xl overflow-hidden"
      style={{ ...pageStyle, background: theme.card, color: theme.text, border: `1px solid ${theme.border}` }}
    >
      <div className="p-8 border-b" style={{ borderColor: theme.border, background: "linear-gradient(135deg, #ffffff, #f1f7ff)" }}>
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.28em]" style={{ color: theme.muted }}>Career Timeline</div>
            <div className="text-4xl font-bold mt-2" style={{ color: accentColor }}>
              <EditableText value={data.personalInformation.fullName} path="personalInformation.fullName" />
            </div>
            <div className="text-sm mt-2" style={{ color: theme.muted }}>
              <EditableText value={data.personalInformation.location} path="personalInformation.location" />
            </div>
          </div>
          <div className="text-sm space-y-1" style={{ color: theme.muted }}>
            {data.personalInformation.email ? <div><EditableText value={data.personalInformation.email} path="personalInformation.email" /></div> : null}
            {data.personalInformation.phoneNumber ? <div><EditableText value={data.personalInformation.phoneNumber} path="personalInformation.phoneNumber" /></div> : null}
            {linkedin ? <div><EditableText value={linkedin} path="personalInformation.linkedin" /></div> : null}
          </div>
        </div>
      </div>

      <div className="p-8 grid md:grid-cols-[1.18fr_0.82fr] gap-8">
        <section className="relative">
          {sectionHeading("Experience", accentColor)}
          <div className="absolute left-[14px] top-16 bottom-0 w-[2px]" style={{ background: `linear-gradient(180deg, ${accentColor}, transparent)` }} />
          <div className="space-y-6 mt-6">
            {displayExperience.map((exp, idx) => (
              <div key={idx} className="relative pl-12">
                <div
                  className="absolute left-0 top-1 h-7 w-7 rounded-full border-[6px]"
                  style={{ background: "#ffffff", borderColor: accentColor }}
                />
                <div className="rounded-2xl p-5" style={{ background: "#f9fbff", border: `1px solid ${theme.border}` }}>
                  <div className="flex justify-between gap-4">
                    <div>
                      <div className="font-bold text-lg">
                        <EditableText value={exp.jobTitle} path={`experience.${idx}.jobTitle`} />
                      </div>
                      <div className="text-sm" style={{ color: theme.muted }}>
                        <EditableText value={exp.company} path={`experience.${idx}.company`} />{" "}
                        <EditableText value={exp.location} path={`experience.${idx}.location`} />
                      </div>
                    </div>
                    <div className="text-sm" style={{ color: theme.muted }}>
                      <EditableText value={exp.duration} path={`experience.${idx}.duration`} />
                    </div>
                  </div>
                  {exp.responsibility ? (
                    <p className="mt-3 text-sm leading-7" style={{ color: theme.text }}>
                      <EditableText value={exp.responsibility} path={`experience.${idx}.responsibility`} multiline />
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-6">
          {renderRating()}
          <section className="rounded-3xl p-5" style={{ background: "#f9fbff", border: `1px solid ${theme.border}` }}>
            {sectionHeading("Summary", accentColor)}
            <p className="text-sm leading-7" style={{ color: theme.muted }}>
              <EditableText value={data.summary} path="summary" multiline />
            </p>
          </section>
          {data.skills?.length ? (
            <section className="rounded-3xl p-5" style={{ background: "#f9fbff", border: `1px solid ${theme.border}` }}>
              {sectionHeading("Skills", accentColor)}
              <div className="flex flex-wrap gap-2">
                {data.skills.map((skill, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full text-xs"
                    style={{ background: "#e8f0ff", color: theme.text }}
                  >
                    <EditableText value={skill.title} path={`skills.${idx}.title`} />
                  </span>
                ))}
              </div>
            </section>
          ) : null}
          {data.projects?.length ? (
            <section className="rounded-3xl p-5" style={{ background: "#f9fbff", border: `1px solid ${theme.border}` }}>
              {sectionHeading("Projects", accentColor)}
              <div className="space-y-3 text-sm">
                {data.projects.map((project, idx) => (
                  <div key={idx}>
                    <div className="font-semibold">
                      <EditableText value={project.title} path={`projects.${idx}.title`} />
                    </div>
                    <div style={{ color: theme.muted }}>
                      <EditableText value={project.description} path={`projects.${idx}.description`} multiline />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );

  const renderSpotlight = () => (
    <div
      id="resume-preview"
      ref={resumeRef}
      className="rounded-[30px] shadow-2xl overflow-hidden"
      style={{ ...pageStyle, background: theme.background, color: theme.text, border: `1px solid ${theme.border}` }}
    >
      <div className="p-8">
        <div
          className="rounded-[28px] p-8 text-white"
          style={{ background: `linear-gradient(135deg, ${accentColor}, #ffbe88)` }}
        >
          <div className="grid md:grid-cols-[0.85fr_1.15fr] gap-8 items-center">
            <div className="space-y-4">
              {renderAvatar(118)}
              <div>
                <div className="text-4xl font-bold leading-tight text-slate-900">
                  <EditableText value={data.personalInformation.fullName} path="personalInformation.fullName" />
                </div>
                <div className="mt-2 text-sm text-slate-900/75">
                  <EditableText value={data.personalInformation.location} path="personalInformation.location" />
                </div>
              </div>
              <div className="text-sm space-y-2 text-slate-900/80">
                {data.personalInformation.email ? <div><EditableText value={data.personalInformation.email} path="personalInformation.email" /></div> : null}
                {data.personalInformation.phoneNumber ? <div><EditableText value={data.personalInformation.phoneNumber} path="personalInformation.phoneNumber" /></div> : null}
                {linkedin ? <div><EditableText value={linkedin} path="personalInformation.linkedin" /></div> : null}
              </div>
            </div>
            <div className="rounded-[24px] p-6 bg-white/25 backdrop-blur-sm border border-white/20">
              <div className="text-xs uppercase tracking-[0.28em] text-slate-900/60 mb-3">Spotlight Summary</div>
              <p className="text-base leading-8 text-slate-900">
                <EditableText value={data.summary} path="summary" multiline />
              </p>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-[1.1fr_0.9fr] gap-6 mt-6">
          <section className="rounded-[28px] p-6" style={{ background: theme.card, border: `1px solid ${theme.border}` }}>
            {sectionHeading("Impact Experience", accentColor)}
            <div className="space-y-5">
              {displayExperience.map((exp, idx) => (
                <div key={idx} className="border-b pb-4 last:border-b-0" style={{ borderColor: theme.border }}>
                  <div className="flex justify-between gap-4">
                    <div>
                      <div className="font-bold text-lg">
                        <EditableText value={exp.jobTitle} path={`experience.${idx}.jobTitle`} />
                      </div>
                      <div className="text-sm" style={{ color: theme.muted }}>
                        <EditableText value={exp.company} path={`experience.${idx}.company`} />{" "}
                        <EditableText value={exp.location} path={`experience.${idx}.location`} />
                      </div>
                    </div>
                    <div className="text-sm" style={{ color: theme.muted }}>
                      <EditableText value={exp.duration} path={`experience.${idx}.duration`} />
                    </div>
                  </div>
                  {exp.responsibility ? (
                    <p className="mt-3 text-sm leading-7" style={{ color: theme.text }}>
                      <EditableText value={exp.responsibility} path={`experience.${idx}.responsibility`} multiline />
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <div className="space-y-6">
            {renderRating()}
            {data.skills?.length ? (
              <section className="rounded-[28px] p-6" style={{ background: "#fff4ea", border: `1px solid ${theme.border}` }}>
                {sectionHeading("Top Skills", accentColor)}
                <div className="flex flex-wrap gap-2">
                  {data.skills.map((skill, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 rounded-full text-xs"
                      style={{ background: "#ffffff", border: `1px solid ${theme.border}` }}
                    >
                      <EditableText value={skill.title} path={`skills.${idx}.title`} />
                    </span>
                  ))}
                </div>
              </section>
            ) : null}
            {data.education?.length ? (
              <section className="rounded-[28px] p-6" style={{ background: "#fff4ea", border: `1px solid ${theme.border}` }}>
                {sectionHeading("Education", accentColor)}
                <div className="space-y-3 text-sm">
                  {data.education.map((edu, idx) => (
                    <div key={idx}>
                      <div className="font-semibold">
                        <EditableText value={edu.degree} path={`education.${idx}.degree`} />
                      </div>
                      <div style={{ color: theme.muted }}>
                        <EditableText value={edu.university} path={`education.${idx}.university`} />{" "}
                        <EditableText value={edu.graduationYear} path={`education.${idx}.graduationYear`} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );

  const renderAvatar = (size = 120) => {
    const initials =
      (data.personalInformation.fullName || "A")
        .split(" ")
        .filter(Boolean)
        .slice(0, 1)
        .map((n) => n[0]?.toUpperCase())
        .join("") || "A";
    const photo = data.personalInformation.photo || data.personalInformation.photoUrl;
    const dimension = `${size}px`;
    if (photo) {
      return (
        <div
          className="mx-auto rounded-full overflow-hidden shadow-lg border"
          style={{ width: dimension, height: dimension, borderColor: theme.border }}
        >
          <img
            src={photo}
            alt="Profile"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
      );
    }
    // If no photo is provided, skip rendering an avatar to avoid the default circle with initials.
    return null;
  };

  const handleFieldChange = (path) => (value) => {
    if (!editable || !onChange) return;
    let nextValue = value;
    if (path.endsWith("technologiesUsed")) {
      nextValue = String(value || "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
    onChange(path, nextValue);
  };

  const EditableText = ({ value, path, className = "", multiline = false }) => {
    if (!editable) {
      return <span className={className}>{value}</span>;
    }
    const Tag = "span";
    return (
      <Tag
        className={`${className} ${multiline ? "inline-block" : ""} cursor-text outline-none focus:ring-2 focus:ring-offset-2 focus:ring-sky-400/50 rounded-sm px-1`}
        style={multiline ? { whiteSpace: "pre-wrap" } : undefined}
        contentEditable
        suppressContentEditableWarning
        onBlur={(e) => {
          const text = multiline ? e.currentTarget.innerText : e.currentTarget.textContent;
          handleFieldChange(path)((text || "").trim());
        }}
        onKeyDown={(e) => {
          if (!multiline && e.key === "Enter") {
            e.preventDefault();
            e.currentTarget.blur();
          }
        }}
      >
        {value || ""}
      </Tag>
    );
  };

  const renderPrism = () => (
    <div
      id="resume-preview"
      ref={resumeRef}
      className="rounded-[30px] shadow-2xl overflow-hidden"
      style={{ ...pageStyle, background: theme.background, color: theme.text, border: `1px solid ${theme.border}` }}
    >
      <div className="relative overflow-hidden px-8 py-9" style={{ background: `linear-gradient(135deg, ${accentColor}, #9fd4ff 62%, #ffffff 100%)` }}>
        <div className="absolute -right-16 -top-16 h-44 w-44 rotate-12 rounded-[2rem] bg-white/20" />
        <div className="absolute right-20 bottom-[-2rem] h-28 w-28 rotate-12 rounded-[1.5rem] bg-white/15" />
        <div className="relative grid md:grid-cols-[1.1fr_0.9fr] gap-6 items-end">
          <div>
            <div className="text-xs uppercase tracking-[0.3em] text-slate-900/55 mb-3">Prism Layout</div>
            <div className="text-5xl font-bold leading-none text-slate-950">
              <EditableText value={data.personalInformation.fullName} path="personalInformation.fullName" />
            </div>
            <div className="mt-3 text-sm text-slate-900/75">
              <EditableText value={data.personalInformation.location} path="personalInformation.location" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl p-4 bg-white/40 backdrop-blur-sm">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-900/50">Contact</div>
              <div className="mt-2 text-sm text-slate-900/75">
                {data.personalInformation.email ? <div><EditableText value={data.personalInformation.email} path="personalInformation.email" /></div> : null}
                {data.personalInformation.phoneNumber ? <div><EditableText value={data.personalInformation.phoneNumber} path="personalInformation.phoneNumber" /></div> : null}
              </div>
            </div>
            <div className="rounded-2xl p-4 bg-white/40 backdrop-blur-sm">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-900/50">Links</div>
              <div className="mt-2 text-sm text-slate-900/75">
                {linkedin ? <div><EditableText value={linkedin} path="personalInformation.linkedin" /></div> : null}
                {data.personalInformation.portfolio ? <div><EditableText value={data.personalInformation.portfolio} path="personalInformation.portfolio" /></div> : null}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="p-8 grid md:grid-cols-[1.1fr_0.9fr] gap-6">
        <main className="space-y-6">
          <section className="rounded-3xl p-6" style={{ background: "#ffffff", border: `1px solid ${theme.border}` }}>
            {sectionHeading("Summary", accentColor)}
            <p className="text-sm leading-7" style={{ color: theme.muted }}>
              <EditableText value={data.summary} path="summary" multiline />
            </p>
          </section>
          <section className="space-y-4">
            {sectionHeading("Experience", accentColor)}
            {displayExperience.map((exp, idx) => (
              <div key={idx} className="rounded-3xl p-5" style={{ background: "#ffffff", border: `1px solid ${theme.border}` }}>
                <div className="flex justify-between gap-4">
                  <div>
                    <div className="font-bold text-lg">
                      <EditableText value={exp.jobTitle} path={`experience.${idx}.jobTitle`} />
                    </div>
                    <div className="text-sm" style={{ color: theme.muted }}>
                      <EditableText value={exp.company} path={`experience.${idx}.company`} />{" "}
                      <EditableText value={exp.location} path={`experience.${idx}.location`} />
                    </div>
                  </div>
                  <div className="text-sm" style={{ color: theme.muted }}>
                    <EditableText value={exp.duration} path={`experience.${idx}.duration`} />
                  </div>
                </div>
                {exp.responsibility ? (
                  <p className="mt-3 text-sm leading-7" style={{ color: theme.text }}>
                    <EditableText value={exp.responsibility} path={`experience.${idx}.responsibility`} multiline />
                  </p>
                ) : null}
              </div>
            ))}
          </section>
        </main>
        <aside className="space-y-6">
          {renderRating()}
          {data.skills?.length ? (
            <section className="rounded-3xl p-6" style={{ background: "#eef6ff", border: `1px solid ${theme.border}` }}>
              {sectionHeading("Skill Prism", accentColor)}
              <div className="flex flex-wrap gap-2">
                {data.skills.map((skill, idx) => (
                  <span key={idx} className="px-3 py-1 rounded-full text-xs" style={{ background: "#ffffff", border: `1px solid ${theme.border}` }}>
                    <EditableText value={skill.title} path={`skills.${idx}.title`} />
                  </span>
                ))}
              </div>
            </section>
          ) : null}
          {data.projects?.length ? (
            <section className="rounded-3xl p-6" style={{ background: "#eef6ff", border: `1px solid ${theme.border}` }}>
              {sectionHeading("Projects", accentColor)}
              <div className="space-y-3 text-sm">
                {data.projects.map((project, idx) => (
                  <div key={idx}>
                    <div className="font-semibold">
                      <EditableText value={project.title} path={`projects.${idx}.title`} />
                    </div>
                    <div style={{ color: theme.muted }}>
                      <EditableText value={project.description} path={`projects.${idx}.description`} multiline />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </aside>
      </div>
    </div>
  );

  const renderDossier = () => (
    <div
      id="resume-preview"
      ref={resumeRef}
      className="rounded-[30px] shadow-2xl overflow-hidden"
      style={{ ...pageStyle, background: theme.background, color: theme.text, border: `1px solid ${theme.border}` }}
    >
      <div className="grid md:grid-cols-[0.43fr_0.57fr] min-h-full">
        <aside
          className="p-8 space-y-7"
          style={{ background: theme.sidebar || "#eef2f6", borderRight: `1px solid ${theme.border}` }}
        >
          {renderRating()}

          <section>
            <div className="text-[2.15rem] font-bold leading-tight tracking-tight">
              <EditableText value={data.personalInformation.fullName} path="personalInformation.fullName" />
            </div>
            <div
              className="mt-3 text-base font-medium"
              style={{ color: theme.muted }}
            >
              <EditableText value={primaryRole} path="personalInformation.summaryTitle" />
            </div>
          </section>

          <section>
            <div
              className="border-b pb-2 text-[0.95rem] uppercase tracking-[0.12em]"
              style={{ borderColor: theme.rule || "#aeb9ca", color: theme.heading || "#3c4c63" }}
            >
              Details
            </div>
            <div className="mt-4 space-y-3 text-sm" style={{ color: theme.sidebarText || "#46566f" }}>
              {data.personalInformation.email ? (
                <div className="flex items-start gap-3">
                  <FaEnvelope className="mt-1 shrink-0" />
                  <EditableText value={data.personalInformation.email} path="personalInformation.email" />
                </div>
              ) : null}
              {data.personalInformation.phoneNumber ? (
                <div className="flex items-start gap-3">
                  <FaPhone className="mt-1 shrink-0" />
                  <EditableText value={data.personalInformation.phoneNumber} path="personalInformation.phoneNumber" />
                </div>
              ) : null}
              {data.personalInformation.location ? (
                <div className="flex items-start gap-3">
                  <span className="mt-[2px] text-base leading-none shrink-0">•</span>
                  <EditableText value={data.personalInformation.location} path="personalInformation.location" />
                </div>
              ) : null}
            </div>
          </section>

          {sidebarSkillEntries.length ? (
            <section>
            <div
              className="border-b pb-2 text-[0.95rem] uppercase tracking-[0.12em]"
              style={{ borderColor: theme.rule || "#aeb9ca", color: theme.heading || "#3c4c63" }}
            >
              Skills
            </div>
            <ul className="mt-4 space-y-2 text-sm" style={{ color: theme.sidebarText || "#46566f" }}>
                {sidebarSkillEntries.map((skill) => (
                  <li key={skill._originalIndex} className="flex items-start gap-2">
                    <span className="mt-1 text-base leading-none shrink-0" style={{ color: accentColor }}>
                      •
                    </span>
                    <EditableText value={skill.title} path={`skills.${skill._originalIndex}.title`} />
                  </li>
                ))}
              </ul>
              {skillEntries.length > sidebarSkillEntries.length ? (
                <div className="mt-3 text-xs font-medium uppercase tracking-[0.08em]" style={{ color: theme.muted }}>
                  +{skillEntries.length - sidebarSkillEntries.length} more captured in the editor
                </div>
              ) : null}
            </section>
          ) : null}

          {socialLinks.length ? (
            <section>
            <div
              className="border-b pb-2 text-[0.95rem] uppercase tracking-[0.12em]"
              style={{ borderColor: theme.rule || "#aeb9ca", color: theme.heading || "#3c4c63" }}
            >
              Social Links
            </div>
            <div className="mt-4 space-y-3 text-sm break-all" style={{ color: theme.sidebarText || "#46566f" }}>
                {socialLinks.map((link) => (
                  <div key={link.label} className="flex items-start gap-3">
                    {link.label === "LinkedIn" ? (
                      <FaLinkedin className="mt-1 shrink-0" />
                    ) : link.label === "GitHub" ? (
                      <FaGithub className="mt-1 shrink-0" />
                    ) : (
                      <span className="mt-[2px] text-base leading-none shrink-0">•</span>
                    )}
                    <div>
                      <div className="font-medium">{link.label}</div>
                      <EditableText value={link.value} path={link.path} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {(languageEntries.length || certificationEntries.length || achievementEntries.length) ? (
            <section>
            <div
              className="border-b pb-2 text-[0.95rem] uppercase tracking-[0.12em]"
              style={{ borderColor: theme.rule || "#aeb9ca", color: theme.heading || "#3c4c63" }}
            >
              Extras
            </div>
            <div className="mt-4 space-y-3 text-sm" style={{ color: theme.sidebarText || "#46566f" }}>
                {languageEntries.length ? (
                  <div>
                    <div className="font-medium">Languages</div>
                    <div className="mt-1">
                      {languageEntries.map((item, idx) => (
                        <span key={idx}>
                          {idx > 0 ? ", " : ""}
                          <EditableText value={item.name} path={`languages.${idx}.name`} />
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                {certificationEntries.slice(0, 3).map((item, idx) => (
                  <div key={`cert-${idx}`}>
                    <div className="font-medium">
                      <EditableText value={item.title} path={`certifications.${idx}.title`} />
                    </div>
                    <div>
                      {item.issuingOrganization ? (
                        <EditableText
                          value={item.issuingOrganization}
                          path={`certifications.${idx}.issuingOrganization`}
                        />
                      ) : null}
                      {item.issuingOrganization && item.year ? " • " : ""}
                      {item.year ? (
                        <EditableText value={item.year} path={`certifications.${idx}.year`} />
                      ) : null}
                    </div>
                  </div>
                ))}
                {achievementEntries.slice(0, 2).map((item, idx) => (
                  <div key={`achievement-${idx}`}>
                    <div className="font-medium">
                      <EditableText value={item.title} path={`achievements.${idx}.title`} />
                    </div>
                    <div>
                      <EditableText value={item.extraInformation || item.year} path={`achievements.${idx}.extraInformation`} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </aside>

        <main className="p-8" style={{ background: theme.card }}>
          {hasText(data.summary) ? (
            <section className="pb-6">
              <div
                className="border-b pb-2 text-[1.05rem] uppercase tracking-[0.12em]"
                style={{ borderColor: theme.rule || "#aeb9ca", color: theme.heading || "#3c4c63" }}
              >
                Summary
              </div>
              <p className="mt-4 text-[15px] leading-7" style={{ color: theme.sidebarText || "#4f6079" }}>
                <EditableText value={data.summary} path="summary" multiline />
              </p>
            </section>
          ) : null}

          {experiences.length ? (
            <section className="pb-6">
              <div
                className="border-b pb-2 text-[1.05rem] uppercase tracking-[0.12em]"
                style={{ borderColor: theme.rule || "#aeb9ca", color: theme.heading || "#3c4c63" }}
              >
                Experience
              </div>
              <div className="mt-4 space-y-5">
                {experiences.map((exp, idx) => (
                  <div key={idx}>
                    {exp.duration ? (
                      <div className="text-sm" style={{ color: theme.muted }}>
                        <EditableText value={exp.duration} path={`experience.${idx}.duration`} />
                      </div>
                    ) : null}
                    <div className="mt-1 text-xl font-bold">
                      <EditableText value={exp.jobTitle} path={`experience.${idx}.jobTitle`} />
                    </div>
                    {(exp.company || exp.location) ? (
                      <div className="mt-1 text-sm" style={{ color: theme.sidebarText || "#4f6079" }}>
                        {exp.company ? (
                          <EditableText value={exp.company} path={`experience.${idx}.company`} />
                        ) : null}
                        {exp.company && exp.location ? ", " : ""}
                        {exp.location ? (
                          <EditableText value={exp.location} path={`experience.${idx}.location`} />
                        ) : null}
                      </div>
                    ) : null}
                    {exp.responsibility ? (
                      <p className="mt-3 text-[15px] leading-7" style={{ color: theme.sidebarText || "#4f6079" }}>
                        <EditableText
                          value={exp.responsibility}
                          path={`experience.${idx}.responsibility`}
                          multiline
                        />
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {educationEntries.length ? (
            <section className="pb-6">
              <div
                className="border-b pb-2 text-[1.05rem] uppercase tracking-[0.12em]"
                style={{ borderColor: theme.rule || "#aeb9ca", color: theme.heading || "#3c4c63" }}
              >
                Education
              </div>
              <div className="mt-4 space-y-5">
                {educationEntries.map((edu, idx) => (
                  <div key={idx}>
                    {edu.graduationYear ? (
                      <div className="text-sm" style={{ color: theme.muted }}>
                        <EditableText value={edu.graduationYear} path={`education.${idx}.graduationYear`} />
                      </div>
                    ) : null}
                    <div className="mt-1 text-lg font-bold">
                      <EditableText value={edu.degree} path={`education.${idx}.degree`} />
                    </div>
                    <div className="mt-1 text-sm" style={{ color: theme.sidebarText || "#4f6079" }}>
                      {edu.university ? (
                        <EditableText value={edu.university} path={`education.${idx}.university`} />
                      ) : null}
                      {edu.university && edu.location ? ", " : ""}
                      {edu.location ? (
                        <EditableText value={edu.location} path={`education.${idx}.location`} />
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {projectEntries.length ? (
            <section className="pb-2">
              <div
                className="border-b pb-2 text-[1.05rem] uppercase tracking-[0.12em]"
                style={{ borderColor: theme.rule || "#aeb9ca", color: theme.heading || "#3c4c63" }}
              >
                Projects
              </div>
              <div className="mt-4 space-y-4">
                {projectEntries.map((project, idx) => (
                  <div key={idx}>
                    <div className="text-lg font-bold">
                      <EditableText value={project.title} path={`projects.${idx}.title`} />
                    </div>
                    {project.description ? (
                      <p className="mt-2 text-[15px] leading-7" style={{ color: theme.sidebarText || "#4f6079" }}>
                        <EditableText
                          value={project.description}
                          path={`projects.${idx}.description`}
                          multiline
                        />
                      </p>
                    ) : null}
                    {normalizeStringList(project.technologiesUsed).length ? (
                      <div className="mt-2 text-sm" style={{ color: theme.muted }}>
                        <EditableText
                          value={normalizeStringList(project.technologiesUsed).join(", ")}
                          path={`projects.${idx}.technologiesUsed`}
                        />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}
        </main>
      </div>
    </div>
  );

  const renderFrame = () => (
    <div
      id="resume-preview"
      ref={resumeRef}
      className="rounded-[30px] shadow-2xl overflow-hidden"
      style={{ ...pageStyle, background: theme.background, color: theme.text, border: `14px solid ${accentColor}` }}
    >
      <div className="p-8 border-b" style={{ borderColor: theme.border }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-[0.3em]" style={{ color: theme.muted }}>Framed Resume</div>
            <div className="text-4xl font-bold mt-2">
              <EditableText value={data.personalInformation.fullName} path="personalInformation.fullName" />
            </div>
          </div>
          <div className="flex flex-wrap gap-3 text-sm" style={{ color: theme.muted }}>
            {data.personalInformation.email ? <span><EditableText value={data.personalInformation.email} path="personalInformation.email" /></span> : null}
            {data.personalInformation.phoneNumber ? <span><EditableText value={data.personalInformation.phoneNumber} path="personalInformation.phoneNumber" /></span> : null}
            {linkedin ? <span><EditableText value={linkedin} path="personalInformation.linkedin" /></span> : null}
          </div>
        </div>
      </div>
      <div className="p-8 grid md:grid-cols-2 gap-6">
        <section className="rounded-[26px] p-6" style={{ background: "#fff8f0", border: `1px solid ${theme.border}` }}>
          {sectionHeading("Profile", accentColor)}
          <p className="text-sm leading-7" style={{ color: theme.muted }}>
            <EditableText value={data.summary} path="summary" multiline />
          </p>
        </section>
        <section className="rounded-[26px] p-6" style={{ background: "#fff8f0", border: `1px solid ${theme.border}` }}>
          {sectionHeading("Skills", accentColor)}
          <div className="flex flex-wrap gap-2">
            {data.skills.map((skill, idx) => (
              <span key={idx} className="px-3 py-1 rounded-full text-xs" style={{ background: "#ffffff", border: `1px solid ${theme.border}` }}>
                <EditableText value={skill.title} path={`skills.${idx}.title`} />
              </span>
            ))}
          </div>
        </section>
        <section className="md:col-span-2 rounded-[26px] p-6" style={{ background: "#ffffff", border: `1px solid ${theme.border}` }}>
          {sectionHeading("Experience", accentColor)}
          <div className="space-y-4">
            {displayExperience.map((exp, idx) => (
              <div key={idx} className="rounded-2xl p-4" style={{ background: "#fff8f0", border: `1px solid ${theme.border}` }}>
                <div className="flex justify-between gap-4">
                  <div>
                    <div className="font-bold">
                      <EditableText value={exp.jobTitle} path={`experience.${idx}.jobTitle`} />
                    </div>
                    <div className="text-sm" style={{ color: theme.muted }}>
                      <EditableText value={exp.company} path={`experience.${idx}.company`} />{" "}
                      <EditableText value={exp.location} path={`experience.${idx}.location`} />
                    </div>
                  </div>
                  <div className="text-sm" style={{ color: theme.muted }}>
                    <EditableText value={exp.duration} path={`experience.${idx}.duration`} />
                  </div>
                </div>
                <p className="mt-3 text-sm leading-7" style={{ color: theme.text }}>
                  <EditableText value={exp.responsibility} path={`experience.${idx}.responsibility`} multiline />
                </p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-[26px] p-6" style={{ background: "#ffffff", border: `1px solid ${theme.border}` }}>
          {sectionHeading("Education", accentColor)}
          <div className="space-y-3 text-sm">
            {data.education.map((edu, idx) => (
              <div key={idx}>
                <div className="font-semibold">
                  <EditableText value={edu.degree} path={`education.${idx}.degree`} />
                </div>
                <div style={{ color: theme.muted }}>
                  <EditableText value={edu.university} path={`education.${idx}.university`} />
                </div>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-[26px] p-6" style={{ background: "#ffffff", border: `1px solid ${theme.border}` }}>
          {sectionHeading("Projects", accentColor)}
          <div className="space-y-3 text-sm">
            {data.projects.map((project, idx) => (
              <div key={idx}>
                <div className="font-semibold">
                  <EditableText value={project.title} path={`projects.${idx}.title`} />
                </div>
                <div style={{ color: theme.muted }}>
                  <EditableText value={project.description} path={`projects.${idx}.description`} multiline />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );

  const renderZen = () => (
    <div
      id="resume-preview"
      ref={resumeRef}
      className="rounded-[30px] shadow-2xl overflow-hidden"
      style={{ ...pageStyle, background: theme.background, color: theme.text, border: `1px solid ${theme.border}` }}
    >
      <div className="p-12 text-center">
        {renderAvatar(120)}
        <div className="mt-5 text-4xl font-bold">
          <EditableText value={data.personalInformation.fullName} path="personalInformation.fullName" />
        </div>
        <div className="mt-3 text-sm" style={{ color: theme.muted }}>
          <EditableText value={data.personalInformation.location} path="personalInformation.location" />
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-4 text-sm" style={{ color: theme.muted }}>
          {data.personalInformation.email ? <span><EditableText value={data.personalInformation.email} path="personalInformation.email" /></span> : null}
          {data.personalInformation.phoneNumber ? <span><EditableText value={data.personalInformation.phoneNumber} path="personalInformation.phoneNumber" /></span> : null}
          {linkedin ? <span><EditableText value={linkedin} path="personalInformation.linkedin" /></span> : null}
        </div>
      </div>
      <div className="px-12 pb-10 space-y-8">
        {renderRating()}
        <section className="text-center max-w-3xl mx-auto">
          {sectionHeading("Summary", accentColor)}
          <p className="text-sm leading-8" style={{ color: theme.muted }}>
            <EditableText value={data.summary} path="summary" multiline />
          </p>
        </section>
        <div className="grid md:grid-cols-3 gap-8">
          <section className="md:col-span-2">
            {sectionHeading("Experience", accentColor)}
            <div className="space-y-5">
              {displayExperience.map((exp, idx) => (
                <div key={idx} className="pb-5 border-b" style={{ borderColor: theme.border }}>
                  <div className="flex justify-between gap-4">
                    <div>
                      <div className="font-semibold text-lg">
                        <EditableText value={exp.jobTitle} path={`experience.${idx}.jobTitle`} />
                      </div>
                      <div className="text-sm" style={{ color: theme.muted }}>
                        <EditableText value={exp.company} path={`experience.${idx}.company`} />{" "}
                        <EditableText value={exp.location} path={`experience.${idx}.location`} />
                      </div>
                    </div>
                    <div className="text-sm" style={{ color: theme.muted }}>
                      <EditableText value={exp.duration} path={`experience.${idx}.duration`} />
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-7" style={{ color: theme.text }}>
                    <EditableText value={exp.responsibility} path={`experience.${idx}.responsibility`} multiline />
                  </p>
                </div>
              ))}
            </div>
          </section>
          <aside className="space-y-8">
            <section>
              {sectionHeading("Skills", accentColor)}
              <div className="flex flex-wrap gap-2">
                {data.skills.map((skill, idx) => (
                  <span key={idx} className="px-3 py-1 rounded-full text-xs" style={{ background: "#eef5f2", color: theme.text }}>
                    <EditableText value={skill.title} path={`skills.${idx}.title`} />
                  </span>
                ))}
              </div>
            </section>
            <section>
              {sectionHeading("Education", accentColor)}
              <div className="space-y-3 text-sm">
                {data.education.map((edu, idx) => (
                  <div key={idx}>
                    <div className="font-semibold">
                      <EditableText value={edu.degree} path={`education.${idx}.degree`} />
                    </div>
                    <div style={{ color: theme.muted }}>
                      <EditableText value={edu.university} path={`education.${idx}.university`} />
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );

  const renderClassic = () => (
    <div
      id="resume-preview"
      ref={resumeRef}
      className="shadow-2xl rounded-lg p-8 space-y-6"
      style={{ ...pageStyle, background: theme.card, color: theme.text, border: `1px solid ${theme.border}` }}
    >
      <div className="text-center space-y-3">
        {renderAvatar(140)}
        <h1 className="text-4xl font-bold" style={{ color: accentColor }}>
          <EditableText value={data.personalInformation.fullName} path="personalInformation.fullName" />
        </h1>
        <p className="text-sm" style={{ color: theme.muted }}>
          <EditableText value={data.personalInformation.location} path="personalInformation.location" />
        </p>
        <div className="flex flex-wrap justify-center gap-3 text-sm text-center leading-relaxed" style={{ color: theme.muted }}>
          {data.personalInformation.email && (
            <span className="break-all">
              <FaEnvelope className="inline mr-1" />
              <EditableText value={data.personalInformation.email} path="personalInformation.email" />
            </span>
          )}
          {data.personalInformation.phoneNumber && (
            <span className="break-all">
              <FaPhone className="inline mr-1" />
              <EditableText value={data.personalInformation.phoneNumber} path="personalInformation.phoneNumber" />
            </span>
          )}
          {linkedin && (
            <span className="break-all">
              <FaLinkedin className="inline mr-1" />
              <EditableText value={linkedin} path="personalInformation.linkedin" />
            </span>
          )}
          {data.personalInformation.portfolio && (
            <span className="break-all">
              <EditableText value={data.personalInformation.portfolio} path="personalInformation.portfolio" />
            </span>
          )}
        </div>
      </div>

      {renderRating()}

      <section>
        {sectionHeading("Summary", accentColor)}
        <p style={{ color: theme.muted }}>
          <EditableText value={data.summary} path="summary" multiline />
        </p>
      </section>

      <section>
        {sectionHeading("Skills", accentColor)}
        <div className="flex flex-wrap gap-2">
          {data.skills.map((s, i) => (
            <span key={i} className="badge badge-outline badge-lg px-4 py-2" style={{ borderColor: accentColor, color: theme.text }}>
              <EditableText value={s.title} path={`skills.${i}.title`} />
            </span>
          ))}
        </div>
      </section>

      <section>
        {sectionHeading("Experience", accentColor)}
        {displayExperience.map((exp, idx) => (
          <div key={idx} className="mb-4 p-4 rounded-lg shadow-sm" style={{ background: theme.background, border: `1px solid ${theme.border}` }}>
            <h3 className="text-lg font-bold" style={{ color: accentColor }}>
              <EditableText value={exp.jobTitle} path={`experience.${idx}.jobTitle`} />
            </h3>
            <p style={{ color: theme.muted }}>
              <EditableText value={exp.company} path={`experience.${idx}.company`} /> |{" "}
              <EditableText value={exp.location} path={`experience.${idx}.location`} /> |{" "}
              <EditableText value={exp.duration} path={`experience.${idx}.duration`} />
            </p>
            <p className="mt-2" style={{ color: theme.text }}>
              <EditableText value={exp.responsibility} path={`experience.${idx}.responsibility`} multiline />
            </p>
          </div>
        ))}
      </section>

      <section>
        {sectionHeading("Education", accentColor)}
        {data.education.map((edu, idx) => (
          <div key={idx} className="text-sm">
            <div className="font-semibold">
              <EditableText value={edu.degree} path={`education.${idx}.degree`} />   -{" "}
              <EditableText value={edu.university} path={`education.${idx}.university`} />
            </div>
            <div style={{ color: theme.muted }}>
              <EditableText value={edu.location} path={`education.${idx}.location`} />{" "}
              <EditableText value={edu.graduationYear} path={`education.${idx}.graduationYear`} />
            </div>
          </div>
        ))}
      </section>
    </div>
  );

  const renderTemplate = () => {
    if (resolvedTemplate === "navy-sidebar") return renderNavySidebar();
    if (resolvedTemplate === "crimson") return renderColorHeader(accentColor);
    if (resolvedTemplate === "lavender") return renderColorHeader(accentColor);
    if (resolvedTemplate === "blue-accent") return renderColorHeader(accentColor);
    if (resolvedTemplate === "prism") return renderPrism();
    if (resolvedTemplate === "dossier" || resolvedTemplate.startsWith("dossier-")) return renderDossier();
    if (resolvedTemplate === "frame") return renderFrame();
    if (resolvedTemplate === "zen") return renderZen();
    if (resolvedTemplate === "editorial") return renderEditorial();
    if (resolvedTemplate === "split-grid") return renderSplitGrid();
    if (resolvedTemplate === "timeline") return renderTimeline();
    if (resolvedTemplate === "spotlight") return renderSpotlight();
    if (resolvedTemplate === "modern") return renderModern();
    if (resolvedTemplate === "sleek") return renderSleek();
    if (resolvedTemplate === "minimal") return renderMinimal();
    return renderClassic();
  };

  return (
    <>
      {renderTemplate()}
      <section className="resume-preview-print-shell">
        <button
          type="button"
          onClick={handleDownloadPdf}
          className="resume-preview-print-button"
          style={{ "--resume-accent": accentColor }}
        >
          Print
        </button>
      </section>
    </>
  );
};

export default Resume;
