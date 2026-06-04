import { useState, useEffect } from "react";
import './Adminreview.scss';
import { 
  IconCheck, IconAlert, IconArrowLeft, IconUser, 
  IconMap, IconTarget, IconPin, IconSearch, IconNavigation,
  IconRoute, IconBuilding
} from "./Icons";

const API = import.meta.env.VITE_API_URL || "http://localhost:8000";

const STATUS = {
  under_review: "under_admin_review",
  published: "published",
  rejected: "rejected"
};

export default function AdminReview({ pathData: initialPathData, userInput, profile, onBack }) {
  const [pathsQueue, setPathsQueue] = useState([]);
  const [selectedPath, setSelectedPath] = useState(null);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("under_admin_review");
  const [successMsg, setSuccessMsg] = useState("");

  // Editor states (bound to selected path)
  const [editedRoadmap, setEditedRoadmap] = useState(null);
  const [globalNote, setGlobalNote] = useState("");

  // Editing states
  const [editingDetails, setEditingDetails] = useState(false);
  const [editingMilestoneIdx, setEditingMilestoneIdx] = useState(null);
  const [editingBlindSpots, setEditingBlindSpots] = useState(false);

  // Temporary/backup states for the sections being edited
  const [tempDetails, setTempDetails] = useState({
    path_title: "",
    path_description: "",
    readiness_score: 0,
    readiness_label: "",
    total_duration: ""
  });
  const [tempMilestone, setTempMilestone] = useState(null);
  const [tempBlindSpots, setTempBlindSpots] = useState([]);

  // Load the queue of paths from MongoDB
  async function loadQueue() {
    setLoadingQueue(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/admin/paths?status=all`);
      if (!res.ok) throw new Error("Failed to fetch paths under review");
      const json = await res.json();
      setPathsQueue(json);
      // Do not auto-select any path so that the admin queue is always shown first
    } catch (e) {
      setError("Cannot load admin review queue. Verify the backend is running.");
      console.error(e);
    } finally {
      setLoadingQueue(false);
    }
  }

  useEffect(() => {
    loadQueue();
  }, []);

  // Set up local editor state when a path is selected
  function selectPathForReview(pathDoc) {
    setSelectedPath(pathDoc);
    setEditedRoadmap(JSON.parse(JSON.stringify(pathDoc.roadmap_data))); // deep copy
    setGlobalNote(pathDoc.admin_notes || "");
    setSuccessMsg("");
    setEditingDetails(false);
    setEditingMilestoneIdx(null);
    setEditingBlindSpots(false);
  }

  // Handle temp milestone changes in the editor
  function handleTempMilestoneChange(field, value) {
    setTempMilestone(prev => {
      const copy = { ...prev };
      copy[field] = value;
      return copy;
    });
  }

  // Handle temp marketplace resource changes in the editor
  function handleTempMarketplaceChange(type, rIndex, field, value) {
    setTempMilestone(prev => {
      const copy = { ...prev };
      copy.marketplace[type][rIndex][field] = value;
      return copy;
    });
  }



  // Section Save/Cancel logic
  function handleStartEditDetails() {
    setTempDetails({
      path_title: editedRoadmap.path_title || "",
      path_description: editedRoadmap.path_description || "",
      readiness_score: editedRoadmap.readiness_score || 0,
      readiness_label: editedRoadmap.readiness_label || "",
      total_duration: editedRoadmap.total_duration || ""
    });
    setEditingDetails(true);
  }

  async function handleSaveDetails() {
    const updatedRoadmap = {
      ...editedRoadmap,
      ...tempDetails
    };
    const success = await saveRoadmapUpdate(updatedRoadmap);
    if (success) {
      setEditedRoadmap(updatedRoadmap);
      setEditingDetails(false);
    }
  }

  function handleCancelEditDetails() {
    setEditingDetails(false);
  }

  function handleStartEditMilestone(idx) {
    setEditingMilestoneIdx(idx);
    setTempMilestone(JSON.parse(JSON.stringify(editedRoadmap.macro_path[idx])));
  }

  async function handleSaveMilestone(idx) {
    const updatedMacroPath = [...editedRoadmap.macro_path];
    updatedMacroPath[idx] = tempMilestone;
    const updatedRoadmap = {
      ...editedRoadmap,
      macro_path: updatedMacroPath
    };
    const success = await saveRoadmapUpdate(updatedRoadmap);
    if (success) {
      setEditedRoadmap(updatedRoadmap);
      setEditingMilestoneIdx(null);
      setTempMilestone(null);
    }
  }

  function handleCancelEditMilestone() {
    setEditingMilestoneIdx(null);
    setTempMilestone(null);
  }

  function handleStartEditBlindSpots() {
    setTempBlindSpots([...(editedRoadmap.blind_spots || [])]);
    setEditingBlindSpots(true);
  }

  async function handleSaveBlindSpots() {
    const updatedRoadmap = {
      ...editedRoadmap,
      blind_spots: tempBlindSpots
    };
    const success = await saveRoadmapUpdate(updatedRoadmap);
    if (success) {
      setEditedRoadmap(updatedRoadmap);
      setEditingBlindSpots(false);
    }
  }

  function handleCancelEditBlindSpots() {
    setEditingBlindSpots(false);
  }

  async function saveRoadmapUpdate(updatedRoadmap) {
    if (!selectedPath || !updatedRoadmap) return false;
    setLoadingSubmit(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/paths/${selectedPath.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roadmap_data: updatedRoadmap,
          status: selectedPath.status // "under_admin_review" (preserves status)
        })
      });
      if (!res.ok) throw new Error("Failed to update career path in database");
      
      // Update local pathsQueue with the new values
      setPathsQueue(prevQueue => {
        return prevQueue.map(p => {
          if (p.id === selectedPath.id) {
            return {
              ...p,
              roadmap_data: updatedRoadmap
            };
          }
          return p;
        });
      });
      
      setSuccessMsg("Section changes saved successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setLoadingSubmit(false);
    }
  }

  // Submit the approved & curated roadmap back to MongoDB
  async function submitReview(statusToSet = STATUS.published) {
    if (!selectedPath || !editedRoadmap) return;
    setLoadingSubmit(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/paths/${selectedPath.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roadmap_data: editedRoadmap,
          status: statusToSet
        })
      });
      if (!res.ok) throw new Error("Failed to update career path in database");
      
      setSuccessMsg(`Successfully marked roadmap as ${statusToSet.toUpperCase()}!`);
      setSelectedPath(null);
      setEditedRoadmap(null);
      loadQueue();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoadingSubmit(false);
    }
  }

  // Filter queue based on tab selection and search
  const displayedPaths = pathsQueue.filter(p => p.status === filterStatus);
  const filteredPaths = displayedPaths.filter(p => {
    const q = searchQuery.toLowerCase();
    const matchesGoal = p.target_goal?.toLowerCase().includes(q);
    const matchesPos = p.current_position?.toLowerCase().includes(q);
    const matchesEmail = p.profile?.email?.toLowerCase().includes(q) || p.profile?.name?.toLowerCase().includes(q);
    return matchesGoal || matchesPos || matchesEmail;
  });

  const isReadOnly = selectedPath?.status === "published";

  return (
    <div className="page ar-page">

      {/* ─── QUEUE VIEW (If no path is selected) ─── */}
      {!selectedPath ? (
        <div className="ar-queue-container">
          <div className="ar-header">
            <div>
              <div className="pill pill-teal" style={{ marginBottom: 12 }}>Human in the Loop</div>
              <h1 className="display-title" style={{ fontSize: 32 }}>Admin Review Curation</h1>
              <p className="ar-header-sub">
                Inspect AI-generated career paths, refine milestones, calibrate resources, and publish them to students.
              </p>
            </div>
          </div>

          {successMsg && (
            <div className="ar-success-alert card">
              <IconCheck size={20} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Filters Bar */}
          <div className="ar-filters-bar card">
            <div className="ar-search-input-wrapper">
              <IconSearch size={16} />
              <input
                type="text"
                placeholder="Search by student, goal, or location..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="ar-status-filters">
              <button 
                className={`filter-btn ${filterStatus === "under_admin_review" ? "active" : ""}`}
                onClick={() => setFilterStatus("under_admin_review")}
              >
                Pending Review ({pathsQueue.filter(p => p.status === "under_admin_review").length})
              </button>
              <button 
                className={`filter-btn ${filterStatus === "published" ? "active" : ""}`}
                onClick={() => setFilterStatus("published")}
              >
                Published ({pathsQueue.filter(p => p.status === "published").length})
              </button>
            </div>
          </div>

          {/* Paths List */}
          {loadingQueue ? (
            <div className="ar-loading-state card">
              <div className="dot-pulse"><span /><span /><span /></div>
              <p>Loading database records...</p>
            </div>
          ) : error ? (
            <div className="ar-error-card card">
              <IconAlert size={28} />
              <p>{error}</p>
              <button className="btn-primary" onClick={loadQueue} style={{ marginTop: 12 }}>Retry Connection</button>
            </div>
          ) : filteredPaths.length === 0 ? (
            <div className="ar-empty-state card">
              <IconNavigation size={36} />
              <h3>No career paths found</h3>
              <p>Generate a career roadmap from the dashboard to populate the queue.</p>
            </div>
          ) : (
            <div className="ar-queue-grid">
              {filteredPaths.map(path => {
                const dateStr = path.created_at ? new Date(path.created_at).toLocaleDateString("en-US", {
                  month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                }) : "Just now";
                
                return (
                  <div key={path.id} className="ar-queue-card card">
                    <div className="ar-q-top">
                      <div className="ar-q-student">
                        <IconUser size={14} />
                        <strong>{path.profile?.name || path.profile?.email || "Anonymous Student"}</strong>
                        <span className="ar-q-date">{dateStr}</span>
                      </div>
                      <span className={`status-badge status-${path.status}`}>
                        {path.status === "under_admin_review" ? "Pending Approval" : "Published"}
                      </span>
                    </div>

                    <div className="ar-q-route">
                      <div className="ar-q-point">
                        <span className="q-dot green" />
                        <span>{path.current_position}</span>
                      </div>
                      <div className="ar-q-spine" />
                      <div className="ar-q-point">
                        <span className="q-dot red" />
                        <strong>{path.target_goal}</strong>
                      </div>
                    </div>

                    <div className="ar-q-meta">
                      <div className="meta-item"><span>Grade</span><strong>{path.profile?.grade || "N/A"}</strong></div>
                      <div className="meta-item"><span>Board</span><strong>{path.profile?.curriculum || "N/A"}</strong></div>
                      <div className="meta-item"><span>Readiness</span><strong className="green-text">{path.roadmap_data?.readiness_score}%</strong></div>
                      <div className="meta-item"><span>Duration</span><strong>{path.roadmap_data?.total_duration}</strong></div>
                    </div>

                    <button className="ar-q-btn" onClick={() => selectPathForReview(path)}>
                      {path.status === "published" ? "View Published Roadmap →" : "Audit & Curate Roadmap →"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ─── EDIT & CURATION VIEW ─── */
        <div className="ar-editor-container">
          <div className="ar-editor-header">
            <button className="btn-back" onClick={() => setSelectedPath(null)}>
              <IconArrowLeft size={16} /> Back to Curation Queue
            </button>
            <div className="editor-title-row">
              <div>
                <h1>{isReadOnly ? "Viewing Approved Roadmap for:" : "Curating Roadmap for:"} {selectedPath.profile?.name || "Student"}</h1>
                <p>
                  {isReadOnly 
                    ? "This roadmap is fully approved and published. All fields are locked to read-only." 
                    : "Edit AI milestones, refine execution steps, and select best-fit marketplace products before publishing."}
                </p>
              </div>
              <div className="editor-status-badge">
                <span className={`pill ${isReadOnly ? "pill-teal" : "pill-amber"}`}>
                  {isReadOnly ? "Published (Read Only)" : "Under Review"}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats Edit */}
          <div className="ar-editor-stats-card card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Global Metrics</h3>
              {!isReadOnly && !editingDetails && (
                <button className="btn-edit-section" onClick={handleStartEditDetails}>
                  Edit Details
                </button>
              )}
            </div>
            {isReadOnly || !editingDetails ? (
              <div className="stats-read-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                <div className="stat-read-item" style={{ gridColumn: "span 3", borderBottom: "1px solid var(--border)", paddingBottom: 12, marginBottom: 12 }}>
                  <span>Pathway Title</span>
                  <strong style={{ fontSize: 18 }}>{editedRoadmap.path_title || `Pathway to ${selectedPath.target_goal}`}</strong>
                </div>
                <div className="stat-read-item" style={{ gridColumn: "span 3", borderBottom: "1px solid var(--border)", paddingBottom: 12, marginBottom: 12 }}>
                  <span>Pathway Description</span>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text2)", lineHeight: 1.5, fontWeight: "normal" }}>
                    {editedRoadmap.path_description || "No description provided."}
                  </p>
                </div>
                <div className="stat-read-item">
                  <span>Readiness Score</span>
                  <strong className="green-text">{editedRoadmap.readiness_score}%</strong>
                </div>
                <div className="stat-read-item">
                  <span>Readiness Label</span>
                  <strong>{editedRoadmap.readiness_label}</strong>
                </div>
                <div className="stat-read-item">
                  <span>Total Duration</span>
                  <strong>{editedRoadmap.total_duration}</strong>
                </div>
              </div>
            ) : (
              <div className="stats-edit-grid" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div className="stats-edit-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                  <div className="stat-edit-field">
                    <label>Pathway Title</label>
                    <input 
                      type="text" 
                      style={{ width: "100%" }}
                      placeholder="e.g. Academic Pathway to Oxford"
                      value={tempDetails.path_title} 
                      onChange={e => setTempDetails(prev => ({ ...prev, path_title: e.target.value }))}
                    />
                  </div>
                  <div className="stat-edit-field">
                    <label>Pathway Description</label>
                    <textarea 
                      rows={2}
                      style={{ width: "100%", padding: "10px 12px", border: "1.5px solid var(--border)", borderRadius: 10, fontFamily: "inherit", fontSize: 13, resize: "vertical" }}
                      placeholder="Provide a description..."
                      value={tempDetails.path_description} 
                      onChange={e => setTempDetails(prev => ({ ...prev, path_description: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="stats-edit-row" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
                  <div className="stat-edit-field">
                    <label>Readiness Score (0-100)</label>
                    <input 
                      type="number" 
                      value={tempDetails.readiness_score} 
                      onChange={e => setTempDetails(prev => ({ ...prev, readiness_score: parseInt(e.target.value) || 0 }))}
                      min="0" max="100"
                    />
                  </div>
                  <div className="stat-edit-field">
                    <label>Readiness Label</label>
                    <input 
                      type="text" 
                      value={tempDetails.readiness_label} 
                      onChange={e => setTempDetails(prev => ({ ...prev, readiness_label: e.target.value }))}
                    />
                  </div>
                  <div className="stat-edit-field">
                    <label>Total Duration</label>
                    <input 
                      type="text" 
                      value={tempDetails.total_duration} 
                      onChange={e => setTempDetails(prev => ({ ...prev, total_duration: e.target.value }))}
                    />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
                  <button className="btn-cancel-section" onClick={handleCancelEditDetails}>Cancel</button>
                  <button className="btn-save-section" onClick={handleSaveDetails}>Save Details</button>
                </div>
              </div>
            )}
          </div>

          {/* Milestones Editor List */}
          <div className="ar-milestones-editor-list">
            <div className="section-label">Milestones & Resources</div>
            
            {editedRoadmap.macro_path?.map((milestone, mIdx) => {
              const isMilestoneEditing = editingMilestoneIdx === mIdx;
              const activeMilestone = isMilestoneEditing ? tempMilestone : milestone;

              return (
                <div key={milestone.id} className="ar-editor-milestone-card card">
                  <div className="m-header" style={{ justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ display: "flex", gap: 16, flex: 1 }}>
                      <div className="m-number">{milestone.id}</div>
                      
                      {!isMilestoneEditing ? (
                        <div className="m-title-view">
                          <div className="m-title-row-view">
                            <h2>{milestone.title}</h2>
                            <span className="m-dur-badge">{milestone.duration}</span>
                          </div>
                          <p className="m-desc-text">{milestone.description}</p>
                        </div>
                      ) : (
                        <div className="m-title-fields">
                          <div className="m-title-input-row">
                            <input 
                              type="text" 
                              className="m-title-input"
                              placeholder="Milestone Title"
                              value={activeMilestone.title} 
                              onChange={e => handleTempMilestoneChange("title", e.target.value)}
                            />
                            <input 
                              type="text" 
                              className="m-duration-input" 
                              placeholder="e.g. Months 1-3"
                              value={activeMilestone.duration}
                              onChange={e => handleTempMilestoneChange("duration", e.target.value)}
                            />
                          </div>
                          <textarea 
                            className="m-desc-input"
                            placeholder="High-level milestone description..."
                            rows={2}
                            value={activeMilestone.description}
                            onChange={e => handleTempMilestoneChange("description", e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                    {!isReadOnly && !isMilestoneEditing && (
                      <button className="btn-edit-section" onClick={() => handleStartEditMilestone(mIdx)}>
                        Edit Step
                      </button>
                    )}
                  </div>

                  {/* Triple Views Curation */}
                  <div className="editor-views-grid">
                    {[
                      { key: "macro_view", label: "Macro View (High Level Outcome)", colorClass: "macro" },
                      { key: "micro_view", label: "Micro View (Execution Output)", colorClass: "micro" },
                      { key: "nano_view", label: "Nano View (Mentor Guidance focus)", colorClass: "nano" }
                    ].map(v => (
                      <div key={v.key} className={`view-edit-box ${v.colorClass}`}>
                        <span className="view-lbl">{v.label}</span>
                        {!isMilestoneEditing ? (
                          <p className="view-read-text">{activeMilestone[v.key] || "No description provided."}</p>
                        ) : (
                          <textarea 
                            value={activeMilestone[v.key] || ""} 
                            onChange={e => handleTempMilestoneChange(v.key, e.target.value)}
                            rows={2}
                          />
                        )}
                      </div>
                    ))}
                  </div>


                  {/* Marketplace Resources */}
                  <div className="editor-marketplace-section">
                    <div className="section-sublabel">Marketplace calibration</div>
                    
                    {/* Macro Free */}
                    <div className="market-group">
                      <div className="market-group-title free">Free Content / Community Resources</div>
                      <div className="market-items-grid">
                        {activeMilestone.marketplace?.macro_free?.map((res, rIdx) => (
                          <div key={rIdx} className="market-card-wrapper">
                            {!isMilestoneEditing ? (
                              <div className="market-read-card card-free">
                                <strong>{res.name}</strong>
                                <div className="res-read-meta">
                                  <span className="m-chip free">{res.type}</span>
                                </div>
                                <p className="res-why">{res.why}</p>
                                {res.next_step && <div className="res-read-next">Action: <strong>{res.next_step}</strong></div>}
                              </div>
                            ) : (
                              <div className="market-edit-card">
                                <input 
                                  type="text" 
                                  className="res-name" 
                                  placeholder="Resource Name"
                                  value={res.name}
                                  onChange={e => handleTempMarketplaceChange("macro_free", rIdx, "name", e.target.value)}
                                />
                                <div className="res-row-2">
                                  <input 
                                    type="text" 
                                    placeholder="Type"
                                    value={res.type}
                                    onChange={e => handleTempMarketplaceChange("macro_free", rIdx, "type", e.target.value)}
                                  />
                                  <input 
                                    type="text" 
                                    placeholder="Next Step"
                                    value={res.next_step}
                                    onChange={e => handleTempMarketplaceChange("macro_free", rIdx, "next_step", e.target.value)}
                                  />
                                </div>
                                <textarea 
                                  placeholder="Value proposition statement..."
                                  value={res.why}
                                  onChange={e => handleTempMarketplaceChange("macro_free", rIdx, "why", e.target.value)}
                                  rows={2}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Micro Structured */}
                    <div className="market-group">
                      <div className="market-group-title structured">Structured / Paid Certifications</div>
                      <div className="market-items-grid">
                        {activeMilestone.marketplace?.micro_structured?.map((res, rIdx) => (
                          <div key={rIdx} className="market-card-wrapper">
                            {!isMilestoneEditing ? (
                              <div className="market-read-card card-structured">
                                <strong>{res.name}</strong>
                                <div className="res-read-meta">
                                  <span className="m-chip structured">{res.type}</span>
                                  <span className="m-cost">{res.cost}</span>
                                  <span className="m-dur">{res.duration}</span>
                                </div>
                                <p className="res-why">{res.value}</p>
                                {res.next_step && <div className="res-read-next">Action: <strong>{res.next_step}</strong></div>}
                              </div>
                            ) : (
                              <div className="market-edit-card">
                                <input 
                                  type="text" 
                                  className="res-name" 
                                  placeholder="Course/Bootcamp Name"
                                  value={res.name}
                                  onChange={e => handleTempMarketplaceChange("micro_structured", rIdx, "name", e.target.value)}
                                />
                                <div className="res-row-3">
                                  <input 
                                    type="text" 
                                    placeholder="Cost"
                                    value={res.cost}
                                    onChange={e => handleTempMarketplaceChange("micro_structured", rIdx, "cost", e.target.value)}
                                  />
                                  <input 
                                    type="text" 
                                    placeholder="Duration"
                                    value={res.duration}
                                    onChange={e => handleTempMarketplaceChange("micro_structured", rIdx, "duration", e.target.value)}
                                  />
                                  <input 
                                    type="text" 
                                    placeholder="Next step"
                                    value={res.next_step}
                                    onChange={e => handleTempMarketplaceChange("micro_structured", rIdx, "next_step", e.target.value)}
                                  />
                                </div>
                                <textarea 
                                  placeholder="Value proposition statement..."
                                  value={res.value}
                                  onChange={e => handleTempMarketplaceChange("micro_structured", rIdx, "value", e.target.value)}
                                  rows={2}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Nano Expert */}
                    <div className="market-group">
                      <div className="market-group-title expert">Expert Mentors & Personal Counselors</div>
                      <div className="market-items-grid">
                        {activeMilestone.marketplace?.nano_expert?.map((res, rIdx) => (
                          <div key={rIdx} className="market-card-wrapper">
                            {!isMilestoneEditing ? (
                              <div className="market-read-card card-expert">
                                <strong>{res.name}</strong>
                                <div className="res-read-meta">
                                  <span className="m-chip expert">{res.type}</span>
                                  <span className="m-cost">{res.price}</span>
                                </div>
                                <p className="res-why">{res.expected_outcomes}</p>
                                {res.session_details && <div className="res-read-next">Format: <strong>{res.session_details}</strong></div>}
                              </div>
                            ) : (
                              <div className="market-edit-card">
                                <input 
                                  type="text" 
                                  className="res-name" 
                                  placeholder="Mentor or Service Name"
                                  value={res.name}
                                  onChange={e => handleTempMarketplaceChange("nano_expert", rIdx, "name", e.target.value)}
                                />
                                <div className="res-row-2">
                                  <input 
                                    type="text" 
                                    placeholder="Price"
                                    value={res.price}
                                    onChange={e => handleTempMarketplaceChange("nano_expert", rIdx, "price", e.target.value)}
                                  />
                                  <input 
                                    type="text" 
                                    placeholder="Details"
                                    value={res.session_details}
                                    onChange={e => handleTempMarketplaceChange("nano_expert", rIdx, "session_details", e.target.value)}
                                  />
                                </div>
                                <textarea 
                                  placeholder="Expected Mentorship outcomes..."
                                  value={res.expected_outcomes}
                                  onChange={e => handleTempMarketplaceChange("nano_expert", rIdx, "expected_outcomes", e.target.value)}
                                  rows={2}
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                  {isMilestoneEditing && (
                    <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 20 }}>
                      <button className="btn-cancel-section" onClick={handleCancelEditMilestone}>Cancel</button>
                      <button className="btn-save-section" onClick={() => handleSaveMilestone(mIdx)}>Save Step</button>
                    </div>
                  )}

                </div>
              );
            })}
          </div>

          {/* Blind Spots Editor */}
          <div className="ar-editor-stats-card card" style={{ marginTop: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0 }}>Pathway Blind Spots / Gaps</h3>
              {!isReadOnly && !editingBlindSpots && (
                <button className="btn-edit-section" onClick={handleStartEditBlindSpots}>
                  Edit Blind Spots
                </button>
              )}
            </div>

            {isReadOnly || !editingBlindSpots ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {editedRoadmap.blind_spots && editedRoadmap.blind_spots.length > 0 ? (
                  <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, lineHeight: 1.6, color: "var(--text2)" }}>
                    {editedRoadmap.blind_spots.map((spot, idx) => (
                      <li key={idx}>{spot}</li>
                    ))}
                  </ul>
                ) : (
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text3)", fontStyle: "italic" }}>No blind spots identified.</p>
                )}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {tempBlindSpots.map((spot, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input 
                      type="text" 
                      style={{ flex: 1, padding: "8px 12px", border: "1.5px solid var(--border)", borderRadius: 8, fontSize: 13 }}
                      value={spot}
                      onChange={e => {
                        const copy = [...tempBlindSpots];
                        copy[idx] = e.target.value;
                        setTempBlindSpots(copy);
                      }}
                    />
                    <button 
                      className="btn-cancel-section" 
                      style={{ padding: "8px 12px", color: "var(--red)", borderColor: "rgba(232,49,42,0.15)", background: "var(--red-soft)" }}
                      onClick={() => {
                        const copy = tempBlindSpots.filter((_, i) => i !== idx);
                        setTempBlindSpots(copy);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
                
                <button 
                  className="btn-edit-section" 
                  style={{ alignSelf: "flex-start", marginTop: 4 }}
                  onClick={() => setTempBlindSpots([...tempBlindSpots, ""])}
                >
                  + Add Blind Spot
                </button>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 12 }}>
                  <button className="btn-cancel-section" onClick={handleCancelEditBlindSpots}>Cancel</button>
                  <button className="btn-save-section" onClick={handleSaveBlindSpots}>Save Spots</button>
                </div>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="editor-action-card card" style={{ marginTop: 24 }}>
            {isReadOnly ? (
              <div className="editor-submit-box">
                <h3>Published & Locked</h3>
                <p>This study roadmap has been approved and published to the student portal. To return to your review queue, click below.</p>
                <div className="editor-submit-btns">
                  <button className="btn-primary" onClick={() => setSelectedPath(null)}>
                    ← Close Details & Return
                  </button>
                </div>
              </div>
            ) : (
              <div className="editor-submit-box">
                <h3>Approve Curation</h3>
                <p>Publishing saves the curated milestones and marks this path as officially published. It will unlock immediately in the student's dashboard.</p>
                
                <div className="editor-submit-btns">
                  <button 
                    className="btn-secondary" 
                    onClick={() => setSelectedPath(null)}
                    disabled={loadingSubmit}
                  >
                    Close & Return
                  </button>
                  <button 
                    className="btn-primary approve-btn" 
                    onClick={() => submitReview(STATUS.published)}
                    disabled={loadingSubmit}
                  >
                    {loadingSubmit ? "Publishing..." : "Approve & Publish Roadmap"}
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

