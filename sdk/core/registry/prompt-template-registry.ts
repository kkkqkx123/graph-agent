/**
 * PromptTemplateRegistry - Prompt Template Registry
 *
 * Provides unified template management and rendering capabilities.
 * Supports template registration, retrieval, and rendering.
 *
 * This module only exports class definitions; instances are managed by the DI container as singletons.
 */

import type { PromptTemplate } from "@wf-agent/types";
import { renderTemplate } from "../utils/template-renderer/index.js";
import { createContextualLogger } from "../../utils/contextual-logger.js";
import type { FragmentRegistry } from "./fragment-registry.js";
import { createRegistry } from "./utils/registry-utils.js";

const logger = createContextualLogger({ component: "PromptTemplateRegistry" });

/**
 * Prompt Template Registry Class
 *
 * Manages prompt templates with:
 * - Cross-registry validation with FragmentRegistry
 * - Template rendering with variable substitution
 * - Category-based querying
 */
export class PromptTemplateRegistry {
  private items = createRegistry<PromptTemplate>();
  private fragmentRegistry: FragmentRegistry | null = null;
  private initialized = false;

  /**
   * Set the fragment registry for cross-registry reference validation.
   *
   * When set, registering a template with a `fragments` field will validate
   * that all referenced fragment IDs exist in the fragment registry.
   *
   * @param registry The FragmentRegistry instance
   */
  setFragmentRegistry(registry: FragmentRegistry): void {
    this.fragmentRegistry = registry;
  }

  /**
   * Check if it has been initialized.
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Mark as initialized.
   */
  markInitialized(): void {
    this.initialized = true;
  }

  /**
   * Register a prompt template.
   *
   * @param key Unique template ID
   * @param template The template definition
   * @param options Registration options
   * @throws Error if template already exists and skipIfExists is not set
   */
  register(key: string, template: PromptTemplate, options?: { skipIfExists?: boolean }): void {
    // Check for existing template
    if (this.items.has(key)) {
      if (options?.skipIfExists) {
        return;
      }
      throw new Error(`Template with id '${key}' already exists`);
    }

    // Validate cross-registry references: if template references fragments,
    // check they exist in the fragment registry (if one is configured).
    if (template.fragments && template.fragments.length > 0 && this.fragmentRegistry) {
      for (const fragmentId of template.fragments) {
        if (!this.fragmentRegistry.has(fragmentId)) {
          logger.warn(
            `Template '${key}' references fragment '${fragmentId}' ` +
              `which is not registered in FragmentRegistry`,
          );
        } else {
          // Record the dependency so fragment deletion can notify affected templates
          this.fragmentRegistry.addDependent(fragmentId, key);
        }
      }
    }

    this.items.set(key, template);
  }

  /**
   * Batch registration template
   * @param templates Array of templates
   */
  registerAll(templates: PromptTemplate[]): void {
    for (const template of templates) {
      this.register(template.id, template);
    }
  }

  /**
   * Get a template by ID.
   *
   * @param key Template ID
   * @returns The template or undefined if not found
   */
  get(key: string): PromptTemplate | undefined {
    return this.items.get(key);
  }

  /**
   * Check if a template exists.
   *
   * @param key Template ID
   * @returns Whether the template exists
   */
  has(key: string): boolean {
    return this.items.has(key);
  }

  /**
   * Get all templates.
   *
   * @returns Array of all templates
   */
  list(): PromptTemplate[] {
    return this.items.list();
  }

  /**
   * Get all template IDs.
   *
   * @returns Array of all template IDs
   */
  keys(): string[] {
    return this.items.keys();
  }

  /**
   * Get the number of registered templates.
   */
  get size(): number {
    return this.items.size;
  }

  /**
   * Get templates of the specified category
   * @param category Template category
   */
  getByCategory(category: string): PromptTemplate[] {
    return this.list().filter(t => t.category === category);
  }

  /**
   * Render template
   * @param id: Template ID
   * @param variables: Template variables
   * @returns: The rendered string; returns null if the template does not exist
   */
  render(id: string, variables: Record<string, unknown>): string | null {
    const template = this.get(id);
    if (!template) {
      return null;
    }
    return renderTemplate(template.content, variables);
  }

  /**
   * Securely render a template (with default values)
   * @param id The template ID
   * @param variables The template variables
   * @param defaultValue The default value when the template does not exist
   * @returns The rendered string or the default value
   */
  renderSafe(id: string, variables: Record<string, unknown>, defaultValue: string = ""): string {
    const result = this.render(id, variables);
    return result ?? defaultValue;
  }

  /**
   * Clear all templates.
   */
  /**
   * Unregister a template by ID.
   *
   * @param key Template ID to remove
   * @returns Whether the template was removed
   */
  unregister(key: string): boolean {
    const removed = this.items.delete(key);
    if (removed) {
      logger.debug("Template unregistered", { templateId: key });
    }
    return removed;
  }

  /**
   * Get all registered template IDs.
   *
   * @returns Array of all template IDs
   */
  getTemplateIds(): string[] {
    return this.items.keys();
  }

  /**
   * Clear all templates.
   */
  clear(): void {
    this.items.clear();
    this.initialized = false;
    this.fragmentRegistry = null;
  }
}
