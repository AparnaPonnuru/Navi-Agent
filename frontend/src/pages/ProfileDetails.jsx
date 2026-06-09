import { useState, useEffect } from "react";
import "./ProfileDetails.scss";
import { IconUser, IconCheck, IconArrowLeft } from "./Icons";

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:8000" : "");

export default function ProfileDetails({ profile, onProfileUpdated, onBack }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ text: "", type: "" });

    try {
      const payload = {
        ...profile,
        ...formData,
      };
      
      const res = await fetch(`${API}/api/profile`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to update profile signals");
      const saved = await res.json();
      
      if (onProfileUpdated) {
        onProfileUpdated(saved);
      }
      if (saved && saved.email) {
        localStorage.setItem(`nv_profile_${saved.email.toLowerCase()}`, JSON.stringify(saved));
      }
      
      setMessage({ text: "Profile details updated successfully!", type: "success" });
      setIsEditing(false);
    } catch (err) {
      setMessage({ text: err.message, type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = () => {
    if (profile?.name) {
      const parts = profile.name.split(" ");
      return parts.map(p => p[0]).join("").toUpperCase().slice(0, 2);
    }
    if (profile?.email) {
      return profile.email[0].toUpperCase();
    }
    return "ST";
  };

  // Helper to get formatted labels
  const getDisplayValue = (val) => {
    return val?.trim() || val || "Not provided";
  };

  return (
    <div className="profile-details-container">
      {/* Header Back Button */}
      <div className="profile-header-nav">
        <button className="nav-back-btn" onClick={onBack}>
          <IconArrowLeft size={16} /> Back to Dashboard
        </button>
      </div>

      <div className="profile-card-wrapper">
        {/* Banner with Profile Avatar */}
        <div className="profile-hero-banner">
          <div className="profile-avatar-circle">
            <span className="profile-avatar-initials">{getInitials()}</span>
          </div>
          <div className="profile-hero-info">
            <h2>{profile?.name || "Student Profile"}</h2>
            <p className="profile-hero-email">{profile?.email || "Academic Pathway Explorer"}</p>
            <div className="profile-badge-row">
             
              <span className="profile-badge badge-secondary">
                {profile?.grade || "Grade Pending"} • {profile?.curriculum || "Curriculum Pending"}
              </span>
            </div>
          </div>
        </div>

        {/* Message Banner */}
        {message.text && (
          <div className={`profile-message-alert ${message.type}`}>
            {message.type === "success" && <IconCheck size={16} />}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="profile-info-form">
          <div className="profile-form-grid">
            
            {/* Academic Section */}
            <div className="profile-section-card">
              <h3 className="profile-section-title">Academic Background</h3>
              
              <div className="profile-fields-list">
                <div className="profile-field-group">
                  <label>Grade Level</label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="profile-input"
                      value={formData.grade || ""}
                      onChange={e => setFormData({ ...formData, grade: e.target.value })}
                      placeholder="e.g. grade 12"
                      required
                    />
                  ) : (
                    <div className="profile-value-display">{getDisplayValue(profile?.grade)}</div>
                  )}
                </div>

                <div className="profile-field-group">
                  <label>Curriculum</label>
                  {isEditing ? (
                    <select
                      className="profile-select"
                      value={formData.curriculum || ""}
                      onChange={e => setFormData({ ...formData, curriculum: e.target.value })}
                    >
                      <option value="">Select Curriculum</option>
                      {["CBSE", "ICSE", "State Board", "IB", "IGCSE", "University", "Other"].map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="profile-value-display">{getDisplayValue(profile?.curriculum)}</div>
                  )}
                </div>

                <div className="profile-field-group">
                  <label>Academic Stream</label>
                  {isEditing ? (
                    <select
                      className="profile-select"
                      value={formData.stream || ""}
                      onChange={e => setFormData({ ...formData, stream: e.target.value })}
                    >
                      <option value="">Select Stream</option>
                      {["Science", "Commerce", "Arts", "Engineering", "Other"].map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="profile-value-display">{getDisplayValue(profile?.stream)}</div>
                  )}
                </div>

                <div className="profile-field-group">
                  <label>Current Performance</label>
                  {isEditing ? (
                    <select
                      className="profile-select"
                      value={formData.performance || ""}
                      onChange={e => setFormData({ ...formData, performance: e.target.value })}
                    >
                      <option value="">Select Performance</option>
                      {["Below 60%", "60%–74%", "75%–89%", "90% and above"].map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="profile-value-display">{getDisplayValue(profile?.performance)}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Persona & Location Section */}
            <div className="profile-section-card">
              <h3 className="profile-section-title">Personality & Geography</h3>

              <div className="profile-fields-list">
                <div className="profile-field-group">
                  <label>Student Personality Signal</label>
                  {isEditing ? (
                    <select
                      className="profile-select"
                      value={formData.personality || ""}
                      onChange={e => setFormData({ ...formData, personality: e.target.value })}
                    >
                      <option value="">Select Personality</option>
                      {[
                        "Introvert", 
                        "Extrovert", 
                        "Ambivert",
                        "Social — I thrive working with and helping people",
                        "Analytical — I prefer working with data and logic",
                        "Creative — I enjoy building and designing things"
                      ].map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="profile-value-display-wide">{getDisplayValue(profile?.personality)}</div>
                  )}
                </div>

                <div className="profile-field-row-2col">
                  <div className="profile-field-group">
                    <label>City</label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="profile-input"
                        value={formData.city || ""}
                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                        placeholder="e.g. warangal"
                      />
                    ) : (
                      <div className="profile-value-display">{getDisplayValue(profile?.city)}</div>
                    )}
                  </div>

                  <div className="profile-field-group">
                    <label>State</label>
                    {isEditing ? (
                      <input
                        type="text"
                        className="profile-input"
                        value={formData.state || ""}
                        onChange={e => setFormData({ ...formData, state: e.target.value })}
                        placeholder="e.g. Telangana"
                      />
                    ) : (
                      <div className="profile-value-display">{getDisplayValue(profile?.state)}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* Actions Bar */}
          <div className="profile-form-actions">
            {isEditing ? (
              <>
                <button
                  type="button"
                  className="profile-btn btn-cancel"
                  onClick={() => {
                    setFormData(profile);
                    setIsEditing(false);
                    setMessage({ text: "", type: "" });
                  }}
                  disabled={saving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="profile-btn btn-save"
                  disabled={saving}
                >
                  {saving ? "Saving Changes..." : "Save Changes"}
                </button>
              </>
            ) : (
              <button
                type="button"
                className="profile-btn btn-edit"
                onClick={() => setIsEditing(true)}
              >
                Edit Profile Signals
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
