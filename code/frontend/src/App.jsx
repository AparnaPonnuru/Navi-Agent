import { useState } from "react";
import AuthFlow, { useAuth, logout } from "./pages/AuthFlow";
import Dashboard from "./pages/Dashboard";
import PathResult from "./pages/PathResult";
import StepDetail from "./pages/StepDetail";
import Marketplace from "./pages/Marketplace";
import ProfileSummary from "./pages/ProfileSummary";
import {
  IconArrowLeft,
  IconBuilding,
  IconMap,
  IconMenu,
  IconNavigation,
  IconPin,
  IconRoute,
  IconShoppingCart,
  IconTarget,
  IconUser,
} from "./pages/Icons";
import "./App.css";

function buildPositionLabel(profile) {
  if (!profile) return "Profile unavailable";
  return [profile.grade, profile.curriculum].filter(Boolean).join(" • ") || "Current position";
}

export default function App() {
  const { user, profile: savedProfile } = useAuth();

  const [authed, setAuthed]         = useState(!!user);
  const [activeEmail, setActiveEmail] = useState(user || "");
  const [profile, setProfile]       = useState(savedProfile);

  const [page, setPage]             = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 900);
  const [pathData, setPathData]     = useState(null);
  const [userInput, setUserInput]   = useState({ current: "", goal: "" });
  const [activeStep, setActiveStep] = useState(null);
  const [activeView, setActiveView] = useState(null);

  // ── Auth callback ──
  function handleAuthenticated(email, profileData) {
    setActiveEmail(email);
    setProfile(profileData);
    setAuthed(true);
    setPage("dashboard");
  }

  // ── Logout ──
  function handleLogout() {
    logout();
    setAuthed(false);
    setActiveEmail("");
    setProfile(null);
    setPage("dashboard");
    setPathData(null);
    setActiveStep(null);
  }

  // ── Not logged in → show auth ──
  if (!authed) {
    return <AuthFlow onAuthenticated={handleAuthenticated} />;
  }

  const goTo = (p) => setPage(p);

  const handlePathGenerated = (data, input) => {
    setPathData(data);
    setUserInput(input);
    goTo("result");
  };

  const handleStepClick = (step) => {
    setActiveStep(step);
    goTo("stepdetail");
  };

  const handleViewClick = (view) => {
    setActiveView(view);
    goTo("marketplace");
  };

  const handleBack = () => {
    if (page === "marketplace") goTo("stepdetail");
    else if (page === "stepdetail") goTo("result");
    else goTo("dashboard");
  };

  const navItems = [
    { key: "dashboard",   label: "Dashboard",   Icon: IconNavigation, enabled: true },
    { key: "result",      label: "Journey Path", Icon: IconRoute,      enabled: !!pathData },
    { key: "stepdetail",  label: "Step Details", Icon: IconMap,        enabled: !!activeStep },
    { key: "marketplace", label: "Marketplace",  Icon: IconShoppingCart, enabled: !!activeStep },
    { key: "profile",     label: "Profile",      Icon: IconUser,       enabled: true },
  ];

  return (
    <div className={`app-root maps-shell ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      <aside className="app-sidebar">
        <div className="sidebar-brand" onClick={() => goTo("dashboard")}>
          <div className="logo-pill">N</div>
          <div className="sidebar-brand-copy">
            <span className="logo-name">Naaviverse</span>
            <span className="logo-tag">AI Path Engine</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.key}
              className={`sidebar-nav-item ${page === item.key ? "active" : ""}`}
              onClick={() => item.enabled && goTo(item.key)}
              disabled={!item.enabled}
              title={item.label}
            >
              <span className="sidebar-nav-icon"><item.Icon size={18} /></span>
              <span className="sidebar-nav-label">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar-route-card">
          <div className="section-label">Active Route</div>
          <div className="mini-route-row">
            <span className="mini-route-dot current" />
            <span>{buildPositionLabel(profile)}</span>
          </div>
          <div className="mini-route-line" />
          <div className="mini-route-row">
            <span className="mini-route-dot goal" />
            <span>{userInput.goal || "Destination pending"}</span>
          </div>
          <button className="sidebar-logout-btn" onClick={handleLogout}>
            Log out
          </button>
        </div>
      </aside>

      <div className="app-workspace">
        <header className="maps-topbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(o => !o)} aria-label="Toggle sidebar">
            <IconMenu size={21} />
          </button>

          {page !== "dashboard" && page !== "profile" && (
            <button className="nav-back" onClick={handleBack}>
              <IconArrowLeft size={16} /> Back
            </button>
          )}

          <div className="route-searchbar">
            <div className="route-search-point"><IconPin size={16} /></div>
            <div className="route-search-copy">
              <span>From</span>
              <strong>{buildPositionLabel(profile)}</strong>
            </div>
            <div className="route-search-divider" />
            <div className="route-search-point goal"><IconTarget size={16} /></div>
            <div className="route-search-copy">
              <span>To</span>
              <strong>{userInput.goal || "Set your future goal"}</strong>
            </div>
          </div>

          <div className="topbar-profile">
            <IconBuilding size={16} />
            <span>{profile?.city || activeEmail}</span>
          </div>
        </header>

        <main className="app-main">
          {page === "profile" && <ProfileSummary profile={profile} onLogout={handleLogout} />}
          {page === "dashboard" && (
            <Dashboard
              profile={profile}
            initialCurrent={function buildCurrentSummary(profile) {
  if (!profile) return "";
  return [profile.grade, profile.curriculum].filter(Boolean).join(" • ") || "";
}(profile)}
              onPathGenerated={handlePathGenerated}
            />
          )}
          {page === "result" && (
            <PathResult
              pathData={pathData}
              userInput={userInput}
              onStepClick={handleStepClick}
              onBack={() => goTo("dashboard")}
            />
          )}
          {page === "stepdetail" && (
            <StepDetail
              step={activeStep}
              onViewClick={handleViewClick}
              onBack={() => goTo("result")}
            />
          )}
          {page === "marketplace" && (
            <Marketplace
              step={activeStep}
              view={activeView}
              onBack={() => goTo("stepdetail")}
            />
          )}
        </main>
      </div>
    </div>
  );
}