import React from "react";

function TailoringInsights({ loading, insights, error, onRefresh }) {
  if (!loading && !insights && !error) {
    return null;
  }

  return (
    <section className="tailoring-shell w-full">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="status-banner-title">Tailoring Insights</div>
          <p className="status-banner-copy">
            Match your resume against the pasted job description and refine the strongest bullets.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="landing-button-secondary"
          disabled={loading}
        >
          {loading ? "Refreshing..." : "Refresh Match"}
        </button>
      </div>

      {error ? (
        <div className="status-banner status-banner-warning mt-4">
          <div className="status-banner-title">Could not analyze job match</div>
          <p className="status-banner-copy">{error}</p>
        </div>
      ) : null}

      {loading && !insights ? (
        <div className="status-banner status-banner-info mt-4">
          <div className="status-banner-title">Analyzing fit</div>
          <p className="status-banner-copy">
            We are extracting keywords and building rewrite suggestions from the backend.
          </p>
        </div>
      ) : null}

      {insights ? (
        <>
          <div className="tailoring-score-grid mt-5">
            <article className="rate-metric-card">
              <span className="rate-metric-label">Match score</span>
              <strong>{insights.score || 0}%</strong>
            </article>
            <article className="rate-metric-card">
              <span className="rate-metric-label">Matched</span>
              <strong>{(insights.matchedKeywords || []).length}</strong>
            </article>
            <article className="rate-metric-card">
              <span className="rate-metric-label">Missing</span>
              <strong>{(insights.missingKeywords || []).length}</strong>
            </article>
            <article className="rate-metric-card">
              <span className="rate-metric-label">Rewrites</span>
              <strong>{(insights.rewriteSuggestions || []).length}</strong>
            </article>
          </div>

          <div className="status-banner status-banner-info mt-5">
            <div className="status-banner-title">Backend summary</div>
            <p className="status-banner-copy">{insights.summary}</p>
          </div>

          <div className="grid gap-4 mt-5 lg:grid-cols-2">
            <div className="rate-feedback-panel">
              <h3 className="rate-feedback-title">Matched keywords</h3>
              <div className="flex flex-wrap gap-2 mt-3">
                {(insights.matchedKeywords || []).map((item) => (
                  <span key={`matched-${item}`} className="rate-tag">
                    {item}
                  </span>
                ))}
              </div>
            </div>
            <div className="rate-feedback-panel">
              <h3 className="rate-feedback-title">Missing keywords</h3>
              <div className="flex flex-wrap gap-2 mt-3">
                {(insights.missingKeywords || []).map((item) => (
                  <span key={`missing-${item}`} className="profile-chip">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {(insights.rewriteSuggestions || []).length > 0 ? (
            <div className="mt-5 space-y-4">
              <h3 className="rate-feedback-title">Suggested bullet rewrites</h3>
              {insights.rewriteSuggestions.map((item, index) => (
                <article key={`${item.section}-${item.title}-${index}`} className="tailoring-rewrite-card">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="tailoring-rewrite-heading">
                      {item.section}: {item.title}
                    </div>
                    <span className="profile-chip">{item.reason}</span>
                  </div>
                  <div className="tailoring-rewrite-block mt-3">
                    <span className="tailoring-label">Original</span>
                    <p>{item.original}</p>
                  </div>
                  <div className="tailoring-rewrite-block tailoring-rewrite-block-accent mt-3">
                    <span className="tailoring-label">Suggested</span>
                    <p>{item.suggestion}</p>
                  </div>
                </article>
              ))}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

export default TailoringInsights;
