import { useState, useEffect } from "react";
import './Adminreview.scss';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  IconCheck, IconAlert, IconArrowLeft, IconUser,
  IconMap, IconTarget, IconPin, IconSearch, IconNavigation
} from "./Icons";

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:8000" : "");

const STATUS = {
  under_review: "under_admin_review",
  published: "published",
  rejected: "rejected"
};

function cleanMarkdownText(str) {
  if (!str) return "";
  return str.replace(/\*\*/g, "");
}

export default function AdminReview() {
  const [pathsQueue, setPathsQueue] = useState([]);
  const [selectedPath, setSelectedPath] = useState(null);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [error, setError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("under_admin_review");
  const [successMsg, setSuccessMsg] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [editedRoadmap, setEditedRoadmap] = useState(null);
  const [editingDetails, setEditingDetails] = useState(false);

  const handleExportPdf = async (pathParam) => {
    // Check if pathParam is a React synthetic event or native event
    const isEvent = pathParam && (pathParam.nativeEvent || pathParam.preventDefault || typeof pathParam.stopPropagation === 'function');
    const pathToExport = (pathParam && !isEvent) ? pathParam : selectedPath;
    
    if (!pathToExport) {
      alert('Select a path to generate report');
      return;
    }
    setPdfLoading(true);
    try {
      const doc = new jsPDF();
      const now = new Date();
      const dateStr = now.toLocaleDateString();

      // Get the correct roadmap source (active state or saved database state)
      const roadmap = (selectedPath && pathToExport.id === selectedPath.id && editedRoadmap)
        ? editedRoadmap
        : pathToExport.roadmap_data;

      // Helper to print wrapped section with auto page-breaking
      const printSection = (docInstance, title, content, x, y, width) => {
        let currentY = y;
        if (currentY > 250) {
          docInstance.addPage();
          currentY = 25;
        }
        
        docInstance.setFontSize(11);
        docInstance.setFont("helvetica", "bold");
        docInstance.text(title, x, currentY);
        
        docInstance.setFontSize(10);
        docInstance.setFont("helvetica", "normal");
        const lines = docInstance.splitTextToSize(content || "No information provided.", width);
        
        lines.forEach(line => {
          currentY += 5;
          if (currentY > 275) {
            docInstance.addPage();
            currentY = 25;
          }
          docInstance.text(line, x, currentY);
        });
        
        return currentY + 12; // margin after section
      };

      // Header Banner (Page 1)
      doc.setFillColor(99, 102, 241); // Indigo color banner
      doc.rect(0, 0, 210, 45, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text('Naaviverse Admin Report', 15, 25);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Generated on: ${dateStr}`, 15, 35);

      // Reset text color to dark slate
      doc.setTextColor(15, 23, 42);

      // Metadata section (No student name/email included)
      const metadataRows = [
        ['Current Position / Path', pathToExport.current_position || 'N/A'],
        ['Target Goal / Future Path', pathToExport.target_goal || 'N/A'],
        ['Grade / Academic Year', pathToExport.profile?.grade || 'N/A'],
        ['Board / Curriculum', pathToExport.profile?.curriculum || 'N/A'],
        ['Readiness Score', `${roadmap?.readiness_score || 0}% (${roadmap?.readiness_label || 'N/A'})`],
        ['Total Duration', roadmap?.total_duration || 'N/A']
      ];

      autoTable(doc, {
        startY: 55,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        head: [['Metric', 'Value']],
        body: metadataRows,
        styles: { fontSize: 10, cellPadding: 4 }
      });

      // Pathway Title & Description section
      let currentY = doc.lastAutoTable.finalY + 15;
      currentY = printSection(doc, 'Pathway Title:', roadmap?.path_title || `Pathway to ${pathToExport.target_goal}`, 15, currentY, 180);
      currentY = printSection(doc, 'Pathway Description:', roadmap?.path_description, 15, currentY, 180);

      // Loop through each Milestone/Step
      roadmap?.macro_path?.forEach((milestone) => {
        doc.addPage();
        
        // Header Banner for this milestone page
        doc.setFillColor(243, 244, 246); // light grey
        doc.rect(0, 0, 210, 25, 'F');
        
        doc.setTextColor(79, 70, 229);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(`Step ${milestone.id}: ${milestone.title}`, 15, 16);
        
        doc.setTextColor(107, 114, 128);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Duration: ${milestone.duration || 'N/A'}`, 150, 16);
        
        doc.setTextColor(15, 23, 42); // reset text color to dark

        let stepY = 38;
        
        // Step Objective
        stepY = printSection(doc, 'Step Objective:', milestone.description, 15, stepY, 180);
        
        // Macro View
        stepY = printSection(doc, 'Macro View (High Level Outcome):', cleanMarkdownText(milestone.macro_view), 15, stepY, 180);
        
        // Micro View
        stepY = printSection(doc, 'Micro View (Execution Output):', cleanMarkdownText(milestone.micro_view), 15, stepY, 180);
        
        // Nano View
        stepY = printSection(doc, 'Nano View (Mentor Guidance Focus):', cleanMarkdownText(milestone.nano_view), 15, stepY, 180);
        
        // Gather all marketplace resources for this milestone
        const milestoneMarketplaceRows = [];
        
        // 1. Free/Macro resources (Provided / Community)
        const macroFree = milestone.marketplace?.macro_free || [];
        if (Array.isArray(macroFree)) {
          macroFree.forEach(res => {
            milestoneMarketplaceRows.push([
              cleanMarkdownText(res.name) || 'N/A',
              `Free / Provided (${cleanMarkdownText(res.type) || 'Content'})`,
              'Free',
              `${cleanMarkdownText(res.why) || ''}\nAction: ${cleanMarkdownText(res.next_step) || ''}`
            ]);
          });
        }

        // 2. Structured/Paid Micro resources (Recommended certifications/courses)
        const microStructured = milestone.marketplace?.micro_structured || [];
        if (Array.isArray(microStructured)) {
          microStructured.forEach(res => {
            milestoneMarketplaceRows.push([
              cleanMarkdownText(res.name) || 'N/A',
              `Recommended Course (${cleanMarkdownText(res.type) || 'Paid'})`,
              `${cleanMarkdownText(res.cost) || 'Paid'} / ${cleanMarkdownText(res.duration) || ''}`,
              `${cleanMarkdownText(res.value) || ''}\nAction: ${cleanMarkdownText(res.next_step) || ''}`
            ]);
          });
        }

        // 3. Expert/Nano resources (Recommended expert/mentoring options)
        const nanoExpert = milestone.marketplace?.nano_expert || [];
        if (Array.isArray(nanoExpert)) {
          nanoExpert.forEach(res => {
            milestoneMarketplaceRows.push([
              cleanMarkdownText(res.name) || 'N/A',
              `Recommended Mentorship (${cleanMarkdownText(res.type) || 'Expert'})`,
              cleanMarkdownText(res.price) || 'Paid',
              `${cleanMarkdownText(res.expected_outcomes) || ''}\nFormat: ${cleanMarkdownText(res.session_details) || ''}`
            ]);
          });
        }

        if (stepY > 230) {
          doc.addPage();
          stepY = 20;
        }

        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text('Marketplace Curations:', 15, stepY);

        if (milestoneMarketplaceRows.length > 0) {
          autoTable(doc, {
            startY: stepY + 5,
            theme: 'grid',
            headStyles: { fillColor: [99, 102, 241] },
            head: [['Resource / Provider', 'Category & Type', 'Cost / Duration', 'Description & Next Action']],
            body: milestoneMarketplaceRows,
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
              0: { cellWidth: 40 },
              1: { cellWidth: 40 },
              2: { cellWidth: 35 },
              3: { cellWidth: 65 }
            }
          });
        } else {
          doc.setFontSize(10);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(107, 114, 128);
          doc.text('No marketplace resources curated for this step.', 15, stepY + 10);
        }
      });

      const fileName = `naavi-admin-report-${now.toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
    } catch (e) {
      console.error('PDF generation error', e);
      alert('Failed to generate PDF');
    }
    setPdfLoading(false);
  };

const [editingMilestoneIdx, setEditingMilestoneIdx] = useState(null);

// Temporary/backup states for the sections being edited
const [tempDetails, setTempDetails] = useState({
  path_title: "",
  path_description: "",
  readiness_score: 0,
  readiness_label: "",
  total_duration: ""
});
const [tempMilestone, setTempMilestone] = useState(null);
const [expandedMarkets, setExpandedMarkets] = useState({});

function toggleMarketplace(milestoneId, type) {
  const key = `${milestoneId}_${type}`;
  setExpandedMarkets(prev => {
    const isCurrentlyOpen = !!prev[key];
    const nextExpanded = { ...prev };
    // Close all view columns for this milestone to ensure only one is open
    ["macro", "micro", "nano"].forEach(t => {
      nextExpanded[`${milestoneId}_${t}`] = false;
    });
    nextExpanded[key] = !isCurrentlyOpen;
    return nextExpanded;
  });
}

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
  const timer = setTimeout(() => {
    loadQueue();
  }, 0);
  return () => clearTimeout(timer);
}, []);

// Set up local editor state when a path is selected
function selectPathForReview(pathDoc) {
  setSelectedPath(pathDoc);
  setEditedRoadmap(JSON.parse(JSON.stringify(pathDoc.roadmap_data))); // deep copy
  setSuccessMsg("");
  setEditingDetails(false);
  setEditingMilestoneIdx(null);
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
        <div className="ar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div className="pill pill-teal" style={{ marginBottom: 12 }}>Human in the Loop</div>
            <h1 className="display-title" style={{ fontSize: 27 }}>Admin Review Curation</h1>
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
                <div key={path.id} className={`ar-queue-card card status-${path.status}`}>
                  <div className="ar-q-top">
                    <div className="ar-q-student">
                      <IconUser size={14} />
                      <div className="ar-q-student-info">
                        <strong>{path.profile?.name || path.profile?.email || "Anonymous Student"}</strong>
                        <span className="ar-q-date">{dateStr}</span>
                      </div>
                    </div>
                    <button className="btn-pdf-pill" onClick={() => handleExportPdf(path)} disabled={pdfLoading} style={{ backgroundColor: '#6366f1', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: '999px', cursor: pdfLoading ? 'not-allowed' : 'pointer', marginLeft: 8 }}>
                      {pdfLoading ? 'Generating...' : 'Export PDF'}
                    </button>

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
                    <div className="meta-item"><span>Grade</span><span>{path.profile?.grade || "N/A"}</span></div>
                    <div className="meta-item"><span>Board</span><span>{path.profile?.curriculum || "N/A"}</span></div>
                    <div className="meta-item"><span>Readiness</span><strong className="green-text">{path.roadmap_data?.readiness_score}%</strong></div>
                    <div className="meta-item"><span>Duration</span><span>{path.roadmap_data?.total_duration}</span></div>
                  </div>

                  <button className="ar-q-btn" onClick={() => selectPathForReview(path)}>
                    {path.status === "published" ? "View Published Roadmap →" : "Audit & Curate Roadmap →"}
                  </button>
                  {/* <button
                      className="btn-pdf"
                      onClick={() => {
                        setSelectedPath(path);
                        handleExportPdf();
                      }}
                      disabled={pdfLoading}
                      style={{ backgroundColor: '#6366f1', color: '#fff', border: 'none', padding: '6px 10px', borderRadius: 4, marginLeft: 8, cursor: pdfLoading ? 'not-allowed' : 'pointer' }}
                    >
                      {pdfLoading && selectedPath?.id === path.id ? 'Generating...' : 'Export PDF'}
                    </button> */}
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

            <button
              className="btn-pdf"
              onClick={() => handleExportPdf()}
              disabled={pdfLoading}
              style={{ backgroundColor: '#6366f1', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 4, cursor: pdfLoading ? 'not-allowed' : 'pointer' }}
            >
              {pdfLoading ? 'Generating...' : 'Export PDF'}
            </button>
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
              <div className="stat-read-item" style={{ gridColumn: "span 3" }}>
                <span>Pathway Title</span>
                <strong>{editedRoadmap.path_title || `Pathway to ${selectedPath.target_goal}`}</strong>
              </div>
              <div className="stat-read-item" style={{ gridColumn: "span 3" }}>
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
                <span>{editedRoadmap.readiness_label}</span>
              </div>
              <div className="stat-read-item">
                <span>Total Duration</span>
                <span>{editedRoadmap.total_duration}</span>
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

                {/* Triple Views Curation Columns */}
                <div className="milestone-views-columns">
                  {[
                    {
                      key: "macro",
                      viewKey: "macro_view",
                      label: "Macro View (High Level Outcome)",
                      colorClass: "macro",
                      marketKey: "macro_free",
                      marketLabel: "Free Content / Community Resources"
                    },
                    {
                      key: "micro",
                      viewKey: "micro_view",
                      label: "Micro View (Execution Output)",
                      colorClass: "micro",
                      marketKey: "micro_structured",
                      marketLabel: "Structured / Paid Certifications"
                    },
                    {
                      key: "nano",
                      viewKey: "nano_view",
                      label: "Nano View (Mentor Guidance focus)",
                      colorClass: "nano",
                      marketKey: "nano_expert",
                      marketLabel: "Expert Mentors & Personal Counselors"
                    }
                  ].map(col => {
                    const isExpanded = expandedMarkets[`${milestone.id}_${col.key}`];
                    const marketItems = activeMilestone.marketplace?.[col.marketKey] || [];
                    const itemCount = marketItems.length;

                    return (
                      <div key={col.key} className={`view-column ${col.colorClass}`}>
                        {/* View Description/Edit Textarea */}
                        <div className="view-desc-box">
                          <span className="view-lbl">{col.label}</span>
                          {!isMilestoneEditing ? (
                            <p className="view-read-text">{activeMilestone[col.viewKey] || "No description provided."}</p>
                          ) : (
                            <textarea
                              value={activeMilestone[col.viewKey] || ""}
                              onChange={e => handleTempMilestoneChange(col.viewKey, e.target.value)}
                              rows={4}
                            />
                          )}
                        </div>

                        {/* Toggle Button */}
                        <button
                          type="button"
                          className={`btn-toggle-marketplace ${col.colorClass} ${isExpanded ? 'expanded' : ''}`}
                          onClick={() => toggleMarketplace(milestone.id, col.key)}
                        >
                          {isExpanded ? "Hide Marketplace" : `Show Marketplace (${itemCount})`}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* Horizontal Marketplace Section below the 3 columns */}
                {[
                  {
                    key: "macro",
                    colorClass: "macro",
                    marketKey: "macro_free",
                    marketLabel: "Free Content / Community Resources"
                  },
                  {
                    key: "micro",
                    colorClass: "micro",
                    marketKey: "micro_structured",
                    marketLabel: "Structured / Paid Certifications"
                  },
                  {
                    key: "nano",
                    colorClass: "nano",
                    marketKey: "nano_expert",
                    marketLabel: "Expert Mentors & Personal Counselors"
                  }
                ].map(col => {
                  const isExpanded = expandedMarkets[`${milestone.id}_${col.key}`];
                  if (!isExpanded) return null;

                  const marketItems = activeMilestone.marketplace?.[col.marketKey] || [];

                  return (
                    <div key={col.key} className={`horizontal-marketplace-section ${col.colorClass}`}>
                      <div className="market-group-title-inline">{col.marketLabel}</div>
                      <div className="market-items-row">
                        {marketItems.map((res, rIdx) => (
                          <div key={rIdx} className="market-card-wrapper-horizontal">
                            {!isMilestoneEditing ? (
                              col.key === "macro" ? (
                                <div className="market-read-card card-free">
                                  <strong>{cleanMarkdownText(res.name)}</strong>
                                  <div className="res-read-meta">
                                    <span className="m-chip free">{cleanMarkdownText(res.type)}</span>
                                  </div>
                                  <p className="res-why">{cleanMarkdownText(res.why)}</p>
                                  {res.next_step && <div className="res-read-next"><strong>Action:</strong> {cleanMarkdownText(res.next_step)}</div>}
                                </div>
                              ) : col.key === "micro" ? (
                                <div className="market-read-card card-structured">
                                  <strong>{cleanMarkdownText(res.name)}</strong>
                                  <div className="res-read-meta">
                                    <span className="m-chip structured">{cleanMarkdownText(res.type)}</span>
                                    <span className="m-cost">{cleanMarkdownText(res.cost)}</span>
                                    <span className="m-dur">{cleanMarkdownText(res.duration)}</span>
                                  </div>
                                  <p className="res-why">{cleanMarkdownText(res.value)}</p>
                                  {res.next_step && <div className="res-read-next"><strong>Action:</strong> {cleanMarkdownText(res.next_step)}</div>}
                                </div>
                              ) : (
                                <div className="market-read-card card-expert">
                                  <strong>{cleanMarkdownText(res.name)}</strong>
                                  <div className="res-read-meta">
                                    <span className="m-chip expert">{cleanMarkdownText(res.type)}</span>
                                    <span className="m-cost">{cleanMarkdownText(res.price)}</span>
                                  </div>
                                  <p className="res-why">{cleanMarkdownText(res.expected_outcomes)}</p>
                                  {res.session_details && <div className="res-read-next"><strong>Format:</strong> {cleanMarkdownText(res.session_details)}</div>}
                                </div>
                              )
                            ) : (
                              col.key === "macro" ? (
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
                              ) : col.key === "micro" ? (
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
                              )
                            )}
                          </div>
                        ))}
                        {marketItems.length === 0 && (
                          <div className="no-resources-msg">No marketplace resources curated for this view.</div>
                        )}
                      </div>
                    </div>
                  );
                })}

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


