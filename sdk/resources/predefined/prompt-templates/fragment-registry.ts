import type { SystemPromptFragment } from "@wf-agent/types";
import { renderTemplate } from "../../../core/utils/template-renderer/index.js";
import { createContextualLogger } from "../../../utils/contextual-logger.js";

const logger = createContextualLogger({ component: "FragmentRegistry" });

export interface UnregisterResult {
  removed: boolean;
  affectedDependents: string[];
}

export class FragmentRegistry {
  private fragments = new Map<string, SystemPromptFragment>();
  /** Tracks which templates reference each fragment (fragmentId → Set<templateId>) */
  private dependents = new Map<string, Set<string>>();

  /**
   * Register a single fragment with validation.
   *
   * Validates:
   * - Fragment ID is non-empty
   * - Fragment content is non-empty
   * - Required variables are used in content (warning only)
   *
   * @param fragment Fragment definition
   * @throws {Error} If validation fails
   */
  register(fragment: SystemPromptFragment): void {
    if (!fragment.id || typeof fragment.id !== "string") {
      throw new Error("Fragment ID is required and must be a non-empty string");
    }

    if (!fragment.content || typeof fragment.content !== "string") {
      throw new Error(`Fragment '${fragment.id}' content is required and must be a non-empty string`);
    }

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

    if (this.fragments.has(fragment.id)) {
      logger.warn(`Fragment '${fragment.id}' already exists, will be overwritten`);
    }

    this.fragments.set(fragment.id, fragment);
  }

  /**
   * Batch register multiple fragments.
   *
   * @param fragments Array of fragment definitions
   */
  registerAll(fragments: SystemPromptFragment[]): void {
    for (const fragment of fragments) {
      this.register(fragment);
    }
  }

  get(id: string): SystemPromptFragment | undefined {
    return this.fragments.get(id);
  }

  has(id: string): boolean {
    return this.fragments.has(id);
  }

  getAll(): SystemPromptFragment[] {
    return Array.from(this.fragments.values());
  }

  getByCategory(category: SystemPromptFragment["category"]): SystemPromptFragment[] {
    return this.getAll().filter(f => f.category === category);
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
   * Remove a fragment from the registry.
   *
   * Returns information about the removal and any affected dependents.
   * Does NOT perform cascading deletion — callers should inspect the result
   * and decide how to handle affected dependents.
   *
   * @param id Fragment ID to remove
   * @returns Result with removal status and affected dependents
   */
  unregister(id: string): UnregisterResult {
    const affectedDependents = this.getDependents(id);
    const removed = this.fragments.delete(id);
    this.dependents.delete(id);
    return { removed, affectedDependents };
  }

  clear(): void {
    this.fragments.clear();
    this.dependents.clear();
  }
}
