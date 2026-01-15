# E06-T012 Policy: Recommendations & Improvements Tracking System

**Policy Version:** 1.0
**Last Updated:** 2026-01-14
**Status:** Draft for Review

---

## Purpose

This policy establishes guidelines for tracking, categorizing, prioritizing, and managing technical recommendations and improvements identified during the development lifecycle. It ensures systematic capture of technical debt, enhancement opportunities, and optimization needs without cluttering primary documentation.

---

## Scope

### In Scope
- Technical debt identified in code reviews
- Performance optimization opportunities
- Security hardening recommendations
- Developer experience (DX) improvements
- Architecture refinements
- Testing coverage gaps
- Documentation enhancements
- Accessibility improvements

### Out of Scope
- Active bugs (use GitHub Issues instead)
- Feature requests from users (product backlog)
- Critical blockers (addressed immediately, not tracked here)
- Implementation planning (belongs in task specs)

---

## Structure & Organization

### Location

All recommendations are tracked in a dedicated section:

```
apps/docs/src/
└── improvements/
    ├── index.md              # Overview and cross-domain summary
    ├── critical.md           # All critical items across domains (blocking releases)
    ├── auth.md               # Authentication & authorization domain
    ├── database.md           # Database & ORM domain
    ├── api.md                # API design & patterns domain
    ├── ai.md                 # AI gateway integration domain
    ├── testing.md            # Testing patterns domain
    └── infrastructure.md     # Deployment, CI/CD, monitoring
```

### Page Structure

Each domain improvements page follows this template:

```markdown
---
title: "{Domain} Improvements & Recommendations"
description: "Technical debt, enhancements, and optimization opportunities for {domain}"
---

# {Domain} Improvements & Recommendations

Brief overview of the domain's current state and improvement philosophy.

## Active Recommendations

Current recommendations organized by priority.

### Critical (Blocking)

| ID | Issue | Description | Impact | Effort | Tracking | Added |
|----|-------|-------------|--------|--------|----------|-------|
| AUTH-001 | Security | Add rate limiting to OAuth callbacks | High | Medium | E02-T015 | 2026-01-10 |

### High Priority

| ID | Issue | Description | Impact | Effort | Tracking | Added |
|----|-------|-------------|--------|--------|----------|-------|
| AUTH-002 | Performance | Implement session caching with Redis | Medium | High | E07-T003 | 2026-01-12 |

### Medium Priority

[Same table structure]

### Low Priority

[Same table structure]

## Completed Improvements

Archive of addressed recommendations with implementation date and task reference.

| ID | Issue | Description | Completed | Task |
|----|-------|-------------|-----------|------|
| AUTH-000 | Security | Add CSRF protection to forms | 2026-01-08 | E02-T012 |

## References

Links to related epic reviews, architecture decisions, and source reviews.
```

---

## Categorization Framework

### Priority Levels

| Level | Definition | Action Required | Timeline |
|-------|------------|-----------------|----------|
| **Critical** | Blocks production deployment, security vulnerability, data loss risk, breaking functionality | Immediate action required | Next sprint |
| **High** | Significant impact on performance, UX, security, or maintainability | Should be addressed soon | Within 2-3 sprints |
| **Medium** | Noticeable improvement to DX, code quality, or efficiency | Nice to have | Within epic or next epic |
| **Low** | Minor enhancements, quality-of-life improvements | Consider for future | Backlog |

### Severity Assessment Criteria

When categorizing an issue, consider:

1. **Security Impact**
   - Does it expose sensitive data? → Critical
   - Does it create an attack vector? → Critical/High
   - Does it violate security best practices? → High/Medium

2. **Performance Impact**
   - Does it cause user-facing slowness? → High
   - Does it waste resources significantly? → Medium
   - Does it have minor inefficiency? → Low

3. **Stability Impact**
   - Can it cause crashes or data corruption? → Critical
   - Can it cause intermittent failures? → High
   - Does it affect edge cases only? → Medium

4. **Developer Experience Impact**
   - Does it block development? → Critical
   - Does it significantly slow development? → High
   - Does it cause minor friction? → Medium
   - Is it a convenience improvement? → Low

5. **Business Impact**
   - Does it prevent core functionality? → Critical
   - Does it affect primary use cases? → High
   - Does it affect secondary features? → Medium
   - Does it affect nice-to-have features? → Low

