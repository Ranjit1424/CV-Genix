import React from "react";
import { Link } from "react-router-dom";
import { FiCheckCircle, FiLayers, FiTarget, FiZap } from "react-icons/fi";

const highlights = [
  {
    title: "AI Description Input",
    text: "Start with rough notes and turn them into a structured first draft quickly.",
  },
  {
    title: "Resume Form Editor",
    text: "Refine every section manually so the final output stays under your control.",
  },
  {
    title: "Templates and Preview",
    text: "Switch layouts instantly while keeping hierarchy clean and recruiter-friendly.",
  },
  {
    title: "Download and Share",
    text: "Export a polished PDF that is ready to send without formatting fixes.",
  },
];

function About() {
  return (
    <div className="subpage-shell px-6 py-14 lg:px-10">
      <div className="subpage-inner mx-auto max-w-6xl space-y-10">
        <section className="subpage-hero-card">
          <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div className="space-y-6">
              <span className="subpage-badge">
                <FiZap />
                About AI Resume Maker
              </span>

              <h1 className="subpage-heading">
                Build a cleaner resume with <span>speed, structure, and focus.</span>
              </h1>

              <p className="subpage-copy max-w-2xl">
                AI Resume Maker transforms a simple description into a polished,
                ATS-friendly resume you can edit, tune, and export. The goal is
                to remove layout friction while keeping your content deliberate.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link to="/generate-resume" className="landing-button-primary">
                  Start Building
                </Link>
                <Link to="/services" className="landing-button-secondary">
                  See Services
                </Link>
              </div>
            </div>

            <div className="subpage-glass-card">
              <p className="subpage-overline">What You Can Do</p>
              <ul className="subpage-list">
                <li>
                  <FiCheckCircle className="subpage-list-icon mt-1" />
                  Describe yourself once and generate a complete resume draft.
                </li>
                <li>
                  <FiCheckCircle className="subpage-list-icon mt-1" />
                  Edit every section using the resume form and preview flow.
                </li>
                <li>
                  <FiCheckCircle className="subpage-list-icon mt-1" />
                  Choose a template, preview instantly, and export to PDF.
                </li>
                <li>
                  <FiCheckCircle className="subpage-list-icon mt-1" />
                  Run a quick ATS-style review and improve weak areas fast.
                </li>
              </ul>

              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                <div className="subpage-stat">
                  <strong>Fast</strong>
                  <span>from idea to draft</span>
                </div>
                <div className="subpage-stat">
                  <strong>Clear</strong>
                  <span>strong visual hierarchy</span>
                </div>
                <div className="subpage-stat">
                  <strong>Editable</strong>
                  <span>full control before export</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          {highlights.map((item, index) => (
            <div key={item.title} className="subpage-grid-card">
              <p className="subpage-overline">0{index + 1}</p>
              <h2 className="subpage-title">{item.title}</h2>
              <p className="subpage-copy">{item.text}</p>
            </div>
          ))}
        </section>

        <section className="subpage-hero-card">
          <div className="grid gap-8 lg:grid-cols-3">
            <div>
              <p className="subpage-overline">How It Works</p>
              <ul className="subpage-list">
                <li>
                  <FiTarget className="subpage-list-icon mt-1" />
                  <span>
                    <strong>1. Describe</strong> your background, skills, and
                    goals.
                  </span>
                </li>
                <li>
                  <FiTarget className="subpage-list-icon mt-1" />
                  <span>
                    <strong>2. Generate</strong> a first draft instantly.
                  </span>
                </li>
                <li>
                  <FiTarget className="subpage-list-icon mt-1" />
                  <span>
                    <strong>3. Edit</strong> each section until it feels right.
                  </span>
                </li>
                <li>
                  <FiTarget className="subpage-list-icon mt-1" />
                  <span>
                    <strong>4. Export</strong> a cleaner final PDF.
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <p className="subpage-overline">Built For</p>
              <ul className="subpage-list">
                <li>
                  <FiLayers className="subpage-list-icon mt-1" />
                  Students and freshers preparing their first strong resume.
                </li>
                <li>
                  <FiLayers className="subpage-list-icon mt-1" />
                  Developers updating projects and measurable experience.
                </li>
                <li>
                  <FiLayers className="subpage-list-icon mt-1" />
                  Professionals reformatting content for ATS readability.
                </li>
              </ul>
            </div>

            <div className="subpage-glass-card">
              <p className="subpage-overline">Privacy and Control</p>
              <p className="subpage-copy">
                You stay in control of your content. Edit, replace, or remove
                any section before download and only publish what you want to
                share.
              </p>
              <div className="mt-5">
                <Link to="/contact" className="landing-button-secondary">
                  Contact Us
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

export default About;
