import { useState } from "react";
import {
  IconArrowRight, IconBrain, IconBuilding, IconGlobe,
  IconMap, IconNavigation, IconPackage, IconPin,
  IconRoute, IconSearch, IconShoppingCart, IconTarget,
  IconCheck, IconAlert,
} from "./Icons";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const EXAMPLES = [
  { current: "Grade 11, CBSE Science, Hyderabad",     goal: "Become a Data Scientist" },
  { current: "Marketing executive, 3 years exp",       goal: "Switch to Product Management" },
  { current: "B.Tech CS final year, Bangalore",        goal: "Become a Full Stack Developer" },
  { current: "Working professional, no coding background", goal: "Break into AI/ML Engineering" },
  { current: "Design student, final year",             goal: "Become a UX Designer" },
];

const LOADING_MSGS = [
  "Mapping your journey...",
  "Analyzing your profile...",
  "Building your path...",
  "Finding milestones...",
  "Almost ready...",
];

const STEP_COLORS = [
  { border: "#34A853", bg: "#E6F4EA", text: "#1E7E34", pill: "pill-teal" },
  { border: "#4285F4", bg: "#E8F0FE", text: "#1A5DC8", pill: "pill-blue" },
  { border: "#E8312A", bg: "#FDECEA", text: "#B5261F", pill: "pill-coral" },
  { border: "#FBBC04", bg: "#FEF7E0", text: "#8A6000", pill: "pill-amber" },
];

function getProfileValue(profile, key) {
  return profile?.[key]?.trim?.() || profile?.[key] || "Not provided";
}

