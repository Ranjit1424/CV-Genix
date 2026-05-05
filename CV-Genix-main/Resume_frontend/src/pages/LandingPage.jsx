import React from "react";
import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiBarChart2,
  FiBriefcase,
  FiCheckCircle,
  FiCpu,
  FiDownload,
  FiFileText,
  FiGrid,
  FiLayers,
  FiMail,
  FiMessageSquare,
  FiShield,
  FiTarget,
  FiUploadCloud,
  FiZap,
} from "react-icons/fi";

const heroMetrics = [
  { value: "12", label: "template layouts" },
  { value: "ATS", label: "job-match workflow" },
  { value: "PDF", label: "export-ready output" },
];

const proofPills = [
  "AI draft from rough notes",
  "Upload and review an existing resume",
  "Tailor copy to a job description",
  "Professional email drafts",
  "Edit, preview, and save in one workspace",
];

const coreFeatures = [
  {
    title: "AI Copilot Writing",
    description:
      "Turn raw notes into cleaner, recruiter-friendly bullets with a guided drafting flow.",
    icon: FiCpu,
    link: "/generate-resume?chatOnly=1",
    accent: "from-cyan-400/30 to-sky-500/10",
  },
  {
    title: "Template Stack",
    description:
      "Switch layouts instantly and keep your content synchronized across every design.",
    icon: FiLayers,
    link: "/generate-resume?openTemplates=1",
    accent: "from-fuchsia-400/25 to-rose-500/10",
  },
  {
    title: "Job Focus Mode",
    description:
      "Tune your summary, skills, and achievements for the exact role you want.",
    icon: FiTarget,
    link: "/generate-resume?openJob=1",
    accent: "from-amber-300/25 to-orange-500/10",
  },
  {
    title: "ATS Signal Check",
    description:
      "Catch missing keywords, weak phrasing, and structure issues before you apply.",
    icon: FiBarChart2,
    link: "/generate-resume?openAts=1",
    accent: "from-emerald-300/25 to-teal-500/10",
  },
  {
    title: "Upload and Rate",
    description:
      "Drop in your current resume and get a quality score with practical next steps.",
    icon: FiUploadCloud,
    link: "/rate-resume",
    accent: "from-violet-300/25 to-indigo-500/10",
  },
  {
    title: "Fast Export Flow",
    description:
      "Move from draft to polished resume quickly without fighting layout or formatting.",
    icon: FiDownload,
    link: "/generate-resume",
    accent: "from-blue-300/25 to-cyan-500/10",
  },
  {
    title: "Email Drafting",
    description:
      "Turn a short prompt into a professional email with a clear subject line and ready-to-send body.",
    icon: FiMail,
    link: "/email-generator",
    accent: "from-sky-300/25 to-indigo-500/10",
  },
];

const smartFeatures = [
  {
    title: "Live Job Board",
    description:
      "Browse live remote openings with LinkedIn-style search, filters, and saved jobs.",
    icon: FiBriefcase,
    link: "/placement-opportunities",
    accent: "from-sky-300/25 to-indigo-500/10",
  },
  {
    title: "AI Resume Suggestions",
    description:
      "Improve wording, fix grammar, and replace weak phrases with stronger action verbs.",
    icon: FiCpu,
    link: "/generate-resume?openChat=1",
    accent: "from-cyan-400/30 to-sky-500/10",
  },
  {
    title: "Job Matching System",
    description:
      "Compare your resume against a job description and surface the missing keywords.",
    icon: FiBarChart2,
    link: "/generate-resume?openAts=1",
    accent: "from-emerald-300/25 to-teal-500/10",
  },
  {
    title: "Skill Gap Analyzer",
    description:
      "Spot missing tools for a target role and get learning resources to close the gap.",
    icon: FiTarget,
    link: "/generate-resume?openJob=1",
    accent: "from-amber-300/25 to-orange-500/10",
  },
  {
    title: "Resume Version Manager",
    description:
      "Save multiple role-specific versions so you can switch between tailored resumes quickly.",
    icon: FiLayers,
    link: "/generate-resume",
    accent: "from-fuchsia-400/25 to-rose-500/10",
  },
  {
    title: "Portfolio Generator",
    description:
      "Turn a resume into a simple personal website with about, projects, and skills sections.",
    icon: FiGrid,
    link: "/generate-resume",
    accent: "from-blue-300/25 to-cyan-500/10",
  },
  {
    title: "Interview Question Generator",
    description:
      "Create technical and HR questions based on the resume and target role.",
    icon: FiMessageSquare,
    link: "/generate-resume",
    accent: "from-violet-300/25 to-indigo-500/10",
  },
  {
    title: "Voice-Based Resume Builder",
    description:
      "Speak your experience and let speech-to-text turn it into structured resume content.",
    icon: FiZap,
    link: "/generate-resume?openChat=1",
    accent: "from-emerald-300/25 to-cyan-500/10",
  },
  {
    title: "LinkedIn Profile Analyzer",
    description:
      "Review your LinkedIn headline and skill set for stronger profile positioning.",
    icon: FiShield,
    link: "/generate-resume?openAts=1",
    accent: "from-slate-300/25 to-sky-500/10",
  },
];

