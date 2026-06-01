import os
import re
import json
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))


class GoalRequest(BaseModel):
    goal: str


PROMPT_TEMPLATE = """You are the Naaviverse career path engine.
Generate a career journey for: "{goal}"

Respond ONLY with valid JSON. No markdown, no backticks, no explanation.

{{
  "readiness_score": <integer 5-35>,
  "readiness_label": "<short phrase>",
  "total_duration": "<e.g. 9-12 months>",
  "macro_path": [
    {{
      "id": 1,
      "title": "<max 5 words>",
      "duration": "<e.g. Months 1-3>",
      "description": "<2 sentences: what to do and why>",
      "macro_view": "<2 sentences: high-level purpose and outcome>",
      "micro_view": "<2 sentences: execution steps and measurable output>",
      "nano_view": "<2 sentences: what mentor support should focus on>",
      "marketplace": {{
        "macro_free": [
          {{
            "name": "<real free resource>",
            "type": "<Free course | YouTube | Docs | Community>",
            "why": "<1 sentence why this fits>",
            "next_step": "<specific action>",
            "tags": ["<tag>", "<tag>"]
          }},
          {{
            "name": "<real free resource>",
            "type": "<Free course | YouTube | Docs | Community>",
            "why": "<1 sentence why this fits>",
            "next_step": "<specific action>",
            "tags": ["<tag>", "<tag>"]
          }}
        ],
        "micro_structured": [
          {{
            "name": "<real paid resource>",
            "type": "<Course | Certification | Bootcamp>",
            "cost": "<realistic cost>",
            "duration": "<estimated duration>",
            "value": "<1 sentence value>",
            "next_step": "<specific action>",
            "tags": ["<tag>", "<tag>"]
          }},
          {{
            "name": "<real paid resource>",
            "type": "<Course | Certification | Bootcamp>",
            "cost": "<realistic cost>",
            "duration": "<estimated duration>",
            "value": "<1 sentence value>",
            "next_step": "<specific action>",
            "tags": ["<tag>", "<tag>"]
          }}
        ],
        "nano_expert": [
          {{
            "name": "<mentor or coaching option>",
            "type": "<Mentor | Coaching | Expert review>",
            "price": "<realistic price>",
            "session_details": "<format and duration>",
            "expected_outcomes": "<1 sentence outcome>",
            "tags": ["<tag>", "<tag>"]
          }},
          {{
            "name": "<mentor or coaching option>",
            "type": "<Mentor | Coaching | Expert review>",
            "price": "<realistic price>",
            "session_details": "<format and duration>",
            "expected_outcomes": "<1 sentence outcome>",
            "tags": ["<tag>", "<tag>"]
          }}
        ]
      }},
      "micro_steps": [
        {{"task": "<specific action>", "resource": "<real resource>"}},
        {{"task": "<specific action>", "resource": "<real resource>"}},
        {{"task": "<specific action>", "resource": "<real resource>"}}
      ]
    }}
  ]
}}

Rules:
- Exactly 8 macro milestones.
- Exactly 3 micro_steps per milestone.
- Exactly 2 macro_free, 2 micro_structured, 2 nano_expert per milestone.
- Use real, highly specific resource names: freeCodeCamp, Coursera, Kaggle, YouTube channels, GitHub repos, books, Khan Academy, MIT OpenCourseWare, specific textbooks.
- Tailor everything directly to the user's current position, goal, and profile.
- No filler, no placeholders, no repeated items.
- ABSOLUTELY NO REPETITIVE PHRASING OR BOILERPLATE: Every single step description and micro-step must be uniquely written and written in an active, varied voice. Never repeat identical sentences or templates like "Utilize online resources and textbooks to improve..." across steps.

- MANDATORY: ENFORCE DEEP DIFFERENTIATION BASED ON USER PROFILE KEYS:
  * Curriculum / Board:
    - "CBSE": Focus on NCERT-based core. Bridge the gap to global admissions with Advanced Placement (AP) exams, SATs, and competitive profile building, or local competitive prep (JEE, NEET, CUET).
    - "ICSE" / "ISC": Emphasize ISC's high-level English/science curriculum. Guide them to leverage their project-heavy foundation for research papers and standardized tests.
    - "State Board": Target textbook-heavy learning. Strongly emphasize taking online courses (Khan Academy, MIT OCW, Coursera) to build analytical thinking, concept depth, and a robust global profile.
    - "IB" (International Baccalaureate): Align milestones directly with IB's Extended Essay (EE), Theory of Knowledge (TOK), and Creativity, Activity, Service (CAS) projects.
    - "IGCSE" / "A-Levels": Leverage early subject specialization. Suggest aligning specific A-Level subjects with college prerequisites and technical rigor.
    - "University": Stop all high-school elements! Focus purely on collegiate GPAs, technical internships, research publications, networking on LinkedIn, and technical masterclasses.
    - "Other": Adapt specifically to their customized educational background.
  * Grade / Class:
    - If in school (Grade 9-12): Milestones must be chronological prep milestones spanning high school semesters up to college admission.
    - If in college (University / B.Tech): Milestones must be semester-by-semester collegiate progress, technical internships, and job/higher-ed prep.
  * Financial Situation (Budget):
    - "Limited budget": Suggest only zero-cost, high-impact strategies. Include Coursera financial aid, library books, YouTube, freeCodeCamp, and fee waivers.
    - "Moderate budget": Recommend standard certifications, Udemy/Coursera paid courses, and high-ROI books.
    - "Comfortable": Suggest premium bootcamps, certified masterclasses, private tutors, and direct expert counseling.
  * Personality Type:
    - "Introvert": Weave in self-paced studying, open-source coding, writing blogs, independent mock test preps, and remote portfolio building.
    - "Extrovert" / "Social": Recommend collaborative hackathons, starting/joining student clubs, volunteer leadership, and active group networking.
    - "Analytical": Highlight data-driven logic, coding, algorithmic challenges, and quantitative problem-solving.
    - "Creative": Highlight building portfolio projects, visual mockup design, UI/UX, prototyping, and creative brainstorming.
  * Location Context:
    - Use their city/state/country to suggest local opportunities (e.g. regional testing sites, state-level Olympiads, local community centers, or regional industry hubs for internships).
"""


