# Naaviverse Path Simulator — Architecture

## How It Works (Simple Flow)

```
User types goal (React)
        ↓
POST /api/path  (FastAPI)
        ↓
Claude API called with structured prompt
        ↓
Claude returns JSON (4 phases, micro steps, blind spots)
        ↓
React renders it as cards, progress bars, lists
```

## Backend — FastAPI (main.py)

### Single Endpoint
| Method | Route | Input | Output |
|--------|-------|-------|--------|
| POST | `/api/path` | `{ "goal": "string" }` | Path JSON |

### How It Works
1. Receives goal from frontend
2. Builds a prompt telling Claude to return JSON only
3. Calls Claude via Anthropic Python SDK
4. Strips any markdown formatting from response
5. Parses JSON and sends back to frontend

## Frontend — React

### Component Structure
```
App.jsx
└── PathSimulator.jsx
    ├── Goal input + Generate button
    ├── Example chips (clickable goals)
    ├── Loading state (animated dots)
    ├── Score Card (readiness score + progress bar)
    ├── Macro Cards (4 phase cards, clickable)
    ├── Detail Panel (micro steps, shown on click)
    └── Blind Spots section
```

## Claude Response Format (JSON Schema)
```json
{
  "readiness_score": 15,
  "readiness_label": "Starting from scratch",
  "total_duration": "9–12 months",
  "macro_path": [
    {
      "id": 1,
      "title": "Python & Stats Foundations",
      "duration": "Months 1–3",
      "description": "Build the mathematical and programming base",
      "micro_steps": [
        {
          "week": "Week 1–2",
          "task": "Complete Python basics",
          "resource": "freeCodeCamp Python Course"
        },
        {
          "week": "Week 3–4",
          "task": "Learn NumPy and Pandas",
          "resource": "Kaggle free Python course"
        },
        {
          "week": "Week 5–8",
          "task": "Statistics fundamentals",
          "resource": "StatQuest YouTube channel"
        }
      ]
    }
  ],
  "blind_spots": [
    "Most people skip statistics and regret it later",
    "Portfolio projects matter more than certifications",
    "SQL is used daily but almost never taught in ML courses"
  ]
}
```

## How to Run

### Step 1 — Backend
```bash
cd Naaviverse/code
pip install -r requirements.txt
set ANTHROPIC_API_KEY=your_key_here    # Windows
uvicorn main:app --reload --port 8001
```

### Step 2 — Frontend
```bash
cd Naaviverse/code/frontend
npm install
npm run dev
# Opens at http://localhost:5173
```
