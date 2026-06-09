import { useState, useEffect } from "react";
import './Dashboard.scss';
import {
  IconArrowRight, IconBrain, IconNavigation, IconRoute, IconCheck,
} from "./Icons";

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:8000" : "");

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

function analyzeGoalParts(goalText) {
  if (!goalText || !goalText.trim()) {
    return {
      program: "",
      university: "",
      country: "",
      missing: ["program", "university", "country"]
    };
  }

  // Split by dot or middle dot
  const rawParts = goalText.split(/[•.]+/).map(p => p.trim()).filter(Boolean);

  let program = "";
  let university = "";
  let country = "";

  const countryKeywords = [
    "usa", "us", "uk", "united states", "united kingdom", "india", "canada",
    "germany", "australia", "singapore", "france", "japan", "switzerland",
    "netherlands", "sweden", "italy", "spain", "china", "hong kong", "ireland", "new zealand"
  ];

  const universityKeywords = [
    "university", "college", "uni", "institute", "school", "tech", "iit",
    "mit", "yale", "stanford", "harvard", "oxford", "cambridge", "princeton",
    "columbia", "cornell", "caltech", "berkeley", "ucla", "nyu", "hec", "bits"
  ];

  const isCountry = (str) => {
    const s = str.toLowerCase();
    return countryKeywords.includes(s) || s.length === 2 || s.length === 3;
  };

  const isUniversity = (str) => {
    const s = str.toLowerCase();
    return universityKeywords.some(keyword => s.includes(keyword));
  };

  if (rawParts.length === 1) {
    const part = rawParts[0];
    if (isUniversity(part)) {
      university = part;
    } else if (isCountry(part)) {
      country = part;
    } else {
      program = part;
    }
  } else if (rawParts.length === 2) {
    const part1 = rawParts[0];
    const part2 = rawParts[1];

    if (isCountry(part2)) {
      country = part2;
      if (isUniversity(part1)) {
        university = part1;
      } else {
        program = part1;
      }
    } else if (isUniversity(part1)) {
      university = part1;
      if (isCountry(part2)) {
        country = part2;
      } else {
        program = part2;
      }
    } else if (isUniversity(part2)) {
      university = part2;
      program = part1;
    } else {
      program = part1;
      university = part2;
    }
  } else if (rawParts.length >= 3) {
    program = rawParts[0];
    university = rawParts[1];
    country = rawParts[2];
  }

  const missing = [];
  if (!program) missing.push("program");
  if (!university) missing.push("university");
  if (!country) missing.push("country");

  return { program, university, country, missing };
}

