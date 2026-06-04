import os
import re
import json
import asyncio
import datetime
import time
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from groq import Groq, AsyncGroq
from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
from models import StudentProfileModel

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))
async_client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY"))

# MongoDB Setup
MONGODB_URI = os.environ.get("MONGODB_URI")
if not MONGODB_URI:
    raise ValueError("MONGODB_URI environment variable is missing from .env")
db_client = AsyncIOMotorClient(MONGODB_URI)
db = db_client.get_database("naaviagent")
profiles_collection = db.profiles
pending_paths_collection = db.pending_paths
published_paths_collection = db.published_paths

@app.on_event("startup")
async def startup_db_init():
    try:
        existing_cols = await db.list_collection_names()
        for col in ["profiles", "pending_paths", "published_paths"]:
            if col not in existing_cols:
                await db.create_collection(col)
                print(f"[MongoDB] Created collection '{col}' successfully.")
    except Exception as e:
        print(f"[MongoDB Init Warning] Could not pre-create collections: {e}")

# Models
class PathGenerationRequest(BaseModel):
    current_position: str
    target_goal: str
    profile: Optional[dict] = None

class PathAuditRequest(BaseModel):
    blueprint: dict
    current_position: str
    target_goal: str
    profile: Optional[dict] = None

class GoalRequest(BaseModel):
    # Backward compatibility
    goal: str

class UpdatePathRequest(BaseModel):
    roadmap_data: dict
    status: str = "published"

def serialize_mongo_doc(doc):
    if not doc:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    if "created_at" in doc and doc["created_at"]:
        doc["created_at"] = doc["created_at"].isoformat()
    if "updated_at" in doc and doc["updated_at"]:
        doc["updated_at"] = doc["updated_at"].isoformat()
    return doc

# ─── AGENT 1: BLUEPRINT GENERATOR PROMPT ──────────────────────────────────
AGENT_1_PROMPT = """You are the Naaviverse career blueprint generator (Agent 1).
Your task is to draft the initial raw career roadmap based on:
- Current Position: {current_position}
- Target Career Goal: {target_goal}
- Student Profile Details: {profile}

Respond ONLY with valid JSON. No markdown, no backticks, no explanation.

{{
  "path_title": "Academic Pathway from {current_position} to {target_goal}",
  "path_description": "A comprehensive pedagogical pathway designed to take a student from {current_position} to a target career or academic destination of {target_goal}.",
  "readiness_score": 15,
  "readiness_label": "High School Starter",
  "total_duration": "12 months",
  "macro_path": [
    {{
      "id": 1,
      "title": "<step/milestone title>",
      "duration": "Months 1-3",
      "description": "<detailed step description (at least 3 to 4 comprehensive sentences) outlining exactly what academics, study plans, or profile goals to focus on during this step, why this is critical, and how it strategically prepares the student for {target_goal}>",
      "learning_objectives": [
        "<learning objective 1>",
        "<learning objective 2>",
        "<learning objective 3>"
      ],
      "macro_view": "<2-3 sentence strategic paragraph explaining the BIG PICTURE PURPOSE of this milestone — what overarching academic goal it advances, why it is a critical foundation within the roadmap, and how mastering it unlocks the next stage of academic progression>",
      "micro_view": "<2-3 sentence strategic paragraph describing the PRECISE EXECUTION OUTPUT — what specific academic tasks, coursework, study plans, and concrete deliverables the student must complete within this phase, and how each directly contributes to the milestone outcome>",
      "nano_view": "<2-3 sentence strategic paragraph outlining the MENTOR GUIDANCE FOCUS — what diagnostic checks, expert review sessions, peer critiques, and accountability checkpoints should happen in this phase, and how targeted expert feedback validates readiness to advance>",
      "marketplace": {{
        "macro_free": [
          {{
            "name": "<free course or resource>",
            "type": "<Free course | YouTube | Docs | Community>",
            "why": "<why this fits>",
            "next_step": "<specific action>",
            "tags": ["<tag>", "<tag>"]
          }},
          {{
            "name": "<free course or resource>",
            "type": "<Free course | YouTube | Docs | Community>",
            "why": "<why this fits>",
            "next_step": "<specific action>",
            "tags": ["<tag>", "<tag>"]
          }}
        ],
        "micro_structured": [
          {{
            "name": "<paid course or resource>",
            "type": "<Course | Certification | Book | Bootcamp>",
            "cost": "<realistic cost>",
            "duration": "<duration>",
            "value": "<value proposition>",
            "next_step": "<specific action>",
            "tags": ["<tag>", "<tag>"]
          }},
          {{
            "name": "<paid course or resource>",
            "type": "<Course | Certification | Book | Bootcamp>",
            "cost": "<realistic cost>",
            "duration": "<duration>",
            "value": "<value proposition>",
            "next_step": "<specific action>",
            "tags": ["<tag>", "<tag>"]
          }}
        ],
        "nano_expert": [
          {{
            "name": "<mentor option>",
            "type": "<Mentor | Coaching | Expert review>",
            "price": "<realistic price>",
            "session_details": "<format>",
            "expected_outcomes": "<expected outcome>",
            "tags": ["<tag>", "<tag>"]
          }},
          {{
            "name": "<mentor option>",
            "type": "<Mentor | Coaching | Expert review>",
            "price": "<realistic price>",
            "session_details": "<format>",
            "expected_outcomes": "<expected outcome>",
            "tags": ["<tag>", "<tag>"]
          }}
        ]
      }},
      "micro_steps": [
        {{"task": "<specific task action>", "resource": "<real resource>"}},
        {{"task": "<specific task action>", "resource": "<real resource>"}},
        {{"task": "<specific task action>", "resource": "<real resource>"}}
      ]
    }}
  ]
}}

Rules:
- Exactly 4 macro milestones/steps in macro_path.
- Exactly 3 micro_steps tasks per step.
- Exactly 3 learning_objectives per step.
- Exactly 2 macro_free, 2 micro_structured, and 2 nano_expert per step in the marketplace block.
- Avoid repeated resource names. Suggest highly specific resources like freeCodeCamp, Coursera, MIT OCW, Khan Academy, specific textbooks.
- Deeply differentiate based on profile grade, curriculum (CBSE vs. IB vs. University), financial budget, stream, personality type, and location.
- Each step description MUST be a rich, detailed, multi-sentence paragraph (3-4 sentences). Do NOT provide short, generic, or single-sentence descriptions. Make them highly academic, pedagogical, and context-specific.
- CRITICAL NAME BAN: NEVER mention the student's personal name (e.g. Sunkara, Chaitanya, Praneeth) or email or personal pronouns in any text fields (titles, descriptions, views, checklist tasks, or objectives). Focus purely on objective, academic instructions, and explain what the main academic use, objectives, and execution steps of the milestone are.
"""

