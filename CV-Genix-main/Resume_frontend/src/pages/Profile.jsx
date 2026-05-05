import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  FiClock,
  FiDownload,
  FiFileText,
  FiLogOut,
  FiZap,
  FiUser,
} from "react-icons/fi";
import {
  getCurrentSession,
  getCurrentUserProfile,
  logoutCurrentSession,
} from "../utils/localAuth";

const formatDate = (value) =>
  new Date(value).toLocaleString("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
  });

const templatePreviewSrc = (template) =>
  `/template-previews/${template || "classic"}.svg`;

function Profile() {
  const navigate = useNavigate();
  const [session, setSession] = useState(() => getCurrentSession());
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(Boolean(getCurrentSession()));

  useEffect(() => {
    const syncProfile = async () => {
      setSession(getCurrentSession());
      const currentSession = getCurrentSession();

      if (!currentSession) {
        setProfile(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const result = await getCurrentUserProfile();
      setProfile(result.ok ? result.profile : null);
      setLoading(false);
    };

    syncProfile();
    window.addEventListener("authchange", syncProfile);
    return () => window.removeEventListener("authchange", syncProfile);
  }, []);

  const openSavedResume = (resume) => {
    navigate("/generate-resume", {
      state: {
        savedResume: resume.resumeData,
        template: resume.template,
        accent: resume.accent,
      },
    });
  };

  const handleLogout = async () => {
    await logoutCurrentSession();
    toast.success("Logged out successfully.");
    navigate("/login");
  };

  if (loading) {
    return (
      <div className="profile-shell">
        <div className="profile-hero">
          <p className="profile-eyebrow">Profile</p>
          <h1 className="profile-title">Loading your saved resume workspace...</h1>
          <p className="profile-copy">
            We are pulling your account details and saved resume history.
          </p>
        </div>
      </div>
    );
  }

  if (!session || !profile) {
    return (
      <div className="profile-shell">
        <section className="profile-hero">
          <p className="profile-eyebrow">Profile</p>
          <h1 className="profile-title">Login to view your resume workspace</h1>
          <p className="profile-copy">
            Your saved resumes, template history, and latest downloads will appear here once
            you sign in.
          </p>
          <div className="profile-actions">
            <Link to="/login" className="landing-button-primary">
              Go to Login
            </Link>
            <Link to="/generate-resume" className="landing-button-secondary">
              Open Builder
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const resumes = profile.resumes || [];
  const latestResume = resumes[0];

  return (
    <div className="profile-shell">
      <section className="profile-hero">
        <div className="profile-hero-header">
          <div className="profile-avatar">
            <FiUser size={28} />
          </div>
          <div>
            <p className="profile-eyebrow">User Profile</p>
            <h1 className="profile-title">{profile.name}</h1>
            <p className="profile-copy">
              Signed in as {profile.email}. Keep your best resume variants in one place and
              reopen any saved draft in the builder.
            </p>
          </div>
        </div>
        <div className="profile-actions">
          <Link to="/generate-resume" className="landing-button-primary">
            Create Resume
          </Link>
          <button type="button" onClick={handleLogout} className="landing-button-secondary">
            <FiLogOut />
            Logout
          </button>
        </div>
      </section>

      <section className="profile-stats-grid">
        <article className="profile-stat-card">
          <span className="profile-stat-label">Saved resumes</span>
          <strong>{resumes.length}</strong>
          <p>Each downloaded PDF is also stored here for quick editing.</p>
        </article>
        <article className="profile-stat-card">
          <span className="profile-stat-label">Latest template</span>
          <strong className="capitalize">{latestResume?.template || "No saves yet"}</strong>
          <p>{latestResume ? "Most recent template used for download." : "Create your first saved resume."}</p>
        </article>
        <article className="profile-stat-card">
          <span className="profile-stat-label">Latest saved</span>
          <strong>{latestResume?.savedAt ? formatDate(latestResume.savedAt) : "No saves yet"}</strong>
          <p>Use this page as your reusable resume library.</p>
        </article>
      </section>

      <section className="profile-section-header">
        <div>
          <p className="profile-eyebrow">Saved Resume Data</p>
          <h2 className="profile-section-title">Downloaded resume history</h2>
        </div>
        <div className="profile-inline-note">
          <FiZap />
          Open any saved resume and continue editing from where you left off.
        </div>
      </section>

      {resumes.length === 0 ? (
        <section className="profile-empty-state">
          <h3>No resumes saved yet</h3>
          <p>
            Download a resume from the builder and it will appear here automatically with its
            template and saved data.
          </p>
          <Link to="/generate-resume" className="landing-button-primary">
            Build your first resume
          </Link>
        </section>
      ) : (
        <section className="profile-resume-grid">
          {resumes.map((resume) => (
            <article key={resume.id} className="profile-resume-card">
              <div className="profile-resume-thumb">
                <img
                  src={templatePreviewSrc(resume.template)}
                  alt={`${resume.template} template preview`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>

              <div className="profile-resume-meta">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3>{resume.fileName}</h3>
                    <p>
                      Candidate: {resume.resumeData?.personalInformation?.fullName || "Unnamed"}
                    </p>
                  </div>
                  <span className="profile-chip capitalize">{resume.template}</span>
                </div>

                <div className="profile-meta-row">
                  <span>
                    <FiClock size={14} />
                    {formatDate(resume.savedAt)}
                  </span>
                  <span>
                    <FiFileText size={14} />
                    {(resume.resumeData?.skills || []).length} skills
                  </span>
                  <span>
                    <FiDownload size={14} />
                    {(resume.resumeData?.experience || []).length} roles
                  </span>
                </div>

                <p className="profile-summary-text">
                  {resume.resumeData?.summary || "No summary saved for this resume."}
                </p>

                <div className="profile-actions">
                  <button
                    type="button"
                    onClick={() => openSavedResume(resume)}
                    className="landing-button-primary"
                  >
                    Open in Builder
                  </button>
                  <Link to="/generate-resume" className="landing-button-secondary">
                    Create New
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}
    </div>
  );
}

export default Profile;