export default function Dashboard({ profile, pathData, userInput, initialCurrent = "", onPathGenerated, onStepClick, onGenerationStart, onProfileUpdated }) {
  const [current, setCurrent] = useState(initialCurrent);
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const [error, setError] = useState("");
  const [activeStep, setActiveStep] = useState(null);
  const [refinePrompt, setRefinePrompt] = useState("");

  useEffect(() => {
    setCurrent(initialCurrent);
  }, [initialCurrent]);

  const goalAnalysis = analyzeGoalParts(goal);
  const isGoalValid = goal.trim() !== "" && goalAnalysis.missing.length === 0;
  const missingFieldsText = goalAnalysis.missing.join(", ").replace(/, ([^,]*)$/, ' and $1');

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

  async function generate(customPrompt = "") {
    const promptText = typeof customPrompt === "string" ? customPrompt : "";
    if (!current.trim() || !isGoalValid) return;
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
      message: promptText ? "Refining pathway..." : LOADING_MSGS[0],
    });

    try {
      const streamRes = await fetch(`${API}/api/path/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_position: current,
          target_goal: goal,
          profile: profile,
          refine_prompt: promptText || null,
          existing_roadmap: promptText ? pathData : null
        }),
      });
      if (!streamRes.ok) {
        const errorData = await streamRes.json().catch(() => ({}));
        throw new Error(errorData.detail || "Path generation failed");
      }

      const finalData = await readPathStream(streamRes);
      setLoading(false);
      onPathGenerated(finalData, { current, goal });
      if (promptText) {
        setRefinePrompt("");
      }

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
              placeholder="Program • University • Country"
              value={goal}
              onChange={e => {
                let val = e.target.value;
                // Replace dot with middle dot, avoiding decimals
                let formatted = val.replace(/(?<!\d)\.(?!\d)/g, ' • ');
                // Avoid double middle dots
                formatted = formatted.replace(/\s*•\s*•\s*/g, ' • ');
                setGoal(formatted);
              }}
              disabled={loading}
              onKeyDown={e => e.key === "Enter" && e.ctrlKey && isGoalValid && generate()}
            />

            {/* Naavi Agent Goal Validation Widget */}
            <div className={`db-agent-validation ${isGoalValid ? 'valid' : goal.trim() ? 'invalid' : 'empty'}`}>
              <div className="db-agent-avatar">
                <div className="db-agent-pulse-ring" />
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a3 3 0 0 0-3 3v2a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                  <path d="M18 8a3 3 0 0 0-3-3h-1.5M6 8a3 3 0 0 1 3-3h1.5" />
                  <rect x="4" y="8" width="16" height="12" rx="2" />
                  <circle cx="9" cy="13" r="1.2" fill="currentColor" />
                  <circle cx="15" cy="13" r="1.2" fill="currentColor" />
                  <path d="M9 17h6" />
                </svg>
              </div>
              <div className="db-agent-body">
                <span className="db-agent-title">Naavi Agent</span>
                <p className="db-agent-text">
                  {goal.trim() === "" ? (
                    <>Please enter your goal using the format: <strong>Program • University • Country</strong></>
                  ) : goalAnalysis.missing.length > 0 ? (
                    <>You missed the <strong>{missingFieldsText}</strong>. Please include {goalAnalysis.missing.length === 1 ? 'it' : 'them'} (e.g. {
                      goalAnalysis.missing.includes("program") ? "Computer Science" : ""
                    }{
                        goalAnalysis.missing.includes("program") && goalAnalysis.missing.includes("university") ? " • " : ""
                      }{
                        goalAnalysis.missing.includes("university") ? "Yale University" : ""
                      }{
                        (goalAnalysis.missing.includes("program") || goalAnalysis.missing.includes("university")) && goalAnalysis.missing.includes("country") ? " • " : ""
                      }{
                        goalAnalysis.missing.includes("country") ? "USA" : ""
                      }).</>
                  ) : (
                    <>Goal format is perfect! Click <strong>Find My Path</strong> to continue.</>
                  )}
                </p>
              </div>
            </div>

            {error && <div className="db-error">{error}</div>}

            <button
              className="db-generate-btn"
              onClick={generate}
              disabled={loading || !current.trim() || !isGoalValid}
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

          {/* Refine with AI Agent Card */}
          {pathData && !loading && (
            <div className="db-refine-card card">
              <div className="db-refine-head">
                <div className="db-refine-head-left">
                  <div className="db-agent-avatar small active" style={{ animation: "none", width: 22, height: 22 }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a3 3 0 0 0-3 3v2a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                      <rect x="4" y="8" width="16" height="12" rx="2" />
                      <path d="M9 17h6" />
                    </svg>
                  </div>
                  <span className="db-refine-title">Refine with Naavi Agent</span>
                </div>
              </div>
              <textarea
                className="db-textarea"
                rows={3}
                placeholder="Describe required changes..."
                value={refinePrompt}
                onChange={e => setRefinePrompt(e.target.value)}
                disabled={loading}
              />
              <button
                className="db-refine-btn"
                onClick={() => generate(refinePrompt)}
                disabled={loading || !refinePrompt.trim()}
              >
                <IconNavigation size={14} /> Refine Pathway
              </button>
            </div>
          )}



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
