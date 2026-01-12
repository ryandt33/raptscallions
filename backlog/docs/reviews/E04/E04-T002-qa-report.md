# QA Report: E04-T002 - OpenRouter Client with Streaming

**Task ID:** E04-T002
**Task Title:** OpenRouter Client with Streaming
**Epic:** E04 - Chat Infrastructure
**QA Date:** 2026-01-12
**QA Engineer:** qa

---

## Executive Summary

**Verdict:** ❌ **DOES NOT MEET ACCEPTANCE CRITERIA**

The OpenRouter AI client implementation has been completed with good architectural decisions (lazy config initialization, proper async generator pattern with done chunk). However, there are **critical TypeScript compilation errors** and **test failures** that prevent the implementation from meeting acceptance criteria. The implementation is approximately 85% complete but requires fixes before it can be considered production-ready.

**Critical Issues:**
1. TypeScript compilation fails with 2 errors (import and type compatibility issues)
2. 10/69 tests failing (14.5% failure rate) due to mock configuration issues
3. Cannot verify streaming functionality end-to-end with current test failures

**Positive Findings:**
- Core architecture follows spec recommendations (done chunk pattern)
- Error handling implementation is comprehensive
- Config validation using Zod is properly implemented
- Code structure and organization follows conventions

---

## Acceptance Criteria Validation

### AC1: OpenRouterClient class with chat method exists
**Status:** ✅ **PASS**

**Evidence:**
- `OpenRouterClient` class implemented in `packages/ai/src/client.ts:31-313`
- Provides both `streamChat()` async generator method (line 100-177)
- Provides `chat()` convenience method for non-streaming (line 186-201)
- Constructor accepts configuration options (line 35-74)

**Implementation Quality:**
- Constructor properly handles both provided options and environment config
- Lazy initialization pattern prevents config validation errors during testing
- Singleton instance exported via Proxy for deferred initialization (line 305-312)

---

### AC2: Uses openai package with OpenRouter base URL
**Status:** ✅ **PASS**

**Evidence:**
- `openai` package v4.104.0 installed as dependency (`package.json:22`)
- OpenAI SDK initialized with `baseURL` parameter (line 68)
- Default base URL configured as `https://openrouter.ai/api/v1` (`config.ts:8`)
- Config allows override via environment variable or constructor option

**Configuration:**
```typescript
this.client = new OpenAI({
  apiKey,
  baseURL,  // OpenRouter URL
  timeout,
  maxRetries,
});
```

---

### AC3: Streaming enabled via stream: true parameter
**Status:** ✅ **PASS**

**Evidence:**
- `stream: true` parameter passed to `completions.create()` (line 112)
- Method returns `AsyncGenerator<StreamChunk>` (line 103)
- Properly processes streaming chunks in for-await loop (line 129-157)

**Implementation:**
```typescript
const stream = await this.client.chat.completions.create({
  model,
  messages,
  stream: true,  // ✅ Streaming enabled
  max_tokens: options.maxTokens,
  temperature: options.temperature,
  top_p: options.topP,
}, { signal, timeout });
```

---

### AC4: Model selection from tool config or env default
**Status:** ✅ **PASS**

**Evidence:**
- Model fallback logic: `options.model ?? this.defaultModel` (line 104)
- Default model configurable via env var `AI_DEFAULT_MODEL` (`config.ts:10`)
- Constructor allows custom default model (line 38, 73)
- Default value: `anthropic/claude-sonnet-4-20250514`

**Priority Order:**
1. Per-request `options.model`
2. Constructor `defaultModel`
3. Environment `AI_DEFAULT_MODEL`
4. Hardcoded default (from Zod schema)

---

### AC5: Error handling for rate limits, timeouts, auth failures, etc
**Status:** ✅ **PASS**

**Evidence:**
- Comprehensive `handleError()` method (line 206-298)
- All required error classes implemented in `errors.ts`:
  - `RateLimitError` (429 status) with retry-after header support
  - `TimeoutError` (AbortError, APITimeoutError, APIUserAbortError)
  - `AuthenticationError` (401/403 status)
  - `ModelNotAvailableError` (400 status with "model" in message)
  - `InvalidResponseError` (missing usage metadata)
  - `AiError` (base class, gateway errors, network errors)
