/**
 * Predicate Compiler
 * Compiles predicate conditions (isEmpty, isNull, etc.)
 */

import type { ICompiler, CompiledUnit } from "../types/index.js";

interface PredicateInput {
  type: string;
  variable: string;
}

export class PredicateCompiler implements ICompiler {
  private cache = new Map<string, CompiledUnit>();

  compile(input: string | Record<string, unknown>): CompiledUnit {
    let config: PredicateInput;

    if (typeof input === "string") {
      throw new Error("Predicate compiler expects object input");
    }

    config = input as unknown as PredicateInput;

    const cacheKey = `${config.type}:${config.variable}`;
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const unit: CompiledUnit = {
      ast: {
        type: config.type,
        variable: config.variable,
      },
      dependencies: [config.variable],
      complexity: 1,
      metadata: {
        type: "predicate",
        predicateType: config.type,
        variable: config.variable,
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
}

export const predicateCompiler = new PredicateCompiler();
