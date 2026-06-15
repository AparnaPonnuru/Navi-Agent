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
    refine_prompt: Optional[str] = None
    existing_roadmap: Optional[dict] = None
    focus: Optional[str] = None

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

class LoginRequest(BaseModel):
    email: str
    password: str

class SavePathRequest(BaseModel):
    current_position: str
    target_goal: str
    profile: Optional[dict] = None
    roadmap_data: dict

def serialize_mongo_doc(doc):
    if not doc:
        return None
    doc["id"] = str(doc["_id"])
    del doc["_id"]
    for field in ["created_at", "updated_at", "published_at"]:
        if field in doc and doc[field]:
            if hasattr(doc[field], "isoformat"):
                val = doc[field].isoformat()
                if not val.endswith("Z") and "+00:00" not in val:
                    val += "Z"
                doc[field] = val
    if "profile" in doc and isinstance(doc["profile"], dict):
        profile_dict = doc["profile"]
        for field in ["created_at", "updated_at"]:
            if field in profile_dict and profile_dict[field]:
                if hasattr(profile_dict[field], "isoformat"):
                    val = profile_dict[field].isoformat()
                    if not val.endswith("Z") and "+00:00" not in val:
                        val += "Z"
                    profile_dict[field] = val
    return doc

async def enrich_path_profile(doc):
    if not doc:
        return doc
    email = None
    if "profile" in doc and doc["profile"] and "email" in doc["profile"]:
        email = doc["profile"]["email"]
    if not email and "created_by" in doc and doc["created_by"]:
        email = doc["created_by"]
    if not email and "createdBy" in doc and doc["createdBy"]:
        email = doc["createdBy"]
        
    if email:
        profile_doc = await profiles_collection.find_one({"email": email.lower()})
        if profile_doc:
            doc["profile"] = serialize_mongo_doc(profile_doc)
            doc["created_by"] = email.lower()
            doc["createdBy"] = email.lower()
            
    if "profile" not in doc or not doc["profile"]:
        doc["profile"] = {"email": email or "", "name": "Anonymous Student"}
        
    return doc


