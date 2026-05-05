import React from "react";
import { BiBook } from "react-icons/bi";
import { FaPlusCircle, FaTrash } from "react-icons/fa";

const sectionSchema = [
  { title: "Skills", name: "skills", keys: ["title", "level"], fieldArrayKey: "skillsFields" },
  {
    title: "Experience",
    name: "experience",
    keys: ["jobTitle", "company", "location", "duration", "responsibility"],
    fieldArrayKey: "experienceFields",
  },
  {
    title: "Education",
    name: "education",
    keys: ["degree", "university", "location", "graduationYear"],
    fieldArrayKey: "educationFields",
  },
  {
    title: "Certifications",
    name: "certifications",
    keys: ["title", "issuingOrganization", "year"],
    fieldArrayKey: "certificationsFields",
  },
  {
    title: "Projects",
    name: "projects",
    keys: ["title", "description", "technologiesUsed", "githubLink"],
    fieldArrayKey: "projectsFields",
  },
];

const smallSectionSchema = [
  { title: "Languages", name: "languages", keys: ["name"], fieldArrayKey: "languagesFields" },
  { title: "Interests", name: "interests", keys: ["name"], fieldArrayKey: "interestsFields" },
];

function ResumeBuilderForm({
  register,
  handleSubmit,
  onSubmit,
  fieldArrays,
  validationIssues = [],
  onImproveBullet,
  improvingBulletPath = "",
  hasJobDescription = false,
}) {
  const renderInput = (name, label, type = "text") => (
    <div className="resume-builder-field">
      <label className="resume-builder-label">{label}</label>
      <input type={type} {...register(name)} className="resume-builder-input" />
    </div>
  );

  const renderFieldArray = (fields, label, name, keys) => (
    <div className="w-full mb-4">
      <h3 className="resume-builder-subtitle">{label}</h3>
      {(name === "experience" || name === "projects") && (
        <p className="resume-builder-hint">
          Use `Improve bullet` on responsibilities and project descriptions.
          {hasJobDescription
            ? " Your pasted job description will be used for stronger rewrites."
            : " Add a job description in the prompt step for more targeted rewrites."}
        </p>
      )}
      {fields.fields.map((field, index) => (
        <div key={field.id} className="resume-builder-row-shell">
          {keys.map((key) => {
            const path = `${name}.${index}.${key}`;
            const isImproveField =
              (name === "experience" && key === "responsibility") ||
              (name === "projects" && key === "description");

            if (isImproveField) {
              return (
                <div key={key} className="resume-builder-field">
                  <div className="resume-builder-action-row">
                    <label className="resume-builder-label">{key}</label>
                    <button
                      type="button"
                      className="resume-builder-inline-action"
                      disabled={Boolean(improvingBulletPath) && improvingBulletPath !== path}
                      onClick={() =>
                        onImproveBullet?.({
                          section: name,
                          index,
                          field: key,
                          path,
                          titlePath:
                            name === "experience"
                              ? `${name}.${index}.jobTitle`
                              : `${name}.${index}.title`,
                        })
                      }
                    >
                      {improvingBulletPath === path ? "Improving..." : "Improve bullet"}
                    </button>
                  </div>
                  <textarea
                    {...register(path)}
                    className="resume-builder-textarea"
                    rows={4}
                  />
                </div>
              );
            }

            return <div key={key}>{renderInput(path, key)}</div>;
          })}
          <button
            type="button"
            onClick={() => fields.remove(index)}
            className="resume-builder-remove-button mt-2"
          >
            <FaTrash className="w-4 h-4" /> Remove {label}
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() =>
          fields.append(keys.reduce((acc, key) => ({ ...acc, [key]: "" }), {}))
        }
        className="resume-builder-add-button mt-2"
      >
        <FaPlusCircle className="w-4 h-4" /> Add {label}
      </button>
    </div>
  );

  return (
    <div className="resume-builder-shell w-full p-4 lg:p-10">
      <div className="resume-builder-header">
        <BiBook className="text-3xl" />
        <h1 className="text-4xl font-bold">Resume Form</h1>
      </div>
      <div>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="resume-builder-form space-y-6 text-base-content"
        >
          {validationIssues.length > 0 && (
            <div className="resume-builder-validation">
              <div className="resume-builder-validation-title">Complete these essentials first</div>
              <ul className="status-banner-list">
                {validationIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="resume-builder-section">
            <h3 className="resume-builder-subtitle">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderInput("personalInformation.fullName", "Full Name")}
              {renderInput("personalInformation.email", "Email", "email")}
              {renderInput("personalInformation.phoneNumber", "Phone Number", "tel")}
              {renderInput("personalInformation.location", "Location")}
              {renderInput("personalInformation.linkedin", "LinkedIn", "url")}
              {renderInput("personalInformation.gitHub", "GitHub", "url")}
              {renderInput("personalInformation.portfolio", "Portfolio", "url")}
            </div>
          </div>

          <div className="resume-builder-section">
            <h3 className="resume-builder-subtitle">Summary</h3>
            <textarea {...register("summary")} className="resume-builder-textarea" rows={4} />
          </div>

          {sectionSchema.map((section) => (
            <div key={section.name} className="resume-builder-section">
              {renderFieldArray(
                fieldArrays[section.fieldArrayKey],
                section.title,
                section.name,
                section.keys
              )}
            </div>
          ))}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {smallSectionSchema.map((section) => (
              <div key={section.name} className="flex-1">
                <div className="resume-builder-section">
                  {renderFieldArray(
                    fieldArrays[section.fieldArrayKey],
                    section.title,
                    section.name,
                    section.keys
                  )}
                </div>
              </div>
            ))}
          </div>

          <button type="submit" className="landing-button-primary resume-builder-submit">
            Submit
          </button>
        </form>
      </div>
    </div>
  );
}

export default ResumeBuilderForm;