- Error handling covers OpenAI SDK specific errors:
  - `APIError` (line 213-248)
  - `APIConnectionError` (line 252-258)
  - `APITimeoutError` (line 261-263)
  - `APIUserAbortError` (line 266-268)
  - Generic `AbortError` fallback (line 271-273)

**Error Taxonomy Quality:**
- ✅ All errors extend `AiError` which extends `AppError` from core
- ✅ Proper status codes assigned
- ✅ Detailed error messages with context
- ✅ Details object includes relevant metadata

---

### AC6: Returns async generator for streaming chunks
**Status:** ✅ **PASS** (Follows revised spec pattern)

**Evidence:**
- Method signature: `async *streamChat(): AsyncGenerator<StreamChunk>` (line 100-103)
- Yields content chunks: `yield { type: 'content', content }` (line 136)
- Yields final result in done chunk: `yield { type: 'done', result: {...} }` (line 165-173)
- Implements architect review recommendation (Option A pattern)

**StreamChunk Type:**
```typescript
export type StreamChunk =
  | { type: 'content'; content: string }
  | { type: 'done'; result: ChatCompletionResult };
```

**Quality Note:**
✅ Implementation correctly addressed the UX/architect review critical issue by yielding final result as done chunk instead of using generator return value. This makes the API ergonomic and accessible.

---

### AC7: Final response includes usage metadata (tokens)
**Status:** ✅ **PASS**

**Evidence:**
- Usage metadata extracted from OpenAI response (line 145-151)
- Included in `ChatCompletionResult` structure (line 167-172)
- Validation throws `InvalidResponseError` if missing (line 160-162)
- Usage metadata includes:
  - `promptTokens`
  - `completionTokens`
  - `totalTokens`

**Data Flow:**
1. Extract from OpenAI chunk: `chunk.usage.prompt_tokens` → `usage.promptTokens`
2. Store in local variable: `usage: UsageMetadata`
3. Validate presence after stream completes
4. Include in done chunk result

---

### AC8: Environment variables setup with validation
**Status:** ✅ **PASS**

**Evidence:**
- Zod schema defined in `config.ts:7-13`
- All required variables with validation:
  - `AI_GATEWAY_URL` - URL validation, default provided
  - `AI_API_KEY` - Required (min length 1)
  - `AI_DEFAULT_MODEL` - String, default provided
  - `AI_REQUEST_TIMEOUT_MS` - Coerced to positive int, default 120000
  - `AI_MAX_RETRIES` - Coerced to int (0-5), default 2
- Lazy loading via Proxy (line 47-52) prevents import-time failures
- `resetAiConfig()` function for test isolation (line 40-42)

**Schema Quality:**
- ✅ Proper Zod types with coercion
- ✅ Sensible defaults for all optional fields
- ✅ Validation constraints (URL format, positive numbers, ranges)

---

### AC9: Tests verify streaming and error handling
**Status:** ❌ **FAIL**

**Issues:**

#### Issue 1: Test Failures (10/69 tests failing)
**All failures due to mock configuration error:**
```
TypeError: default.APIError is not a constructor
TypeError: default.APIConnectionError is not a constructor
TypeError: default.APITimeoutError is not a constructor
TypeError: default.APIUserAbortError is not a constructor
```

**Root Cause:**
The OpenAI SDK mock in `__tests__/client.test.ts` is not properly exporting error classes. The test tries to access `(OpenAI as any).APIError` but the mock returns it on the wrong property.

**Failing Test Categories:**
- 1 test in "chat (non-streaming)" suite
- 9 tests in "error handling" suite

**Passing Tests (59/69):**
- ✅ Constructor tests (2/2)
- ✅ streamChat happy path tests (10/10)
- ✅ chat convenience method tests (1/2) - only non-error case
- ✅ Edge case tests (5/5)
- ❌ Error handling tests (1/10)

#### Issue 2: Test Coverage Unknown
Cannot determine test coverage percentage due to test failures. The test suite structure suggests good coverage across:
- Happy path streaming
- Usage metadata extraction
- Options passing
- Edge cases (empty messages, multi-turn, finish reasons)
- Error scenarios (rate limit, timeout, auth, model errors)

**Expected Coverage:** Given 59/69 tests pass and test structure is comprehensive, estimated coverage would be **70-80%** if all tests passed.

---

### AC10: TypeScript types for all responses
**Status:** ⚠️ **PARTIAL PASS** (Types defined but compilation fails)

