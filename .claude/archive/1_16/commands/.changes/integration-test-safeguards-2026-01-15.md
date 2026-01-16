# Integration Test Command Safeguards

**Date:** 2026-01-15
**Reason:** Prevent scope creep during integration testing
**Context:** During E06-T011 integration testing, agent made unsolicited code changes (GitHub URLs, prebuild system) instead of documenting issues and asking for guidance.

## Changes Made

### 1. Added Critical Constraints Section

**Location:** After Report Format, before Failure Handling

**Key constraints:**
- ✅ ALLOWED: Run tests, query APIs, read files, write report
- ❌ FORBIDDEN: Edit code, modify configs, fix bugs, create files (except report)

### 2. Enhanced Failure Handling

**When issues are found:**
- Document completely in report
- **If ambiguous behavior (404s, missing features)**: ASK USER if expected
- If clear failure: Mark `INTEGRATION_FAILED`
- If user confirms expected: Mark `DOCS_UPDATE` with limitation documented
- STOP immediately - no fix attempts

### 3. Added Anti-Patterns List

Clear examples of what NOT to do:
- ❌ "Let me fix that for you"
- ❌ "I'll try approach X"
- ❌ "This should work if..."
- ❌ "Just a small config change"
- ❌ Scope creep

### 4. Added Pre-Flight Reminder

At start of Process section:
```
⚠️ BEFORE STARTING: Remember you are in READ-ONLY mode. No code changes allowed.
```

## User Decisions Documented

1. **When "maybe expected" behavior found**: Agent should ASK USER if it's expected
2. **Read-only strictness**: NO code changes at all (strict enforcement)

## Impact

**Before:** Agent could make implementation changes during integration testing
**After:** Agent documents issues, asks for guidance on ambiguous behavior, and stops without fixing

## Example: How E06-T011 Should Have Gone

**What happened:**
```
User: "I'm getting 404s on /backlog links"
Agent: Tried GitHub URLs → Reverted → Implemented prebuild system
```

**What should happen now:**
```
User: "I'm getting 404s on /backlog links"
Agent: "Documenting this in the integration report.

Finding: /backlog links return 404

This could be:
1. Expected (links for searchability only)
2. Implementation gap (VitePress alias doesn't serve external files)

Is this expected behavior or a defect that should fail the integration test?"

[User decides]
[Agent documents and exits]
```

## Related Files

- **Command file**: `.claude/commands/integration-test.md`
- **Test case**: E06-T011 (where scope creep occurred)

## Future Considerations

- Consider adding similar safeguards to other review/validation commands
- Monitor if agents try to work around the constraints
- May need to add explicit "no workarounds" language if creative circumvention occurs
