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
      macro_price: "Free Office Hours",
      micro_price: "₹1,500/session",
      nano_price: "₹6,000/month (Strategic Mentorship)",
      avatar: "PS",
    },
    {
      name: "Rahul Mehta",
      role: "ML Engineer @ Microsoft",
      rating: 4.8,
      sessions: 98,
      tags: ["Deep Learning", "NLP", "Research"],
      macro_price: "Free AMA Q&A",
      micro_price: "₹2,000/session",
      nano_price: "₹8,000/month (Advanced Research Prep)",
      avatar: "RM",
    },
    {
      name: "Aisha Patel",
      role: "AI/ML Lead @ Flipkart",
      rating: 5.0,
      sessions: 210,
      tags: ["Data Analysis", "SQL", "Beginners"],
      macro_price: "Free Foundation Seminars",
      micro_price: "₹1,200/session",
      nano_price: "₹5,000/month (Hands-on Coaching)",
      avatar: "AP",
    },
    {
      name: "Kiran Reddy",
      role: "Data Engineer @ Amazon",
      rating: 4.7,
      sessions: 76,
      tags: ["Cloud", "Pipelines", "AWS"],
      macro_price: "Free Resume Review Session",
      micro_price: "₹1,400/session",
      nano_price: "₹5,500/month (Data Engineering Track)",
      avatar: "KR",
    },
    // Extra Mentors (High Cost, Nano View Only)
    {
      name: "Dr. Aris Thorne",
      role: "Ex-Director of AI @ Meta",
      rating: 5.0,
      sessions: 320,
      tags: ["AI Strategy", "PhD Prep", "Big Tech Careers"],
      nano_price: "₹18,000/hr (Elite Consult)",
      avatar: "AT",
    },
    {
      name: "Sanjay Kumar",
      role: "Principal Architect @ Salesforce",
      rating: 4.9,
      sessions: 184,
      tags: ["System Design", "Scalability", "Careers"],
      nano_price: "₹12,500/hr (System Architecture Audit)",
      avatar: "SK",
    },
    {
      name: "Sarah Jenkins",
      role: "Admissions Consultant (Ivy League Focus)",
      rating: 5.0,
      sessions: 245,
      tags: ["College Essays", "Ivy League Target", "Admissions Strategy"],
      nano_price: "₹15,000/session (Profile Calibration)",
      avatar: "SJ",
    },
    {
      name: "Prof. Michael Chang",
      role: "Research Scientist @ MIT",
      rating: 4.8,
      sessions: 112,
      tags: ["AI Research", "Computer Science", "Scientific Writing"],
      nano_price: "₹14,000/hr (Research Pitch Review)",
      avatar: "MC",
    }
  ],
  vendors: [
    {
      name: "Coursera",
      role: "Online learning platform",
      rating: 4.7,
      sessions: null,
      tags: ["Courses", "Certificates", "Free audit"],
      macro_price: "Free Audit Access",
      micro_price: "₹2,000–₹4,000/course",
      nano_price: "₹38,000/Specialization Cert (Enterprise)",
      avatar: "CO",
    },
    {
      name: "freeCodeCamp",
      role: "Free coding curriculum",
      rating: 4.9,
      sessions: null,
      tags: ["Free", "Projects", "Community"],
      macro_price: "Completely free certificates",
      micro_price: "Free (Optionally Donate ₹450/mo)",
      nano_price: "Free (Optionally Donate ₹2,500/mo)",
      avatar: "FC",
    },
    {
      name: "Kaggle",
      role: "Data science competitions & datasets",
      rating: 4.8,
      sessions: null,
      tags: ["Datasets", "Competitions", "Notebooks"],
      macro_price: "Free Open-Source Access",
      micro_price: "Free Competitions (No Cost)",
      nano_price: "Free Community Learning Platform",
      avatar: "KG",
    },
    {
      name: "Scaler Academy",
      role: "Structured tech programs",
      rating: 4.6,
      sessions: null,
      tags: ["Bootcamp", "Placement", "Live classes"],
      macro_price: "Free introductory masterclass",
      micro_price: "₹75,000 (Short track bootcamp)",
      nano_price: "₹2,50,000 (Elite career transition)",
      avatar: "SC",
    },
    {
      name: "Springboard",
      role: "Project-led tech bootcamps",
      rating: 4.8,
      sessions: null,
      tags: ["Data Science", "UX Design", "Job Guarantee"],
      macro_price: "Free prep webinars & prep course",
      micro_price: "₹45,000/specialization",
      nano_price: "₹1,85,000 (Comprehensive Career Track)",
      avatar: "SB",
    },
    {
      name: "Udacity",
      role: "Nanodegree credentials",
      rating: 4.7,
      sessions: null,
      tags: ["Nanodegree", "Self-paced", "Industry partner"],
      macro_price: "Free syllabus & intro resources",
      micro_price: "₹22,800/term",
      nano_price: "₹95,000 (Full Nanodegree Program)",
      avatar: "UA",
    }
  ],
  institutions: [
    {
      name: "IIT Hyderabad",
      role: "Premier tech institute",
      rating: 4.9,
      sessions: null,
      tags: ["B.Tech", "M.Tech", "Research"],
      macro_price: "Free open lectures & research papers",
      micro_price: "₹15,000 (Online certification)",
      nano_price: "₹3,50,000 (Executive M.Tech Program)",
      avatar: "IH",
    },
    {
      name: "IIIT Hyderabad",
      role: "Info tech & AI focused",
      rating: 4.8,
      sessions: null,
      tags: ["AI", "Data Science", "PGDip"],
      macro_price: "Free PG seminar videos & research audits",
      micro_price: "₹25,000 (Modular PG Certification)",
      nano_price: "₹2,80,000 (Post Graduate Diploma)",
      avatar: "II",
    },
    {
      name: "upGrad",
      role: "Online degree programs",
      rating: 4.5,
      sessions: null,
      tags: ["PG Program", "Industry projects"],
      macro_price: "Free counseling & webinar audits",
      micro_price: "₹1,25,000 (Online PG Diploma)",
      nano_price: "₹4,50,000 (Premium Global MBA / M.Sc)",
      avatar: "UG",
    },
    {
      name: "Great Learning",
      role: "AI & analytics programs",
      rating: 4.4,
      sessions: null,
      tags: ["Certificate", "AI", "Flexible"],
      macro_price: "Free foundational courses",
      micro_price: "₹40,000 (Professional certificate)",
      nano_price: "₹2,20,000 (Premium PG Program)",
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
      macro_price: "Free Trial (10 Days)",
      micro_price: "₹1,500/month (Individual Sub)",
      nano_price: "₹45,000/year (Enterprise Pro Package)",
      avatar: "OR",
    },
    {
      name: "Udemy",
      role: "On-demand video courses",
      rating: 4.5,
      sessions: null,
      tags: ["Video", "Self-paced", "Affordable"],
      macro_price: "Free previews & basic content",
      micro_price: "₹500–₹1,500/course",
      nano_price: "₹24,000/year (Personal Pro Subscription)",
      avatar: "UD",
    },
    {
      name: "YouTube",
      role: "Free video tutorials",
      rating: 4.7,
      sessions: null,
      tags: ["Free", "Tutorials", "Channels"],
      macro_price: "Completely Free",
      micro_price: "Free (Ad-supported tutorials)",
      nano_price: "Free (Open source access)",
      avatar: "YT",
    },
    {
      name: "Medium / Towards DS",
      role: "Articles & community writing",
      rating: 4.6,
      sessions: null,
      tags: ["Articles", "Community", "Free tier"],
      macro_price: "Free tier (3 articles/month)",
      micro_price: "₹450/month (Medium Membership)",
      nano_price: "₹4,500/year (Annual Premium Reader)",
      avatar: "MD",
    },
    {
      name: "LinkedIn Learning",
      role: "Professional skills video library",
      rating: 4.6,
      sessions: null,
      tags: ["Certifications", "Short Courses", "Business/Tech"],
      macro_price: "Free Trial (1 month)",
      micro_price: "₹1,400/month (Individual Sub)",
      nano_price: "₹30,000/year (Enterprise Premium)",
      avatar: "LL",
    }
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

function classifyMarketplaceItem(item) {
  const explicitCategory = (item.category || "").toLowerCase();
  if (CATEGORIES.some(category => category.key === explicitCategory)) return explicitCategory;

  const type = (item.type || "").toLowerCase();
  const name = (item.name || "").toLowerCase();
  if (type.includes("mentor") || type.includes("coach") || type.includes("expert") || type.includes("advisor") || type.includes("review") || type.includes("tutoring") || type.includes("specialist") || type.includes("counselor") || name.includes("mentor") || name.includes("coach")) return "mentors";
  if (type.includes("university") || type.includes("college") || type.includes("school") || type.includes("institute") || type.includes("academy") || name.includes("university") || name.includes("college") || name.includes("institute") || name.includes("academy")) return "institutions";
  if (type.includes("youtube") || type.includes("docs") || type.includes("community") || type.includes("book") || type.includes("library") || type.includes("articles") || type.includes("github") || type.includes("publication") || type.includes("channel") || type.includes("guide") || name.includes("youtube") || name.includes("book") || name.includes("guide")) return "distributors";
  return "vendors";
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
        return classifyMarketplaceItem(item) === cat.key;
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
        const category = classifyMarketplaceItem(item);
        
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

        @media (max-width: 760px) {
          .mp-view-tabs,
          .mp-card-bottom,
          .mp-card-top,
          .mp-card-price-line,
          .mp-card-rating {
            flex-direction: column;
            align-items: stretch;
          }

          .btn-primary.mp-connect-btn,
          .mp-search-wrap {
            width: 100%;
          }

          .mp-header { margin-bottom: 16px; }
          .mp-header .display-title { font-size: 25px; }

          .mp-view-tabs,
          .mp-cats {
            flex-direction: row;
            flex-wrap: nowrap;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            scrollbar-width: none;
            padding-bottom: 3px;
          }
          .mp-view-tabs::-webkit-scrollbar,
          .mp-cats::-webkit-scrollbar { display: none; }

          .mp-view-btn {
            flex: 0 0 150px;
            min-width: 150px;
            padding: 9px 12px;
          }

          .mp-cat-btn {
            flex: 0 0 auto;
            width: auto;
            padding: 9px 14px;
            white-space: nowrap;
          }

          .mp-grid,
          .mp-recommended-grid {
            grid-template-columns: 1fr;
          }

          .mp-card {
            padding: 18px;
          }

          .mp-card-tag,
          .mp-card-tags {
            gap: 8px;
          }

          .mp-card-top {
            align-items: flex-start;
          }

          .mp-search-wrap {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  );
}
