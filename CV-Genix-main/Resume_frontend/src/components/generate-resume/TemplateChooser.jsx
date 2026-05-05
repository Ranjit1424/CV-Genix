import React from "react";
import { FiArrowRight } from "react-icons/fi";

function TemplateChooser({
  templateOptions,
  onSelect,
  onCancel,
  renderTemplateThumb,
}) {
  return (
    <div id="template-chooser" className="template-chooser-shell mt-4">
      <h2 className="template-chooser-title">Choose a Resume Template</h2>
      <p className="template-chooser-copy">
        Pick from a curated set of distinct layouts inspired by modern resume
        builders, from classic ATS-safe to timeline and sidebar styles.
      </p>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        {templateOptions.map((tpl) => (
          <button
            key={tpl.id}
            onClick={() => onSelect(tpl.id)}
            className="template-card p-3 text-left"
          >
            {renderTemplateThumb(tpl)}
            <div className="template-card-link">
              Use template
              <FiArrowRight />
            </div>
          </button>
        ))}
      </div>

      <div className="flex justify-center mt-8">
        <button className="landing-button-secondary" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export default TemplateChooser;
