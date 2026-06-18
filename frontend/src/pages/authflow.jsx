import { useState } from "react";

// ── localStorage helpers ──────────────────────────────────
const SESSION_KEY = "nv_session";
const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://127.0.0.1:8001" : "");

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
  { key: "name", label: "Full Name", type: "text", placeholder: "e.g. Aparna Ponnuru" },
  { key: "grade", label: "Grade / Class", type: "text", placeholder: "e.g. Grade 9, Class 11, B.Tech 2nd year" },
  { key: "curriculum", label: "Curriculum / Board", type: "select", options: ["CBSE", "ICSE", "State Board", "IB", "IGCSE", "University", "Other"] },
  { key: "stream", label: "Stream", type: "select", options: ["Science", "Commerce", "Arts", "Engineering", "Other"] },
  { key: "school", label: "School / College", type: "text", placeholder: "e.g. Delhi Public School" },
  { key: "performance", label: "Academic Performance", type: "select", options: ["Below 60%", "60%–74%", "75%–89%", "90% and above"] },
  { key: "financialSituation", label: "Financial Situation", type: "select", options: ["0-25%", "25-50%", "50-75%", "75-100%"] },
  {
    key: "personality", label: "Personality Type", type: "select", options: [
      "Realistic: Engineer, Electrician, Mechanic",
      "Investigative: Scientist, Data Analyst, AI Researcher",
      "Artistic: Designer, Writer, Animator",
      "Social: Teacher, Counselor, Nurse",
      "Enterprising: Entrepreneur, Manager, Marketing Executive",
      "Conventional: Accountant, Banker, Administrator"
    ]
  },
  { key: "country", label: "Country", type: "text", placeholder: "e.g. India" },
  { key: "state", label: "State", type: "text", placeholder: "e.g. Telangana" },
  { key: "city", label: "City", type: "text", placeholder: "e.g. Hyderabad" },
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


export default function AuthFlow({ onAuthenticated }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // ── Login ──
  async function handleLogin() {
    const e = email.trim().toLowerCase();
    if (!e || !e.includes("@")) { setEmailError("Enter a valid email address"); return; }
    if (!password.trim()) { setEmailError("Password is required"); return; }
    setEmailError("");
    try {
      const res = await fetch(`${API}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: e, password }),
      });
      if (res.status === 401) {
        setEmailError("Invalid email or password");
        return;
      }
      if (res.status === 403) {
        const errorData = await res.json().catch(() => ({}));
        setEmailError(errorData.detail || "Access forbidden.");
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

  return (
    <div className="auth-root">
      <div className="auth-panel">
        <div className="auth-brand">
          <img src="/naavi_logo.png" alt="Naavi logo" className="auth-logo-img" />
          {/* <span className="auth-logo-name">
            <span style={{ color: "var(--accent)", fontWeight: "700" }}>AI-Powered</span> Path Engine
          </span> */}
        </div>

        <div className="auth-card">
          <div className="auth-card-head">
            <h2 className="auth-title">Path Engine Admin Login</h2>
            {/* <p className="auth-sub">
              Log in with your administrator credentials to curate career pathways and manage student signals.
            </p> */}
          </div>

          <div className="auth-field-group">
            <label className="auth-field-label">Email address</label>
            <input
              type="email"
              className={`auth-input ${emailError ? "auth-input--error" : ""}`}
              placeholder="pathengine.admin@gmail.com"
              value={email}
              onChange={e => { setEmail(e.target.value); setEmailError(""); }}
              onKeyDown={e => e.key === "Enter" && handleLogin()}
              autoFocus
            />
            <span className="auth-field-note">Default admin login uses the email pathengine.admin@gmail.com.</span>
          </div>

          <div className="auth-field-group">
            <label className="auth-field-label">Password</label>
            <div className="password-input-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                className={`auth-input ${emailError ? "auth-input--error" : ""}`}
                placeholder="••••••••"
                value={password}
                onChange={e => { setPassword(e.target.value); setEmailError(""); }}
                onKeyDown={e => e.key === "Enter" && handleLogin()}
              />
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setShowPassword(prev => !prev)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            {emailError && <span className="auth-field-error">{emailError}</span>}
          </div>

          <button
            className="auth-btn-primary"
            onClick={handleLogin}
            disabled={!email.trim() || !password.trim()}
          >
            Log In →
          </button>
        </div>
      </div>

      <div className="auth-visual">
        <img src="/pure_education_roadmap.png" alt="AI Career Pathways" className="auth-visual-image" />
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
      .auth-brand {
        display: flex;
        align-items: center;
        gap: 10px;
        margin-bottom: 8px;
      }
      .auth-logo-img {
        width: 250px;
        height: 60px;
        object-fit: contain;
      }
      .auth-logo-name {
        font-family: var(--font-display);
        font-size: 18px;
        font-weight: 600;
        color: var(--text);
        letter-spacing: -0.01em;
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
        font-size: 20px;
        font-weight: 600;
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

      .password-input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
      }
      .password-input-wrapper .auth-input {
        padding-right: 50px;
      }
      .password-toggle-btn {
        position: absolute;
        right: 12px;
        background: none;
        border: none;
        color: var(--accent);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        outline: none;
      }
      .password-toggle-btn:hover {
        color: var(--accent2);
      }

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

      /* Right visual panel */
      .auth-visual {
        background: #F8F9FA;
        display: flex; align-items: center; justify-content: center;
        padding: 0;
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
      .auth-visual-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        z-index: 2;
        animation: fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both;
      }

      @media (max-width: 860px) {
        .auth-root { grid-template-columns: 1fr; }
        .auth-visual { display: none; }
        .auth-panel { padding: 40px 24px; }
      }
    `}</style>
  );
}
