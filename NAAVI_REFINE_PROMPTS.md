# 🤖 Naavi Agent — Refine Prompt Guide
> Use these prompts in the **"Refine with Naavi Agent"** box on the Dashboard.
> Replace `[step number]` with the actual step number (1, 2, 3 ... 9).

---

## 📋 HOW IT WORKS

1. A pathway must already be generated on screen
2. Type your prompt in the **"Refine with Naavi Agent"** text box (left panel)
3. Wait for the green ✅ "Instruction looks good!" message from Naavi
4. Click **"Refine Pathway"** button
5. The AI will surgically update only that one step/field — no full regeneration

---

## 🗂️ SECTION 1 — Macro View (Big Picture Overview)

The **Macro View** is the "big picture" paragraph shown under the Macro tab of each step.

```
update the macro view for step [step number]
```
```
rewrite the macro view for step [step number] with more academic detail
```
```
make the macro view in step [step number] more specific to AI and machine learning
```
```
update the macro overview for step [step number] to include university prep strategies
```

**Example:**
```
update the macro view for step 1 with a focus on ICSE board exam preparation
```

---

## 🔬 SECTION 2 — Micro View (Detailed Week-by-Week View)

The **Micro View** is the detailed breakdown shown under the Micro tab of each step.

```
update the micro view for step [step number]
```
```
rewrite the micro view for step [step number] with more specific activities
```
```
make the micro view in step [step number] more practical and hands-on
```
```
update the micro view for step [step number] to focus on coding projects
```

**Example:**
```
update the micro view for step 2 with weekly study schedule and exam prep tips
```

---

## 🔭 SECTION 3 — Nano View (Expert/Mentor Level Detail)

The **Nano View** is the expert-level deep dive shown under the Nano tab of each step.

```
update the nano view for step [step number]
```
```
rewrite the nano view for step [step number] with expert-level strategies
```
```
make the nano view for step [step number] more advanced and research-focused
```

**Example:**
```
update the nano view for step 3 with expert guidance on research paper writing
```

---

## 📝 SECTION 4 — Step Description

The **Description** is the short summary text shown below the step title.

```
update the description for step [step number]
```
```
rewrite the description for step [step number] to be more concise
```
```
change the description for step [step number] to focus on competitive exam preparation
```
```
make the description for step [step number] more motivating and clear
```

**Example:**
```
update the description for step 1 to highlight IGCSE and SAT preparation goals
```

---

## 🛍️ SECTION 5 — Marketplace (Strict Scoped Updates)

Marketplace prompts have two independent scopes:

- **View:** Macro (`macro_free`), Micro (`micro_structured`), or Nano (`nano_expert`)
- **Category:** Mentors, Vendors, Institutions, or Distributors

Only the requested category inside the requested view is replaced. Every other category, view, step, and roadmap field is preserved exactly.

If the prompt does not name a view, it defaults to the **Macro Marketplace**. Therefore `update the marketplace mentors for step 1` updates only **Step 1 → Macro → Mentors** and does not modify Vendors.

### 5A — Update Macro Marketplace Vendors
```
update the macro marketplace vendors for step [step number]
```
```
refresh the free resources in the marketplace for step [step number]
```
```
update the marketplace for step [step number] with better free resources
```
```
add more relevant free resource vendors to step [step number] marketplace
```

**Example:**
```
update the marketplace vendors for step 1 with AI-focused free learning platforms
```

### 5B — Update Micro Marketplace Vendors / Courses
```
update the micro marketplace vendors for step [step number]
```
```
refresh the course recommendations in step [step number] marketplace
```
```
add better certification courses to the marketplace for step [step number]
```

**Example:**
```
update the paid courses in the marketplace for step 2 with machine learning certifications
```

### 5C — Update Marketplace Mentors
```
update the marketplace mentors for step [step number]
```
```
refresh the coaching options in step [step number] marketplace
```
```
add expert mentors to the marketplace for step [step number]
```

**Example:**
```
update the marketplace mentors for step 1 with AI tutors
```

The example above targets Macro mentors because the view is omitted. Name another view explicitly when needed:

```
update the micro marketplace mentors for step 1 with project coaches
```
```
update the nano marketplace mentors for step 1 with admissions experts
```

### 5D — Update Institutions or Distributors
```
update the macro marketplace institutions for step [step number]
```
```
update the macro marketplace distributors for step [step number]
```

---

## ✅ SECTION 6 — Micro Steps (Checklist / To-Do Items)

The **Micro Steps** are the actionable task checklist shown in the Micro tab.

```
update the checklist for step [step number]
```
```
add more tasks to the micro steps for step [step number]
```
```
update the todo list in step [step number] with more specific action items
```
```
rewrite the micro steps for step [step number] with weekly tasks
```

**Example:**
```
update the checklist for step 1 with specific tasks for ICSE exam preparation
```

---

## 🔄 SECTION 7 — Full Pathway Refinement (Regenerates Everything)

These prompts **do NOT** use the surgical patch — they regenerate the full pathway.
Use these when you want bigger changes across the whole roadmap.

```
add more steps to the pathway
```
```
make the pathway more focused on practical skills
```
```
update the pathway to include more internship preparation
```
```
change the pathway to focus more on competitive exams like SAT and IELTS
```
```
make the whole pathway more suitable for a Grade 10 student
```

---

## ⚠️ IMPORTANT RULES

| ✅ DO | ❌ DON'T |
|---|---|
| Always include **"step [number]"** for surgical updates | Don't say "step one" — use the number: "step 1" |
| Wait for the green ✅ message before clicking Refine | Don't click Refine if Naavi shows a red ❌ message |
| Be specific about what you want changed | Don't use vague prompts like "make it better" |
| Name the Marketplace category you want changed | Don't omit the category when you require a strict scoped update |

---

## 🧪 QUICK TEST PROMPTS (Copy-Paste Ready)

```
update the macro view for step 1
```
```
update the micro view for step 2
```
```
update the description for step 1
```
```
update the marketplace vendors for step 1
```
```
update the marketplace mentors for step 1
```
```
update the checklist for step 1
```
```
update the nano view for step 3
```

---

## 📌 FIELD KEYWORD CHEAT SHEET

| Field to Update | Keywords to Use in Prompt |
|---|---|
| Macro View | `macro view`, `macro overview`, `macro tab` |
| Micro View | `micro view`, `micro tab`, `detailed view` |
| Nano View | `nano view`, `nano tab`, `expert view` |
| Description | `description`, `desc`, `summary` |
| Marketplace Macro View | `macro`, `free resources`; defaults here when omitted |
| Marketplace Micro View | `micro`, `paid`, `structured` |
| Marketplace Nano View | `nano`, `expert session` |
| Marketplace Mentors | `mentor`, `coaching`, `coach` |
| Marketplace Vendors | `vendor`, `platform`, `course`, `certification`, `bootcamp` |
| Marketplace Institutions | `institution`, `university`, `college`, `school` |
| Marketplace Distributors | `distributor`, `YouTube`, `book`, `docs`, `community` |
| Step Checklist | `checklist`, `micro steps`, `todo`, `tasks list` |

---

*Generated for Navi-Agent by Naavi Refine System — share freely with your team!* 🚀
