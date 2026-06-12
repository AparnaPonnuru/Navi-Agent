import { useState, useEffect } from "react";
import "./ProfileDetails.scss";
import { IconUser, IconCheck, IconArrowLeft } from "./Icons";

const API = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:8000" : "");

export default function ProfileDetails({ profile, onProfileUpdated, onBack }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  // Location API states
  const [countriesList, setCountriesList] = useState([]);
  const [statesList, setStatesList] = useState([]);
  const [citiesList, setCitiesList] = useState([]);
  const [loadingCountries, setLoadingCountries] = useState(false);
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  const fetchCountries = async () => {
    setLoadingCountries(true);
    try {
      const res = await fetch("https://countriesnow.space/api/v0.1/countries/iso");
      const json = await res.json();
      if (!json.error) {
        const sorted = (json.data || []).sort((a, b) => a.name.localeCompare(b.name));
        setCountriesList(sorted);
      }
    } catch (err) {
      console.error("Failed to fetch countries", err);
    } finally {
      setLoadingCountries(false);
    }
  };

  const fetchStates = async (countryName) => {
    setLoadingStates(true);
    try {
      const res = await fetch("https://countriesnow.space/api/v0.1/countries/states", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: countryName })
      });
      const json = await res.json();
      if (!json.error) {
        const sorted = (json.data?.states || []).sort((a, b) => a.name.localeCompare(b.name));
        setStatesList(sorted);
      } else {
        setStatesList([]);
      }
    } catch (err) {
      console.error("Failed to fetch states", err);
      setStatesList([]);
    } finally {
      setLoadingStates(false);
    }
  };

  const fetchCities = async (countryName, stateName) => {
    setLoadingCities(true);
    try {
      const res = await fetch("https://countriesnow.space/api/v0.1/countries/state/cities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ country: countryName, state: stateName })
      });
      const json = await res.json();
      if (!json.error) {
        const sorted = (json.data || []).sort((a, b) => a.localeCompare(b));
        setCitiesList(sorted);
      } else {
        setCitiesList([]);
      }
    } catch (err) {
      console.error("Failed to fetch cities", err);
      setCitiesList([]);
    } finally {
      setLoadingCities(false);
    }
  };

  useEffect(() => {
    if (isEditing && countriesList.length === 0) {
      fetchCountries();
    }
  }, [isEditing]);

  useEffect(() => {
    if (isEditing && formData.country) {
      fetchStates(formData.country);
    } else {
      setStatesList([]);
      setCitiesList([]);
    }
  }, [formData.country, isEditing]);

  useEffect(() => {
    if (isEditing && formData.country && formData.state) {
      fetchCities(formData.country, formData.state);
    } else {
      setCitiesList([]);
    }
  }, [formData.state, formData.country, isEditing]);

  const handleCountryChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({
      ...prev,
      country: val,
      state: "",
      city: ""
    }));
  };

  const handleStateChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({
      ...prev,
      state: val,
      city: ""
    }));
  };

  const handleCityChange = (e) => {
    const val = e.target.value;
    setFormData(prev => ({
      ...prev,
      city: val
    }));
  };

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
    return "SS";
  };

  // Helper to get formatted labels
  const getDisplayValue = (val) => {
    return val?.trim() || val || "Not provided";
  };

  const handleReset = () => {
    setFormData({
      grade: "",
      curriculum: "",
      stream: "",
      school: "",
      performance: "",
      financialSituation: "",
      personality: "",
      country: "",
      state: "",
      city: ""
    });
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
            <h2>Student Profile Signals</h2>
            <p className="profile-hero-email">Configure and curate the student academic profile parameters below.</p>
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
                    <select
                      className="profile-select"
                      value={formData.grade || ""}
                      onChange={e => setFormData({ ...formData, grade: e.target.value })}
                      required
                    >
                      <option value="">Select Grade</option>
                      {["Grade 9", "Grade 10", "Grade 11", "Grade 12"].map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="profile-value-display">{getDisplayValue(profile?.grade)}</div>
                  )}
                </div>

                <div className="profile-field-group">
                  <label>Curriculum</label>
                  {isEditing ? (
                    <>
                      <select
                        className="profile-select"
                        value={formData.curriculum && !["CBSE", "ICSE", "State Board", "IB", "IGCSE", "University"].includes(formData.curriculum) ? "Other" : (formData.curriculum || "")}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === "Other") {
                            setFormData({ ...formData, curriculum: " " });
                          } else {
                            setFormData({ ...formData, curriculum: val });
                          }
                        }}
                      >
                        <option value="">Select Curriculum</option>
                        {["CBSE", "ICSE", "State Board", "IB", "IGCSE", "University"].map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                      {formData.curriculum && !["CBSE", "ICSE", "State Board", "IB", "IGCSE", "University"].includes(formData.curriculum) && (
                        <input
                          type="text"
                          className="profile-input"
                          style={{ marginTop: "8px" }}
                          value={formData.curriculum === " " ? "" : formData.curriculum}
                          onChange={e => setFormData({ ...formData, curriculum: e.target.value })}
                          placeholder="Specify custom curriculum"
                          required
                        />
                      )}
                    </>
                  ) : (
                    <div className="profile-value-display">{getDisplayValue(profile?.curriculum)}</div>
                  )}
                </div>

                <div className="profile-field-group">
                  <label>Academic Stream</label>
                  {isEditing ? (
                    <>
                      <select
                        className="profile-select"
                        value={formData.stream && !["Science", "Commerce", "Arts", "Engineering"].includes(formData.stream) ? "Other" : (formData.stream || "")}
                        onChange={e => {
                          const val = e.target.value;
                          if (val === "Other") {
                            setFormData({ ...formData, stream: " " });
                          } else {
                            setFormData({ ...formData, stream: val });
                          }
                        }}
                      >
                        <option value="">Select Stream</option>
                        {["Science", "Commerce", "Arts", "Engineering"].map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                        <option value="Other">Other</option>
                      </select>
                      {formData.stream && !["Science", "Commerce", "Arts", "Engineering"].includes(formData.stream) && (
                        <input
                          type="text"
                          className="profile-input"
                          style={{ marginTop: "8px" }}
                          value={formData.stream === " " ? "" : formData.stream}
                          onChange={e => setFormData({ ...formData, stream: e.target.value })}
                          placeholder="Specify custom academic stream"
                          required
                        />
                      )}
                    </>
                  ) : (
                    <div className="profile-value-display">{getDisplayValue(profile?.stream)}</div>
                  )}
                </div>

                <div className="profile-field-group">
                  <label>School / College</label>
                  {isEditing ? (
                    <input
                      type="text"
                      className="profile-input"
                      value={formData.school || ""}
                      onChange={e => setFormData({ ...formData, school: e.target.value })}
                      placeholder="e.g. Delhi Public School"
                    />
                  ) : (
                    <div className="profile-value-display">{getDisplayValue(profile?.school)}</div>
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
                        "Realistic: Engineer, Electrician, Mechanic",
                        "Investigative: Scientist, Data Analyst, AI Researcher",
                        "Artistic: Designer, Writer, Animator",
                        "Social: Teacher, Counselor, Nurse",
                        "Enterprising: Entrepreneur, Manager, Marketing Executive",
                        "Conventional: Accountant, Banker, Administrator"
                      ].map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="profile-value-display-wide">{getDisplayValue(profile?.personality)}</div>
                  )}
                </div>

                <div className="profile-field-group">
                  <label>Financial Situation</label>
                  {isEditing ? (
                    <select
                      className="profile-select"
                      value={formData.financialSituation || ""}
                      onChange={e => setFormData({ ...formData, financialSituation: e.target.value })}
                    >
                      <option value="">Select Budget Tier</option>
                      {["0-25%", "25-50%", "50-75%", "75-100%"].map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <div className="profile-value-display-wide">{getDisplayValue(profile?.financialSituation)}</div>
                  )}
                </div>

                <div className="profile-field-row-3col">
                  <div className="profile-field-group">
                    <label>Country</label>
                    {isEditing ? (
                      <select
                        className="profile-select"
                        value={formData.country || ""}
                        onChange={handleCountryChange}
                        disabled={loadingCountries}
                      >
                        <option value="">{loadingCountries ? "Loading countries..." : "Select Country"}</option>
                        {countriesList.map(c => (
                          <option key={c.name} value={c.name}>{c.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="profile-value-display">{getDisplayValue(profile?.country)}</div>
                    )}
                  </div>

                  <div className="profile-field-group">
                    <label>State</label>
                    {isEditing ? (
                      <select
                        className="profile-select"
                        value={formData.state || ""}
                        onChange={handleStateChange}
                        disabled={loadingStates || !formData.country}
                      >
                        <option value="">
                          {!formData.country ? "Select country first" : loadingStates ? "Loading states..." : "Select State"}
                        </option>
                        {statesList.map(s => (
                          <option key={s.name} value={s.name}>{s.name}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="profile-value-display">{getDisplayValue(profile?.state)}</div>
                    )}
                  </div>

                  <div className="profile-field-group">
                    <label>City</label>
                    {isEditing ? (
                      <select
                        className="profile-select"
                        value={formData.city || ""}
                        onChange={handleCityChange}
                        disabled={loadingCities || !formData.state}
                      >
                        <option value="">
                          {!formData.state ? "Select state first" : loadingCities ? "Loading cities..." : "Select City"}
                        </option>
                        {citiesList.map(c => (
                          <option key={c} value={c}>{c}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="profile-value-display">{getDisplayValue(profile?.city)}</div>
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
                  style={{ marginRight: "auto", borderColor: "#EB4335", color: "#EB4335" }}
                  onClick={handleReset}
                >
                  Reset Details
                </button>
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
                Edit Student Signals
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
