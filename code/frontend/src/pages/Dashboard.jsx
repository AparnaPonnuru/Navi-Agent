import { useState } from "react";
import {
  IconArrowRight,
  IconBrain,
  IconBuilding,
  IconGlobe,
  IconMap,
  IconNavigation,
  IconPackage,
  IconPin,
  IconRoute,
  IconSearch,
  IconShoppingCart,
  IconTarget,
} from "./Icons";

const API = import.meta.env.VITE_API_URL || "";

const EXAMPLES = [
  { current: "High school student, science stream", goal: "Become a Data Scientist" },
  { current: "Marketing executive, 3 years experience", goal: "Switch to Product Management" },
  { current: "Fresh graduate, computer science", goal: "Become a Full Stack Developer" },
  { current: "Working professional, no coding background", goal: "Break into AI/ML Engineering" },
  { current: "Design student, final year", goal: "Become a UX Designer at a startup" },
];

const LOADING_MSGS = [
  "Mapping your journey...",
  "Analyzing your starting point...",
  "Building your path...",
  "Finding key milestones...",
  "Almost there...",
];

function getProfileValue(profile, key) {
  return profile?.[key]?.trim?.() || profile?.[key] || "Not provided";
}

function formatPosition(profile) {
  const grade = getProfileValue(profile, "grade");
  const curriculum = getProfileValue(profile, "curriculum");
  return [grade, curriculum].filter(v => v !== "Not provided").join(" • ") || "Current position unavailable";
}

function ProfileDetail({ Icon, label, value }) {
  return (
    <div className="profile-detail">
      <div className="profile-detail-icon"><Icon size={16} /></div>
      <div>
        <div className="profile-detail-label">{label}</div>
        <div className="profile-detail-value">{value || "Not provided"}</div>
      </div>
    </div>
  );
}