# ─── AGENT 2: PATH AUDIT AGENT PROMPT ────────────────────────────────────────
AGENT_2_PROMPT = """You are the Naaviverse Path Audit Agent (Agent 2).
Your purpose is to validate and improve the overall roadmap's path-level information.
Audited Goals:
- Target Career Goal: {target_goal}
- Student Current Position & Profile: {current_position} | {profile}

Given this raw blueprint JSON, review and audit:
1. The overall "path_title" (Is it clear, accurate, and aligned with target goal?)
2. The overall "path_description" (Is it a professional, highly relevant, multi-sentence strategic summary?)
3. Estimate a realistic "readiness_score" (0-100) and "readiness_label" (e.g. Early Starter, Advanced, intermediate).
4. Highlight critical "blind_spots" (gaps, potential constraints, or warnings based on their profile).
5. CRITICAL NAME BAN: Verify that the overall path title and description NEVER mention the student's personal name, email, or personal pronouns. If any names are present, rewrite the text to be completely objective, focusing purely on explaining the main strategic direction of this pathway.

Output ONLY a valid JSON object of this structure:
{{
  "path_title": "<audited and refined Path Title>",
  "path_description": "<audited and refined detailed multi-sentence Path Description>",
  "readiness_score": <updated integer 0-100 based on profile readiness>,
  "readiness_label": "<updated readiness description>",
  "blind_spots": [
    "<warning or critical gap 1 based on profile constraints>",
    "<warning or critical gap 2 based on profile constraints>"
  ]
}}

Blueprint JSON to Audit:
{blueprint}
"""

# ─── AGENT 3: STEPS AND VIEWS AUDIT AGENT PROMPT ─────────────────────────────
AGENT_3_PROMPT = """You are the Naaviverse Steps and Views Audit Agent (Agent 3).
Your purpose is to validate the roadmap's execution structure, milestones, learning views, and micro checklists.
Audited Goals:
- Target Career Goal: {target_goal}
- Student Current Position & Profile: {current_position} | {profile}

Given this blueprint JSON containing steps and views, review and audit:
1. Each step's "title" and "duration" (Ensure logical progression).
2. Each step's "description" (Must be a rich, detailed, multi-sentence strategic paragraph of 3-4 sentences detailing the main academic utility).
3. The step's "learning_objectives" (Verify they align with target learning outcomes).
4. The step's "macro_view" (Must be a rich 2-3 sentence paragraph clearly explaining the BIG PICTURE PURPOSE — the overarching academic goal this milestone advances and why it is a critical foundation in the roadmap).
5. The step's "micro_view" (Must be a rich 2-3 sentence paragraph describing the PRECISE EXECUTION OUTPUT — the exact academic tasks, deliverables, and coursework the student must complete to finish this phase).
6. The step's "nano_view" (Must be a rich 2-3 sentence paragraph explaining the MENTOR GUIDANCE FOCUS — the diagnostic checks, expert review sessions, and accountability checkpoints that validate readiness to advance).
7. The step's "micro_steps" checklist tasks (Make sure they are hyper-specific, actionable, and tailored to the student's curriculum/grade).
8. CRITICAL NAME BAN: Strictly verify that NONE of the step titles, durations, descriptions, learning objectives, views (macro, micro, nano), or micro_steps tasks contain the student's personal name, email, or direct pronouns. Rewrite all fields to be completely objective, professional, and academic, focusing entirely on what the step achieves, how to execute it, and how to complete the step successfully.

Output ONLY a valid JSON array of this structure:
[
  {{
    "id": 1,
    "title": "<audited step title>",
    "duration": "<audited duration>",
    "description": "<audited rich detailed multi-sentence description (3-4 sentences)>",
    "learning_objectives": [
      "<audited learning objective 1>",
      "<audited learning objective 2>",
      "<audited learning objective 3>"
    ],
    "macro_view": "<audited/refined macro view text>",
    "micro_view": "<audited/refined micro view text>",
    "nano_view": "<audited/refined nano view text>",
    "micro_steps": [
      {{"task": "<actionable task 1>", "resource": "<real specific resource>"}},
      {{"task": "<actionable task 2>", "resource": "<real specific resource>"}},
      {{"task": "<actionable task 3>", "resource": "<real specific resource>"}}
    ]
  }},
  ... for all 4 steps ...
]

Blueprint JSON to Audit:
{blueprint}
"""

# ─── AGENT 4: MARKETPLACE AUDIT AGENT PROMPT ──────────────────────────────────
AGENT_4_PROMPT = """You are the Naaviverse Marketplace Audit Agent (Agent 4).
Your purpose is to validate all learning resource marketplace recommendations generated across each milestone's Macro, Micro, and Nano views.
Audited Goals:
- Target Career Goal: {target_goal}
- Student Current Position & Profile: {current_position} | {profile}

Given this blueprint JSON, review the "marketplace" block for each step.
Ensure resources:
1. Match the budget limits (Limited budget => free/low cost, comfortable => high quality bootcamps/mentors).
2. Match learning/personality traits (Introvert => self-paced, Extrovert => hackathons/cooperative).
3. Are highly reputable, real-world educational resources (e.g. Khan Academy, Coursera, MIT OCW, specific standard prep books).
4. Pricing and next steps are realistic, detailed, and actionable.
5. CRITICAL NAME BAN: Ensure that no marketplace recommendations, why details, next steps, or outcomes contain the student's personal name, email, or pronouns. Keep all text objective and general.

Output ONLY a valid JSON array of this structure:
[
  {{
    "id": 1,
    "marketplace": {{
      "macro_free": [
        {{
          "name": "<audited free resource name>",
          "type": "<Free course | YouTube | Docs | Community>",
          "why": "<why this fits the macro view>",
          "next_step": "<specific next action>",
          "tags": ["<tag>", "<tag>"]
        }},
        ... 2 items ...
      ],
      "micro_structured": [
        {{
          "name": "<audited paid resource name>",
          "type": "<Course | Certification | Book | Bootcamp>",
          "cost": "<cost>",
          "duration": "<duration>",
          "value": "<value proposition for the micro view>",
          "next_step": "<specific enrollment action>",
          "tags": ["<tag>", "<tag>"]
        }},
        ... 2 items ...
      ],
      "nano_expert": [
        {{
          "name": "<audited mentor or expert service>",
          "type": "<Mentor | Coaching | Expert review>",
          "price": "<price>",
          "session_details": "<session details>",
          "expected_outcomes": "<expected outcomes for the nano view>",
          "tags": ["<tag>", "<tag>"]
        }},
        ... 2 items ...
      ]
    }}
  }},
  ... for all 4 steps ...
]

Blueprint JSON to Audit:
{blueprint}
"""

# ─── POST-PROCESSING: PERSONAL NAME SANITIZER ─────────────────────────────────
def build_name_patterns(profile: dict, current_position: str = "") -> list:
    """Extract all personal name tokens from the profile that should be scrubbed."""
    tokens = []
    # Extract from profile fields
    for field in ["name", "full_name", "first_name", "last_name", "email"]:
        val = profile.get(field, "")
        if val and isinstance(val, str):
            # For email, take the part before @
            if "@" in val:
                val = val.split("@")[0]
            # Split into individual tokens (e.g. "Sunkara Chaitanya Praneeth" -> 3 tokens)
            for token in val.replace("_", " ").replace(".", " ").split():
                cleaned = token.strip()
                if len(cleaned) > 2:  # ignore very short tokens like "K"
                    tokens.append(cleaned)
    return list(set(tokens))