@app.post("/api/path")
async def generate_path(req: GoalRequest):
    if not req.goal.strip():
        raise HTTPException(status_code=400, detail="Goal cannot be empty")

    prompt = PROMPT_TEMPLATE.format(goal=req.goal.strip())

    try:
        response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
            max_tokens=8192,
            temperature=0.55,
            messages=[
                {
                    "role": "system",
                    "content": "You are a career path engine. Always respond with valid JSON only. No markdown, no backticks, no explanation. Start your response with { and end with }",
                },
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Groq API error: {str(e)}")

    raw = response.choices[0].message.content.strip()

    # Strip markdown fences if any
    raw = re.sub(r"```(?:json)?", "", raw).strip().strip("`").strip()

    # Extract JSON object — grab everything between first { and last }
    match = re.search(r'\{.*\}', raw, re.DOTALL)
    if match:
        raw = match.group(0)
    else:
        raise HTTPException(status_code=500, detail=f"No JSON found in response. Raw: {raw[:300]}")

    try:
        return json.loads(raw)
    except json.JSONDecodeError as e:
        raise HTTPException(
            status_code=500,
            detail=f"Invalid JSON: {e} | Raw start: {raw[:300]}",
        )


# Serve React frontend if built
from fastapi.staticfiles import StaticFiles

dist_path = os.path.join(os.path.dirname(__file__), "frontend", "dist")
if os.path.exists(dist_path):
    app.mount("/", StaticFiles(directory=dist_path, html=True), name="static")