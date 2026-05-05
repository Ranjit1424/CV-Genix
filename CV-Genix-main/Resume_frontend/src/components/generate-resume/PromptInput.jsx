import React from "react";
import { FaBrain, FaPaperPlane, FaTrash } from "react-icons/fa";

function PromptInput({
  loading,
  description,
  jobDescription,
  onDescriptionChange,
  onJobDescriptionChange,
  onGenerate,
  onClear,
  onVoiceResume,
  minimumLength = 30,
}) {
  const remaining = Math.max(0, minimumLength - description.trim().length);
  const hasEnoughDetail = remaining === 0;

  return (
    <div id="prompt-input" className="w-full flex justify-center items-center py-12">
      <div className="resume-builder-form w-full max-w-3xl text-center">
        <h1 className="text-4xl font-bold mb-6 flex items-center justify-center gap-2">
          <FaBrain className="text-cyan-300" /> AI Resume Description Input
        </h1>
        <p className="mb-6 text-lg text-slate-300 max-w-2xl mx-auto">
          Enter a detailed description about yourself to generate your professional resume.
        </p>
        <textarea
          disabled={loading}
          className="resume-builder-textarea h-48 mb-6 resize-none"
          placeholder="Describe your target role, skills, experience, projects, education, and achievements..."
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
        <div className="resume-builder-section text-left mb-6">
          <label className="resume-builder-label">
            Optional Job Description for Tailoring
          </label>
          <textarea
            disabled={loading}
            className="resume-builder-textarea mt-2 min-h-[9rem]"
            placeholder="Paste the job description here to match keywords, responsibilities, and skill emphasis..."
            value={jobDescription}
            onChange={(e) => onJobDescriptionChange(e.target.value)}
          />
        </div>
        <div className="prompt-helper-shell mb-6">
          <div className="prompt-helper-copy">
            {hasEnoughDetail
              ? "Good detail level. You can generate now."
              : `Add ${remaining} more characters so the AI has enough context for a useful draft.`}
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-3">
            {["Role", "Skills", "Experience", "Projects", "Education"].map((chip) => (
              <span key={chip} className="rate-tag">
                {chip}
              </span>
            ))}
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-4">
          <button
            disabled={loading}
            onClick={onGenerate}
            className="landing-button-primary flex items-center gap-2"
          >
            {loading && <span className="loading loading-spinner"></span>}
            <FaPaperPlane />
            Generate Resume
          </button>
          <button
            onClick={onClear}
            className="landing-button-secondary flex items-center gap-2"
          >
            <FaTrash /> Clear
          </button>
          <button
            type="button"
            onClick={onVoiceResume}
            className="landing-button-secondary flex items-center gap-2"
            disabled={loading}
          >
            🎙 Speak Description
          </button>
        </div>
      </div>
    </div>
  );
}

export default PromptInput;