def sanitize_text(text: str, name_tokens: list) -> str:
    """Replace personal name occurrences in a text string with objective phrasing."""
    if not text or not name_tokens:
        return text
    result = text
    # Build a combined regex to match full-name sequences first (e.g. "Sunkara Chaitanya Praneeth")
    # then individual tokens
    for token in sorted(name_tokens, key=len, reverse=True):  # longest first
        # Match token as a whole word, case-insensitive
        pattern = re.compile(r'\b' + re.escape(token) + r'\b', re.IGNORECASE)
        # Replace contextual phrases like "for Chaitanya to" -> "to"
        result = re.sub(
            r'\bfor\s+' + re.escape(token) + r'\s+to\b',
            'to', result, flags=re.IGNORECASE
        )
        result = re.sub(
            r'\b' + re.escape(token) + r"'s\b",
            "the student's", result, flags=re.IGNORECASE
        )
        result = pattern.sub('the student', result)
    # Clean up double "the student the student" artifacts
    result = re.sub(r'\bthe student the student\b', 'the student', result, flags=re.IGNORECASE)
    # Clean double spaces
    result = re.sub(r'  +', ' ', result).strip()
    return result

def recursive_sanitize(obj, name_tokens: list):
    """Recursively traverse and sanitize all string fields in a dict/list."""
    if isinstance(obj, str):
        return sanitize_text(obj, name_tokens)
    elif isinstance(obj, dict):
        return {k: recursive_sanitize(v, name_tokens) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [recursive_sanitize(item, name_tokens) for item in obj]
    return obj

# Helper to query Groq and extract clean JSON with model fallbacks
async def query_groq_json(prompt: str, preferred_model: str = "llama-3.1-8b-instant") -> dict:
    models = [
        preferred_model,
        "llama-3.1-8b-instant",
        "meta-llama/llama-4-scout-17b-16e-instruct",
        "openai/gpt-oss-20b",
        "qwen/qwen3-32b",
        "llama-3.3-70b-versatile",
        "openai/gpt-oss-120b",
        "groq/compound"
    ]



    # Deduplicate while preserving order (preferred_model may already be one of the fallbacks)
    seen = set()
    unique_models = []
    for m in models:
        if m not in seen:
            seen.add(m)
            unique_models.append(m)

    last_err = None
    for m in unique_models:
        try:
            # Increase max_tokens significantly — richer prompts need more output tokens
            if "70b" in m or "120b" in m or "32b" in m or "17b" in m:
                max_tok = 8000
            else:
                max_tok = 4000

            response = await async_client.chat.completions.create(
                model=m,
                max_tokens=max_tok,
                temperature=0.3,
                messages=[
                    {
                        "role": "system",
                        "content": (
                            "You are a career path database sub-agent. "
                            "Always respond with valid, complete JSON only. "
                            "No markdown, no backticks, no explanations. "
                            "Start immediately with { or [ and end with } or ]. "
                            "NEVER truncate your response. Complete the full JSON structure."
                        ),
                    },
                    {"role": "user", "content": prompt},
                ],
            )
            raw = response.choices[0].message.content.strip()
            # Strip markdown fences if present
            raw = re.sub(r"```(?:json)?", "", raw).strip().strip("`").strip()

            # Extract the outermost JSON object or array
            match = re.search(r'(\{.*\}|\[.*\])', raw, re.DOTALL)
            if match:
                raw = match.group(0)

            # Attempt direct parse
            try:
                return json.loads(raw)
            except json.JSONDecodeError as json_err:
                # Attempt partial JSON recovery: try to close unclosed brackets
                print(f"[JSON Recovery] Attempting to repair truncated JSON from model {m}. Error at char {json_err.pos}.")
                # Truncate to last valid position and try to close structures
                truncated = raw[:json_err.pos].rstrip().rstrip(",").rstrip()
                # Count unclosed braces/brackets
                opens = truncated.count("{") - truncated.count("}")
                open_arrays = truncated.count("[") - truncated.count("]")
                closing = "]" * open_arrays + "}" * opens
                repaired = truncated + closing
                try:
                    result = json.loads(repaired)
                    print(f"[JSON Recovery] Successfully repaired truncated JSON from model {m}.")
                    return result
                except Exception:
                    raise json_err  # Let the outer except catch it and try next model

        except Exception as e:
            print(f"[Groq Call Failed for model {m}] trying next fallback. Error: {e}")
            last_err = e
            continue

    print(f"[Groq Critical Failure] All models exhausted. Final error: {last_err}")
    return {}


# Pedagogical High-Fidelity Fallback Roadmap in case of a complete API lockout
def get_fallback_mock_roadmap(current: str, goal: str, profile: dict) -> dict:
    return {
        "path_title": f"Academic Pathway to {goal}",
        "path_description": f"A comprehensive pedagogical blueprint designed to take a student from {current} to the target academic goal: {goal}.",
        "readiness_score": 30,
        "readiness_label": "Early Starter",
        "total_duration": "12 months",
        "blind_spots": [
            "Lacks formal international exposure - needs IELTS/SAT preparation.",
            "Needs structured extracurricular profile development for university entrance."
        ],
        "macro_path": [
            {
                "id": 1,
                "title": "Foundation and Profile Architecture",
                "duration": "Months 1-3",
                "description": f"Focus on core curriculum and start profile planning for {goal}.",
                "learning_objectives": [
                    "Establish a solid intellectual foundation in core academic subjects.",
                    "Execute initial SAT/ACT/IELTS diagnostic assessments.",
                    "Draft the strategic academic roadmap and goal setting."
                ],
                "macro_view": "Lay the intellectual and strategic foundation for target admissions.",
                "micro_view": "Establish excellent marks in core subjects and draft a portfolio outline.",
                "nano_view": "Mentorship should focus on diagnostic assessments and target setting.",
                "marketplace": {
                    "macro_free": [
                        {"name": "Khan Academy NCERT Prep", "type": "Free course", "why": "Builds solid fundamentals.", "next_step": "Complete 3 modules weekly.", "tags": ["academics", "foundations"]},
                        {"name": "YouTube - International Admissions Guide", "type": "YouTube", "why": "Explains timeline.", "next_step": "Watch admissions overview video.", "tags": ["admissions", "timeline"]}
                    ],
                    "micro_structured": [
                        {"name": "Coursera Academic Writing", "type": "Course", "cost": "Free to Audit", "duration": "4 weeks", "value": "Teaches university essay style.", "next_step": "Enroll today", "tags": ["writing", "skills"]},
                        {"name": "SAT Prep Official Guide", "type": "Book", "cost": "$25", "duration": "Self-paced", "value": "Essential practice tests.", "next_step": "Purchase on Amazon", "tags": ["SAT", "prep"]}
                    ],
                    "nano_expert": [
                        {"name": "Naavi Academic Mentor", "type": "Mentor", "price": "Included", "session_details": "1-on-1 session", "expected_outcomes": "Profile roadmapping and gap analysis.", "tags": ["1on1", "guidance"]},
                        {"name": "Naavi Essay Advisor", "type": "Expert review", "price": "Included", "session_details": "Review portal", "expected_outcomes": "Personal statement review.", "tags": ["essay", "curation"]}
                    ]
                },
                "micro_steps": [
                    {"task": "Complete diagnostic mock academic test", "resource": "Khan Academy"},
                    {"task": "Draft initial 1-page personal profile essay", "resource": "Google Docs"},
                    {"task": "Register for SAT/ACT test window calendar", "resource": "CollegeBoard"}
                ]
            },
            {
                "id": 2,
                "title": "Bridging Regional Gaps",
                "duration": "Months 4-6",
                "description": "Engage in extracurricular enhancements and academic bridging exams.",
                "learning_objectives": [
                    "Formulate a structured extracurricular profile with targeted projects.",
                    "Bridge subject gaps with advanced subject masterclasses.",
                    "Initiate independent academic study and secondary diagnostics."
                ],
                "macro_view": "Target global admissions rigor by proving high-level aptitude.",
                "micro_view": "Initiate personal academic project and enroll in AP exams if applicable.",
                "nano_view": "Mentorship should focus on independent study skills and research methods.",
                "marketplace": {
                    "macro_free": [
                        {"name": "MIT OpenCourseWare Intro Lectures", "type": "Free course", "why": "Experience collegiate depth.", "next_step": "Watch first 5 lecture units.", "tags": ["MIT", "academic"]},
                        {"name": "GitHub Open Source projects", "type": "Community", "why": "Collaborative project building.", "next_step": "Find a beginner issue to patch.", "tags": ["open-source", "coding"]}
                    ],
                    "micro_structured": [
                        {"name": "Udemy Subject Masterclass", "type": "Course", "cost": "$15", "duration": "12 hours", "value": "Advanced topic deep-dives.", "next_step": "Buy during discount window", "tags": ["mastery", "skills"]},
                        {"name": "Princeton Review Prep Book", "type": "Book", "cost": "$30", "duration": "Self-paced", "value": "Great question bank.", "next_step": "Buy print version", "tags": ["prep", "AP"]}
                    ],
                    "nano_expert": [
                        {"name": "Naavi Subject Specialist", "type": "Coaching", "price": "Included", "session_details": "Weekly checkins", "expected_outcomes": "Advanced academic support.", "tags": ["subject", "tutoring"]},
                        {"name": "Naavi ExtraCurricular Coach", "type": "Mentor", "price": "Included", "session_details": "1-on-1 session", "expected_outcomes": "Project scoping and feedback.", "tags": ["projects", "mentorship"]}
                    ]
                },
                "micro_steps": [
                    {"task": "Start a personal project repository or research paper draft", "resource": "GitHub/Google Scholar"},
                    {"task": "Enroll in and begin Advanced Placement (AP) preparation", "resource": "AP Central"},
                    {"task": "Take a diagnostic English proficiency test", "resource": "IELTS/TOEFL Practice"}
                ]
            },
            {
                "id": 3,
                "title": "Extracurricular Profile Rigor",
                "duration": "Months 7-9",
                "description": "Solidify the application profile with projects, contests, and papers.",
                "learning_objectives": [
                    "Publish or finalize independent research/projects.",
                    "Compile outstanding letters of recommendation and credentials.",
                    "Achieve targeted official scores on English proficiency tests."
                ],
                "macro_view": "Differentiate from other applicants through tangible accomplishments.",
                "micro_view": "Complete academic projects and request recommendation letters.",
                "nano_view": "Mentorship should focus on reference letters and essay fine-tuning.",
                "marketplace": {
                    "macro_free": [
                        {"name": "Overleaf LaTeX Editor", "type": "Docs", "why": "Format academic publications.", "next_step": "Create a free student account.", "tags": ["academic", "LaTeX"]},
                        {"name": "LinkedIn Student Groups", "type": "Community", "why": "Networking with alumni.", "next_step": "Connect with 5 target school alumni.", "tags": ["networking", "social"]}
                    ],
                    "micro_structured": [
                        {"name": "IELTS Official Practice Materials", "type": "Certification", "cost": "$40", "duration": "2 weeks", "value": "Best official practice.", "next_step": "Book standard test slot", "tags": ["English", "IELTS"]},
                        {"name": "Coursera Data Analytics Spec", "type": "Course", "cost": "$49", "duration": "6 weeks", "value": "Adds premium tech badge to CV.", "next_step": "Enroll on Coursera", "tags": ["skills", "CV"]}
                    ],
                    "nano_expert": [
                        {"name": "Naavi Admissions Counselor", "type": "Coaching", "price": "Included", "session_details": "Review session", "expected_outcomes": "Admissions strategy alignment.", "tags": ["counselor", "college"]},
                        {"name": "Naavi Project Reviewer", "type": "Expert review", "price": "Included", "session_details": "Video report", "expected_outcomes": "Complete portfolio critique.", "tags": ["critique", "expert"]}
                    ]
                },
                "micro_steps": [
                    {"task": "Finalize draft of research paper or personal project code", "resource": "Overleaf / GitHub"},
                    {"task": "Draft list of recommenders and request recommendation letters", "resource": "School/College Faculty"},
                    {"task": "Complete official IELTS/TOEFL standard examination", "resource": "British Council / ETS"}
                ]
            },
            {
                "id": 4,
                "title": "Application Submission & Curation",
                "duration": "Months 10-12",
                "description": f"Submit premium applications to target destination: {goal}.",
                "learning_objectives": [
                    "Submit error-free Common App or university dossiers.",
                    "Ace academic and admissions committee interviews.",
                    "Secure entry study permits and visas successfully."
                ],
                "macro_view": "Successfully transition from prep to active matriculation.",
                "micro_view": "Submit all application portals and prepare for academic interviews.",
                "nano_view": "Mentorship should focus on mock interviews and visa preparations.",
                "marketplace": {
                    "macro_free": [
                        {"name": "Common App Admissions Guides", "type": "Docs", "why": "Official platform walkthroughs.", "next_step": "Review submission checklist.", "tags": ["admissions", "portal"]},
                        {"name": "YouTube Mock Admissions Interviews", "type": "YouTube", "why": "Understand expectations.", "next_step": "Watch 3 mock interviews.", "tags": ["interview", "prep"]}
                    ],
                    "micro_structured": [
                        {"name": "Visa Application Fee", "type": "Certification", "cost": "Variable", "duration": "4 weeks", "value": "Required for international entry.", "next_step": "Pay on portal", "tags": ["visa", "process"]},
                        {"name": "Target School Application Fee", "type": "Bootcamp", "cost": "$75", "duration": "Immediate", "value": "Submits application dossier.", "next_step": "Pay fee on submission", "tags": ["submission", "dossier"]}
                    ],
                    "nano_expert": [
                        {"name": "Naavi Interview Coach", "type": "Coaching", "price": "Included", "session_details": "Mock interviews", "expected_outcomes": "Complete interview confidence.", "tags": ["interview", "mock"]},
                        {"name": "Naavi Visa Counselor", "type": "Coaching", "price": "Included", "session_details": "Document check", "expected_outcomes": "Visa document checklist approval.", "tags": ["visa", "counselor"]}
                    ]
                },
                "micro_steps": [
                    {"task": "Submit completed Common App or direct university application dossiers", "resource": "Admissions Portal"},
                    {"task": "Participate in admissions panel mock interviews and direct interviews", "resource": "Zoom / Admissions Panel"},
                    {"task": "Compile and file visa entry and study permit documents", "resource": "Immigration Portal"}
                ]
            }
        ]
    }

# Specialized Audit Tasks
async def run_agent_1_blueprint(current: str, goal: str, profile: dict) -> dict:
    prompt = AGENT_1_PROMPT.format(
        current_position=current,
        target_goal=goal,
        profile=json.dumps(profile)
    )
    print("[Agent 1] Generating initial roadmap blueprint using 8B (with 70B fallback)...")
    res = await query_groq_json(prompt, preferred_model="llama-3.1-8b-instant")
    
    # If the daily token limit is exhausted, query_groq_json returns {}
    if not res or "macro_path" not in res:
        print("[Rate Limit Warning] Daily token limit exceeded. Serving board-calibrated fallback roadmap.")
        # Try the larger model before falling back to the static mock.
        res = await query_groq_json(prompt, preferred_model="llama-3.3-70b-versatile")
        if not res or "macro_path" not in res:
            # Full lockout: serve high-fidelity static mock custom-built for CBSE/Cambridge
            return get_fallback_mock_roadmap(current, goal, profile)
    return res

async def run_agent_2_path_auditor(blueprint: dict, current: str, goal: str, profile: dict) -> dict:
    # CONTEXT COMPRESSION: Send only path-level attributes. Save thousands of tokens!
    compressed_blueprint = {
        "path_title": blueprint.get("path_title", ""),
        "path_description": blueprint.get("path_description", ""),
        "readiness_score": blueprint.get("readiness_score", 15),
        "readiness_label": blueprint.get("readiness_label", ""),
        "blind_spots": blueprint.get("blind_spots", [])
    }
    prompt = AGENT_2_PROMPT.format(
        current_position=current,
        target_goal=goal,
        profile=json.dumps(profile),
        blueprint=json.dumps(compressed_blueprint)
    )
    print("[Agent 2] Auditing overall path title, description, and readiness using 8B...")
    return await query_groq_json(prompt, preferred_model="llama-3.1-8b-instant")

async def run_agent_3_steps_auditor(blueprint: dict, current: str, goal: str, profile: dict) -> list:
    # CONTEXT COMPRESSION: Send step metadata, views, and checklists. Skip marketplace to save tokens!
    compressed_blueprint = [
        {
            "id": m["id"],
            "title": m["title"],
            "duration": m["duration"],
            "description": m["description"],
            "learning_objectives": m.get("learning_objectives", []),
            "macro_view": m.get("macro_view", ""),
            "micro_view": m.get("micro_view", ""),
            "nano_view": m.get("nano_view", ""),
            "micro_steps": m.get("micro_steps", [])
        }
        for m in blueprint.get("macro_path", [])
    ]
    prompt = AGENT_3_PROMPT.format(
        current_position=current,
        target_goal=goal,
        profile=json.dumps(profile),
        blueprint=json.dumps(compressed_blueprint)
    )
    print("[Agent 3] Auditing steps, learning views, and checklists using 8B...")
    res = await query_groq_json(prompt, preferred_model="llama-3.1-8b-instant")
    return res if isinstance(res, list) else []

async def run_agent_4_marketplace_auditor(blueprint: dict, current: str, goal: str, profile: dict) -> list:
    # CONTEXT COMPRESSION: Send only milestone ids and resource structures. Save ~5000 tokens!
    compressed_blueprint = [
        {
            "id": m["id"],
            "title": m["title"],
            "marketplace": m.get("marketplace", {})
        }
        for m in blueprint.get("macro_path", [])
    ]
    prompt = AGENT_4_PROMPT.format(
        current_position=current,
        target_goal=goal,
        profile=json.dumps(profile),
        blueprint=json.dumps(compressed_blueprint)
    )
    print("[Agent 4] Auditing resource marketplace selections using 8B...")
    res = await query_groq_json(prompt, preferred_model="llama-3.1-8b-instant")
    return res if isinstance(res, list) else []



def build_agent_statuses(active_agent: str = None, completed_agents: list = None) -> dict:
    completed_agents = completed_agents or []
    statuses = {
        "agent1": "pending",
        "agent2": "pending",
        "agent3": "pending",
        "agent4": "pending",
        "ready": "pending",
    }
    for agent in completed_agents:
        statuses[agent] = "completed"
    if active_agent:
        statuses[active_agent] = "active"
    return statuses


def sse_payload(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


async def build_and_store_final_path(
    blueprint: dict,
    path_audit: dict,
    steps_audit: list,
    market_audit: list,
    current: str,
    goal: str,
    profile: dict
) -> dict:
    final_macro_path = []
    blueprint_milestones = blueprint.get("macro_path", [])

    for i, orig_milestone in enumerate(blueprint_milestones):
        m_id = orig_milestone.get("id", i + 1)
        audited_step = next((m for m in steps_audit if m.get("id") == m_id), {})
        audited_market = next((m.get("marketplace") for m in market_audit if m.get("id") == m_id), None)

        merged_milestone = {
            "id": m_id,
            "title": audited_step.get("title") or orig_milestone.get("title", f"Milestone {m_id}"),
            "duration": audited_step.get("duration") or orig_milestone.get("duration", "3 months"),
            "description": audited_step.get("description") or orig_milestone.get("description", ""),
            "learning_objectives": audited_step.get("learning_objectives") or orig_milestone.get("learning_objectives", []),
            "macro_view": audited_step.get("macro_view") or orig_milestone.get("macro_view", ""),
            "micro_view": audited_step.get("micro_view") or orig_milestone.get("micro_view", ""),
            "nano_view": audited_step.get("nano_view") or orig_milestone.get("nano_view", ""),
            "marketplace": audited_market or orig_milestone.get("marketplace") or {"macro_free": [], "micro_structured": [], "nano_expert": []},
            "micro_steps": audited_step.get("micro_steps") or orig_milestone.get("micro_steps") or []
        }
        final_macro_path.append(merged_milestone)

    final_json = {
        "path_title": path_audit.get("path_title") or blueprint.get("path_title") or f"Academic Pathway to {goal}",
        "path_description": path_audit.get("path_description") or blueprint.get("path_description") or f"Detailed strategy blueprint for achieving target goal: {goal}.",
        "readiness_score": path_audit.get("readiness_score") or blueprint.get("readiness_score", 15),
        "readiness_label": path_audit.get("readiness_label") or blueprint.get("readiness_label", "Standard Grade"),
        "total_duration": blueprint.get("total_duration", "12 months"),
        "macro_path": final_macro_path,
        "blind_spots": path_audit.get("blind_spots") or blueprint.get("blind_spots") or []
    }

    name_tokens = build_name_patterns(profile, current)
    if name_tokens:
        print(f"[Sanitizer] Scrubbing personal name tokens: {name_tokens}")
        final_json = recursive_sanitize(final_json, name_tokens)
        print("[Sanitizer] Personal name sanitization complete.")

    path_doc = {
        "query": f"Current: {current}. Goal: {goal}.",
        "current_position": current,
        "target_goal": goal,
        "profile": profile,
        "roadmap_data": final_json,
        "status": "under_admin_review",
        "created_at": datetime.datetime.utcnow()
    }

    insert_result = await pending_paths_collection.insert_one(path_doc)
    final_json["db_id"] = str(insert_result.inserted_id)
    final_json["status"] = "under_admin_review"
    print(f"[MongoDB] Cached roadmap {final_json['db_id']} under review successfully.")
    return final_json

# ─── API ENDPOINTS ────────────────────────────────────────────────────────

@app.post("/api/profile")
async def save_profile(profile: StudentProfileModel):
    existing = await profiles_collection.find_one({"email": profile.email.lower()})
    profile_dict = profile.dict(by_alias=True, exclude_none=True)
    profile_dict["email"] = profile_dict["email"].lower()
    
    if "_id" in profile_dict:
        del profile_dict["_id"]
    if "id" in profile_dict:
        del profile_dict["id"]
        
    profile_dict["updated_at"] = datetime.datetime.utcnow()
    
    if existing:
        await profiles_collection.update_one(
            {"email": profile.email.lower()},
            {"$set": profile_dict}
        )
        updated_doc = await profiles_collection.find_one({"email": profile.email.lower()})
        return serialize_mongo_doc(updated_doc)
    else:
        profile_dict["created_at"] = datetime.datetime.utcnow()
        result = await profiles_collection.insert_one(profile_dict)
        profile_dict["id"] = str(result.inserted_id)
        return serialize_mongo_doc(profile_dict)

@app.get("/api/profile/{email}")
async def get_profile(email: str):
    doc = await profiles_collection.find_one({"email": email.lower()})
    if not doc:
        raise HTTPException(status_code=404, detail="Profile not found")
    return serialize_mongo_doc(doc)


@app.post("/api/path/stream")
async def generate_path_stream(req: PathGenerationRequest):
    current = req.current_position.strip()
    goal = req.target_goal.strip()
    profile = req.profile or {}

    if not current or not goal:
        raise HTTPException(status_code=400, detail="Current position and Target goal cannot be empty")

    async def event_stream():
        completed = []
        started_at = time.perf_counter()
        try:
            yield sse_payload("status", {
                "statuses": build_agent_statuses("agent1", completed),
                "progress": 20,
                "message": "Analyzing your profile..."
            })
            blueprint = await run_agent_1_blueprint(current, goal, profile)
            completed.append("agent1")
            yield sse_payload("status", {
                "statuses": build_agent_statuses(None, completed),
                "progress": 20,
                "message": "Profile analysis complete."
            })

            yield sse_payload("status", {
                "statuses": build_agent_statuses("agent2", completed),
                "progress": 40,
                "message": "Building your roadmap..."
            })
            try:
                path_audit = await run_agent_2_path_auditor(blueprint, current, goal, profile)
            except Exception as e:
                print(f"Agent 2 Error: {e}")
                path_audit = {}
            completed.append("agent2")
            yield sse_payload("status", {
                "statuses": build_agent_statuses(None, completed),
                "progress": 40,
                "message": "Roadmap structure complete."
            })

            yield sse_payload("status", {
                "statuses": build_agent_statuses("agent3", completed),
                "progress": 60,
                "message": "Refining milestones and checklists..."
            })
            try:
                steps_audit = await run_agent_3_steps_auditor(blueprint, current, goal, profile)
            except Exception as e:
                print(f"Agent 3 Error: {e}")
                steps_audit = []
            completed.append("agent3")
            yield sse_payload("status", {
                "statuses": build_agent_statuses(None, completed),
                "progress": 60,
                "message": "Milestones and checklists complete."
            })

            yield sse_payload("status", {
                "statuses": build_agent_statuses("agent4", completed),
                "progress": 80,
                "message": "Finding learning resources..."
            })
            try:
                market_audit = await run_agent_4_marketplace_auditor(blueprint, current, goal, profile)
            except Exception as e:
                print(f"Agent 4 Error: {e}")
                market_audit = []
            completed.append("agent4")
            yield sse_payload("status", {
                "statuses": build_agent_statuses(None, completed),
                "progress": 80,
                "message": "Learning resources complete."
            })

            yield sse_payload("status", {
                "statuses": build_agent_statuses("ready", completed),
                "progress": 95,
                "message": "Preparing final recommendations..."
            })
            final_json = await build_and_store_final_path(
                blueprint, path_audit, steps_audit, market_audit, current, goal, profile
            )
            completed.append("ready")
            elapsed = time.perf_counter() - started_at
            print(f"[Audit API] Agent audit and cache completed in {elapsed:.2f} seconds.")
            yield sse_payload("status", {
                "statuses": build_agent_statuses(None, completed),
                "progress": 100,
                "message": "Your career path is ready!"
            })
            yield sse_payload("result", final_json)
        except Exception as e:
            print(f"[Streamed Path Error] {e}")
            yield sse_payload("error", {
                "message": "Path generation failed. Please try again."
            })

    return StreamingResponse(event_stream(), media_type="text/event-stream")

@app.post("/api/path")
async def generate_path(req: PathGenerationRequest):
    current = req.current_position.strip()
    goal = req.target_goal.strip()
    profile = req.profile or {}
    
    if not current or not goal:
        raise HTTPException(status_code=400, detail="Current position and Target goal cannot be empty")
    
    try:
        # Step 1: Run Agent 1 (Blueprint Generator)
        blueprint = await run_agent_1_blueprint(current, goal, profile)
        
        # Step 2: Trigger Agents 2, 3, and 4 in parallel using asyncio.gather
        agent2_task = run_agent_2_path_auditor(blueprint, current, goal, profile)
        agent3_task = run_agent_3_steps_auditor(blueprint, current, goal, profile)
        agent4_task = run_agent_4_marketplace_auditor(blueprint, current, goal, profile)
        
        path_audit, steps_audit, market_audit = await asyncio.gather(
            agent2_task, agent3_task, agent4_task,
            return_exceptions=True
        )
        
        # Handle exceptions gracefully
        if isinstance(path_audit, Exception): 
            print(f"Agent 2 Error: {path_audit}")
            path_audit = {}
        if isinstance(steps_audit, Exception): 
            print(f"Agent 3 Error: {steps_audit}")
            steps_audit = []
        if isinstance(market_audit, Exception): 
            print(f"Agent 4 Error: {market_audit}")
            market_audit = []
        
        # Step 3: Merge parallel agent outputs
        final_macro_path = []
        blueprint_milestones = blueprint.get("macro_path", [])
        
        for i, orig_milestone in enumerate(blueprint_milestones):
            m_id = orig_milestone.get("id", i + 1)
            
            # Fetch step details and views audited by Agent 3
            audited_step = next((m for m in steps_audit if m.get("id") == m_id), {})
            
            # Fetch marketplace audited by Agent 4
            audited_market = next((m.get("marketplace") for m in market_audit if m.get("id") == m_id), None)
            
            merged_milestone = {
                "id": m_id,
                "title": audited_step.get("title") or orig_milestone.get("title", f"Milestone {m_id}"),
                "duration": audited_step.get("duration") or orig_milestone.get("duration", "3 months"),
                "description": audited_step.get("description") or orig_milestone.get("description", ""),
                "learning_objectives": audited_step.get("learning_objectives") or orig_milestone.get("learning_objectives", []),
                "macro_view": audited_step.get("macro_view") or orig_milestone.get("macro_view", ""),
                "micro_view": audited_step.get("micro_view") or orig_milestone.get("micro_view", ""),
                "nano_view": audited_step.get("nano_view") or orig_milestone.get("nano_view", ""),
                "marketplace": audited_market or orig_milestone.get("marketplace") or {"macro_free": [], "micro_structured": [], "nano_expert": []},
                "micro_steps": audited_step.get("micro_steps") or orig_milestone.get("micro_steps") or []
            }
            final_macro_path.append(merged_milestone)
        
        final_json = {
            "path_title": path_audit.get("path_title") or blueprint.get("path_title") or f"Academic Pathway to {goal}",
            "path_description": path_audit.get("path_description") or blueprint.get("path_description") or f"Detailed strategy blueprint for achieving target goal: {goal}.",
            "readiness_score": path_audit.get("readiness_score") or blueprint.get("readiness_score", 15),
            "readiness_label": path_audit.get("readiness_label") or blueprint.get("readiness_label", "Standard Grade"),
            "total_duration": blueprint.get("total_duration", "12 months"),
            "macro_path": final_macro_path,
            "blind_spots": path_audit.get("blind_spots") or blueprint.get("blind_spots") or []
        }
        
        # Step 3.5: Post-process — sanitize all personal names out of the final JSON
        name_tokens = build_name_patterns(profile, current)
        if name_tokens:
            print(f"[Sanitizer] Scrubbing personal name tokens: {name_tokens}")
            final_json = recursive_sanitize(final_json, name_tokens)
            print("[Sanitizer] Personal name sanitization complete.")
        
        # Step 4: Persist to MongoDB with 'under_admin_review' status
        path_doc = {
            "query": f"Current: {current}. Goal: {goal}.",
            "current_position": current,
            "target_goal": goal,
            "profile": profile,
            "roadmap_data": final_json,
            "status": "under_admin_review",
            "created_at": datetime.datetime.utcnow()
        }
        
        insert_result = await pending_paths_collection.insert_one(path_doc)
        final_json["db_id"] = str(insert_result.inserted_id)
        final_json["status"] = "under_admin_review"
        
        print(f"[MongoDB] Cached roadmap {final_json['db_id']} under review successfully.")
        return final_json
        
    except Exception as e:
        print(f"[AI Pipeline Warning] Exception occurred during generation: {e}. Recovering with fallback roadmap.")
        final_json = get_fallback_mock_roadmap(current, goal, profile)
        name_tokens = build_name_patterns(profile, current)
        if name_tokens:
            final_json = recursive_sanitize(final_json, name_tokens)
        
        # Try to persist fallback to MongoDB
        try:
            path_doc = {
                "query": f"Current: {current}. Goal: {goal}.",
                "current_position": current,
                "target_goal": goal,
                "profile": profile,
                "roadmap_data": final_json,
                "status": "under_admin_review",
                "created_at": datetime.datetime.utcnow()
            }
            insert_result = await pending_paths_collection.insert_one(path_doc)
            final_json["db_id"] = str(insert_result.inserted_id)
            final_json["status"] = "under_admin_review"
            print(f"[MongoDB] Cached fallback roadmap {final_json['db_id']} under review successfully.")
        except Exception as db_err:
            print(f"[MongoDB Warning] Failed to cache fallback roadmap to database: {db_err}")
            final_json["db_id"] = "fallback_mock_id"
            final_json["status"] = "under_admin_review"
            
        return final_json


@app.post("/api/path/blueprint")
async def generate_path_blueprint(req: PathGenerationRequest):
    import time
    start_time = time.time()
    current = req.current_position.strip()
    goal = req.target_goal.strip()
    profile = req.profile or {}
    
    if not current or not goal:
        raise HTTPException(status_code=400, detail="Current position and Target goal cannot be empty")
    
    try:
        blueprint = await run_agent_1_blueprint(current, goal, profile)
        elapsed = time.time() - start_time
        print(f"[Blueprint API] Generated initial blueprint in {elapsed:.2f} seconds.")
        return blueprint
    except Exception as e:
        print(f"[Blueprint API Error] {e}")
        return get_fallback_mock_roadmap(current, goal, profile)


@app.post("/api/path/audit")
async def generate_path_audit(req: PathAuditRequest):
    import time
    start_time = time.time()
    blueprint = req.blueprint
    current = req.current_position.strip()
    goal = req.target_goal.strip()
    profile = req.profile or {}
    
    try:
        # Trigger Agents 2, 3, and 4 in parallel using asyncio.gather
        agent2_task = run_agent_2_path_auditor(blueprint, current, goal, profile)
        agent3_task = run_agent_3_steps_auditor(blueprint, current, goal, profile)
        agent4_task = run_agent_4_marketplace_auditor(blueprint, current, goal, profile)
        
        path_audit, steps_audit, market_audit = await asyncio.gather(
            agent2_task, agent3_task, agent4_task,
            return_exceptions=True
        )
        
        # Handle exceptions gracefully
        if isinstance(path_audit, Exception): 
            print(f"Agent 2 Error: {path_audit}")
            path_audit = {}
        if isinstance(steps_audit, Exception): 
            print(f"Agent 3 Error: {steps_audit}")
            steps_audit = []
        if isinstance(market_audit, Exception): 
            print(f"Agent 4 Error: {market_audit}")
            market_audit = []
        
        # Merge parallel agent outputs
        final_macro_path = []
        blueprint_milestones = blueprint.get("macro_path", [])
        
        for i, orig_milestone in enumerate(blueprint_milestones):
            m_id = orig_milestone.get("id", i + 1)
            
            # Fetch step details and views audited by Agent 3
            audited_step = next((m for m in steps_audit if m.get("id") == m_id), {})
            
            # Fetch marketplace audited by Agent 4
            audited_market = next((m.get("marketplace") for m in market_audit if m.get("id") == m_id), None)
            
            merged_milestone = {
                "id": m_id,
                "title": audited_step.get("title") or orig_milestone.get("title", f"Milestone {m_id}"),
                "duration": audited_step.get("duration") or orig_milestone.get("duration", "3 months"),
                "description": audited_step.get("description") or orig_milestone.get("description", ""),
                "learning_objectives": audited_step.get("learning_objectives") or orig_milestone.get("learning_objectives", []),
                "macro_view": audited_step.get("macro_view") or orig_milestone.get("macro_view", ""),
                "micro_view": audited_step.get("micro_view") or orig_milestone.get("micro_view", ""),
                "nano_view": audited_step.get("nano_view") or orig_milestone.get("nano_view", ""),
                "marketplace": audited_market or orig_milestone.get("marketplace") or {"macro_free": [], "micro_structured": [], "nano_expert": []},
                "micro_steps": audited_step.get("micro_steps") or orig_milestone.get("micro_steps") or []
            }
            final_macro_path.append(merged_milestone)
        
        final_json = {
            "path_title": path_audit.get("path_title") or blueprint.get("path_title") or f"Academic Pathway to {goal}",
            "path_description": path_audit.get("path_description") or blueprint.get("path_description") or f"Detailed strategy blueprint for achieving target goal: {goal}.",
            "readiness_score": path_audit.get("readiness_score") or blueprint.get("readiness_score", 15),
            "readiness_label": path_audit.get("readiness_label") or blueprint.get("readiness_label", "Standard Grade"),
            "total_duration": blueprint.get("total_duration", "12 months"),
            "macro_path": final_macro_path,
            "blind_spots": path_audit.get("blind_spots") or blueprint.get("blind_spots") or []
        }
        
        # Post-process — sanitize all personal names out of the final JSON
        name_tokens = build_name_patterns(profile, current)
        if name_tokens:
            print(f"[Sanitizer] Scrubbing personal name tokens: {name_tokens}")
            final_json = recursive_sanitize(final_json, name_tokens)
            print("[Sanitizer] Personal name sanitization complete.")
        
        # Persist to MongoDB with 'under_admin_review' status
        path_doc = {
            "query": f"Current: {current}. Goal: {goal}.",
            "current_position": current,
            "target_goal": goal,
            "profile": profile,
            "roadmap_data": final_json,
            "status": "under_admin_review",
            "created_at": datetime.datetime.utcnow()
        }
        
        insert_result = await pending_paths_collection.insert_one(path_doc)
        final_json["db_id"] = str(insert_result.inserted_id)
        final_json["status"] = "under_admin_review"
        
        elapsed = time.time() - start_time
        print(f"[MongoDB] Cached roadmap {final_json['db_id']} under review successfully.")
        print(f"[Audit API] Parallel audit and cache completed in {elapsed:.2f} seconds.")
        return final_json
        
    except Exception as e:
        print(f"[AI Pipeline Warning] Exception occurred during audit: {e}. Recovering with fallback.")
        final_json = get_fallback_mock_roadmap(current, goal, profile)
        name_tokens = build_name_patterns(profile, current)
        if name_tokens:
            final_json = recursive_sanitize(final_json, name_tokens)
        
        try:
            path_doc = {
                "query": f"Current: {current}. Goal: {goal}.",
                "current_position": current,
                "target_goal": goal,
                "profile": profile,
                "roadmap_data": final_json,
                "status": "under_admin_review",
                "created_at": datetime.datetime.utcnow()
            }
            insert_result = await pending_paths_collection.insert_one(path_doc)
            final_json["db_id"] = str(insert_result.inserted_id)
            final_json["status"] = "under_admin_review"
        except Exception:
            final_json["db_id"] = "fallback_mock_id"
            final_json["status"] = "under_admin_review"
            
        return final_json


# Backward-compatible simple path endpoint
@app.post("/api/path_legacy")
async def generate_path_legacy(req: GoalRequest):
    # Parse out current & goal if possible, otherwise use fallback defaults
    raw_goal = req.goal
    current = "High School"
    goal = raw_goal
    if "Current:" in raw_goal and "Goal:" in raw_goal:
        match = re.search(r"Current:\s*(.*?)\s*\.\s*Goal:\s*(.*?)\s*\.", raw_goal)
        if match:
            current = match.group(1)
            goal = match.group(2)
    return await generate_path(PathGenerationRequest(current_position=current, target_goal=goal))

# Admin Endpoint: Get all paths under review
@app.get("/api/admin/paths")
async def get_admin_paths(status: Optional[str] = "under_admin_review"):
    paths = []
    
    # If status is "under_admin_review" or "all":
    if status == "under_admin_review" or status == "all":
        cursor = pending_paths_collection.find({}).sort("created_at", -1)
        async for doc in cursor:
            doc["status"] = "under_admin_review"
            paths.append(serialize_mongo_doc(doc))
            
    # If status is "published" or "all":
    if status == "published" or status == "all":
        cursor = published_paths_collection.find({}).sort("created_at", -1)
        async for doc in cursor:
            doc["status"] = "published"
            paths.append(serialize_mongo_doc(doc))
            
    # Sort them combined by created_at desc if status was "all"
    if status == "all":
        paths.sort(key=lambda x: x.get("created_at") or "", reverse=True)
        
    return paths

# Get a single path by ID
@app.get("/api/paths/{path_id}")
async def get_path_by_id(path_id: str):
    try:
        obj_id = ObjectId(path_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid path ID format")
        
    doc = await pending_paths_collection.find_one({"_id": obj_id})
    if doc:
        doc["status"] = "under_admin_review"
        return serialize_mongo_doc(doc)
        
    doc = await published_paths_collection.find_one({"_id": obj_id})
    if doc:
        doc["status"] = "published"
        return serialize_mongo_doc(doc)
        
    raise HTTPException(status_code=404, detail="Career path not found")

# Update a path (Commit curation overrides & Publish)
@app.put("/api/paths/{path_id}")
async def update_path(path_id: str, req: UpdatePathRequest):
    try:
        obj_id = ObjectId(path_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid path ID format")
        
    # Check if the path is currently in pending
    pending_doc = await pending_paths_collection.find_one({"_id": obj_id})
    
    if pending_doc:
        if req.status == "published":
            # Migrate from pending to published
            published_doc = {
                "query": pending_doc.get("query"),
                "current_position": pending_doc.get("current_position"),
                "target_goal": pending_doc.get("target_goal"),
                "profile": pending_doc.get("profile"),
                "roadmap_data": req.roadmap_data,
                "status": "published",
                "created_at": pending_doc.get("created_at") or datetime.datetime.utcnow(),
                "published_at": datetime.datetime.utcnow()
            }
            published_doc["_id"] = obj_id
            await published_paths_collection.insert_one(published_doc)
            
            # Delete from pending_paths
            await pending_paths_collection.delete_one({"_id": obj_id})
            return {"message": "Successfully published career path", "status": "published"}
        else:
            # Just update the pending path
            await pending_paths_collection.update_one(
                {"_id": obj_id},
                {"$set": {
                    "roadmap_data": req.roadmap_data,
                    "status": req.status,
                    "updated_at": datetime.datetime.utcnow()
                }}
            )
            return {"message": f"Successfully updated career path status to {req.status}", "status": req.status}
            
    # Check if the path is in published
    published_doc = await published_paths_collection.find_one({"_id": obj_id})
    if published_doc:
        await published_paths_collection.update_one(
            {"_id": obj_id},
            {"$set": {
                "roadmap_data": req.roadmap_data,
                "status": req.status,
                "updated_at": datetime.datetime.utcnow()
            }}
        )
        return {"message": f"Successfully updated career path status to {req.status}", "status": req.status}
        
    raise HTTPException(status_code=404, detail="Career path not found")


# Serve React frontend if built
from fastapi.staticfiles import StaticFiles

class SPAStaticFiles(StaticFiles):
    async def get_response(self, path: str, scope):
        try:
            response = await super().get_response(path, scope)
            if response.status_code == 404:
                return await super().get_response("index.html", scope)
            return response
        except Exception as e:
            try:
                return await super().get_response("index.html", scope)
            except Exception:
                raise e

dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "dist"))
if os.path.exists(dist_path):
    app.mount("/", SPAStaticFiles(directory=dist_path, html=True), name="static")
