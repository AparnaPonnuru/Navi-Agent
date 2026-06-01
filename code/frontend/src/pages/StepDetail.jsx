import { useState } from "react";
import {
  IconArrowRight,
  IconFileText,
  IconHandshake,
  IconMap,
  IconMessageSquare,
  IconMicroscope,
  IconUsers,
  IconUser,
} from "./Icons";

const VIEWS = [
  { key: "macro", label: "Macro", Icon: IconMap, tag: "pill-teal", desc: "Big picture overview for this phase" },
  { key: "micro", label: "Micro", Icon: IconMicroscope, tag: "pill-blue", desc: "Detailed execution guidance for this step" },
  { key: "nano", label: "Nano", Icon: IconHandshake, tag: "pill-coral", desc: "Personalized guidance and review focus" },
];

function richText(value, fallback) {
  return value || fallback || "This step needs focused execution. Clarify the expected outcome, identify the skills required, and complete a small proof of work before moving forward. Use feedback from peers, mentors, or real users to check whether the work is strong enough for the next stage.";
}

export default function StepDetail({ step, onViewClick }) {
  const [active, setActive] = useState("macro");
  if (!step) return null;

  const view = VIEWS.find(v => v.key === active);
  const nanoOptions = [
    { Icon: IconUser, label: "1:1 Mentor session", desc: `Review your ${step.title} plan with a domain expert, pressure-test the next deliverable, and leave with a prioritized action list for this exact phase.`, tag: "pill-coral" },
    { Icon: IconUsers, label: "Small cohort", desc: `Work with peers at the same stage so you can compare progress, share blockers, and build accountability around the outcome of ${step.title}.`, tag: "pill-lavender" },
    { Icon: IconMessageSquare, label: "Community critique", desc: "Post your milestone output and ask for targeted feedback on gaps, missing evidence, and whether your work matches the goal requirements.", tag: "pill-blue" },
    { Icon: IconFileText, label: "Expert review", desc: "Submit your portfolio, project, resume, plan, or assessment for detailed feedback tied to this milestone and your final destination.", tag: "pill-amber" },
  ];

  return (
    <div className="page">
      <div className="sd-header card">
        <div className="sd-header-top">
          <span className="pill pill-teal">{step.duration}</span>
          <span style={{ fontSize: 13, color: "var(--text3)" }}>Phase {step.id}</span>
        </div>
        <h2 className="sd-title">{step.title}</h2>
        <p className="sd-desc">{richText(step.description)}</p>
      </div>

      <div className="sd-tabs">
        {VIEWS.map(v => (
          <button
            key={v.key}
            className={`sd-tab ${active === v.key ? "sd-tab--active" : ""}`}
            onClick={() => setActive(v.key)}
          >
            <span className="sd-tab-icon"><v.Icon size={20} /></span>
            <span className="sd-tab-label">{v.label}</span>
          </button>
        ))}
      </div>

      <div className="sd-content" key={active}>
        {active === "macro" && (
          <div>
            <div className="sd-view-intro">
              <span className={`pill ${view.tag}`}>{view.label} view</span>
              <p className="sd-view-desc">{view.desc}</p>
            </div>
            <div className="step-reading-card card">
              <div className="macro-ov-title">What this phase means</div>
              <p className="macro-ov-body">{richText(step.macro_view, step.description)}</p>
            </div>
          </div>
        )}

        {active === "micro" && (
          <div>
            <div className="sd-view-intro">
              <span className={`pill ${view.tag}`}>{view.label} view</span>
              <p className="sd-view-desc">{view.desc}</p>
            </div>
            <div className="step-reading-card card step-reading-card--micro">
              <div className="macro-ov-title">How to execute this step</div>
              <p className="macro-ov-body">
                {richText(step.micro_view || step.detailed_description || step.details || step.content, step.description)}
              </p>
            </div>
          </div>
        )}

        {active === "nano" && (
          <div>
            <div className="sd-view-intro">
              <span className={`pill ${view.tag}`}>{view.label} view</span>
              <p className="sd-view-desc">{view.desc}</p>
            </div>
            <div className="step-reading-card card step-reading-card--nano">
              <div className="macro-ov-title">Personalized guidance focus</div>
              <p className="macro-ov-body">
                {richText(step.nano_view, `Use expert support to review your work for ${step.title}. A mentor should help you identify weak assumptions, convert the step into a concrete deliverable, and decide what evidence proves readiness. Bring your current work, questions, and target outcome so the session produces specific next actions.`)}
              </p>
            </div>
            <div className="nano-options">
              {nanoOptions.map((opt, i) => (
                <div key={i} className="nano-opt card card-clickable" onClick={() => onViewClick("nano")}>
                  <div className="nano-opt-icon"><opt.Icon size={28} /></div>
                  <div className="nano-opt-body">
                    <div className="nano-opt-label">{opt.label}</div>
                    <div className="nano-opt-desc">{opt.desc}</div>
                  </div>
                  <span className={`pill ${opt.tag} browse-pill`} style={{ flexShrink: 0 }}>
                    Browse <IconArrowRight size={13} />
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="sd-market-cta card">
        <div className="sd-market-cta-text">
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 4 }}>
            Ready to find resources for this step?
          </div>
          <div style={{ fontSize: 13, color: "var(--text2)" }}>
            Browse recommendations tailored to <strong>{step.title}</strong> and the active {active} view.
          </div>
        </div>
        <button className="btn-primary" onClick={() => onViewClick(active)}>
          Open Marketplace <IconArrowRight size={18} />
        </button>
      </div>

      <style>{`
        .sd-header {
          padding: 32px;
          margin-bottom: 28px;
          background: linear-gradient(180deg, rgba(214, 242, 236, 0.45) 0%, #fff 100%);
          border-color: rgba(43, 174, 142, 0.22);
        }
        .sd-header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; }
        .sd-title { font-family: var(--font-display); font-size: 30px; color: var(--text); margin-bottom: 10px; }
        .sd-desc { font-size: 15px; color: var(--text2); line-height: 1.8; white-space: pre-line; }
        .sd-tabs { display: flex; gap: 12px; margin-bottom: 28px; flex-wrap: wrap; }
        
        .sd-tab {
          display: flex; align-items: center; gap: 8px; padding: 14px 24px;
          border-radius: var(--radius); border: 1.5px solid var(--border);
          background: var(--bg2); cursor: pointer; font-family: var(--font-body);
          font-size: 15px; font-weight: 600; color: var(--text2);
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
          flex: 1; justify-content: center;
        }
        .sd-tab:hover {
          border-color: var(--accent);
          color: var(--accent);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(43, 174, 142, 0.08);
        }
        .sd-tab--active {
          border-color: var(--accent);
          background: var(--accent-soft);
          color: var(--accent2);
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(43, 174, 142, 0.15);
        }
        .sd-tab-icon { display: flex; align-items: center; }
        
        .sd-content { animation: fadeUp 0.35s ease both; }
        .sd-view-intro { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
        .sd-view-desc { font-size: 14px; color: var(--text2); font-weight: 500; }
        
        /* Modern themed background views */
        .step-reading-card {
          padding: 28px;
          margin-bottom: 24px;
          transition: all 0.3s ease;
          border-radius: 16px;
        }
        .step-reading-card--macro {
          background: #F4FBF9;
          border-left: 5px solid var(--accent);
          border-color: rgba(43, 174, 142, 0.2);
        }
        .step-reading-card--micro {
          background: #F4F8FB;
          border-left: 5px solid var(--blue);
          border-color: rgba(90, 155, 232, 0.2);
        }
        .step-reading-card--nano {
          background: #FCF5F3;
          border-left: 5px solid var(--coral);
          border-color: rgba(240, 122, 90, 0.2);
        }
        
        .macro-ov-title { font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 12px; color: var(--text2); }
        .macro-ov-body { font-size: 15px; color: var(--text); line-height: 1.85; white-space: pre-line; }
        
        .nano-options { display: flex; flex-direction: column; gap: 14px; }
        
        .nano-opt {
          display: flex;
          align-items: center;
          gap: 18px;
          padding: 20px 24px;
          background: #fff;
          border-radius: 16px;
          transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        }
        .nano-opt:hover {
          transform: translateX(6px);
          box-shadow: 0 10px 28px rgba(17, 24, 39, 0.07);
          border-color: var(--accent);
        }
        
        .nano-opt-icon {
          width: 44px;
          height: 44px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          color: var(--accent2);
          background: var(--accent-soft);
          flex-shrink: 0;
        }
        .browse-pill {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          font-weight: 600;
          transition: all 0.2s ease;
        }
        .nano-opt:hover .browse-pill {
          background: var(--accent);
          color: #fff;
        }
        .nano-opt-body { flex: 1; }
        .nano-opt-label { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
        .nano-opt-desc { font-size: 13px; color: var(--text2); line-height: 1.6; }
        
        .sd-market-cta {
          display: flex; align-items: center; justify-content: space-between;
          gap: 20px; flex-wrap: wrap; padding: 28px 32px; margin-top: 38px;
          border: 1.5px solid var(--accent-soft);
          border-radius: 18px;
          background: linear-gradient(135deg, #F0FBF7 0%, #FFF 100%);
          box-shadow: var(--shadow);
          transition: all 0.3s ease;
        }
        .sd-market-cta:hover {
          box-shadow: var(--shadow-md);
          border-color: var(--accent);
        }
        .sd-market-cta-text { flex: 1; }
      `}</style>
    </div>
  );
}