**Evidence:**
- Complete type definitions in `types.ts`:
  - `MessageRole` type (line 10)
  - `ChatMessage` interface (line 15-18)
  - `UsageMetadata` interface (line 23-27)
  - `ChatCompletionResult` interface (line 32-44)
  - `StreamChunk` discriminated union (line 50-52)
  - `ChatCompletionOptions` interface (line 57-75)
- All types properly exported from `index.ts`

**TypeScript Compilation Issues:**

#### Error 1: Missing APITimeoutError export
```
src/client.ts(8,3): error TS2614: Module '"openai"' has no exported member 'APITimeoutError'
```

**Analysis:** The OpenAI SDK v4.104.0 may not export `APITimeoutError` directly. Need to verify actual exports from the installed version.

#### Error 2: Type incompatibility with max_tokens
```
Types of property 'max_tokens' are incompatible.
Type 'number | undefined' is not assignable to type 'number | null'.
Type 'undefined' is not assignable to type 'number | null'.
```

**Analysis:** OpenAI SDK expects `number | null` for optional parameters, but our code passes `number | undefined`. Need to convert undefined to null or omit the property.

**Fix Required:**
```typescript
// Current (incorrect):
{
  max_tokens: options.maxTokens,  // number | undefined
}

// Should be:
{
  ...(options.maxTokens != null && { max_tokens: options.maxTokens }),
}
```

---

## Code Quality Assessment

### ✅ Strengths

1. **Architecture Quality**
   - Clean separation of concerns (config, types, errors, client)
   - Proper use of dependency injection (constructor options)
   - Lazy initialization patterns for config and singleton
   - Follows architect review recommendations (done chunk pattern)

2. **Error Handling**
   - Comprehensive error taxonomy
   - All OpenAI SDK error types covered
   - Proper error conversion with context preservation
   - Typed errors extending core infrastructure

3. **Type Safety**
   - Discriminated unions for StreamChunk
   - Proper generic constraints
   - No `any` types in implementation (only in tests for mocking)
   - Type definitions exported correctly

4. **Testing Strategy**
   - Comprehensive test suite (69 tests)
   - AAA pattern followed consistently
   - Good fixture organization
   - Mock helpers for async iterators

5. **Configuration Management**
   - Zod validation with sensible defaults
   - Environment variable support
   - Constructor overrides for testing
   - Lazy loading prevents import errors

6. **Documentation**
   - JSDoc comments with examples
   - Clear code organization
   - Proper file naming conventions
   - Barrel exports in index.ts

### ❌ Issues Found

#### Critical Issues (Must Fix)

1. **TypeScript Compilation Errors**
   - **Severity:** 🔴 Critical
   - **Impact:** Code cannot be built or deployed
   - **Location:** `src/client.ts:8, 108`
   - **Files:** 1 file with 2 errors
   - **Fixes Required:**
     - Remove or fix `APITimeoutError` import
     - Convert undefined optional parameters to null or omit

2. **Test Failures**
   - **Severity:** 🔴 Critical
   - **Impact:** Cannot verify error handling works correctly
   - **Location:** `src/__tests__/client.test.ts`
   - **Tests Failing:** 10/69 (14.5%)
   - **Fixes Required:**
     - Fix OpenAI SDK mock to properly export error classes
     - Verify error handling logic against actual SDK v4.104.0

#### Quality Issues (Should Fix)

3. **Unknown Test Coverage**
   - **Severity:** 🟡 Medium
   - **Impact:** Cannot verify 80% coverage target
   - **Required:** Run coverage report after fixing test failures
   - **Expected:** Should achieve 80%+ given test structure

4. **Missing Integration Tests**
   - **Severity:** 🟡 Medium
   - **Impact:** Streaming behavior not verified end-to-end
   - **Recommendation:** Add integration test with real (or very realistic) mock responses

5. **OpenAI SDK Version Compatibility**
   - **Severity:** 🟡 Medium
   - **Observation:** SDK v4.104.0 installed, spec specified ^4.0.0
   - **Impact:** API surface may have changed between versions
   - **Action:** Verify all used APIs exist in v4.104.0

---

## Non-Functional Requirements Validation

### Performance

**Streaming Latency:** ✅ **PASS**
- Implementation uses true async generator streaming
- No buffering of complete response
- First chunk yielded immediately when available
- Expected latency: <100ms (depends on OpenRouter, not implementation)

