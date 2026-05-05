import React, { useState } from "react";
import toast from "react-hot-toast";
import {
  FiArrowRight,
  FiCheckCircle,
  FiCopy,
  FiMail,
  FiRefreshCw,
  FiSend,
  FiZap,
} from "react-icons/fi";
import { generateProfessionalEmail } from "../api/ResumeService";
import { Link } from "react-router-dom";

const promptPresets = [
  "Write a follow-up email after a job interview and thank the hiring manager for their time.",
  "Draft a polite email asking for a project deadline extension because of unexpected delays.",
  "Create a professional email to request a meeting with a recruiter about an open role.",
  "Write a concise apology email for a delayed response and keep the tone respectful.",
];

const toneOptions = [
  "Professional",
  "Warm",
  "Confident",
  "Formal",
  "Polite",
];

function EmailGenerator() {
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState("Professional");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedEmail, setGeneratedEmail] = useState(null);
  const [error, setError] = useState("");

  const handleGenerate = async (event) => {
    event?.preventDefault();
    const cleanedPrompt = prompt.trim();

    if (cleanedPrompt.length < 20) {
      toast.error("Add a little more detail so the email can be tailored properly.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await generateProfessionalEmail(cleanedPrompt, tone);
      const payload = response?.data || response;

      if (payload?.error) {
        setError(payload.error);
        toast.error(payload.error);
        return;
      }

      setGeneratedEmail(payload);
      toast.success("Professional email generated");
    } catch (err) {
      const message = err?.response?.data?.error || "Could not generate the email right now.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!generatedEmail) return;

    const textToCopy = [
      `Subject: ${generatedEmail.subject || "Professional email"}`,
      "",
      generatedEmail.body || generatedEmail.preview || "",
    ].join("\n");

    try {
      await navigator.clipboard.writeText(textToCopy);
      toast.success("Email copied to clipboard");
    } catch (err) {
      toast.error("Copy failed. Please try again.");
    }
  };

  const handleOpenGmail = () => {
    if (!generatedEmail) {
      toast.error("Generate an email first.");
      return;
    }

    if (!recipientEmail.trim()) {
      toast.error("Add the recipient Gmail address first.");
      return;
    }

    const subject = generatedEmail.subject || "Professional email";
    const body = generatedEmail.body || generatedEmail.preview || "";
    const gmailUrl = new URL("https://mail.google.com/mail/");
    gmailUrl.searchParams.set("view", "cm");
    gmailUrl.searchParams.set("fs", "1");
    gmailUrl.searchParams.set("to", recipientEmail.trim());
    gmailUrl.searchParams.set("su", subject);
    gmailUrl.searchParams.set("body", body);

    window.open(gmailUrl.toString(), "_blank", "noopener,noreferrer");
    toast.success("Opened Gmail compose with your draft");
  };

  const applyPreset = (value) => {
    setPrompt(value);
  };

  const emailBody = generatedEmail?.body || generatedEmail?.preview || "";
  const highlights = Array.isArray(generatedEmail?.highlights)
    ? generatedEmail.highlights
    : [];

  return (
    <div className="subpage-shell px-6 py-14 lg:px-10">
      <div className="subpage-inner mx-auto max-w-6xl space-y-10">
        <section className="subpage-hero-card">
          <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="space-y-6">
              <span className="subpage-badge">
                <FiMail />
                Featured tool
              </span>

              <h1 className="subpage-heading">
                Turn a short prompt into a <span>professional email draft.</span>
              </h1>

              <p className="subpage-copy max-w-2xl">
                Describe the situation, pick a tone, and generate a polished email
                you can send or tweak in seconds. This is built for follow-ups,
                requests, apologies, and recruiter outreach.
              </p>

              <div className="flex flex-wrap gap-3">
                <Link to="/generate-resume" className="landing-button-secondary">
                  Open Resume Builder
                </Link>
                <Link to="/services" className="landing-button-primary">
                  View All Features
                  <FiArrowRight />
                </Link>
              </div>

              <div className="flex flex-wrap gap-3">
                {toneOptions.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setTone(item)}
                    className={`rate-tag transition ${
                      tone === item ? "border-cyan-300 bg-cyan-300/15 text-white" : ""
                    }`}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            <div className="subpage-glass-card">
              <p className="subpage-overline">What this does</p>
              <ul className="subpage-list">
                <li>
                  <FiCheckCircle className="subpage-list-icon mt-1" />
                  Generates a clear subject line and a ready-to-send email body.
                </li>
                <li>
                  <FiCheckCircle className="subpage-list-icon mt-1" />
                  Keeps the wording professional, readable, and easy to edit.
                </li>
                <li>
                  <FiCheckCircle className="subpage-list-icon mt-1" />
                  Helps you move from rough intent to polished communication fast.
                </li>
              </ul>
            </div>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="subpage-glass-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="subpage-overline">Prompt</p>
                <h2 className="subpage-title">Describe the email you need</h2>
              </div>
              <span className="rate-tag">AI writing</span>
            </div>

            <form className="mt-6 space-y-5" onSubmit={handleGenerate}>
              <label className="flex flex-col gap-2">
                <span className="subpage-copy text-sm">Email prompt</span>
                <textarea
                  className="subpage-textarea min-h-[12rem]"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Example: Write a polite follow-up email to a recruiter after an interview. Thank them for their time and mention that I am still very interested in the role."
                  disabled={loading}
                />
              </label>

              <label className="flex flex-col gap-2">
                <span className="subpage-copy text-sm">Tone</span>
                <select
                  value={tone}
                  onChange={(event) => setTone(event.target.value)}
                  className="subpage-input"
                  disabled={loading}
                >
                  {toneOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-2">
                <span className="subpage-copy text-sm">Recipient Gmail</span>
                <input
                  type="email"
                  className="subpage-input"
                  value={recipientEmail}
                  onChange={(event) => setRecipientEmail(event.target.value)}
                  placeholder="recipient@gmail.com"
                  disabled={loading}
                />
                <span className="text-sm text-slate-400">
                  This opens Gmail compose in your account with the message ready to send.
                </span>
              </label>

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="landing-button-primary"
                >
                  {loading ? (
                    <span className="loading loading-spinner" />
                  ) : (
                    <FiSend />
                  )}
                  {loading ? "Generating..." : "Generate Email"}
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={() => {
                    setPrompt("");
                    setError("");
                    setGeneratedEmail(null);
                  }}
                  className="landing-button-secondary"
                >
                  <FiRefreshCw />
                  Reset
                </button>
                <button
                  type="button"
                  disabled={loading || !generatedEmail}
                  onClick={handleOpenGmail}
                  className="landing-button-secondary"
                >
                  <FiMail />
                  Send in Gmail
                </button>
              </div>
            </form>

            <div className="mt-8">
              <p className="subpage-overline">Quick prompts</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {promptPresets.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => applyPreset(item)}
                    className="rate-tag text-left leading-relaxed transition hover:border-cyan-300 hover:bg-cyan-300/10"
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="subpage-glass-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="subpage-overline">Output</p>
                <h2 className="subpage-title">Generated email</h2>
              </div>
              {generatedEmail?.tone ? <span className="rate-tag">{generatedEmail.tone}</span> : null}
            </div>

            {error ? (
              <div className="mt-6 status-banner status-banner-warning">
                <div className="status-banner-title">Generation issue</div>
                <p className="status-banner-copy">{error}</p>
              </div>
            ) : null}

            {generatedEmail ? (
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="subpage-overline">Subject</p>
                  <p className="text-lg font-semibold text-slate-50">
                    {generatedEmail.subject || "No subject returned"}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="subpage-overline mb-0">Email body</p>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="landing-button-secondary"
                    >
                      <FiCopy />
                      Copy
                    </button>
                  </div>
                  <div className="mt-4 whitespace-pre-wrap leading-8 text-slate-100">
                    {emailBody}
                  </div>
                </div>

                {highlights.length > 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <p className="subpage-overline">Highlights</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {highlights.map((item) => (
                        <span key={item} className="rate-tag">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="rounded-2xl border border-cyan-300/20 bg-cyan-300/10 p-4">
                  <p className="subpage-overline">Sending flow</p>
                  <p className="text-sm leading-7 text-slate-200">
                    Enter the recipient Gmail address, generate the draft, then use
                    <strong> Send in Gmail</strong>. Gmail opens with your text
                    already filled in, and you send it from your own account.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-white/5 p-6">
                <FiZap className="text-2xl text-cyan-300" />
                <h3 className="mt-4 text-xl font-semibold text-slate-50">
                  Your generated email will appear here.
                </h3>
                <p className="mt-2 text-slate-400">
                  Add a prompt on the left, choose a tone, and generate a polished draft.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default EmailGenerator;