export default function Dashboard({ profile, initialCurrent = "", onPathGenerated }) {
  const [current, setCurrent] = useState(initialCurrent);
  const [goal, setGoal] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadMsg, setLoadMsg] = useState("");
  const [error, setError] = useState("");
  const [detecting, setDetecting] = useState(false);
  const [coordinateError, setCoordinateError] = useState("");
  const [currentCoords, setCurrentCoords] = useState("");
  const [futureCoords, setFutureCoords] = useState("");

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
      const profileDetails = profile ? [
        getProfileValue(profile, "school") !== "Not provided" ? `School: ${getProfileValue(profile, "school")}` : "",
        getProfileValue(profile, "stream") !== "Not provided" ? `Academic Stream: ${getProfileValue(profile, "stream")}` : "",
        getProfileValue(profile, "performance") !== "Not provided" ? `Academic Performance: ${getProfileValue(profile, "performance")}` : "",
        getProfileValue(profile, "personality") !== "Not provided" ? `Personality: ${getProfileValue(profile, "personality")}` : "",
        getProfileValue(profile, "financialSituation") !== "Not provided" ? `Financial Situation / Budget Constraints: ${getProfileValue(profile, "financialSituation")}` : "",
        `Location Context: ${[getProfileValue(profile, "city"), getProfileValue(profile, "state"), getProfileValue(profile, "country")].filter(v => v !== "Not provided").join(", ")}`
      ].filter(Boolean).join(". ") : "";

      const enrichedGoal = `Current Position: ${current}. Target Goal: ${goal}.${profileDetails ? ` User Profile Context (incorporate this carefully into your milestones, resources, advice, and financial planning): ${profileDetails}` : ""}`;

      const res = await fetch(`${API}/api/path`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goal: enrichedGoal }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.detail || "Something went wrong");
      onPathGenerated(json, { current, goal });
    } catch (e) {
      setError(
        e.message.includes("fetch")
          ? "Cannot connect to backend. Run: uvicorn main:app --reload --port 8000"
          : e.message
      );
    } finally {
      clearInterval(iv);
      setLoading(false);
    }
  }

  function fillExample(ex) {
    setCurrent(ex.current);
    setGoal(ex.goal);
  }

  function detectCurrentCoordinates() {
    setCoordinateError("");
    if (!navigator.geolocation) {
      setCoordinateError("Location detection is not supported in this browser.");
      return;
    }

    setDetecting(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude.toFixed(5);
        const lng = pos.coords.longitude.toFixed(5);
        setCurrentCoords(`${lat}, ${lng}`);
        setDetecting(false);
      },
      () => {
        setCoordinateError("Could not detect location. Enter coordinates manually.");
        setDetecting(false);
      },
      { enableHighAccuracy: true, timeout: 9000 }
    );
  }

  const journeyDetails = [
    { Icon: IconBuilding, label: "School", value: getProfileValue(profile, "school") },
    { Icon: IconRoute, label: "Stream", value: getProfileValue(profile, "stream") },
    { Icon: IconTarget, label: "Performance", value: getProfileValue(profile, "performance") },
    { Icon: IconBrain, label: "Personality", value: getProfileValue(profile, "personality") },
    { Icon: IconPackage, label: "Financial Situation", value: getProfileValue(profile, "financialSituation") },
    { Icon: IconGlobe, label: "Country", value: getProfileValue(profile, "country") },
    { Icon: IconMap, label: "State", value: getProfileValue(profile, "state") },
    { Icon: IconPin, label: "City", value: getProfileValue(profile, "city") },
  ];

  return (
    <div className="page dash-page">
      <div className="dash-shell">
        <aside className="journey-panel">
          <div className="card journey-card">
            <div className="journey-card-head">
              <div>
                <div className="section-label">Career Journey</div>
                <h2 className="journey-title">{formatPosition(profile)}</h2>
              </div>
              <div className="journey-map-icon"><IconNavigation size={22} /></div>
            </div>

            <div className="route-map">
              <div className="route-station">
                <div className="route-marker route-marker-current"><IconPin size={17} /></div>
                <div className="route-station-copy">
                  <label className="route-kicker" htmlFor="current-position">Current position</label>
                  <textarea
                    id="current-position"
                    className="journey-input"
                    value={current}
                    onChange={e => setCurrent(e.target.value)}
                    disabled={loading}
                    rows={4}
                    placeholder="Describe where you are today"
                  />
                </div>
              </div>

              <div className="route-track">
                <span />
                <span />
                <span />
              </div>

              <div className="route-station">
                <div className="route-marker route-marker-goal"><IconTarget size={17} /></div>
                <div className="route-station-copy">
                  <label className="route-kicker" htmlFor="future-goal">Future goal</label>
                  <textarea
                    id="future-goal"
                    className="journey-input"
                    value={goal}
                    onChange={e => setGoal(e.target.value)}
                    disabled={loading}
                    rows={3}
                    placeholder="e.g. Become a Data Scientist"
                    onKeyDown={e => e.key === "Enter" && e.ctrlKey && generate()}
                  />
                </div>
              </div>
            </div>

            {error && <div className="error-box journey-error">{error}</div>}

            {loading ? (
              <div className="loading-row journey-loading">
                <div className="dot-pulse"><span/><span/><span/></div>
                <span style={{ fontSize: 14, color: "var(--text2)" }}>{loadMsg}</span>
              </div>
            ) : (
              <button
                className="btn-primary journey-cta"
                onClick={generate}
                disabled={!current.trim() || !goal.trim()}
              >
                Find My Path <IconArrowRight size={18} />
              </button>
            )}
          </div>

          <div className="card profile-card">
            <div className="profile-card-head">
              <div className="section-label">Profile Signals</div>
              <span className="profile-sync">Auto-fetched</span>
            </div>
            <div className="profile-detail-grid">
              {journeyDetails.map(item => (
                <ProfileDetail key={item.label} {...item} />
              ))}
            </div>
          </div>
        </aside>

        <section className="generator-panel">
          {loading ? (
            <div className="skeleton-container">
              <div className="skeleton-header">
                <div className="skeleton-badge shimmer-bg" />
                <div className="skeleton-title shimmer-bg" />
                <div className="skeleton-sub shimmer-bg" />
              </div>

              <div className="card skeleton-card">
                <div className="skeleton-canvas-sim">
                  <div className="skeleton-pulse-ring start" />
                  <div className="skeleton-pulse-ring end" />
                  <div className="skeleton-road-dash" />
                  <div className="skeleton-overlay-text">
                    <div className="dot-pulse"><span/><span/><span/></div>
                    <span>AI Path Engine is plotting your roadmap...</span>
                  </div>
                </div>
              </div>

              <div className="skeleton-grid">
                <div className="skeleton-tile shimmer-bg" />
                <div className="skeleton-tile shimmer-bg" />
                <div className="skeleton-tile shimmer-bg" />
              </div>
              
              <div className="skeleton-info-row">
                <div className="skeleton-info-card shimmer-bg" />
                <div className="skeleton-info-card shimmer-bg" />
              </div>
            </div>
          ) : (
            <>
              <div className="dash-hero">
                <div className="dash-hero-badge pill pill-teal">AI Path Engine</div>
                <h1 className="display-title" style={{ marginTop: 7, fontSize: "28px", fontWeight: "500" }}>
                  Your route is built from<br />
                  one <em style={{ fontWeight: "500" }}>journey source</em>
                </h1>
                <p className="dash-sub">
                  Update the career journey card on the left, then generate a step-by-step path from that single route.
                </p>
              </div>

              <div className="card route-visual-card">
                <div className="route-visual-head">
                  <div>
                    <div className="section-label">Journey Summary</div>
                    <h5>Route preview</h5>
                  </div>
                  <div className="journey-map-icon"><IconMap size={22} /></div>
                </div>

                <div className="map-canvas">
                  <div className="map-road map-road-main" />
                  <div className="map-road map-road-side" />
                  <div className="map-node map-node-start"><IconPin size={16} /></div>
                  <div className="map-node map-node-end"><IconTarget size={16} /></div>
                  <div className="map-label map-label-start">Current</div>
                  <div className="map-label map-label-end">{goal.trim() ? goal.trim() : "Goal"}</div>
                </div>

                <div className="summary-grid">
                  <div>
                    <span>Starting point</span>
                    <strong>{formatPosition(profile)}</strong>
                  </div>
                  <div>
                    <span>Destination</span>
                    <strong>{goal.trim() || "Not set yet"}</strong>
                  </div>
                  <div>
                    <span>Signal quality</span>
                    <strong>{current.trim() && goal.trim() ? "Ready to generate" : "Needs route details"}</strong>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 28 }}>
                <div className="section-label">Quick destinations</div>
                <div className="dash-chips">
                  {EXAMPLES.map((ex, i) => (
                    <button
                      key={i}
                      className="dash-chip"
                      onClick={() => fillExample(ex)}
                      disabled={loading}
                    >
                      {ex.goal}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: 40 }}>
                <div className="section-label">Route Intelligence</div>
                <div className="dash-steps-row">
                  {[
                    { Icon: IconPin, label: "Profile-aware start", desc: "Uses your saved grade, curriculum, stream and location context" },
                    { Icon: IconMap, label: "Single route source", desc: "The left journey card drives the generated path" },
                    { Icon: IconSearch, label: "Step clarity", desc: "Results focus on macro and micro understanding for each step" },
                    { Icon: IconShoppingCart, label: "Resource layer", desc: "Marketplace connects each step to mentors and learning options" },
                  ].map((s, i) => (
                    <div className="dash-how-card" key={i}>
                      <div className="dash-how-icon"><s.Icon size={28} /></div>
                      <div className="dash-how-label">{s.label}</div>
                      <div className="dash-how-desc">{s.desc}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      <style>{`
        .dash-page { max-width: 1180px; }
        .dash-shell {
          display: grid;
          grid-template-columns: minmax(320px, 410px) minmax(0, 1fr);
          gap: 24px;
          align-items: start;
        }
        .journey-panel {
          display: flex;
          flex-direction: column;
          gap: 18px;
          position: sticky;
          top: 92px;
          max-height: calc(100vh - 120px);
          overflow-y: auto;
          scrollbar-width: none; /* Hide default scrollbar for Firefox */
        }
        .journey-panel::-webkit-scrollbar {
          display: none; /* Hide default scrollbar for Chrome/Safari/Webkit */
        }
        .journey-card, .profile-card {
          padding: 22px;
          border-color: rgba(43, 174, 142, 0.22);
        }
        .journey-card {
          background:
            linear-gradient(180deg, rgba(214, 242, 236, 0.65), rgba(255, 255, 255, 0.96)),
            var(--bg2);
        }
        .journey-card-head, .profile-card-head, .route-visual-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 18px;
        }
        .journey-title {
          margin: 6px 0 0;
          font-size: 24px;
          line-height: 1.18;
          color: var(--text);
          font-family: var(--font-display);
        }
        .journey-map-icon {
          width: 42px;
          height: 42px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 12px;
          color: var(--accent2);
          background: var(--accent-soft);
          flex-shrink: 0;
        }
        .route-map {
          background: rgba(255, 255, 255, 0.72);
          border: 1px solid rgba(43, 174, 142, 0.2);
          border-radius: 14px;
          padding: 16px;
        }
        .route-station {
          display: flex;
          gap: 12px;
          align-items: flex-start;
        }
        .route-marker {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          box-shadow: 0 8px 20px rgba(17, 24, 39, 0.12);
        }
        .route-marker-current {
          color: #fff;
          background: var(--accent);
        }
        .route-marker-goal {
          color: #fff;
          background: var(--coral);
        }
        .route-station-copy {
          display: flex;
          flex-direction: column;
          gap: 6px;
          min-width: 0;
          flex: 1;
        }
        .route-kicker {
          font-size: 11px;
          color: var(--text3);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 600;
        }
        .journey-input {
          width: 100%;
          resize: vertical;
          min-height: 76px;
          border: 1px solid var(--border);
          background: #fff;
          border-radius: 10px;
          padding: 10px 12px;
          color: var(--text);
          font-size: 13px;
          line-height: 1.5;
          font-family: var(--font-body);
          outline: none;
        }
        .journey-input:focus {
          border-color: var(--accent);
          box-shadow: 0 0 0 3px rgba(43, 174, 142, 0.12);
        }
        .route-station-copy span:last-child {
          font-size: 12px;
          color: var(--text2);
          line-height: 1.35;
        }
        .coord-status-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }
        .inline-detect-btn {
          background: var(--accent-soft);
          border: 1px solid rgba(43, 174, 142, 0.25);
          color: var(--accent2);
          font-family: var(--font-body);
          font-size: 11px;
          font-weight: 700;
          padding: 4px 8px;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .inline-detect-btn:hover {
          background: var(--accent);
          color: #fff;
          border-color: var(--accent);
        }
        .route-track {
          width: 34px;
          min-height: 42px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 7px;
        }
        .route-track span {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--border);
        }
        .journey-error {
          font-size: 12px;
          line-height: 1.5;
          margin-top: 14px;
        }
        .journey-loading {
          padding-bottom: 0;
        }
        .journey-cta {
          width: 100%;
          justify-content: center;
          margin-top: 16px;
          padding: 14px;
        }
        .profile-sync {
          font-size: 11px;
          font-weight: 700;
          color: var(--accent2);
          background: var(--accent-soft);
          border-radius: 999px;
          padding: 5px 9px;
          white-space: nowrap;
        }
        .profile-detail-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 8px;
        }
        .profile-detail {
          display: flex;
          gap: 8px;
          align-items: center;
          padding: 8px 10px;
          border-radius: 10px;
          background: var(--bg3);
          border: 1px solid var(--border);
        }
        .profile-detail-icon {
          width: 30px;
          height: 30px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          color: var(--accent2);
          background: #fff;
          flex-shrink: 0;
        }
        .profile-detail-label {
          font-size: 10px;
          color: var(--text3);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          font-weight: 600;
          margin-bottom: 1px;
        }
        .profile-detail-value {
          font-size: 12px;
          color: var(--text);
          line-height: 1.3;
          font-weight: 500;
        }
        .generator-panel {
          min-width: 0;
        }
        .dash-hero { text-align: left; margin-bottom: 24px; }
        .dash-sub {
          margin-top: 14px;
          font-size: 16px;
          color: var(--text2);
          max-width: 580px;
          line-height: 1.7;
        }
        .route-visual-card {
          padding: 24px;
          overflow: hidden;
        }
        .route-visual-head h3 {
          margin: 4px 0 0;
          font-size: 22px;
          color: var(--text);
          font-family: var(--font-display);
        }
        
        /* Map Canvas & Node Animations */
        @keyframes pulseGlow {
          0% { box-shadow: 0 0 0 0 rgba(43, 174, 142, 0.45); }
          70% { box-shadow: 0 0 0 10px rgba(43, 174, 142, 0); }
          100% { box-shadow: 0 0 0 0 rgba(43, 174, 142, 0); }
        }
        @keyframes pulseGlowCoral {
          0% { box-shadow: 0 0 0 0 rgba(234, 114, 83, 0.45); }
          70% { box-shadow: 0 0 0 10px rgba(234, 114, 83, 0); }
          100% { box-shadow: 0 0 0 0 rgba(234, 114, 83, 0); }
        }
        @keyframes mapFlow {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }

        .map-canvas {
          position: relative;
          height: 260px;
          border-radius: 18px;
          overflow: hidden;
          border: 1px solid var(--border);
          background:
            linear-gradient(90deg, rgba(90, 155, 232, 0.12) 0 1px, transparent 1px 46px),
            linear-gradient(0deg, rgba(43, 174, 142, 0.12) 0 1px, transparent 1px 46px),
            linear-gradient(135deg, #F7FBF9, #EEF6F2);
        }
        .map-road {
          position: absolute;
          background: #D7E3DD;
          border-radius: 999px;
        }
        .map-road-main {
          width: 72%;
          height: 12px;
          left: 12%;
          top: 52%;
          transform: rotate(-12deg);
          background: linear-gradient(90deg, #D7E3DD 0%, #D7E3DD 35%, #5ABBE8 50%, #D7E3DD 65%, #D7E3DD 100%);
          background-size: 200% auto;
          animation: mapFlow 4s linear infinite;
        }
        .map-road-side {
          width: 46%;
          height: 8px;
          right: 6%;
          top: 32%;
          transform: rotate(32deg);
          opacity: 0.7;
        }
        .map-node {
          position: absolute;
          width: 42px;
          height: 42px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
        }
        .map-node-start {
          left: 16%;
          top: 56%;
          background: var(--accent);
          animation: pulseGlow 3s infinite;
          box-shadow: 0 12px 26px rgba(43, 174, 142, 0.3);
        }
        .map-node-end {
          right: 17%;
          top: 34%;
          background: var(--coral);
          animation: pulseGlowCoral 3s infinite 1.5s;
          box-shadow: 0 12px 26px rgba(234, 114, 83, 0.3);
        }
        .map-label {
          position: absolute;
          padding: 6px 12px;
          border-radius: 999px;
          background: #fff;
          border: 1px solid var(--border);
          box-shadow: var(--shadow);
          font-size: 12px;
          font-weight: 700;
          color: var(--text2);
          max-width: 140px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .map-label-start {
          left: 11%;
          top: 74%;
        }
        .map-label-end {
          right: 13%;
          top: 18%;
        }
        .summary-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
          margin-top: 16px;
        }
        .summary-grid div {
          padding: 14px;
          border-radius: 12px;
          background: var(--bg3);
          border: 1px solid var(--border);
        }
        .summary-grid span {
          display: block;
          margin-bottom: 5px;
          font-size: 11px;
          color: var(--text3);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 700;
        }
        .summary-grid strong {
          display: block;
          font-size: 13px;
          color: var(--text);
          line-height: 1.4;
        }
        .dash-chips {
          display: flex; flex-wrap: wrap; gap: 10px;
        }
        .dash-chip {
          background: var(--bg2); border: 1.5px solid var(--border);
          border-radius: 20px; padding: 8px 16px;
          font-size: 13px; color: var(--text2);
          font-family: var(--font-body); cursor: pointer;
          transition: all 0.2s;
        }
        .dash-chip:hover:not(:disabled) {
          border-color: var(--accent); color: var(--accent);
          background: var(--accent-soft);
        }
        .dash-chip:disabled { opacity: 0.5; cursor: not-allowed; }
        .dash-steps-row {
          display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
          gap: 14px;
        }
        .dash-how-card {
          background: var(--bg2); border: 1px solid var(--border);
          border-radius: var(--radius); padding: 18px;
          transition: box-shadow 0.2s;
        }
        .dash-how-card:hover { box-shadow: var(--shadow); }
        .dash-how-icon { display: flex; color: var(--accent); margin-bottom: 10px; }
        .dash-how-label { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 6px; }
        .dash-how-desc { font-size: 13px; color: var(--text2); line-height: 1.6; }

        /* Skeleton Screen & Shimmer Animation */
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .shimmer-bg {
          background: linear-gradient(90deg, var(--bg3) 25%, var(--border) 50%, var(--bg3) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.8s infinite linear;
        }
        .skeleton-container {
          display: flex;
          flex-direction: column;
          gap: 20px;
          animation: fadeIn 0.4s ease-out;
        }
        .skeleton-header {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-bottom: 4px;
        }
        .skeleton-badge {
          width: 90px;
          height: 18px;
          border-radius: 9px;
        }
        .skeleton-title {
          width: 65%;
          height: 32px;
          border-radius: 8px;
        }
        .skeleton-sub {
          width: 45%;
          height: 15px;
          border-radius: 6px;
        }
        .skeleton-card {
          height: 260px;
          border-radius: 18px;
          border: 1px solid var(--border);
          position: relative;
          overflow: hidden;
          background: var(--bg3);
        }
        .skeleton-canvas-sim {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
        }
        .skeleton-pulse-ring {
          position: absolute;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: 2.5px solid var(--accent);
          opacity: 0.7;
        }
        .skeleton-pulse-ring.start {
          left: 20%;
          top: 55%;
          animation: pulseGlow 1.8s infinite;
        }
        .skeleton-pulse-ring.end {
          right: 20%;
          top: 35%;
          animation: pulseGlowCoral 1.8s infinite 0.9s;
          border-color: var(--coral);
        }
        .skeleton-road-dash {
          position: absolute;
          width: 58%;
          height: 4px;
          left: 21%;
          top: 48%;
          transform: rotate(-10deg);
          border-top: 3px dashed var(--border);
          opacity: 0.6;
        }
        .skeleton-overlay-text {
          position: absolute;
          width: 100%;
          bottom: 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
        .skeleton-overlay-text span {
          font-size: 13px;
          color: var(--text2);
          font-weight: 500;
        }
        .skeleton-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .skeleton-tile {
          height: 80px;
          border-radius: 12px;
          border: 1px solid var(--border);
        }
        .skeleton-info-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        .skeleton-info-card {
          height: 110px;
          border-radius: var(--radius);
          border: 1px solid var(--border);
        }

        @media (max-width: 980px) {
          .dash-shell {
            grid-template-columns: 1fr;
          }
          .journey-panel {
            position: static;
          }
          .profile-detail-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .summary-grid, .skeleton-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .dash-page {
            padding-left: 14px;
            padding-right: 14px;
          }
          .journey-card, .profile-card, .route-visual-card {
            padding: 18px;
          }
          .journey-title {
            font-size: 21px;
          }
          .profile-detail-grid,
          .dash-steps-row,
          .skeleton-grid,
          .skeleton-info-row {
            grid-template-columns: 1fr;
          }
          .map-canvas, .skeleton-card {
            height: 220px;
          }
        }
      `}</style>
    </div>
  );
}



//CHECKED THE CHANGED AND PUBLISHED THE CODE 