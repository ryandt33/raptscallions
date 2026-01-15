# Senior Trainer Agent - Design Outline

## Overview

The **Senior Trainer** agent is a meta-agent that observes, evaluates, and improves the performance of other agents in the system. It analyzes agent outputs, identifies gaps and inefficiencies, and systematically refines agent prompts, commands, and workflows to enhance overall system quality.

## Core Responsibilities

1. **Audit Agent Outputs** — Review completed agent work (code reviews, QA reports, specs, etc.) for quality, completeness, and adherence to standards
2. **Identify Patterns** — Detect recurring issues, gaps, or inefficiencies across multiple agent interactions
3. **Provide Feedback** — Generate actionable feedback on specific agent outputs
4. **Improve Agent Definitions** — Propose and implement refinements to agent prompts, commands, and instructions
5. **Validate Improvements** — Verify that changes to agent definitions actually improve outcomes

## Agent Scope

### What the Senior Trainer Does

- Analyzes agent outputs (reviews, reports, specs, code) for quality and completeness
- Identifies missing steps, unclear guidance, or inefficient patterns
- Compares actual agent behavior against intended agent purpose
- Suggests improvements to agent prompts, command descriptions, and workflow instructions
- Implements approved improvements to agent definition files
- Tracks improvement impact over time

### What the Senior Trainer Does NOT Do

