import React from "react";
import { Link } from "react-router-dom";
import Resume from "../Resume";

function ResumeResult({
  data,
  selectedTemplate,
  accentColor,
  updateResumeField,
  saveDownloadedResume,
  onGenerateAnother,
  onEdit,
}) {
  return (
    <div>
      <Resume
        data={data}
        template={selectedTemplate}
        accent={accentColor}
        editable
        onChange={updateResumeField}
        onDownloadSuccess={saveDownloadedResume}
      />

      {data?.rating?.score ? (
        <div className="status-banner status-banner-info mt-5">
          <div className="status-banner-title">Latest ATS review: {data.rating.score}/10</div>
          <p className="status-banner-copy">
            {data.rating.feedback || "Resume feedback was saved from the rating screen."}
          </p>
        </div>
      ) : null}

      <div className="flex mt-5 justify-center gap-2">
        <div onClick={onGenerateAnother} className="btn btn-accent">
          Generate Another
        </div>
        <div onClick={onEdit} className="btn btn-success">
          Edit
        </div>
        <Link
          to="/rate-resume"
          state={{ name: data.personalInformation.fullName || "your resume" }}
          className="btn btn-primary"
        >
          Rate this resume
        </Link>
      </div>
    </div>
  );
}

export default ResumeResult;