export default function Dashboard({ profile, pathData, userInput, initialCurrent = "", onPathGenerated, onStepClick }) {
  const [current, setCurrent]   = useState(initialCurrent);
  const [goal, setGoal]         = useState("");
  const [loading, setLoading]   = useState(false);
  const [loadMsg, setLoadMsg]   = useState("");
  const [error, setError]       = useState("");
  const [activeStep, setActiveStep] = useState(null);

  async function generate() {
    if (!current.trim() || !goal.trim()) return;
    setLoading(true);
    setError("");
    let i = 0;
    setLoadMsg(LOADING_MSGS[0]);
    const iv = setInterval(() => {
      i = (i + 1) % LOADING_MSGS.length;
      setLoadMsg(LOADING_MSGS[i]);
    }, 1800);
    try {
      const profileContext = profile ? `
        Grade: ${profile.grade || ""},
        Curriculum: ${profile.curriculum || ""},
        Stream: ${profile.stream || ""},
        School: ${profile.school || ""},
        Performance: ${profile.performance || ""},
        Financial: ${profile.financialSituation || ""},
        Personality: ${profile.personality || ""},
        Location: ${[profile.city, profile.state, profile.country].filter(Boolean).join(", ")}
      ` : "";
      const res = await fetch(`${API}/api/path`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          goal: `Current: ${current}. Goal: ${goal}. Profile: ${profileContext}`
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Something went wrong");
      onPathGenerated(json, { current, goal });
    } catch (e) {
      setError(e.message.includes("fetch")
        ? "Cannot connect to backend. Run: uvicorn main:app --reload --port 8000"
        : e.message);
    } finally {
      clearInterval(iv);
      setLoading(false);
    }
  }

  const steps = pathData?.macro_path || [];

  return (
    <div className="db-root">

      {/* ── LEFT PANEL ── */}
      <div className="db-left">
        <div className="db-left-scroll">

          {/* Route input card */}
          <div className="db-input-card">
            <div className="db-input-label-row">
              <div className="db-input-label-icon green-dot" />
              <span className="db-input-kicker">Current position</span>
            </div>
            <textarea
              className="db-textarea"
              rows={3}
              placeholder="e.g. Grade 12, IGCSE Science, Hyderabad"
              value={current}
              onChange={e => setCurrent(e.target.value)}
              disabled={loading}
            />

            <div className="db-route-dots">
              <span /><span /><span />
            </div>

            <div className="db-input-label-row">
              <div className="db-input-label-icon red-dot" />
              <span className="db-input-kicker">Future goal</span>
            </div>
            <textarea
              className="db-textarea"
              rows={3}
              placeholder="e.g. Become a Civil Engineer at L&T"
              value={goal}
              onChange={e => setGoal(e.target.value)}
              disabled={loading}
              onKeyDown={e => e.key === "Enter" && e.ctrlKey && generate()}
            />

            {error && <div className="db-error">{error}</div>}

            <button
              className="db-generate-btn"
              onClick={generate}
              disabled={loading || !current.trim() || !goal.trim()}
            >
              {loading ? (
                <span className="db-loading-inner">
                  <span className="dot-pulse"><span/><span/><span/></span>
                  {loadMsg}
                </span>
              ) : (
                <><IconNavigation size={16} /> Find My Path</>
              )}
            </button>
          </div>

          {/* Profile signals */}
          <div className="db-profile-card">
            <div className="db-profile-head">
              <span className="db-section-label">Profile signals</span>
              <span className="db-auto-badge">Auto-loaded</span>
            </div>
            <div className="db-profile-grid">
              {[
                { label: "Grade",       value: getProfileValue(profile, "grade") },
                { label: "Curriculum",  value: getProfileValue(profile, "curriculum") },
                { label: "Stream",      value: getProfileValue(profile, "stream") },
                { label: "Performance", value: getProfileValue(profile, "performance") },
                { label: "Personality", value: getProfileValue(profile, "personality") },
                { label: "Location",    value: [profile?.city, profile?.state].filter(Boolean).join(", ") || "Not set" },
              ].map((f, i) => (
                <div key={i} className="db-profile-item">
                  <span className="db-profile-item-label">{f.label}</span>
                  <span className="db-profile-item-value">{f.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick examples */}
          <div className="db-examples">
            <div className="db-section-label">Quick examples</div>
            {EXAMPLES.map((ex, i) => (
              <button key={i} className="db-example-row"
                onClick={() => { setCurrent(ex.current); setGoal(ex.goal); }}
                disabled={loading}>
                <IconTarget size={13} />
                <span>{ex.goal}</span>
              </button>
            ))}
          </div>

        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="db-right">
        {!pathData && !loading && (
          <div className="db-empty-state">
            <div className="db-empty-map">
              <div className="db-map-grid" />
              <div className="db-map-road db-road-h" />
              <div className="db-map-road db-road-v" />
              <div className="db-map-road db-road-d" />
              <div className="db-map-pin db-pin-start">
                <IconPin size={20} />
              </div>
              <div className="db-map-pin db-pin-end">
                <IconTarget size={20} />
              </div>
            </div>
            <h3 className="db-empty-title">Your path will appear here</h3>
            <p className="db-empty-sub">Enter your current situation and future goal on the left, then click Find My Path</p>
          </div>
        )}

        {pathData && (
          <div className="db-path-view">

            {/* Route header */}
            <div className="db-route-header">
              <div className="db-route-header-left">
                <div className="db-route-from-to">
                  <div className="db-rt-row">
                    <span className="db-rt-dot green" />
                    <div>
                      <div className="db-rt-label">From</div>
                      <div className="db-rt-val">{userInput.current}</div>
                    </div>
                  </div>
                  <div className="db-rt-vline" />
                  <div className="db-rt-row">
                    <span className="db-rt-dot red" />
                    <div>
                      <div className="db-rt-label">To</div>
                      <div className="db-rt-val">{userInput.goal}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="db-route-header-right">
                <div className="db-route-stat">
                  <span className="db-route-stat-val green-text">{pathData.readiness_score}</span>
                  <span className="db-route-stat-lbl">Readiness</span>
                </div>
                <div className="db-route-stat">
                  <span className="db-route-stat-val">{pathData.total_duration}</span>
                  <span className="db-route-stat-lbl">Duration</span>
                </div>
                <div className="db-route-stat">
                  <span className="db-route-stat-val">{steps.length}</span>
                  <span className="db-route-stat-lbl">Steps</span>
                </div>
              </div>
            </div>

            {/* Readiness bar */}
            <div className="db-readiness-bar-row">
              <span className="db-readiness-label">{pathData.readiness_label}</span>
              <div className="db-readiness-track">
                <div className="db-readiness-fill" style={{ width: `${pathData.readiness_score}%` }} />
              </div>
              <span className="db-readiness-score">{pathData.readiness_score}/100</span>
            </div>

            {/* Steps — Google Maps direction style */}
            <div className="db-steps-label">
              {steps.length} steps · click any step to explore
            </div>

            <div className="db-steps-list">
              {steps.map((step, i) => {
                const c = STEP_COLORS[i % STEP_COLORS.length];
                const isActive = activeStep?.id === step.id;
                return (
                  <div key={step.id} className="db-step-row">
                    {/* Connector line */}
                    <div className="db-step-spine">
                      <div className="db-step-node" style={{ background: c.border, boxShadow: isActive ? `0 0 0 5px ${c.bg}` : "none" }}>
                        {isActive ? <IconCheck size={13} /> : <span>{step.id}</span>}
                      </div>
                      {i < steps.length - 1 && (
                        <div className="db-step-spine-line" style={{ borderColor: c.border + "40" }} />
                      )}
                    </div>

                    {/* Step card */}
                    <div
                      className={`db-step-card ${isActive ? "db-step-card--active" : ""}`}
                      style={isActive ? { borderColor: c.border, background: c.bg + "60" } : {}}
                      onClick={() => setActiveStep(isActive ? null : step)}
                    >
                      <div className="db-step-card-top">
                        <span className="db-step-title">{step.title}</span>
                        <span className="db-step-dur" style={{ color: c.text, background: c.bg }}>{step.duration}</span>
                      </div>
                      <p className="db-step-desc">{step.description}</p>

                      {isActive && (
                        <div className="db-step-expanded">
                          <div className="db-step-actions">
                            <button className="db-step-explore-btn"
                              style={{ background: c.border }}
                              onClick={e => { e.stopPropagation(); onStepClick(step); }}>
                              Explore step <IconArrowRight size={14} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Blind spots */}
            {pathData.blind_spots?.length > 0 && (
              <div className="db-blindspots">
                <div className="db-steps-label">
                  <IconAlert size={13} /> Blind spots
                </div>
                {pathData.blind_spots.map((s, i) => (
                  <div key={i} className="db-blindspot-row">
                    <div className="db-blindspot-dot" />
                    <span>{s}</span>
                  </div>
                ))}
              </div>
            )}

          </div>
        )}
      </div>

      <style>{`
        .db-root {
          display: grid;
          grid-template-columns: 340px minmax(0, 1fr);
          height: calc(100vh - 68px);
          overflow: hidden;
        }

        /* LEFT */
        .db-left {
          border-right: 1px solid var(--border);
          background: #fff;
          overflow-y: auto;
          height: 100%;
        }
        .db-left-scroll { padding: 20px 18px 48px; display: flex; flex-direction: column; gap: 16px; }

        /* Input card */
        .db-input-card {
          background: #fff;
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 18px;
          box-shadow: 0 1px 6px rgba(32,33,36,0.08);
        }
        .db-input-label-row {
          display: flex; align-items: center; gap: 8px; margin-bottom: 8px;
        }
        .db-input-label-icon {
          width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0;
        }
        .green-dot { background: var(--green); }
        .red-dot   { background: var(--red); }
        .db-input-kicker {
          font-size: 11px; font-weight: 700; color: var(--text3);
          text-transform: uppercase; letter-spacing: 0.08em;
        }
        .db-textarea {
          width: 100%; padding: 10px 12px;
          border: 1.5px solid var(--border); border-radius: 10px;
          background: var(--bg); color: var(--text);
          font-family: var(--font-body); font-size: 13px;
          resize: none; outline: none; line-height: 1.55;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .db-textarea:focus {
          border-color: var(--blue);
          box-shadow: 0 0 0 3px rgba(66,133,244,0.12);
        }
        .db-textarea::placeholder { color: var(--text3); }
        .db-route-dots {
          display: flex; flex-direction: column; align-items: center;
          gap: 4px; padding: 8px 0; margin-left: 2px;
        }
        .db-route-dots span {
          width: 4px; height: 4px; border-radius: 50%; background: var(--border);
        }
        .db-error {
          background: var(--red-soft); border: 1px solid #F5C6C4;
          border-radius: 8px; padding: 10px 12px;
          color: #C5221F; font-size: 12px; margin-top: 10px;
        }
        .db-generate-btn {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          width: 100%; margin-top: 14px; padding: 13px;
          background: var(--green); color: #fff;
          border: none; border-radius: 10px;
          font-family: var(--font-body); font-size: 14px; font-weight: 600;
          cursor: pointer; transition: background 0.2s, transform 0.15s;
          box-shadow: 0 2px 10px rgba(52,168,83,0.3);
        }
        .db-generate-btn:hover:not(:disabled) { background: var(--accent2); transform: translateY(-1px); }
        .db-generate-btn:disabled { opacity: 0.55; cursor: not-allowed; transform: none; }
        .db-loading-inner { display: flex; align-items: center; gap: 10px; }

        /* Profile card */
        .db-profile-card {
          background: var(--bg);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px;
        }
        .db-profile-head {
          display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px;
        }
        .db-section-label {
          font-size: 10px; font-weight: 700; color: var(--text3);
          text-transform: uppercase; letter-spacing: 0.1em;
        }
        .db-auto-badge {
          font-size: 10px; font-weight: 600; color: var(--accent2);
          background: var(--green-soft); padding: 3px 8px; border-radius: 20px;
        }
        .db-profile-grid { display: flex; flex-direction: column; gap: 6px; }
        .db-profile-item {
          display: flex; align-items: center; justify-content: space-between;
          padding: 7px 10px; background: #fff;
          border: 1px solid var(--border); border-radius: 8px;
        }
        .db-profile-item-label { font-size: 11px; color: var(--text3); font-weight: 500; }
        .db-profile-item-value { font-size: 12px; color: var(--text); font-weight: 600; max-width: 60%; text-align: right; }

        /* Examples */
        .db-examples { display: flex; flex-direction: column; gap: 6px; }
        .db-example-row {
          display: flex; align-items: center; gap: 8px;
          padding: 9px 12px; background: #fff;
          border: 1px solid var(--border); border-radius: 8px;
          font-family: var(--font-body); font-size: 12px; color: var(--text2);
          cursor: pointer; text-align: left; transition: all 0.18s;
        }
        .db-example-row:hover:not(:disabled) {
          border-color: var(--green); color: var(--green);
          background: var(--green-soft);
        }
        .db-example-row svg { flex-shrink: 0; color: var(--red); }

        /* RIGHT */
        .db-right {
          background: var(--bg);
          overflow-y: auto;
          height: 100%;
          position: relative;
        }

        /* Empty state with map illustration */
        .db-empty-state {
          height: 100%; display: flex; flex-direction: column;
          align-items: center; justify-content: center; gap: 20px; padding: 40px;
        }
        .db-empty-map {
          position: relative; width: 280px; height: 180px;
          border-radius: 18px; overflow: hidden;
          border: 1px solid var(--border);
          background: linear-gradient(135deg, #E8F5E9, #E8F0FE);
        }
        .db-map-grid {
          position: absolute; inset: 0;
          background:
            linear-gradient(90deg, rgba(66,133,244,0.1) 0 1px, transparent 1px 40px),
            linear-gradient(0deg, rgba(52,168,83,0.1) 0 1px, transparent 1px 40px);
        }
        .db-map-road {
          position: absolute; background: rgba(255,255,255,0.7); border-radius: 4px;
        }
        .db-road-h { width: 70%; height: 10px; top: 50%; left: 15%; transform: translateY(-50%); }
        .db-road-v { width: 10px; height: 60%; left: 50%; top: 20%; transform: translateX(-50%); }
        .db-road-d { width: 55%; height: 8px; top: 30%; left: 30%; transform: rotate(30deg); opacity: 0.6; }
        .db-map-pin {
          position: absolute; width: 36px; height: 36px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .db-pin-start { left: 14%; bottom: 24%; background: var(--green); }
        .db-pin-end   { right: 14%; top: 18%; background: var(--red); }

        .db-empty-title { font-family: var(--font-display); font-size: 22px; color: var(--text); text-align: center; }
        .db-empty-sub   { font-size: 14px; color: var(--text3); text-align: center; max-width: 320px; line-height: 1.6; }

        /* Path view */
        .db-path-view { padding: 24px 28px 60px; }

        /* Route header */
        .db-route-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          gap: 20px; flex-wrap: wrap;
          background: #fff; border: 1px solid var(--border);
          border-radius: 16px; padding: 18px 22px; margin-bottom: 16px;
          box-shadow: 0 1px 6px rgba(32,33,36,0.08);
        }
        .db-route-from-to { display: flex; flex-direction: column; gap: 0; }
        .db-rt-row { display: flex; align-items: flex-start; gap: 10px; }
        .db-rt-dot { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; }
        .db-rt-dot.green { background: var(--green); }
        .db-rt-dot.red   { background: var(--red); }
        .db-rt-vline { width: 2px; height: 14px; background: var(--border); margin: 3px 0 3px 5px; }
        .db-rt-label { font-size: 10px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.07em; font-weight: 700; }
        .db-rt-val   { font-size: 13px; font-weight: 600; color: var(--text); margin-top: 1px; }

        .db-route-header-right { display: flex; gap: 14px; flex-wrap: wrap; }
        .db-route-stat {
          display: flex; flex-direction: column; align-items: center;
          background: var(--bg); border-radius: 10px;
          padding: 10px 16px; border: 1px solid var(--border); min-width: 70px;
        }
        .db-route-stat-val { font-family: var(--font-display); font-size: 22px; line-height: 1; color: var(--text); }
        .db-route-stat-val.green-text { color: var(--green); }
        .db-route-stat-lbl { font-size: 10px; color: var(--text3); margin-top: 3px; text-transform: uppercase; letter-spacing: 0.06em; font-weight: 600; }

        /* Readiness bar */
        .db-readiness-bar-row {
          display: flex; align-items: center; gap: 12px;
          margin-bottom: 20px; flex-wrap: wrap;
        }
        .db-readiness-label { font-size: 12px; font-weight: 600; color: var(--text2); white-space: nowrap; }
        .db-readiness-track {
          flex: 1; min-width: 100px; height: 6px;
          background: var(--border); border-radius: 3px; overflow: hidden;
        }
        .db-readiness-fill {
          height: 100%; border-radius: 3px;
          background: linear-gradient(to right, var(--green), var(--blue));
          transition: width 1s ease;
        }
        .db-readiness-score { font-size: 11px; color: var(--text3); white-space: nowrap; }

        /* Steps */
        .db-steps-label {
          display: flex; align-items: center; gap: 6px;
          font-size: 11px; font-weight: 700; color: var(--text3);
          text-transform: uppercase; letter-spacing: 0.08em;
          margin-bottom: 16px;
        }
        .db-steps-list { display: flex; flex-direction: column; }
        .db-step-row   { display: flex; gap: 14px; }

        .db-step-spine { display: flex; flex-direction: column; align-items: center; padding-top: 12px; flex-shrink: 0; }
        .db-step-node  {
          width: 28px; height: 28px; border-radius: 50%;
          display: flex; align-items: center; justify-content: center;
          color: #fff; font-size: 12px; font-weight: 700; flex-shrink: 0;
          transition: box-shadow 0.2s;
        }
        .db-step-spine-line {
          width: 0; flex: 1; min-height: 16px;
          border-left: 2px dashed; margin: 5px 0;
        }

        .db-step-card {
          flex: 1; background: #fff;
          border: 1.5px solid var(--border); border-radius: 14px;
          padding: 14px 16px; margin-bottom: 12px; cursor: pointer;
          transition: all 0.2s;
        }
        .db-step-card:hover { box-shadow: 0 2px 12px rgba(32,33,36,0.1); transform: translateX(2px); }
        .db-step-card--active { box-shadow: 0 4px 20px rgba(32,33,36,0.12); }

        .db-step-card-top {
          display: flex; align-items: flex-start;
          justify-content: space-between; gap: 10px; margin-bottom: 6px;
        }
        .db-step-title { font-size: 14px; font-weight: 600; color: var(--text); line-height: 1.4; }
        .db-step-dur   {
          font-size: 10px; font-weight: 700; padding: 3px 9px;
          border-radius: 20px; white-space: nowrap; flex-shrink: 0;
        }
        .db-step-desc  { font-size: 12px; color: var(--text2); line-height: 1.6; }

        .db-step-expanded { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border); }
        .db-step-actions  { display: flex; gap: 8px; }
        .db-step-explore-btn {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 8px 16px; color: #fff;
          border: none; border-radius: 8px;
          font-family: var(--font-body); font-size: 13px; font-weight: 600;
          cursor: pointer; transition: opacity 0.2s;
        }
        .db-step-explore-btn:hover { opacity: 0.88; }

        /* Blind spots */
        .db-blindspots { margin-top: 28px; }
        .db-blindspot-row {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 10px 14px; margin-bottom: 8px;
          background: var(--yellow-soft);
          border-left: 3px solid var(--yellow);
          border-radius: 0 8px 8px 0;
          font-size: 13px; color: var(--text2); line-height: 1.6;
        }
        .db-blindspot-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: var(--yellow); flex-shrink: 0; margin-top: 5px;
        }

        /* Sidebar extras */
        .sidebar-path-meta { display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap; }
        .sidebar-meta-chip {
          font-size: 11px; font-weight: 600; padding: 3px 9px;
          border-radius: 20px; border: 1px solid var(--border);
        }
        .sidebar-meta-chip.green { background: var(--green-soft); color: var(--accent2); border-color: var(--green-soft); }
        .sidebar-meta-chip.blue  { background: var(--blue-soft);  color: var(--blue); border-color: var(--blue-soft); }

        @media (max-width: 860px) {
          .db-root { grid-template-columns: 1fr; height: auto; overflow: visible; }
          .db-left, .db-right { height: auto; overflow: visible; }
          .db-right { min-height: 400px; border-top: 1px solid var(--border); }
        }
      `}</style>
    </div>
  );
}