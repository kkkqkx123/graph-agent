/**
 * Schema Condition Executor
 * Executes JSON Schema validation
 *
 * Note: Uses simple validation rules, not full JSON Schema spec.
 */

import type { EvaluationContext } from "@wf-agent/types";
import { BaseExecutor } from "../base-executor.js";
import type { CompiledUnit, IExecutor } from "../types/index.js";

export class SchemaExecutor extends BaseExecutor implements IExecutor {
  execute(compiled: CompiledUnit, context: EvaluationContext, variable?: string): unknown {
    this.validateContext(context);

    if (!variable) {
      throw new Error("Schema executor requires variable parameter");
    }

    const schema = compiled.ast as any;
    const value = this.getVariableValue(variable, context);

    return this.validateAgainstSchema(value, schema);
  }

  private validateAgainstSchema(value: unknown, schema: any): boolean {
    const type = schema["type"];

    // Type validation
    if (type) {
      if (!this.validateType(value, type)) {
        return false;
      }
    }

    // Null validation
    if (type === "null") {
      return value === null;
    }

    // String validations
    if (type === "string") {
      if (typeof value !== "string") return false;

      const minLength = schema["minLength"];
      if (minLength !== undefined && value.length < minLength) return false;

      const maxLength = schema["maxLength"];
      if (maxLength !== undefined && value.length > maxLength) return false;

      const pattern = schema["pattern"];
      if (pattern) {
        const regex = new RegExp(pattern);
        if (!regex.test(value)) return false;
      }

      const enumValues = schema["enum"];
      if (enumValues && !enumValues.includes(value)) return false;

      return true;
    }

    // Number validations
    if (type === "number" || type === "integer") {
      const num = value as number;

      const minimum = schema["minimum"];
      if (minimum !== undefined && num < minimum) return false;

      const maximum = schema["maximum"];
      if (maximum !== undefined && num > maximum) return false;

      const multipleOf = schema["multipleOf"];
      if (multipleOf && num % multipleOf !== 0) return false;

      return true;
    }

    // Array validations
    if (type === "array") {
      if (!Array.isArray(value)) return false;

      const minItems = schema["minItems"];
      if (minItems !== undefined && value.length < minItems) return false;

      const maxItems = schema["maxItems"];
      if (maxItems !== undefined && value.length > maxItems) return false;

      const items = schema["items"];
      if (items) {
        for (const item of value) {
          if (!this.validateAgainstSchema(item, items)) return false;
        }
      }

      return true;
    }

    // Object validations
    if (type === "object") {
      if (typeof value !== "object" || value === null || Array.isArray(value)) return false;

      const obj = value as Record<string, unknown>;
      const properties = schema["properties"];
      const required = schema["required"];

      // Check required properties
      if (required && Array.isArray(required)) {
        for (const prop of required) {
          if (!(prop in obj)) return false;
        }
      }

      // Validate properties
      if (properties && typeof properties === "object") {
        for (const [prop, propSchema] of Object.entries(properties)) {
          if (prop in obj) {
            if (!this.validateAgainstSchema(obj[prop], propSchema)) return false;
          }
        }
      }

      return true;
    }

    // No type specified, basic structure is valid
    return true;
  }

  private validateType(value: unknown, type: string): boolean {
    if (type === "null") return value === null;
    if (type === "boolean") return typeof value === "boolean";
    if (type === "object") return typeof value === "object" && value !== null && !Array.isArray(value);
    if (type === "array") return Array.isArray(value);
    if (type === "number") return typeof value === "number";
    if (type === "integer") return Number.isInteger(value);
    if (type === "string") return typeof value === "string";
    return false;
  }
}

export const schemaExecutor = new SchemaExecutor();
