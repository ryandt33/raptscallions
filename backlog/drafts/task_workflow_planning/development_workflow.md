# Development Category: Workflow Deep Dive

> **Status:** Draft
> **Created:** 2026-01-16
> **Purpose:** Detailed breakdown of each phase in the `development` workflow, analyzing whether each breakpoint earns its keep.

## Current Workflow

```
DRAFT → ANALYZED → [UX_REVIEW] → PLAN_REVIEW → APPROVED →
TESTS_READY → IMPLEMENTING → CODE_REVIEW → QA_REVIEW →
INTEGRATION_TESTING → DOCS_UPDATE → DONE
```

**States:** 12 (including DONE)
**Transitions:** 11
**Agents involved:** 7 (analyst, designer, architect, developer, reviewer, qa, writer)

---

## The 7 Benefits of Workflow Gaps

| # | Benefit | Description | Key Question |
|---|---------|-------------|--------------|
| 1 | **Context Insulation** | Fresh eyes, no bias from previous work | Does a NEW agent see this fresh? |
| 2 | **Natural Friction** | Human review opportunity, intervention point | Would a human naturally want to review here? |
| 3 | **Artifact Persistence** | Written record for audit, learning, blame tracing | Is a durable artifact created? |
| 4 | **Specialization Focus** | Single job done well, not jack-of-all-trades | Is this a different role/expertise? |
| 5 | **Error Recovery** | Known restart point when phase fails | Can we retry just this phase? |
| 6 | **Parallelization** | Independent phases can run concurrently | Could this run alongside something else? |
| 7 | **Cost Management** | Different models for different phases | Does complexity warrant model choice? |

---

## Master Matrix: All Phases × All Benefits

### Legend
- ✅ = Benefit fully present
- ⚠️ = Benefit partially present or low value
- ❌ = Benefit not present
- N/A = Not applicable to this phase
- ⚡ = Parallelization opportunity exists

### Full Development Workflow Matrix

| Phase Transition | Command | Agent | 1-Context | 2-Friction | 3-Artifact | 4-Specialize | 5-Recovery | 6-Parallel | 7-Cost | Score |
|------------------|---------|-------|-----------|------------|------------|--------------|------------|------------|--------|-------|
| DRAFT → ANALYZED | `/analyze` | analyst | ✅ | ✅ | ✅ analysis.md | ✅ | ✅ | N/A | ✅ haiku | 6/6 |
| ANALYZED → UX_REVIEW | `/review-ux` | designer | ✅ | ✅ | ✅ UX section | ✅ | ✅ | ⚡ w/arch | ✅ haiku | 6/6 |
| UX_REVIEW → PLAN_REVIEW | `/review-plan` | architect | ✅ | ✅ | ✅ spec.md | ✅ | ✅ | ⚡ w/ux | ✅ sonnet | 6/6 |
| APPROVED → TESTS_READY | `/write-tests` | developer | ✅ | ⚠️ low | ✅ test files | ⚠️ TDD | ✅ | N/A | ✅ sonnet | 4/6 |
| TESTS_READY → IMPLEMENTING | `/implement` | developer | ❌ same | ❌ none | ✅ code files | ❌ same | ✅ | N/A | ❌ same | 2/6 |
| IMPLEMENTING → UI_REVIEW | `/review-ui` | designer | ✅ | ✅ | ✅ ui-review.md | ✅ | ✅ | N/A | ✅ haiku | 6/6 |
| UI_REVIEW → CODE_REVIEW | `/review-code` | reviewer | ✅ **fresh** | ✅ | ✅ code-review.md | ✅ | ✅ | N/A | ✅ sonnet | 6/6 |
| CODE_REVIEW → QA_REVIEW | `/qa` | qa | ✅ **fresh** | ✅ | ✅ qa-report.md | ✅ | ✅ | N/A | ✅ sonnet | 6/6 |
| QA_REVIEW → INTEGRATION | `/integration-test` | qa | ⚠️ often same | ⚠️ low | ✅ int-report.md | ⚠️ same | ✅ | N/A | ✅ sonnet | 3/6 |
| INTEGRATION → DOCS_UPDATE | `/update-docs` | writer | ✅ | ⚠️ low | ✅ docs + KB | ✅ | ✅ | N/A | ✅ haiku | 5/6 |

### Scoring Interpretation

| Score | Interpretation | Action |
|-------|----------------|--------|
| 6/6 | All benefits present | ✅ Essential breakpoint |
| 5/6 | Strong value | ✅ Keep |
| 4/6 | Moderate value | ⚠️ Review, may have special purpose |
| 3/6 | Weak value | ⚠️ Consider conditional or merging |
| 2/6 | Minimal value | ❓ Exists for process, not review |
| 1/6 | Very weak | ❌ Should probably remove |
| 0/6 | No value | ❌ Remove |

---

## Analysis by Benefit

### Benefit 1: Context Insulation

**Purpose:** Fresh eyes catch what biased eyes miss.

