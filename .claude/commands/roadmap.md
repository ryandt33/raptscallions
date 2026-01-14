---
description: View or update the project roadmap
allowed-tools:
  - Read
  - Write
  - Glob
  - Grep
---

# Roadmap

View the project roadmap or plan the next phase.

## Usage

```
/roadmap                    # Show current roadmap status
/roadmap plan-next          # Plan the next unstarted phase
/roadmap add "Phase name"   # Add a new phase to roadmap
```

## Process

### View Roadmap

1. Read all epic files from `backlog/tasks/*/`
2. Calculate progress per epic
3. Display roadmap with status

### Plan Next Phase

1. Find the next unplanned/unstarted phase
2. Load PM agent: `@pm`
3. Break down the phase into tasks

## Output Example

```
📍 RaptScallions Roadmap

Phase 1: Foundation (Weeks 1-2)
├── E01: Core Infrastructure    ████████░░ 80%
│   └── 4/5 tasks complete
├── E02: Authentication         ██░░░░░░░░ 20%
│   └── 1/5 tasks complete
└── E03: Core Entities          ░░░░░░░░░░ 0%
    └── 0/7 tasks complete

Phase 2: Runtime (Weeks 3-4)
├── E04: Module System          ░░░░░░░░░░ Not started
├── E05: Chat Runtime           ░░░░░░░░░░ Not started
└── E06: Frontend Foundation    ░░░░░░░░░░ Not started

Phase 3: Features (Weeks 5-8)
└── Not yet planned

Phase 4: Polish (Weeks 9-12)
└── Not yet planned

Overall: ███░░░░░░░ 25% complete
```

## Arguments

`$ARGUMENTS` - Optional subcommand (plan-next, add)
