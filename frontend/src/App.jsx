import { useState } from "react";
import { Routes, Route, useNavigate, useLocation, Navigate } from "react-router-dom";
import AuthFlow, { useAuth, logout } from "./pages/authflow";
import Dashboard from "./pages/Dashboard";
import StepDetail from "./pages/StepDetail";
import Marketplace from "./pages/Marketplace";
import AdminReview from "./pages/Adminreview";
import ProfileDetails from "./pages/ProfileDetails";
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
  IconUser,
  IconLogOut,
} from "./pages/Icons";
import "./App.css";

function buildPositionLabel(profile) {
  if (!profile) return "Profile unavailable";
  return [profile.grade, profile.curriculum].filter(Boolean).join(" • ") || "Current position";
}

export default function App() {
  const { user, profile: savedProfile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [authed, setAuthed] = useState(!!user);
  const [activeEmail, setActiveEmail] = useState(user || "");
  const [profile, setProfile] = useState(savedProfile);

  const [sidebarOpen, setSidebarOpen] = useState(() => window.innerWidth > 900);

  const [pathData, setPathData] = useState(() => {
    const sessionStr = sessionStorage.getItem("nv_session");
    if (!sessionStr) return null;
    try {
      const email = JSON.parse(sessionStr);
      if (!email) return null;
      return JSON.parse(localStorage.getItem(`nv_path_data_${email.toLowerCase()}`) || "null");
    } catch {
      return null;
    }
  });

  const [userInput, setUserInput] = useState(() => {
    const sessionStr = sessionStorage.getItem("nv_session");
    if (!sessionStr) return { current: "", goal: "" };
    try {
      const email = JSON.parse(sessionStr);
      if (!email) return { current: "", goal: "" };
      return JSON.parse(localStorage.getItem(`nv_user_input_${email.toLowerCase()}`) || '{"current": "", "goal": ""}');
    } catch {
      return { current: "", goal: "" };
    }
  });

  const [activeStep, setActiveStep] = useState(null);
  const [activeView, setActiveView] = useState(null);

  function handleAuthenticated(email, profileData) {
    console.log("[Naavi App] User authenticated:", email, "Profile:", profileData);
    setActiveEmail(email);
    setProfile(profileData);
    setAuthed(true);
    try {
      const emailKey = email.toLowerCase();
      const savedPath = JSON.parse(localStorage.getItem(`nv_path_data_${emailKey}`) || "null");
      const savedInput = JSON.parse(localStorage.getItem(`nv_user_input_${emailKey}`) || '{"current": "", "goal": ""}');
      console.log("[Naavi App] Loaded cached data for user. Path:", savedPath, "Input:", savedInput);
      setPathData(savedPath);
      setUserInput(savedInput);
    } catch (err) {
      console.error("[Naavi App] Error parsing loaded cached data:", err);
      setPathData(null);
      setUserInput({ current: "", goal: "" });
    }
    navigate("/dashboard");
  }

  function handleLogout() {
    console.log("[Naavi App] User logging out. Clearing state and localStorage for email:", activeEmail);
    if (activeEmail) {
      localStorage.removeItem(`nv_path_data_${activeEmail.toLowerCase()}`);
      localStorage.removeItem(`nv_user_input_${activeEmail.toLowerCase()}`);
    }
    logout();
    setAuthed(false);
    setActiveEmail("");
    setProfile(null);
    setPathData(null);
    setUserInput({ current: "", goal: "" });
    setActiveStep(null);
    navigate("/dashboard");
  }

  if (!authed) return <AuthFlow onAuthenticated={handleAuthenticated} />;

  const goTo = (p) => {
    console.log("[Naavi App] Navigation trigger to view:", p);
    const routeMap = {
      dashboard: "/dashboard",
      profile: "/profile",
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

  const handleGenerationStart = (input, isRegen = false) => {
    console.log("[Naavi App] Generation Start requested. Input:", input, "isRegen:", isRegen);
    setUserInput(input);
    if (!isRegen) {
      console.log("[Naavi App] Clearing old path data (not a tab-isolated regeneration).");
      setPathData(null); // Clear old path while generating
      if (activeEmail) {
        localStorage.removeItem(`nv_path_data_${activeEmail.toLowerCase()}`);
      }
    } else {
      console.log("[Naavi App] Tab-isolated regeneration. Retaining remaining alternative paths.");
    }
    setSidebarOpen(false); // Auto-collapse sidebar so the path panel has full width
    if (activeEmail) {
      localStorage.setItem(`nv_user_input_${activeEmail.toLowerCase()}`, JSON.stringify(input));
    }
  };

  const handlePathGenerated = (data, input) => {
    console.log("[Naavi App] Path generated/updated. Data:", data, "Input:", input);
    setPathData(data);
    setUserInput(input);
    // stay on dashboard — path renders inline on right
    if (activeEmail) {
      localStorage.setItem(`nv_path_data_${activeEmail.toLowerCase()}`, JSON.stringify(data));
      localStorage.setItem(`nv_user_input_${activeEmail.toLowerCase()}`, JSON.stringify(input));
    }
  };

  const handleProfileUpdated = (newProfile) => {
    console.log("[Naavi App] Student Signals profile updated. Resetting path cache. New profile:", newProfile);
    setProfile(newProfile);
    setPathData(null);
    setUserInput({ current: "", goal: "" });
    if (activeEmail) {
      localStorage.removeItem(`nv_path_data_${activeEmail.toLowerCase()}`);
      localStorage.removeItem(`nv_user_input_${activeEmail.toLowerCase()}`);
    }
  };

  const handleStepClick = (step) => {
    console.log("[Naavi App] Step selected to explore:", step);
    setActiveStep(step);
    setActiveView("macro"); // Reset back to macro when exploring a new step
    goTo("stepdetail");
  };

  const handleViewClick = (view) => {
    console.log("[Naavi App] Selecting step view in marketplace details:", view);
    setActiveView(view);
    goTo("marketplace");
  };

  const handleBack = () => {
    const currentPath = location.pathname;
    console.log("[Naavi App] Back button clicked from page:", currentPath);
    if (currentPath === "/marketplace") navigate("/step-detail");
    else if (currentPath === "/step-detail") navigate("/dashboard");
    else navigate("/dashboard");
  };

  const navItems = [
    { key: "dashboard", label: "Dashboard", Icon: IconNavigation, enabled: true },
    { key: "stepdetail", label: "Step Details", Icon: IconMap, enabled: !!activeStep },
    { key: "marketplace", label: "Marketplace", Icon: IconShoppingCart, enabled: !!activeStep },
    { key: "adminreview", label: "Admin Review", Icon: IconCheck, enabled: true },
    { key: "profile", label: "Student Signals", Icon: IconUser, enabled: true },
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
          <img
            src={sidebarOpen ? "/naavi_logo.png" : "/naavi_favicon.png"}
            alt="naavi logo"
            className="logo-image-sidebar"
          />
          <div className="sidebar-brand-copy">
            {/* <span className="logo-name">Naavi</span>
            <span className="logo-tag">AI Path Engine</span> */}
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => {
            const isActive = (item.key === "dashboard" && isDashboard) ||
              (item.key === "profile" && currentPath === "/profile") ||
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

        <div className="sidebar-footer">
          <button className="sidebar-logout-btn" onClick={handleLogout} title="Log out">
            <span className="sidebar-logout-icon"><IconLogOut size={18} /></span>
            <span className="sidebar-logout-label">Log out</span>
          </button>
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
                onProfileUpdated={handleProfileUpdated}
              />
            } />
            <Route path="/profile" element={
              <ProfileDetails
                profile={profile}
                onProfileUpdated={handleProfileUpdated}
                onBack={() => navigate("/dashboard")}
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