| Phase | Context Status | Notes |
|-------|----------------|-------|
| DRAFT → ANALYZED | ✅ Fresh | Analyst starts with only task file |
| ANALYZED → UX_REVIEW | ✅ Fresh | Designer sees analysis without knowing exploration history |
| UX_REVIEW → PLAN_REVIEW | ✅ Fresh | Architect decides without being attached to any approach |
| APPROVED → TESTS_READY | ✅ Fresh | Developer sees spec without analysis/architecture debates |
| TESTS_READY → IMPLEMENTING | ❌ Same agent | No context break - same developer continues |
| IMPLEMENTING → UI_REVIEW | ✅ Fresh | Designer sees UI fresh, like a user would |
| UI_REVIEW → CODE_REVIEW | ✅ **Explicit fresh** | Command explicitly starts new context |
| CODE_REVIEW → QA_REVIEW | ✅ **Explicit fresh** | Command explicitly starts new context |
| QA_REVIEW → INTEGRATION | ⚠️ Often same | Same qa agent often continues |
| INTEGRATION → DOCS_UPDATE | ✅ Fresh | Writer sees finished product |

**Insight:** The TESTS_READY → IMPLEMENTING gap has NO context insulation value. It's the same developer in the same session. The gap exists purely for TDD enforcement.

### Benefit 2: Natural Friction

**Purpose:** Human intervention points where review adds value.

| Phase | Friction Value | Human Action |
|-------|----------------|--------------|
| DRAFT → ANALYZED | ✅ High | Review 3 approaches before committing |
| ANALYZED → UX_REVIEW | ✅ High | Approve/reject UX concerns before architecture |
| UX_REVIEW → PLAN_REVIEW | ✅ High | Approve/override architectural decisions |
| APPROVED → TESTS_READY | ⚠️ Low | Could review tests, but rarely do |
| TESTS_READY → IMPLEMENTING | ❌ None | No human review expected between tests and implementation |
| IMPLEMENTING → UI_REVIEW | ✅ High | Review UI issues before code review |
| UI_REVIEW → CODE_REVIEW | ✅ High | Review code quality findings |
| CODE_REVIEW → QA_REVIEW | ✅ High | Review AC validation |
| QA_REVIEW → INTEGRATION | ⚠️ Low | Rarely review integration separately from QA |
| INTEGRATION → DOCS_UPDATE | ⚠️ Low | Rarely review docs before PR |

**Insight:** Some phases (TESTS_READY → IMPLEMENTING, QA → INTEGRATION, INTEGRATION → DOCS) have low friction value. Humans don't naturally pause there.

### Benefit 3: Artifact Persistence

**Purpose:** Written record for audit, learning, blame tracing.

| Phase | Artifact Created | Audit Value |
|-------|------------------|-------------|
| DRAFT → ANALYZED | `analysis.md` | Why these approaches were considered |
| ANALYZED → UX_REVIEW | UX Review section | What UX concerns were raised |
| UX_REVIEW → PLAN_REVIEW | `spec.md` | What was decided and why |
| APPROVED → TESTS_READY | Test files | What behavior is expected |
| TESTS_READY → IMPLEMENTING | Code files | The actual implementation |
| IMPLEMENTING → UI_REVIEW | `ui-review.md` | UI quality assessment |
| UI_REVIEW → CODE_REVIEW | `code-review.md` | Code quality assessment |
| CODE_REVIEW → QA_REVIEW | `qa-report.md` | AC verification evidence |
| QA_REVIEW → INTEGRATION | `integration-report.md` | Real environment validation |
| INTEGRATION → DOCS_UPDATE | KB pages, docs | Developer documentation |

**Insight:** ALL phases produce artifacts. This is the one benefit that's universal.

### Benefit 4: Specialization Focus

**Purpose:** Single job done well, not jack-of-all-trades.

| Phase | Role | Different from Previous? |
|-------|------|--------------------------|
| DRAFT → ANALYZED | analyst | ✅ Explores, doesn't decide |
| ANALYZED → UX_REVIEW | designer | ✅ Thinks about users |
| UX_REVIEW → PLAN_REVIEW | architect | ✅ Decides, constrains |
| APPROVED → TESTS_READY | developer | ✅ Writes tests |
| TESTS_READY → IMPLEMENTING | developer | ❌ Same role, different task |
| IMPLEMENTING → UI_REVIEW | designer | ✅ Reviews UI quality |
| UI_REVIEW → CODE_REVIEW | reviewer | ✅ Reviews code quality |
| CODE_REVIEW → QA_REVIEW | qa | ✅ Validates requirements |
| QA_REVIEW → INTEGRATION | qa | ⚠️ Same role, different scope |
| INTEGRATION → DOCS_UPDATE | writer | ✅ Documents |

**Insight:** The developer phase (TESTS_READY → IMPLEMENTING) doesn't have role specialization - it's the same developer doing both halves of TDD. The benefit is process discipline, not expertise separation.