const workflow = [
  {
    step: "01",
    title: "Describe your background",
    description:
      "Paste experience notes, projects, internships, or a target role to set direction.",
  },
  {
    step: "02",
    title: "Shape the resume with AI",
    description:
      "Refine phrasing, strengthen outcomes, and align keywords to the job you want.",
  },
  {
    step: "03",
    title: "Preview, rate, and export",
    description:
      "Switch templates, run the ATS pass, and download a cleaner final PDF.",
  },
];

const audiences = [
  {
    title: "Freshers and students",
    copy:
      "Start from notes, coursework, projects, and internships without staring at a blank page.",
    icon: FiFileText,
  },
  {
    title: "Career switchers",
    copy:
      "Retell existing experience in a way that fits the role you are moving toward.",
    icon: FiBriefcase,
  },
  {
    title: "Developers and builders",
    copy:
      "Highlight projects, stacks, GitHub links, and measurable outcomes in a sharper format.",
    icon: FiShield,
  },
];

const templateGallery = [
  {
    title: "Classic",
    image: "/template-previews/classic.svg",
    tag: "Safe for corporate and campus roles",
  },
  {
    title: "Spotlight",
    image: "/template-previews/spotlight.svg",
    tag: "Stronger hero section for high-impact profiles",
  },
  {
    title: "Timeline",
    image: "/template-previews/timeline.svg",
    tag: "Great when experience progression matters",
  },
  {
    title: "Zen",
    image: "/template-previews/zen.svg",
    tag: "Minimal and calm for content-first resumes",
  },
];

const entryModes = [
  {
    title: "Start from a prompt",
    description:
      "Best when you only have rough notes and want AI to create the first structured draft.",
    points: ["Summary and sections generated", "Good for first resumes", "Fastest blank-page escape"],
    link: "/generate-resume",
    cta: "Open Builder",
  },
  {
    title: "Improve an existing resume",
    description:
      "Upload your current file, review ATS feedback, and then rewrite the weak spots.",
    points: ["Score and quality feedback", "Keyword gap hints", "Works well for revisions"],
    link: "/rate-resume",
    cta: "Rate Resume",
  },
  {
    title: "Use the copilot live",
    description:
      "Ask for bullet rewrites, role-specific summaries, and sharper project phrasing while you edit.",
    points: ["Chat-based wording help", "Role-tailored suggestions", "Fits the editing workflow"],
    link: "/generate-resume?openChat=1",
    cta: "Open Copilot",
  },
];

