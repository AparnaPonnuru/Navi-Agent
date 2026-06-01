# How to Use This Project with Claude

## Setup
1. Upload ALL files from this folder into your NAAVI_AGENT Claude project
2. Claude will now have full context of the entire project
3. Start a new chat inside the project and use the prompts below

## Best Conversation Starters

### To Build a New Feature
```
Read project-spec.md and architecture.md.
I want to add a [feature name].
Help me write the backend endpoint and React component for it.
```

### To Debug Code
```
Here is my code: [paste code]
It is giving this error: [paste error]
Based on the architecture in architecture.md, what is wrong?
```

### To Improve the Claude Prompt
```
Read prompt-templates.md.
The path simulator is giving generic results.
Rewrite the prompt to force more specific, surprising outputs.
```

### To Add a New Tab / Feature
```
Read all the docs files.
Add a new feature called "Skill Gap Analyzer".
User inputs current skills + target role.
Claude returns match score, missing skills, and quick wins.
Follow the same pattern as PathSimulator.jsx.
```

### To Generate Test Data
```
Read prompt-templates.md.
Generate 10 test inputs for the Path Simulator.
Tell me which ones are likely to give weak outputs and why.
```

## Tips for Great Results
- Always say which file to reference: "Read architecture.md and..."
- Paste your actual code when debugging — don't just describe the problem
- Ask for one thing at a time
- After Claude generates code, say "now write the CSS for this component"
- If output is generic, say "be more specific, use real resource names"

## What Claude Knows (from uploaded files)
| File | Claude Knows |
|------|-------------|
| project-spec.md | What Naaviverse is, who it's for, design principles |
| architecture.md | API endpoint, JSON schema, component structure, run commands |
| prompt-templates.md | The exact Claude prompt, rules, test inputs |
| how-to-use-claude.md | This file |
