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

export default function StepDetail({ step, initialView = "macro", onViewClick }) {
  const [active, setActive] = useState(initialView);
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
        .sd-header { padding: 28px 28px 24px; margin-bottom: 28px; }
        .sd-header-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .sd-title { font-family: var(--font-display); font-size: 20px; color: var(--text); margin-bottom: 10px; font-weight: 700; }
        .sd-desc { font-size: 13px; color: var(--text2); line-height: 1.7; white-space: pre-line; }
        .sd-tabs { display: flex; gap: 10px; margin-bottom: 28px; flex-wrap: wrap; }
        .sd-tab {
          display: flex; align-items: center; gap: 8px; padding: 12px 22px;
          border-radius: var(--radius); border: 1.5px solid var(--border);
          background: var(--bg2); cursor: pointer; font-family: var(--font-body);
          font-size: 15px; font-weight: 500; color: var(--text2);
          transition: all 0.2s; flex: 1; justify-content: center;
        }
        .sd-tab:hover { border-color: var(--accent); color: var(--accent); }
        .sd-tab--active { border-color: var(--accent); background: var(--accent-soft); color: var(--accent2); }
        .sd-tab-icon { display: flex; align-items: center; }
        .sd-content { animation: fadeUp 0.3s ease both; }
        .sd-view-intro { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; flex-wrap: wrap; }
        .sd-view-desc { font-size: 14px; color: var(--text2); }
        .step-reading-card { padding: 24px; margin-bottom: 24px; }
        .step-reading-card--micro { border-left: 4px solid var(--blue);  }
        .step-reading-card--nano  { border-left: 4px solid var(--red);   }
        .macro-ov-title { font-weight: 600; font-size: 14px; margin-bottom: 8px; color: var(--text); }
        .macro-ov-body { font-size: 13px; color: var(--text2); line-height: 1.7; white-space: pre-line; }
        .nano-options { display: flex; flex-direction: column; gap: 14px; }
        .nano-opt { display: flex; align-items: center; gap: 16px; padding: 18px 20px; }
        .nano-opt-icon { display: flex; color: var(--accent); flex-shrink: 0; }
        .browse-pill { display: inline-flex; align-items: center; gap: 4px; }
        .nano-opt-body { flex: 1; }
        .nano-opt-label { font-size: 15px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
        .nano-opt-desc { font-size: 13px; color: var(--text2); line-height: 1.6; }
        .sd-market-cta {
          display: flex; align-items: center; justify-content: space-between;
          gap: 20px; flex-wrap: wrap; padding: 24px 28px; margin-top: 36px;
          border: 1.5px solid var(--accent-soft);
          background: linear-gradient(135deg, #F0FBF7 0%, #FFF 100%);
        }
        .sd-market-cta-text { flex: 1; }

        @media (max-width: 760px) {
          .sd-market-cta {
            flex-direction: column;
            align-items: stretch;
            gap: 16px;
          }

          .sd-market-cta-text {
            width: 100%;
          }

          .nano-options {
            gap: 12px;
          }

          .nano-opt {
            flex-direction: column;
            align-items: stretch;
          }

          .nano-opt-icon {
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}
