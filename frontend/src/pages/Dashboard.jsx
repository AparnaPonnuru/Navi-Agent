//dashboard.jsx::

import { useState, useEffect } from "react";
import './Dashboard.scss';
import {
  IconArrowRight, IconBrain, IconNavigation, IconRoute, IconCheck,
} from "./Icons";

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://127.0.0.1:8001" : "");

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

function analyzeRefinement(text) {
  if (!text || !text.trim()) {
    return {
      isValid: false,
      message: "Please describe the changes you want to make to this pathway."
    };
  }

  const val = text.toLowerCase().trim();

  // Noise / irrelevant keywords/prompts check
  const noiseKeywords = [
    "tell me a story", "tell a story", "write a story", "write a poem", "write a song",
    "tell me a joke", "tell a joke", "joke", "weather", "capital of", "who is",
    "what is the meaning of life", "hi", "hello", "hey", "how are you", "what's up",
    "sing a song", "write code", "help me chat", "how are you doing"
  ];

  if (noiseKeywords.some(noise => val.includes(noise)) || val.length < 4) {
    return {
      isValid: false,
      message: "Information is not accurate or irrelevant. Please provide path-related refinement instructions."
    };
  }

  // Keywords that must be present to count as relevant refinement
  const validKeywords = [
    "step", "milestone", "path", "road", "course", "market", "description", "objective",
    "duration", "add", "change", "remove", "delete", "update", "make", "give", "focus",
    "study", "prep", "sat", "ielts", "act", "toefl", "exam", "career", "university",
    "college", "school", "curriculum", "grade", "subject", "class", "detail", "more",
    "resource", "mentor", "timeline", "month", "year", "academics", "score", "placement",
    "portfolio", "admission", "ielts", "gpa", "internship", "project"
  ];

  const hasValidKeyword = validKeywords.some(kw => val.includes(kw));

  if (!hasValidKeyword) {
    return {
      isValid: false,
      message: "Information is not accurate or irrelevant. E.g. try: 'change step 1 description' or 'add more steps'."
    };
  }

  return {
    isValid: true,
    message: "Instruction looks good! Click Refine Pathway to apply changes."
  };
}

function parseSurgicalRefinement(prompt, steps) {
  if (!prompt || !steps || steps.length === 0) return null;
  
  const text = prompt.toLowerCase();
  
  // Look for step/milestone/phase and number
  const stepMatch = text.match(/(?:step|milestone|phase)\s*(\d+)/i);
  if (!stepMatch) return null;
  
  const stepId = parseInt(stepMatch[1], 10);
  const targetStep = steps.find(s => s.id === stepId);
  if (!targetStep) return null;
  
  let field = null;

  // ── PRIORITY 1: Marketplace / vendor keywords (must come before "macro" check
  //    because users often say "marketplace for the macro section" and the word
  //    "macro" appears as context, NOT as the target field).
  if (
    text.includes("marketplace") ||
    text.includes("vendor") ||
    text.includes("vendors") ||
    text.includes("market") ||
    text.includes("resource") ||
    text.includes("provider") ||
    text.includes("platform") ||
    text.includes("mentor") ||
    text.includes("bootcamp") ||
    text.includes("certification")
  ) {
    field = "marketplace";

  // ── PRIORITY 2: micro_steps (before generic "micro" check)
  } else if (
    text.includes("micro_steps") || 
    text.includes("micro steps") || 
    text.includes("micro-steps") || 
    text.includes("microstep") || 
    text.includes("checklist") || 
    text.includes("todo")
  ) {
    field = "micro_steps";

  // ── PRIORITY 3: micro_view (generic micro, but NOT marketplace context)
  } else if (
    text.includes("micro_view") || 
    text.includes("micro view") || 
    text.includes("micro-view") || 
    text.includes("microview") || 
    text.includes("micro")
  ) {
    field = "micro_view";

  // ── PRIORITY 4: macro_view — only when "macro" is clearly the target
  } else if (
    text.includes("macro_view") ||
    text.includes("macro view") ||
    text.includes("macro-view") ||
    text.includes("macro")
  ) {
    field = "macro_view";

  } else if (text.includes("nano")) {
    field = "nano_view";

  } else if (text.includes("description") || text.includes("desc")) {
    field = "description";

  // ── PRIORITY 5: remaining marketplace synonyms (course, link)
  } else if (
    text.includes("course") || 
    text.includes("link")
  ) {
    field = "marketplace";
  }
  
  if (!field) return null;
  
  return {
    stepId,
    field,
    targetStep,
    instruction: prompt
  };
}

function RotateCwIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 4v6h-6" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  );
}

export default function Dashboard({ profile, pathData, userInput, initialCurrent = "", onPathGenerated, onStepClick, onGenerationStart, onProfileUpdated, selectedAltIdx, setSelectedAltIdx }) {
  const [current, setCurrent] = useState(userInput?.current || initialCurrent);
  const [goal, setGoal] = useState(userInput?.goal || "");
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const [error, setError] = useState("");
  const [activeStep, setActiveStep] = useState(null);
  const [refinePrompt, setRefinePrompt] = useState("");
  const [savingPath, setSavingPath] = useState(false);
  const [regeneratingIdx, setRegeneratingIdx] = useState(null);

  const activePath = pathData?.alternatives ? pathData.alternatives[selectedAltIdx] : pathData;
  const steps = activePath?.macro_path || [];

  const handleSavePath = async () => {
    if (!activePath) {
      console.warn("[Naavi Dashboard] Save Path called but no active path exists.");
      return;
    }
    console.log("[Naavi Dashboard] Saving path to review. ActivePath details:", {
      title: activePath.path_title,
      duration: activePath.total_duration,
      readiness: activePath.readiness_score,
      stepsCount: activePath.macro_path?.length
    });
    setSavingPath(true);
    try {
      const res = await fetch(`${API}/api/paths/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_position: userInput.current,
          target_goal: userInput.goal,
          profile: profile,
          roadmap_data: activePath
        })
      });
      if (!res.ok) throw new Error("Failed to save path");
      const data = await res.json();
      console.log("[Naavi Dashboard] Save Path API success response:", data);
      
      // Update the pathData with the new db_id and status
      const updatedActivePath = {
        ...activePath,
        db_id: data.db_id,
        status: "under_admin_review"
      };

      let mergedData;
      if (pathData?.alternatives) {
        const newAlternatives = [...pathData.alternatives];
        newAlternatives[selectedAltIdx] = updatedActivePath;
        mergedData = {
          ...pathData,
          alternatives: newAlternatives
        };
      } else {
        mergedData = updatedActivePath;
      }
      
      console.log("[Naavi Dashboard] Updating path state with saved database reference.");
      onPathGenerated(mergedData, userInput);
    } catch (err) {
      console.error("[Naavi Dashboard] Save Path error:", err);
      alert(err.message || "Failed to save pathway");
    } finally {
      setSavingPath(false);
    }
  };

  const handleDeletePath = () => {
    console.log("[Naavi Dashboard] Delete Path triggered. Target path option:", activePath?.option_name, "Index:", selectedAltIdx);
    const confirmDelete = window.confirm(`Are you sure you want to delete the "${activePath?.option_name || 'this'}" pathway option?`);
    if (!confirmDelete) {
      console.log("[Naavi Dashboard] Delete canceled by user.");
      return;
    }

    if (pathData?.alternatives) {
      const remainingAlts = pathData.alternatives.filter((_, idx) => idx !== selectedAltIdx);
      console.log(`[Naavi Dashboard] Alternatives deleted. Remaining alternative options:`, remainingAlts.map(a => a.option_name));
      if (remainingAlts.length > 0) {
        setSelectedAltIdx(0);
        setActiveStep(null);
        onPathGenerated({
          ...pathData,
          alternatives: remainingAlts
        }, userInput);
      } else {
        console.log("[Naavi Dashboard] No remaining alternatives. Clearing path completely.");
        onPathGenerated(null, null);
      }
    } else {
      console.log("[Naavi Dashboard] No alternatives wrapper. Clearing path completely.");
      onPathGenerated(null, null);
    }
  };

  useEffect(() => {
    if (userInput?.current) {
      setCurrent(userInput.current);
    } else {
      setCurrent(initialCurrent);
    }
  }, [userInput?.current, initialCurrent]);

  useEffect(() => {
    if (userInput?.goal) {
      setGoal(userInput.goal);
    } else {
      setGoal("");
    }
  }, [userInput?.goal]);

  const goalAnalysis = analyzeGoalParts(goal);
  const refineAnalysis = analyzeRefinement(refinePrompt);
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
    console.log("[Naavi Dashboard] Status Event - Msg:", data.message, "Progress:", data.progress, "Statuses:", data.statuses);
    if (data.statuses) setWorkflowStatus(data.statuses);
    if (typeof data.progress === "number") setLoaderProgress(data.progress);
    if (data.message) setLoadMsg(data.message);
  }

  function handleStreamEvent(eventType, eventData, resultRef) {
    console.log(`[Naavi Dashboard] Stream Event - Type: "${eventType}"`);
    if (eventType === "status") {
      applyStatusEvent(eventData);
      return;
    }
    if (eventType === "result") {
      console.log("[Naavi Dashboard] Stream Event Result Payload received:", eventData);
      resultRef.current = eventData;
      return;
    }
    if (eventType === "error") {
      console.error("[Naavi Dashboard] Stream Event error received:", eventData);
      throw new Error(eventData.message || "Path generation failed");
    }
  }

  async function readPathStream(response) {
    if (!response.body) throw new Error("Backend did not return a progress stream");
    console.log("[Naavi Dashboard] Reading event-stream response stream...");

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const resultRef = { current: null };
    let buffer = "";

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        console.log("[Naavi Dashboard] Event stream reader complete.");
        break;
      }

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

    if (!resultRef.current) {
      console.error("[Naavi Dashboard] Stream ended, but no result payload was extracted from stream.");
      throw new Error("Path generation finished without returning a roadmap");
    }
    return resultRef.current;
  }

  async function generate(customPrompt = "", isTabRegen = false) {
    const promptText = typeof customPrompt === "string" ? customPrompt : "";
    if (!current.trim() || !isGoalValid) {
      console.warn("[Naavi Dashboard] Cannot generate pathway. Inputs invalid or empty:", { current, goal, isGoalValid });
      return;
    }
    
    const isRegen = isTabRegen && pathData !== null && pathData !== undefined;
    console.log("[Naavi Dashboard] generate() invoked:", {
      current,
      goal,
      isRegen,
      isTabRegen,
      refinePrompt: promptText || "(none)"
    });
    
    // SMART ROUTING: Check if prompt is targeting a specific step
    const surgicalInfo = parseSurgicalRefinement(promptText, steps);
    if (surgicalInfo) {
      console.log("[Naavi Dashboard] Smart Router: Detected surgical step update request:", surgicalInfo);
      setLoading(true);
      setError("");
      setLoadMsg(`Updating Step ${surgicalInfo.stepId} ${surgicalInfo.field} with AI...`);
      
      try {
        const payload = {
          step_id: surgicalInfo.stepId,
          field: surgicalInfo.field,
          instruction: surgicalInfo.instruction,
          current_step: surgicalInfo.targetStep,
          current_position: current,
          target_goal: goal,
          profile: profile || {}
        };
        
        console.log("[Naavi Dashboard] Routing to surgical Step Patch Agent:", `${API}/api/path/patch-step`, payload);
        const patchRes = await fetch(`${API}/api/path/patch-step`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        
        if (!patchRes.ok) {
          const errData = await patchRes.json().catch(() => ({}));
          throw new Error(errData.detail || "Step patch refinement failed");
        }
        
        const patchResult = await patchRes.json();
        console.log("[Naavi Dashboard] Surgical Step Patch success:", patchResult);
        
        // Merge the surgically updated step back into local macro_path
        const updatedSteps = steps.map(s => 
          s.id === surgicalInfo.stepId ? { ...s, [surgicalInfo.field]: patchResult.updated_value } : s
        );
        
        let newPathData;
        if (pathData?.alternatives) {
          const newAlternatives = [...pathData.alternatives];
          newAlternatives[selectedAltIdx] = {
            ...activePath,
            macro_path: updatedSteps
          };
          newPathData = {
            ...pathData,
            alternatives: newAlternatives
          };
        } else {
          newPathData = {
            ...pathData,
            macro_path: updatedSteps
          };
        }
        
        onPathGenerated(newPathData, userInput);
        setRefinePrompt("");
        setLoading(false);
        return;
      } catch (err) {
        console.error("[Naavi Dashboard] Surgical Step Patch error:", err);
        setError(err.message || "Surgical step refinement failed. Please try again.");
        setLoading(false);
        return;
      }
    }

    if (onGenerationStart) {
      onGenerationStart({ current, goal }, isRegen);
    }
    setLoading(true);
    setError("");

    if (isRegen) {
      setRegeneratingIdx(selectedAltIdx);
    } else {
      setRegeneratingIdx(null);
    }

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
      const payload = {
        current_position: current,
        target_goal: goal,
        profile: profile,
        refine_prompt: promptText || null,
        existing_roadmap: isRegen && promptText ? activePath : null,
        focus: isRegen && activePath ? activePath.option_name : null
      };
      console.log("[Naavi Dashboard] Calling Stream API endpoint:", `${API}/api/path/stream`, "Payload:", payload);
      
      const streamRes = await fetch(`${API}/api/path/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!streamRes.ok) {
        const errorData = await streamRes.json().catch(() => ({}));
        console.error("[Naavi Dashboard] Stream API responded with error:", errorData);
        throw new Error(errorData.detail || "Path generation failed");
      }

      const finalData = await readPathStream(streamRes);
      console.log("[Naavi Dashboard] Successfully parsed final roadmap data from stream:", finalData);
      setLoading(false);
      setRegeneratingIdx(null);

      let mergedData = finalData;
      if (finalData.alternatives && finalData.alternatives.length === 1) {
        if (pathData?.alternatives) {
          console.log("[Naavi Dashboard] Merging single alternative replacement back into alternatives array at index:", selectedAltIdx);
          const newAlternatives = [...pathData.alternatives];
          newAlternatives[selectedAltIdx] = {
            ...finalData.alternatives[0],
            option_name: activePath?.option_name || finalData.alternatives[0].option_name
          };
          mergedData = {
            ...pathData,
            alternatives: newAlternatives
          };
        } else {
          mergedData = finalData.alternatives[0];
        }
      } else {
        console.log("[Naavi Dashboard] Full set of alternatives generated. Resetting selected index to 0.");
        setSelectedAltIdx(0);
      }

      onPathGenerated(mergedData, { current, goal });
      if (promptText) {
        setRefinePrompt("");
      }

    } catch (e) {
      console.error("[Naavi Dashboard] Generation Exception:", e);
      setLoading(false);
      setRegeneratingIdx(null);
      setError(e.message.includes("fetch")
        ? "Cannot connect to backend. Run: uvicorn main:app --reload --port 8001"
        : e.message);
    }
  }

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

            {/* Naavi Goal Validation Widget */}
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
              onClick={() => generate("", false)}
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
          {pathData && (
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
              {refinePrompt.trim() !== "" && (
                <div className={`db-agent-validation ${refineAnalysis.isValid ? 'valid' : 'invalid'}`} style={{ marginTop: 12, marginBottom: 4 }}>
                  <div className="db-agent-avatar">
                    <div className="db-agent-pulse-ring" />
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2a3 3 0 0 0-3 3v2a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                      <rect x="4" y="8" width="16" height="12" rx="2" />
                      <path d="M9 17h6" />
                    </svg>
                  </div>
                  <div className="db-agent-body">
                    <span className="db-agent-title">Naavi Agent</span>
                    <p className="db-agent-text">
                      {refineAnalysis.message}
                    </p>
                  </div>
                </div>
              )}
              <button
                className="db-refine-btn"
                onClick={() => generate(refinePrompt, true)}
                disabled={loading || !refineAnalysis.isValid}
              >
                <IconNavigation size={14} /> Refine Pathway
              </button>
            </div>
          )}



        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="db-right">
        {!pathData && !loading ? (
          <div className="db-empty-state">
            <img
              src="/career_route.png"
              alt="Career Route Navigation Map"
              className="db-empty-illustration"
            />
            <h3 className="db-empty-title">Your path will appear here</h3>
            <p className="db-empty-sub">Enter your current situation and future goal on the left, then click Find My Path</p>
          </div>
        ) : (
          <div className="db-path-view">
            {/* Alternatives selector tabs */}
            <div className="db-alt-tabs">
              {(pathData?.alternatives || ["Academic & Research", "Practical & Industry", "Holistic & Career-Prep"]).map((alt, idx) => {
                const name = typeof alt === "string" ? alt : (alt.option_name || `Option ${idx + 1}`);
                return (
                  <button
                    key={idx}
                    className={`db-alt-tab-btn ${selectedAltIdx === idx ? 'active' : ''}`}
                    onClick={() => { setSelectedAltIdx(idx); setActiveStep(null); }}
                  >
                    <span className="tab-indicator" />
                    {name}
                  </button>
                );
              })}
            </div>

            {/* Route header */}
            <div className="db-route-header">
              <div className="db-route-header-left">
                <div className="db-route-from-to">
                  <div className="db-rt-row">
                    <span className="db-rt-dot green" />
                    <div>
                      <div className="db-rt-label">From</div>
                      <div className="db-rt-val">{userInput?.current || current}</div>
                    </div>
                  </div>
                  <div className="db-rt-vline" />
                  <div className="db-rt-row">
                    <span className="db-rt-dot red" />
                    <div>
                      <div className="db-rt-label">To</div>
                      <div className="db-rt-val">{userInput?.goal || goal}</div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="db-route-header-right">
                <div className="db-route-stat">
                  <span className="db-route-stat-val green-text">{activePath?.readiness_score || "--"}</span>
                  <span className="db-route-stat-lbl">Readiness</span>
                </div>
                <div className="db-route-stat">
                  <span className="db-route-stat-val">{activePath?.total_duration || "--"}</span>
                  <span className="db-route-stat-lbl">Duration</span>
                </div>
                <div className="db-route-stat">
                  <span className="db-route-stat-val">{steps?.length || 0}</span>
                  <span className="db-route-stat-lbl">Steps</span>
                </div>
              </div>
            </div>

            {/* Content Space */}
            {((loading && !pathData) || (loading && regeneratingIdx === selectedAltIdx)) ? (
              <div className="db-loading-state" style={{ padding: 0, background: 'transparent', boxShadow: 'none', minHeight: 'auto', height: 'auto' }}>
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
            ) : (
              activePath && (
                <>
                  {/* Pathway Overall Name & Description Card */}
                  {(activePath.path_title || activePath.path_description) && (
                    <div className="db-path-intro-card">
                      <div className="db-path-intro-header">
                        <span className="db-path-intro-icon-wrapper">
                          <IconRoute size={20} />
                        </span>
                        <h2 className="db-path-title">{activePath.path_title || `Pathway to ${userInput?.goal || goal}`}</h2>
                      </div>
                      {activePath.path_description && (
                        <p className="db-path-desc">{activePath.path_description}</p>
                      )}
                    </div>
                  )}

                  {/* Readiness bar */}
                  <div className="db-readiness-bar-row">
                    <span className="db-readiness-label">{activePath.readiness_label}</span>
                    <div className="db-readiness-track">
                      <div className="db-readiness-fill" style={{ width: `${activePath.readiness_score}%` }} />
                    </div>
                    <span className="db-readiness-score">{activePath.readiness_score}/100</span>
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

                  {/* Save/Delete pathway button at the bottom right */}
                  <div className="db-path-actions">
                    {!activePath.db_id && (
                      <button
                        className="db-regenerate-btn"
                        onClick={() => generate("", true)}
                        disabled={loading}
                      >
                        <RotateCwIcon size={14} /> Regenerate
                      </button>
                    )}
                    
                    <button
                      className="db-delete-path-btn"
                      onClick={handleDeletePath}
                      disabled={loading || savingPath}
                    >
                      Delete Pathway
                    </button>

                    {activePath.db_id ? (
                      <button className="db-save-path-btn saved" disabled>
                        <IconCheck size={14} /> Saved to Review
                      </button>
                    ) : (
                      <button
                        className="db-save-path-btn"
                        onClick={handleSavePath}
                        disabled={savingPath}
                      >
                        {savingPath ? "Saving..." : "Save Pathway"}
                      </button>
                    )}
                  </div>
                </>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
}