**Memory Usage:** ✅ **PASS**
- Streaming implementation is memory-efficient
- Content accumulated only for final result (necessary for usage metadata)
- No large data structures held in memory
- Generator pattern allows garbage collection of chunks

**Timeout Handling:** ✅ **PASS**
- Default timeout: 120000ms (2 minutes)
- Configurable via environment variable
- Per-request override via options.timeoutMs
- Timeout errors properly typed and thrown

### Reliability

**Retry Logic:** ✅ **PASS**
- Handled by OpenAI SDK (maxRetries: 2)
- Configurable via environment variable (AI_MAX_RETRIES)
- Range validation: 0-5 retries

**Error Recovery:** ✅ **PASS**
- All errors converted to typed exceptions
- No unhandled promise rejections
- Error details preserved in error objects
- Graceful degradation on timeout (throws TimeoutError)

**Validation:** ✅ **PASS**
- Config validated at access time with Zod
- Usage metadata validated after stream completes
- Throws InvalidResponseError if missing

### Security

**API Key Handling:** ✅ **PASS**
- API key from environment variable only
- Never logged or exposed in error messages
- Passed securely to OpenAI SDK
- Not included in error details

**Input Validation:** ✅ **PASS**
- Message content validated by TypeScript types
- Options validated by type system
- No injection vulnerabilities (delegates to OpenAI SDK)

**Error Disclosure:** ✅ **PASS**
- Generic error messages for external failures
- No sensitive data in error details
- Original error messages sanitized in AiError conversion

---

## Spec Compliance

### Alignment with Architecture Review Recommendations

#### Critical Recommendation: Async Generator Pattern
**Status:** ✅ **IMPLEMENTED**

The implementation correctly adopted the architect review's **Option A** recommendation:
- Yields final result as `done` chunk (not generator return value)
- `StreamChunk` type includes `{ type: 'done'; result: ChatCompletionResult }`
- `chat()` method properly extracts result from done chunk
- No dangerous non-null assertions

**Before (Spec Original):**
```typescript
async *streamChat(): AsyncGenerator<StreamChunk, ChatCompletionResult, undefined>
return { content, usage, model, finishReason };  // Inaccessible!
```

**After (Implemented):**
```typescript
async *streamChat(): AsyncGenerator<StreamChunk>
yield { type: 'done', result: { content, usage, model, finishReason } };  // ✅
```

#### Recommended Enhancement: OpenAI SDK Error Types
**Status:** ✅ **IMPLEMENTED**

Architecture review recommended handling additional OpenAI SDK error types:
- ✅ `APIConnectionError` (line 252-258)
- ✅ `APITimeoutError` (line 261-263)
- ✅ `APIUserAbortError` (line 266-268)
- ✅ Generic `AbortError` fallback (line 271-273)

**Issue:** TypeScript import error for `APITimeoutError` suggests SDK version mismatch.

#### Recommended Enhancement: Lazy Config Initialization
**Status:** ✅ **IMPLEMENTED**

Architecture review recommended lazy initialization:
- ✅ Config loaded on first access via Proxy (line 47-52)
- ✅ `resetAiConfig()` for test isolation (line 40-42)
- ✅ Constructor conditionally accesses config (line 50-64)

### Deviations from Spec

1. **Constructor Flexibility** (Positive Deviation)
   - Spec: Constructor always accesses aiConfig for missing options
   - Implementation: Constructor skips aiConfig if all required options provided (line 50-56)
   - **Benefit:** Better testability, no environment variables needed in tests

2. **Singleton Export** (Positive Deviation)
   - Spec: Direct singleton initialization
   - Implementation: Proxy-based lazy initialization (line 305-312)
   - **Benefit:** Prevents import-time config errors

3. **Error Passthrough** (Positive Deviation)
   - Implementation adds check for already-converted AiError (line 208-210)
   - **Benefit:** Prevents double-wrapping of errors

---

## Edge Cases and Robustness

### ✅ Handled Edge Cases

1. **Empty message array** - Test passing (line 632-647)
2. **Multi-turn conversation** - Test passing (line 650-666)
3. **Different finish reasons** - Test passing (line 668-695)
4. **Empty content chunks** - Test passing (line 697-725)
5. **Single chunk response** - Test passing (line 211-232)
6. **Missing usage metadata** - Throws InvalidResponseError (line 234-246)
7. **Model mismatch** - Tracks actual model used (line 339-371)

