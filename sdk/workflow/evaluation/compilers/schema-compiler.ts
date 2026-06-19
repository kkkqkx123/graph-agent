/**
 * Schema Compiler
 * Compiles JSON Schema for validation
 */

import type { ICompiler, CompiledUnit } from "../types/index.js";

export class SchemaCompiler implements ICompiler {
  private cache = new Map<string, CompiledUnit>();

  compile(input: string | Record<string, unknown>): CompiledUnit {
    if (typeof input === "string") {
      throw new Error("Schema compiler expects object input");
    }

    const schema = input as any;
    const cacheKey = JSON.stringify(schema);

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const unit: CompiledUnit = {
      ast: schema,
      dependencies: [],
      complexity: this.calculateSchemaComplexity(schema),
      metadata: {
        type: "schema",
      },
    };

    this.cache.set(cacheKey, unit);
    return unit;
  }

  clearCache(): void {
    this.cache.clear();
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  private calculateSchemaComplexity(schema: any, depth: number = 0): number {
    if (depth > 10) return 100;

    let complexity = 1;

    const properties = schema["properties"];
    if (properties && typeof properties === "object") {
      const props = Object.keys(properties);
      complexity += props.length * 2;

      for (const prop of props) {
        const propSchema = properties[prop];
        if (propSchema && typeof propSchema === "object") {
          complexity += this.calculateSchemaComplexity(propSchema, depth + 1);
        }
      }
    }

    const items = schema["items"];
    if (items && typeof items === "object") {
      complexity += 2 + this.calculateSchemaComplexity(items, depth + 1);
    }

    const oneOf = schema["oneOf"];
    if (oneOf && Array.isArray(oneOf)) {
      complexity += oneOf.length * 2;
    }

    const anyOf = schema["anyOf"];
    if (anyOf && Array.isArray(anyOf)) {
      complexity += anyOf.length * 2;
    }

    const allOf = schema["allOf"];
    if (allOf && Array.isArray(allOf)) {
      complexity += allOf.length * 2;
    }

    return complexity;
  }
}

export const schemaCompiler = new SchemaCompiler();