### Benefit 5: Error Recovery

**Purpose:** Known restart point when phase fails.

| Phase | Restart Point | What's Preserved |
|-------|---------------|------------------|
| ANALYZED fails | Re-run `/analyze` | Task file |
| UX_REVIEW fails | Re-run `/review-ux` | Analysis |
| PLAN_REVIEW fails | Re-run `/review-plan` | Analysis + UX review |
| TESTS_READY fails | Re-run `/write-tests` | Spec |
| IMPLEMENTING fails | Re-run `/implement` | Tests |
| UI_REVIEW fails | Re-run `/review-ui` | Code |
| CODE_REVIEW fails | Re-run `/review-code` | Code + tests |
| QA_REVIEW fails | Re-run `/qa` | Code + code review |
| INTEGRATION fails | `/investigate-failure` | QA report |
| DOCS_UPDATE fails | Re-run `/update-docs` | All code + tests |

**Insight:** ALL phases have error recovery value. This is what makes the state machine robust.

### Benefit 6: Parallelization

**Purpose:** Independent phases can run concurrently.

| Phase Pair | Can Parallelize? | Why/Why Not |
|------------|------------------|-------------|
| UX_REVIEW ‖ PLAN_REVIEW | ⚡ Yes | Both read analysis, neither modifies |
| Everything else | N/A | Sequential dependencies |

**Insight:** Only ONE parallelization opportunity exists in the whole workflow. Everything else has sequential dependencies.

### Benefit 7: Cost Management

**Purpose:** Right model for the job - cheap for simple, expensive for complex.

| Phase | Recommended Model | Reasoning |
|-------|-------------------|-----------|
| DRAFT → ANALYZED | haiku | Reading and summarizing, not complex reasoning |
| ANALYZED → UX_REVIEW | haiku | Pattern matching against UX checklist |
| UX_REVIEW → PLAN_REVIEW | sonnet | Complex architectural decisions |
| APPROVED → TESTS_READY | sonnet | Deep spec understanding needed |
| TESTS_READY → IMPLEMENTING | sonnet | Same session continues |
| IMPLEMENTING → UI_REVIEW | haiku | Pattern matching against design checklist |
| UI_REVIEW → CODE_REVIEW | sonnet | Deep code understanding needed |
| CODE_REVIEW → QA_REVIEW | sonnet | Adversarial thinking needed |
| QA_REVIEW → INTEGRATION | sonnet | Real environment validation |
| INTEGRATION → DOCS_UPDATE | haiku | Summarizing and formatting |

**Insight:** About half the phases could use haiku, saving cost without losing quality.

---

## Breakpoint Verdicts

Based on the 7-benefit analysis:

### ✅ Essential Breakpoints (Score 6/6)

| Breakpoint | Why Essential |
|------------|---------------|
| DRAFT → ANALYZED | Exploration without decision bias |
| UX_REVIEW → PLAN_REVIEW | Critical decision point |
| UI_REVIEW → CODE_REVIEW | Fresh eyes explicitly required |
| CODE_REVIEW → QA_REVIEW | Different expertise (quality vs correctness) |

### ✅ Keep (Score 5/6)

| Breakpoint | Why Keep |
|------------|----------|
| ANALYZED → UX_REVIEW | Usability expertise, but conditional |
| IMPLEMENTING → UI_REVIEW | UI quality gate, but conditional |
| INTEGRATION → DOCS_UPDATE | Documents reality, not plans |

### ⚠️ Exists for Process, Not Review (Score 4/6, 2/6)

| Breakpoint | Why Keep Despite Low Score |
|------------|---------------------------|
| APPROVED → TESTS_READY | TDD discipline enforcement |
| TESTS_READY → IMPLEMENTING | TDD red→green separation, error recovery |

### ⚠️ Consider Conditional (Score 3/6)

| Breakpoint | Recommendation |
|------------|----------------|
| QA_REVIEW → INTEGRATION | Default skip, require for DB migrations or external services |

---

## Phase-by-Phase Breakdown

### Phase 1: DRAFT → ANALYZED

| Attribute | Value |
|-----------|-------|
| **Agent** | analyst |
| **Input** | Task file with acceptance criteria |
| **Output** | Analysis document with multiple approaches |
| **Artifact** | `backlog/docs/analysis/{epic}/{task-id}-analysis.md` |

#### The 7 Benefits

| Benefit | Present? | Analysis |
|---------|----------|----------|
| 1. Context Insulation | ✅ Yes | Analyst starts fresh, reads only the task and architecture docs |
| 2. Natural Friction | ✅ Yes | Human can review analysis before committing to an approach |
| 3. Artifact Persistence | ✅ Yes | Analysis doc captures explored approaches, trade-offs, reasoning |
| 4. Specialization | ✅ Yes | Analyst explores without deciding; doesn't write code or specs |
| 5. Error Recovery | ✅ Yes | If analysis is poor, can re-run analyst without losing anything |
| 6. Parallelization | N/A | First phase, nothing to parallelize with |
| 7. Cost Management | ✅ Yes | Can use haiku for analysis (reading/summarizing, not complex reasoning) |