### ⚠️ Potential Edge Cases Not Tested

1. **Very large streaming responses** - Memory accumulation of fullContent
2. **Network interruption mid-stream** - Unclear how OpenAI SDK handles this
3. **Malformed chunk structure** - No validation of chunk.choices[0] existence
4. **Multiple choices in response** - Only processes first choice (choices[0])
5. **Concurrent requests** - Not tested (though should work via SDK)

---

## Integration Points

### Upstream Dependencies

**@raptscallions/core:** ✅ **SATISFIED**
- `AppError` class available
- Properly extended by `AiError`
- Error infrastructure complete

**openai SDK:** ⚠️ **VERSION MISMATCH**
- Required: ^4.0.0
- Installed: 4.104.0
- **Issue:** `APITimeoutError` import fails
- **Action:** Verify SDK exports in v4.104.0

### Downstream Consumers

**E04-T003 (Chat Runtime):** ⚠️ **BLOCKED**
- Needs `streamChat()` method - ✅ Available
- Needs usage metadata - ✅ Available in done chunk
- **Blocker:** TypeScript compilation errors must be fixed

**E04-T005 (Message Persistence):** ⚠️ **BLOCKED**
- Needs usage metadata structure - ✅ Type defined
- Needs finish reason - ✅ Available in result
- **Blocker:** TypeScript compilation errors must be fixed

**E04-T004 (SSE Endpoint):** ⚠️ **BLOCKED**
- Needs streaming chunks - ✅ Generator pattern ready
- Needs done signal - ✅ Done chunk implemented
- **Blocker:** TypeScript compilation errors must be fixed

---

## Test Results Summary

```
Test Suites: 3 total (1 failed, 2 passed)
Tests:       69 total (10 failed, 59 passed)
Duration:    28ms (tests only)
```

### Passing Test Suites (2)
- ✅ `config.test.ts` - 17/17 tests passing
- ✅ `errors.test.ts` - 20/20 tests passing

### Failing Test Suite (1)
- ❌ `client.test.ts` - 32/42 tests passing (10 failures)

### Failed Tests by Category

**chat (non-streaming) - 1 failure:**
- ❌ should throw error when stream fails

**error handling - 9 failures:**
- ❌ should throw RateLimitError on 429
- ❌ should include retry-after in RateLimitError
- ❌ should throw AuthenticationError on 401
- ❌ should throw AuthenticationError on 403
- ❌ should throw ModelNotAvailableError on 400 with model error
- ❌ should throw TimeoutError on APITimeoutError
- ❌ should throw TimeoutError on APIUserAbortError
- ❌ should throw AiError on APIConnectionError
- ❌ should throw AiError on 500+ status codes

**Common Failure Pattern:**
All failures are due to mock configuration error: `default.APIError is not a constructor`

---

## Required Fixes

### Fix Priority: P0 (Critical - Must Fix Before Merge)

#### Fix 1: TypeScript Import Error
**File:** `packages/ai/src/client.ts:8`
**Error:** `Module '"openai"' has no exported member 'APITimeoutError'`

**Solution Options:**
1. Import from correct path if it exists
2. Remove import and handle as generic Error with name check
3. Update to SDK version that exports it

**Recommended Fix:**
```typescript
// Check if APITimeoutError exists in openai v4.104.0
// If not, remove from imports and handle via error.name === 'APITimeoutError'
```

#### Fix 2: Type Compatibility Error
**File:** `packages/ai/src/client.ts:108`
**Error:** `Type 'number | undefined' is not assignable to type 'number | null'`

**Recommended Fix:**
```typescript
const stream = await this.client.chat.completions.create(
  {
    model,
    messages,
    stream: true,
    ...(options.maxTokens != null && { max_tokens: options.maxTokens }),
    ...(options.temperature != null && { temperature: options.temperature }),
    ...(options.topP != null && { top_p: options.topP }),
  },
  {
    signal: options.signal,
    timeout: options.timeoutMs ?? aiConfig.AI_REQUEST_TIMEOUT_MS,
  }
);
```

#### Fix 3: Test Mock Configuration
**File:** `packages/ai/src/__tests__/client.test.ts:22-78`
**Error:** Mock error classes not accessible

