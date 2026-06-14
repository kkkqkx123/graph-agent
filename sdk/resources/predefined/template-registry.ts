/**
 * PromptTemplateRegistry - Prompt Template Registry
 *
 * Provides unified template management and rendering capabilities
 * Supports template registration, retrieval, and rendering
 *
 * Design Principles:
 * - Singleton pattern: A globally unique instance of the registry
 * - Lazy initialization: Predefined templates are loaded only the first time they are used
 * - Type safety: Full TypeScript type support
 */

import type { PromptTemplate } from "@wf-agent/types";
import { renderTemplate } from "../../core/utils/template-renderer/index.js";
import { createContextualLogger } from "../../utils/contextual-logger.js";
import type { FragmentRegistry } from "./prompt-templates/fragment-registry.js";

const logger = createContextualLogger({ component: "PromptTemplateRegistry" });

/**
 * Template Registry Class
 */
export class PromptTemplateRegistry {
  private static instance: PromptTemplateRegistry | null = null;
  private templates = new Map<string, PromptTemplate>();
  private initialized = false;
  private fragmentRegistry: FragmentRegistry | null = null;

  /**
   * Obtain a registry instance (singleton).
   */
  static getInstance(): PromptTemplateRegistry {
    if (!PromptTemplateRegistry.instance) {
      PromptTemplateRegistry.instance = new PromptTemplateRegistry();
    }
    return PromptTemplateRegistry.instance;
  }

  /**
   * Resetting the registry instance (mainly for testing purposes)
   */
  static resetInstance(): void {
    PromptTemplateRegistry.instance = null;
  }

  /**
   * Private constructor
   */
  private constructor() {}

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
   * Register a single template
   * @param template Template definition
   */
  register(template: PromptTemplate): void {
    if (this.templates.has(template.id)) {
      logger.warn(`Template with id '${template.id}' already exists, will be overwritten`);
    }

    // Validate cross-registry references: if template references fragments,
    // check they exist in the fragment registry (if one is configured).
    if (template.fragments && template.fragments.length > 0 && this.fragmentRegistry) {
      for (const fragmentId of template.fragments) {
        if (!this.fragmentRegistry.has(fragmentId)) {
          logger.warn(
            `Template '${template.id}' references fragment '${fragmentId}' ` +
            `which is not registered in FragmentRegistry`,
          );
        } else {
          // Record the dependency so fragment deletion can notify affected templates
          this.fragmentRegistry.addDependent(fragmentId, template.id);
        }
      }
    }

    this.templates.set(template.id, template);
  }

  /**
   * Batch registration template
   * @param templates Array of templates
   */
  registerAll(templates: PromptTemplate[]): void {
    for (const template of templates) {
      this.register(template);
    }
  }

  /**
   * Get the template
   * @param id: Template ID
   * @returns: Template definition; returns undefined if not found
   */
  get(id: string): PromptTemplate | undefined {
    return this.templates.get(id);
  }

  /**
   * Check if the template exists
   * @param id Template ID
   */
  has(id: string): boolean {
    return this.templates.has(id);
  }

  /**
   * Get all registered templates
   */
  getAll(): PromptTemplate[] {
    return Array.from(this.templates.values());
  }

  /**
   * Get templates of the specified category
   * @param category Template category
   */
  getByCategory(category: string): PromptTemplate[] {
    return this.getAll().filter(t => t.category === category);
  }

  /**
   * Remove the template
   * @param id Template ID
   */
  unregister(id: string): boolean {
    return this.templates.delete(id);
  }

  /**
   * Clear all templates.
   */
  clear(): void {
    this.templates.clear();
    this.initialized = false;
    this.fragmentRegistry = null;
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
   * Get all template IDs
   */
  getTemplateIds(): string[] {
    return Array.from(this.templates.keys());
  }

  /**
   * Get the number of templates
   */
  get size(): number {
    return this.templates.size;
  }
}

/**
 * Global Registry Instance
 */
export const templateRegistry = PromptTemplateRegistry.getInstance();

/**
 * Quick registration template
 * @param template Template definition
 */
export function registerTemplate(template: PromptTemplate): void {
  templateRegistry.register(template);
}

/**
 * Quick batch registration template
 * @param templates Array of templates
 */
export function registerTemplates(templates: PromptTemplate[]): void {
  templateRegistry.registerAll(templates);
}

/**
 * Quickly retrieve a template
 * @param id Template ID
 */
export function getTemplate(id: string): PromptTemplate | undefined {
  return templateRegistry.get(id);
}

/**
 * Quick template rendering
 * @param id Template ID
 * @param variables Template variables
 */
export function renderTemplateById(id: string, variables: Record<string, unknown>): string | null {
  return templateRegistry.render(id, variables);
}
