import React from "react";
import Resume from "../Resume";

const colorOptions = [
  [80, 170, 255],
  [255, 99, 71],
  [255, 193, 7],
  [52, 211, 153],
  [156, 163, 175],
  [59, 130, 246],
];

function DesignerPanel({
  templateOptions,
  templateThumbs,
  templateThumbUrls,
  selectedTemplate,
  setSelectedTemplate,
  accentColor,
  setAccentColor,
  data,
  editablePreview,
  setEditablePreview,
  updateResumeField,
  onAddManualItem,
  saveDownloadedResume,
  handleDownloadPreviewPdf,
  onClose,
}) {
  const makeRgb = (arr) => `rgb(${arr[0]}, ${arr[1]}, ${arr[2]})`;
  const isActiveColor = (c) =>
    Array.isArray(accentColor) && accentColor.join(",") === (c || []).join(",");
  const manualButtons = [
    ["skills", "Add Skill"],
    ["experience", "Add Experience"],
    ["projects", "Add Project"],
    ["education", "Add Education"],
    ["certifications", "Add Certification"],
    ["languages", "Add Language"],
    ["interests", "Add Interest"],
    ["achievements", "Add Achievement"],
  ];

  return (
    <div className="designer-shell text-slate-50 grid grid-cols-1 lg:grid-cols-12 gap-4">
      <div className="designer-panel lg:col-span-3 space-y-4">
        <div className="flex items-center justify-between">
          <div className="designer-heading">Design</div>
          <div className="badge badge-outline border-white/20 bg-white/5 text-slate-100">
            Beta
          </div>
        </div>
        <div>
          <div className="designer-heading mb-3 text-[0.72rem]">Colors</div>
          <div className="flex flex-wrap gap-2">
            {colorOptions.map((c) => (
              <button
                key={c.join("-")}
                onClick={() => setAccentColor(c)}
                className={`designer-color-swatch border-2 ${
                  isActiveColor(c)
                    ? "border-white ring-4 ring-white/15"
                    : "border-transparent"
                }`}
                style={{ backgroundColor: makeRgb(c) }}
                aria-label="accent color"
              />
            ))}
          </div>
        </div>
        <div>
          <div className="designer-heading mb-3 text-[0.72rem]">Templates</div>
          <div className="grid grid-cols-2 gap-2 max-h-[34rem] overflow-y-auto pr-1">
            {templateOptions.map((tpl) => (
              <button
                key={tpl.id}
                onClick={() => setSelectedTemplate(tpl.id)}
                className={`designer-template-card text-left ${
                  selectedTemplate === tpl.id
                    ? "border-sky-400 ring-2 ring-sky-400/35 shadow-[0_0_0_1px_rgba(56,189,248,0.18)]"
                    : "border-white/10"
                }`}
              >
                <div className="w-full h-20 rounded-md border border-white/10 mb-2 overflow-hidden bg-slate-900/40">
                  {templateThumbUrls?.[tpl.id] ? (
                    <img
                      src={templateThumbUrls[tpl.id]}
                      alt={`${tpl.title} preview`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div
                      className="w-full h-full"
                      style={{
                        backgroundImage: templateThumbs[tpl.id] || templateThumbs.classic,
                        backgroundSize: "cover",
                      }}
                    />
                  )}
                </div>
                <div className="text-sm font-semibold">{tpl.title}</div>
                <div className="text-xs designer-muted">{tpl.blurb}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="lg:col-span-6 flex items-start justify-center">
        <div className="designer-preview-card w-full max-w-3xl">
          <div className="text-slate-800 text-sm mb-3 font-semibold flex justify-between items-center">
            <span>Preview - {selectedTemplate}</span>
            <span className="text-xs text-slate-500">Accent {makeRgb(accentColor)}</span>
          </div>
          <div className="designer-preview-frame">
            <div className="scale-[0.9] origin-top bg-white">
              <Resume
                data={data}
                template={selectedTemplate}
                accent={accentColor}
                editable={editablePreview}
                onChange={updateResumeField}
                onDownloadSuccess={saveDownloadedResume}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="designer-panel lg:col-span-3 space-y-4">
        <div className="designer-heading normal-case tracking-normal text-sm">Actions</div>
        <button
          className="designer-action-button-ghost"
          onClick={() => setEditablePreview((prev) => !prev)}
        >
          {editablePreview ? "Disable Manual Edit" : "Enable Manual Edit"}
        </button>
        <div className="grid grid-cols-2 gap-2">
          {manualButtons.map(([sectionKey, label]) => (
            <button
              key={sectionKey}
              type="button"
              onClick={() => onAddManualItem?.(sectionKey)}
              className="rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-xs font-semibold text-slate-100 hover:bg-white/[0.1]"
            >
              {label}
            </button>
          ))}
        </div>
        <button
          className="landing-button-primary designer-action-button"
          onClick={handleDownloadPreviewPdf}
        >
          Download PDF
        </button>
        <button
          className="landing-button-primary designer-action-button designer-action-button-secondary"
          onClick={() => window.print()}
        >
          Print
        </button>
        <button className="designer-action-button-ghost" onClick={onClose}>
          Save & Close
        </button>
        <div className="text-xs designer-muted pt-3 border-t border-white/10">
          Tip: enable manual edit, click any text in preview to edit it, and use add
          buttons to create new sections like Canva-style editing.
        </div>
      </div>
    </div>
  );
}

export default DesignerPanel;
