import {
  IconBook,
  IconBrain,
  IconBuilding,
  IconGlobe,
  IconMap,
  IconPackage,
  IconPin,
  IconRoute,
  IconTarget,
  IconUser,
} from "./Icons";

function readProfile() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    return Object.keys(user).length > 0 ? user : null;
  } catch {
    return null;
  }
}

function value(profile, key) {
  return profile?.[key]?.trim?.() || profile?.[key] || "Not available";
}

function ProfileField({ Icon, label, value }) {
  return (
    <div className="profile-view-field">
      <div className="profile-view-icon"><Icon size={18} /></div>
      <div>
        <div className="profile-view-label">{label}</div>
        <div className="profile-view-value">{value}</div>
      </div>
    </div>
  );
}

export default function ProfileSummary({ profile }) {
  const data = profile || readProfile();

  const fields = [
    { Icon: IconUser, label: "Name", value: value(data, "name") },
    { Icon: IconBook, label: "Grade", value: value(data, "grade") },
    { Icon: IconBook, label: "Curriculum", value: value(data, "curriculum") },
    { Icon: IconBuilding, label: "School", value: value(data, "school") },
    { Icon: IconRoute, label: "Stream", value: value(data, "stream") },
    { Icon: IconTarget, label: "Performance", value: value(data, "performance") },
    { Icon: IconBrain, label: "Personality", value: value(data, "personality") },
    { Icon: IconPackage, label: "Financial Situation", value: value(data, "financialSituation") },
    { Icon: IconGlobe, label: "Country", value: value(data, "country") },
    { Icon: IconMap, label: "State", value: value(data, "state") },
    { Icon: IconPin, label: "City", value: value(data, "city") },
  ];

  return (
    <div className="page profile-view-page">
      <div className="profile-view-header">
        <div>
          <div className="pill pill-teal">Profile Summary</div>
          <h1 className="display-title" style={{ marginTop: 14, fontSize: "28px", fontWeight: "500" }}>
            Your saved profile
          </h1>
          <p className="profile-view-sub">
            These details were collected during onboarding and are used to personalize your journey.
          </p>
        </div>
        <div className="profile-view-avatar">
          {(value(data, "name") || "N").slice(0, 1).toUpperCase()}
        </div>
      </div>

      {!data ? (
        <div className="card profile-empty">
          <IconUser size={34} />
          <div>
            <h2>No saved profile found</h2>
            <p>Your onboarding profile data was not found in this browser.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="card profile-overview-card">
            <div>
              <div className="section-label">Current Position</div>
              <h2 style={{ fontSize: "20px", fontWeight: "500", margin: "8px 0 0 0" }}>
                {[data.grade, data.curriculum].filter(Boolean).join(" • ") || "Academic details unavailable"}
              </h2>
            </div>
            <div className="profile-location-pill">
              <IconPin size={16} />
              {[data.city, data.state, data.country].filter(Boolean).join(", ") || "Location unavailable"}
            </div>
          </div>

          <div className="profile-view-grid">
            {fields.map(item => (
              <ProfileField key={item.label} {...item} />
            ))}
          </div>
        </>
      )}

      <style>{`
        .profile-view-page {
          max-width: 980px;
        }
        .profile-view-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 24px;
        }
        .profile-view-sub {
          max-width: 560px;
          margin-top: 12px;
          color: var(--text2);
          line-height: 1.7;
          font-size: 15px;
        }
        .profile-view-avatar {
          width: 56px;
          height: 56px;
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          background: linear-gradient(135deg, var(--accent), var(--blue));
          font-family: var(--font-display);
          font-size: 26px;
          flex-shrink: 0;
          box-shadow: var(--shadow-md);
        }
        .profile-overview-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
          border-color: rgba(43, 174, 142, 0.22);
          background: linear-gradient(135deg, #fff, rgba(214, 242, 236, 0.55));
        }
        .profile-overview-card h2 {
          margin: 8px 0 0 0;
          font-size: 20px;
          font-weight: 500;
          color: var(--text);
          font-family: var(--font-display);
        }
        .profile-location-pill {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          padding: 9px 12px;
          border-radius: 999px;
          background: #fff;
          border: 1px solid var(--border);
          color: var(--text2);
          font-size: 13px;
          font-weight: 600;
          white-space: nowrap;
        }
        .profile-view-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }
        .profile-view-field {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 18px;
          background: var(--bg2);
          border: 1px solid var(--border);
          border-radius: 16px;
          box-shadow: var(--shadow);
        }
        .profile-view-icon {
          width: 38px;
          height: 38px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          color: var(--accent2);
          background: var(--accent-soft);
          flex-shrink: 0;
        }
        .profile-view-label {
          margin-bottom: 4px;
          font-size: 11px;
          color: var(--text3);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          font-weight: 700;
        }
        .profile-view-value {
          color: var(--text);
          font-size: 14px;
          line-height: 1.5;
          font-weight: 500;
        }
        .profile-empty {
          display: flex;
          align-items: center;
          gap: 16px;
          color: var(--text2);
        }
        .profile-empty svg {
          color: var(--accent);
          flex-shrink: 0;
        }
        .profile-empty h2 {
          margin-bottom: 4px;
          color: var(--text);
          font-size: 18px;
          font-weight: 500;
        }
        .profile-empty p {
          color: var(--text2);
          font-size: 14px;
        }

        @media (max-width: 720px) {
          .profile-view-header,
          .profile-overview-card {
            flex-direction: column;
            align-items: flex-start;
          }
          .profile-view-grid {
            grid-template-columns: 1fr;
          }
          .profile-location-pill {
            white-space: normal;
          }
        }
      `}</style>
    </div>
  );
}