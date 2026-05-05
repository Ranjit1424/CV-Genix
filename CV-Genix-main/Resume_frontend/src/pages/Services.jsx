import React from "react";
import { Link } from "react-router-dom";
import {
  FiArrowRight,
  FiCheckCircle,
  FiBriefcase,
  FiCpu,
  FiFileText,
  FiMessageCircle,
  FiMail,
  FiLayers,
  FiTarget,
  FiZap,
  FiTrendingUp,
} from "react-icons/fi";

const coreServices = [
  {
    title: "AI Resume Draft",
    desc: "Turn a simple description into a full resume draft with structured sections.",
    icon: FiCpu,
  },
  {
    title: "Resume Form Editing",
    desc: "Update name, contact, skills, experience, and projects with full control.",
    icon: FiFileText,
  },
  {
    title: "Templates and Preview",
    desc: "Pick a clean layout, preview instantly, and keep formatting consistent.",
    icon: FiLayers,
  },
  {
    title: "ATS Score and Tips",
    desc: "Get quick feedback to improve keywords, structure, and clarity.",
    icon: FiTarget,
  },
  {
    title: "PDF Export",
    desc: "Download a polished resume PDF ready to send to recruiters.",
    icon: FiArrowRight,
  },
  {
    title: "Resume Support",
    desc: "Use the built-in copilot for bullet ideas, summaries, and improvements.",
    icon: FiZap,
  },
  {
    title: "Email Generator",
    desc: "Write a professional email from a short prompt with a subject line and polished body.",
    icon: FiMail,
  },
  {
    title: "Live Job Board",
    desc: "Search remote roles in real time with filters, saved jobs, and live listings.",
    icon: FiBriefcase,
  },
];

const smartEngineServices = [
  {
    title: "AI Resume Suggestions",
    desc: "Rewrite weak wording, improve grammar, and replace vague lines with stronger action verbs.",
    icon: FiCpu,
  },
  {
    title: "Job Matching System",
    desc: "Compare a pasted job description against your resume and surface missing keywords.",
    icon: FiTarget,
  },
  {
    title: "Skill Gap Analyzer",
    desc: "Highlight missing skills for a target role and suggest learning resources.",
    icon: FiTrendingUp,
  },
  {
    title: "Resume Version Manager",
    desc: "Save multiple resume variants for different roles and return to them later.",
    icon: FiLayers,
  },
  {
    title: "Portfolio Generator",
    desc: "Convert a resume into a simple personal website with about, projects, and skills.",
    icon: FiZap,
  },
  {
    title: "Interview Question Generator",
    desc: "Create technical and HR questions based on the resume and chosen role.",
    icon: FiMessageCircle,
  },
];

function Services() {
  return (
    <div className="subpage-shell px-6 py-14 lg:px-10">
      <div className="subpage-inner mx-auto max-w-6xl space-y-10">
        <section className="subpage-hero-card">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <span className="subpage-badge">
                <FiZap />
                Services
              </span>

              <h1 className="subpage-heading">
                Everything you need to build a <span>stronger, cleaner resume.</span>
              </h1>

              <p className="subpage-copy max-w-2xl">
                These tools are grouped into the core builder workflow and the
                newer smart engine features so the product reads like a real
                platform, not a long checklist.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link to="/generate-resume" className="landing-button-primary">
                  Generate Resume
                </Link>
                <Link to="/email-generator" className="landing-button-secondary">
                  Generate Email
                </Link>
                <Link to="/interview-prep" className="landing-button-secondary">
                  Interview Prep
                </Link>
                <Link to="/contact" className="landing-button-secondary">
                  Contact Us
                </Link>
              </div>
            </div>

            <div className="subpage-glass-card">
              <p className="subpage-overline">Why It Works</p>
              <ul className="subpage-list">
                <li>
                  <FiCheckCircle className="subpage-list-icon mt-1" />
                  Fast generation with editable, structured fields.
                </li>
                <li>
                  <FiCheckCircle className="subpage-list-icon mt-1" />
                  Clean templates designed for readability and scan speed.
                </li>
                <li>
                  <FiCheckCircle className="subpage-list-icon mt-1" />
                  ATS-friendly guidance for keywords and stronger phrasing.
                </li>
                <li>
                  <FiCheckCircle className="subpage-list-icon mt-1" />
                  Export-ready PDF flow with minimal formatting cleanup.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="subpage-hero-card">
          <p className="subpage-overline">Core Workflow</p>
          <h2 className="subpage-title mb-4">The production features users can use right now.</h2>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {coreServices.map((service) => {
              const Icon = service.icon;

              return (
                <div key={service.title} className="subpage-grid-card">
                  <div className="feature-icon">
                    <Icon />
                  </div>
                  <h2 className="subpage-title">{service.title}</h2>
                  <p className="subpage-copy">{service.desc}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="subpage-hero-card">
          <p className="subpage-overline">Smart Improvement Engine</p>
          <h2 className="subpage-title mb-4">Advanced features that make the app feel smarter and more premium.</h2>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {smartEngineServices.map((service) => {
            const Icon = service.icon;

            return (
              <div key={service.title} className="subpage-grid-card">
                <div className="feature-icon">
                  <Icon />
                </div>
                <h2 className="subpage-title">{service.title}</h2>
                <p className="subpage-copy">{service.desc}</p>
              </div>
            );
          })}
          </div>
        </section>

        <section className="subpage-hero-card">
          <div className="grid gap-8 lg:grid-cols-3">
            <div>
              <p className="subpage-overline">Ideal For</p>
              <ul className="subpage-list">
                <li>
                  <FiTarget className="subpage-list-icon mt-1" />
                  Students and freshers building their first resume.
                </li>
                <li>
                  <FiTarget className="subpage-list-icon mt-1" />
                  Professionals updating skills and experience.
                </li>
                <li>
                  <FiTarget className="subpage-list-icon mt-1" />
                  Developers who want clean project highlights.
                </li>
              </ul>
            </div>

            <div>
              <p className="subpage-overline">Typical Flow</p>
              <ul className="subpage-list">
                <li>
                  <FiArrowRight className="subpage-list-icon mt-1" />
                  <span>
                    <strong>1. Enter</strong> your description.
                  </span>
                </li>
                <li>
                  <FiArrowRight className="subpage-list-icon mt-1" />
                  <span>
                    <strong>2. Generate</strong> a draft.
                  </span>
                </li>
                <li>
                  <FiArrowRight className="subpage-list-icon mt-1" />
                  <span>
                    <strong>3. Edit</strong> the form fields.
                  </span>
                </li>
                <li>
                  <FiArrowRight className="subpage-list-icon mt-1" />
                  <span>
                    <strong>4. Export</strong> the final PDF.
                  </span>
                </li>
              </ul>
            </div>

            <div className="subpage-glass-card">
              <p className="subpage-overline">Support</p>
              <p className="subpage-copy">
                Resume copilot and feedback tools are built in. If you still
                need help, reach out directly and continue from there.
              </p>
              <div className="mt-5">
                <Link to="/contact" className="landing-button-secondary">
                  Contact Support
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default Services;
