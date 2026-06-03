import { useMemo, useState } from "react";
import {
  IconBuilding,
  IconPackage,
  IconSearch,
  IconStar,
  IconUser,
  IconUsers,
} from "./Icons";

const CATEGORIES = [
  { key: "mentors",      label: "Mentors",      Icon: IconUser,     tag: "pill-coral" },
  { key: "vendors",      label: "Vendors",      Icon: IconPackage,  tag: "pill-teal" },
  { key: "institutions", label: "Institutions", Icon: IconBuilding, tag: "pill-blue" },
  { key: "distributors", label: "Distributors", Icon: IconUsers,    tag: "pill-lavender" },
];

// view: "macro" = free only, "micro"/"nano" = paid options shown
const MOCK_DATA = {
  mentors: [
    {
      name: "Priya Sharma",
      role: "Senior Data Scientist @ Google",
      rating: 4.9,
      sessions: 142,
      tags: ["Python", "ML", "Career switch"],
      nano_price: "₹1,500/hr",
      avatar: "PS",
    },
    {
      name: "Rahul Mehta",
      role: "ML Engineer @ Microsoft",
      rating: 4.8,
      sessions: 98,
      tags: ["Deep Learning", "NLP", "Research"],
      nano_price: "₹2,000/hr",
      avatar: "RM",
    },
    {
      name: "Aisha Patel",
      role: "AI/ML Lead @ Flipkart",
      rating: 5.0,
      sessions: 210,
      tags: ["Data Analysis", "SQL", "Beginners"],
      nano_price: "₹1,200/hr",
      avatar: "AP",
    },
    {
      name: "Kiran Reddy",
      role: "Data Engineer @ Amazon",
      rating: 4.7,
      sessions: 76,
      tags: ["Cloud", "Pipelines", "AWS"],
      nano_price: "₹1,400/hr",
      avatar: "KR",
    },
  ],
  vendors: [
    {
      name: "Coursera",
      role: "Online learning platform",
      rating: 4.7,
      sessions: null,
      tags: ["Courses", "Certificates", "Free audit"],
      macro_price: "Free audit",
      micro_price: "₹2,000–₹4,000/course",
      avatar: "CO",
    },
    {
      name: "freeCodeCamp",
      role: "Free coding curriculum",
      rating: 4.9,
      sessions: null,
      tags: ["Free", "Projects", "Community"],
      macro_price: "Completely free",
      avatar: "FC",
    },
    {
      name: "Kaggle",
      role: "Data science competitions & datasets",
      rating: 4.8,
      sessions: null,
      tags: ["Datasets", "Competitions", "Notebooks"],
      macro_price: "Free",
      avatar: "KG",
    },
    {
      name: "Scaler Academy",
      role: "Structured tech programs",
      rating: 4.6,
      sessions: null,
      tags: ["Bootcamp", "Placement", "Live classes"],
      micro_price: "₹75,000 (structured)",
      avatar: "SC",
    },
  ],
  institutions: [
    {
      name: "IIT Hyderabad",
      role: "Premier tech institute",
      rating: 4.9,
      sessions: null,
      tags: ["B.Tech", "M.Tech", "Research"],
      macro_price: "Free resources online",
      avatar: "IH",
    },
    {
      name: "IIIT Hyderabad",
      role: "Info tech & AI focused",
      rating: 4.8,
      sessions: null,
      tags: ["AI", "Data Science", "PGDip"],
      macro_price: "Free course audits",
      avatar: "II",
    },
    {
      name: "upGrad",
      role: "Online degree programs",
      rating: 4.5,
      sessions: null,
      tags: ["PG Program", "Industry projects"],
      micro_price: "₹1,25,000 (structured)",
      avatar: "UG",
    },
    {
      name: "Great Learning",
      role: "AI & analytics programs",
      rating: 4.4,
      sessions: null,
      tags: ["Certificate", "AI", "Flexible"],
      micro_price: "₹40,000 (certificate)",
      avatar: "GL",
    },
  ],
  distributors: [
    {
      name: "O'Reilly Learning",
      role: "Books, videos & live training",
      rating: 4.8,
      sessions: null,
      tags: ["Books", "Videos", "Live events"],
      micro_price: "₹1,500/month",
      avatar: "OR",
    },
    {
      name: "Udemy",
      role: "On-demand video courses",
      rating: 4.5,
      sessions: null,
      tags: ["Video", "Self-paced", "Affordable"],
      micro_price: "₹500–₹1,500/course",
      avatar: "UD",
    },
    {
      name: "YouTube",
      role: "Free video tutorials",
      rating: 4.7,
      sessions: null,
      tags: ["Free", "Tutorials", "Channels"],
      macro_price: "Completely free",
      avatar: "YT",
    },
    {
      name: "Medium / Towards DS",
      role: "Articles & community writing",
      rating: 4.6,
      sessions: null,
      tags: ["Articles", "Community", "Free tier"],
      macro_price: "Free (3 articles/month)",
      avatar: "MD",
    },
  ],
};

