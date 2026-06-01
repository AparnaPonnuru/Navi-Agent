import { IconAlert, IconArrowLeft, IconArrowRight } from "./Icons";

const STEP_COLORS = [
  { pill: "pill-teal",     border: "#2BAE8E", bg: "#D6F2EC", num: "#1D8A6F" },
  { pill: "pill-coral",    border: "#F07A5A", bg: "#FDEAE3", num: "#C05A3A" },
  { pill: "pill-lavender", border: "#A89BE8", bg: "#EAE8FC", num: "#7B6EC0" },
  { pill: "pill-amber",    border: "#E8A838", bg: "#FDF3DC", num: "#B07A18" },
  { pill: "pill-blue",     border: "#5A9BE8", bg: "#E3EEFB", num: "#2A6BC0" },
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
              <div className="step-card-watermark">{String(step.id).padStart(2, "0")}</div>
              
              <div className="step-card-top">
                <div className="step-num" style={{ background: c.bg, color: c.num }}>
                  {step.id}
                </div>
                <span className={`pill ${c.pill}`}>{step.duration}</span>
              </div>
              <div className="step-title">{step.title}</div>
              <div className="step-desc">{step.description}</div>
              <div className="step-cta">
                <span>Tap to explore</span>
                <span className="step-cta-arrow"><IconArrowRight size={14} /></span>
              </div>
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

        @keyframes progressGlow {
          0% { opacity: 0.85; filter: brightness(1); }
          50% { opacity: 1; filter: brightness(1.15); }
          100% { opacity: 0.85; filter: brightness(1); }
        }
        .result-readiness {
          display: flex; align-items: center; gap: 14px; margin-top: 20px; flex-wrap: wrap;
        }
        .readiness-bar-wrap {
          flex: 1; min-width: 120px; height: 8px;
          background: var(--bg3); border-radius: 4px; overflow: hidden;
        }
        .readiness-bar-fill {
          height: 100%; border-radius: 4px;
          background: linear-gradient(to right, var(--accent), var(--blue));
          transition: width 1s ease;
          animation: progressGlow 3s infinite ease-in-out;
        }

        /* Responsive Premium Step Grid with 240px min width */
        .steps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
          gap: 20px;
        }
        
        /* Premium Card Lift & Glow hover transitions */
        .step-card {
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          position: relative;
          overflow: hidden;
          background: #fff;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        .step-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 16px 36px rgba(43, 174, 142, 0.14);
        }
        
        /* Translucent Background Watermark Stage Number */
        .step-card-watermark {
          position: absolute;
          right: 8px;
          bottom: -15px;
          font-size: 80px;
          font-weight: 800;
          color: var(--border);
          opacity: 0.18;
          z-index: 1;
          pointer-events: none;
          user-select: none;
          font-family: var(--font-display);
        }

        .step-card-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          z-index: 2;
        }
        .step-num {
          width: 34px; height: 34px; border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          font-weight: 700; font-size: 15px;
        }
        .step-title {
          font-size: 17px;
          font-weight: 600;
          color: var(--text);
          z-index: 2;
          line-height: 1.35;
        }
        .step-desc {
          font-size: 13px;
          color: var(--text2);
          line-height: 1.7;
          white-space: pre-line;
          z-index: 2;
        }

        .step-cta {
          display: flex; align-items: center; justify-content: space-between;
          margin-top: auto; font-size: 13px; font-weight: 600;
          color: var(--accent); padding-top: 10px;
          border-top: 1px solid var(--border);
          z-index: 2;
        }
        .step-cta-arrow {
          display: flex;
          transition: transform 0.2s ease;
        }
        .step-card:hover .step-cta-arrow {
          transform: translateX(4px);
        }

        .blindspots-list { display: flex; flex-direction: column; gap: 12px; }
        .blindspot-card  {
          display: flex; align-items: flex-start; gap: 12px;
          padding: 16px 20px; border-left: 3px solid var(--amber);
          transition: transform 0.2s ease;
        }
        .blindspot-card:hover {
          transform: translateX(4px);
        }
        .blindspot-icon { display: flex; color: var(--amber); flex-shrink: 0; margin-top: 1px; }
        .blindspot-text { font-size: 14px; color: var(--text2); line-height: 1.7; }

        @media (max-width: 600px) {
          .result-route-bar { flex-direction: column; align-items: flex-start; }
          .route-bar-arrow  { transform: rotate(90deg); }
          .route-bar-meta   { width: 100%; }
        }
      `}</style>
    </div>
  );
}
