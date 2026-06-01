import { IconAlert, IconArrowLeft, IconArrowRight } from "./Icons";
   
const STEP_COLORS = [
  { pill: "pill-teal",     border: "#34A853", bg: "#E6F4EA", num: "#2A8C44" },
  { pill: "pill-blue",     border: "#4285F4", bg: "#E8F0FE", num: "#1A5DC8" },
  { pill: "pill-red",      border: "#E8312A", bg: "#FDECEA", num: "#B5261F" },
  { pill: "pill-amber",    border: "#FBBC04", bg: "#FEF7E0", num: "#B06000" },
  { pill: "pill-lavender", border: "#4285F4", bg: "#E8F0FE", num: "#1A5DC8" },
];

export default function PathResult({ pathData, userInput, onStepClick, onBack }) {
  if (!pathData) return null;

  const steps = pathData.macro_path || [];

  return (
    <div className="page">

      {/* Route summary bar */}
      <div className="result-route-bar card">
        <div className="route-bar-from">
          <span className="route-bar-dot from-dot" />
          <div>
            <div className="route-bar-label">From</div>
            <div className="route-bar-value">{userInput.current}</div>
          </div>
        </div>
        <div className="route-bar-arrow"><IconArrowRight size={22} /></div>
        <div className="route-bar-to">
          <span className="route-bar-dot to-dot" />
          <div>
            <div className="route-bar-label">To</div>
            <div className="route-bar-value">{userInput.goal}</div>
          </div>
        </div>
        <div className="route-bar-meta">
          <div className="route-bar-score">
            <span className="score-num">{pathData.readiness_score}</span>
            <span className="score-label">Readiness</span>
          </div>
          <div className="route-bar-duration">
            <span className="duration-val">{pathData.total_duration}</span>
            <span className="duration-label">Est. duration</span>
          </div>
        </div>
      </div>

      {/* Readiness label + progress */}
      <div className="result-readiness">
        <span className="pill pill-teal">{pathData.readiness_label}</span>
        <div className="readiness-bar-wrap">
          <div
            className="readiness-bar-fill"
            style={{ width: `${pathData.readiness_score}%` }}
          />
        </div>
        <span style={{ fontSize: 12, color: "var(--text3)" }}>
          {pathData.readiness_score} / 100
        </span>
      </div>

      <hr className="divider" />

      {/* Steps */}
      <div className="section-label">
        {steps.length} steps · click any to explore
      </div>
      <div className="steps-grid">
        {steps.map((step, i) => {
          const c = STEP_COLORS[i % STEP_COLORS.length];
          return (
            <div
              key={step.id}
              className="step-card card card-clickable"
              style={{ borderLeft: `4px solid ${c.border}` }}
              onClick={() => onStepClick(step)}
            >
              <div className="step-card-top">
                <div className="step-num" style={{ background: c.bg, color: c.num }}>
                  {step.id}
                </div>
                <span className={`pill ${c.pill}`}>{step.duration}</span>
              </div>
              <div className="step-title">{step.title}</div>
              <div className="step-desc">{step.description}</div>
              <div className="step-cta">Tap to explore <IconArrowRight size={14} /></div>
            </div>
          );
        })}
      </div>


      {/* Try another */}
      <div style={{ textAlign: "center", marginTop: 48 }}>
        <button className="btn-ghost" onClick={onBack}>
          <IconArrowLeft size={16} /> Try another goal
        </button>
      </div>

      <style>{`
        .result-route-bar {
          display: flex; align-items: center; gap: 20px;
          padding: 20px 24px; flex-wrap: wrap;
        }
        .route-bar-from, .route-bar-to {
          display: flex; align-items: flex-start; gap: 10px; flex: 1; min-width: 140px;
        }
        .route-bar-dot {
          width: 12px; height: 12px; border-radius: 50%;
          flex-shrink: 0; margin-top: 4px;
        }
        .from-dot { background: var(--accent); }
        .to-dot   { background: var(--coral); }
        .route-bar-arrow { display: flex; color: var(--text3); flex-shrink: 0; }
        .route-bar-label { font-size: 11px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.06em; }
        .route-bar-value { font-size: 14px; font-weight: 500; color: var(--text); margin-top: 2px; }
        .route-bar-meta  { display: flex; gap: 20px; flex-shrink: 0; }
        .route-bar-score, .route-bar-duration {
          display: flex; flex-direction: column; align-items: center;
          background: var(--bg3); border-radius: var(--radius-sm); padding: 10px 16px;
        }
        .score-num   { font-family: var(--font-display); font-size: 28px; color: var(--accent); line-height: 1; }
        .score-label { font-size: 11px; color: var(--text3); margin-top: 2px; }
        .duration-val   { font-size: 15px; font-weight: 600; color: var(--text); }
        .duration-label { font-size: 11px; color: var(--text3); margin-top: 2px; }

        .result-readiness {
          display: flex; align-items: center; gap: 14px; margin-top: 20px; flex-wrap: wrap;
        }
        .readiness-bar-wrap {
          flex: 1; min-width: 120px; height: 6px;
          background: var(--bg3); border-radius: 3px; overflow: hidden;
        }
        .readiness-bar-fill {
          height: 100%; border-radius: 3px;
          background: linear-gradient(to right, var(--accent), var(--blue));
          transition: width 1s ease;
        }

        .steps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 18px;
        }
        .step-card { padding: 22px; display: flex; flex-direction: column; gap: 10px; }
        .step-card-top { display: flex; align-items: center; justify-content: space-between; }
        .step-num {
          width: 34px; height: 34px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 15px;
        }
        .step-title { font-size: 17px; font-weight: 600; color: var(--text); }
        .step-desc  { font-size: 13px; color: var(--text2); line-height: 1.7; white-space: pre-line; }


        .step-cta {
          display: flex; align-items: center; gap: 5px;
          margin-top: auto; font-size: 13px; font-weight: 500;
          color: var(--accent); padding-top: 8px;
          border-top: 1px solid var(--border);
        }

        @media (max-width: 600px) {
          .result-route-bar { flex-direction: column; align-items: flex-start; }
          .route-bar-arrow  { transform: rotate(90deg); }
          .route-bar-meta   { width: 100%; }
        }
      `}</style>
    </div>
  );
}