#### Current Implementation

From [analyst.md](.claude/agents/analyst.md):
- Reads task, ARCHITECTURE.md, CONVENTIONS.md
- Proposes 3 distinct approaches with trade-offs
- Maps approaches to acceptance criteria
- Identifies open questions
- Does NOT decide or write specs

#### Assessment

**Verdict: ✅ Keep as-is**

This phase is essential. Without exploration, the architect would have to explore AND decide in the same context, losing the benefit of fresh eyes on decisions.

**Potential Optimization:** Could skip for trivial tasks where approach is obvious (single AC, follows exact existing pattern). But determining "triviality" is itself work.

---

### Phase 2: ANALYZED → UX_REVIEW

| Attribute | Value |
|-----------|-------|
| **Agent** | designer |
| **Input** | Analysis document, task file |
| **Output** | UX review appended to analysis/spec |
| **Artifact** | UX Review section in spec |

#### The 7 Benefits

| Benefit | Present? | Analysis |
|---------|----------|----------|
| 1. Context Insulation | ✅ Yes | Designer sees analysis fresh, focuses on usability |
| 2. Natural Friction | ✅ Yes | Human can approve/reject UX concerns before architecture |
| 3. Artifact Persistence | ✅ Yes | UX concerns captured in spec for future reference |
| 4. Specialization | ✅ Yes | Designer thinks about users, not implementation |
| 5. Error Recovery | ✅ Yes | Can re-run UX review without losing analysis |
| 6. Parallelization | ⚡ Yes | Could run in parallel with PLAN_REVIEW (both read analysis, neither modifies) |
| 7. Cost Management | ✅ Yes | Can use haiku for UX review (pattern matching, not complex reasoning) |

#### Current Implementation

From [designer.md](.claude/agents/designer.md):
- Reviews for user flow, information architecture, accessibility planning
- Can return NOT_APPLICABLE for backend-only tasks
- Adds UX Review section to spec

#### Assessment

**Verdict: ✅ Keep, but make conditional**

Current implementation already handles this - designer checks `task_type` and returns NOT_APPLICABLE for backend tasks.

**Optimization opportunity:** Run UX_REVIEW and PLAN_REVIEW in parallel when both are needed. Both read the analysis doc, neither modifies it. Could save one round-trip.

---

### Phase 3: [UX_REVIEW] → PLAN_REVIEW

| Attribute | Value |
|-----------|-------|
| **Agent** | architect |
| **Input** | Analysis document (with UX review if applicable) |
| **Output** | Implementation specification |
| **Artifact** | `backlog/docs/specs/{epic}/{task-id}-spec.md` |

#### The 7 Benefits

| Benefit | Present? | Analysis |
|---------|----------|----------|
| 1. Context Insulation | ✅ Yes | Architect sees analysis and UX concerns fresh, makes decision |
| 2. Natural Friction | ✅ Yes | Human can approve/reject architectural decisions before dev starts |
| 3. Artifact Persistence | ✅ Yes | Spec captures selected approach, constraints, interface contracts |
| 4. Specialization | ✅ Yes | Architect decides and constrains; doesn't implement |
| 5. Error Recovery | ✅ Yes | Can re-run architect without losing analysis or UX review |
| 6. Parallelization | ⚡ See UX_REVIEW | Could have been parallel with UX_REVIEW |
| 7. Cost Management | ✅ Yes | Should use sonnet for architectural decisions (complex reasoning) |

#### Current Implementation

From [architect.md](.claude/agents/architect.md):
- Selects approach (or creates hybrid)
- Defines constraints (non-negotiable requirements)
- Specifies interface contracts (public API, types)
- Defines test criteria per AC
- Resolves open questions from analysis

#### Assessment

**Verdict: ✅ Keep as-is**

This is the critical decision point. The spec is the contract between "what we decided" and "what we build." Removing this would mean either:
- Analyst decides (loses separation of concerns)
- Developer decides while implementing (loses review opportunity)

**Observation:** This is where the "prescriptive vs deliberative" split happens. The spec can be detailed (prescriptive) or constraint-focused (deliberative).

---

### Phase 4: PLAN_REVIEW → APPROVED

This is not a separate phase - it's the architect's output state. The task moves to APPROVED when the architect completes.

---

### Phase 5: APPROVED → TESTS_READY

| Attribute | Value |
|-----------|-------|
| **Agent** | developer |
| **Input** | Spec with test criteria |
| **Output** | Failing tests (TDD red phase) |
| **Artifact** | Test files listed in `test_files` frontmatter |

#### The 7 Benefits

