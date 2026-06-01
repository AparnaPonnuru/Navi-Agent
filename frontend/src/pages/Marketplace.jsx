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
      macro_price: "Free intro call",
      micro_price: "₹1,200/hr",
      nano_price: "₹1,500/hr",
      avatar: "PS",
    },
    {
      name: "Rahul Mehta",
      role: "ML Engineer @ Microsoft",
      rating: 4.8,
      sessions: 98,
      tags: ["Deep Learning", "NLP", "Research"],
      macro_price: "Free 15-min chat",
      micro_price: "₹1,500/hr",
      nano_price: "₹2,000/hr",
      avatar: "RM",
    },
    {
      name: "Aisha Patel",
      role: "AI/ML Lead @ Flipkart",
      rating: 5.0,
      sessions: 210,
      tags: ["Data Analysis", "SQL", "Beginners"],
      macro_price: "Free Q&A",
      micro_price: "₹900/hr",
      nano_price: "₹1,200/hr",
      avatar: "AP",
    },
    {
      name: "Kiran Reddy",
      role: "Data Engineer @ Amazon",
      rating: 4.7,
      sessions: 76,
      tags: ["Cloud", "Pipelines", "AWS"],
      macro_price: "Free resource list",
      micro_price: "₹1,100/hr",
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
      nano_price: "₹6,000/month (Plus)",
      avatar: "CO",
    },
    {
      name: "freeCodeCamp",
      role: "Free coding curriculum",
      rating: 4.9,
      sessions: null,
      tags: ["Free", "Projects", "Community"],
      macro_price: "Completely free",
      micro_price: "Free",
      nano_price: "Free",
      avatar: "FC",
    },
    {
      name: "Kaggle",
      role: "Data science competitions & datasets",
      rating: 4.8,
      sessions: null,
      tags: ["Datasets", "Competitions", "Notebooks"],
      macro_price: "Free",
      micro_price: "Free",
      nano_price: "Free",
      avatar: "KG",
    },
    {
      name: "Scaler Academy",
      role: "Structured tech programs",
      rating: 4.6,
      sessions: null,
      tags: ["Bootcamp", "Placement", "Live classes"],
      macro_price: "Free trial class",
      micro_price: "₹75,000 (structured)",
      nano_price: "₹1,50,000 (full program)",
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
      micro_price: "Entrance exam required",
      nano_price: "₹2,00,000/year (tuition)",
      avatar: "IH",
    },
    {
      name: "IIIT Hyderabad",
      role: "Info tech & AI focused",
      rating: 4.8,
      sessions: null,
      tags: ["AI", "Data Science", "PGDip"],
      macro_price: "Free course audits",
      micro_price: "Entrance exam required",
      nano_price: "₹1,80,000/year",
      avatar: "II",
    },
    {
      name: "upGrad",
      role: "Online degree programs",
      rating: 4.5,
      sessions: null,
      tags: ["PG Program", "Industry projects"],
      macro_price: "Free demo session",
      micro_price: "₹1,25,000 (structured)",
      nano_price: "₹2,50,000 (full PG)",
      avatar: "UG",
    },
    {
      name: "Great Learning",
      role: "AI & analytics programs",
      rating: 4.4,
      sessions: null,
      tags: ["Certificate", "AI", "Flexible"],
      macro_price: "Free intro modules",
      micro_price: "₹40,000 (certificate)",
      nano_price: "₹80,000 (full program)",
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
      macro_price: "10-day free trial",
      micro_price: "₹1,500/month",
      nano_price: "₹2,500/month (team)",
      avatar: "OR",
    },
    {
      name: "Udemy",
      role: "On-demand video courses",
      rating: 4.5,
      sessions: null,
      tags: ["Video", "Self-paced", "Affordable"],
      macro_price: "Free preview lessons",
      micro_price: "₹500–₹1,500/course",
      nano_price: "₹3,000 (personal plan)",
      avatar: "UD",
    },
    {
      name: "YouTube",
      role: "Free video tutorials",
      rating: 4.7,
      sessions: null,
      tags: ["Free", "Tutorials", "Channels"],
      macro_price: "Completely free",
      micro_price: "Free",
      nano_price: "Free (YouTube Premium optional)",
      avatar: "YT",
    },
    {
      name: "Medium / Towards DS",
      role: "Articles & community writing",
      rating: 4.6,
      sessions: null,
      tags: ["Articles", "Community", "Free tier"],
      macro_price: "Free (3 articles/month)",
      micro_price: "₹350/month (Member)",
      nano_price: "₹350/month (Member)",
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

  const items = useMemo(() => {
    return (MOCK_DATA[activeCategory] || []).filter(item => {
      if (!search.trim()) return true;
      const hay = `${item.name} ${item.role} ${item.tags.join(" ")}`.toLowerCase();
      return hay.includes(search.toLowerCase());
    });
  }, [activeCategory, search]);

  const activeCat = CATEGORIES.find(c => c.key === activeCategory);

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
        ].map(v => (
          <button
            key={v.key}
            className={`mp-view-btn ${activeView === v.key ? "mp-view-btn--active" : ""}`}
            onClick={() => setActiveView(v.key)}
          >
            <span className="mp-view-label">{v.label}</span>
            <span className="mp-view-desc">{v.desc}</span>
          </button>
        ))}
      </div>

      {/* Category tabs */}
      <div className="mp-cats">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            className={`mp-cat-btn ${activeCategory === cat.key ? "mp-cat-btn--active" : ""}`}
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

      {/* Cards */}
      <div className="mp-grid">
        {items.map((item, i) => {
          const price = getPriceForView(item, activeView);
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
                <div className={`mp-card-price ${isFree ? "mp-price-free" : ""}`}>{price}</div>
              </div>

              <button className="btn-primary mp-connect-btn">
                {getCtaLabel(activeCategory, activeView)}
              </button>
            </div>
          );
        })}
      </div>

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
        }
        .mp-view-btn {
          display: flex; flex-direction: column; gap: 2px;
          padding: 10px 18px; border-radius: var(--radius);
          border: 1.5px solid var(--border); background: var(--bg2);
          cursor: pointer; font-family: var(--font-body);
          text-align: left; transition: all 0.2s; flex: 1; min-width: 120px;
        }
        .mp-view-btn:hover { border-color: var(--accent); }
        .mp-view-btn--active { border-color: var(--accent); background: var(--accent-soft); }
        .mp-view-label { font-size: 13px; font-weight: 600; color: var(--text); }
        .mp-view-btn--active .mp-view-label { color: var(--accent2); }
        .mp-view-desc { font-size: 11px; color: var(--text3); }

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

        .mp-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 18px;
        }
        .mp-card { display: flex; flex-direction: column; gap: 14px; padding: 22px; }
        .mp-card-top { display: flex; align-items: center; gap: 14px; }
        .mp-avatar {
          width: 46px; height: 46px; border-radius: 12px;
          background: linear-gradient(135deg, var(--accent-soft), var(--blue-soft));
          color: var(--accent2); font-weight: 700; font-size: 14px;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .mp-card-name { font-size: 15px; font-weight: 600; color: var(--text); }
        .mp-card-role { font-size: 12px; color: var(--text2); margin-top: 2px; line-height: 1.4; }
        .mp-card-tags { display: flex; flex-wrap: wrap; gap: 6px; }
        .mp-card-bottom {
          display: flex; align-items: center; justify-content: space-between;
          padding-top: 10px; border-top: 1px solid var(--border);
        }
        .mp-card-rating { display: flex; align-items: center; gap: 5px; font-size: 13px; color: var(--text2); }
        .mp-sessions { color: var(--text3); }
        .mp-card-price { font-size: 14px; font-weight: 600; color: var(--accent2); }
        .mp-price-free { color: var(--accent); }
        .mp-connect-btn { width: 100%; justify-content: center; padding: 11px; font-size: 14px; }

        .mp-empty { text-align: center; padding: 48px; }
        .mp-empty-icon { display: flex; justify-content: center; color: var(--text3); margin-bottom: 12px; }
      `}</style>
    </div>
  );
}