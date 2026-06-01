import { useState } from "react";
import AuthFlow, { useAuth, logout } from "./pages/authflow";
import Dashboard from "./pages/Dashboard";
import StepDetail from "./pages/StepDetail";
import Marketplace from "./pages/Marketplace";
import AdminReview from "./pages/AdminReview";
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
  IconCheck,
} from "./pages/Icons";
import "./App.css";

function buildPositionLabel(profile) {
  if (!profile) return "Profile unavailable";
  return [profile.grade, profile.curriculum].filter(Boolean).join(" • ") || "Current position";
}

export default function App() {
  const { user, profile: savedProfile } = useAuth();

  const [authed, setAuthed]           = useState(!!user);
  const [activeEmail, setActiveEmail] = useState(user || "");
  const [profile, setProfile]         = useState(savedProfile);

  const [page, setPage]               = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 900);
  const [pathData, setPathData]       = useState(null);
  const [userInput, setUserInput]     = useState({ current: "", goal: "" });
  const [activeStep, setActiveStep]   = useState(null);
  const [activeView, setActiveView]   = useState(null);

  function handleAuthenticated(email, profileData) {
    setActiveEmail(email);
    setProfile(profileData);
    setAuthed(true);
    setPage("dashboard");
  }

  function handleLogout() {
    logout();
    setAuthed(false);
    setActiveEmail("");
    setProfile(null);
    setPage("dashboard");
    setPathData(null);
    setActiveStep(null);
  }

  if (!authed) return <AuthFlow onAuthenticated={handleAuthenticated} />;

  const goTo = (p) => setPage(p);

  const handlePathGenerated = (data, input) => {
    setPathData(data);
    setUserInput(input);
    // stay on dashboard — path renders inline on right
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
    else if (page === "stepdetail") goTo("dashboard");
    else goTo("dashboard");
  };

  const navItems = [
    { key: "dashboard",   label: "Dashboard",     Icon: IconNavigation,  enabled: true },
    { key: "stepdetail",  label: "Step Details",  Icon: IconMap,         enabled: !!activeStep },
    { key: "marketplace", label: "Marketplace",   Icon: IconShoppingCart,enabled: !!activeStep },
    { key: "adminreview", label: "Admin Review",  Icon: IconCheck,       enabled: !!pathData },
  ];

  return (
    <div className={`app-root maps-shell ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>

      {/* ── Sidebar ── */}
      <aside className="app-sidebar">
        <div className="sidebar-brand" onClick={() => goTo("dashboard")}>
          <div className="logo-pill">N</div>
          <div className="sidebar-brand-copy">
            <span className="logo-name">naavi</span>
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

        {/* Active route card */}
        <div className="sidebar-route-card">
          <div className="section-label" style={{ marginBottom: 10 }}>Active Route</div>
          <div className="mini-route-row">
            <span className="mini-route-dot current" />
            <span>{userInput.current || buildPositionLabel(profile)}</span>
          </div>
          <div className="mini-route-line" />
          <div className="mini-route-row">
            <span className="mini-route-dot goal" />
            <span>{userInput.goal || "Destination pending"}</span>
          </div>
          {pathData && (
            <div className="sidebar-path-meta">
              <span className="sidebar-meta-chip green">{pathData.readiness_score} readiness</span>
              <span className="sidebar-meta-chip blue">{pathData.total_duration}</span>
            </div>
          )}
          <button className="sidebar-logout-btn" onClick={handleLogout}>Log out</button>
        </div>
      </aside>

      {/* ── Workspace ── */}
      <div className="app-workspace">

        {/* Topbar */}
        <header className="maps-topbar">
          <button className="hamburger-btn" onClick={() => setSidebarOpen(o => !o)}>
            <IconMenu size={20} />
          </button>

          {page !== "dashboard" && (
            <button className="nav-back" onClick={handleBack}>
              <IconArrowLeft size={15} /> Back
            </button>
          )}

          <div className="route-searchbar">
            <div className="route-search-point"><IconPin size={14} /></div>
            <div className="route-search-copy">
              <span>From</span>
              <strong>{userInput.current || buildPositionLabel(profile)}</strong>
            </div>
            <div className="route-search-divider" />
            <div className="route-search-point goal"><IconTarget size={14} /></div>
            <div className="route-search-copy">
              <span>To</span>
              <strong>{userInput.goal || "Set your future goal"}</strong>
            </div>
            {pathData && (
              <>
                <div className="route-search-divider" />
                <div className="route-search-copy">
                  <span>Steps</span>
                  <strong>{pathData.macro_path?.length || 0} steps</strong>
                </div>
              </>
            )}
          </div>

          <div className="topbar-profile">
            <IconBuilding size={15} />
            <span>{profile?.city || activeEmail}</span>
          </div>
        </header>

        {/* Main content */}
        <main className="app-main">
          {page === "dashboard" && (
            <Dashboard
              profile={profile}
              pathData={pathData}
              userInput={userInput}
              initialCurrent={[profile?.grade, profile?.curriculum].filter(Boolean).join(" • ") || ""}
              onPathGenerated={handlePathGenerated}
              onStepClick={handleStepClick}
            />
          )}
          {page === "stepdetail" && (
            <StepDetail
              step={activeStep}
              onViewClick={handleViewClick}
              onBack={() => goTo("dashboard")}
            />
          )}
          {page === "marketplace" && (
            <Marketplace
              step={activeStep}
              view={activeView}
              onBack={() => goTo("stepdetail")}
            />
          )}
          {page === "adminreview" && (
            <AdminReview
              pathData={pathData}
              userInput={userInput}
              profile={profile}
              onBack={() => goTo("dashboard")}
            />
          )}
        </main>
      </div>
    </div>
  );
}