import { useState, useEffect } from "react";
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

  // Handle temp micro step changes in the editor
  function handleTempMicroStepChange(sIndex, field, value) {
    setTempMilestone(prev => {
      const copy = { ...prev };
      copy.micro_steps[sIndex][field] = value;
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
      <style>{`${sharedStyles}`}</style>

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

                  {/* Actionable Micro Steps Checklist */}
                  <div className="editor-steps-section" style={{ marginBottom: 20 }}>
                    <div className="section-sublabel">Execution Steps Checklist</div>
                    {!isMilestoneEditing ? (
                      <div className="steps-read-list">
                        {activeMilestone.micro_steps?.map((step, sIdx) => (
                          <div key={sIdx} className="step-read-row">
                            <div className="step-read-num">{sIdx + 1}</div>
                            <div className="step-read-task">{step.task}</div>
                            {step.resource && <div className="step-read-res-badge">{step.resource}</div>}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="steps-edit-list">
                        {activeMilestone.micro_steps?.map((step, sIdx) => (
                          <div key={sIdx} className="step-edit-row">
                            <div className="step-num">{sIdx + 1}</div>
                            <input 
                              type="text" 
                              className="task-input" 
                              placeholder="Action task description"
                              value={step.task}
                              onChange={e => handleTempMicroStepChange(sIdx, "task", e.target.value)}
                            />
                            <input 
                              type="text" 
                              className="resource-input" 
                              placeholder="Recommended resource"
                              value={step.resource}
                              onChange={e => handleTempMicroStepChange(sIdx, "resource", e.target.value)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
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

const sharedStyles = `
  .btn-edit-section {
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    color: var(--accent);
    background: var(--accent-soft);
    border: 1px solid var(--accent);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-edit-section:hover {
    background: var(--accent);
    color: #fff;
  }

  .btn-save-section {
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    color: #fff;
    background: var(--green);
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.2s;
  }
  .btn-save-section:hover {
    background: #2b9045;
  }

  .btn-cancel-section {
    padding: 6px 12px;
    font-size: 12px;
    font-weight: 600;
    color: var(--text2);
    background: none;
    border: 1px solid var(--border);
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .btn-cancel-section:hover {
    border-color: var(--text);
    color: var(--text);
  }

  .ar-page {
    max-width: 1040px;
    margin: 0 auto;
    padding: 24px 20px 80px;
  }

  /* QUEUE VIEW */
  .ar-queue-container {
    animation: fadeUp 0.3s ease both;
  }
  .ar-header {
    margin-bottom: 28px;
  }
  .ar-header-sub {
    font-size: 14px;
    color: var(--text2);
    margin-top: 6px;
    line-height: 1.6;
    max-width: 600px;
  }

  .ar-filters-bar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 16px;
    padding: 14px 20px;
    margin-bottom: 24px;
    flex-wrap: wrap;
  }
  .ar-search-input-wrapper {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--bg);
    border: 1.5px solid var(--border);
    border-radius: 10px;
    padding: 8px 14px;
    flex: 1;
    min-width: 260px;
  }
  .ar-search-input-wrapper input {
    border: none;
    background: none;
    outline: none;
    font-family: var(--font-body);
    font-size: 14px;
    color: var(--text);
    width: 100%;
  }
  .ar-search-input-wrapper svg {
    color: var(--text3);
  }

  .ar-status-filters {
    display: flex;
    gap: 8px;
  }
  .filter-btn {
    padding: 8px 16px;
    font-size: 13px;
    font-weight: 600;
    color: var(--text2);
    background: none;
    border: 1px solid var(--border);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }
  .filter-btn:hover {
    border-color: var(--accent);
    color: var(--accent);
  }
  .filter-btn.active {
    background: var(--accent);
    color: #fff;
    border-color: var(--accent);
  }

  /* Queue Cards */
  .ar-queue-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
    gap: 20px;
  }
  .ar-queue-card {
    padding: 20px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    transition: transform 0.2s, box-shadow 0.2s;
    border-left: 4px solid var(--border);
  }
  .ar-queue-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(32,33,36,0.06);
  }
  .ar-queue-card.card {
    border-left: 4px solid var(--accent);
  }
  
  .ar-q-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  .ar-q-student {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    color: var(--text2);
  }
  .ar-q-student strong {
    color: var(--text);
  }
  .ar-q-date {
    font-size: 11px;
    color: var(--text3);
  }
  
  .status-badge {
    font-size: 11px;
    font-weight: 700;
    padding: 3px 9px;
    border-radius: 20px;
    text-transform: uppercase;
  }
  .status-under_admin_review {
    background: var(--yellow-soft);
    color: #8A6000;
  }
  .status-published {
    background: var(--green-soft);
    color: var(--green);
  }

  .ar-q-route {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 12px;
    background: var(--bg);
    border-radius: 10px;
    border: 1px solid var(--border);
  }
  .ar-q-point {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: var(--text);
  }
  .q-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .q-dot.green { background: var(--green); }
  .q-dot.red { background: var(--red); }
  .ar-q-spine {
    width: 1px;
    height: 8px;
    border-left: 1.5px dashed var(--border);
    margin-left: 3px;
  }

  .ar-q-meta {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 8px;
    font-size: 12px;
  }
  .meta-item {
    display: flex;
    justify-content: space-between;
    padding: 6px 10px;
    background: var(--bg3);
    border-radius: 6px;
  }
  .meta-item span {
    color: var(--text3);
  }
  .meta-item strong {
    color: var(--text);
  }
  .green-text {
    color: var(--green) !important;
  }

  .ar-q-btn {
    width: 100%;
    padding: 11px;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-family: var(--font-body);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s;
    margin-top: 4px;
  }
  .ar-q-btn:hover {
    background: var(--accent2);
  }

  /* EDITOR VIEW */
  .ar-editor-container {
    animation: fadeIn 0.3s ease both;
  }
  .ar-editor-header {
    margin-bottom: 24px;
  }
  .btn-back {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: none;
    border: none;
    color: var(--accent);
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    margin-bottom: 12px;
    padding: 0;
  }
  .btn-back:hover {
    text-decoration: underline;
  }
  .editor-title-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 20px;
    flex-wrap: wrap;
  }
  .editor-title-row h1 {
    font-family: var(--font-display);
    font-size: 26px;
    color: var(--text);
  }
  .editor-title-row p {
    font-size: 14px;
    color: var(--text2);
    margin-top: 4px;
  }

  .ar-editor-stats-card {
    padding: 16px 20px;
    margin-bottom: 24px;
  }
  .ar-editor-stats-card h3 {
    font-size: 14px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text3);
    margin-bottom: 12px;
  }
  .stats-edit-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
  }
  .stat-edit-field {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .stat-edit-field label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text2);
  }
  .stat-edit-field input {
    padding: 9px 12px;
    border: 1.5px solid var(--border);
    border-radius: 8px;
    font-family: var(--font-body);
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s;
  }
  .stat-edit-field input:focus {
    border-color: var(--accent);
  }

  /* READ ONLY METRICS VIEW */
  .stats-read-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
  }
  .stat-read-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 10px 14px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 8px;
  }
  .stat-read-item span {
    font-size: 11px;
    color: var(--text3);
    font-weight: 500;
  }
  .stat-read-item strong {
    font-size: 15px;
    color: var(--text);
  }

  /* Milestone Card Curation */
  .ar-editor-milestone-card {
    padding: 24px;
    margin-bottom: 20px;
    border-left: 4px solid var(--accent);
  }
  .m-header {
    display: flex;
    gap: 16px;
    margin-bottom: 18px;
  }
  .m-number {
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--accent);
    color: #fff;
    font-family: var(--font-display);
    font-size: 16px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .m-title-fields {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .m-title-input-row {
    display: flex;
    gap: 12px;
  }
  .m-title-input {
    flex: 1;
    font-size: 16px;
    font-weight: 700;
    color: var(--text);
    padding: 6px 12px;
    border: 1.5px solid var(--border);
    border-radius: 8px;
    outline: none;
  }
  .m-title-input:focus { border-color: var(--accent); }
  .m-duration-input {
    width: 130px;
    font-size: 13px;
    font-weight: 600;
    color: var(--accent2);
    padding: 6px 12px;
    border: 1.5px solid var(--border);
    border-radius: 8px;
    outline: none;
    text-align: center;
  }
  .m-duration-input:focus { border-color: var(--accent); }
  .m-desc-input {
    width: 100%;
    padding: 8px 12px;
    border: 1.5px solid var(--border);
    border-radius: 8px;
    font-family: var(--font-body);
    font-size: 13px;
    line-height: 1.6;
    outline: none;
    resize: vertical;
  }
  .m-desc-input:focus { border-color: var(--accent); }

  /* Read Only Milestone View */
  .m-title-view {
    flex: 1;
  }
  .m-title-row-view {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 6px;
    flex-wrap: wrap;
  }
  .m-title-row-view h2 {
    font-size: 18px;
    font-weight: 700;
    color: var(--text);
  }
  .m-dur-badge {
    font-size: 11px;
    font-weight: 700;
    color: var(--accent2);
    background: var(--accent-soft);
    padding: 3px 10px;
    border-radius: 20px;
  }
  .m-desc-text {
    font-size: 13.5px;
    color: var(--text2);
    line-height: 1.6;
  }

  /* Views Edit Grid */
  .editor-views-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 12px;
    margin-bottom: 20px;
    padding: 14px;
    background: var(--bg);
    border-radius: 12px;
    border: 1px solid var(--border);
  }
  .view-edit-box {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .view-lbl {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .macro .view-lbl { color: var(--green); }
  .micro .view-lbl { color: var(--blue); }
  .nano .view-lbl  { color: var(--red); }
  
  .view-edit-box textarea {
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-family: var(--font-body);
    font-size: 12px;
    line-height: 1.5;
    outline: none;
    resize: none;
    background: #fff;
  }
  .view-edit-box textarea:focus {
    border-color: var(--accent);
  }
  .view-read-text {
    font-size: 12.5px;
    color: var(--text2);
    line-height: 1.55;
    background: #fff;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid var(--border);
  }

  /* Actionable micro steps */
  .editor-steps-section {
    margin-bottom: 22px;
    padding: 14px 18px;
    background: #fff;
    border: 1.5px solid var(--border);
    border-radius: 12px;
  }
  .section-sublabel {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: var(--text3);
    margin-bottom: 12px;
  }
  .steps-edit-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .step-edit-row {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .step-edit-row .step-num {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--bg3);
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .step-edit-row .task-input {
    flex: 2;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 13px;
    outline: none;
  }
  .step-edit-row .resource-input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    font-size: 13px;
    outline: none;
    font-weight: 600;
    color: var(--accent);
  }
  .step-edit-row input:focus {
    border-color: var(--accent);
  }

  /* Read-Only steps */
  .steps-read-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .step-read-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 6px 0;
    border-bottom: 1px solid var(--bg3);
  }
  .step-read-row:last-child {
    border-bottom: none;
  }
  .step-read-num {
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--accent-soft);
    color: var(--accent2);
    font-size: 11px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .step-read-task {
    flex: 1;
    font-size: 13px;
    color: var(--text);
    font-weight: 500;
  }
  .step-read-res-badge {
    font-size: 11px;
    font-weight: 700;
    background: var(--bg3);
    color: var(--text2);
    padding: 3px 8px;
    border-radius: 4px;
    border: 1px solid var(--border);
  }

  /* Marketplace resources */
  .editor-marketplace-section {
    padding: 16px 18px;
    background: var(--bg3);
    border-radius: 12px;
    border: 1px solid var(--border);
  }
  .market-group {
    margin-bottom: 20px;
  }
  .market-group:last-child {
    margin-bottom: 0;
  }
  .market-group-title {
    font-size: 12px;
    font-weight: 700;
    margin-bottom: 10px;
    padding-bottom: 4px;
    border-bottom: 2px solid;
  }
  .market-group-title.free { color: var(--green); border-color: rgba(52,168,83,0.15); }
  .market-group-title.structured { color: var(--blue); border-color: rgba(66,133,244,0.15); }
  .market-group-title.expert { color: var(--red); border-color: rgba(232,49,42,0.15); }

  .market-items-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 12px;
  }
  .market-edit-card {
    background: #fff;
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .market-edit-card .res-name {
    font-weight: 600;
    font-size: 13px;
    color: var(--text);
    border: none;
    border-bottom: 1.5px solid var(--border);
    outline: none;
    padding-bottom: 4px;
  }
  .market-edit-card .res-name:focus {
    border-color: var(--accent);
  }
  .res-row-2, .res-row-3 {
    display: flex;
    gap: 6px;
  }
  .market-edit-card input:not(.res-name) {
    padding: 5px 8px;
    font-size: 11px;
    border: 1px solid var(--border);
    border-radius: 6px;
    outline: none;
    flex: 1;
  }
  .market-edit-card input:not(.res-name):focus {
    border-color: var(--accent);
  }
  .market-edit-card textarea {
    padding: 6px 8px;
    font-size: 11px;
    line-height: 1.4;
    border: 1px solid var(--border);
    border-radius: 6px;
    outline: none;
    resize: none;
  }
  .market-edit-card textarea:focus {
    border-color: var(--accent);
  }

  /* Read-Only Marketplace Cards */
  .market-read-card {
    background: #fff;
    border: 1.5px solid var(--border);
    border-radius: 10px;
    padding: 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    height: 100%;
    transition: transform 0.2s;
  }
  .market-read-card:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.04);
  }
  .market-read-card.card-free { border-top: 3px solid var(--green); }
  .market-read-card.card-structured { border-top: 3px solid var(--blue); }
  .market-read-card.card-expert { border-top: 3px solid var(--red); }
  
  .market-read-card strong {
    font-size: 13.5px;
    color: var(--text);
  }
  .res-read-meta {
    display: flex;
    align-items: center;
    gap: 6px;
    flex-wrap: wrap;
  }
  .m-chip {
    font-size: 10px;
    font-weight: 700;
    padding: 2px 7px;
    border-radius: 4px;
    text-transform: uppercase;
  }
  .m-chip.free { background: var(--green-soft); color: var(--green); }
  .m-chip.structured { background: var(--blue-soft); color: var(--blue); }
  .m-chip.expert { background: var(--red-soft); color: var(--red); }
  
  .m-cost, .m-dur {
    font-size: 11px;
    color: var(--text3);
    font-weight: 600;
  }
  .m-cost::before { content: "• "; }
  .m-dur::before { content: "• "; }
  
  .res-why {
    font-size: 12px;
    color: var(--text2);
    line-height: 1.5;
    margin: 4px 0;
  }
  .res-read-next {
    font-size: 11.5px;
    color: var(--text2);
    background: var(--bg);
    padding: 6px 8px;
    border-radius: 6px;
    border: 1px solid var(--border);
    margin-top: auto;
  }

  /* Submit Action section */
  .editor-action-card {
    padding: 24px;
    margin-top: 24px;
  }
  .editor-submit-box {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .editor-submit-box h3 {
    font-family: var(--font-display);
    font-size: 18px;
    color: var(--text);
  }
  .editor-submit-box p {
    font-size: 13px;
    color: var(--text3);
    line-height: 1.5;
  }
  .editor-submit-btns {
    display: flex;
    gap: 12px;
    margin-top: 14px;
  }
  .editor-submit-btns button {
    padding: 12px 24px;
    font-size: 14px;
    font-weight: 600;
    border-radius: 8px;
    cursor: pointer;
    font-family: var(--font-body);
    transition: all 0.2s;
  }
  .btn-secondary {
    background: none;
    border: 1.5px solid var(--border);
    color: var(--text2);
  }
  .btn-secondary:hover {
    border-color: var(--text);
    color: var(--text);
  }
  .approve-btn {
    background: var(--green);
    color: #fff;
    border: none;
    box-shadow: 0 4px 14px rgba(52,168,83,0.3);
  }
  .approve-btn:hover {
    background: #2b9045;
  }

  /* ALERTS & STATES */
  .ar-loading-state {
    padding: 40px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    color: var(--text3);
  }
  .ar-error-card {
    padding: 30px;
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    color: var(--red);
    gap: 8px;
  }
  .ar-success-alert {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 20px;
    background: var(--green-soft);
    border-left: 4px solid var(--green);
    color: var(--accent2);
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 20px;
    animation: fadeIn 0.2s ease both;
  }

  .ar-empty-state {
    padding: 48px;
    text-align: center;
    color: var(--text3);
  }
  .ar-empty-state svg {
    color: var(--border);
    margin-bottom: 12px;
  }
  .ar-empty-state h3 {
    color: var(--text);
    font-size: 18px;
    margin-bottom: 4px;
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;