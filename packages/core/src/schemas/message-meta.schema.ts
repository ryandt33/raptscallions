import { z } from "zod";

/**
 * Schema for extraction data captured by modules during hook execution.
 * Extractions are typed key-value pairs for structured data.
 */
export const extractionSchema = z.object({
  /** Type identifier for the extraction (e.g., "sentiment", "topic", "entity") */
  type: z.string().min(1),
  /** Extracted value - can be any JSON-serializable data */
  value: z.unknown(),
  /** Optional confidence score (0-1) */
  confidence: z.number().min(0).max(1).optional(),
  /** Optional source module identifier */
  source: z.string().optional(),
});

/**
 * Schema for message metadata field.
 *
 * Common fields are explicitly typed for consistency across the codebase.
 * Uses `.passthrough()` to allow additional fields for extensibility.
 *
 * @example
 * ```typescript
 * const meta: MessageMeta = {
 *   tokens: 150,
 *   model: "anthropic/claude-sonnet-4-20250514",
 *   latency_ms: 432,
 * };
 *
 * // Validate unknown data
 * const parsed = messageMetaSchema.parse(jsonData);
 * ```
 */
export const messageMetaSchema = z
  .object({
    /** Number of tokens used in generation (positive integer) */
    tokens: z.number().int().positive().optional(),

    /** Model identifier used for generation */
    model: z.string().optional(),

    /** Response latency in milliseconds */
    latency_ms: z.number().nonnegative().optional(),

    /** Prompt tokens used (for detailed token tracking) */
    prompt_tokens: z.number().int().nonnegative().optional(),

    /** Completion tokens generated */
    completion_tokens: z.number().int().nonnegative().optional(),

    /** Finish reason from AI response */
    finish_reason: z
      .enum(["stop", "length", "content_filter", "error"])
      .optional(),

    /** Structured data extracted by modules during hook execution */
    extractions: z.array(extractionSchema).optional(),
  })
  .passthrough(); // Allow additional fields for extensibility

/**
 * Type inferred from messageMetaSchema.
 * Use this for typed access to common meta fields.
 */
export type MessageMeta = z.infer<typeof messageMetaSchema>;

/**
 * Type for extraction entries within meta.
 */
export type Extraction = z.infer<typeof extractionSchema>;

/**
 * Validates and parses message meta data.
 * Returns a typed MessageMeta object or throws ZodError.
 *
 * @param data - Unknown data to validate
 * @returns Validated MessageMeta object
 * @throws ZodError if validation fails
 */
export function parseMessageMeta(data: unknown): MessageMeta {
  return messageMetaSchema.parse(data);
}

/**
 * Safely validates message meta data.
 * Returns success/error result without throwing.
 *
 * @param data - Unknown data to validate
 * @returns SafeParseResult with data or error
 */
export function safeParseMessageMeta(data: unknown) {
  return messageMetaSchema.safeParse(data);
}