### Blocking Status

**Blocking (Yes):**
- Critical security vulnerabilities
- Data loss or corruption risks
- Breaking changes that affect users
- Compliance violations
- Production deployment blockers

**Non-Blocking (No):**
- Performance optimizations
- Code quality improvements
- DX enhancements
- Future feature preparations
- Refactoring opportunities

---

## Recommendation Lifecycle

### 1. Identification

Recommendations can be identified through:

- **Epic Reviews**: PM agent extracts issues from code/QA/UI/architecture reviews
- **Code Reviews**: Reviewer identifies improvements not blocking merge
- **Development**: Developer discovers technical debt or optimization opportunity
- **Production Monitoring**: Telemetry reveals performance issues
- **User Feedback**: Indirect improvements needed to support features

### 2. Recording

When recording a recommendation:

1. **Assign ID**: Format `{DOMAIN}-{NNN}` (e.g., `AUTH-042`, `DB-015`)
2. **Categorize Priority**: Use severity assessment criteria
3. **Determine Blocking Status**: Will this prevent deployment?
4. **Estimate Effort**: Small (<4h), Medium (4-16h), Large (>16h)
5. **Add Context**: Link to source review, discussion, or monitoring data
6. **Date**: Record when identified
7. **Create Tracking Task** (if prioritized): Link to task in backlog

### 3. Tracking

**Active Recommendations:**
- Remain in the improvements page under their priority section
- Updated when priority changes or new information emerges
- Linked to tracking tasks when work is scheduled

**In Progress:**
- Keep recommendation in table with `Tracking` column showing active task
- Do not remove until implementation is complete