# ─── AGENT 1: BLUEPRINT GENERATOR PROMPT ──────────────────────────────────
AGENT_1_PROMPT = """You are the Naaviverse career blueprint generator (Agent 1).
Your task is to draft the initial raw career roadmap based on:
- Current Position: {current_position}
- Target Career Goal: {target_goal}
- Student Profile Details: {profile}

Respond ONLY with valid JSON. No markdown, no backticks, no explanation.

{{
  "path_title": "{focus_title_prefix} Pathway from {current_position} to {target_goal}",
  "path_description": "A comprehensive pedagogical pathway designed to take a student from {current_position} to a target career or academic destination of {target_goal} focusing on {focus_area}.",
  "readiness_score": 15,
  "readiness_label": "High School Starter",
  "total_duration": "<calculated total duration, e.g. '36 months' or '24 months' or '12 months'>",
  "macro_path": [
    {{
      "id": 1,
      "title": "<step/milestone title>",
      "duration": "<calculated step duration range, e.g. 'Months 1-4'>",
      "description": "<detailed step description (at least 3 to 4 comprehensive sentences) outlining exactly what academics, study plans, or profile goals to focus on during this step, why this is critical, and how it strategically prepares the student for {target_goal}>",
      "learning_objectives": [
        "<learning objective 1>",
        "<learning objective 2>",
        "<learning objective 3>"
      ],
     "macro_view": "<4-5 sentence strategic paragraph explaining the BIG PICTURE PURPOSE of this milestone — what overarching academic goal it advances, why it is a critical non-negotiable foundation within the entire roadmap architecture, how mastering it unlocks the next stage of academic and career progression, what long-term college readiness competency it builds, and how it connects to the student's overall target destination at {target_goal}>",
"micro_view": "<4-5 sentence strategic paragraph describing the PRECISE EXECUTION OUTPUT — what specific academic tasks, coursework, study schedules, and concrete deliverables the student must complete within this phase, how many hours per week to dedicate, what tools and platforms to use for tracking progress, what measurable checkpoints confirm task completion, and what the final tangible output of this phase looks like before moving forward>",
"nano_view": "<4-5 sentence strategic paragraph outlining the MENTOR GUIDANCE FOCUS — what specific diagnostic assessments and expert review sessions should happen in this phase, how a mentor validates the student's readiness to advance, what peer cohort accountability checkpoints are recommended, what common failure patterns a mentor should watch for in this phase, and how targeted expert feedback is incorporated to refine the student's execution plan before the next milestone begins>",
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
            "value": "<value proposition for the micro view>",
            "next_step": "<specific action>",
            "tags": ["<tag>", "<tag>"]
          }},
          {{
            "name": "<paid course or resource>",
            "type": "<Course | Certification | Book | Bootcamp>",
            "cost": "<realistic cost>",
            "duration": "<duration>",
            "value": "<value proposition for the micro view>",
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
- CRITICAL TIMELINE CONSTRAINT: You MUST calculate the total timeline duration strictly based on the student's current grade from the profile details:
  - If the student is in 10th grade (or profile grade contains "10"), set `total_duration` to EXACTLY "36 months" and distribute steps across Months 1-36.
  - If the student is in 11th grade (or profile grade contains "11"), set `total_duration` to EXACTLY "24 months" and distribute steps across Months 1-24.
  - If the student is in 12th grade (or profile grade contains "12"), set `total_duration` to EXACTLY "12 months" and distribute steps across Months 1-12.
  - If the student is in university / college / other, set `total_duration` to "12 months" or "24 months" based on goal complexity.
  - You MUST strictly follow this mapping. Do NOT default to "24 months" if the student is in 12th grade.
- Determine the number of milestones/steps in `macro_path` dynamically based on the complexity of the target destination and calculated timeline.
  - CRITICAL STEP COUNT RULE: You MUST generate a detailed, comprehensive roadmap. For a 24-month or 36-month timeline, you MUST generate at least 8 to 12 distinct milestones/steps in the `macro_path` array. For a 12-month timeline, you MUST generate at least 6 to 8 distinct milestones/steps.
  - DO NOT restrict or default the pathway to exactly 4 steps. A 4-step path is insufficient to cover a student's career transition and is strictly forbidden.
- Ensure that the progression of milestones represents the pedagogical stages inspired by "Aryan's Pathway 2023":
  - Early milestones must cover: choosing the right curriculum/subjects/streams based on passion/aptitude, researching schools, setting GPA targets (e.g., accomplishing 90%+ in board/school exams).
  - Middle milestones must cover: internship selection & planning to acquire relevant skills, identifying and starting test prep modules (e.g., SAT, ACT, English proficiency like IELTS/TOEFL), identifying right mentors.
  - Transition milestones must cover: planning transitions between academic grades, analyzing risks and gaps.
  - Final milestones must cover: profile building, mock score iteration, university placement program registration, and completing college application dossiers.
- For each milestone step, construct:
  - `macro_view`: A 4-5 sentence strategic paragraph explaining the BIG PICTURE PURPOSE — what overarching academic goal the milestone advances, why it is a critical non-negotiable foundation in the roadmap, how mastering it unlocks the next academic stage, what long-term college readiness competency it builds, and how it ties directly to the target destination.
  - `micro_view`: A 4-5 sentence strategic paragraph describing the PRECISE EXECUTION OUTPUT — what specific tasks, coursework, and deliverables the student must complete, how many hours per week to allocate, what tools and platforms to use, what measurable checkpoints confirm completion, and what the tangible output looks like before advancing.
  - `nano_view`: A 4-5 sentence strategic paragraph outlining the MENTOR GUIDANCE FOCUS — what diagnostic assessments and expert sessions happen, how the mentor validates readiness to advance, what peer cohort checkpoints are recommended, what failure patterns to watch for, and how expert feedback is incorporated before the next milestone begins.
- Distribute the calculated total duration logically across the steps. For example, distribute month ranges like "Months 1-3", "Months 4-6", etc., so they span the entire calculated duration of the pathway.
- Generate a dynamic, appropriate number of micro_steps tasks per step based on the milestone requirements (do not hardcode to exactly 3).
- Generate a dynamic, appropriate number of learning_objectives per step based on the milestone requirements (do not hardcode to exactly 3).
- Generate any dynamic number of macro_free, micro_structured, and nano_expert recommendations per step in the marketplace block, tailored dynamically to the requirements of the step rather than a static count.
- Avoid repeated resource names. Suggest highly specific resources like freeCodeCamp, Coursera, MIT OCW, Khan Academy, specific textbooks.
- Deeply differentiate based on profile grade, curriculum (CBSE vs. IB vs. University), financial budget, stream, personality type, and location.
- Each step description MUST be a rich, detailed, multi-sentence paragraph (3-4 sentences). Do NOT provide short, generic, or single-sentence descriptions. Make them highly academic, pedagogical, and context-specific.
- CRITICAL NAME BAN: NEVER mention the student's personal name (e.g. Sunkara, Chaitanya, Praneeth) or email or personal pronouns in any text fields (titles, descriptions, views, checklist tasks, or objectives). Focus purely on objective, academic instructions.
- REFINEMENT, KEYWORD UNDERSTANDING & VALIDATION RULES:
  - If a Refinement / Adjustment Request is provided:
    - You MUST understand the keywords and intent behind it:
      - E.g., if it says "change step X description", you MUST locate the step with id X and rewrite its "description" text exactly as requested (or make it more detailed/aligned with their feedback).
      - E.g., if it says "add more steps" or "add X steps", you MUST increase the number of milestones in the "macro_path" and insert relevant steps with correct IDs.
      - E.g., if it says "add correct marketplace" or "change marketplace", you MUST adjust the "marketplace" objects inside the relevant steps.
      - E.g., if it says "give more accurate" or "add SAT prep", you MUST modify descriptions, objectives, and checklists to include those academic resources.
    - If the request is completely unrelated to the career pathway, contains nonsense, or asks to perform out-of-scope tasks (e.g., "tell me a joke", "tell me a story", "what is the weather"), you MUST return a JSON object containing ONLY the key "error" with a polite description explaining why the request is invalid and how the user can ask correctly. Example: {{"error": "This request is irrelevant to career pathway refinement. Please provide specific instructions to adjust this pathway, such as 'change step 1 description' or 'add more milestones'."}}
    - If the request is valid, perform the refinement. If an Existing Roadmap is provided as context, you MUST preserve all steps that the user did not ask to change. Modify or replace only the specific steps/details requested by the user, while keeping other milestones/steps identical to the existing roadmap.
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
3. Estimate a realistic "readiness_score" (0-100) and "readiness_label" (e.g. Early Starter, Advanced, Intermediate) based dynamically on the student's profile signals (academic performance, stream, and curriculum) relative to the competitiveness of the Target Career Goal:
   - For highly competitive targets (e.g., Harvard, Yale, Stanford, MIT, Oxford, IIT, BITS):
     - If performance is "90% and above", score should be around 30-40 (Early/Intermediate Starter).
     - If performance is "75%–89%", score should be around 20-30.
     - If performance is below 75%, score should be around 10-20.
   - For moderately competitive targets (e.g., Local Universities, State Colleges):
     - If performance is "90% and above", score should be around 75-85 (Advanced Starter).
     - If performance is "75%–89%", score should be around 50-60.
     - If performance is below 75%, score should be around 30-40.
   - Adjust the score dynamically based on these parameters. Do NOT hardcode it.
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
1. Each step's "title" and "duration" (Ensure logical progression, and MUST preserve the step's exact calculated month duration range from the blueprint JSON, e.g. "Months 1-9" or "Months 1-6" or "Months 1-3" exactly. Do NOT change these ranges to default values).
2. Each step's "description" (Must be a rich, detailed, multi-sentence paragraph of 3-4 sentences detailing the main academic utility).
3. The step's "learning_objectives" (Verify they align with target learning outcomes).
4. The step's "macro_view" (Must be a rich 4-5 sentence paragraph clearly explaining the BIG PICTURE PURPOSE — the overarching academic goal this milestone advances and why it is a critical foundation in the roadmap).
5. The step's "micro_view" (Must be a rich 4-5 sentence paragraph describing the PRECISE EXECUTION OUTPUT — the exact academic tasks, deliverables, and coursework the student must complete to finish this phase).
6. The step's "nano_view" (Must be a rich 4-5 sentence paragraph explaining the MENTOR GUIDANCE FOCUS — the diagnostic checks, expert review sessions, and accountability checkpoints that validate readiness to advance).
7. The step's "micro_steps" checklist tasks (Make sure they are hyper-specific, actionable, and tailored to the student's curriculum/grade).
8. CRITICAL NAME BAN: Strictly verify that NONE of the step titles, durations, descriptions, learning objectives, views (macro, micro, nano), or micro_steps tasks contain the student's personal name, email, or direct pronouns. Rewrite all fields to be completely objective, professional, and academic, focusing entirely on what the step achieves, how to execute it, and how to complete the step successfully.
9. CRITICAL STEP PRESERVATION RULE: You MUST audit and return every single milestone/step provided in the blueprint JSON. If the blueprint JSON contains 8 steps, you must output exactly 8 audited steps in your JSON array. If it contains 10 steps, you must output exactly 10 audited steps. Do NOT skip, delete, combine, or truncate the steps under any circumstances.

Output ONLY a valid JSON array of this structure:
[
  {{
    "id": 1,
    "title": "<audited step title>",
    "duration": "<preserve duration range from blueprint exactly, e.g., 'Months 1-9'>",
    "description": "<audited rich detailed multi-sentence description (3-4 sentences)>",
    "learning_objectives": [
      "<audited learning objective 1>",
      "... for all learning objectives in this step ..."
    ],
    "macro_view": "<audited/refined macro view text>",
    "micro_view": "<audited/refined micro view text>",
    "nano_view": "<audited/refined nano view text>",
    "micro_steps": [
      {{"task": "<actionable task>", "resource": "<real specific resource>"}},
      "... for all micro steps in this step ..."
    ]
  }},
  ... for all steps in the blueprint ...
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
1. Match the budget limits (Lower percentages like 0-25% or 25-50% => free/low cost resources, higher percentages => high quality bootcamps/paid courses/premium mentoring).
2. Match personality traits (RIASEC codes: Realistic => practical/hands-on tasks, Investigative => research/data/logic, Artistic => design/creative writing, Social => teaching/helping/cooperative, Enterprising => startup/business/leadership, Conventional => structured/admin/analytical tracking).
3. Are highly reputable, real-world educational resources (e.g. Khan Academy, Coursera, MIT OCW, specific standard prep books).
4. Pricing and next steps are realistic, detailed, and actionable.
5. CRITICAL NAME BAN: Ensure that no marketplace recommendations, why details, next steps, or outcomes contain the student's personal name, email, or pronouns. Keep all text objective and general.
6. CRITICAL STEP PRESERVATION RULE: You MUST audit and return the marketplace blocks for every single milestone/step provided in the blueprint JSON. If the blueprint JSON has 8 steps, you must output exactly 8 audited steps in your JSON array. If it has 10 steps, you must output exactly 10 audited steps. Do NOT skip, delete, combine, or truncate steps under any circumstances.

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
        }}
        // ... for all free resources in this milestone step ...
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
        }}
        // ... for all structured paid resources in this milestone step ...
      ],
      "nano_expert": [
        {{
          "name": "<audited mentor or expert service>",
          "type": "<Mentor | Coaching | Expert review>",
          "price": "<price>",
          "session_details": "<session details>",
          "expected_outcomes": "<expected outcomes for the nano view>",
          "tags": ["<tag>", "<tag>"]
        }}
        // ... for all expert mentor services in this milestone step ...
      ]
    }}
  }},
  ... for all steps in the blueprint ...
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
        "llama-3.3-70b-versatile",
        "qwen/qwen3-32b",
        "openai/gpt-oss-20b"
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
            estimated_input_tokens = int(len(prompt) / 3.2)
            if "70b" in m or "120b" in m or "32b" in m or "17b" in m:
                max_tok = 4096
            else:
                max_tok = max(1000, 5800 - estimated_input_tokens)
                if max_tok > 2500:
                    max_tok = 2500

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


def split_duration(duration_str: str, num_parts: int, index: int) -> str:
    # Match ranges like "Months 1-4" or "Months 13-16" or "1-4"
    match = re.search(r'(\d+)\s*-\s*(\d+)', duration_str)
    if match:
        start = int(match.group(1))
        end = int(match.group(2))
        total_months = end - start + 1
        
        # Calculate sub-range for the index-th part out of num_parts
        part_len = total_months / num_parts
        part_start = int(start + index * part_len)
        part_end = int(start + (index + 1) * part_len - 1)
        
        # Ensure bounds
        if part_start < start:
            part_start = start
        if part_end > end or index == num_parts - 1:
            part_end = end
        if part_end < part_start:
            part_end = part_start
            
        if part_start == part_end:
            return f"Month {part_start}"
        else:
            return f"Months {part_start}-{part_end}"
            
    # Single month case like "Month 12"
    match_single = re.search(r'Month\s*(\d+)', duration_str, re.IGNORECASE)
    if match_single:
        return duration_str
        
    return duration_str

def get_mock_marketplace(focus: Optional[str]) -> dict:
    if not focus:
        focus = "Academic"
        
    if "Academic" in focus:
        return {
            "macro_free": [
                {"name": "Khan Academy Standardized Test Prep", "type": "Free Course", "why": "Excellent free resource for SAT math and reading diagnostics.", "next_step": "Complete a full-length SAT mock diagnostic test.", "tags": ["SAT", "Prep", "Math"]},
                {"name": "MIT OpenCourseWare Calculus", "type": "YouTube/Docs", "why": "In-depth lectures to build rigorous mathematical foundation.", "next_step": "Watch Lectures 1-5 and solve problem set 1.", "tags": ["Math", "Calculus", "MIT"]}
            ],
            "micro_structured": [
                {"name": "Princeton Review Advanced Prep", "type": "Course", "cost": "$299", "duration": "6 weeks", "value": "Guided instruction and score guarantee for high-stakes tests.", "next_step": "Enroll in the weekend live instruction cohort.", "tags": ["Test Prep", "SAT", "ACT"]},
                {"name": "Coursera AP Computer Science", "type": "Certification", "cost": "$49", "duration": "4 weeks", "value": "Structured preparation matching the high school curriculum syllabus.", "next_step": "Complete modules on Object-Oriented programming.", "tags": ["AP CS", "Java", "Coding"]}
            ],
            "nano_expert": [
                {"name": "Naaviverse Academic Counsel Review", "type": "Expert review", "price": "$150", "session_details": "1-on-1 Zoom Session (45 mins)", "expected_outcomes": "Personalized assessment of GPA targets and academic safety nets.", "tags": ["Counseling", "Shortlist", "GPA"]},
                {"name": "Elite Test Prep Coaching", "type": "Coaching", "price": "$120/hr", "session_details": "Private Tutoring", "expected_outcomes": "Custom strategy to target specific weak areas in TOEFL/IELTS.", "tags": ["Tutoring", "IELTS", "TOEFL"]}
            ]
        }
    elif "Practical" in focus:
        return {
            "macro_free": [
                {"name": "freeCodeCamp Web Development Bootcamp", "type": "Free Course", "why": "Hands-on projects to master HTML/CSS/Javascript and Git.", "next_step": "Complete the responsive web design certification.", "tags": ["Coding", "Web Dev", "Portfolio"]},
                {"name": "Harvard CS50 Introduction to Computer Science", "type": "YouTube/Docs", "why": "Comprehensive overview of algorithmic thinking and software development.", "next_step": "Watch Lecture 1 and submit Problem Set 1.", "tags": ["Computer Science", "Algorithms"]}
            ],
            "micro_structured": [
                {"name": "Udemy AWS Certified Cloud Practitioner", "type": "Certification", "cost": "$19", "duration": "3 weeks", "value": "Learn cloud infrastructure and obtain an industry-recognized credential.", "next_step": "Complete practice exam questions and sit for the exam.", "tags": ["AWS", "Cloud", "Certification"]},
                {"name": "Codecademy Pro Career Path", "type": "Bootcamp", "cost": "$39/mo", "duration": "Self-paced", "value": "Interactive coding workspace with portfolio projects and reviews.", "next_step": "Build and push a personal portfolio project to GitHub.", "tags": ["Coding", "Portfolio", "Interviews"]}
            ],
            "nano_expert": [
                {"name": "Naavi Tech Mentor Portfolio Audit", "type": "Expert review", "price": "$120", "session_details": "Async Code Review & 30-min Call", "expected_outcomes": "Code readability review, project ideas list, and GitHub optimization tips.", "tags": ["Code Review", "Portfolio", "GitHub"]},
                {"name": "Industry Engineer Interview Coaching", "type": "Coaching", "price": "$150/hr", "session_details": "1-on-1 Mock Coding Interview", "expected_outcomes": "Realistic technical interview simulation and problem-solving critiques.", "tags": ["Interview Prep", "Coding", "Algorithms"]}
            ]
        }
    else: # Holistic
        return {
            "macro_free": [
                {"name": "Toastmasters International Youth Leadership", "type": "Community", "why": "Free local clubs to build public speaking and interpersonal confidence.", "next_step": "Attend an open club meeting as a guest.", "tags": ["Public Speaking", "Leadership"]},
                {"name": "Coursera Introduction to Public Speaking", "type": "Free Course", "why": "Learn techniques to design and deliver engaging presentations.", "next_step": "Record a 3-minute introductory speech and request feedback.", "tags": ["Communication", "Soft Skills"]}
            ],
            "micro_structured": [
                {"name": "Dale Carnegie Teen Leadership Program", "type": "Course", "cost": "$395", "duration": "4 weeks", "value": "Build resilience, communication skills, and team management confidence.", "next_step": "Register for the summer leadership cohort.", "tags": ["Leadership", "Carnegie"]},
                {"name": "Interaction Design Foundation Soft Skills", "type": "Course", "cost": "$16/mo", "duration": "Self-paced", "value": "Understand user experience, empathy, and collaborative workshop methodologies.", "next_step": "Complete the module on stakeholder communication.", "tags": ["UX", "Collaboration"]}
            ],
            "nano_expert": [
                {"name": "Naavi Counselor Review & Personality Diagnostic", "type": "Expert review", "price": "$100", "session_details": "Myers-Briggs / Aptitude Zoom Session", "expected_outcomes": "Detailed profiling report highlighting soft skill strengths and growth plans.", "tags": ["Counseling", "MBTI", "Diagnostics"]},
                {"name": "Admissions Leadership Coach", "type": "Coaching", "price": "$130/hr", "session_details": "1-on-1 Essay Story Arcs Session", "expected_outcomes": "Select compelling personal stories for leadership essays.", "tags": ["Admissions", "Coaching", "Essays"]}
            ]
        }

def customize_steps_for_focus(steps_configs: list, focus: Optional[str], goal: str) -> list:
    if not focus:
        return steps_configs
    
    is_academic = "Academic" in focus
    is_practical = "Practical" in focus
    is_holistic = "Holistic" in focus

    custom_configs = []
    for step in steps_configs:
        step_copy = step.copy()
        title = step_copy["title"]
        desc = step_copy["description"]
        macro = step_copy.get("macro_view", "")
        micro = step_copy.get("micro_view", "")
        nano = step_copy.get("nano_view", "")

        if is_academic:
            title = title.replace("Academic Target & Profile Review", "Academic Rigor & Goal Setting Assessment") \
                         .replace("Academic Curation & GPA Target", "Academic Curation & Advanced GPA Target") \
                         .replace("Skill Curation & Internship Selection", "Research Paper Scoping & Academic Honors") \
                         .replace("Skill Curation", "Research Preparation") \
                         .replace("Internship Planning", "Academic Research Planning") \
                         .replace("Internship Selection", "Research Mentor Selection")
            desc = desc.replace("internships", "research projects").replace("practical skills", "theoretical insights")
            desc += f" Prioritize academic rigor, GPA tracking, and standardized test readiness for {goal}."
            macro = f"Focusing on academic excellence: {macro}"
            micro = f"Execute with strict academic focus: {micro}"
            nano = f"Mentor review of academic performance: {nano}"

        elif is_practical:
            title = title.replace("Academic Target & Profile Review", "Tech Stack Setup & Skill Review") \
                         .replace("Academic Curation & GPA Target", "Practical Skill Setup & Git Portfolio") \
                         .replace("Board Achievement", "Technical Certification Mastery") \
                         .replace("Academics & Profile Rigor", "Coding Projects & Portfolio Rigor") \
                         .replace("Test Score Curation", "Hackathon & Project Portfolio Review") \
                         .replace("Standardized Test Prep Modules", "Practical Developer Certification Modules") \
                         .replace("Standardized Test Prep", "Developer Certification Prep") \
                         .replace("Standardized Test Score Curation", "Project Showcase & Hackathon Review") \
                         .replace("Standardized Test", "Industry Certification") \
                         .replace("Admissions Finalization & Visas", "Industry Technical Placement & Coding Reviews")
            desc = desc.replace("board exams", "technical projects").replace("academic preparation", "technical competence").replace("standardized test", "technical certification").replace("GPA", "portfolio completeness")
            desc += f" Emphasize GitHub projects, technical certifications, and developer bootcamps tailored for {goal}."
            macro = f"Focusing on hands-on practical skills: {macro}"
            micro = f"Complete coding and building deliverables: {micro}"
            nano = f"Technical code and portfolio audits: {nano}"

        elif is_holistic:
            title = title.replace("Academic Target & Profile Review", "Leadership Assessment & Soft Skills Review") \
                         .replace("Academic Curation & GPA Target", "Cohort Collaboration & Leadership Building") \
                         .replace("Board Achievement", "Public Speaking & Cohort Milestones") \
                         .replace("Academics & Profile Rigor", "Community Contributions & Counselor Reviews") \
                         .replace("Test Score Curation", "Behavioral Interview Prep & Networking") \
                         .replace("Standardized Test Prep Modules", "Leadership & Communication Workshop Modules") \
                         .replace("Standardized Test Prep", "Public Speaking Coaching") \
                         .replace("Standardized Test Score Curation", "Leadership Cohort & Community Campaigns") \
                         .replace("Standardized Test", "Leadership & Communication Workshop")
            desc = desc.replace("study schedules", "leadership workshops").replace("GPA", "soft skills competency").replace("test sittings", "communication bootcamps").replace("board exams", "community projects")
            desc += f" Focus on leadership roles, behavioral counseling, public speaking, and community outreach for {goal}."
            macro = f"Focusing on communication and peer collaboration: {macro}"
            micro = f"Participate in workshops and group sessions: {micro}"
            nano = f"Personality diagnostic and soft skills counseling: {nano}"

        step_copy["title"] = title
        step_copy["description"] = desc
        step_copy["macro_view"] = macro
        step_copy["micro_view"] = micro
        step_copy["nano_view"] = nano
        custom_configs.append(step_copy)

    return custom_configs

# Pedagogical High-Fidelity Fallback Roadmap in case of a complete API lockout
def get_fallback_mock_roadmap(current: str, goal: str, profile: dict, refine_prompt: Optional[str] = None, focus: Optional[str] = None) -> dict:
    grade_str = str(profile.get("grade") or "").lower() or current.lower()
    
    # Aryan's Pathway structural mapping
    if "10" in grade_str or "tenth" in grade_str:
        total_duration = "36 months"
        steps_configs = [
            {
                "id": 1,
                "title": "Curriculum & Stream Assessment",
                "duration": "Months 1-4",
                "description": f"Choose the right academic curriculum and stream (CBSE, IB, Cambridge) based on passion, personality assessment, and aptitude for {goal}.",
                "macro_view": "Selecting the right academic curriculum and subject stream is the single most impactful decision a student makes at the beginning of their educational journey, as it determines which doors open and which permanently close in the path toward a competitive university placement. This milestone establishes the foundational academic identity of the student — whether they pursue a science-heavy CBSE pathway, a globally recognized IB Diploma, or a rigorous Cambridge A-Level track — each of which signals a different level of academic ambition to admissions committees. Getting this choice correct means aligning the student's natural aptitude scores, RIASEC personality profile, and long-term career aspirations with the academic demands of the chosen stream, avoiding costly mid-stream transfers later. By the end of this milestone, the student will have a clear academic roadmap template tied directly to the demands of their target destination: {goal}.",

"micro_view": "The student must complete a structured three-step execution process during this phase: first, take a validated psychometric assessment (e.g. Holland RIASEC Code Test or the 16Personalities aptitude tool) to identify core academic strengths and interests that should drive stream selection. Second, research and visit at least 3 potential schools offering the identified curriculum (CBSE/IB/Cambridge), evaluating each against criteria such as faculty quality, extracurricular options, lab infrastructure, and placement track record. Third, compile a written Academic Goal Statement of 500 words documenting the chosen stream, the rationale for the choice, the target GPA for Grade 10 board exams, and the extracurricular activities planned for profile enrichment over the next 12 months. All three deliverables must be reviewed and signed off before moving to the next milestone.",

"nano_view": "A mentor or academic counselor should conduct an initial 45-minute intake diagnostic session reviewing the student's psychometric results, past academic performance records, and stated career interests to validate that the stream selection aligns with realistic university placement benchmarks for {goal}. The mentor should run a gap analysis comparing the student's current aptitude scores against the entry requirements of top universities in the target category, flagging any immediate curriculum risks or subject gaps that need to be addressed in Grade 10. A peer cohort review session should also be conducted where the student presents their Academic Goal Statement to a group of 3-4 senior students who have already navigated the same pathway, receiving structured feedback on blind spots and subject combination pitfalls. Expert feedback from this session must be incorporated into a revised Academic Goal Statement before the student formally commits to a school and stream.",
            },
            {
                "id": 2,
                "title": "School Selection & Academic Targets",
                "duration": "Months 5-8",
                "description": "Establish target schools and set clear academic targets. Focus on setting study habits and foundation metrics.",
                "macro_view": "Establish high-caliber academic environments and target standards required for global universities.",
                "micro_view": "Select schools based on location, budget, and mentor support, and finalize a weekly study timeline.",
                "nano_view": "Obtain mentor diagnostic feedback on academic preparation and school resources mapping."
            },
            {
                "id": 3,
                "title": "Grade 10 Board Achievement",
                "duration": "Months 9-12",
                "description": "Achieve 90%+ in 10th-grade board exams. Master core academic concepts and prepare comprehensive exam notes.",
                "macro_view": "Build a stellar academic foundation that serves as the official transcript entry point.",
                "micro_view": "Complete diagnostic mock board tests, analyze weak chapters, and compile summary revision booklets.",
                "nano_view": "Conduct progress check-ins with top-scoring student cohorts and board subject specialists."
            },
            {
                "id": 4,
                "title": "Internship Planning & Skill Curation",
                "duration": "Months 13-16",
                "description": "Focus on selecting and executing introductory internships to acquire practical skills and discover interests.",
                "macro_view": "Supplement theoretical classroom learning with real-world project work and corporate exposure.",
                "micro_view": "Apply for short internships, shadow industry specialists, and compile project reports.",
                "nano_view": "Work with internship coordinators to align tasks with career interests and get reviews on deliverables."
            },
            {
                "id": 5,
                "title": "Grade 11 Transition & Diagnostic Test Prep",
                "duration": "Months 17-20",
                "description": "Transition to 11th grade successfully. Initiate standardized test prep diagnostics (SAT/ACT/IELTS/TOEFL) and map timelines.",
                "macro_view": "Ensure a smooth academic step-up while setting the baseline for international standardized tests.",
                "micro_view": "Purchase target test prep guides, take diagnostic test sittings, and plan a test calendar.",
                "nano_view": "Conduct a transition risk analysis with senior academic advisors and test prep mentors."
            },
            {
                "id": 6,
                "title": "Grade 11 Academics & Profile Rigor",
                "duration": "Months 21-24",
                "description": "Maintain a 90%+ GPA in 11th-grade coursework and begin constructing an extracurricular profile / personal project.",
                "macro_view": "Establish continuous academic growth and distinctiveness through specialized personal projects.",
                "micro_view": "Start a research paper draft or launch a community service initiative, keeping complete logs.",
                "nano_view": "Engage a subject-matter expert to scope your personal project and pressure-test the outline."
            },
            {
                "id": 7,
                "title": "Standardized Test Score Curation",
                "duration": "Months 25-28",
                "description": "Prepare intensively for the SAT/ACT and English proficiency tests. Take official exams and aim for top-tier scores.",
                "macro_view": "Differentiate your application with highly competitive standardized exam scores.",
                "micro_view": "Complete 10 full-length practice tests, review mistakes, and sit for the official examinations.",
                "nano_view": "Conduct mock score iterations and review test-taking strategies with specialized coaches."
            },
            {
                "id": 8,
                "title": "Grade 12 Placement & Counselor Mapping",
                "duration": "Months 29-32",
                "description": f"Identify mentors and target university lists. Map recommendation letters and begin drafting essays for {goal}.",
                "macro_view": "Convert academic and profile success into a curated admissions package targeting top-tier destinations.",
                "micro_view": "Select 8-10 target universities, coordinate with recommendation letter writers, and draft common app essays.",
                "nano_view": "Align with admissions counselors on portal shortlists and receive developmental feedback on essay drafts."
            },
            {
                "id": 9,
                "title": "Application Submission & Placement Curation",
                "duration": "Months 33-36",
                "description": f"Submit premium application dossiers to {goal} and prepare for interviews, visas, and matriculation.",
                "macro_view": "Complete the college pathway, validate placement, and finalize legal entry permits.",
                "micro_view": "Submit all application portals, participate in mock interview prep, and compile visa paperwork.",
                "nano_view": "Conduct final panel mock interviews and visa checklist reviews with international coordinators."
            }
        ]
    elif "11" in grade_str or "eleventh" in grade_str:
        total_duration = "24 months"
        steps_configs = [
            {
                "id": 1,
                "title": "Grade 11 Academic Curation & GPA Target",
                "duration": "Months 1-4",
                "description": "Establish stellar study schedules and targets. Focus on scoring 90%+ in school exams and mapping coursework.",
                "macro_view": "Lay the baseline transcripts required for university admissions.",
                "micro_view": "Attend extra academic support classes, compile weekly summaries, and track mock test scores.",
                "nano_view": "Schedule advisor check-ins to review mid-term performance and flag curriculum risks."
            },
            {
                "id": 2,
                "title": "Skill Curation & Internship Selection",
                "duration": "Months 5-8",
                "description": "Select practical internships or projects to acquire industry skills and strengthen your profile.",
                "macro_view": "Demonstrate real-world application of skills and initiative.",
                "micro_view": "Draft a professional CV, apply to 3 target internships, and complete a showcase project.",
                "nano_view": "Work with a career coach to select projects that align with your major interest."
            },
            {
                "id": 3,
                "title": "Standardized Test Prep Modules",
                "duration": "Months 9-12",
                "description": "Identify and focus on standardized test prep modules (SAT/ACT/IELTS). Map schedules and diagnostic metrics.",
                "macro_view": "Prove academic readiness and language proficiency for international admissions.",
                "micro_view": "Register on test portals, solve prep questions, and take diagnostic mock sittings.",
                "nano_view": "Conduct test-taking technique diagnostics and identify sub-topic weaknesses with prep mentors."
            },
            {
                "id": 4,
                "title": "Mentor Mapping & Profile Rigor",
                "duration": "Months 13-16",
                "description": "Partner with a dedicated mentor to scope out personal projects, research papers, or community campaigns.",
                "macro_view": "Highlight unique interests and intellectual depth beyond standard grades.",
                "micro_view": "Develop a project repository, draft abstract outlines, and meet weekly project milestones.",
                "nano_view": "Review drafts and source codes with expert mentors for validation and refinement."
            },
            {
                "id": 5,
                "title": "Grade 12 Transition & Shortlisting",
                "duration": "Months 17-20",
                "description": "Transition smoothly into Grade 12. Finalize university shortlists and begin college application essays.",
                "macro_view": "Strategically select target institutions and draft compelling personal statements.",
                "micro_view": "Finalize 8 target colleges, research specific essay prompts, and write initial drafts.",
                "nano_view": "Receive feedback on essay story arcs and align shortlists with admissions counselors."
            },
            {
                "id": 6,
                "title": "Application Dossier & Placements",
                "duration": "Months 21-24",
                "description": f"Submit completed application dossiers to target destination: {goal}. Secure recommendations and handle visas.",
                "macro_view": "Execute the final step of the pathway by submitting curated portfolios and finalizing placement.",
                "micro_view": "Pay application fees, submit portals (Common App etc.), and compile visa documents.",
                "nano_view": "Practice mock admissions interviews and undergo checklist verification with placements advisors."
            }
        ]
    else:
        total_duration = "12 months"
        steps_configs = [
            {
                "id": 1,
                "title": "Grade 12 Academic Target & Profile Review",
                "duration": "Months 1-3",
                "description": "Establish term-exam targets and conduct a thorough profile review to identify extracurricular gaps.",
                "macro_view": "Ensure final high school transcripts meet competitive standards while identifying portfolio issues.",
                "micro_view": "Write down grade objectives, list active projects, and note recommendations needed.",
                "nano_view": "Conduct a portfolio analysis session with advisors to map outstanding targets."
            },
            {
                "id": 2,
                "title": "Test Score Curation & Finalization",
                "duration": "Months 4-6",
                "description": "Complete final official standardized test sittings. Focus on test prep iteration and maximizing scores.",
                "macro_view": "Finalize competitive metrics for college portals.",
                "micro_view": "Practice weak areas, sit for official SAT/ACT/IELTS/TOEFL exams, and request score reports.",
                "nano_view": "Coordinate score reviews and submission strategy check-ins with test mentors."
            },
            {
                "id": 3,
                "title": "Profile Curation & Mentor Counsel",
                "duration": "Months 7-9",
                "description": "Connect with college mentors, draft letters of recommendation profiles, and write personal statements.",
                "macro_view": "Draft highly persuasive stories that demonstrate your readiness for collegiate study.",
                "micro_view": "Draft the main application essay, create resumes, and requests recommendation inputs.",
                "nano_view": "Obtain structural and narrative feedback on essays from writing advisors."
            },
            {
                "id": 4,
                "title": "University Placements Submission",
                "duration": "Months 10-11",
                "description": f"Assemble and submit official application dossiers to {goal}. Double-check all transcript records.",
                "macro_view": "Submit all credentials to target admissions committees without errors.",
                "micro_view": "Complete university portal profiles, review transcripts, and submit portfolios.",
                "nano_view": "Review application completeness checklist with counselor prior to final submission."
            },
            {
                "id": 5,
                "title": "Admissions Finalization & Visas",
                "duration": "Month 12",
                "description": "Review placement decisions, prepare for interviews, and complete visa and study permit documentation.",
                "macro_view": "Transition smoothly from high school applicant to university-matriculated student.",
                "micro_view": "Attend mock interviews, review visa documents, and pay enrollment deposits.",
                "nano_view": "Participate in pre-departure briefings and mock visa interview check-ins."
            }
        ]

    # Parse requested steps from refine_prompt if available
    requested_steps = None
    if refine_prompt:
        match_steps = re.search(r'(\d+)\s*(?:step|milestone)', refine_prompt.lower())
        if match_steps:
            try:
                requested_steps = int(match_steps.group(1))
                if requested_steps < 3:
                    requested_steps = 3
                elif requested_steps > 15:
                    requested_steps = 15
            except Exception:
                pass

    if not requested_steps and focus:
        if "Academic" in focus:
            pass
        elif "Practical" in focus:
            requested_steps = len(steps_configs) + 1
        elif "Holistic" in focus:
            requested_steps = max(4, len(steps_configs) - 1)

    steps_configs = customize_steps_for_focus(steps_configs, focus, goal)

    if requested_steps and requested_steps != len(steps_configs):
        N = len(steps_configs)
        M = requested_steps
        
        dup_counts = [0] * N
        for j in range(M):
            orig_idx = int(j * N / M)
            dup_counts[orig_idx] += 1
            
        scaled_configs = []
        new_id = 1
        for orig_idx, count in enumerate(dup_counts):
            if count == 0:
                continue
            orig_step = steps_configs[orig_idx]
            for d in range(count):
                new_step = orig_step.copy()
                new_step["id"] = new_id
                
                # If there are duplicates, append Phase tag to title
                if count > 1:
                    new_step["title"] = f"{orig_step['title']} - Phase {d + 1}"
                    new_step["duration"] = split_duration(orig_step["duration"], count, d)
                
                scaled_configs.append(new_step)
                new_id += 1
                
        steps_configs = scaled_configs

    # Map the configurations to high-fidelity milestone structures
    macro_path = []
    for cfg in steps_configs:
        step_title = cfg["title"]
        step_desc = cfg["description"]
        macro_view = cfg["macro_view"]
        micro_view = cfg["micro_view"]
        nano_view = cfg["nano_view"]

        macro_path.append({
            "id": cfg["id"],
            "title": step_title,
            "duration": cfg["duration"],
            "description": step_desc,
            "learning_objectives": [
                f"Understand the requirements and targets of the {step_title} phase.",
                f"Execute the micro execution steps and checklist tasks for this milestone.",
                f"Engage in mentor reviews and peer feedback to confirm phase readiness."
            ],
            "macro_view": macro_view,
            "micro_view": micro_view,
            "nano_view": nano_view,
            "marketplace": get_mock_marketplace(focus),
            "micro_steps": [
                {"task": f"Define and document goals for the {step_title} phase", "resource": "Google Docs / Notion"},
                {"task": f"Complete diagnostic sittings or task execution for {step_title}", "resource": "Practice Portals"},
                {"task": f"Review execution output with mentor or advisor", "resource": "Naavi Platform"}
            ]
        })

    path_title = f"Academic Pathway to {goal}"
    path_description = f"A comprehensive pedagogical blueprint designed to take a student from {current} to the target academic goal: {goal}."
    readiness_score = 30
    readiness_label = "Early Starter"

    if focus:
        if "Academic" in focus:
            path_title = f"Academic & Research Pathway to {goal}"
            path_description = f"A highly rigorous academic and research-oriented roadmap designed to maximize GPA, master standardized test prep (SAT/ACT/IELTS/TOEFL), secure academic honors, publish research, and build a competitive profile for top-tier university placement in {goal}."
            readiness_score = 40
            readiness_label = "Intermediate Starter"
        elif "Practical" in focus:
            path_title = f"Practical & Industry Pathway to {goal}"
            path_description = f"A hands-on, project-centric roadmap focusing on building technical skills, industry-recognized professional certifications, real-world portfolio projects, and securing industrial internships to prepare for {goal}."
            readiness_score = 35
            readiness_label = "Early Builder"
        elif "Holistic" in focus:
            path_title = f"Holistic & Career-Prep Pathway to {goal}"
            path_description = f"A comprehensive development roadmap focusing on leadership, public speaking, soft skills, peer cohort networking, community service, expert counseling, and career preparation workshops for {goal}."
            readiness_score = 45
            readiness_label = "Aspirant Leader"

    return {
        "path_title": path_title,
        "path_description": path_description,
        "readiness_score": readiness_score,
        "readiness_label": readiness_label,
        "total_duration": total_duration,
        "blind_spots": [
            "Lacks formal international exposure - needs IELTS/SAT preparation.",
            "Needs structured extracurricular profile development for university entrance."
        ],
        "macro_path": macro_path
    }

def scale_blueprint_steps(blueprint: dict, requested_steps: int) -> dict:
    macro_path = blueprint.get("macro_path", [])
    if not macro_path or len(macro_path) == requested_steps:
        return blueprint
        
    N = len(macro_path)
    M = requested_steps
    
    dup_counts = [0] * N
    for j in range(M):
        orig_idx = int(j * N / M)
        dup_counts[orig_idx] += 1
        
    scaled_path = []
    new_id = 1
    for orig_idx, count in enumerate(dup_counts):
        if count == 0:
            continue
        orig_step = macro_path[orig_idx]
        for d in range(count):
            new_step = orig_step.copy()
            new_step["id"] = new_id
            
            # If there are duplicates, append Phase tag to title
            if count > 1:
                new_step["title"] = f"{orig_step['title']} - Phase {d + 1}"
                new_step["duration"] = split_duration(orig_step["duration"], count, d)
            
            scaled_path.append(new_step)
            new_id += 1
            
    blueprint["macro_path"] = scaled_path
    return blueprint

# Specialized Audit Tasks
async def run_agent_1_blueprint(current: str, goal: str, profile: dict, refine_prompt: Optional[str] = None, existing_roadmap: Optional[dict] = None, focus: Optional[str] = None) -> dict:
    # Parse requested steps from refine_prompt if available
    requested_steps = None
    if refine_prompt:
        match_steps = re.search(r'(\d+)\s*(?:step|milestone)', refine_prompt.lower())
        if match_steps:
            try:
                requested_steps = int(match_steps.group(1))
                if requested_steps < 3:
                    requested_steps = 3
                elif requested_steps > 15:
                    requested_steps = 15
            except Exception:
                pass

    focus_title_prefix = "Academic & Research"
    focus_area = "academic and profile development"
    if focus:
        if "Academic" in focus:
            focus_title_prefix = "Academic & Research"
            focus_area = "academic rigor, target grades, standardized test prep (SAT/ACT/IELTS/TOEFL), academic honors, research papers, curriculum rigor, and top-tier university placement"
        elif "Practical" in focus:
            focus_title_prefix = "Practical & Industry"
            focus_area = "technical/hands-on skill acquisition, portfolio development, coding/engineering projects, professional certifications, industry internships, and practical deliverables"
        elif "Holistic" in focus:
            focus_title_prefix = "Holistic & Career-Prep"
            focus_area = "peer cohorts, soft skills, public speaking, open-source contributions, self-paced courses, expert counselor reviews, and career counseling sessions"

    prompt = AGENT_1_PROMPT.format(
        current_position=current,
        target_goal=goal,
        profile=json.dumps(profile),
        focus_title_prefix=focus_title_prefix,
        focus_area=focus_area
    )
    if focus:
        prompt += f"\n\n🚨 STRATEGIC FOCUS DIRECTION: You MUST structure and customize this pathway according to this specific strategic focus direction:\n👉 \"{focus}\"\nEnsure all milestone titles, descriptions, objectives, learning views, checklists, and resources strongly reflect this focus so that it stands out distinctly from other alternative options."

    if refine_prompt:
        prompt += f"\n\n==================================================\nCRITICAL USER REQUEST FOR REFINE / ADJUSTMENT:\nThe user has requested the following specific instruction to refine/adjust this pathway. You MUST strictly adhere to and execute this instruction in your output:\n👉 \"{refine_prompt}\"\n==================================================\n"
        if requested_steps:
            prompt += f"\n\n🚨 CRITICAL ENFORCEMENT: The user has explicitly requested EXACTLY {requested_steps} steps/milestones. You MUST ignore any conflicting default step count rules and generate EXACTLY {requested_steps} distinct step objects inside the 'macro_path' JSON array. Do not output more or fewer than {requested_steps} steps. Ensure they have IDs 1 to {requested_steps}."
        if existing_roadmap:
            raw_roadmap = existing_roadmap.get("roadmap_data") or existing_roadmap
            # Context compression: Only send metadata to save thousands of tokens and avoid TPM limit
            compressed_roadmap = {
                "path_title": raw_roadmap.get("path_title", ""),
                "path_description": raw_roadmap.get("path_description", ""),
                "total_duration": raw_roadmap.get("total_duration", ""),
                "macro_path": [
                    {
                        "id": m.get("id"),
                        "title": m.get("title", ""),
                        "duration": m.get("duration", ""),
                        "description": m.get("description", "")
                    }
                    for m in raw_roadmap.get("macro_path", [])
                ]
            }
            prompt += f"\nEXISTING ROADMAP (use this as the base reference to modify only what the user requested, leaving other steps unchanged):\n{json.dumps(compressed_roadmap, indent=2)}\n"
    print(f"[Agent 1] Generating initial roadmap blueprint (focus: {focus or 'default'}) using 70B...")
    res = await query_groq_json(prompt, preferred_model="llama-3.3-70b-versatile")
    
    # If the daily token limit is exhausted, query_groq_json returns {}
    if not res or "macro_path" not in res:
        print("[Rate Limit Warning] Daily token limit exceeded. Serving board-calibrated fallback roadmap.")
        # Try the 8B model before falling back to the static mock.
        res = await query_groq_json(prompt, preferred_model="llama-3.1-8b-instant")
        if not res or "macro_path" not in res:
            # Full lockout: serve high-fidelity static mock custom-built for CBSE/Cambridge
            return get_fallback_mock_roadmap(current, goal, profile, refine_prompt, focus)
            
    if requested_steps and res:
        res = scale_blueprint_steps(res, requested_steps)
    return res

async def run_agent_2_path_auditor(blueprint: dict, current: str, goal: str, profile: dict, refine_prompt: Optional[str] = None, existing_roadmap: Optional[dict] = None) -> dict:
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
    if refine_prompt:
        prompt += f"\n\n==================================================\nCRITICAL USER REQUEST FOR REFINE / ADJUSTMENT:\nThe user has requested the following specific instruction to refine/adjust this pathway. You MUST strictly adhere to and execute this instruction in your output:\n👉 \"{refine_prompt}\"\n==================================================\n"
        if existing_roadmap:
            roadmap_to_send = existing_roadmap.get("roadmap_data") or existing_roadmap
            prompt += f"\nEXISTING ROADMAP:\n{json.dumps(roadmap_to_send, indent=2)}\n"
    print("[Agent 2] Auditing overall path title, description, and readiness using 8B...")
    return await query_groq_json(prompt, preferred_model="llama-3.1-8b-instant")

async def run_agent_3_steps_auditor(blueprint: dict, current: str, goal: str, profile: dict, refine_prompt: Optional[str] = None, existing_roadmap: Optional[dict] = None) -> list:
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
    if refine_prompt:
        prompt += f"\n\n==================================================\nCRITICAL USER REQUEST FOR REFINE / ADJUSTMENT:\nThe user has requested the following specific instruction to refine/adjust this pathway. You MUST strictly adhere to and execute this instruction in your output:\n👉 \"{refine_prompt}\"\n==================================================\n"
        if existing_roadmap:
            roadmap_to_send = existing_roadmap.get("roadmap_data") or existing_roadmap
            prompt += f"\nEXISTING ROADMAP:\n{json.dumps(roadmap_to_send, indent=2)}\n"
    print("[Agent 3] Auditing steps, learning views, and checklists using 8B...")
    res = await query_groq_json(prompt, preferred_model="llama-3.1-8b-instant")
    return res if isinstance(res, list) else []

async def run_agent_4_marketplace_auditor(blueprint: dict, current: str, goal: str, profile: dict, refine_prompt: Optional[str] = None, existing_roadmap: Optional[dict] = None) -> list:
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
    if refine_prompt:
        prompt += f"\n\n==================================================\nCRITICAL USER REQUEST FOR REFINE / ADJUSTMENT:\nThe user has requested the following specific instruction to refine/adjust this pathway. You MUST strictly adhere to and execute this instruction in your output:\n👉 \"{refine_prompt}\"\n==================================================\n"
        if existing_roadmap:
            roadmap_to_send = existing_roadmap.get("roadmap_data") or existing_roadmap
            prompt += f"\nEXISTING ROADMAP:\n{json.dumps(roadmap_to_send, indent=2)}\n"
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

    final_json["db_id"] = None
    final_json["status"] = "draft"
    return final_json


# ─── API ENDPOINTS ────────────────────────────────────────────────────────

@app.post("/api/login")
async def login(req: LoginRequest):
    admin_email = os.environ.get("ADMIN_USERNAME", "pathengine.admin@gmail.com")
    admin_password = os.environ.get("ADMIN_PASSWORD", "Pathadmin@123")
    
    if req.email.lower() == admin_email.lower() and req.password == admin_password:
        admin_profile = await profiles_collection.find_one({"email": admin_email.lower()})
        if not admin_profile:
            admin_profile = {
                "email": admin_email.lower(),
                "name": "PathEngine Admin",
                "grade": "",
                "curriculum": "",
                "stream": "",
                "school": "",
                "performance": "",
                "financialSituation": "",
                "personality": "",
                "country": "",
                "state": "",
                "city": "",
                "created_at": datetime.datetime.now(datetime.timezone.utc)
            }
            await profiles_collection.insert_one(admin_profile)
        return serialize_mongo_doc(admin_profile)
    else:
        raise HTTPException(status_code=401, detail="Invalid admin credentials")

@app.post("/api/profile")
async def save_profile(profile: StudentProfileModel):
    existing = await profiles_collection.find_one({"email": profile.email.lower()})
    profile_dict = profile.dict(by_alias=True, exclude_none=True)
    profile_dict["email"] = profile_dict["email"].lower()
    
    if "_id" in profile_dict:
        del profile_dict["_id"]
    if "id" in profile_dict:
        del profile_dict["id"]
        
    profile_dict["updated_at"] = datetime.datetime.now(datetime.timezone.utc)
    
    if existing:
        await profiles_collection.update_one(
            {"email": profile.email.lower()},
            {"$set": profile_dict}
        )
        updated_doc = await profiles_collection.find_one({"email": profile.email.lower()})
        return serialize_mongo_doc(updated_doc)
    else:
        profile_dict["created_at"] = datetime.datetime.now(datetime.timezone.utc)
        result = await profiles_collection.insert_one(profile_dict)
        profile_dict["id"] = str(result.inserted_id)
        return serialize_mongo_doc(profile_dict)

@app.get("/api/profile/{email}")
async def get_profile(email: str):
    admin_email = os.environ.get("ADMIN_USERNAME", "pathengine.admin@gmail.com")
    if email.lower() == admin_email.lower():
        raise HTTPException(status_code=403, detail="Direct access to admin profile is forbidden. Please use /api/login.")
    doc = await profiles_collection.find_one({"email": email.lower()})
    if not doc:
        raise HTTPException(status_code=404, detail="Profile not found")
    return serialize_mongo_doc(doc)


async def run_option_audits(blueprint: dict, current: str, goal: str, profile: dict, refine_prompt: Optional[str] = None, existing_roadmap: Optional[dict] = None):
    agent2_task = run_agent_2_path_auditor(blueprint, current, goal, profile, refine_prompt, existing_roadmap)
    agent3_task = run_agent_3_steps_auditor(blueprint, current, goal, profile, refine_prompt, existing_roadmap)
    agent4_task = run_agent_4_marketplace_auditor(blueprint, current, goal, profile, refine_prompt, existing_roadmap)
    
    path_audit, steps_audit, market_audit = await asyncio.gather(
        agent2_task, agent3_task, agent4_task,
        return_exceptions=True
    )
    if isinstance(path_audit, Exception): path_audit = {}
    if isinstance(steps_audit, Exception): steps_audit = []
    if isinstance(market_audit, Exception): market_audit = []
    return path_audit, steps_audit, market_audit

@app.post("/api/path/stream")
async def generate_path_stream(req: PathGenerationRequest):
    current = req.current_position.strip()
    goal = req.target_goal.strip()
    profile = req.profile or {}
    refine_prompt = req.refine_prompt.strip() if req.refine_prompt else None
    existing_roadmap = req.existing_roadmap
    focus_req = req.focus.strip() if req.focus else None

    if not current or not goal:
        raise HTTPException(status_code=400, detail="Current position and Target goal cannot be empty")

    async def event_stream():
        completed = []
        started_at = time.perf_counter()
        try:
            if refine_prompt:
                val = refine_prompt.lower().strip()
                noise = [
                    "tell me a story", "tell a story", "write a story", "write a poem", "write a song",
                    "tell me a joke", "tell a joke", "joke", "weather", "capital of", "who is",
                    "what is the meaning of life", "hi", "hello", "hey", "how are you", "what's up",
                    "sing a song", "write code", "help me chat", "how are you doing"
                ]
                valid_keywords = [
                    "step", "milestone", "path", "road", "course", "market", "description", "objective",
                    "duration", "add", "change", "remove", "delete", "update", "make", "give", "focus",
                    "study", "prep", "sat", "ielts", "act", "toefl", "exam", "career", "university",
                    "college", "school", "curriculum", "grade", "subject", "class", "detail", "more",
                    "resource", "mentor", "timeline", "month", "year", "academics", "score", "placement",
                    "portfolio", "admission", "ielts", "gpa", "internship", "project"
                ]
                if any(n in val for n in noise) or len(val) < 4 or not any(kw in val for kw in valid_keywords):
                    yield sse_payload("error", {"message": "This request is irrelevant to career pathway refinement. Please provide specific instructions to adjust this pathway, such as 'change step 1 description' or 'add more milestones'."})
                    return

            yield sse_payload("status", {
                "statuses": build_agent_statuses("agent1", completed),
                "progress": 20,
                "message": "Generating alternative blueprint paths..."
            })

            foci = [
                "Academic Focus: Focus on school exams, target grades, standardized test prep (SAT/ACT/IELTS/TOEFL), academic honors, research papers, curriculum rigor, and top-tier university placement.",
                "Practical Focus: Focus on technical/hands-on skill acquisition, portfolio development, coding/engineering projects, professional certifications, industry internships, and practical deliverables.",
                "Holistic Focus: Focus on peer cohorts, soft skills, public speaking, open-source contributions, self-paced courses, expert counselor reviews, and career counseling sessions."
            ]
            option_names = ["Academic & Research", "Practical & Industry", "Holistic & Career-Prep"]

            if focus_req:
                matched_idx = None
                for idx, name in enumerate(option_names):
                    if focus_req.lower() in name.lower() or name.lower() in focus_req.lower():
                        matched_idx = idx
                        break
                if matched_idx is not None:
                    foci = [foci[matched_idx]]
                    option_names = [option_names[matched_idx]]

            # 1. Run Agent 1 in parallel
            blueprint_tasks = [
                run_agent_1_blueprint(current, goal, profile, refine_prompt, existing_roadmap, focus=focus)
                for focus in foci
            ]
            blueprints = await asyncio.gather(*blueprint_tasks, return_exceptions=True)

            valid_blueprints = []
            for i, bp in enumerate(blueprints):
                if isinstance(bp, Exception) or not bp or "macro_path" not in bp:
                    print(f"Blueprint {i} generation failed or returned error. Falling back.")
                    valid_blueprints.append(get_fallback_mock_roadmap(current, goal, profile, refine_prompt, focus=foci[i]))
                else:
                    valid_blueprints.append(bp)

            completed.append("agent1")
            yield sse_payload("status", {
                "statuses": build_agent_statuses("agent2", completed),
                "progress": 50,
                "message": "Auditing and refining pathway options..."
            })

            # 2. Run Audits in parallel for all options
            audit_tasks = [
                run_option_audits(bp, current, goal, profile, refine_prompt, existing_roadmap)
                for bp in valid_blueprints
            ]
            audit_results = await asyncio.gather(*audit_tasks, return_exceptions=True)

            completed.extend(["agent2", "agent3", "agent4"])
            yield sse_payload("status", {
                "statuses": build_agent_statuses("ready", completed),
                "progress": 90,
                "message": "Preparing final recommendations..."
            })

            # 3. Merge outputs
            final_alternatives = []
            for i, bp in enumerate(valid_blueprints):
                res = audit_results[i]
                if isinstance(res, Exception):
                    path_audit, steps_audit, market_audit = {}, [], []
                else:
                    path_audit, steps_audit, market_audit = res

                final_json = await build_and_store_final_path(
                    bp, path_audit, steps_audit, market_audit, current, goal, profile
                )
                final_json["option_name"] = option_names[i]
                final_alternatives.append(final_json)

            completed.append("ready")
            elapsed = time.perf_counter() - started_at
            print(f"[Audit API] Alternate paths generation and audits completed in {elapsed:.2f} seconds.")
            yield sse_payload("status", {
                "statuses": build_agent_statuses(None, completed),
                "progress": 100,
                "message": "Your alternate career paths are ready!"
            })
            yield sse_payload("result", {
                "alternatives": final_alternatives
            })
        except Exception as e:
            print(f"[Streamed Path Error] {e}")
            yield sse_payload("error", {
                "message": f"Path generation failed: {str(e)}. Please try again."
            })

    return StreamingResponse(event_stream(), media_type="text/event-stream")

@app.post("/api/path")
async def generate_path(req: PathGenerationRequest):
    current = req.current_position.strip()
    goal = req.target_goal.strip()
    profile = req.profile or {}
    refine_prompt = req.refine_prompt.strip() if req.refine_prompt else None
    existing_roadmap = req.existing_roadmap
    focus_req = req.focus.strip() if req.focus else None
    
    if not current or not goal:
        raise HTTPException(status_code=400, detail="Current position and Target goal cannot be empty")
    
    if refine_prompt:
        val = refine_prompt.lower().strip()
        noise = [
            "tell me a story", "tell a story", "write a story", "write a poem", "write a song",
            "tell me a joke", "tell a joke", "joke", "weather", "capital of", "who is",
            "what is the meaning of life", "hi", "hello", "hey", "how are you", "what's up",
            "sing a song", "write code", "help me chat", "how are you doing"
        ]
        valid_keywords = [
            "step", "milestone", "path", "road", "course", "market", "description", "objective",
            "duration", "add", "change", "remove", "delete", "update", "make", "give", "focus",
            "study", "prep", "sat", "ielts", "act", "toefl", "exam", "career", "university",
            "college", "school", "curriculum", "grade", "subject", "class", "detail", "more",
            "resource", "mentor", "timeline", "month", "year", "academics", "score", "placement",
            "portfolio", "admission", "ielts", "gpa", "internship", "project"
        ]
        if any(n in val for n in noise) or len(val) < 4 or not any(kw in val for kw in valid_keywords):
            raise HTTPException(status_code=400, detail="This request is irrelevant to career pathway refinement. Please provide specific instructions to adjust this pathway, such as 'change step 1 description' or 'add more milestones'.")

    try:
        foci = [
            "Academic Focus: Focus on school exams, target grades, standardized test prep (SAT/ACT/IELTS/TOEFL), academic honors, research papers, curriculum rigor, and top-tier university placement.",
            "Practical Focus: Focus on technical/hands-on skill acquisition, portfolio development, coding/engineering projects, professional certifications, industry internships, and practical deliverables.",
            "Holistic Focus: Focus on peer cohorts, soft skills, public speaking, open-source contributions, self-paced courses, expert counselor reviews, and career counseling sessions."
        ]
        option_names = ["Academic & Research", "Practical & Industry", "Holistic & Career-Prep"]

        if focus_req:
            matched_idx = None
            for idx, name in enumerate(option_names):
                if focus_req.lower() in name.lower() or name.lower() in focus_req.lower():
                    matched_idx = idx
                    break
            if matched_idx is not None:
                foci = [foci[matched_idx]]
                option_names = [option_names[matched_idx]]

        # 1. Run Agent 1 in parallel
        blueprint_tasks = [
            run_agent_1_blueprint(current, goal, profile, refine_prompt, existing_roadmap, focus=focus)
            for focus in foci
        ]
        blueprints = await asyncio.gather(*blueprint_tasks, return_exceptions=True)
        
        valid_blueprints = []
        for i, bp in enumerate(blueprints):
            if isinstance(bp, Exception) or not bp or "macro_path" not in bp:
                valid_blueprints.append(get_fallback_mock_roadmap(current, goal, profile, refine_prompt, focus=foci[i]))
            else:
                valid_blueprints.append(bp)
                
        # 2. Run Audits in parallel
        audit_tasks = [
            run_option_audits(bp, current, goal, profile, refine_prompt, existing_roadmap)
            for bp in valid_blueprints
        ]
        audit_results = await asyncio.gather(*audit_tasks, return_exceptions=True)
        
        # 3. Merge
        final_alternatives = []
        for i, bp in enumerate(valid_blueprints):
            res = audit_results[i]
            if isinstance(res, Exception):
                path_audit, steps_audit, market_audit = {}, [], []
            else:
                path_audit, steps_audit, market_audit = res
                
            final_json = await build_and_store_final_path(
                bp, path_audit, steps_audit, market_audit, current, goal, profile
            )
            final_json["option_name"] = option_names[i]
            final_alternatives.append(final_json)
            
        return {"alternatives": final_alternatives}
        
    except Exception as e:
        print(f"[AI Pipeline Warning] Exception occurred during generation: {e}. Recovering with fallbacks.")
        final_alternatives = []
        foci = [
            "Academic Focus: Focus on school exams, target grades, standardized test prep (SAT/ACT/IELTS/TOEFL), academic honors, research papers, curriculum rigor, and top-tier university placement.",
            "Practical Focus: Focus on technical/hands-on skill acquisition, portfolio development, coding/engineering projects, professional certifications, industry internships, and practical deliverables.",
            "Holistic Focus: Focus on peer cohorts, soft skills, public speaking, open-source contributions, self-paced courses, expert counselor reviews, and career counseling sessions."
        ]
        option_names = ["Academic & Research", "Practical & Industry", "Holistic & Career-Prep"]
        
        if focus_req:
            matched_idx = None
            for idx, name in enumerate(option_names):
                if focus_req.lower() in name.lower() or name.lower() in focus_req.lower():
                    matched_idx = idx
                    break
            if matched_idx is not None:
                foci = [foci[matched_idx]]
                option_names = [option_names[matched_idx]]

        for i in range(len(foci)):
            final_json = get_fallback_mock_roadmap(current, goal, profile, refine_prompt, focus=foci[i])
            name_tokens = build_name_patterns(profile, current)
            if name_tokens:
                final_json = recursive_sanitize(final_json, name_tokens)
            final_json["db_id"] = None
            final_json["status"] = "draft"
            final_json["option_name"] = option_names[i]
            final_alternatives.append(final_json)
        return {"alternatives": final_alternatives}


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
        
        final_json["db_id"] = None
        final_json["status"] = "draft"
        
        elapsed = time.time() - start_time
        print(f"[Audit API] Parallel audit completed in {elapsed:.2f} seconds.")
        return final_json
        
    except Exception as e:
        print(f"[AI Pipeline Warning] Exception occurred during audit: {e}. Recovering with fallback.")
        final_json = get_fallback_mock_roadmap(current, goal, profile)
        name_tokens = build_name_patterns(profile, current)
        if name_tokens:
            final_json = recursive_sanitize(final_json, name_tokens)
        
        final_json["db_id"] = None
        final_json["status"] = "draft"
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
    projection = {"roadmap_data.macro_path": 0}
    
    # 1. Fetch raw documents from DB with projection
    raw_docs = []
    if status == "under_admin_review" or status == "all":
        cursor = pending_paths_collection.find({}, projection).sort("created_at", -1)
        async for doc in cursor:
            doc["status"] = "under_admin_review"
            raw_docs.append(doc)
            
    if status == "published" or status == "all":
        cursor = published_paths_collection.find({}, projection).sort("created_at", -1)
        async for doc in cursor:
            doc["status"] = "published"
            raw_docs.append(doc)
            
    if not raw_docs:
        return []

    # 2. Extract unique emails for bulk profile fetch
    emails = set()
    for doc in raw_docs:
        email = None
        if "profile" in doc and doc["profile"] and "email" in doc["profile"]:
            email = doc["profile"]["email"]
        if not email and "created_by" in doc and doc["created_by"]:
            email = doc["created_by"]
        if not email and "createdBy" in doc and doc["createdBy"]:
            email = doc["createdBy"]
        if email:
            emails.add(email.lower())
            
    # 3. Bulk fetch profiles from DB in one roundtrip
    profile_map = {}
    if emails:
        profiles_cursor = profiles_collection.find({"email": {"$in": list(emails)}})
        async for p in profiles_cursor:
            profile_map[p["email"].lower()] = serialize_mongo_doc(p)

    # 4. Serialize and enrich in-memory (0 database calls per path)
    for doc in raw_docs:
        serialized = serialize_mongo_doc(doc)
        
        email = None
        if "profile" in serialized and serialized["profile"] and "email" in serialized["profile"]:
            email = serialized["profile"]["email"]
        if not email and "created_by" in serialized and serialized["created_by"]:
            email = serialized["created_by"]
        if not email and "createdBy" in serialized and serialized["createdBy"]:
            email = serialized["createdBy"]
            
        if email and email.lower() in profile_map:
            serialized["profile"] = profile_map[email.lower()]
            serialized["created_by"] = email.lower()
            serialized["createdBy"] = email.lower()
        else:
            if "profile" not in serialized or not serialized["profile"]:
                serialized["profile"] = {"email": email or "", "name": "Anonymous Student"}
                
        paths.append(serialized)
        
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
        serialized = serialize_mongo_doc(doc)
        return await enrich_path_profile(serialized)
        
    doc = await published_paths_collection.find_one({"_id": obj_id})
    if doc:
        doc["status"] = "published"
        serialized = serialize_mongo_doc(doc)
        return await enrich_path_profile(serialized)
        
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
            # Migrate from pending to published, retaining all custom fields (e.g. admin_notes, feedback, custom query metadata)
            published_doc = {
                **pending_doc,
                "roadmap_data": req.roadmap_data,
                "status": "published",
                "published_at": datetime.datetime.now(datetime.timezone.utc)
            }
            if "updated_at" in published_doc:
                del published_doc["updated_at"]
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
                    "updated_at": datetime.datetime.now(datetime.timezone.utc)
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
                "updated_at": datetime.datetime.now(datetime.timezone.utc)
            }}
        )
        return {"message": f"Successfully updated career path status to {req.status}", "status": req.status}
        
    raise HTTPException(status_code=404, detail="Career path not found")


@app.post("/api/paths/save")
async def save_path(req: SavePathRequest):
    current = req.current_position.strip()
    goal = req.target_goal.strip()
    profile = req.profile or {}
    roadmap_data = req.roadmap_data
    
    if not current or not goal:
        raise HTTPException(status_code=400, detail="Current position and Target goal cannot be empty")
        
    email = profile.get("email") if profile else None
    
    path_doc = {
        "query": f"Current: {current}. Goal: {goal}.",
        "current_position": current,
        "target_goal": goal,
        "profile": profile,
        "roadmap_data": roadmap_data,
        "status": "under_admin_review",
        "created_at": datetime.datetime.now(datetime.timezone.utc),
        "created_by": email,
        "createdBy": email
    }
    
    insert_result = await pending_paths_collection.insert_one(path_doc)
    
    return {
        "message": "Path saved successfully for admin review",
        "db_id": str(insert_result.inserted_id)
    }


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
