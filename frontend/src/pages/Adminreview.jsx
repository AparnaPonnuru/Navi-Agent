import { useState, useEffect } from "react";
import './Adminreview.scss';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  IconCheck, IconAlert, IconArrowLeft, IconUser,
  IconSearch, IconNavigation
} from "./Icons";

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://127.0.0.1:8001" : "");

const STATUS = {
  under_review: "under_admin_review",
  published: "published",
  rejected: "rejected"
};

function cleanMarkdownText(str) {
  if (!str) return "";
  return str.replace(/\*\*/g, "");
}

// ── Icon helpers (inline SVG fallbacks if Icons.jsx missing them) ──────────
function PlusIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function TrashIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
    </svg>
  );
}
function EditIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}
function ChevronDown({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}
function ExportIcon({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}



// ── Empty templates ────────────────────────────────────────────────────────
function emptyMilestone(id) {
  return {
    id,
    title: "",
    duration: "",
    description: "",
    macro_view: "",
    micro_view: "",
    nano_view: "",
    marketplace: {
      macro_free: [],
      micro_structured: [],
      nano_expert: []
    }
  };
}

function emptyMacroFree()       { return { name: "", type: "", why: "", next_step: "" }; }
function emptyMicroStructured() { return { name: "", type: "", cost: "", duration: "", value: "", next_step: "" }; }
function emptyNanoExpert()      { return { name: "", type: "", price: "", session_details: "", expected_outcomes: "" }; }

// ── Confirm modal ──────────────────────────────────────────────────────────
function ConfirmModal({ message, onConfirm, onCancel }) {
  return (
    <div className="ar-modal-overlay" onClick={onCancel}>
      <div className="ar-modal-box" onClick={e => e.stopPropagation()}>
        <p>{message}</p>
        <div className="ar-modal-btns">
          <button className="btn-cancel-section" onClick={onCancel}>Cancel</button>
          <button className="btn-danger-confirm" onClick={onConfirm}>Delete</button>
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════
export default function AdminReview() {
  const [pathsQueue, setPathsQueue]     = useState([]);
  const [selectedPath, setSelectedPath] = useState(null);
  const [loadingQueue, setLoadingQueue] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [error, setError]               = useState("");
  const [searchQuery, setSearchQuery]   = useState("");
  const [filterStatus, setFilterStatus] = useState("under_admin_review");
  const [successMsg, setSuccessMsg]     = useState("");
  const [pdfLoading, setPdfLoading]     = useState(false);
  const [editedRoadmap, setEditedRoadmap] = useState(null);

  // Edit state
  const [editingDetails, setEditingDetails]         = useState(false);
  const [editingMilestoneIdx, setEditingMilestoneIdx] = useState(null);
  const [tempDetails, setTempDetails]               = useState({});
  const [tempMilestone, setTempMilestone]           = useState(null);

  // Marketplace expand
  const [expandedMarkets, setExpandedMarkets] = useState({});

  // Confirm delete modal
  const [confirmModal, setConfirmModal] = useState(null); // { message, onConfirm }

  // Alternatives index state
  const [activeAltIdx, setActiveAltIdx] = useState(0);
  const activeRoadmap = editedRoadmap?.alternatives ? editedRoadmap.alternatives[activeAltIdx] : editedRoadmap;

  // ── PDF Export ────────────────────────────────────────────────────────
  const handleExportPdf = async (pathParam) => {
    const isEvent = pathParam && (pathParam.nativeEvent || pathParam.preventDefault || typeof pathParam.stopPropagation === 'function');
    const pathToExport = (pathParam && !isEvent) ? pathParam : selectedPath;
    if (!pathToExport) {
      console.warn("[Naavi AdminReview] Export PDF called but no pathway is selected or passed.");
      alert('Select a path to generate report');
      return;
    }
    console.log("[Naavi AdminReview] Starting PDF report export for path:", pathToExport);
    setPdfLoading(true);
    try {
      const doc    = new jsPDF();
      const now    = new Date();
      const dateStr = now.toLocaleDateString();
      const roadmapRaw = (selectedPath && pathToExport.id === selectedPath.id && editedRoadmap)
        ? editedRoadmap : pathToExport.roadmap_data;
      const roadmap = roadmapRaw?.alternatives ? roadmapRaw.alternatives[activeAltIdx] : roadmapRaw;

      const printSection = (docInstance, title, content, x, y, width) => {
        let cy = y;
        if (cy > 250) { docInstance.addPage(); cy = 25; }
        docInstance.setFontSize(11); docInstance.setFont("helvetica", "bold");
        docInstance.text(title, x, cy);
        docInstance.setFontSize(10); docInstance.setFont("helvetica", "normal");
        const lines = docInstance.splitTextToSize(content || "No information provided.", width);
        lines.forEach(line => { cy += 5; if (cy > 275) { docInstance.addPage(); cy = 25; } docInstance.text(line, x, cy); });
        return cy + 12;
      };

      doc.setFillColor(99, 102, 241);
      doc.rect(0, 0, 210, 45, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22); doc.setFont("helvetica", "bold");
      doc.text('Naaviverse Admin Report', 15, 25);
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text(`Generated on: ${dateStr}`, 15, 35);
      doc.setTextColor(15, 23, 42);

      autoTable(doc, {
        startY: 55, theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] },
        head: [['Metric', 'Value']],
        body: [
          ['Current Position', pathToExport.current_position || 'N/A'],
          ['Target Goal', pathToExport.target_goal || 'N/A'],
          ['Grade', pathToExport.profile?.grade || 'N/A'],
          ['Board', pathToExport.profile?.curriculum || 'N/A'],
          ['Readiness Score', `${roadmap?.readiness_score || 0}% (${roadmap?.readiness_label || 'N/A'})`],
          ['Total Duration', roadmap?.total_duration || 'N/A']
        ],
        styles: { fontSize: 10, cellPadding: 4 }
      });

      let cy = doc.lastAutoTable.finalY + 15;
      cy = printSection(doc, 'Pathway Title:', roadmap?.path_title || `Pathway to ${pathToExport.target_goal}`, 15, cy, 180);
      cy = printSection(doc, 'Pathway Description:', roadmap?.path_description, 15, cy, 180);

      roadmap?.macro_path?.forEach(milestone => {
        doc.addPage();
        doc.setFillColor(243, 244, 246); doc.rect(0, 0, 210, 25, 'F');
        doc.setTextColor(79, 70, 229); doc.setFontSize(14); doc.setFont("helvetica", "bold");
        doc.text(`Step ${milestone.id}: ${milestone.title}`, 15, 16);
        doc.setTextColor(107, 114, 128); doc.setFontSize(10); doc.setFont("helvetica", "normal");
        doc.text(`Duration: ${milestone.duration || 'N/A'}`, 150, 16);
        doc.setTextColor(15, 23, 42);
        let sy = 38;
        sy = printSection(doc, 'Step Objective:', milestone.description, 15, sy, 180);
        sy = printSection(doc, 'Macro View:', cleanMarkdownText(milestone.macro_view), 15, sy, 180);
        sy = printSection(doc, 'Micro View:', cleanMarkdownText(milestone.micro_view), 15, sy, 180);
        sy = printSection(doc, 'Nano View:', cleanMarkdownText(milestone.nano_view), 15, sy, 180);

        const rows = [];
        (milestone.marketplace?.macro_free || []).forEach(r => rows.push([cleanMarkdownText(r.name), `Free (${cleanMarkdownText(r.type)})`, 'Free', `${cleanMarkdownText(r.why)}\nAction: ${cleanMarkdownText(r.next_step)}`]));
        (milestone.marketplace?.micro_structured || []).forEach(r => rows.push([cleanMarkdownText(r.name), `Paid (${cleanMarkdownText(r.type)})`, `${cleanMarkdownText(r.cost)} / ${cleanMarkdownText(r.duration)}`, `${cleanMarkdownText(r.value)}\nAction: ${cleanMarkdownText(r.next_step)}`]));
        (milestone.marketplace?.nano_expert || []).forEach(r => rows.push([cleanMarkdownText(r.name), `Expert (${cleanMarkdownText(r.type)})`, cleanMarkdownText(r.price), `${cleanMarkdownText(r.expected_outcomes)}\nFormat: ${cleanMarkdownText(r.session_details)}`]));

        if (sy > 230) { doc.addPage(); sy = 20; }
        doc.setFontSize(11); doc.setFont("helvetica", "bold");
        doc.text('Marketplace Curations:', 15, sy);
        if (rows.length > 0) {
          autoTable(doc, { startY: sy + 5, theme: 'grid', headStyles: { fillColor: [99, 102, 241] }, head: [['Resource', 'Category', 'Cost', 'Description']], body: rows, styles: { fontSize: 9, cellPadding: 3 }, columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 40 }, 2: { cellWidth: 35 }, 3: { cellWidth: 65 } } });
        }
      });

      doc.save(`naavi-admin-report-${now.toISOString().split('T')[0]}.pdf`);
      console.log("[Naavi AdminReview] PDF report generated and saved successfully.");
    } catch (e) {
      console.error("[Naavi AdminReview] Failed to generate report PDF:", e);
      alert('Failed to generate PDF');
    }
    setPdfLoading(false);
  };

  // ── Queue load ────────────────────────────────────────────────────────
  async function loadQueue() {
    console.log("[Naavi AdminReview] Fetching admin review queue from backend...");
    setLoadingQueue(true); setError("");
    try {
      const res = await fetch(`${API}/api/admin/paths?status=all`);
      if (!res.ok) throw new Error("Failed to fetch paths");
      const data = await res.json();
      console.log(`[Naavi AdminReview] Review queue loaded. Received ${data.length} paths.`);
      setPathsQueue(data);
    } catch (e) {
      console.error("[Naavi AdminReview] Failed to load review queue:", e);
      setError("Cannot load admin review queue. Verify the backend is running.");
    } finally {
      setLoadingQueue(false);
    }
  }

  useEffect(() => { loadQueue(); }, []);

  async function selectPathForReview(pathDoc) {
    console.log("[Naavi AdminReview] Path selected for review. Path ID:", pathDoc.id, "Target goal:", pathDoc.target_goal);
    setLoadingQueue(true);
    setError("");
    try {
      const res = await fetch(`${API}/api/paths/${pathDoc.id}`);
      if (!res.ok) throw new Error("Failed to fetch path details");
      const fullPath = await res.json();
      console.log("[Naavi AdminReview] Successfully fetched full path details:", fullPath);
      setSelectedPath(fullPath);
      setEditedRoadmap(JSON.parse(JSON.stringify(fullPath.roadmap_data)));
      setSuccessMsg(""); setEditingDetails(false); setEditingMilestoneIdx(null); setExpandedMarkets({});
    } catch (e) {
      console.error("[Naavi AdminReview] Error fetching path details:", e);
      setError("Failed to load pathway details. Verify the backend is running.");
    } finally {
      setLoadingQueue(false);
    }
  }

  // ── Save to DB ────────────────────────────────────────────────────────
  async function saveRoadmapUpdate(updatedRoadmap, statusOverride) {
    if (!selectedPath) {
      console.warn("[Naavi AdminReview] saveRoadmapUpdate called but no selected path exists.");
      return false;
    }
    const targetStatus = statusOverride || selectedPath.status;
    console.log("[Naavi AdminReview] Saving updated roadmap in DB. Path ID:", selectedPath.id, "Target status:", targetStatus, "Roadmap details:", updatedRoadmap);
    setLoadingSubmit(true); setError("");
    try {
      const res = await fetch(`${API}/api/paths/${selectedPath.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roadmap_data: updatedRoadmap, status: targetStatus })
      });
      if (!res.ok) throw new Error("Failed to update career path");
      console.log("[Naavi AdminReview] Save update response success.");
      setPathsQueue(prev => prev.map(p => p.id === selectedPath.id ? { ...p, roadmap_data: updatedRoadmap } : p));
      flash("Changes saved successfully!");
      return true;
    } catch (e) {
      console.error("[Naavi AdminReview] Save roadmap update error:", e);
      setError(e.message);
      return false;
    } finally {
      setLoadingSubmit(false);
    }
  }

  function flash(msg) { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(""), 3000); }

  // ── Details edit ──────────────────────────────────────────────────────
  function startEditDetails() {
    setTempDetails({
      path_title: activeRoadmap.path_title || "",
      path_description: activeRoadmap.path_description || "",
      readiness_score: activeRoadmap.readiness_score || 0,
      readiness_label: activeRoadmap.readiness_label || "",
      total_duration: activeRoadmap.total_duration || ""
    });
    setEditingDetails(true);
  }
  async function saveDetails() {
    let updated;
    if (editedRoadmap?.alternatives) {
      const updatedAlternatives = [...editedRoadmap.alternatives];
      updatedAlternatives[activeAltIdx] = {
        ...updatedAlternatives[activeAltIdx],
        ...tempDetails
      };
      updated = { ...editedRoadmap, alternatives: updatedAlternatives };
    } else {
      updated = { ...editedRoadmap, ...tempDetails };
    }
    if (await saveRoadmapUpdate(updated)) {
      setEditedRoadmap(updated);
      setEditingDetails(false);
    }
  }

  // ── Milestone edit ────────────────────────────────────────────────────
  function startEditMilestone(idx) {
    setEditingMilestoneIdx(idx);
    setTempMilestone(JSON.parse(JSON.stringify(activeRoadmap.macro_path[idx])));
  }
  async function saveMilestone(idx) {
    let updated;
    if (editedRoadmap?.alternatives) {
      const updatedAlternatives = [...editedRoadmap.alternatives];
      const updatedPath = [...updatedAlternatives[activeAltIdx].macro_path];
      updatedPath[idx] = tempMilestone;
      updatedAlternatives[activeAltIdx] = {
        ...updatedAlternatives[activeAltIdx],
        macro_path: updatedPath
      };
      updated = { ...editedRoadmap, alternatives: updatedAlternatives };
    } else {
      const updatedPath = [...editedRoadmap.macro_path];
      updatedPath[idx] = tempMilestone;
      updated = { ...editedRoadmap, macro_path: updatedPath };
    }
    if (await saveRoadmapUpdate(updated)) {
      setEditedRoadmap(updated);
      setEditingMilestoneIdx(null);
      setTempMilestone(null);
    }
  }
  function cancelEditMilestone() { setEditingMilestoneIdx(null); setTempMilestone(null); }

  function handleTempMilestoneChange(field, value) {
    setTempMilestone(prev => ({ ...prev, [field]: value }));
  }

  // ── Delete milestone ──────────────────────────────────────────────────
  function confirmDeleteMilestone(idx) {
    setConfirmModal({
      message: `Delete Step ${activeRoadmap.macro_path[idx].id}: "${activeRoadmap.macro_path[idx].title}"? This cannot be undone.`,
      onConfirm: async () => {
        setConfirmModal(null);
        let updated;
        if (editedRoadmap?.alternatives) {
          const updatedAlternatives = [...editedRoadmap.alternatives];
          const updatedPath = updatedAlternatives[activeAltIdx].macro_path
            .filter((_, i) => i !== idx)
            .map((m, i) => ({ ...m, id: i + 1 }));
          updatedAlternatives[activeAltIdx] = {
            ...updatedAlternatives[activeAltIdx],
            macro_path: updatedPath
          };
          updated = { ...editedRoadmap, alternatives: updatedAlternatives };
        } else {
          const updatedPath = editedRoadmap.macro_path
            .filter((_, i) => i !== idx)
            .map((m, i) => ({ ...m, id: i + 1 }));
          updated = { ...editedRoadmap, macro_path: updatedPath };
        }
        if (await saveRoadmapUpdate(updated)) {
          setEditedRoadmap(updated);
          if (editingMilestoneIdx === idx) {
            setEditingMilestoneIdx(null);
            setTempMilestone(null);
          }
        }
      }
    });
  }

  // ── Add milestone ─────────────────────────────────────────────────────
  async function addMilestone() {
    const newId = (activeRoadmap.macro_path?.length || 0) + 1;
    const newMilestone = emptyMilestone(newId);
    let updated;
    if (editedRoadmap?.alternatives) {
      const updatedAlternatives = [...editedRoadmap.alternatives];
      const updatedPath = [...(updatedAlternatives[activeAltIdx].macro_path || []), newMilestone];
      updatedAlternatives[activeAltIdx] = {
        ...updatedAlternatives[activeAltIdx],
        macro_path: updatedPath
      };
      updated = { ...editedRoadmap, alternatives: updatedAlternatives };
    } else {
      updated = { ...editedRoadmap, macro_path: [...(editedRoadmap.macro_path || []), newMilestone] };
    }
    if (await saveRoadmapUpdate(updated)) {
      setEditedRoadmap(updated);
      const newIdx = (activeRoadmap.macro_path?.length || 0);
      setEditingMilestoneIdx(newIdx);
      setTempMilestone(JSON.parse(JSON.stringify(newMilestone)));
    }
  }

  // ── Marketplace helpers ───────────────────────────────────────────────
  function toggleMarketplace(milestoneId, type) {
    const key = `${milestoneId}_${type}`;
    setExpandedMarkets(prev => {
      const next = { ...prev };
      ["macro", "micro", "nano"].forEach(t => { next[`${milestoneId}_${t}`] = false; });
      next[key] = !prev[key];
      return next;
    });
  }

  // Update marketplace item in tempMilestone (edit mode) or directly in editedRoadmap (if not editing)
  function updateMarketItem(mIdx, marketKey, rIdx, field, value) {
    if (editingMilestoneIdx === mIdx) {
      setTempMilestone(prev => {
        const copy = JSON.parse(JSON.stringify(prev));
        copy.marketplace[marketKey][rIdx][field] = value;
        return copy;
      });
    } else {
      // Direct edit mode for marketplace even when step is not in edit mode
      const updated = JSON.parse(JSON.stringify(editedRoadmap));
      if (updated.alternatives) {
        updated.alternatives[activeAltIdx].macro_path[mIdx].marketplace[marketKey][rIdx][field] = value;
      } else {
        updated.macro_path[mIdx].marketplace[marketKey][rIdx][field] = value;
      }
      setEditedRoadmap(updated);
    }
  }

  async function saveMarketItemDirect(mIdx) {
    // If the step is currently in edit mode, we need to merge tempMilestone first
    let roadmapToSave = editedRoadmap;
    if (editingMilestoneIdx === mIdx && tempMilestone) {
      if (editedRoadmap?.alternatives) {
        const updatedAlternatives = [...editedRoadmap.alternatives];
        const updatedPath = [...updatedAlternatives[activeAltIdx].macro_path];
        updatedPath[mIdx] = tempMilestone;
        updatedAlternatives[activeAltIdx] = {
          ...updatedAlternatives[activeAltIdx],
          macro_path: updatedPath
        };
        roadmapToSave = { ...editedRoadmap, alternatives: updatedAlternatives };
      } else {
        const updatedPath = [...editedRoadmap.macro_path];
        updatedPath[mIdx] = tempMilestone;
        roadmapToSave = { ...editedRoadmap, macro_path: updatedPath };
      }
      setEditedRoadmap(roadmapToSave);
    }
    await saveRoadmapUpdate(roadmapToSave);
  }

  function addMarketItem(mIdx, marketKey) {
    const emptyFns = { macro_free: emptyMacroFree, micro_structured: emptyMicroStructured, nano_expert: emptyNanoExpert };
    if (editingMilestoneIdx === mIdx) {
      setTempMilestone(prev => {
        const copy = JSON.parse(JSON.stringify(prev));
        copy.marketplace[marketKey].push(emptyFns[marketKey]());
        return copy;
      });
    } else {
      const updated = JSON.parse(JSON.stringify(editedRoadmap));
      if (updated.alternatives) {
        updated.alternatives[activeAltIdx].macro_path[mIdx].marketplace[marketKey].push(emptyFns[marketKey]());
      } else {
        updated.macro_path[mIdx].marketplace[marketKey].push(emptyFns[marketKey]());
      }
      setEditedRoadmap(updated);
    }
  }

  async function deleteMarketItem(mIdx, marketKey, rIdx) {
    setConfirmModal({
      message: "Delete this marketplace resource? This cannot be undone.",
      onConfirm: async () => {
        setConfirmModal(null);
        if (editingMilestoneIdx === mIdx) {
          setTempMilestone(prev => {
            const copy = JSON.parse(JSON.stringify(prev));
            copy.marketplace[marketKey].splice(rIdx, 1);
            return copy;
          });
        } else {
          const updated = JSON.parse(JSON.stringify(editedRoadmap));
          if (updated.alternatives) {
            updated.alternatives[activeAltIdx].macro_path[mIdx].marketplace[marketKey].splice(rIdx, 1);
          } else {
            updated.macro_path[mIdx].marketplace[marketKey].splice(rIdx, 1);
          }
          if (await saveRoadmapUpdate(updated)) setEditedRoadmap(updated);
        }
      }
    });
  }

  // ── Publish / reject ──────────────────────────────────────────────────
  async function submitReview(statusToSet = STATUS.published) {
    if (!selectedPath || !editedRoadmap) return;
    setLoadingSubmit(true); setError("");
    try {
      let roadmapDataToSubmit = editedRoadmap;
      if (statusToSet === STATUS.published) {
        roadmapDataToSubmit = editedRoadmap.alternatives
          ? editedRoadmap.alternatives[activeAltIdx]
          : editedRoadmap;
      }
      const res = await fetch(`${API}/api/paths/${selectedPath.id}`, {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roadmap_data: roadmapDataToSubmit, status: statusToSet })
      });
      if (!res.ok) throw new Error("Failed to update");
      flash(`Roadmap marked as ${statusToSet.toUpperCase()}!`);
      setSelectedPath(null); setEditedRoadmap(null); loadQueue();
    } catch (e) { setError(e.message); }
    finally { setLoadingSubmit(false); }
  }



  // ── Filtered queue ────────────────────────────────────────────────────
  const displayedPaths = pathsQueue.filter(p => p.status === filterStatus);
  const filteredPaths  = displayedPaths.filter(p => {
    const q = searchQuery.toLowerCase();
    return p.target_goal?.toLowerCase().includes(q) || p.current_position?.toLowerCase().includes(q)
      || p.profile?.email?.toLowerCase().includes(q) || p.profile?.name?.toLowerCase().includes(q);
  });

  const isReadOnly = selectedPath?.status === "published";

  // ── Render helpers ────────────────────────────────────────────────────
  const COL_DEFS = [
    { key: "macro", viewKey: "macro_view", label: "Macro View", sublabel: "High Level Outcome", colorClass: "macro", marketKey: "macro_free",      marketLabel: "Free / Community Resources" },
    { key: "micro", viewKey: "micro_view", label: "Micro View", sublabel: "Execution Output",   colorClass: "micro", marketKey: "micro_structured", marketLabel: "Structured / Paid Courses" },
    { key: "nano",  viewKey: "nano_view",  label: "Nano View",  sublabel: "Mentor Guidance",     colorClass: "nano",  marketKey: "nano_expert",      marketLabel: "Expert Mentors & Counselors" }
  ];

  // ── Market cards are ALWAYS editable — no card-edit toggle needed ─────
  // Fields are always input mode. Admin just fills them in and clicks
  // "Save Marketplace Changes" at the bottom of the panel.
  function renderMarketCard(col, res, rIdx, mIdx) {
    const marketKey = col.marketKey;

    return (
      <div key={rIdx} className={`market-card ${col.colorClass}`}>

        {/* Card header: name input + delete button */}
        <div className="market-card-head">
          <input
            className="market-name-input"
            placeholder="Resource / Provider name"
            value={res.name || ""}
            onChange={e => updateMarketItem(mIdx, marketKey, rIdx, "name", e.target.value)}
          />
          {!isReadOnly && (
            <button className="btn-icon-danger" title="Delete resource"
              onClick={() => deleteMarketItem(mIdx, marketKey, rIdx)}>
              <TrashIcon size={13} />
            </button>
          )}
        </div>

        {/* ── macro_free ── */}
        {col.key === "macro" && (
          <>
            <div className="market-row2">
              <input placeholder="Type  (e.g. Video, Article)" value={res.type || ""}
                onChange={e => updateMarketItem(mIdx, marketKey, rIdx, "type", e.target.value)} />
              <input placeholder="Next Step" value={res.next_step || ""}
                onChange={e => updateMarketItem(mIdx, marketKey, rIdx, "next_step", e.target.value)} />
            </div>
            <textarea rows={2} placeholder="Why is this resource useful?"
              value={res.why || ""}
              onChange={e => updateMarketItem(mIdx, marketKey, rIdx, "why", e.target.value)} />
          </>
        )}

        {/* ── micro_structured ── */}
        {col.key === "micro" && (
          <>
            <div className="market-row3">
              <input placeholder="Type  (e.g. Course, Book)" value={res.type || ""}
                onChange={e => updateMarketItem(mIdx, marketKey, rIdx, "type", e.target.value)} />
              <input placeholder="Cost  (e.g. $15)" value={res.cost || ""}
                onChange={e => updateMarketItem(mIdx, marketKey, rIdx, "cost", e.target.value)} />
              <input placeholder="Duration  (e.g. 12 hrs)" value={res.duration || ""}
                onChange={e => updateMarketItem(mIdx, marketKey, rIdx, "duration", e.target.value)} />
            </div>
            <textarea rows={2} placeholder="Value proposition / what you'll gain"
              value={res.value || ""}
              onChange={e => updateMarketItem(mIdx, marketKey, rIdx, "value", e.target.value)} />
            <input placeholder="Next Step  (e.g. Enroll on Udemy)" value={res.next_step || ""}
              onChange={e => updateMarketItem(mIdx, marketKey, rIdx, "next_step", e.target.value)} />
          </>
        )}

        {/* ── nano_expert ── */}
        {col.key === "nano" && (
          <>
            <div className="market-row2">
              <input placeholder="Type  (e.g. Mentor, Counselor)" value={res.type || ""}
                onChange={e => updateMarketItem(mIdx, marketKey, rIdx, "type", e.target.value)} />
              <input placeholder="Price  (e.g. ₹500/session)" value={res.price || ""}
                onChange={e => updateMarketItem(mIdx, marketKey, rIdx, "price", e.target.value)} />
            </div>
            <textarea rows={2} placeholder="Expected outcomes from mentorship"
              value={res.expected_outcomes || ""}
              onChange={e => updateMarketItem(mIdx, marketKey, rIdx, "expected_outcomes", e.target.value)} />
            <input placeholder="Session format / details" value={res.session_details || ""}
              onChange={e => updateMarketItem(mIdx, marketKey, rIdx, "session_details", e.target.value)} />
          </>
        )}
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════════════
  return (
    <div className="page ar-page">

      {confirmModal && (
        <ConfirmModal message={confirmModal.message} onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(null)} />
      )}

      {/* ─── QUEUE VIEW ─────────────────────────────────────────────── */}
      {!selectedPath ? (
        <div className="ar-queue-container">
          <div className="ar-header">
            <div>
              <div className="pill pill-teal" style={{ marginBottom: 12 }}>Human in the Loop</div>
              <h1 className="display-title" style={{ fontSize: 27 }}>Admin Review Curation</h1>
              <p className="ar-header-sub">Inspect AI-generated career paths, refine milestones, calibrate resources, and publish them to students.</p>
            </div>
          </div>

          {successMsg && (
            <div className="ar-success-alert card"><span className="success-dot" /><span>{successMsg}</span></div>
          )}

          <div className="ar-filters-bar card">
            <div className="ar-search-input-wrapper">
              <IconSearch size={16} />
              <input type="text" placeholder="Search by student, goal, or position..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
            </div>
            <div className="ar-status-filters">
              <button className={`filter-btn ${filterStatus === "under_admin_review" ? "active" : ""}`} onClick={() => setFilterStatus("under_admin_review")}>
                Pending ({pathsQueue.filter(p => p.status === "under_admin_review").length})
              </button>
              <button className={`filter-btn ${filterStatus === "published" ? "active" : ""}`} onClick={() => setFilterStatus("published")}>
                Published ({pathsQueue.filter(p => p.status === "published").length})
              </button>
            </div>
          </div>

          {loadingQueue ? (
            <div className="ar-loading-state card">
              <div className="dot-pulse"><span /><span /><span /></div>
              <p>Loading database records...</p>
            </div>
          ) : error ? (
            <div className="ar-error-card card">
              <IconAlert size={28} /><p>{error}</p>
              <button className="btn-primary" onClick={loadQueue} style={{ marginTop: 12 }}>Retry Connection</button>
            </div>
          ) : filteredPaths.length === 0 ? (
            <div className="ar-empty-state card">
              <IconNavigation size={36} /><h3>No career paths found</h3>
              <p>Generate a career roadmap from the dashboard to populate the queue.</p>
            </div>
          ) : (
            <div className="ar-queue-grid">
              {filteredPaths.map(path => {
                const dateStr = path.created_at ? new Date(path.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "Just now";
                return (
                  <div key={path.id} className={`ar-queue-card card status-${path.status}`}>
                    <div className="ar-q-top">
                      <div className="ar-q-student">
                        <IconNavigation size={14} style={{ color: "var(--accent)" }} />
                        <div className="ar-q-student-info">
                          <strong>{path.status === "published" ? "Published Pathway" : "Pathway Curation"}</strong>
                          <span className="ar-q-date">{dateStr}</span>
                        </div>
                      </div>
                      <button className="btn-pdf-pill" onClick={() => handleExportPdf(path)} disabled={pdfLoading}>
                        {pdfLoading ? "..." : <><ExportIcon size={12} /><span>PDF</span></>}
                      </button>
                    </div>
                    <div className="ar-q-route">
                      <div className="ar-q-point"><span className="q-dot green" /><span>{path.current_position}</span></div>
                      <div className="ar-q-spine" />
                      <div className="ar-q-point"><span className="q-dot red" /><strong>{path.target_goal}</strong></div>
                    </div>
                    <div className="ar-q-meta">
                      <div className="meta-item"><span>Grade</span><span>{path.profile?.grade || "N/A"}</span></div>
                      <div className="meta-item"><span>Board</span><span>{path.profile?.curriculum || "N/A"}</span></div>
                      <div className="meta-item">
                        <span>Readiness</span>
                        <strong className="green-text">
                          {path.roadmap_data?.alternatives
                            ? `${path.roadmap_data.alternatives[0]?.readiness_score || 0}%`
                            : `${path.roadmap_data?.readiness_score || 0}%`}
                        </strong>
                      </div>
                      <div className="meta-item">
                        <span>Duration</span>
                        <span>
                          {path.roadmap_data?.alternatives
                            ? path.roadmap_data.alternatives[0]?.total_duration
                            : path.roadmap_data?.total_duration}
                        </span>
                      </div>
                    </div>
                    <button className="ar-q-btn" onClick={() => selectPathForReview(path)}>
                      {path.status === "published" ? "View Published →" : "Audit & Curate →"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      ) : (
        /* ─── EDITOR VIEW ─────────────────────────────────────────── */
        <div className="ar-editor-container">

          {/* Header */}
          <div className="ar-editor-header">
            <button className="btn-back" onClick={() => { setSelectedPath(null); setEditedRoadmap(null); }}>
              <IconArrowLeft size={16} /> Back to Queue
            </button>
            <div className="editor-title-row">
              <div>
                <h1>{isReadOnly ? "Viewing Pathway" : "Curating Pathway"}</h1>
                <p>{isReadOnly ? "Published & locked — read-only view." : "Edit milestones, views, and marketplace resources. All changes auto-save to database."}</p>
              </div>
              <div className="editor-title-actions">

                <button className="btn-pdf" onClick={() => handleExportPdf()} disabled={pdfLoading}>
                  {pdfLoading ? "Generating..." : <><ExportIcon size={14} /><span>Export PDF</span></>}
                </button>
              </div>
            </div>
          </div>

          {successMsg && (
            <div className="ar-success-alert card" style={{ marginBottom: 16 }}><span className="success-dot" /><span>{successMsg}</span></div>
          )}
          {error && (
            <div className="ar-error-inline"><IconAlert size={14} />{error}</div>
          )}

          {/* Alternatives selector tabs for Admin Review */}
          {editedRoadmap.alternatives && (
            <div className="ar-alt-tabs-container">
              <span className="ar-alt-tabs-label">Strategic Pathway Options</span>
              <div className="ar-alt-tabs">
                {editedRoadmap.alternatives.map((alt, idx) => (
                  <button
                    key={idx}
                    className={`ar-alt-tab-btn ${activeAltIdx === idx ? 'active' : ''}`}
                    onClick={() => {
                      setActiveAltIdx(idx);
                      // Clear editing state when switching tabs
                      setEditingDetails(false);
                      setEditingMilestoneIdx(null);
                      setTempMilestone(null);
                    }}
                  >
                    <span className="tab-dot" />
                    {alt.option_name || `Option ${idx + 1}`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Global Metrics ─────────────────────────────────────── */}
          <div className="ar-editor-stats-card card">
            <div className="stats-card-header">
              <div className="section-label" style={{ marginBottom: 0 }}>Global Metrics</div>
              {!isReadOnly && !editingDetails && (
                <button className="btn-edit-section" onClick={startEditDetails}><EditIcon size={13} /> Edit Details</button>
              )}
            </div>

            {!editingDetails ? (
              <div className="stats-read-grid">
                <div className="stat-read-item span-2">
                  <span>Pathway Title</span>
                  <strong>{activeRoadmap.path_title || `Pathway to ${selectedPath.target_goal}`}</strong>
                </div>
                <div className="stat-read-item span-2">
                  <span>Description</span>
                  <p className="stat-desc">{activeRoadmap.path_description || "No description."}</p>
                </div>
                <div className="stat-read-item">
                  <span>Readiness Score</span>
                  <strong className="green-text">{activeRoadmap.readiness_score}%</strong>
                </div>
                <div className="stat-read-item">
                  <span>Readiness Label</span>
                  <span>{activeRoadmap.readiness_label}</span>
                </div>
                <div className="stat-read-item">
                  <span>Total Duration</span>
                  <span>{activeRoadmap.total_duration}</span>
                </div>
              </div>
            ) : (
              <div className="stats-edit-form">
                <div className="edit-row-2">
                  <div className="stat-edit-field">
                    <label>Pathway Title</label>
                    <input type="text" value={tempDetails.path_title} onChange={e => setTempDetails(p => ({ ...p, path_title: e.target.value }))} placeholder="e.g. Academic Pathway to Oxford" />
                  </div>
                  <div className="stat-edit-field">
                    <label>Pathway Description</label>
                    <textarea rows={2} value={tempDetails.path_description} onChange={e => setTempDetails(p => ({ ...p, path_description: e.target.value }))} />
                  </div>
                </div>
                <div className="edit-row-3">
                  <div className="stat-edit-field">
                    <label>Readiness Score (0–100)</label>
                    <input type="number" min="0" max="100" value={tempDetails.readiness_score} onChange={e => setTempDetails(p => ({ ...p, readiness_score: parseInt(e.target.value) || 0 }))} />
                  </div>
                  <div className="stat-edit-field">
                    <label>Readiness Label</label>
                    <input type="text" value={tempDetails.readiness_label} onChange={e => setTempDetails(p => ({ ...p, readiness_label: e.target.value }))} />
                  </div>
                  <div className="stat-edit-field">
                    <label>Total Duration</label>
                    <input type="text" value={tempDetails.total_duration} onChange={e => setTempDetails(p => ({ ...p, total_duration: e.target.value }))} />
                  </div>
                </div>
                <div className="form-action-row">
                  <button className="btn-cancel-section" onClick={() => setEditingDetails(false)}>Cancel</button>
                  <button className="btn-save-section" onClick={saveDetails} disabled={loadingSubmit}>
                    {loadingSubmit ? "Saving..." : "Save Details"}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ── Milestones ─────────────────────────────────────────── */}
          <div className="ar-milestones-editor-list">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div className="section-label" style={{ margin: 0 }}>Milestones & Resources</div>
              {!isReadOnly && (
                <button className="btn-add-step" onClick={addMilestone} disabled={loadingSubmit}>
                  <PlusIcon size={14} /> Add New Step
                </button>
              )}
            </div>

            {activeRoadmap.macro_path?.map((milestone, mIdx) => {
              const isEditing    = editingMilestoneIdx === mIdx;
              const activeMilestone = isEditing ? tempMilestone : milestone;

              return (
                <div key={milestone.id} className={`ar-editor-milestone-card card ${isEditing ? "editing" : ""}`}>

                  {/* Milestone Header */}
                  <div className="m-header">
                    <div className="m-number">{milestone.id}</div>

                    {!isEditing ? (
                      <div className="m-title-view">
                        <div className="m-title-row-view">
                          <h2>{milestone.title || <em className="placeholder-text">Untitled Step</em>}</h2>
                          <span className="m-dur-badge">{milestone.duration}</span>
                        </div>
                        <p className="m-desc-text">{milestone.description}</p>
                      </div>
                    ) : (
                      <div className="m-title-fields">
                        <div className="m-title-input-row">
                          <input className="m-title-input" placeholder="Step Title" value={activeMilestone.title} onChange={e => handleTempMilestoneChange("title", e.target.value)} />
                          <input className="m-duration-input" placeholder="e.g. Months 1–3" value={activeMilestone.duration} onChange={e => handleTempMilestoneChange("duration", e.target.value)} />
                        </div>
                        <textarea className="m-desc-input" rows={2} placeholder="Step description..." value={activeMilestone.description} onChange={e => handleTempMilestoneChange("description", e.target.value)} />
                      </div>
                    )}

                    {!isReadOnly && (
                      <div className="m-header-actions">
                        {!isEditing ? (
                          <>
                            <button className="btn-edit-section" onClick={() => startEditMilestone(mIdx)}><EditIcon size={13} /> Edit</button>
                            <button className="btn-icon-danger" title="Delete step" onClick={() => confirmDeleteMilestone(mIdx)}><TrashIcon size={14} /></button>
                          </>
                        ) : null}
                      </div>
                    )}
                  </div>

                  {/* 3 View Columns */}
                  <div className="milestone-views-columns">
                    {COL_DEFS.map(col => {
                      const isExp = expandedMarkets[`${milestone.id}_${col.key}`];
                      const count = activeMilestone.marketplace?.[col.marketKey]?.length || 0;
                      return (
                        <div key={col.key} className={`view-column ${col.colorClass}`}>
                          <div className="view-desc-box">
                            <span className="view-lbl">{col.label}</span>
                            <span className="view-sublbl">{col.sublabel}</span>
                            {isEditing ? (
                              <textarea value={activeMilestone[col.viewKey] || ""} onChange={e => handleTempMilestoneChange(col.viewKey, e.target.value)} rows={4} placeholder={`${col.label} description...`} />
                            ) : (
                              <p className="view-read-text">{activeMilestone[col.viewKey] || "No description."}</p>
                            )}
                          </div>
                          <button
                            className={`btn-toggle-marketplace ${col.colorClass} ${isExp ? "expanded" : ""}`}
                            onClick={() => toggleMarketplace(milestone.id, col.key)}
                          >
                            <span>{isExp ? "Hide" : `Resources (${count})`}</span>
                            <ChevronDown size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>

                  {/* Marketplace panels */}
                  {COL_DEFS.map(col => {
                    const isExp = expandedMarkets[`${milestone.id}_${col.key}`];
                    if (!isExp) return null;
                    const items = activeMilestone.marketplace?.[col.marketKey] || [];
                    return (
                      <div key={col.key} className={`marketplace-panel ${col.colorClass}`}>
                        <div className="marketplace-panel-head">
                          <span className={`market-panel-title ${col.colorClass}`}>{col.marketLabel}</span>
                          {!isReadOnly && (
                            <button className={`btn-add-resource ${col.colorClass}`} onClick={() => addMarketItem(mIdx, col.marketKey)}>
                              <PlusIcon size={12} /> Add Resource
                            </button>
                          )}
                        </div>
                        <div className="market-cards-grid">
                          {items.map((res, rIdx) => renderMarketCard(col, res, rIdx, mIdx))}
                          {items.length === 0 && (
                            <div className="no-resources-msg">No resources yet. Click "+ Add Resource" to create one.</div>
                          )}
                        </div>
                        {/* Save — always visible when there are items, regardless of step edit mode */}
                        {!isReadOnly && items.length > 0 && (
                          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
                            <button className="btn-save-section" onClick={() => saveMarketItemDirect(mIdx)} disabled={loadingSubmit}>
                              {loadingSubmit ? "Saving..." : "Save Marketplace Changes"}
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Step edit action row */}
                  {isEditing && (
                    <div className="step-edit-actions">
                      <button className="btn-cancel-section" onClick={cancelEditMilestone}>Cancel</button>
                      <button className="btn-save-section" onClick={() => saveMilestone(mIdx)} disabled={loadingSubmit}>
                        {loadingSubmit ? "Saving..." : "Save Step"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Empty state for milestones */}
            {(!activeRoadmap.macro_path || activeRoadmap.macro_path.length === 0) && (
              <div className="ar-empty-state card" style={{ padding: 32 }}>
                <p style={{ color: "var(--text3)" }}>No milestones yet. Click "Add New Step" to create the first one.</p>
              </div>
            )}
          </div>

          {/* ── Action Row ─────────────────────────────────────────── */}
          <div className="editor-action-card card">
            {isReadOnly ? (
              <div className="editor-submit-box">
                <h3>Published & Locked</h3>
                <p>This roadmap has been published to the student portal. Return to the queue below.</p>
                <div className="editor-submit-btns">
                  <button className="btn-primary" onClick={() => setSelectedPath(null)}>← Return to Queue</button>
                </div>
              </div>
            ) : (
              <div className="editor-submit-box">
                <h3>Approve Curation</h3>
                <p>Publishing marks this path as officially published. It unlocks immediately in the student's dashboard.</p>
                <div className="editor-submit-btns">
                  <button className="btn-secondary" onClick={() => setSelectedPath(null)} disabled={loadingSubmit}>Close & Return</button>
                  <button className="btn-primary approve-btn" onClick={() => submitReview(STATUS.published)} disabled={loadingSubmit}>
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
