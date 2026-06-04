import { useState } from "react";
import {
  IconArrowRight, IconBrain, IconNavigation, IconRoute, IconCheck,
} from "./Icons";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const LOADING_MSGS = [
  "Analyzing your profile...",
  "Building your roadmap...",
  "Refining milestones and checklists...",
  "Finding learning resources...",
  "Preparing final recommendations...",
  "Your career path is ready!",
];

const WORKFLOW_STEPS = [
  { key: "agent1", title: "Agent 1", message: "Analyzing your profile..." },
  { key: "agent2", title: "Agent 2", message: "Building your roadmap..." },
  { key: "agent3", title: "Agent 3", message: "Refining milestones and checklists..." },
  { key: "agent4", title: "Agent 4", message: "Finding learning resources..." },
  { key: "ready", title: "Path Ready", message: "Preparing final recommendations..." },
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

  // Progress follows completed backend stages, not elapsed time.
  const [loaderProgress, setLoaderProgress] = useState(0);
  const [workflowStatus, setWorkflowStatus] = useState({
    agent1: "pending",
    agent2: "pending",
    agent3: "pending",
    agent4: "pending",
    ready: "pending",
  });

  function applyStatusEvent(data) {
    if (data.statuses) setWorkflowStatus(data.statuses);
    if (typeof data.progress === "number") setLoaderProgress(data.progress);
    if (data.message) setLoadMsg(data.message);
  }

  function handleStreamEvent(eventType, eventData, resultRef) {
    if (eventType === "status") {
      applyStatusEvent(eventData);
      return;
    }
    if (eventType === "result") {
      resultRef.current = eventData;
      return;
    }
    if (eventType === "error") {
      throw new Error(eventData.message || "Path generation failed");
    }
  }

  async function readPathStream(response) {
    if (!response.body) throw new Error("Backend did not return a progress stream");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const resultRef = { current: null };
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() || "";

      for (const rawEvent of events) {
        const lines = rawEvent.split("\n");
        const eventType = lines.find(line => line.startsWith("event:"))?.replace("event:", "").trim() || "message";
        const dataLine = lines.find(line => line.startsWith("data:"));
        if (!dataLine) continue;

        const eventData = JSON.parse(dataLine.replace("data:", "").trim());
        handleStreamEvent(eventType, eventData, resultRef);
      }
    }

    if (buffer.trim()) {
      const lines = buffer.split("\n");
      const eventType = lines.find(line => line.startsWith("event:"))?.replace("event:", "").trim() || "message";
      const dataLine = lines.find(line => line.startsWith("data:"));
      if (dataLine) {
        const eventData = JSON.parse(dataLine.replace("data:", "").trim());
        handleStreamEvent(eventType, eventData, resultRef);
      }
    }

    if (!resultRef.current) throw new Error("Path generation finished without returning a roadmap");
    return resultRef.current;
  }

  async function generate() {
    if (!current.trim() || !goal.trim()) return;
    if (onGenerationStart) {
      onGenerationStart({ current, goal });
    }
    setLoading(true);
    setError("");

    applyStatusEvent({
      statuses: {
      agent1: "active",
      agent2: "pending",
      agent3: "pending",
      agent4: "pending",
      ready: "pending",
      },
      progress: 20,
      message: LOADING_MSGS[0],
    });

    try {
      const streamRes = await fetch(`${API}/api/path/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_position: current,
          target_goal: goal,
          profile: profile
        }),
      });
      if (!streamRes.ok) {
        const errorData = await streamRes.json().catch(() => ({}));
        throw new Error(errorData.detail || "Path generation failed");
      }

      const finalData = await readPathStream(streamRes);
      setLoading(false);
      onPathGenerated(finalData, { current, goal });

    } catch (e) {
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
                <h3>Generating Your Career Path</h3>
                <p>{loadMsg}</p>
              </div>

              {/* Progress bar */}
              <div className="loader-progress-bar-wrapper">
                <div className="loader-progress-bar" style={{ width: `${loaderProgress}%` }} />
                <span className="loader-progress-text">{loaderProgress}%</span>
              </div>

              {/* Agent workflow */}
              <div className="loader-pipeline">
                {WORKFLOW_STEPS.map((step, index) => {
                  const status = workflowStatus[step.key];
                  return (
                    <div key={step.key} className={`loader-pipeline-step ${status}`}>
                      <div className="step-indicator">
                        {status === "completed" ? <IconCheck size={14} /> : status === "active" ? <div className="spinner-inner" /> : index + 1}
                      </div>
                      <div className="step-content">
                        <span className="step-title">{step.title}</span>
                        <span className="step-desc">{step.message}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {loaderProgress === 100 && (
                <div className="loader-success">
                  <div className="loader-success-icon"><IconCheck size={18} /></div>
                  <div>
                    <strong>Path Generated Successfully</strong>
                    <span>Your personalized roadmap is ready to explore.</span>
                  </div>
                </div>
              )}
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