- Write code implementations (delegates to developer agent)
- Perform QA testing (delegates to qa agent)
- Write specs (delegates to analyst agent)
- Execute tasks directly (it's a meta-layer for improvement)

## Proposed Commands

### 1. `/interaction-feedback` (or `/audit`)

**Purpose:** Analyze a specific agent interaction and provide detailed feedback.

**Usage:**
```bash
/audit <agent-type> <artifact-path>
/audit qa backlog/docs/reviews/E01/E01-T009-qa-report.md
/audit reviewer backlog/docs/reviews/E01/E01-T009-code-review.md
```

**What it does:**
1. Reads the specified artifact (review, report, spec, etc.)
2. Compares output against agent's stated purpose and instructions
3. Evaluates:
   - **Completeness** — Did the agent cover all expected areas?
   - **Clarity** — Is the output clear and actionable?
   - **Adherence** — Did the agent follow its instructions?
   - **Effectiveness** — Does the output serve its intended purpose?
4. Generates a feedback report with:
   - Strengths (what worked well)
   - Gaps (what was missing or incomplete)
   - Inefficiencies (what could be streamlined)
   - Specific recommendations for improvement

**Output:** Feedback report saved to `backlog/docs/training/<agent-type>-feedback-<timestamp>.md`

**Alternative Names:**
- `/audit` ✅ (shorter, clearer)
- `/review-agent` (too similar to code review)
- `/agent-feedback` (redundant)

**Recommendation:** Use `/audit` as primary command name.

---

### 2. `/improvement-plan` (or `/refine-agent`)

**Purpose:** Analyze patterns across multiple agent outputs and create a systematic improvement plan.

**Usage:**
```bash
/improvement-plan <agent-type>
/improvement-plan qa
/improvement-plan reviewer --since 2026-01-01
```

**What it does:**
1. Searches for multiple artifacts from the specified agent type
2. Analyzes patterns across outputs:
   - Recurring gaps or omissions
   - Common areas of confusion or ambiguity
   - Inconsistencies in interpretation of instructions
3. Reviews current agent definition (prompt, commands, instructions)
4. Identifies root causes (unclear prompts, missing guidance, etc.)
5. Proposes specific changes:
   - Prompt refinements (add clarity, examples, constraints)
   - Command improvements (better descriptions, additional flags)
   - Workflow enhancements (reorder steps, add checkpoints)
6. Prioritizes improvements (high/medium/low impact)

**Output:** Improvement plan saved to `backlog/docs/training/<agent-type>-improvement-plan-<timestamp>.md`

**Alternative Names:**
- `/refine-agent` ✅ (more descriptive of action)
- `/improvement-plan` (good but generic)
- `/analyze-patterns` (too broad)

**Recommendation:** Use `/refine-agent` as primary command name.

---

### 3. `/improvement-implementation` (or `/apply-improvements`)

**Purpose:** Implement approved improvements to agent definitions.

**Usage:**
```bash
/apply-improvements <plan-path>
/apply-improvements backlog/docs/training/qa-improvement-plan-20260115.md
/apply-improvements backlog/docs/training/qa-improvement-plan-20260115.md --item 1,3,5
```

**What it does:**
1. Reads the improvement plan
2. Confirms which improvements to implement (interactive or via flags)
3. Locates the agent definition files (e.g., `.claude/agents/qa.md`)
4. Applies the approved changes:
   - Updates agent prompts
   - Modifies command descriptions
   - Adjusts workflow instructions
5. Documents changes in a changelog
6. Optionally creates a git commit with the improvements

**Output:**
- Modified agent definition files
- Changelog: `backlog/docs/training/<agent-type>-changelog-<timestamp>.md`
- Git commit (optional)

**Alternative Names:**
- `/apply-improvements` ✅ (clear action verb)
- `/implement-improvements` (too long)
- `/update-agent` (too generic)

**Recommendation:** Use `/apply-improvements` as primary command name.

---

## Additional Commands (Optional)

### 4. `/compare-agents` (Optional, Lower Priority)

**Purpose:** Compare multiple agents' performance on similar tasks to identify best practices.

**Usage:**
```bash
/compare-agents qa reviewer --task-type code-quality
```

**What it does:**
1. Finds artifacts from multiple agent types
2. Compares approaches, depth, and effectiveness
3. Identifies best practices to propagate across agents

**Priority:** Low — nice to have, but `/audit` and `/refine-agent` cover 80% of use cases.

---

### 5. `/training-report` (Optional, Reporting Only)

**Purpose:** Generate a summary report of all training activities and improvements over time.

**Usage:**
```bash
/training-report
/training-report --agent qa --since 2026-01-01
```

**What it does:**
1. Aggregates all feedback reports, improvement plans, and changelogs
2. Shows trends (e.g., "QA agent improved in edge case coverage after 2026-01-10 update")
3. Provides metrics on training effectiveness

**Priority:** Low — useful for long-term tracking, but not critical for MVP.

---

## Recommended Command Set (Final)

| Command               | Purpose                                              | Priority |
| --------------------- | ---------------------------------------------------- | -------- |
| `/audit`              | Analyze a specific agent interaction and give feedback | HIGH     |
| `/refine-agent`       | Create improvement plan from pattern analysis        | HIGH     |
| `/apply-improvements` | Implement approved improvements to agent definitions | HIGH     |
| `/compare-agents`     | Compare agents to identify best practices            | MEDIUM   |
| `/training-report`    | Generate training effectiveness report               | LOW      |

**MVP Recommendation:** Implement `/audit`, `/refine-agent`, and `/apply-improvements` first.

---

## Agent Definition Structure

### Agent Metadata

```yaml
name: senior-trainer
description: Meta-agent that audits agent outputs and improves agent definitions
model: sonnet  # Requires reasoning capability
access:
  - Read  # Read agent outputs, definitions
  - Write # Write feedback reports, improvement plans
  - Edit  # Edit agent definition files
  - Glob  # Find artifacts across backlog
  - Grep  # Search for patterns
```

### Agent Prompt (High-Level)

```markdown
You are the Senior Trainer agent. Your role is to improve the quality and effectiveness of other agents in the system.

## Your Responsibilities

1. **Audit agent outputs** — Review completed work for quality, completeness, and adherence to instructions
2. **Identify patterns** — Detect recurring issues across multiple agent interactions
3. **Propose improvements** — Suggest refinements to agent prompts, commands, and workflows
4. **Implement changes** — Apply approved improvements to agent definition files

## Available Commands

- `/audit <agent-type> <artifact-path>` — Analyze a specific agent output and provide feedback
- `/refine-agent <agent-type>` — Analyze patterns and create an improvement plan
- `/apply-improvements <plan-path>` — Implement approved improvements to agent definitions

## Key Principles

- **Evidence-based** — Base all feedback on specific examples from agent outputs
- **Actionable** — Provide clear, specific recommendations, not vague observations
- **Systematic** — Look for patterns, not one-off issues
- **Respectful** — Frame feedback constructively, acknowledge what works well
- **Impact-focused** — Prioritize improvements with highest impact on quality

## When to Use Each Command

- Use `/audit` when reviewing a single artifact to identify specific gaps
- Use `/refine-agent` when you notice recurring issues across multiple outputs
- Use `/apply-improvements` after an improvement plan has been reviewed and approved
```

---

## Workflow Examples

### Example 1: Auditing a QA Report

**User:** `/audit qa backlog/docs/reviews/E01/E01-T009-qa-report.md`

**Senior Trainer:**
1. Reads the QA report
2. Reads the QA agent definition to understand expectations
3. Analyzes the report for:
   - Did it test all acceptance criteria?
   - Did it test edge cases?
   - Are steps reproducible?
   - Are results clear (pass/fail)?
4. Writes feedback report to `backlog/docs/training/qa-feedback-20260115-143022.md`:

```markdown
# QA Agent Audit - E01-T009

## Strengths
- All acceptance criteria were tested
- Steps are clear and reproducible
- Pass/fail results are unambiguous

## Gaps
- No edge case testing (e.g., what happens with invalid session IDs?)
- Missing security considerations (e.g., IDOR testing)
- No performance testing mentioned

## Recommendations
1. Add "Edge Cases" section to QA agent prompt
2. Include security checklist in QA workflow
3. Consider performance implications for DB-heavy features

**Impact:** Medium — would catch more issues before production
```

---

### Example 2: Creating an Improvement Plan

**User:** `/refine-agent qa`

**Senior Trainer:**
1. Finds all QA reports: `backlog/docs/reviews/**/qa-report.md`
2. Analyzes patterns:
   - 80% of reports missing edge case testing
   - 60% missing security considerations
   - Inconsistent formatting (some use checklists, some don't)
3. Reads current QA agent definition
4. Proposes improvement plan:

```markdown
# QA Agent Improvement Plan

## Identified Patterns (5 reports analyzed)

### High-Frequency Issues
1. **Missing edge case testing** (4/5 reports) — Most reports only test happy path
2. **Inconsistent security checks** (3/5 reports) — Some reports skip security entirely
3. **Format inconsistency** (3/5 reports) — Some use checklists, some use prose

### Root Causes
1. QA agent prompt doesn't explicitly require edge case testing
2. Security checklist is optional, not mandatory
3. No standard report template enforced

## Proposed Improvements

### 1. Update QA Agent Prompt (HIGH IMPACT)
**Current:**
> Test all acceptance criteria and document results.

**Proposed:**
> Test all acceptance criteria in three phases:
> 1. Happy path testing (expected inputs, expected results)
> 2. Edge case testing (boundary values, empty inputs, null handling)
> 3. Security testing (authentication, authorization, input validation)

### 2. Add Mandatory Security Checklist (HIGH IMPACT)
**Add to prompt:**
> For every feature, verify:
> - [ ] Authentication is enforced where required
> - [ ] Authorization prevents unauthorized access
> - [ ] User input is validated and sanitized
> - [ ] Sensitive data is not exposed in errors

### 3. Enforce Report Template (MEDIUM IMPACT)
**Add to workflow:**
> Use the following template for all QA reports:
> [template structure here]

## Expected Outcomes
- 90%+ of reports include edge case testing
- 100% of reports include security checks
- Consistent, scannable report format
```

---

### Example 3: Applying Improvements

**User:** `/apply-improvements backlog/docs/training/qa-improvement-plan-20260115.md`

**Senior Trainer:**
1. Reads the improvement plan
2. Asks user: "Apply all improvements (1-3) or select specific items? [all/select]"
3. User: "all"
4. Locates `.claude/agents/qa.md`
5. Applies changes:
   - Updates prompt with 3-phase testing guidance
   - Adds security checklist
   - Adds report template to workflow
6. Creates changelog:

```markdown
# QA Agent Changelog - 2026-01-15

## Changes Applied

### Prompt Updates
- Added 3-phase testing framework (happy path, edge cases, security)
- Made security checklist mandatory (was optional)

### Workflow Updates
- Added standard report template
- Added edge case brainstorming step

## Rationale
Pattern analysis of 5 QA reports showed:
- 80% missing edge case testing
- 60% missing security considerations
- Inconsistent report formatting

## Expected Impact
- Higher bug catch rate before production
- Consistent, actionable QA reports
- Fewer security issues slipping through
```

7. Optionally creates git commit:
```
chore(agents): improve QA agent prompt and workflow

- Add 3-phase testing framework
- Make security checklist mandatory
- Enforce standard report template

Based on pattern analysis of 5 QA reports.

Refs: backlog/docs/training/qa-improvement-plan-20260115.md
```

---

## Command Naming - Final Recommendation

After analysis, here are the recommended command names:

| Original Proposal         | Recommended Name      | Reasoning                                      |
| ------------------------- | --------------------- | ---------------------------------------------- |
| `/interaction-feedback`   | **`/audit`**          | Shorter, clearer, matches common terminology   |
| `/improvement-plan`       | **`/refine-agent`**   | More descriptive of action being taken         |
| `/improvement-implementation` | **`/apply-improvements`** | Clear action verb, focuses on "what" not "how" |

### Rationale

1. **`/audit`** is concise and immediately conveys "review for quality"
2. **`/refine-agent`** makes it clear you're improving an agent, not just planning generically
3. **`/apply-improvements`** is an action verb that clearly states intent

---

## Open Questions

1. **Approval Process** — Should improvements require user approval before implementation, or trust the agent?
   - **Recommendation:** Require approval for `/apply-improvements` (safety check)

2. **Scope** — Should the senior trainer also audit non-agent outputs (e.g., developer code)?
   - **Recommendation:** Start with agent outputs only, expand later if needed

3. **Metrics** — How do we measure if improvements actually work?
   - **Recommendation:** Track issue frequency before/after changes (future enhancement)

4. **Access Control** — Should all users have access to senior trainer, or only admins?
   - **Recommendation:** Admin-only initially (changes agent definitions = high impact)

---

## Implementation Priority

### Phase 1 (MVP)
1. Implement `/audit` command
2. Implement `/refine-agent` command
3. Implement `/apply-improvements` command
4. Create senior-trainer agent definition file

### Phase 2 (Enhancements)
1. Add `/compare-agents` for cross-agent best practices
2. Add `/training-report` for trend analysis
3. Add metrics tracking (issue frequency before/after improvements)

### Phase 3 (Advanced)
1. Automated pattern detection (proactive suggestions)
2. A/B testing for agent prompt variations
3. Integration with CI/CD (block merges if agent quality degrades)

---

## Summary

The Senior Trainer agent is a **meta-layer for continuous improvement** of the agent system. By systematically auditing outputs, identifying patterns, and refining agent definitions, it ensures the quality bar rises over time.

**Core Commands:**
- `/audit` — Review specific agent output, provide feedback
- `/refine-agent` — Analyze patterns, propose improvements
- `/apply-improvements` — Implement approved changes to agent definitions

**Key Design Principles:**
- Evidence-based (uses real artifacts)
- Actionable (specific recommendations, not vague)
- Systematic (patterns over one-offs)
- Safe (approval required for changes)

This agent will help **close the feedback loop** and make the entire agent ecosystem more effective over time.