function getPriceForView(item, view) {
  if (view === "macro") return item.macro_price;
  if (view === "micro") return item.micro_price;
  return item.nano_price;
}

function getCtaLabel(category, view) {
  if (category === "mentors") {
    if (view === "macro") return "Get Free Tips";
    return "Book Session";
  }
  if (category === "institutions") {
    if (view === "macro") return "Explore Free";
    return "Learn More";
  }
  if (view === "macro") return "Access Free";
  return "Visit Platform";
}

export default function Marketplace({ step, view }) {
  const [activeCategory, setActiveCategory] = useState("mentors");
  const [activeView, setActiveView] = useState(view || "macro");
  const [search, setSearch] = useState("");

  // Determine available categories dynamically depending on view
  const availableCats = useMemo(() => {
    return CATEGORIES.filter(cat => {
      // Check if mock database has items for this category in the current view
      const hasMock = (MOCK_DATA[cat.key] || []).some(item => {
        const price = getPriceForView(item, activeView);
        return price !== undefined && price !== null;
      });
      
      // Check if AI generated items have any entries for this category in the current view
      const viewKey = activeView === "macro" ? "macro_free" : activeView === "micro" ? "micro_structured" : "nano_expert";
      const hasDynamic = (step?.marketplace?.[viewKey] || []).some(item => {
        const type = (item.type || "").toLowerCase();
        const name = (item.name || "").toLowerCase();
        let itemCat = "vendors";
        if (type.includes("mentor") || type.includes("coach") || type.includes("expert") || type.includes("advisor") || type.includes("review") || type.includes("tutoring") || type.includes("specialist") || type.includes("counselor") || name.includes("mentor") || name.includes("coach")) {
          itemCat = "mentors";
        } else if (type.includes("university") || type.includes("college") || type.includes("school") || type.includes("institute") || type.includes("academy") || name.includes("university") || name.includes("college") || name.includes("institute") || name.includes("academy")) {
          itemCat = "institutions";
        } else if (type.includes("youtube") || type.includes("docs") || type.includes("community") || type.includes("book") || type.includes("library") || type.includes("articles") || type.includes("github") || type.includes("publication") || type.includes("channel") || type.includes("guide") || name.includes("youtube") || name.includes("book") || name.includes("guide")) {
          itemCat = "distributors";
        }
        return itemCat === cat.key;
      });
      
      return hasMock || hasDynamic;
    });
  }, [step, activeView]);

  // Coerce category state to first available if activeCategory is not in the list
  const currentCategory = useMemo(() => {
    if (availableCats.some(c => c.key === activeCategory)) {
      return activeCategory;
    }
    return availableCats[0]?.key || "vendors";
  }, [availableCats, activeCategory]);

  const handleViewChange = (newView) => {
    setActiveView(newView);
    setSearch("");
  };

  const items = useMemo(() => {
    const matchedDynamic = [];
    
    if (step && step.marketplace) {
      const viewKey = activeView === "macro" ? "macro_free" : activeView === "micro" ? "micro_structured" : "nano_expert";
      const rawItems = step.marketplace[viewKey] || [];
      
      rawItems.forEach(item => {
        const type = (item.type || "").toLowerCase();
        const name = (item.name || "").toLowerCase();
        
        let category = "vendors"; // Default fallback
        if (type.includes("mentor") || type.includes("coach") || type.includes("expert") || type.includes("advisor") || type.includes("review") || type.includes("tutoring") || type.includes("specialist") || type.includes("counselor") || name.includes("mentor") || name.includes("coach")) {
          category = "mentors";
        } else if (type.includes("university") || type.includes("college") || type.includes("school") || type.includes("institute") || type.includes("academy") || name.includes("university") || name.includes("college") || name.includes("institute") || name.includes("academy")) {
          category = "institutions";
        } else if (type.includes("youtube") || type.includes("docs") || type.includes("community") || type.includes("book") || type.includes("library") || type.includes("articles") || type.includes("github") || type.includes("publication") || type.includes("channel") || type.includes("guide") || name.includes("youtube") || name.includes("book") || name.includes("guide")) {
          category = "distributors";
        }
        
        if (category === currentCategory) {
          const price = item.cost || item.price || (activeView === "macro" ? "Free" : "Varies");
          matchedDynamic.push({
            name: item.name,
            role: item.type || (category === "mentors" ? "Expert Guide" : "Learning Resource"),
            why: item.why || item.value || item.expected_outcomes || "",
            next_step: item.next_step || item.session_details || "",
            tags: item.tags || [],
            price: price,
            rating: item.rating || "4.8",
            sessions: item.sessions || (category === "mentors" ? 42 : null),
            avatar: item.name.split(" ").map(w => w[0]).join("").substring(0, 2).toUpperCase(),
            isRecommended: true,
          });
        }
      });
    }
    
    // Get mock items for this category, filtering out items that do not have a price for this view
    const mockItems = (MOCK_DATA[currentCategory] || [])
      .filter(item => {
        const price = getPriceForView(item, activeView);
        return price !== undefined && price !== null;
      })
      .map(item => {
        const price = getPriceForView(item, activeView);
        return {
          ...item,
          price,
          why: "",
          next_step: "",
          isRecommended: false,
        };
      });
    
    // Combine them, putting recommended items at the top
    const combined = [...matchedDynamic, ...mockItems];
    
    // Apply search filter
    return combined.filter(item => {
      if (!search.trim()) return true;
      const hay = `${item.name} ${item.role} ${item.tags.join(" ")} ${item.why} ${item.next_step}`.toLowerCase();
      return hay.includes(search.toLowerCase());
    });
  }, [step, currentCategory, activeView, search]);

  const activeCat = CATEGORIES.find(c => c.key === currentCategory);

  const { recommendedItems, standardItems } = useMemo(() => {
    const recommended = [];
    const standard = [];
    
    items.forEach(item => {
      if (item.isRecommended) {
        recommended.push(item);
      } else {
        standard.push(item);
      }
    });
    
    return { recommendedItems: recommended, standardItems: standard };
  }, [items]);

  return (
    <div className="page">

      {/* Header */}
      <div className="mp-header">
        <h2 className="display-title" style={{ fontSize: 32 }}>Marketplace</h2>
        {step && (
          <p style={{ fontSize: 14, color: "var(--text2)", marginTop: 8, lineHeight: 1.6 }}>
            Resources for <strong>{step.title}</strong>
          </p>
        )}
      </div>

      {/* View tabs: macro / micro / nano */}
      <div className="mp-view-tabs">
        {[
          { key: "macro", label: "Free resources", desc: "No cost options" },
          { key: "micro", label: "Structured",     desc: "Paid courses & tools" },
          { key: "nano",  label: "Expert 1:1",     desc: "Mentors & coaching" },
        ]
        .filter(v => !view || v.key === view)
        .map(v => (
          <button
            key={v.key}
            className={`mp-view-btn ${activeView === v.key ? "mp-view-btn--active" : ""}`}
            onClick={() => handleViewChange(v.key)}
          >
            <span className="mp-view-label">{v.label}</span>
            <span className="mp-view-desc">{v.desc}</span>
          </button>
        ))}
      </div>

      {/* Category tabs */}
      <div className="mp-cats">
        {availableCats.map(cat => (
          <button
            key={cat.key}
            className={`mp-cat-btn ${currentCategory === cat.key ? "mp-cat-btn--active" : ""}`}
            onClick={() => { setActiveCategory(cat.key); setSearch(""); }}
          >
            <span className="mp-cat-icon"><cat.Icon size={16} /></span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="mp-search-row">
        <div className="mp-search-wrap">
          <IconSearch size={15} color="var(--text3)" />
          <input
            className="mp-search-input"
            placeholder={`Search ${activeCat?.label.toLowerCase()}...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Count */}
      <div className="section-label" style={{ marginBottom: 16 }}>
        {items.length} {activeCat?.label.toLowerCase()} · {activeView === "macro" ? "free options" : activeView === "micro" ? "structured options" : "expert options"}
      </div>

      {/* Recommended Section */}
      {recommendedItems.length > 0 && (
        <div className="mp-section" style={{ marginBottom: 28 }}>
          <div className="mp-section-title">✨ Recommended for this Step</div>
          <div className="mp-recommended-grid">
            {recommendedItems.map((item, i) => {
              const price = item.price;
              const isFree = price?.toLowerCase().includes("free") || price?.toLowerCase().includes("free");
              return (
                <div key={i} className="mp-card card card-clickable mp-card--recommended">
                  <div className="mp-recommended-badge">✨ AI Recommended</div>
                  
                  <div className="mp-card-top">
                    <div className="mp-avatar">{item.avatar}</div>
                    <div className="mp-card-info">
                      <div className="mp-card-name">{item.name}</div>
                      <div className="mp-card-role">{item.role}</div>
                    </div>
                  </div>

                  <div className="mp-card-tags">
                    {item.tags.map((t, j) => (
                      <span key={j} className={`pill ${["pill-teal","pill-blue","pill-lavender"][j % 3]}`}>{t}</span>
                    ))}
                  </div>

                  <div className="mp-card-details">
                    {item.why && (
                      <div className="mp-detail-row">
                        <span className="mp-detail-lbl">Why it fits</span>
                        <span className="mp-detail-val">{item.why}</span>
                      </div>
                    )}
                    {item.next_step && (
                      <div className="mp-detail-row">
                        <span className="mp-detail-lbl">Next Action</span>
                        <span className="mp-detail-val">{item.next_step}</span>
                      </div>
                    )}
                  </div>
     
                  <div className="mp-card-bottom">
                    <div className="mp-card-rating">
                      <IconStar size={13} fill="var(--amber)" color="var(--amber)" />
                      <span>{item.rating}</span>
                      {item.sessions && <span className="mp-sessions">· {item.sessions} sessions</span>}
                    </div>
                    <div className="mp-card-price-line">
                      <span className="mp-price-lbl">Investment</span>
                      <span className={`mp-card-price ${isFree ? "mp-price-free" : ""}`}>{price}</span>
                    </div>
                  </div>
     
                  <button className="btn-primary mp-connect-btn">
                    {getCtaLabel(currentCategory, activeView)}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Directory Section */}
      {standardItems.length > 0 && (
        <div className="mp-section">
          {recommendedItems.length > 0 && (
            <div className="mp-section-title" style={{ marginTop: 24 }}>All Providers</div>
          )}
          <div className="mp-grid">
            {standardItems.map((item, i) => {
              const price = item.price;
              const isFree = price?.toLowerCase().includes("free") || price?.toLowerCase().includes("free");
              return (
                <div key={i} className="mp-card card card-clickable">
                  <div className="mp-card-top">
                    <div className="mp-avatar">{item.avatar}</div>
                    <div className="mp-card-info">
                      <div className="mp-card-name">{item.name}</div>
                      <div className="mp-card-role">{item.role}</div>
                    </div>
                  </div>

                  <div className="mp-card-tags">
                    {item.tags.map((t, j) => (
                      <span key={j} className={`pill ${["pill-teal","pill-blue","pill-lavender"][j % 3]}`}>{t}</span>
                    ))}
                  </div>
     
                  <div className="mp-card-bottom">
                    <div className="mp-card-rating">
                      <IconStar size={13} fill="var(--amber)" color="var(--amber)" />
                      <span>{item.rating}</span>
                      {item.sessions && <span className="mp-sessions">· {item.sessions} sessions</span>}
                    </div>
                    <div className="mp-card-price-line">
                      <span className="mp-price-lbl">Investment</span>
                      <span className={`mp-card-price ${isFree ? "mp-price-free" : ""}`}>{price}</span>
                    </div>
                  </div>
     
                  <button className="btn-primary mp-connect-btn">
                    {getCtaLabel(currentCategory, activeView)}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {items.length === 0 && (
        <div className="mp-empty card">
          <div className="mp-empty-icon"><IconSearch size={32} /></div>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>No results found</div>
          <div style={{ fontSize: 13, color: "var(--text2)" }}>Try a different search or category</div>
        </div>
      )}

      <style>{`
        .mp-header { margin-bottom: 24px; }

        .mp-view-tabs {
          display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 18px;
          align-items: stretch;
        }
        .mp-view-btn {
          display: flex; flex-direction: column; gap: 2px;
          padding: 10px 18px; border-radius: var(--radius);
          border: 1.5px solid var(--border); background: var(--bg2);
          cursor: pointer; font-family: var(--font-body);
          text-align: left; transition: all 0.2s; flex: 1; min-width: 120px;
          margin: 0; box-sizing: border-box; outline: none;
          align-self: stretch;
        }
        .mp-view-btn:hover { border-color: var(--accent); }
        .mp-view-btn--active { border-color: var(--accent); background: var(--accent-soft); }
        .mp-view-label { font-size: 13px; font-weight: 600; color: var(--text); margin: 0; }
        .mp-view-btn--active .mp-view-label { color: var(--accent2); }
        .mp-view-desc { font-size: 11px; color: var(--text3); margin: 0; }

        .mp-cats {
          display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 20px;
        }
        .mp-cat-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 10px 20px; border-radius: 30px;
          border: 1.5px solid var(--border); background: var(--bg2);
          font-family: var(--font-body); font-size: 14px; font-weight: 500;
          color: var(--text2); cursor: pointer; transition: all 0.2s;
        }
        .mp-cat-icon { display: flex; align-items: center; }
        .mp-cat-btn:hover { border-color: var(--accent); color: var(--accent); }
        .mp-cat-btn--active { border-color: var(--accent); background: var(--accent-soft); color: var(--accent2); }

        .mp-search-row { margin-bottom: 20px; }
        .mp-search-wrap {
          display: flex; align-items: center; gap: 10px;
          max-width: 400px; padding: 10px 14px;
          border: 1.5px solid var(--border); border-radius: var(--radius-sm);
          background: var(--bg2); transition: border-color 0.2s;
        }
        .mp-search-wrap:focus-within { border-color: var(--accent); }
        .mp-search-input {
          border: none; outline: none; background: transparent;
          font-family: var(--font-body); font-size: 14px;
          color: var(--text); width: 100%;
        }
        .mp-search-input::placeholder { color: var(--text3); }

        .mp-section-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text3);
          letter-spacing: 0.08em;
          margin-bottom: 14px;
          margin-top: 10px;
        }

        .mp-recommended-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 18px;
          margin-bottom: 24px;
        }

        .mp-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 18px;
        }
        .mp-card { display: flex; flex-direction: column; gap: 14px; padding: 22px; }
        .mp-card--recommended {
          background: linear-gradient(135deg, #ffffff, #f2faf3);
          border: 1.5px solid var(--green);
          position: relative;
          box-shadow: 0 4px 12px rgba(44, 168, 82, 0.08);
        }
        .mp-card--recommended:hover {
          box-shadow: 0 6px 16px rgba(44, 168, 82, 0.15);
        }
        .mp-recommended-badge {
          position: absolute;
          top: 12px;
          right: 12px;
          font-size: 9px;
          font-weight: 700;
          color: var(--green);
          background: #e6f6ec;
          padding: 3px 8px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }
        .mp-card-details {
          font-size: 12px;
          line-height: 1.5;
          color: var(--text2);
          display: flex;
          flex-direction: column;
          gap: 6px;
          margin-top: 2px;
        }
        .mp-detail-row {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        .mp-detail-lbl {
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          color: var(--text3);
          letter-spacing: 0.04em;
        }
        .mp-detail-val {
          font-size: 12px;
          color: var(--text);
        }
        .mp-card-top { display: flex; align-items: center; gap: 14px; }
        .mp-avatar {
          width: 46px; height: 46px; border-radius: 12px;
          background: linear-gradient(135deg, var(--accent-soft), var(--blue-soft));
          color: var(--accent2); font-weight: 700; font-size: 14px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .mp-card-name { font-size: 15px; font-weight: 600; color: var(--text); }
        .mp-card-role { font-size: 12px; color: var(--text2); margin-top: 2px; line-height: 1.4; }
        .mp-card-tags { display: flex; flex-wrap: wrap; gap: 6px; min-height: 44px; align-content: flex-start; }
        .mp-card-bottom {
          display: flex; flex-direction: column; gap: 6px;
          padding-top: 10px; border-top: 1px solid var(--border);
          margin-top: auto;
        }
        .mp-card-rating { display: flex; align-items: center; gap: 5px; font-size: 12px; color: var(--text2); }
        .mp-sessions { color: var(--text3); }
        .mp-card-price-line { display: flex; align-items: center; justify-content: space-between; font-size: 13px; }
        .mp-price-lbl { color: var(--text3); font-size: 12px; font-weight: 500; }
        .mp-card-price { font-size: 13px; font-weight: 600; color: var(--accent2); }
        .mp-price-free { color: var(--accent); background: var(--green-soft); padding: 2px 8px; border-radius: 6px; }
        .mp-connect-btn { width: 100%; justify-content: center; padding: 11px; font-size: 14px; margin-top: 4px; }

        .mp-empty { text-align: center; padding: 48px; }
        .mp-empty-icon { display: flex; justify-content: center; color: var(--text3); margin-bottom: 12px; }
      `}</style>
    </div>
  );
}