# Multi-Agent Parallel Coding System

Structured workflow for multiple agents developing code collaboratively with clear logging and coordination.

---

## Overview

**Core Concept**: Agents work in parallel with structured status updates and dependency tracking.

**Phases**: Kick Off → Iteration → Refinement → DONE

**Benefits**: Transparency, efficiency, minimal conflicts

---

## Agent Log Format

```
🔸 Agent-[ID]:
Status: [Kick Off | Iteration | Refinement | DONE]
Completed:
1. [Task 1]
2. [Task 2]
3. [Task 3]

Implements: [Key functions/components]
Notes: "[Dependencies, coordination notes]"
```

**Example:**
```
🔸 Agent-1:
Status: Iteration
Completed:
1. Set up project structure
2. Defined data models
3. Created CSV loader framework

Implements: load_csv_data(filepath) → List[Dict]
Notes: "Output format should match Agent-2 expectations"
```

---

## Workflow

1. **Initialize**: Assign tasks, define dependencies
2. **Kick Off**: Each agent posts initial plan
3. **Develop**: Regular log updates, coordinate dependencies
4. **Integrate**: Merge code, test, finalize

---

## Coordination Rules

- **Update Frequency**: Every 30-60 minutes
- **Dependency Changes**: Immediate notification
- **Conflicts**: Direct agent communication
- **Completion**: Clear DONE status signal

---

## Development Restrictions

### Project Constraints
- **Language**: Python 3.8+ only
- **Dependencies**: Minimal external libraries (prefer stdlib)
- **File Structure**: Single directory, max 10 files
- **Function Size**: Max 50 lines per function
- **Documentation**: Docstrings required for all functions

### Code Standards
- **Naming**: snake_case for functions/variables, PascalCase for classes
- **Type Hints**: Required for all function signatures
- **Error Handling**: Explicit exception handling, no silent failures
- **Testing**: Unit tests for core functions
- **Comments**: Explain complex logic, not obvious code

### Agent Constraints
- **Max 2 agents** per project
- **No overlapping files** - each agent owns specific files
- **Interface contracts** must be agreed before implementation
- **Code review** required before DONE status

---

Keep it simple, keep it working.