**Recommended Fix:**
```typescript
vi.mock('openai', () => {
  class APIError extends Error {
    status?: number;
    headers?: Record<string, string>;
    constructor(message: string, status?: number, headers?: Record<string, string>) {
      super(message);
      this.name = 'APIError';
      this.status = status;
      this.headers = headers;
    }
  }

  // ... other error classes ...

  const MockOpenAI = vi.fn(function (this: any, config: any) {
    // ... constructor implementation ...
  });

  // Attach error classes to MockOpenAI itself
  MockOpenAI.APIError = APIError;
  MockOpenAI.APIConnectionError = APIConnectionError;
  MockOpenAI.APITimeoutError = APITimeoutError;
  MockOpenAI.APIUserAbortError = APIUserAbortError;

  return {
    default: MockOpenAI,
    // Also export as named exports for import destructuring
    APIError,
    APIConnectionError,
    APITimeoutError,
    APIUserAbortError,
  };
});
```

### Fix Priority: P1 (High - Should Fix Before Release)

#### Fix 4: Verify Test Coverage
**Action:** Run coverage report after fixing P0 issues
**Command:** `pnpm test -- --coverage`
**Target:** 80%+ line coverage
**Expected Result:** Should pass given test structure

#### Fix 5: Add Integration Test
**Action:** Create integration test with realistic mock
**File:** `packages/ai/src/__tests__/integration.test.ts`
**Purpose:** Verify end-to-end streaming with realistic response structure

---

## Recommendations

### Immediate Actions (Before Marking Complete)

1. **Fix TypeScript Errors** (P0)
   - Investigate OpenAI SDK v4.104.0 exports
   - Fix import or adjust error handling
   - Fix optional parameter passing

2. **Fix Test Mocks** (P0)
   - Update mock configuration to match SDK structure
   - Re-run tests to verify all 69 pass
   - Verify error handling works correctly

3. **Verify Coverage** (P1)
   - Run coverage report
   - Confirm 80%+ target met
   - Add tests if needed

### Future Enhancements (Post-Epic)

1. **Telemetry Integration**
   - Add OpenTelemetry tracing (mentioned in spec section 11)
   - Track tokens, latency, error rates
   - Integrate with `@raptscallions/telemetry`

2. **Response Validation**
   - Add validation of chunk structure before accessing
   - Handle malformed responses gracefully
   - Add tests for malformed chunk scenarios

3. **Performance Testing**
   - Test with very large responses
   - Measure memory usage during streaming
   - Verify no memory leaks

4. **Documentation**
   - Add package README with usage examples
   - Document error scenarios and handling
   - Add troubleshooting guide

---

## Final Verdict

**Status:** ❌ **DOES NOT MEET ACCEPTANCE CRITERIA**

**Reasoning:**
- TypeScript compilation fails (AC10 not met)
- 14.5% test failure rate (AC9 not met)
- Cannot build or deploy code in current state
- Cannot verify error handling functionality

**Completion Estimate:** **85% Complete**

**Required Work to Pass:**
1. Fix 2 TypeScript errors (~1 hour)
2. Fix test mock configuration (~30 minutes)
3. Re-run tests and verify all pass (~15 minutes)
4. Run coverage report and verify 80%+ (~15 minutes)
5. Fix any remaining coverage gaps if needed (~1-2 hours)

**Estimated Time to Complete:** **2-4 hours**

### What's Working Well (85% Complete)

✅ Core implementation architecture is excellent
✅ Error handling logic is comprehensive
✅ Type definitions are complete and correct
✅ Config management with Zod validation works
✅ Streaming pattern follows architect recommendations
✅ 59/69 tests passing (85.5%)
✅ All config and error tests passing (100%)

### What Needs Fixing (15% Incomplete)

❌ TypeScript compilation errors
❌ Test mock configuration
❌ Error handling tests not verified
❌ Coverage report not available

---

## Next Steps

1. **Developer:** Fix TypeScript errors and test mocks (P0 issues)
2. **Developer:** Re-run full test suite and verify all pass
3. **Developer:** Run coverage report and achieve 80%+
4. **QA:** Re-run this QA validation after fixes
5. **QA:** Update workflow_state to DOCS_UPDATE if all AC pass
6. **Writer:** Update documentation if API changes

---

**QA Engineer:** qa
**Date:** 2026-01-12
**Report Version:** 1.0