**Completed:**
- Move to "Completed Improvements" section
- Record completion date and implementing task
- Keep for historical reference (don't delete)

### 4. Archival

Recommendations are archived (moved to "Completed") when:
- Implementation is complete and merged
- QA has verified the improvement
- Documentation is updated (if needed)

Archived recommendations provide:
- Historical context for decisions
- Evidence of continuous improvement
- Reference for similar future issues

---

## Integration with Epic Review Process

### Automatic Population

When an epic review runs (via `/epic-review {EPIC-ID} --create`), the PM agent:

1. **Extracts Issues**: Identifies all "Must Fix", "Should Fix", and "Suggestions" from reviews
2. **Categorizes**: Maps to Critical/High/Medium/Low based on severity
3. **Creates Follow-up Tasks**: For issues meeting threshold (default: high)
4. **Generates Recommendations**: Outputs markdown table entries for improvements page

### Manual Integration Steps

After epic review completes:

1. **Review Epic Review Report**: Read `backlog/docs/reviews/{EPIC-ID}/_epic-review.md`
2. **Identify Non-Task Items**: Find issues that didn't warrant immediate tasks
3. **Add to Improvements Page**: Copy relevant entries to appropriate domain page
4. **Update Index**: Regenerate cross-domain summary in `improvements/index.md`

### Example Epic Review → Improvements Flow

**Epic Review Extract:**
```markdown
### Medium Priority (Nice to Have)

3. **Make connection pool configurable** (from E01-T003 code review)
   - Severity: Medium
   - Type: Enhancement
   - Description: Pool settings are hardcoded, env vars defined but not used
   - Recommendation: Consider for next epic or as follow-up
   - Estimated Effort: Small (2h)
```

**Improvements Page Entry:**
```markdown
### Medium Priority

| ID | Issue | Description | Impact | Effort | Tracking | Added |
|----|-------|-------------|--------|--------|----------|-------|
| DB-003 | Configuration | Make connection pool settings configurable via env vars | Low | Small | Backlog | 2026-01-14 |
```

---

## Maintenance Guidelines

### Weekly Review (Optional)

Project maintainers should periodically review improvements:

1. **Re-prioritize**: Has anything become more critical?
2. **Consolidate**: Can similar issues be grouped?
3. **Archive Completed**: Move resolved items to archive
4. **Remove Stale**: Delete recommendations that are no longer relevant

### Sprint Planning Integration

During sprint planning:

1. **Review Critical Items**: Ensure blockers are addressed
2. **Select High Priority Items**: Choose 1-2 for upcoming sprint
3. **Create Tasks**: Generate task files for selected improvements
4. **Link Tracking**: Update improvements page with task IDs

### Staleness Prevention

To prevent the improvements section from becoming a graveyard:

- **Maximum Age**: If an item remains Low priority for >6 months, consider removing
- **Context Updates**: Add notes when circumstances change (e.g., "Less relevant after E10 refactor")
- **Deprecation**: Mark items as deprecated if architecture changes make them obsolete

---

## Cross-Domain Summary (`improvements/index.md`)

The index page provides an at-a-glance view of all recommendations:

### Purpose
- Quick overview of technical debt across all domains
- Executive summary for stakeholders
- Jump-off point to domain-specific details

### Structure

```markdown
# Improvements & Recommendations Overview

## Summary Statistics

- **Critical (Blocking)**: 2 items
- **High Priority**: 8 items
- **Medium Priority**: 15 items
- **Low Priority**: 12 items
- **Total Active**: 37 items
- **Completed (Last 30 Days)**: 14 items

## Critical Items (Cross-Domain)

Quick list of all blocking items with links to domain pages.

## By Domain

Brief summary per domain with count and link to full page.

## Recently Completed

Last 10 completed improvements across all domains.

## How to Use This Section

Guidelines for developers, agents, and maintainers.
```

---

## Examples

### Example 1: Security Vulnerability (Critical)

**Source:** Code review for E02-T004 (OAuth implementation)

**Entry:**
```markdown
| ID | Issue | Description | Impact | Effort | Tracking | Added |
|----|-------|-------------|--------|--------|----------|-------|
| AUTH-001 | Security | OAuth callback missing CSRF validation | High | Medium | E02-T015 | 2026-01-10 |
```

**Details:**
- **Priority**: Critical
- **Blocking**: Yes (security vulnerability)
- **Rationale**: OAuth callbacks vulnerable to CSRF attacks
- **Impact**: User accounts could be compromised
- **Source**: E02-T004 security review
- **Action**: Immediate task created (E02-T015)

### Example 2: Performance Optimization (High)

**Source:** Production monitoring shows slow session lookups

**Entry:**
```markdown
| ID | Issue | Description | Impact | Effort | Tracking | Added |
|----|-------|-------------|--------|--------|----------|-------|
| AUTH-002 | Performance | Session validation queries not cached | Medium | High | E07-T003 | 2026-01-12 |
```

**Details:**
- **Priority**: High
- **Blocking**: No
- **Rationale**: Every request hits database for session validation
- **Impact**: Increased latency (avg +150ms per request)
- **Source**: Production telemetry data
- **Action**: Scheduled for E07 (Redis caching epic)

### Example 3: DX Improvement (Medium)

**Source**: Developer feedback during E03 implementation

**Entry:**
```markdown
| ID | Issue | Description | Impact | Effort | Tracking | Added |
|----|-------|-------------|--------|--------|----------|-------|
| DB-005 | DX | Add type-safe query builder helpers | Low | Medium | Backlog | 2026-01-13 |
```

**Details:**
- **Priority**: Medium
- **Blocking**: No
- **Rationale**: Complex queries require repetitive type assertions
- **Impact**: Slower development, potential type errors
- **Source**: Developer experience during E03
- **Action**: Backlog item, consider for future refactor

### Example 4: Code Quality (Low)

**Source:** Code review suggestion (non-blocking)

**Entry:**
```markdown
| ID | Issue | Description | Impact | Effort | Tracking | Added |
|----|-------|-------------|--------|--------|----------|-------|
| API-012 | Code Quality | Extract validation schemas to shared utils | Low | Small | Backlog | 2026-01-14 |
```

**Details:**
- **Priority**: Low
- **Blocking**: No
- **Rationale**: Similar validation schemas duplicated across routes
- **Impact**: Slight maintenance overhead
- **Source**: E03-T002 code review suggestion
- **Action**: Opportunistic refactor when working in area

---

## Decision Framework

### Should This Be a Recommendation or a Task?

| Criteria | Create Task Immediately | Add as Recommendation |
|----------|-------------------------|----------------------|
| **Blocks deployment?** | Yes → Task | No → Recommendation |
| **Security vulnerability?** | Yes → Task | No → Recommendation (if hardening) |
| **User-facing bug?** | Yes → Task | No → Recommendation (if enhancement) |
| **Architectural blocker?** | Yes → Task | No → Recommendation |
| **Technical debt causing active pain?** | Yes → Task | No → Recommendation |
| **Nice-to-have improvement?** | No | Yes → Recommendation |

### Should This Be an Improvement or GitHub Issue?

| Type | Use Improvements Section | Use GitHub Issue |
|------|--------------------------|------------------|
| **Technical debt from code review** | ✅ | ❌ |
| **Architecture refinement** | ✅ | ❌ |
| **Performance optimization idea** | ✅ | Maybe (if external contributor could help) |
| **Security hardening** | ✅ (Critical) | ✅ (for visibility) |
| **Active bug** | ❌ | ✅ |
| **User feature request** | ❌ | ✅ |
| **Documentation error** | ❌ | ✅ (or fix immediately) |

---

## Automation Opportunities

### Future Enhancements (Out of Scope for E06-T012)

1. **Script: Generate Cross-Domain Summary**
   - Parse all domain improvement pages
   - Generate statistics and aggregated tables
   - Update `improvements/index.md` automatically

2. **Script: Validate Improvement IDs**
   - Ensure no duplicate IDs
   - Verify ID format matches `{DOMAIN}-{NNN}`
   - Check for gaps in numbering

3. **CI Integration**
   - Fail build if Critical items exist for >30 days without tracking task
   - Weekly report of stale recommendations
   - Auto-archive completed items based on Git history

4. **Epic Review Integration**
   - PM agent automatically generates improvement entries
   - Direct append to domain improvement pages
   - No manual copy-paste needed

---

## Review & Approval Process

### Initial Review

This policy document should be reviewed by:

1. **Project Owner** — Approve overall approach
2. **Technical Lead** — Validate categorization framework
3. **Development Team** — Ensure usability and clarity

### Policy Updates

This policy may be updated when:

- New domains are added to the codebase
- Categorization criteria prove insufficient
- Integration needs change (e.g., new workflow tools)
- Team feedback suggests improvements

**Versioning:** Increment version number and update "Last Updated" date.

**Change Log:**
- **v1.0** (2026-01-14): Initial draft policy

---

## Success Metrics

Track policy effectiveness with:

1. **Coverage**: % of epic review issues captured in improvements section
2. **Actionability**: % of recommendations converted to tasks within 3 sprints
3. **Stale Rate**: % of recommendations older than 6 months
4. **Completion Rate**: Ratio of completed vs. added recommendations per sprint
5. **Developer Satisfaction**: Qualitative feedback on usefulness

---

## Questions for Review

Before implementing E06-T012, answer:

1. ✅ **ID Format**: Is `{DOMAIN}-{NNN}` acceptable? (e.g., `AUTH-042`)
2. ✅ **Priority Levels**: Are 4 levels (Critical/High/Medium/Low) sufficient?
3. ✅ **Blocking Criteria**: Are the blocking/non-blocking rules clear?
4. ❓ **Automation**: Should initial implementation include automation scripts?
5. ❓ **CI Enforcement**: Should Critical items fail CI if not addressed within X days?
6. ❓ **GitHub Integration**: Should Critical items also create GitHub Issues for visibility?
7. ✅ **Domain Coverage**: Are the initial domains (auth, database, api, ai, testing, infrastructure) sufficient?
8. ❓ **Access Control**: Who can add/modify/archive recommendations? (Anyone? Maintainers only?)

---

## Next Steps

1. **Review This Policy** — Gather feedback from stakeholders
2. **Refine Criteria** — Adjust categorization rules based on feedback
3. **Create E06-T012 Spec** — Convert this policy into implementation spec
4. **Implement Structure** — Create folder structure and initial pages
5. **Populate from Epic Reviews** — Backfill with E01-E05 recommendations
6. **Document in Contributing Guide** — Add section on improvements workflow
7. **Integrate with Epic Review** — Update `/epic-review` skill to reference this system

---

## References

- **Epic Review Process**: [docs/EPIC_REVIEW.md](../../../docs/EPIC_REVIEW.md)
- **KB Page Design**: [apps/docs/src/contributing/kb-page-design.md](../../../apps/docs/src/contributing/kb-page-design.md)
- **Contributing Guide**: [apps/docs/src/contributing/index.md](../../../apps/docs/src/contributing/index.md)

---

**Status**: Ready for stakeholder review
**Reviewers Needed**: Project Owner, Technical Lead, Development Team
**Approval Required Before**: Creating E06-T012 implementation spec
