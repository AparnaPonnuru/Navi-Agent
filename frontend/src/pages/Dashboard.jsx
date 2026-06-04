import { useState, useEffect } from "react";
import {
  IconArrowRight, IconBrain, IconBuilding, IconGlobe,
  IconMap, IconNavigation, IconPackage, IconPin,
  IconRoute, IconSearch, IconShoppingCart, IconTarget,
  IconCheck, IconAlert,
} from "./Icons";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const EXAMPLES = [
  { current: "Grade 11, CBSE Science, Hyderabad", goal: "Become a Data Scientist" },
  { current: "Marketing executive, 3 years exp", goal: "Switch to Product Management" },
  { current: "B.Tech CS final year, Bangalore", goal: "Become a Full Stack Developer" },
  { current: "Working professional, no coding background", goal: "Break into AI/ML Engineering" },
  { current: "Design student, final year", goal: "Become a UX Designer" },
];

const LOADING_MSGS = [
  "Mapping your journey...",
  "Analyzing your profile...",
  "Building your path...",
  "Finding milestones...",
  "Almost ready...",
];

const STEP_COLORS = [
  { border: "#2CA852", bg: "#EEF9F1", text: "#1B6932", pill: "pill-teal" },
  { border: "#1D72F2", bg: "#E8F0FE", text: "#1A5DC8", pill: "pill-blue" },
  { border: "#EB4335", bg: "#FDF2F2", text: "#A8201A", pill: "pill-coral" },
  { border: "#F9B000", bg: "#FEF7E0", text: "#8A6000", pill: "pill-amber" },
];

function getProfileValue(profile, key) {
  return profile?.[key]?.trim?.() || profile?.[key] || "Not provided";
}

