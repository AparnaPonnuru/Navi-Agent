import { useState } from "react";

// ── localStorage helpers ──────────────────────────────────
const SESSION_KEY = "nv_session";
const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:8000" : "");

function getLocalProfile(email) {
  try { return JSON.parse(localStorage.getItem(`nv_profile_${email}`) || "null"); }
  catch { return null; }
}
function saveLocalProfile(email, profile) {
  localStorage.setItem(`nv_profile_${email}`, JSON.stringify(profile));
}
function getSession() {
  try { return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null"); }
  catch { return null; }
}
function saveSession(email) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(email));
}
function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

// ── Field configs ─────────────────────────────────────────
const PROFILE_FIELDS = [
  { key: "name",              label: "Full Name",           type: "text",   placeholder: "e.g. Aparna Ponnuru" },
  { key: "grade",             label: "Grade / Class",       type: "text",   placeholder: "e.g. Grade 9, Class 11, B.Tech 2nd year" },
  { key: "curriculum",        label: "Curriculum / Board",  type: "select", options: ["CBSE", "ICSE", "State Board", "IB", "IGCSE", "University", "Other"] },
  { key: "stream",            label: "Stream",              type: "select", options: ["Science", "Commerce", "Arts", "Engineering", "Other"] },
  { key: "school",            label: "School / College",    type: "text",   placeholder: "e.g. Delhi Public School" },
  { key: "performance",       label: "Academic Performance",type: "select", options: ["Below 60%", "60%–74%", "75%–89%", "90% and above"] },
  { key: "financialSituation",label: "Financial Situation", type: "select", options: ["Limited budget", "Moderate budget", "Comfortable — can invest in premium courses/coaching"] },
  { key: "personality",       label: "Personality Type",    type: "select", options: ["Introvert", "Extrovert", "Ambivert", "Social — I thrive working with and helping people", "Analytical — I prefer working with data and logic", "Creative — I enjoy building and designing things"] },
  { key: "country",           label: "Country",             type: "text",   placeholder: "e.g. India" },
  { key: "state",             label: "State",               type: "text",   placeholder: "e.g. Telangana" },
  { key: "city",              label: "City",                type: "text",   placeholder: "e.g. Hyderabad" },
];

// ── Auth hook ─────────────────────────────────────────────
export function useAuth() {
  const session = getSession();
  if (!session) return { user: null, profile: null };
  const profile = getLocalProfile(session);
  return { user: session, profile };
}

export function logout() {
  clearSession();
}

