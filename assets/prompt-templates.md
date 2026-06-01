# Naaviverse — Prompt Templates

## The Golden Rule
Every Claude call must:
1. Give Claude a clear ROLE
2. Label the USER INPUT clearly
3. Show the EXACT JSON schema to return
4. End with STRICT RULES (exact counts, no fluff)

---

## Main Prompt — Path Simulator

```
You are the Naaviverse career path engine.
Generate a structured learning path for this goal: "{goal}"

Respond ONLY with valid JSON. No markdown, no backticks, no explanation.

{
  "readiness_score": <integer between 5 and 30 for complete beginners>,
  "readiness_label": "<short phrase like 'Starting from scratch'>",
  "total_duration": "<e.g. 9-12 months>",
  "macro_path": [
    {
      "id": 1,
      "title": "<milestone title, max 5 words>",
      "duration": "<e.g. Months 1-3>",
      "description": "<one sentence explaining this phase>",
      "micro_steps": [
        {
          "week": "Week 1-2",
          "task": "<specific actionable task>",
          "resource": "<real course, book, or tool name>"
        }
      ]
    }
  ],
  "blind_spots": [
    "<one sentence — something most people miss>",
    "<one sentence — something most people miss>",
    "<one sentence — something most people miss>"
  ]
}

Rules:
- Exactly 4 macro milestones
- Exactly 3 micro steps per milestone
- Exactly 3 blind spots
- Use REAL resource names: freeCodeCamp, Coursera, specific books, YouTube channels, GitHub repos
- Readiness score must be between 5 and 25 for beginners
- Be specific — never say "learn programming", say "complete Python basics on freeCodeCamp"
- Blind spots must be surprising, not obvious
```

---

## Prompt Engineering Tips

### Do This
- ✅ "Exactly 4 macro milestones, 3 micro steps each"
- ✅ "Use REAL resource names: freeCodeCamp, Coursera, specific books"
- ✅ "Respond ONLY with valid JSON — no markdown, no backticks"
- ✅ "Be specific — never say 'learn programming', say 'complete Python basics on freeCodeCamp'"

### Never Do This
- ❌ "Generate some milestones" (too vague)
- ❌ "Suggest resources" (gets generic answers)
- ❌ No rules at the end (Claude adds extra text)

---

## Test Inputs (use these to test the app)

### Easy Goals
- "Become a Data Scientist"
- "Become a Full Stack Developer"
- "Become a UX Designer"
- "Learn Digital Marketing"

### Career Switch Goals
- "Switch from Marketing to Product Management"
- "Switch from Teaching to Software Engineering"
- "Switch from Accounting to Data Analysis"

### Specific Tech Goals
- "Break into AI/ML Engineering"
- "Become a DevOps Engineer"
- "Learn Cybersecurity from scratch"

### Best for Demo (most impressive outputs)
1. "Become a Data Scientist" — very structured, lots of known resources
2. "Switch from Marketing to Product Management" — surprising blind spots
3. "Break into AI/ML Engineering" — very specific micro steps