export default function Dashboard({ profile, pathData, userInput, initialCurrent = "", onPathGenerated, onStepClick, onGenerationStart }) {
  const [current, setCurrent] = useState(initialCurrent);
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const [error, setError] = useState("");
  const [activeStep, setActiveStep] = useState(null);

  // New real-time staged progress states
  const [loaderProgress, setLoaderProgress] = useState(0);
  const [step1Status, setStep1Status] = useState("pending");
  const [step2Status, setStep2Status] = useState("pending");
  const [step3Status, setStep3Status] = useState("pending");
  const [terminalLogs, setTerminalLogs] = useState([]);

  async function generate() {
    if (!current.trim() || !goal.trim()) return;
    if (onGenerationStart) {
      onGenerationStart({ current, goal });
    }
    setLoading(true);
    setError("");
    
    // Set initial loader state
    setLoaderProgress(5);
    setStep1Status("active");
    setStep2Status("pending");
    setStep3Status("pending");
    
    const initialTime = new Date().toLocaleTimeString();
    const startLogs = [
      { text: `🕒 [${initialTime}] Starting Career Path generation pipeline...`, type: "normal" },
      { text: "➔ [Agent 1] Requesting blueprint from Llama-3 70B model...", type: "green" }
    ];
    setTerminalLogs(startLogs);
    
    let currentProgress = 5;
    let stage = "blueprint_loading"; // "blueprint_loading" | "audit_loading" | "finalizing"
    
    // Interval to simulate ticking up to caps
    const progressInterval = setInterval(() => {
      if (stage === "blueprint_loading") {
        currentProgress = Math.min(48, currentProgress + Math.floor(Math.random() * 4 + 1));
        setLoaderProgress(currentProgress);
        setTerminalLogs(prev => {
          if (prev.length === 2 && currentProgress > 20) {
            return [...prev, { text: "➔ [Agent 1] Drafting initial 4-milestone roadmap...", type: "normal" }];
          }
          return prev;
        });
      } else if (stage === "audit_loading") {
        currentProgress = Math.min(95, currentProgress + Math.floor(Math.random() * 3 + 1));
        setLoaderProgress(currentProgress);
      }
    }, 200);

    setLoadMsg("Mapping your journey...");
    let msgIndex = 0;
    const msgInterval = setInterval(() => {
      msgIndex = (msgIndex + 1) % LOADING_MSGS.length;
      setLoadMsg(LOADING_MSGS[msgIndex]);
    }, 1800);

    try {
      // Stage 1: Fetch blueprint from backend (Agent 1)
      const blueprintRes = await fetch(`${API}/api/path/blueprint`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_position: current,
          target_goal: goal,
          profile: profile
        }),
      });
      const blueprintData = await blueprintRes.json();
      if (!blueprintRes.ok) throw new Error(blueprintData.detail || "Blueprint generation failed");
      
      // Update logs for Stage 1 completion
      setTerminalLogs(prev => [
        ...prev,
        { text: "✓ [Agent 1] Blueprint successfully generated.", type: "green" },
        { text: `🕒 [${new Date().toLocaleTimeString()}] Dispatched parallel auditing tasks to Agents 2, 3 & 4...`, type: "normal" },
        { text: "➔ [Agent 2] Auditing overall path structure and readiness score...", type: "blue" },
        { text: "➔ [Agent 3] Refinement of milestone descriptions and check-lists...", type: "blue" },
        { text: "➔ [Agent 4] Validating marketplace recommendations and prices...", type: "blue" }
      ]);
      
      // Advance to stage 2
      stage = "audit_loading";
      currentProgress = 50;
      setLoaderProgress(50);
      setStep1Status("completed");
      setStep2Status("active");

      // Stage 2: Fetch audited/final roadmap (Agents 2, 3, 4)
      const auditRes = await fetch(`${API}/api/path/audit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          blueprint: blueprintData,
          current_position: current,
          target_goal: goal,
          profile: profile
        }),
      });
      const finalData = await auditRes.json();
      if (!auditRes.ok) throw new Error(finalData.detail || "Audit processing failed");

      // Stage 3: Finalizing
      stage = "finalizing";
      setStep2Status("completed");
      setStep3Status("active");
      
      setTerminalLogs(prev => [
        ...prev,
        { text: "✓ [Audit Pipeline] Verification and resources audit completed.", type: "green" },
        { text: "➔ [Sanitizer] Scrubbing personal name tokens from descriptions...", type: "normal" }
      ]);
      setLoaderProgress(98);

      // Add a slight delay for realistic processing stages
      await new Promise(resolve => setTimeout(resolve, 600));
      setTerminalLogs(prev => [
        ...prev,
        { text: "➔ [MongoDB] Caching finalized path document to Database...", type: "normal" }
      ]);
      setLoaderProgress(100);
      setStep3Status("completed");
      setTerminalLogs(prev => [
        ...prev,
        { text: "✓ [Pipeline] Job completed. Rendering career pathway map.", type: "green" }
      ]);

      // Brief pause at 100% so user can appreciate the success state
      await new Promise(resolve => setTimeout(resolve, 800));
      clearInterval(progressInterval);
      clearInterval(msgInterval);
      setLoading(false);
      onPathGenerated(finalData, { current, goal });

    } catch (e) {
      clearInterval(progressInterval);
      clearInterval(msgInterval);
      setLoading(false);
      setError(e.message.includes("fetch")
        ? "Cannot connect to backend. Run: uvicorn main:app --reload --port 8000"
        : e.message);
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
                  <span className="dot-pulse"><span /><span /><span /></span>
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
                { label: "Grade", value: getProfileValue(profile, "grade") },
                { label: "Curriculum", value: getProfileValue(profile, "curriculum") },
                { label: "Stream", value: getProfileValue(profile, "stream") },
                { label: "Performance", value: getProfileValue(profile, "performance") },
                { label: "Personality", value: getProfileValue(profile, "personality") },
                { label: "Location", value: [profile?.city, profile?.state].filter(Boolean).join(", ") || "Not set" },
              ].map((f, i) => (
                <div key={i} className="db-profile-item">
                  <span className="db-profile-item-label">{f.label}</span>
                  <span className="db-profile-item-value">{f.value}</span>
                </div>
              ))}
            </div>
          </div>



        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="db-right">
        {!pathData && !loading && (
          <div className="db-empty-state">
            <img
              src="/career_route.png"
              alt="Career Route Navigation Map"
              className="db-empty-illustration"
            />
            <h3 className="db-empty-title">Your path will appear here</h3>
            <p className="db-empty-sub">Enter your current situation and future goal on the left, then click Find My Path</p>
          </div>
        )}

        {loading && (
          <div className="db-loading-state">
            <div className="loader-container">
              <div className="loader-header">
                <div className="loader-radar-wrapper">
                  <div className="loader-radar" />
                  <span className="loader-brain-icon"><IconBrain size={28} /></span>
                </div>
                <h3>Naaviverse Career Path Engine</h3>
                <p>Collaborating multi-agent AI systems to build your tailored roadmap...</p>
              </div>

              {/* Progress bar */}
              <div className="loader-progress-bar-wrapper">
                <div className="loader-progress-bar" style={{ width: `${loaderProgress}%` }} />
                <span className="loader-progress-text">{loaderProgress}%</span>
              </div>

              {/* Pipeline Steps */}
              <div className="loader-pipeline">
                {/* Agent 1 */}
                <div className={`loader-pipeline-step ${step1Status}`}>
                  <div className="step-indicator">
                    {step1Status === "completed" ? "✓" : step1Status === "active" ? <div className="spinner-inner" /> : ""}
                  </div>
                  <div className="step-content">
                    <span className="step-title">Agent 1: Blueprint Generator</span>
                    <span className="step-desc">Generating initial 4-stage milestones and structure.</span>
                  </div>
                </div>

                {/* Agent 2, 3, 4 (Auditing) */}
                <div className={`loader-pipeline-step ${step2Status}`}>
                  <div className="step-indicator">
                    {step2Status === "completed" ? "✓" : step2Status === "active" ? <div className="spinner-inner" /> : ""}
                  </div>
                  <div className="step-content">
                    <span className="step-title">Agents 2, 3 & 4: Path & Resource Auditors</span>
                    <span className="step-desc">Refining path, learning views, checklists, and matching marketplace items (running in parallel).</span>
                  </div>
                </div>

                {/* Sanitizer & Cache */}
                <div className={`loader-pipeline-step ${step3Status}`}>
                  <div className="step-indicator">
                    {step3Status === "completed" ? "✓" : step3Status === "active" ? <div className="spinner-inner" /> : ""}
                  </div>
                  <div className="step-content">
                    <span className="step-title">Post-Processing & Storage</span>
                    <span className="step-desc">Sanitizing personal names and caching roadmap to MongoDB.</span>
                  </div>
                </div>
              </div>

              {/* Terminal Logs Box */}
              <div className="loader-terminal">
                <div className="terminal-header">
                  <span className="terminal-dot red" />
                  <span className="terminal-dot yellow" />
                  <span className="terminal-dot green" />
                  <span className="terminal-title">Path Engine Logs</span>
                </div>
                <div className="terminal-body">
                  {terminalLogs.map((log, idx) => (
                    <div 
                      key={idx} 
                      className={`terminal-log-line font-mono ${
                        log.type === "green" ? "green-text" : log.type === "blue" ? "blue-text" : ""
                      }`}
                    >
                      {log.text}
                    </div>
                  ))}
                  <div className="terminal-cursor" />
                </div>
              </div>
            </div>
          </div>
        )}

        {pathData && !loading && (
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

            {/* Pathway Overall Name & Description Card */}
            {(pathData.path_title || pathData.path_description) && (
              <div className="db-path-intro-card">
                <div className="db-path-intro-header">
                  <span className="db-path-intro-icon-wrapper">
                    <IconRoute size={20} />
                  </span>
                  <h2 className="db-path-title">{pathData.path_title || `Pathway to ${userInput.goal}`}</h2>
                </div>
                {pathData.path_description && (
                  <p className="db-path-desc">{pathData.path_description}</p>
                )}
              </div>
            )}

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
          </div>
        )}
      </div>
    </div>
  );
}