# Naaviverse Path Simulator — Project Spec

## What Is This?
Naaviverse Path Simulator is an AI-powered career path generator.
A user types any career goal and instantly gets a full structured learning path.

## The Core Idea — 3 Layer Model
| Layer | What It Means | Example |
|-------|--------------|---------|
| **Macro** | Big milestones, 3–6 months each | "Learn Python Fundamentals" |
| **Micro** | Week-by-week breakdown | "Week 1–2: Complete Python basics on freeCodeCamp" |
| **Nano** | Specific resources per week | "freeCodeCamp Python, 2hrs/day" |

## What the App Does
1. User types a goal → e.g. "Become a Data Scientist"
2. AI generates a **Readiness Score** (where they currently stand)
3. AI generates **4 Macro Milestones** (the big phases)
4. User clicks any phase → sees **week-by-week Micro Steps**
5. Each micro step has a **real resource** (course, book, tool)
6. AI reveals **3 Blind Spots** (what most people miss)

## Tech Stack
| Part | Technology |
|------|-----------|
| Backend | Python + FastAPI |
| AI Model | Claude (claude-sonnet-4-20250514) |
| Frontend | React + CSS |
| Communication | REST API (JSON) |

## Target Users
- Students who don't know where to start
- Professionals who want to switch careers
- Self-learners with no structured guidance

## Design Principles
1. **Specific** — Real course names, real timelines, real tools
2. **Structured** — Every Claude response is JSON, rendered as UI
3. **Honest** — Readiness scores are low for beginners (5–25 range)
4. **Actionable** — Every insight has a concrete next step