| Benefit | Present? | Analysis |
|---------|----------|----------|
| 1. Context Insulation | ✅ Yes | Developer sees spec fresh, without analysis exploration |
| 2. Natural Friction | ⚠️ Low | Human could review tests before implementation, but rarely does |
| 3. Artifact Persistence | ✅ Yes | Test files are the artifact; capture expected behavior |
| 4. Specialization | ⚠️ Partial | Same developer will implement - specialization is TDD discipline, not role |
| 5. Error Recovery | ✅ Yes | Can re-run test writing without losing spec |
| 6. Parallelization | N/A | Sequential by nature (tests define implementation) |
| 7. Cost Management | ✅ Yes | Use sonnet for test writing (needs to understand spec deeply) |

#### Current Implementation

From [developer.md](.claude/agents/developer.md):
- Reads spec's test criteria
- Writes test files following AAA pattern
- Must pass typecheck and lint
- Must FAIL when run (tests should fail because implementation doesn't exist)

#### Assessment

**Verdict: ✅ Keep for TDD discipline**

The gap here isn't about fresh eyes or review - it's about **enforcing TDD**. The artifact (failing tests) proves tests were written before code.

Without this gap:
- Developer could write tests and implementation together
- Tests might be written to pass existing code (testing implementation, not behavior)
- No proof that TDD was followed

**The gap enforces a process, not a review.**

---

### Phase 6: TESTS_READY → IMPLEMENTING

| Attribute | Value |
|-----------|-------|
| **Agent** | developer (same as TESTS_READY) |
| **Input** | Failing tests |
| **Output** | Passing implementation |
| **Artifact** | Code files listed in `code_files` frontmatter |

#### The 7 Benefits

| Benefit | Present? | Analysis |
|---------|----------|----------|
| 1. Context Insulation | ❌ No | Same agent continues |
| 2. Natural Friction | ❌ No | No human intervention expected |
| 3. Artifact Persistence | ✅ Yes | Code files are the artifact |
| 4. Specialization | ❌ No | Same developer |
| 5. Error Recovery | ✅ Yes | Can re-run implementation without losing tests |
| 6. Parallelization | N/A | Sequential by nature |
| 7. Cost Management | ❌ No | Same sonnet call continues |

#### Assessment

**Verdict: ⚠️ Gap exists for process, not review**

This "gap" is really just two states for the same agent:
1. TESTS_READY = developer finished tests
2. IMPLEMENTING = developer finished implementation

The gap is for:
- **Error recovery:** If implementation fails, retry from TESTS_READY, not APPROVED
- **Progress tracking:** Task file shows "tests done, implementing"
- **TDD enforcement:** Clear separation of red→green phases

**Question: Should tests and implementation be one phase?**

Arguments for merging:
- Same agent, no context insulation
- No human review between them
- Could reduce state machine complexity

Arguments against merging:
- Loses TDD enforcement (how do you prove tests were first?)
- Loses error recovery granularity
- Loses progress visibility

**Recommendation: Keep separate states, but recognize they're one "developer session."**

---

### Phase 7: IMPLEMENTING → CODE_REVIEW

| Attribute | Value |
|-----------|-------|
| **Agent** | reviewer |
| **Input** | Implemented code and tests |
| **Output** | Code review report |
| **Artifact** | `backlog/docs/reviews/{epic}/{task-id}-code-review.md` |

#### The 7 Benefits

| Benefit | Present? | Analysis |
|---------|----------|----------|
| 1. Context Insulation | ✅ Yes | Reviewer sees code fresh, no implementation context |
| 2. Natural Friction | ✅ Yes | Human can review the code review findings |
| 3. Artifact Persistence | ✅ Yes | Review doc captures issues, suggestions, checklist results |
| 4. Specialization | ✅ Yes | Reviewer evaluates quality; doesn't fix or implement |
| 5. Error Recovery | ✅ Yes | Can re-run code review without re-implementing |
| 6. Parallelization | N/A | Must happen after implementation |
| 7. Cost Management | ✅ Yes | Use sonnet for code review (needs deep understanding) |

#### Current Implementation

From [reviewer.md](.claude/agents/reviewer.md):
- Fresh eyes - intentionally no context from implementation
- Runs typecheck, lint, tests
- Reviews for correctness, readability, maintainability, testing, conventions
- Produces structured report with Must Fix / Should Fix / Suggestions
- Supports re-review (focused on previously identified issues)

#### Assessment

**Verdict: ✅ Keep as-is**

This is a critical quality gate. Code review by a fresh agent catches:
- Issues the developer was blind to
- Pattern violations the developer didn't notice
- Test gaps the developer didn't realize

**Real example from codebase:** E01-T015 code review APPROVED, but QA found ES module bug. The review process caught it before production.

---

### Phase 8: CODE_REVIEW → QA_REVIEW

| Attribute | Value |
|-----------|-------|
| **Agent** | qa |
| **Input** | Code that passed code review |
| **Output** | QA report |
| **Artifact** | `backlog/docs/reviews/{epic}/{task-id}-qa-report.md` |

#### The 7 Benefits

| Benefit | Present? | Analysis |
|---------|----------|----------|
| 1. Context Insulation | ✅ Yes | QA sees finished product, no implementation or review context |
| 2. Natural Friction | ✅ Yes | Human can review QA findings before merge |
| 3. Artifact Persistence | ✅ Yes | QA report captures AC verification, edge case testing, bugs found |
| 4. Specialization | ✅ Yes | QA validates against requirements; doesn't review code quality |
| 5. Error Recovery | ✅ Yes | Can re-run QA without re-reviewing code |
| 6. Parallelization | N/A | Must happen after code review |
| 7. Cost Management | ✅ Yes | Use sonnet for QA (needs to think adversarially) |

#### Current Implementation

From [qa.md](.claude/agents/qa.md):
- Adversarial mindset - try to break things
- Validates EVERY acceptance criterion with evidence
- Tests edge cases (empty, null, boundaries, permissions)
- Runs typecheck, lint, tests
- Produces structured report with AC status, edge case table, bugs
- Supports re-test (focused on previously identified bugs)

#### Assessment

**Verdict: ✅ Keep as-is**

QA is different from code review:
- **Code review:** "Is this code good?"
- **QA:** "Does this code do what it should?"

**Real example:** Code review might approve well-structured code that doesn't actually meet AC3. QA catches that.

**Question: Could code review and QA be combined?**

Arguments for combining:
- Same agent could review code AND validate ACs
- Would reduce round-trips

Arguments against:
- Different mindsets (quality vs correctness)
- Different expertise (code patterns vs adversarial testing)
- One agent doing both would be mediocre at both
- Separate artifacts valuable for audit trail

**Recommendation: Keep separate.**

---

### Phase 9: QA_REVIEW → INTEGRATION_TESTING

| Attribute | Value |
|-----------|-------|
| **Agent** | qa (often same) |
| **Input** | Code that passed QA |
| **Output** | Integration test report |
| **Artifact** | `backlog/docs/reviews/{epic}/{task-id}-integration-report.md` |

#### The 7 Benefits

| Benefit | Present? | Analysis |
|---------|----------|----------|
| 1. Context Insulation | ⚠️ Partial | Often same qa agent continues |
| 2. Natural Friction | ⚠️ Low | Human rarely reviews integration separately from QA |
| 3. Artifact Persistence | ✅ Yes | Integration report captures real-environment validation |
| 4. Specialization | ⚠️ Partial | Same qa agent, but different type of testing |
| 5. Error Recovery | ✅ Yes | Can re-run integration without re-running QA |
| 6. Parallelization | N/A | Must happen after QA |
| 7. Cost Management | ✅ Yes | Could use sonnet or even haiku for integration (running commands) |

#### Current Implementation

Integration testing currently:
- Runs Docker infrastructure
- Executes against real PostgreSQL/Redis
- Validates behavior in production-like environment

#### Assessment

**Verdict: ⚠️ Consider merging with QA or making conditional**

The separation provides:
- Different artifact (unit test results vs integration test results)
- Error recovery granularity
- Clear tracking of what was tested where

But:
- Often same agent
- Low human friction value
- For simple tasks, integration might be overkill

**Options:**

1. **Merge into QA:** QA agent does both unit and integration testing
   - Pro: Simpler workflow
   - Con: Loses artifact separation, harder to debug "unit passed but integration failed"

2. **Keep separate but conditional:** Default skip for simple tasks, require for:
   - Tasks with `labels: [integration-required]`
   - Tasks touching database migrations
   - Tasks with external service dependencies

3. **Keep as-is:** Accept the overhead for consistency

**Recommendation: Option 2 - Make INTEGRATION_TESTING conditional**

Default behavior: Skip (go straight to DOCS_UPDATE)
Required when:
- Task has `labels: [integration-required]`
- Task has database migrations
- Architect flags it in spec

---

### Phase 10: INTEGRATION_TESTING → DOCS_UPDATE

| Attribute | Value |
|-----------|-------|
| **Agent** | writer |
| **Input** | Completed, tested code |
| **Output** | Updated documentation |
| **Artifact** | Documentation Updates section in task file |

#### The 7 Benefits

| Benefit | Present? | Analysis |
|---------|----------|----------|
| 1. Context Insulation | ✅ Yes | Writer sees finished product, documents what exists |
| 2. Natural Friction | ⚠️ Low | Human rarely reviews doc updates before merge |
| 3. Artifact Persistence | ✅ Yes | Documentation itself is the artifact |
| 4. Specialization | ✅ Yes | Writer documents; doesn't code or test |
| 5. Error Recovery | ✅ Yes | Can re-run docs without re-testing |
| 6. Parallelization | N/A | Must happen after testing |
| 7. Cost Management | ✅ Yes | Can use haiku for documentation (summarizing, formatting) |

#### Current Implementation

From [writer.md](.claude/agents/writer.md):
- Updates ARCHITECTURE.md, CONVENTIONS.md, README
- Updates package-specific docs
- Creates KB pages if needed
- Verifies accuracy, links, examples
- Archives task to completed/

#### Assessment

**Verdict: ✅ Keep as-is**

Documentation is essential for:
- Developer onboarding
- Agent context (CLAUDE.md references these docs)
- Long-term maintenance

The gap ensures docs reflect reality (what was built and tested), not plans (what was specified).

---

## Summary: Workflow Assessment

### Phases That Definitely Earn Their Keep

| Phase | Why |
|-------|-----|
| DRAFT → ANALYZED | Exploration without decision bias |
| PLAN_REVIEW | Critical decision point with human oversight |
| IMPLEMENTING → CODE_REVIEW | Fresh eyes on code quality |
| CODE_REVIEW → QA_REVIEW | Different expertise (quality vs correctness) |
| QA_REVIEW → DOCS_UPDATE | Documents reality, not plans |

### Phases That Are Conditional/Questionable

| Phase | Assessment |
|-------|------------|
| UX_REVIEW | Already conditional (NOT_APPLICABLE for backend). Consider parallelizing with PLAN_REVIEW. |
| TESTS_READY → IMPLEMENTING | Same agent, but gap enforces TDD. Keep for process, not review. |
| QA_REVIEW → INTEGRATION | Often same agent, low friction value. Make conditional based on task complexity. |

### Recommended Optimizations

1. **Parallelize UX_REVIEW and PLAN_REVIEW** when both are needed
2. **Make INTEGRATION_TESTING conditional** (default skip, require with label/flag)
3. **Keep TESTS_READY → IMPLEMENTING gap** for TDD enforcement

---

## Final Workflow Recommendation

```
DRAFT → ANALYZED → [UX_REVIEW ‖ PLAN_REVIEW] → APPROVED →
TESTS_READY → IMPLEMENTING → CODE_REVIEW → QA_REVIEW →
[INTEGRATION_TESTING] → DOCS_UPDATE → DONE
```

**Legend:**
- `[A ‖ B]` = A and B run in parallel
- `[X]` = X is conditional (may be skipped)

**Default path (backend task, no integration):**
```
DRAFT → ANALYZED → PLAN_REVIEW → APPROVED →
TESTS_READY → IMPLEMENTING → CODE_REVIEW → QA_REVIEW →
DOCS_UPDATE → DONE
```

**Full path (frontend task with integration):**
```
DRAFT → ANALYZED → [UX_REVIEW ‖ PLAN_REVIEW] → APPROVED →
TESTS_READY → IMPLEMENTING → CODE_REVIEW → QA_REVIEW →
INTEGRATION_TESTING → DOCS_UPDATE → DONE
```

---

## Command Details

Each phase is invoked by a specific command. Here's the mapping:

| Phase | Command | Agent | Key Details |
|-------|---------|-------|-------------|
| DRAFT → ANALYZED | `/analyze` | analyst | Reads task, creates analysis with 3 approaches |
| ANALYZED → UX_REVIEW | `/review-ux` | designer | Optional; appends UX review to spec |
| UX_REVIEW → PLAN_REVIEW | `/review-plan` | architect | Creates spec file with selected approach |
| APPROVED → TESTS_READY | `/write-tests` | developer | Creates failing tests (TDD red phase) |
| TESTS_READY → IMPLEMENTING | `/implement` | developer | Makes tests pass (TDD green phase) |
| IMPLEMENTING → UI_REVIEW | `/review-ui` | designer | Optional; frontend tasks only; creates ui-review.md |
| UI_REVIEW → CODE_REVIEW | `/review-code` | reviewer | **Fresh context**; creates code-review.md |
| CODE_REVIEW → QA_REVIEW | `/qa` | qa | **Fresh context**; creates qa-report.md |
| QA_REVIEW → INTEGRATION | `/integration-test` | qa | **READ-ONLY mode**; creates integration-report.md |
| INTEGRATION → DOCS_UPDATE | `/update-docs` | writer | KB + legacy docs; sets PR_READY |

### Command Characteristics

**Fresh Context Commands (explicitly stated in command docs):**
- `/review-code` - "This command starts a **fresh context** - no prior conversation history."
- `/qa` - "This command starts a **fresh context** - no prior conversation history."

**Read-Only Mode:**
- `/integration-test` - "You are operating in VALIDATION MODE ONLY... ❌ FORBIDDEN: Edit ANY code files"

**Re-entry Commands:**
- `/write-tests` handles both initial (APPROVED → TESTS_READY) and revision (TESTS_REVISION_NEEDED → TESTS_READY)
- `/implement` can reject back to TESTS_REVISION_NEEDED if tests are bad (Test-API mismatch or coherence issues)
- All review commands support re-review mode (update existing report vs create new)

### Rejection Flow Details

From the commands, rejection flows are:

| Phase | If Rejected | Goes To | Next Command |
|-------|-------------|---------|--------------|
| UX_REVIEW | NEEDS_UX_CHANGES | ANALYZING | `/analyze` (re-run) |
| PLAN_REVIEW | (user rejects) | ANALYZED | `/review-plan` (re-run) |
| TESTS_READY | (developer rejects tests) | TESTS_REVISION_NEEDED | `/write-tests` (revise) |
| UI_REVIEW | NEEDS_UI_CHANGES | IMPLEMENTING | `/implement` |
| CODE_REVIEW | CHANGES_REQUESTED | IMPLEMENTING | `/implement` |
| QA_REVIEW | FAILED | IMPLEMENTING | `/implement` |
| INTEGRATION | FAIL | INTEGRATION_FAILED | `/investigate-failure` |

**Special rejection:** Developer can reject tests back to TESTS_REVISION_NEEDED with detailed feedback in Reviews section. Then `/write-tests` runs again with the feedback context.

---

## Missing from Current Workflow: UI_REVIEW

Looking at the commands, there's a **UI_REVIEW** phase that exists but wasn't in our documented workflow:

```
IMPLEMENTING → [UI_REVIEW] → CODE_REVIEW
```

From `/review-ui`:
- Reviews implemented UI components for design system compliance
- Checks accessibility, visual consistency, responsiveness
- Only for frontend tasks (checks for .tsx files in code_files)
- Creates `backlog/docs/reviews/{epic}/{task-id}-ui-review.md`

**This should be included in the development workflow for frontend tasks.**

Updated full workflow:
```
DRAFT → ANALYZED → [UX_REVIEW] → PLAN_REVIEW → APPROVED →
TESTS_READY → IMPLEMENTING → [UI_REVIEW] → CODE_REVIEW → QA_REVIEW →
[INTEGRATION_TESTING] → DOCS_UPDATE → DONE
```

Designer agent has TWO touchpoints:
1. **UX_REVIEW** (after analysis) - Reviews spec for usability BEFORE implementation
2. **UI_REVIEW** (after implementation) - Reviews components for quality AFTER implementation

Both are conditional on frontend work.

---

## Workflow State Transitions Summary

```
DRAFT
  ↓ /analyze (analyst)
ANALYZED
  ↓ /review-ux (designer) - optional, frontend only
[UX_REVIEW] ────────────────┐
  ↓ (if passes)             │ (if needs changes)
  ↓                         ↓
PLAN_REVIEW ←───────── ANALYZING
  ↓ /review-plan (architect)
APPROVED
  ↓ /write-tests (developer)
TESTS_READY ←──────────┐
  ↓ /implement          │ (if tests bad)
  ↓ (developer)         │
  ├────────────────────→ TESTS_REVISION_NEEDED
  ↓ (if tests ok)
IMPLEMENTING ←─────────────────────────────────────────┐
  ↓ /review-ui (designer) - optional, frontend only   │
[UI_REVIEW]                                            │
  ↓ /review-code (reviewer) - FRESH CONTEXT           │
CODE_REVIEW                                            │
  ├─── (if changes requested) ─────────────────────────┤
  ↓ (if approved)                                      │
QA_REVIEW ←── /qa (qa) - FRESH CONTEXT                │
  ├─── (if failed) ────────────────────────────────────┘
  ↓ (if passed)
[INTEGRATION_TESTING] - optional
  ├─── (if failed) → INTEGRATION_FAILED → /investigate-failure
  ↓ (if passed)
DOCS_UPDATE ← /update-docs (writer)
  ↓
PR_READY ← (ready for /commit-and-pr)
  ↓
DONE (after PR merge)
```

---

## Open Questions

1. **Should UX_REVIEW and PLAN_REVIEW run in parallel?**
   - Currently sequential: UX_REVIEW → PLAN_REVIEW
   - Both read the analysis, neither modifies it
   - Could save one round-trip
   - **Complication:** UX_REVIEW might find issues that architect should consider
   - **Alternative:** UX_REVIEW appends to spec, then architect reads both

2. **Should code review happen before or after UI_REVIEW?**
   - Current (from commands): IMPLEMENTING → UI_REVIEW → CODE_REVIEW
   - This makes sense: Fix UI issues before reviewing code quality
   - UI issues are often in the same files that code review would look at

3. **What triggers re-entry into the workflow?**
   - CODE_REVIEW rejects → back to IMPLEMENTING
   - QA_REVIEW rejects → back to IMPLEMENTING
   - INTEGRATION_TESTING fails → INTEGRATION_FAILED (different - needs investigation!)
   - UI_REVIEW rejects → back to IMPLEMENTING
   - Should any rejection go back to TESTS_READY? (to add regression tests)

4. **Should DOCS_UPDATE happen before or after PR?**
   - Current: DOCS_UPDATE → PR_READY → `/commit-and-pr`
   - `/update-docs` sets state to PR_READY, not DONE
   - Task moves to DONE/completed after PR merge
   - This seems correct - docs are part of the deliverable
