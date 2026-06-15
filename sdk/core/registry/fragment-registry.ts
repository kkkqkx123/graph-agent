/**
 * FragmentRegistry - System Prompt Fragment Registry
 *
 * Manages system prompt fragments with dependency tracking.
 * Tracks which templates reference each fragment for cascade-aware unregistration.
 *
 * This module only exports class definitions; instances are managed by the DI container as singletons.
 */

import type { SystemPromptFragment } from "@wf-agent/types";
import { renderTemplate } from "../utils/template-renderer/index.js";
import { createContextualLogger } from "../../utils/contextual-logger.js";
import { createRegistry } from "./utils/registry-utils.js";
import { validateRequiredString } from "./utils/validation-utils.js";

const logger = createContextualLogger({ component: "FragmentRegistry" });

export interface UnregisterResult {
  removed: boolean;
  affectedDependents: string[];
}

/**
 * Fragment Registry Class
 *
 * Manages system prompt fragments with:
 * - Dependency tracking: Records which templates reference each fragment
 * - Validation: Ensures fragment ID and content are non-empty
 * - Unregister with cascade info: Reports affected dependent templates
 */
export class FragmentRegistry {
  private items = createRegistry<SystemPromptFragment>();
  /** Tracks which templates reference each fragment (fragmentId → Set<templateId>) */
  private dependents = new Map<string, Set<string>>();

  /**
   * Validate a fragment before registration.
   *
   * Validates:
   * - Fragment ID is non-empty
   * - Fragment content is non-empty
   * - Required variables are used in content (warning only)
   *
   * @param fragment Fragment definition
   * @throws {Error} If validation fails
   */
  private validate(fragment: SystemPromptFragment): void {
    validateRequiredString(fragment as unknown as Record<string, unknown>, "id", "Fragment ID is required and must be a non-empty string");
    validateRequiredString(fragment as unknown as Record<string, unknown>, "content", `Fragment '${fragment.id}' content is required and must be a non-empty string`);

    if (fragment.variables && fragment.variables.length > 0) {
      for (const variable of fragment.variables) {
        const placeholder = `{{${variable.name}}}`;
        const isUsed = fragment.content.includes(placeholder);
        if (!isUsed && variable.required) {
          logger.warn(
            `Fragment '${fragment.id}' declares required variable '${variable.name}' ` +
              `but it is not used in the content`,
          );
        }
      }
    }
  }

  /**
   * Register a fragment.
   *
   * @param key Fragment ID
   * @param fragment Fragment definition
   * @param options Registration options
   * @throws Error if validation fails or fragment already exists
   */
  register(key: string, fragment: SystemPromptFragment, options?: { skipIfExists?: boolean }): void {
    // Validate fragment
    this.validate(fragment);

    // Check for existing fragment
    if (this.items.has(key)) {
      if (options?.skipIfExists) {
        return;
      }
      throw new Error(`Fragment '${key}' already exists`);
    }

    this.items.set(key, fragment);
  }

  /**
   * Register a fragment asynchronously with storage persistence (write-through).
   *
   * @param key Fragment ID
   * @param fragment Fragment definition
   * @param options Registration options
   */
  async registerAsync(
    key: string,
    fragment: SystemPromptFragment,
    options?: { skipIfExists?: boolean },
  ): Promise<void> {
    this.register(key, fragment, options);
    // Storage persistence can be added here if needed in the future
  }

  /**
   * Batch register multiple fragments.
   *
   * @param fragments Array of fragment definitions
   */
  registerAll(fragments: SystemPromptFragment[]): void {
    for (const fragment of fragments) {
      this.register(fragment.id, fragment);
    }
  }

  /**
   * Get a fragment by ID.
   *
   * @param key Fragment ID
   * @returns The fragment or undefined if not found
   */
  get(key: string): SystemPromptFragment | undefined {
    return this.items.get(key);
  }

  /**
   * Check if a fragment exists.
   *
   * @param key Fragment ID
   * @returns Whether the fragment exists
   */
  has(key: string): boolean {
    return this.items.has(key);
  }

  /**
   * Get all fragments.
   *
   * @returns Array of all fragments
   */
  list(): SystemPromptFragment[] {
    return this.items.list();
  }

  /**
   * Get all fragment IDs.
   *
   * @returns Array of all fragment IDs
   */
  keys(): string[] {
    return this.items.keys();
  }

  /**
   * Get the number of registered fragments.
   */
  get size(): number {
    return this.items.size;
  }

  /**
   * Get fragments by category.
   *
   * @param category Fragment category
   * @returns Array of fragments in the category
   */
  getByCategory(category: SystemPromptFragment["category"]): SystemPromptFragment[] {
    return this.list().filter(f => f.category === category);
  }

  /**
   * Render fragment content with variable substitution.
   *
   * @param id Fragment ID
   * @param variables Variable values to substitute
   * @returns Rendered content string, or undefined if fragment not found
   */
  render(id: string, variables?: Record<string, unknown>): string | undefined {
    const fragment = this.get(id);
    if (!fragment) return undefined;
    if (!variables || !fragment.variables || fragment.variables.length === 0) {
      return fragment.content;
    }
    return renderTemplate(fragment.content, variables);
  }

  /**
   * Batch render multiple fragments with optional variable maps.
   *
   * @param ids Fragment IDs to render
   * @param variablesMap Optional map of fragment ID to variable values
   * @returns Array of rendered content strings (empty strings for missing fragments)
   */
  renderAll(ids: string[], variablesMap?: Map<string, Record<string, unknown>>): string[] {
    return ids.map(id => {
      const vars = variablesMap?.get(id);
      return this.render(id, vars) ?? "";
    });
  }

  /**
   * Unregister a fragment.
   *
   * @param key Fragment ID
   * @param options Unregister options
   * @returns Whether the fragment was removed
   */
  unregister(key: string, options?: { force?: boolean }): boolean {
    const affectedDependents = this.getDependents(key);
    if (affectedDependents.length > 0 && !options?.force) {
      logger.warn(
        `Fragment '${key}' has dependents: ${affectedDependents.join(", ")}. Use force to unregister.`,
      );
      return false;
    }

    if (affectedDependents.length > 0) {
      logger.warn(
        `Fragment '${key}' unregistered. Affected dependents: ${affectedDependents.join(", ")}`,
      );
    }

    this.dependents.delete(key);
    return this.items.delete(key);
  }

  /**
   * Record that a template references a fragment.
   *
   * @param fragmentId The fragment ID being referenced
   * @param templateId The template ID that references the fragment
   */
  addDependent(fragmentId: string, templateId: string): void {
    if (!this.dependents.has(fragmentId)) {
      this.dependents.set(fragmentId, new Set());
    }
    this.dependents.get(fragmentId)!.add(templateId);
  }

  /**
   * Get all template IDs that reference a given fragment.
   *
   * @param fragmentId The fragment ID
   * @returns Array of template IDs
   */
  getDependents(fragmentId: string): string[] {
    return Array.from(this.dependents.get(fragmentId) ?? []);
  }

  /**
   * Clear all fragments and dependency tracking.
   */
  clear(): void {
    this.items.clear();
    this.dependents.clear();
  }
}
