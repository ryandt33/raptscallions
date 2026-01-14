import { describe, it, expect } from "vitest";

import {
  messageMetaSchema,
  parseMessageMeta,
  safeParseMessageMeta,
  type MessageMeta,
  type Extraction,
} from "../../schemas/message-meta.schema.js";

describe("messageMetaSchema", () => {
  describe("Basic Validation", () => {
    it("should accept empty object", () => {
      // Arrange & Act
      const result = messageMetaSchema.parse({});

      // Assert
      expect(result).toEqual({});
    });

    it("should accept all common fields", () => {
      // Arrange
      const meta: MessageMeta = {
        tokens: 150,
        model: "anthropic/claude-sonnet-4-20250514",
        latency_ms: 432,
        prompt_tokens: 50,
        completion_tokens: 100,
        finish_reason: "stop",
      };

      // Act
      const result = messageMetaSchema.parse(meta);

      // Assert
      expect(result).toEqual(meta);
    });

    it("should allow additional fields via passthrough", () => {
      // Arrange
      const meta = {
        tokens: 150,
        custom_field: "custom_value",
        nested: { data: 123 },
      };

      // Act
      const result = messageMetaSchema.parse(meta);

      // Assert
      expect(result.custom_field).toBe("custom_value");
      expect(result.nested).toEqual({ data: 123 });
    });
  });

  describe("Field Validation", () => {
    it("should reject negative tokens", () => {
      // Arrange
      const invalidMeta = { tokens: -1 };

      // Act & Assert
      expect(() => messageMetaSchema.parse(invalidMeta)).toThrow();
    });

    it("should reject zero tokens", () => {
      // Arrange - tokens must be positive (> 0), not just non-negative
      const invalidMeta = { tokens: 0 };

      // Act & Assert
      expect(() => messageMetaSchema.parse(invalidMeta)).toThrow();
    });

    it("should accept positive tokens", () => {
      // Arrange
      const validMeta = { tokens: 150 };

      // Act
      const result = messageMetaSchema.parse(validMeta);

      // Assert
      expect(result.tokens).toBe(150);
    });

    it("should reject non-integer tokens", () => {
      // Arrange
      const invalidMeta = { tokens: 150.5 };

      // Act & Assert
      expect(() => messageMetaSchema.parse(invalidMeta)).toThrow();
    });

    it("should reject negative latency_ms", () => {
      // Arrange
      const invalidMeta = { latency_ms: -100 };

      // Act & Assert
      expect(() => messageMetaSchema.parse(invalidMeta)).toThrow();
    });

    it("should accept zero latency_ms", () => {
      // Arrange - latency_ms can be zero (positive includes zero)
      const validMeta = { latency_ms: 0 };

      // Act
      const result = messageMetaSchema.parse(validMeta);

      // Assert
      expect(result.latency_ms).toBe(0);
    });

    it("should accept positive latency_ms with decimals", () => {
      // Arrange - latency_ms is number, not int
      const validMeta = { latency_ms: 432.5 };

      // Act
      const result = messageMetaSchema.parse(validMeta);

      // Assert
      expect(result.latency_ms).toBe(432.5);
    });

    it("should accept valid finish_reason values", () => {
      // Arrange
      const validReasons = ["stop", "length", "content_filter", "error"];

      // Act & Assert
      for (const reason of validReasons) {
        const result = messageMetaSchema.parse({ finish_reason: reason });
        expect(result.finish_reason).toBe(reason);
      }
    });

    it("should reject invalid finish_reason", () => {
      // Arrange
      const invalidMeta = { finish_reason: "invalid" };

      // Act & Assert
      expect(() => messageMetaSchema.parse(invalidMeta)).toThrow();
    });

    it("should accept zero prompt_tokens", () => {
      // Arrange - prompt_tokens is nonnegative (>= 0)
      const validMeta = { prompt_tokens: 0 };

      // Act
      const result = messageMetaSchema.parse(validMeta);

      // Assert
      expect(result.prompt_tokens).toBe(0);
    });

    it("should reject negative prompt_tokens", () => {
      // Arrange
      const invalidMeta = { prompt_tokens: -1 };

      // Act & Assert
      expect(() => messageMetaSchema.parse(invalidMeta)).toThrow();
    });

    it("should accept zero completion_tokens", () => {
      // Arrange - completion_tokens is nonnegative (>= 0)
      const validMeta = { completion_tokens: 0 };

      // Act
      const result = messageMetaSchema.parse(validMeta);

      // Assert
      expect(result.completion_tokens).toBe(0);
    });

    it("should reject negative completion_tokens", () => {
      // Arrange
      const invalidMeta = { completion_tokens: -1 };

      // Act & Assert
      expect(() => messageMetaSchema.parse(invalidMeta)).toThrow();
    });
  });

  describe("Extractions Validation", () => {
    it("should accept valid extractions array", () => {
      // Arrange
      const meta = {
        extractions: [
          { type: "sentiment", value: "positive" },
          { type: "topic", value: ["math", "algebra"], confidence: 0.95 },
        ],
      };

      // Act
      const result = messageMetaSchema.parse(meta);

      // Assert
      expect(result.extractions).toHaveLength(2);
      expect(result.extractions?.[0]?.type).toBe("sentiment");
      expect(result.extractions?.[1]?.confidence).toBe(0.95);
    });

    it("should reject extraction with empty type", () => {
      // Arrange
      const invalidMeta = {
        extractions: [{ type: "", value: "test" }],
      };

      // Act & Assert
      expect(() => messageMetaSchema.parse(invalidMeta)).toThrow();
    });

    it("should reject extraction confidence below 0", () => {
      // Arrange
      const invalidMeta = {
        extractions: [{ type: "test", value: "x", confidence: -0.1 }],
      };

      // Act & Assert
      expect(() => messageMetaSchema.parse(invalidMeta)).toThrow();
    });

    it("should reject extraction confidence above 1", () => {
      // Arrange
      const invalidMeta = {
        extractions: [{ type: "test", value: "x", confidence: 1.5 }],
      };

      // Act & Assert
      expect(() => messageMetaSchema.parse(invalidMeta)).toThrow();
    });

    it("should accept extraction confidence at boundaries (0 and 1)", () => {
      // Arrange
      const metaWith0 = {
        extractions: [{ type: "test", value: "x", confidence: 0 }],
      };
      const metaWith1 = {
        extractions: [{ type: "test", value: "y", confidence: 1 }],
      };

      // Act
      const result0 = messageMetaSchema.parse(metaWith0);
      const result1 = messageMetaSchema.parse(metaWith1);

      // Assert
      expect(result0.extractions?.[0]?.confidence).toBe(0);
      expect(result1.extractions?.[0]?.confidence).toBe(1);
    });

    it("should accept extraction with source module", () => {
      // Arrange
      const meta = {
        extractions: [
          {
            type: "entity",
            value: { name: "John", type: "person" },
            source: "ner-module",
          },
        ],
      };

      // Act
      const result = messageMetaSchema.parse(meta);

      // Assert
      expect(result.extractions?.[0]?.source).toBe("ner-module");
    });

    it("should accept extraction without optional fields", () => {
      // Arrange
      const meta = {
        extractions: [{ type: "sentiment", value: "positive" }],
      };

      // Act
      const result = messageMetaSchema.parse(meta);

      // Assert
      expect(result.extractions?.[0]?.confidence).toBeUndefined();
      expect(result.extractions?.[0]?.source).toBeUndefined();
    });

    it("should accept extraction with complex value types", () => {
      // Arrange
      const meta = {
        extractions: [
          { type: "string_value", value: "text" },
          { type: "number_value", value: 123 },
          { type: "boolean_value", value: true },
          { type: "array_value", value: [1, 2, 3] },
          { type: "object_value", value: { nested: { data: "value" } } },
        ],
      };

      // Act
      const result = messageMetaSchema.parse(meta);

      // Assert
      expect(result.extractions).toHaveLength(5);
      expect(result.extractions?.[0]?.value).toBe("text");
      expect(result.extractions?.[1]?.value).toBe(123);
      expect(result.extractions?.[2]?.value).toBe(true);
      expect(result.extractions?.[3]?.value).toEqual([1, 2, 3]);
      expect(result.extractions?.[4]?.value).toEqual({ nested: { data: "value" } });
    });
  });

  describe("Helper Functions", () => {
    it("parseMessageMeta should return typed result", () => {
      // Arrange
      const data = { tokens: 100, model: "test-model" };

      // Act
      const result = parseMessageMeta(data);

      // Assert
      expect(result.tokens).toBe(100);
      expect(result.model).toBe("test-model");
    });

    it("parseMessageMeta should throw on invalid data", () => {
      // Arrange
      const invalidData = { tokens: "not-a-number" };

      // Act & Assert
      expect(() => parseMessageMeta(invalidData)).toThrow();
    });

    it("parseMessageMeta should throw on negative tokens", () => {
      // Arrange
      const invalidData = { tokens: -50 };

      // Act & Assert
      expect(() => parseMessageMeta(invalidData)).toThrow();
    });

    it("safeParseMessageMeta should return success on valid data", () => {
      // Arrange
      const data = { tokens: 100 };

      // Act
      const result = safeParseMessageMeta(data);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tokens).toBe(100);
      }
    });

    it("safeParseMessageMeta should return error on invalid data", () => {
      // Arrange
      const invalidData = { tokens: "invalid" };

      // Act
      const result = safeParseMessageMeta(invalidData);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it("safeParseMessageMeta should return error on negative tokens", () => {
      // Arrange
      const invalidData = { tokens: -100 };

      // Act
      const result = safeParseMessageMeta(invalidData);

      // Assert
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it("safeParseMessageMeta should preserve additional fields", () => {
      // Arrange
      const data = { tokens: 100, custom_field: "custom_value" };

      // Act
      const result = safeParseMessageMeta(data);

      // Assert
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.custom_field).toBe("custom_value");
      }
    });
  });

  describe("Type Safety", () => {
    it("should properly type MessageMeta", () => {
      // Arrange - Compile-time test - these should all compile
      const meta: MessageMeta = {
        tokens: 150,
        model: "test",
        latency_ms: 100,
        prompt_tokens: 50,
        completion_tokens: 100,
        finish_reason: "stop",
        extractions: [{ type: "test", value: 123 }],
      };

      // Act & Assert
      expect(meta.tokens).toBe(150);
      expect(meta.model).toBe("test");
      expect(meta.latency_ms).toBe(100);
      expect(meta.prompt_tokens).toBe(50);
      expect(meta.completion_tokens).toBe(100);
      expect(meta.finish_reason).toBe("stop");
      expect(meta.extractions).toHaveLength(1);
    });

    it("should properly type Extraction", () => {
      // Arrange - Compile-time test
      const extraction: Extraction = {
        type: "sentiment",
        value: { score: 0.8, label: "positive" },
        confidence: 0.95,
        source: "sentiment-analyzer",
      };

      // Act & Assert
      expect(extraction.type).toBe("sentiment");
      expect(extraction.value).toEqual({ score: 0.8, label: "positive" });
      expect(extraction.confidence).toBe(0.95);
      expect(extraction.source).toBe("sentiment-analyzer");
    });

    it("should allow MessageMeta with only optional fields", () => {
      // Arrange - All fields are optional
      const emptyMeta: MessageMeta = {};

      // Act & Assert
      expect(emptyMeta).toEqual({});
    });

    it("should allow partial MessageMeta", () => {
      // Arrange
      const partialMeta: MessageMeta = {
        tokens: 100,
        model: "test-model",
      };

      // Act & Assert
      expect(partialMeta.tokens).toBe(100);
      expect(partialMeta.model).toBe("test-model");
      expect(partialMeta.latency_ms).toBeUndefined();
    });
  });

  describe("Real-world Usage Patterns", () => {
    it("should validate typical AI response metadata", () => {
      // Arrange
      const aiResponseMeta = {
        tokens: 450,
        model: "anthropic/claude-sonnet-4-20250514",
        latency_ms: 1250.5,
        prompt_tokens: 100,
        completion_tokens: 350,
        finish_reason: "stop",
      };

      // Act
      const result = messageMetaSchema.parse(aiResponseMeta);

      // Assert
      expect(result).toEqual(aiResponseMeta);
    });

    it("should validate metadata with module extractions", () => {
      // Arrange
      const metaWithExtractions = {
        tokens: 200,
        model: "gpt-4",
        latency_ms: 800,
        extractions: [
          {
            type: "sentiment",
            value: { label: "positive", score: 0.92 },
            confidence: 0.95,
            source: "sentiment-analyzer-v2",
          },
          {
            type: "topic",
            value: ["education", "mathematics"],
            confidence: 0.88,
            source: "topic-classifier",
          },
          {
            type: "entity",
            value: {
              entities: [
                { text: "Python", type: "TECHNOLOGY" },
                { text: "NASA", type: "ORGANIZATION" },
              ],
            },
            source: "ner-module",
          },
        ],
      };

      // Act
      const result = messageMetaSchema.parse(metaWithExtractions);

      // Assert
      expect(result.extractions).toHaveLength(3);
      expect(result.extractions?.[0]?.type).toBe("sentiment");
      expect(result.extractions?.[1]?.type).toBe("topic");
      expect(result.extractions?.[2]?.type).toBe("entity");
    });

    it("should validate error scenario metadata", () => {
      // Arrange
      const errorMeta = {
        tokens: 50,
        model: "test-model",
        latency_ms: 100,
        finish_reason: "error",
        error_code: "RATE_LIMIT",
        error_message: "Rate limit exceeded",
      };

      // Act - passthrough allows additional fields
      const result = messageMetaSchema.parse(errorMeta);

      // Assert
      expect(result.finish_reason).toBe("error");
      expect(result.error_code).toBe("RATE_LIMIT");
      expect(result.error_message).toBe("Rate limit exceeded");
    });

    it("should validate minimal metadata", () => {
      // Arrange
      const minimalMeta = {
        tokens: 10,
      };

      // Act
      const result = messageMetaSchema.parse(minimalMeta);

      // Assert
      expect(result.tokens).toBe(10);
      expect(result.model).toBeUndefined();
      expect(result.latency_ms).toBeUndefined();
    });
  });
});
