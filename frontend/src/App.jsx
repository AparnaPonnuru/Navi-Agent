import { useState } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import AuthFlow, { useAuth, logout } from "./pages/authflow";
import Dashboard from "./pages/Dashboard";
import StepDetail from "./pages/StepDetail";
import Marketplace from "./pages/Marketplace";
import AdminReview from "./pages/Adminreview";
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
  const navigate                      = useNavigate();
  const location                      = useLocation();

  const [authed, setAuthed]           = useState(!!user);
  const [activeEmail, setActiveEmail] = useState(user || "");
  const [profile, setProfile]         = useState(savedProfile);

  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 900);
  const [pathData, setPathData]       = useState(null);
  const [userInput, setUserInput]     = useState({ current: "", goal: "" });
  const [activeStep, setActiveStep]   = useState(null);
  const [activeView, setActiveView]   = useState(null);

  function handleAuthenticated(email, profileData) {
    setActiveEmail(email);
    setProfile(profileData);
    setAuthed(true);
    navigate("/dashboard");
  }

  function handleLogout() {
    logout();
    setAuthed(false);
    setActiveEmail("");
    setProfile(null);
    setPathData(null);
    setActiveStep(null);
    navigate("/dashboard");
  }

  if (!authed) return <AuthFlow onAuthenticated={handleAuthenticated} />;

  const goTo = (p) => {
    const routeMap = {
      dashboard: "/dashboard",
      stepdetail: "/step-detail",
      marketplace: "/marketplace",
      adminreview: "/admin-review",
    };
    navigate(routeMap[p] || "/dashboard");
    // Auto-close sidebar on mobile after selecting a page
    if (window.innerWidth <= 900) {
      setSidebarOpen(false);
    }
  };

  const handleGenerationStart = (input) => {
    setUserInput(input);
    setPathData(null); // Clear old path while generating
    setSidebarOpen(false); // Auto-collapse sidebar so the path panel has full width
  };

  const handlePathGenerated = (data, input) => {
    setPathData(data);
    setUserInput(input);
    // stay on dashboard — path renders inline on right
  };

  const handleStepClick = (step) => {
    setActiveStep(step);
    setActiveView("macro"); // Reset back to macro when exploring a new step
    goTo("stepdetail");
  };

  const handleViewClick = (view) => {
    setActiveView(view);
    goTo("marketplace");
  };

  const handleBack = () => {
    const currentPath = location.pathname;
    if (currentPath === "/marketplace") navigate("/step-detail");
    else if (currentPath === "/step-detail") navigate("/dashboard");
    else navigate("/dashboard");
  };

  const navItems = [
    { key: "dashboard",   label: "Dashboard",     Icon: IconNavigation,  enabled: true },
    { key: "stepdetail",  label: "Step Details",  Icon: IconMap,         enabled: !!activeStep },
    { key: "marketplace", label: "Marketplace",   Icon: IconShoppingCart,enabled: !!activeStep },
    { key: "adminreview", label: "Admin Review",  Icon: IconCheck,       enabled: true },
  ];

  const currentPath = location.pathname;
  const isDashboard = currentPath === "/" || currentPath === "/dashboard";

  return (
    <div className={`app-root maps-shell ${sidebarOpen ? "sidebar-open" : "sidebar-closed"}`}>
      
      {/* Dim backdrop mask for mobile screens */}
      {sidebarOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside className="app-sidebar">
        <div className="sidebar-brand" onClick={() => goTo("dashboard")}>
          <img src="/naavi_logo.png" alt="naavi logo" className="logo-image-sidebar" />
          <div className="sidebar-brand-copy">
            <span className="logo-name">naavi</span>
            <span className="logo-tag">AI Path Engine</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => {
            const isActive = (item.key === "dashboard" && isDashboard) ||
                             (item.key === "stepdetail" && currentPath === "/step-detail") ||
                             (item.key === "marketplace" && currentPath === "/marketplace") ||
                             (item.key === "adminreview" && currentPath === "/admin-review");
            return (
              <button
                key={item.key}
                className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                onClick={() => item.enabled && goTo(item.key)}
                disabled={!item.enabled}
                title={item.label}
              >
                <span className="sidebar-nav-icon"><item.Icon size={18} /></span>
                <span className="sidebar-nav-label">{item.label}</span>
              </button>
            );
          })}
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

          {!isDashboard && (
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
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={
              <Dashboard
                profile={profile}
                pathData={pathData}
                userInput={userInput}
                initialCurrent={[profile?.grade, profile?.curriculum].filter(Boolean).join(" • ") || ""}
                onPathGenerated={handlePathGenerated}
                onStepClick={handleStepClick}
                onGenerationStart={handleGenerationStart}
              />
            } />
            <Route path="/step-detail" element={
              activeStep ? (
                <StepDetail
                  step={activeStep}
                  initialView={activeView}
                  onViewClick={handleViewClick}
                  onBack={() => navigate("/dashboard")}
                />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            } />
            <Route path="/marketplace" element={
              activeStep ? (
                <Marketplace
                  step={activeStep}
                  view={activeView}
                  onBack={() => navigate("/step-detail")}
                />
              ) : (
                <Navigate to="/dashboard" replace />
              )
            } />
            <Route path="/admin-review" element={
              <AdminReview
                pathData={pathData}
                userInput={userInput}
                profile={profile}
                onBack={() => navigate("/dashboard")}
              />
            } />
          </Routes>
        </main>
      </div>
    </div>
  );
}