// ── Main AuthFlow component ───────────────────────────────
export default function AuthFlow({ onAuthenticated }) {
  const [mode, setMode]       = useState("login"); // "login" | "signup" | "profile"
  const [email, setEmail]     = useState("");
  const [emailError, setEmailError] = useState("");
  const [profileData, setProfileData] = useState({});
  const [profileErrors, setProfileErrors] = useState({});
  const [step, setStep]       = useState(0); // profile creation step

  // ── Login ──
  async function handleLogin() {
    const e = email.trim().toLowerCase();
    if (!e || !e.includes("@")) { setEmailError("Enter a valid email address"); return; }
    setEmailError("");
    try {
      const res = await fetch(`${API}/api/profile/${encodeURIComponent(e)}`);
      if (res.status === 404) {
        setEmailError("No account found. Sign up first.");
        return;
      }
      if (!res.ok) throw new Error("Server error during login");
      const profileData = await res.json();
      saveSession(e);
      saveLocalProfile(e, profileData);
      onAuthenticated(e, profileData);
    } catch (err) {
      setEmailError("Unable to connect to the server. Please try again.");
      console.error(err);
    }
  }

  // ── Signup: check email ──
  async function handleSignup() {
    const e = email.trim().toLowerCase();
    if (!e || !e.includes("@")) { setEmailError("Enter a valid email address"); return; }
    setEmailError("");
    try {
      const res = await fetch(`${API}/api/profile/${encodeURIComponent(e)}`);
      if (res.ok) {
        setEmailError("Account already exists. Log in instead.");
        return;
      }
      if (res.status === 404) {
        setEmailError("");
        setMode("profile");
      } else {
        throw new Error("Server error during signup check");
      }
    } catch (err) {
      setEmailError("Unable to connect to the server. Please try again.");
      console.error(err);
    }
  }

  // ── Profile field change ──
  function handleField(key, value) {
    setProfileData(prev => ({ ...prev, [key]: value }));
    if (profileErrors[key]) setProfileErrors(prev => ({ ...prev, [key]: "" }));
  }

  // ── Profile steps ──
  const STEPS = [
    { title: "Academic details",  fields: ["name","grade","curriculum","stream","school"] },
    { title: "About you",         fields: ["performance","financialSituation","personality"] },
    { title: "Your location",     fields: ["country","state","city"] },
  ];

  async function handleNextStep() {
    const currentFields = STEPS[step].fields;
    const errors = {};
    currentFields.forEach(key => {
      const val = profileData[key];
      if (!val || (typeof val === "string" && !val.trim())) {
        errors[key] = "This field is required";
      }
    });
    if (Object.keys(errors).length) { setProfileErrors(errors); return; }
    if (step < STEPS.length - 1) { setStep(s => s + 1); return; }
    
    // Final save to backend MongoDB
    const e = email.trim().toLowerCase();
    const payload = {
      ...profileData,
      email: e
    };
    
    try {
      const res = await fetch(`${API}/api/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || "Failed to save profile on server");
      }
      const savedProfile = await res.json();
      saveSession(e);
      saveLocalProfile(e, savedProfile);
      onAuthenticated(e, savedProfile);
    } catch (err) {
      alert(`Error saving profile: ${err.message}`);
      console.error(err);
    }
  }

  // ── Render ──
  const isLogin = mode === "login";

  if (mode === "profile") {
    const currentStep = STEPS[step];
    const currentFields = currentStep.fields.map(k => PROFILE_FIELDS.find(f => f.key === k));

    return (
      <div className="auth-root">
        <div className="auth-panel profile-panel">
          <div className="auth-brand">
            <div className="auth-logo">N</div>
            <span className="auth-logo-name">Naaviverse</span>
          </div>

          <div className="profile-progress">
            {STEPS.map((s, i) => (
              <div key={i} className={`progress-step ${i <= step ? "progress-step--done" : ""} ${i === step ? "progress-step--active" : ""}`}>
                <div className="progress-dot">{i < step ? "✓" : i + 1}</div>
                <span>{s.title}</span>
              </div>
            ))}
          </div>

          <div className="auth-card">
            <div className="auth-card-head">
              <h2 className="auth-title">{currentStep.title}</h2>
              <p className="auth-sub">Step {step + 1} of {STEPS.length}</p>
            </div>

            <div className="profile-fields">
              {currentFields.map(field => (
                <div key={field.key} className="auth-field-group">
                  <label className="auth-field-label">{field.label}</label>
                  {field.type === "select" ? (
                    <select
                      className={`auth-input ${profileErrors[field.key] ? "auth-input--error" : ""}`}
                      value={profileData[field.key] || ""}
                      onChange={e => handleField(field.key, e.target.value)}
                    >
                      <option value="">Select {field.label}</option>
                      {field.options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      className={`auth-input ${profileErrors[field.key] ? "auth-input--error" : ""}`}
                      placeholder={field.placeholder}
                      value={profileData[field.key] || ""}
                      onChange={e => handleField(field.key, e.target.value)}
                    />
                  )}
                  {profileErrors[field.key] && (
                    <span className="auth-field-error">{profileErrors[field.key]}</span>
                  )}
                </div>
              ))}
            </div>

            <div className="profile-actions">
              {step > 0 && (
                <button className="auth-btn-ghost" onClick={() => setStep(s => s - 1)}>
                  ← Back
                </button>
              )}
              <button className="auth-btn-primary" onClick={handleNextStep}>
                {step < STEPS.length - 1 ? "Next →" : "Complete Profile →"}
              </button>
            </div>
          </div>
        </div>

        <div className="auth-visual">
          <div className="auth-visual-inner">
            <div className="auth-visual-badge">Profile Setup</div>
            <h1 className="auth-visual-title">Build your<br /><em>journey map</em></h1>
            <p className="auth-visual-desc">Your profile helps us generate a path that fits exactly where you are and where you want to go.</p>
            <div className="auth-visual-dots">
              {STEPS.map((_, i) => (
                <div key={i} className={`visual-dot ${i <= step ? "visual-dot--active" : ""}`} />
              ))}
            </div>
          </div>
        </div>

        <AuthStyles />
      </div>
    );
  }

  return (
    <div className="auth-root">
      <div className="auth-panel">
        <div className="auth-brand">
          <div className="auth-logo">N</div>
          <span className="auth-logo-name">Naaviverse</span>
        </div>

        <div className="auth-card">
          <div className="auth-card-head">
            <h2 className="auth-title">{isLogin ? "Welcome back" : "Create account"}</h2>
            <p className="auth-sub">
              {isLogin
                ? "Log in to load your saved profile and continue your journey."
                : "Sign up with your email to create your profile and get started."}
            </p>
          </div>

          <div className="auth-field-group">
            <label className="auth-field-label">Email address</label>
            <input
              type="email"
              className={`auth-input ${emailError ? "auth-input--error" : ""}`}
              placeholder="you@example.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setEmailError(""); }}
              onKeyDown={e => e.key === "Enter" && (isLogin ? handleLogin() : handleSignup())}
              autoFocus
            />
            {emailError && <span className="auth-field-error">{emailError}</span>}
          </div>

          <button
            className="auth-btn-primary"
            onClick={isLogin ? handleLogin : handleSignup}
            disabled={!email.trim()}
          >
            {isLogin ? "Log In →" : "Continue →"}
          </button>

          <div className="auth-divider"><span>or</span></div>

          <button className="auth-btn-ghost" onClick={() => { setMode(isLogin ? "signup" : "login"); setEmailError(""); }}>
            {isLogin ? "New here? Create account" : "Already have an account? Log in"}
          </button>
        </div>

        {/* <p className="auth-footnote">
          No password needed — your data stays in this browser only.
        </p> */}
      </div>

      <div className="auth-visual">
        <div className="auth-visual-inner">
          <div className="auth-visual-badge">AI Path Engine</div>
          <h1 className="auth-visual-title">Map your<br /><em>career route</em></h1>
          <p className="auth-visual-desc">Enter your current situation, set your goal, and get a step-by-step path built just for you.</p>
          <div className="auth-features">
            {["Personalised career roadmap","Macro, micro & nano guidance","Mentors and learning resources"].map((f, i) => (
              <div key={i} className="auth-feature-item">
                <span className="auth-feature-dot" />
                <span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <AuthStyles />
    </div>
  );
}

function AuthStyles() {
  return (
    <style>{`
      .auth-root {
        min-height: 100vh;
        display: grid;
        grid-template-columns: 1fr 1fr;
        background: #F5F8F6;
        font-family: var(--font-body);
      }
      .auth-panel {
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 60px 56px;
        gap: 28px;
        animation: fadeUp 0.4s ease both;
      }
      .profile-panel {
        justify-content: flex-start;
        padding-top: 40px;
        overflow-y: auto;
        max-height: 100vh;
      }
      .auth-brand {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }
      .auth-logo {
        width: 36px; height: 36px; border-radius: 10px;
       background: linear-gradient(135deg, var(--green), var(--blue));
        color: #fff; font-weight: 700; font-size: 17px;
        display: flex; align-items: center; justify-content: center;
        font-family: var(--font-display);
      }
      .auth-logo-name {
        font-family: var(--font-display);
        font-size: 20px;
        color: var(--text);
      }
      .auth-card {
        background: #fff;
        border: 1px solid var(--border);
        border-radius: 20px;
        padding: 36px 32px;
        box-shadow: 0 4px 32px rgba(43,174,142,0.09);
        display: flex;
        flex-direction: column;
        gap: 20px;
      }
      .auth-card-head { display: flex; flex-direction: column; gap: 6px; }
      .auth-title {
        font-family: var(--font-display);
        font-size: 28px;
        color: var(--text);
        line-height: 1.2;
      }
      .auth-sub { font-size: 14px; color: var(--text2); line-height: 1.6; }

      .auth-field-group { display: flex; flex-direction: column; gap: 7px; }
      .auth-field-label { font-size: 13px; font-weight: 600; color: var(--text2); }
      .auth-input {
        width: 100%; padding: 13px 15px;
        border: 1.5px solid var(--border); border-radius: 10px;
        background: var(--bg); color: var(--text);
        font-family: var(--font-body); font-size: 15px;
        outline: none; transition: border-color 0.2s, box-shadow 0.2s;
      }
      .auth-input:focus {
        border-color: var(--accent);
        box-shadow: 0 0 0 3px rgba(43,174,142,0.12);
      }
      .auth-input--error { border-color: #F07A5A; }
      .auth-field-error { font-size: 12px; color: #C05A3A; }

      .auth-btn-primary {
        width: 100%; padding: 14px;
        background: var(--accent); color: #fff;
        border: none; border-radius: 10px;
        font-family: var(--font-body); font-size: 15px; font-weight: 600;
        cursor: pointer; transition: background 0.2s, transform 0.15s;
        box-shadow: 0 4px 18px rgba(43,174,142,0.28);
      }
      .auth-btn-primary:hover:not(:disabled) {
        background: var(--accent2); transform: translateY(-1px);
      }
      .auth-btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

      .auth-btn-ghost {
        width: 100%; padding: 12px;
        background: none; color: var(--text2);
        border: 1.5px solid var(--border); border-radius: 10px;
        font-family: var(--font-body); font-size: 14px;
        cursor: pointer; transition: all 0.2s;
      }
      .auth-btn-ghost:hover { border-color: var(--accent); color: var(--accent); }

      .auth-divider {
        display: flex; align-items: center; gap: 12px;
        color: var(--text3); font-size: 12px;
      }
      .auth-divider::before, .auth-divider::after {
        content: ""; flex: 1; height: 1px; background: var(--border);
      }

      .auth-footnote { font-size: 12px; color: var(--text3); text-align: center; }

      /* Profile steps progress */
      .profile-progress {
        display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap;
      }
      .progress-step {
        display: flex; align-items: center; gap: 8px;
        font-size: 12px; color: var(--text3); font-weight: 500;
        padding: 6px 12px; border-radius: 20px;
        border: 1.5px solid var(--border); background: #fff;
        transition: all 0.2s;
      }
      .progress-step--active {
        border-color: var(--accent); color: var(--accent2);
        background: var(--accent-soft);
      }
      .progress-step--done {
        border-color: var(--accent); color: var(--accent2);
        background: var(--accent-soft);
      }
      .progress-dot {
        width: 20px; height: 20px; border-radius: 50%;
        background: var(--border); color: var(--text3);
        font-size: 10px; font-weight: 700;
        display: flex; align-items: center; justify-content: center;
      }
      .progress-step--active .progress-dot,
      .progress-step--done .progress-dot {
        background: var(--accent); color: #fff;
      }

      .profile-fields { display: flex; flex-direction: column; gap: 16px; }

      .profile-actions {
        display: flex; gap: 12px; margin-top: 4px;
      }
      .profile-actions .auth-btn-primary { flex: 1; }
      .profile-actions .auth-btn-ghost   { flex: 0 0 auto; width: auto; padding: 12px 20px; }

      /* Right visual panel */
      .auth-visual {
        background: linear-gradient(135deg, rgba(52,168,83,0.1) 0%, rgba(66,133,244,0.08) 50%, rgba(232,49,42,0.06) 100%), #F8F9FA;
          linear-gradient(90deg, rgba(214,242,236,0.6) 0 1px, transparent 1px 48px),
          linear-gradient(0deg, rgba(214,242,236,0.6) 0 1px, transparent 1px 48px),
          #F0F7F4;
        display: flex; align-items: center; justify-content: center;
        padding: 60px 56px;
        position: relative; overflow: hidden;
      }
      .auth-visual::before {
        content: "";
        position: absolute; top: -80px; right: -80px;
        width: 320px; height: 320px; border-radius: 50%;
        background: radial-gradient(circle, rgba(43,174,142,0.18), transparent 70%);
      }
      .auth-visual::after {
        content: "";
        position: absolute; bottom: -60px; left: -60px;
        width: 240px; height: 240px; border-radius: 50%;
        background: radial-gradient(circle, rgba(90,155,232,0.14), transparent 70%);
      }
      .auth-visual-inner {
        position: relative; z-index: 1;
        display: flex; flex-direction: column; gap: 20px;
      }
      .auth-visual-badge {
        display: inline-flex; align-self: flex-start;
        padding: 5px 14px; border-radius: 20px;
        background: var(--accent-soft); color: var(--accent2);
        font-size: 12px; font-weight: 600;
      }
      .auth-visual-title {
        font-family: var(--font-display);
        font-size: clamp(36px, 4vw, 52px);
        line-height: 1.15; color: var(--text);
      }
      .auth-visual-title em { font-style: italic; color: var(--accent); }
      .auth-visual-desc { font-size: 16px; color: var(--text2); line-height: 1.7; max-width: 380px; }

      .auth-features { display: flex; flex-direction: column; gap: 12px; margin-top: 8px; }
      .auth-feature-item {
        display: flex; align-items: center; gap: 10px;
        font-size: 14px; color: var(--text2);
      }
      .auth-feature-dot {
        width: 8px; height: 8px; border-radius: 50%;
        background: var(--accent); flex-shrink: 0;
      }

      .auth-visual-dots { display: flex; gap: 8px; margin-top: 8px; }
      .visual-dot {
        width: 10px; height: 10px; border-radius: 50%;
        background: var(--border); transition: all 0.3s;
      }
      .visual-dot--active { background: var(--accent); transform: scale(1.2); }

      @media (max-width: 860px) {
        .auth-root { grid-template-columns: 1fr; }
        .auth-visual { display: none; }
        .auth-panel { padding: 40px 24px; }
        .profile-panel { max-height: none; }
      }
    `}</style>
  );
}