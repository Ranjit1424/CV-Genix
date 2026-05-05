import React, { useMemo, useState } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { FaStar } from "react-icons/fa";
import { FiUpload } from "react-icons/fi";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.min?url";
import { uploadResumeForRating } from "../api/ResumeService";

GlobalWorkerOptions.workerSrc = pdfWorker;

const RateResume = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const name = location.state?.name || "your resume";

  const [score, setScore] = useState(8);
  const [feedback, setFeedback] = useState("");
  const [uploadNote, setUploadNote] = useState("");
  const [uploadedText, setUploadedText] = useState("");
  const [uploadedResumeData, setUploadedResumeData] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [uploading, setUploading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const rating = { score, feedback, analysis };
    localStorage.setItem("resumeRating", JSON.stringify(rating));
    toast.success("Thanks for the feedback!", {
      duration: 2400,
      position: "top-center",
    });
    navigate("/generate-resume", { state: { rating } });
  };

  const applyAnalysisResult = (result, sourceLabel) => {
    const nextScore = Number(result?.score || 0) || 1;
    const nextFeedback =
      result?.feedback ||
      result?.analysis?.improvements?.slice(0, 3).join(" ") ||
      "";
    const metrics = result?.analysis?.metrics || {};

    setScore(nextScore);
    setFeedback(nextFeedback);
    setUploadNote(
      `${sourceLabel} analyzed ${metrics.wordCount || 0} words, ${metrics.bulletCount || 0} bullets, ${metrics.keywordHits || 0} keywords, and ${metrics.metricHits || 0} measurable results.`
    );
    setUploadedText(result?.uploadedText || "");
    setUploadedResumeData(result?.structuredResume || null);
    setAnalysis(result?.analysis || null);
  };

  const analyzeResumeTextLocally = (text, fileName = "uploaded resume") => {
    const lower = text.toLowerCase();
    const words = lower.split(/\s+/).filter(Boolean);
    const wordCount = words.length;
    const bulletCount = (text.match(/(^|\n)\s*[-*•]/g) || []).length;
    const keywords = [
      "achieved",
      "delivered",
      "built",
      "designed",
      "optimized",
      "led",
      "developed",
      "improved",
      "reduced",
      "increased",
      "project",
      "experience",
      "education",
      "skills",
      "react",
      "spring",
      "java",
      "python",
      "api",
    ];
    const matchedKeywords = keywords.filter((keyword) => lower.includes(keyword));
    const metricHits =
      text.match(/(\$\s?\d[\d,]*|\b\d+(?:\.\d+)?%|\b\d+\+\b)/g)?.length || 0;
    const hasContact = /@|phone|linkedin|github|portfolio|email/.test(lower);
    const sectionCount = ["experience", "education", "skills", "projects", "summary"].reduce(
      (acc, section) => acc + (lower.includes(section) ? 1 : 0),
      0
    );

    let raw =
      3 +
      sectionCount * 1 +
      Math.min(3, matchedKeywords.length * 0.28) +
      (hasContact ? 1 : 0) +
      Math.min(2, bulletCount * 0.1) +
      Math.min(1.4, metricHits * 0.22) +
      (wordCount > 180 && wordCount < 900 ? 1 : 0);
    const capped = Math.max(1, Math.min(10, Math.round(raw * 10) / 10));

    const strengths = [];
    const improvements = [];
    if (hasContact) strengths.push("Contact details are present.");
    if (sectionCount >= 4) strengths.push("Core sections are easy to identify.");
    if (bulletCount >= 5) strengths.push("Bullets improve scanability.");
    if (metricHits >= 2) strengths.push("The resume includes measurable impact.");
    if (!hasContact) improvements.push("Add email, phone, and profile links.");
    if (sectionCount < 3) improvements.push("Add Summary, Experience, Education, Skills, and Projects headings.");
    if (matchedKeywords.length < 6) improvements.push("Use more role-specific keywords and stronger action verbs.");
    if (bulletCount < 5) improvements.push("Convert key achievements into bullet points.");
    if (metricHits < 2) improvements.push("Add numbers, percentages, or outcomes to show impact.");
    if (wordCount < 180) improvements.push("Add more detail so ATS tools find enough relevant content.");
    if (wordCount > 900) improvements.push("Tighten the content so the strongest points stand out.");

    return {
      score: capped,
      feedback: improvements.slice(0, 3).join(" "),
      uploadedText: text,
      analysis: {
        band: capped >= 8.5 ? "Strong" : capped >= 7 ? "Good" : capped >= 5.5 ? "Fair" : "Needs work",
        fileName,
        strengths,
        improvements,
        matchedKeywords,
        metrics: {
          wordCount,
          bulletCount,
          sectionCount,
          keywordHits: matchedKeywords.length,
          metricHits,
        },
      },
    };
  };

  const readPdfText = async (file) => {
    const data = await file.arrayBuffer();
    const pdf = await getDocument({ data }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i += 1) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      const pageText = content.items
        .map((item) => ("str" in item ? item.str : ""))
        .join(" ");
      fullText += `${pageText}\n`;
    }
    return fullText.trim();
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const response = await uploadResumeForRating(file);
      if (response?.error) {
        throw new Error(response.error);
      }
      applyAnalysisResult(response, file.name);
      toast.success("Resume analysis completed", { duration: 2000 });
      return;
    } catch (error) {
      const lowerName = file.name.toLowerCase();
      try {
        if (file.type.startsWith("text/") || lowerName.endsWith(".txt")) {
          const text = await file.text();
          applyAnalysisResult(
            analyzeResumeTextLocally(text || "", `${file.name} (local)`),
            `${file.name} (local)`
          );
          toast.success("Resume analysis completed locally", { duration: 2000 });
          return;
        }

        if (file.type === "application/pdf" || lowerName.endsWith(".pdf")) {
          const text = await readPdfText(file);
          if (!text) {
            toast.error("Could not read text from this PDF. Try a text-based PDF.");
            return;
          }
          applyAnalysisResult(
            analyzeResumeTextLocally(text, `${file.name} (local)`),
            `${file.name} (local)`
          );
          toast.success("Resume analysis completed locally", { duration: 2000 });
          return;
        }

        toast.error(error?.response?.data?.error || "Please upload a .txt, .pdf, or .docx resume.");
      } catch (fallbackError) {
        toast.error("Could not read file. Try another file.");
      }
    } finally {
      setUploading(false);
    }
  };

  const metrics = analysis?.metrics || {};
  const summaryTags = useMemo(
    () => [
      `ATS score ${score}/10`,
      analysis?.band || "Resume review",
      uploadedText ? "Editable import ready" : "Manual review",
    ],
    [analysis?.band, score, uploadedText]
  );

  return (
    <div className="rate-shell flex items-center justify-center">
      <div className="rate-card relative z-10 w-full max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <div className="rate-heading-icon">
            <FaStar className="w-6 h-6" />
          </div>
          <div>
            <p className="rate-subtle text-sm">Rate and improve</p>
            <h1 className="text-2xl font-bold text-slate-50">
              How did {name} turn out?
            </h1>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <div className="mb-2 flex items-center justify-between text-sm font-medium text-slate-100">
              <span>Satisfaction score</span>
              <span className="font-semibold text-indigo-300">{score} / 10</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={score}
              onChange={(e) => setScore(Number(e.target.value))}
              className="rate-range"
            />
            <div className="rate-subtle mt-1 flex justify-between px-1 text-xs">
              {["1", "3", "5", "7", "10"].map((tick) => (
                <span key={tick}>{tick}</span>
              ))}
            </div>
          </div>

          <div>
            <label className="resume-builder-label">What should we improve?</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              rows={4}
              className="resume-builder-textarea mt-2"
              placeholder="e.g., Add more keywords for a frontend role, adjust formatting, shorten summary..."
            />
          </div>

          <div className="rate-upload-card">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <p className="rate-subtle text-sm">Upload external resume</p>
                <h3 className="text-lg font-semibold text-slate-50">
                  Auto-rate a .txt, .pdf, or .docx resume
                </h3>
              </div>
              <label className="landing-button-secondary cursor-pointer">
                <FiUpload />
                {uploading ? "Analyzing..." : "Choose file"}
                <input
                  type="file"
                  accept=".txt,.pdf,.docx,text/plain,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  disabled={uploading}
                  onChange={(e) => handleFileUpload(e.target.files?.[0])}
                />
              </label>
            </div>
            <p className="rate-subtle text-xs">
              Upload a text, PDF, or Word resume. We scan sections, action verbs,
              measurable results, bullets, and length to score it out of 10.
            </p>
            {uploadNote ? <p className="rate-subtle mt-2 text-xs">{uploadNote}</p> : null}
            {uploadedText ? (
              <button
                type="button"
                className="landing-button-primary mt-3"
                onClick={() =>
                  navigate("/generate-resume", {
                    state: {
                      uploadedResumeText: uploadedText,
                      uploadedResumeData,
                    },
                  })
                }
              >
                {uploadedResumeData ? "Open imported resume preview" : "Edit uploaded resume"}
              </button>
            ) : null}
          </div>

          {analysis ? (
            <div className="rate-analysis-shell">
              <div className="flex flex-wrap gap-3">
                {summaryTags.map((tag) => (
                  <span key={tag} className="rate-tag">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="rate-analysis-grid mt-5">
                <article className="rate-metric-card">
                  <span className="rate-metric-label">Words</span>
                  <strong>{metrics.wordCount || 0}</strong>
                </article>
                <article className="rate-metric-card">
                  <span className="rate-metric-label">Bullets</span>
                  <strong>{metrics.bulletCount || 0}</strong>
                </article>
                <article className="rate-metric-card">
                  <span className="rate-metric-label">Keywords</span>
                  <strong>{metrics.keywordHits || 0}</strong>
                </article>
                <article className="rate-metric-card">
                  <span className="rate-metric-label">Metrics</span>
                  <strong>{metrics.metricHits || 0}</strong>
                </article>
              </div>

              <div className="grid gap-4 mt-5 md:grid-cols-2">
                <div className="rate-feedback-panel">
                  <h3 className="rate-feedback-title">What is already working</h3>
                  <ul className="rate-feedback-list">
                    {(analysis.strengths || ["Upload a resume to see strengths."]).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div className="rate-feedback-panel">
                  <h3 className="rate-feedback-title">What to improve next</h3>
                  <ul className="rate-feedback-list">
                    {(analysis.improvements || []).slice(0, 5).map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {analysis.matchedKeywords?.length ? (
                <div className="mt-5">
                  <p className="rate-feedback-title mb-3">Matched keywords</p>
                  <div className="flex flex-wrap gap-3">
                    {analysis.matchedKeywords.slice(0, 12).map((tag) => (
                      <span key={tag} className="rate-tag">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            {[
              "ATS keywords",
              "Formatting",
              "Tone",
              "Project bullets",
              "Metrics",
              "Length",
            ].map((tag) => (
              <span key={tag} className="rate-tag">
                {tag}
              </span>
            ))}
          </div>

          <div className="flex flex-wrap justify-end gap-3">
            <Link to="/generate-resume" className="landing-button-secondary">
              Back to builder
            </Link>
            <button type="submit" className="landing-button-primary">
              Submit rating
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RateResume;
