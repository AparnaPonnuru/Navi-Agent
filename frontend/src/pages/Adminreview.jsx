import { useState } from "react";
import { IconCheck, IconAlert, IconArrowLeft, IconUser, IconMap, IconTarget, IconPin } from "./Icons";

const STATUS = { pending: "pending", approved: "approved", rejected: "rejected" };

export default function AdminReview({ pathData, userInput, profile, onBack }) {
  const [stepStatuses, setStepStatuses]   = useState({});
  const [overallStatus, setOverallStatus] = useState(STATUS.pending);
  const [notes, setNotes]                 = useState({});
  const [submitted, setSubmitted]         = useState(false);
  const [globalNote, setGlobalNote]       = useState("");

  if (!pathData) {
    return (
      <div className="page">
        <div className="ar-empty card">
          <IconAlert size={32} />
          <div>
            <h3>No path to review</h3>
            <p>Generate a path from the Dashboard first.</p>
          </div>
          <button className="btn-ghost" onClick={onBack}><IconArrowLeft size={15} /> Back</button>
        </div>
      </div>
    );
  }

  const steps = pathData.macro_path || [];

  function setStepStatus(id, status) {
    setStepStatuses(prev => ({ ...prev, [id]: status }));
  }
  function setStepNote(id, note) {
    setNotes(prev => ({ ...prev, [id]: note }));
  }

  function handleSubmit() {
    setSubmitted(true);
  }

  const approvedCount = Object.values(stepStatuses).filter(s => s === STATUS.approved).length;
  const rejectedCount = Object.values(stepStatuses).filter(s => s === STATUS.rejected).length;
  const pendingCount  = steps.length - approvedCount - rejectedCount;

  if (submitted) {
    return (
      <div className="page">
        <div className="ar-success card">
          <div className="ar-success-icon">
            <IconCheck size={32} />
          </div>
          <h2 className="ar-success-title">Review Submitted</h2>
          <p className="ar-success-sub">
            The path has been marked as <strong>{overallStatus}</strong> with {approvedCount} steps approved, {rejectedCount} rejected, and {pendingCount} pending.
          </p>
          <div className="ar-success-meta">
            <div className="ar-meta-row"><span>Student</span><strong>{profile?.name || userInput.current}</strong></div>
            <div className="ar-meta-row"><span>Goal</span><strong>{userInput.goal}</strong></div>
            <div className="ar-meta-row"><span>Decision</span>
              <strong className={`ar-status-badge ar-status-${overallStatus}`}>{overallStatus}</strong>
            </div>
          </div>
          {globalNote && (
            <div className="ar-note-preview">
              <div className="ar-note-preview-label">Admin notes</div>
              <p>{globalNote}</p>
            </div>
          )}
          <button className="btn-ghost" onClick={onBack} style={{ marginTop: 8 }}>
            <IconArrowLeft size={15} /> Back to Dashboard
          </button>
        </div>

        <style>{`${sharedStyles}`}</style>
      </div>
    );
  }

  return (
    <div className="page ar-page">

      {/* Header */}
      <div className="ar-header">
        <div>
          <div className="pill pill-amber" style={{ marginBottom: 12 }}>Admin Review</div>
          <h1 className="display-title" style={{ fontSize: 28 }}>Review Generated Path</h1>
          <p className="ar-header-sub">
            Review each step and approve or flag for revision before the path is shown to the student.
          </p>
        </div>
        <div className="ar-header-stats">
          <div className="ar-stat-card ar-stat-green">
            <span className="ar-stat-val">{approvedCount}</span>
            <span className="ar-stat-lbl">Approved</span>
          </div>
          <div className="ar-stat-card ar-stat-red">
            <span className="ar-stat-val">{rejectedCount}</span>
            <span className="ar-stat-lbl">Rejected</span>
          </div>
          <div className="ar-stat-card ar-stat-gray">
            <span className="ar-stat-val">{pendingCount}</span>
            <span className="ar-stat-lbl">Pending</span>
          </div>
        </div>
      </div>

      {/* Route summary */}
      <div className="ar-route-card card">
        <div className="ar-route-row">
          <div className="ar-route-point">
            <div className="ar-route-dot green" />
            <div>
              <div className="ar-route-label">Current</div>
              <div className="ar-route-val">{userInput.current}</div>
            </div>
          </div>
          <div className="ar-route-arrow">→</div>
          <div className="ar-route-point">
            <div className="ar-route-dot red" />
            <div>
              <div className="ar-route-label">Goal</div>
              <div className="ar-route-val">{userInput.goal}</div>
            </div>
          </div>
          <div className="ar-route-meta">
            <span className="pill pill-teal">{pathData.readiness_label}</span>
            <span className="pill pill-blue">{pathData.total_duration}</span>
          </div>
        </div>
      </div>

      {/* Step-by-step review */}
      <div className="ar-steps-section">
        <div className="section-label">Step-by-step review</div>

        {steps.map((step, i) => {
          const status = stepStatuses[step.id] || STATUS.pending;
          return (
            <div key={step.id} className={`ar-step-card card ar-step-${status}`}>
              <div className="ar-step-top">
                <div className="ar-step-num">{step.id}</div>
                <div className="ar-step-info">
                  <div className="ar-step-title">{step.title}</div>
                  <div className="ar-step-dur">{step.duration}</div>
                </div>
                <div className="ar-step-actions">
                  <button 
                    className={`ar-action-btn ar-approve ${status === STATUS.approved ? "active" : ""}`}
                    onClick={() => setStepStatus(step.id, STATUS.approved)}
                  >
                    <IconCheck size={14} /> Approve
                  </button>
                  <button
                    className={`ar-action-btn ar-reject ${status === STATUS.rejected ? "active" : ""}`}
                    onClick={() => setStepStatus(step.id, STATUS.rejected)}
                  >
                    <IconAlert size={14} /> Flag
                  </button>
                </div>
              </div>

              <p className="ar-step-desc">{step.description}</p>

              {/* Views summary */}
              <div className="ar-views-row">
                {step.macro_view && (
                  <div className="ar-view-chip ar-view-macro">
                    <span>Macro</span>
                    <p>{step.macro_view}</p>
                  </div>
                )}
                {step.micro_view && (
                  <div className="ar-view-chip ar-view-micro">
                    <span>Micro</span>
                    <p>{step.micro_view}</p>
                  </div>
                )}
                {step.nano_view && (
                  <div className="ar-view-chip ar-view-nano">
                    <span>Nano</span>
                    <p>{step.nano_view}</p>
                  </div>
                )}
              </div>

              {/* Note input */}
              <div className="ar-note-row">
                <input
                  className="ar-note-input"
                  placeholder="Add a note for this step (optional)..."
                  value={notes[step.id] || ""}
                  onChange={e => setStepNote(step.id, e.target.value)}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Overall decision */}
      <div className="ar-decision-card card">
        <div className="section-label">Overall decision</div>
        <div className="ar-decision-btns">
          {[STATUS.approved, STATUS.pending, STATUS.rejected].map(s => (
            <button
              key={s}
              className={`ar-decision-btn ar-decision-${s} ${overallStatus === s ? "active" : ""}`}
              onClick={() => setOverallStatus(s)}
            >
              {s === STATUS.approved ? <IconCheck size={15} /> : <IconAlert size={15} />}
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <textarea
          className="ar-global-note"
          rows={3}
          placeholder="Overall notes for this path (visible to the team)..."
          value={globalNote}
          onChange={e => setGlobalNote(e.target.value)}
        />

        <div className="ar-submit-row">
          <button className="btn-ghost" onClick={onBack}>
            <IconArrowLeft size={15} /> Cancel
          </button>
          <button className="btn-primary ar-submit-btn" onClick={handleSubmit}>
            <IconCheck size={16} /> Submit Review
          </button>
        </div>
      </div>

      <style>{`${sharedStyles}`}</style>
    </div>
  );
}

const sharedStyles = `
  .ar-page { max-width: 900px; }

  .ar-header {
    display: flex; align-items: flex-start; justify-content: space-between;
    gap: 24px; flex-wrap: wrap; margin-bottom: 24px;
  }
  .ar-header-sub { font-size: 14px; color: var(--text2); margin-top: 8px; line-height: 1.6; max-width: 500px; }
  .ar-header-stats { display: flex; gap: 10px; flex-shrink: 0; }
  .ar-stat-card {
    display: flex; flex-direction: column; align-items: center;
    padding: 12px 18px; border-radius: 12px; min-width: 72px;
    border: 1px solid var(--border);
  }
  .ar-stat-val { font-family: var(--font-display); font-size: 26px; line-height: 1; }
  .ar-stat-lbl { font-size: 11px; color: var(--text3); margin-top: 3px; text-transform: uppercase; letter-spacing: 0.06em; }
  .ar-stat-green { background: var(--green-soft); }
  .ar-stat-green .ar-stat-val { color: var(--green); }
  .ar-stat-red   { background: var(--red-soft); }
  .ar-stat-red .ar-stat-val   { color: var(--red); }
  .ar-stat-gray  { background: var(--bg3); }
  .ar-stat-gray .ar-stat-val  { color: var(--text2); }

  .ar-route-card { padding: 18px 22px; margin-bottom: 24px; }
  .ar-route-row  { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
  .ar-route-point{ display: flex; align-items: flex-start; gap: 10px; flex: 1; min-width: 140px; }
  .ar-route-dot  { width: 12px; height: 12px; border-radius: 50%; flex-shrink: 0; margin-top: 3px; }
  .ar-route-dot.green { background: var(--green); }
  .ar-route-dot.red   { background: var(--red); }
  .ar-route-label{ font-size: 10px; color: var(--text3); text-transform: uppercase; letter-spacing: 0.07em; font-weight: 700; }
  .ar-route-val  { font-size: 13px; font-weight: 600; color: var(--text); margin-top: 2px; }
  .ar-route-arrow{ font-size: 20px; color: var(--text3); flex-shrink: 0; }
  .ar-route-meta { display: flex; gap: 8px; flex-wrap: wrap; }

  .ar-steps-section { margin-bottom: 28px; }

  .ar-step-card  { padding: 20px; margin-bottom: 14px; border-left: 4px solid var(--border); transition: all 0.2s; }
  .ar-step-approved { border-left-color: var(--green); background: linear-gradient(135deg, rgba(52,168,83,0.04), #fff); }
  .ar-step-rejected { border-left-color: var(--red);   background: linear-gradient(135deg, rgba(232,49,42,0.04), #fff); }
  .ar-step-pending  { border-left-color: var(--border); }

  .ar-step-top {
    display: flex; align-items: flex-start; gap: 14px; margin-bottom: 10px; flex-wrap: wrap;
  }
  .ar-step-num {
    width: 30px; height: 30px; border-radius: 50%;
    background: var(--bg3); color: var(--text2);
    font-size: 13px; font-weight: 700;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  }
  .ar-step-info  { flex: 1; }
  .ar-step-title { font-size: 15px; font-weight: 600; color: var(--text); }
  .ar-step-dur   { font-size: 12px; color: var(--text3); margin-top: 2px; }
  .ar-step-desc  { font-size: 13px; color: var(--text2); line-height: 1.6; margin-bottom: 12px; }

  .ar-step-actions { display: flex; gap: 8px; flex-shrink: 0; }
  .ar-action-btn {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 7px 14px; border-radius: 8px;
    font-family: var(--font-body); font-size: 12px; font-weight: 600;
    cursor: pointer; border: 1.5px solid var(--border);
    background: #fff; color: var(--text2); transition: all 0.18s;
  }
  .ar-approve:hover, .ar-approve.active { background: var(--green-soft); border-color: var(--green); color: var(--green); }
  .ar-reject:hover,  .ar-reject.active  { background: var(--red-soft);   border-color: var(--red);   color: var(--red); }

  .ar-views-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 10px; margin-bottom: 12px; }
  .ar-view-chip { padding: 10px 12px; border-radius: 10px; border: 1px solid var(--border); }
  .ar-view-chip span { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; }
  .ar-view-chip p    { font-size: 12px; color: var(--text2); margin-top: 4px; line-height: 1.5; }
  .ar-view-macro { background: var(--green-soft); }
  .ar-view-macro span { color: var(--accent2); }
  .ar-view-micro { background: var(--blue-soft); }
  .ar-view-micro span { color: var(--blue); }
  .ar-view-nano  { background: var(--red-soft); }
  .ar-view-nano span  { color: var(--red); }

  .ar-note-row { margin-top: 8px; }
  .ar-note-input {
    width: 100%; padding: 9px 12px;
    border: 1px solid var(--border); border-radius: 8px;
    background: var(--bg); color: var(--text);
    font-family: var(--font-body); font-size: 13px; outline: none;
    transition: border-color 0.2s;
  }
  .ar-note-input:focus { border-color: var(--blue); }
  .ar-note-input::placeholder { color: var(--text3); }

  .ar-decision-card { padding: 24px; }
  .ar-decision-btns { display: flex; gap: 10px; flex-wrap: wrap; margin: 12px 0 18px; }
  .ar-decision-btn {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 10px 20px; border-radius: 10px;
    font-family: var(--font-body); font-size: 14px; font-weight: 600;
    cursor: pointer; border: 1.5px solid var(--border);
    background: #fff; color: var(--text2); transition: all 0.2s; flex: 1;
    justify-content: center;
  }
  .ar-decision-approved:hover, .ar-decision-approved.active { background: var(--green-soft); border-color: var(--green); color: var(--green); }
  .ar-decision-rejected:hover, .ar-decision-rejected.active { background: var(--red-soft);   border-color: var(--red);   color: var(--red); }
  .ar-decision-pending:hover,  .ar-decision-pending.active  { background: var(--yellow-soft); border-color: var(--yellow); color: #8A6000; }

  .ar-global-note {
    width: 100%; padding: 12px 14px;
    border: 1.5px solid var(--border); border-radius: 10px;
    background: var(--bg); color: var(--text);
    font-family: var(--font-body); font-size: 14px; resize: none; outline: none;
    transition: border-color 0.2s;
  }
  .ar-global-note:focus { border-color: var(--blue); }

  .ar-submit-row {
    display: flex; align-items: center; justify-content: space-between;
    margin-top: 18px; flex-wrap: wrap; gap: 12px;
  }
  .ar-submit-btn { padding: 12px 28px; font-size: 15px; }

  /* Success screen */
  .ar-success {
    display: flex; flex-direction: column; align-items: center;
    text-align: center; padding: 48px 36px; gap: 16px; max-width: 520px; margin: 40px auto;
  }
  .ar-success-icon {
    width: 64px; height: 64px; border-radius: 50%;
    background: var(--green-soft); color: var(--green);
    display: flex; align-items: center; justify-content: center;
  }
  .ar-success-title { font-family: var(--font-display); font-size: 26px; color: var(--text); }
  .ar-success-sub   { font-size: 14px; color: var(--text2); line-height: 1.7; }
  .ar-success-meta  { width: 100%; display: flex; flex-direction: column; gap: 10px; }
  .ar-meta-row {
    display: flex; align-items: center; justify-content: space-between;
    padding: 10px 14px; background: var(--bg); border-radius: 8px; border: 1px solid var(--border);
    font-size: 13px;
  }
  .ar-meta-row span   { color: var(--text3); }
  .ar-meta-row strong { color: var(--text); }
  .ar-status-badge { padding: 3px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; }
  .ar-status-approved { background: var(--green-soft); color: var(--green); }
  .ar-status-rejected { background: var(--red-soft);   color: var(--red); }
  .ar-status-pending  { background: var(--yellow-soft); color: #8A6000; }
  .ar-note-preview { width: 100%; background: var(--bg3); border-radius: 10px; padding: 14px; text-align: left; }
  .ar-note-preview-label { font-size: 11px; font-weight: 700; color: var(--text3); text-transform: uppercase; margin-bottom: 6px; }
  .ar-note-preview p { font-size: 13px; color: var(--text2); line-height: 1.6; }

  .ar-empty {
    display: flex; align-items: center; gap: 16px; padding: 36px;
    color: var(--text2); max-width: 500px; margin: 40px auto;
  }
  .ar-empty svg { color: var(--amber); flex-shrink: 0; }
  .ar-empty h3  { margin-bottom: 4px; color: var(--text); font-size: 18px; }
  .ar-empty p   { font-size: 14px; color: var(--text2); margin-bottom: 12px; }
`;