const LandingPage = () => {
  return (
    <div className="landing-page text-slate-100">
      <section className="landing-hero">
        <div className="landing-orb landing-orb-a" />
        <div className="landing-orb landing-orb-b" />
        <div className="landing-grid-lines" />

        <div className="mx-auto grid min-h-[calc(100vh-4.5rem)] max-w-7xl items-center gap-16 px-6 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:px-10">
          <div className="relative z-10">
            <span className="landing-badge">
              <FiGrid />
              AI resume studio
            </span>

            <h1 className="landing-title mt-6">
              Build a sharper resume with
              <span className="landing-title-glow"> AI drafting, ATS focus, and cleaner design.</span>
            </h1>

            <p className="landing-subtitle mt-6 max-w-2xl">
              Draft from rough notes, upload an existing resume, tailor it to a
              job description, then export a polished version from one guided
              workspace.
            </p>

            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link to="/generate-resume" className="landing-button-primary">
                Start Building
                <FiArrowRight />
              </Link>
              <Link to="/rate-resume" className="landing-button-secondary">
                Upload for Review
              </Link>
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              {proofPills.map((item) => (
                <div key={item} className="landing-proof-pill">
                  <FiCheckCircle />
                  <span>{item}</span>
                </div>
              ))}
            </div>

            <div className="mt-12 grid gap-4 sm:grid-cols-3">
              {heroMetrics.map((metric) => (
                <div key={metric.label} className="landing-metric-card">
                  <div className="landing-metric-value">{metric.value}</div>
                  <div className="landing-metric-label">{metric.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="signal-stage">
            <div className="signal-radar">
              <div className="signal-radar-ring signal-radar-ring-a" />
              <div className="signal-radar-ring signal-radar-ring-b" />
              <div className="signal-radar-ring signal-radar-ring-c" />
              <div className="signal-radar-core">
                <span className="signal-radar-label">Live Match</span>
                <strong>ATS</strong>
                <small>job alignment view</small>
              </div>
            </div>

            <div className="signal-card signal-card-top">
              <span className="signal-card-label">Resume Review</span>
              <strong>Upload and score</strong>
              <small>see gaps before applying</small>
            </div>

            <div className="signal-card signal-card-right">
              <span className="signal-card-label">AI Rewrite</span>
              <strong>Sharper bullets</strong>
              <small>impact language upgraded</small>
            </div>

            <div className="signal-card signal-card-bottom">
              <span className="signal-card-label">Export Flow</span>
              <strong>Template ready</strong>
              <small>PDF and profile save ready</small>
            </div>

            <div className="signal-dashboard">
              <div className="signal-dashboard-header">
                <div>
                  <p className="resume-overline">Workspace Preview</p>
                  <h3>Resume intelligence pipeline</h3>
                </div>
                <div className="resume-status-pill">
                  <FiCheckCircle />
                  Builder online
                </div>
              </div>

              <div className="signal-lanes">
                <div className="signal-lane">
                  <span className="signal-lane-title">
                    <FiLayers />
                    Content
                  </span>
                  <div className="signal-stream signal-stream-a">
                    <div className="signal-stream-card">
                      <strong>Summary tuned</strong>
                      <p>Role positioning clarified for the target job.</p>
                    </div>
                    <div className="signal-stream-card">
                      <strong>Projects ranked</strong>
                      <p>Best-fit work moves higher in the final layout.</p>
                    </div>
                  </div>
                </div>

                <div className="signal-lane signal-lane-center">
                  <span className="signal-lane-title">
                    <FiTarget />
                    Matching
                  </span>
                  <div className="signal-bars">
                    <div className="signal-bar-group">
                      <span>Skills</span>
                      <div className="signal-bar-track">
                        <div className="signal-bar-fill w-[88%]" />
                      </div>
                    </div>
                    <div className="signal-bar-group">
                      <span>ATS</span>
                      <div className="signal-bar-track">
                        <div className="signal-bar-fill w-[74%]" />
                      </div>
                    </div>
                    <div className="signal-bar-group">
                      <span>Impact</span>
                      <div className="signal-bar-track">
                        <div className="signal-bar-fill w-[81%]" />
                      </div>
                    </div>
                  </div>
                  <div className="signal-chip-cloud">
                    <span>React</span>
                    <span>Spring</span>
                    <span>Metrics</span>
                    <span>ATS</span>
                  </div>
                </div>

                <div className="signal-lane">
                  <span className="signal-lane-title">
                    <FiBarChart2 />
                    Output
                  </span>
                  <div className="signal-stream signal-stream-b">
                    <div className="signal-stream-card">
                      <strong>Sections structured</strong>
                      <p>Experience, skills, and projects stay easy to scan.</p>
                    </div>
                    <div className="signal-stream-card">
                      <strong>Template synced</strong>
                      <p>Layouts switch without rebuilding the content.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-8 lg:px-10">
        <div className="landing-proof-strip">
          <span>Built around your real workflow</span>
          <span>Generate</span>
          <span>Tailor</span>
          <span>Review</span>
          <span>Export</span>
          <span>Save to profile</span>
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-6 py-20 lg:px-10">
        <div className="landing-section-heading">
          <p className="landing-kicker">Core Tools</p>
          <h2>Everything important is already in one resume workflow.</h2>
          <p>
            Instead of separate disconnected pages, the product now tells a
            clearer story around drafting, tailoring, checking, and exporting.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {coreFeatures.map((feature) => {
            const Icon = feature.icon;

            return (
              <Link key={feature.title} to={feature.link} className="feature-card group">
                <div className={`feature-card-glow bg-gradient-to-br ${feature.accent}`} />
                <div className="feature-icon">
                  <Icon />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <span className="feature-link">
                  Open tool
                  <FiArrowRight />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
        <div className="landing-section-heading">
          <p className="landing-kicker">Smart Improvement Engine</p>
          <h2>Separate the newer intelligence features so they feel intentional, not buried.</h2>
          <p>
            These ideas map to the more advanced resume helpers: wording upgrades,
            job matching, skill gaps, versions, portfolio output, interview prep,
            voice input, and LinkedIn analysis.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {smartFeatures.map((feature) => {
            const Icon = feature.icon;

            return (
              <Link key={feature.title} to={feature.link} className="feature-card group">
                <div className={`feature-card-glow bg-gradient-to-br ${feature.accent}`} />
                <div className="feature-icon">
                  <Icon />
                </div>
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
                <span className="feature-link">
                  Open tool
                  <FiArrowRight />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-10">
        <div className="comparison-shell">
          <div className="landing-section-heading max-w-3xl">
            <p className="landing-kicker">Who This Helps</p>
            <h2>A stronger starting point for the three most common resume problems.</h2>
            <p>
              The site should feel useful whether someone is starting from
              nothing, revising a weak resume, or trying to match a specific
              role fast.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {audiences.map((item) => {
              const Icon = item.icon;

              return (
                <div key={item.title} className="comparison-card">
                  <div className="feature-icon">
                    <Icon />
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.copy}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="templates" className="mx-auto max-w-7xl px-6 pb-20 lg:px-10">
        <div className="template-showcase-shell">
          <div className="landing-section-heading max-w-3xl">
            <p className="landing-kicker">Template Gallery</p>
            <h2>Show the layouts on the homepage, not only after users click into the builder.</h2>
            <p>
              A resume product feels more credible when people can see the
              output quality immediately. These cards use your real preview
              assets.
            </p>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {templateGallery.map((template) => (
              <div key={template.title} className="template-showcase-card">
                <div className="template-showcase-frame">
                  <img
                    src={template.image}
                    alt={`${template.title} resume preview`}
                    className="template-showcase-image"
                    loading="lazy"
                  />
                </div>
                <div className="template-showcase-body">
                  <div className="template-showcase-title">{template.title}</div>
                  <div className="template-showcase-chip">{template.tag}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <Link to="/generate-resume?openTemplates=1" className="landing-button-secondary">
              Browse All Templates
              <FiArrowRight />
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-10">
        <div className="workflow-shell">
          <div className="landing-section-heading max-w-2xl">
            <p className="landing-kicker">Workflow</p>
            <h2>Three steps from rough input to polished output.</h2>
            <p>
              Keep the flow simple while the interface adds enough motion and
              depth to feel like a modern AI product.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {workflow.map((item) => (
              <div key={item.step} className="workflow-card">
                <span className="workflow-step">{item.step}</span>
                <h3>{item.title}</h3>
                <p>{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20 lg:px-10">
        <div className="mode-shell">
          <div className="landing-section-heading max-w-3xl">
            <p className="landing-kicker">Ways To Start</p>
            <h2>Give visitors a clear next move instead of one generic CTA.</h2>
            <p>
              This works like plan cards on commercial sites, but each option
              maps to a real feature you already support.
            </p>
          </div>

          <div className="mt-10 grid gap-6 lg:grid-cols-3">
            {entryModes.map((mode) => (
              <div key={mode.title} className="mode-card">
                <div className="mode-tag">{mode.title}</div>
                <p className="mode-copy">{mode.description}</p>
                <div className="mode-points">
                  {mode.points.map((point) => (
                    <div key={point} className="mode-point">
                      <FiCheckCircle />
                      <span>{point}</span>
                    </div>
                  ))}
                </div>
                <Link to={mode.link} className="mode-anchor">
                  {mode.cta}
                  <FiArrowRight />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24 lg:px-10">
        <div className="cta-shell">
          <div>
            <p className="landing-kicker">Start now</p>
            <h2>Design a resume that looks deliberate before a recruiter reads a word.</h2>
            <p>
              Use the builder, refine the copy, run the ATS check, and export a
              stronger final version from the same product.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link to="/generate-resume" className="landing-button-primary">
              Launch Resume Builder
              <FiArrowRight />
            </Link>
            <Link to="/rate-resume" className="landing-button-secondary">
              Check Existing Resume
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;
