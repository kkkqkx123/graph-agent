import { injectable, inject } from 'inversify';
import { Tool } from '../../../domain/tools/entities/tool';
import { ToolType } from '../../../domain/tools/value-objects/tool-type';
import { ToolStatus } from '../../../domain/tools/value-objects/tool-status';
import { ToolAdapter } from '../adapters/tool-adapter';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';

@injectable()
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private toolCategories: Map<string, string[]> = new Map();

  constructor(
    @inject('ToolAdapter') private toolAdapter: ToolAdapter
  ) {}

  registerTool(tool: Tool): void {
    // Adapt tool configuration
    const adaptedConfig = this.toolAdapter.adaptToolConfig(tool.config);
    const adaptedTool = new Tool(
      tool.id,
      tool.name,
      tool.description,
      tool.type,
      tool.status,
      adaptedConfig,
      tool.parameters,
      tool.returns,
      tool.metadata,
      tool.createdAt,
      tool.updatedAt,
      tool.createdBy,
      tool.version,
      tool.tags,
      tool.category,
      tool.isBuiltin,
      tool.isEnabled,
      tool.timeout,
      tool.maxRetries,
      tool.permissions,
      tool.dependencies
    );

    // Validate tool configuration
    const validation = this.toolAdapter.validateToolConfiguration(adaptedConfig);
    if (!validation.valid) {
      throw new Error(`Invalid tool configuration: ${validation.errors.join(', ')}`);
    }

    // Register the tool
    this.tools.set(tool.id.value, adaptedTool);

    // Add to category if specified
    const category = adaptedTool.metadata?.['category'] as string || 'default';
    if (!this.toolCategories.has(category)) {
      this.toolCategories.set(category, []);
    }
    
    const categoryTools = this.toolCategories.get(category)!;
    if (!categoryTools.includes(tool.id.value)) {
      categoryTools.push(tool.id.value);
    }
  }

  unregisterTool(toolId: Tool): void {
    const tool = this.tools.get(toolId.id.value);
    if (!tool) {
      return;
    }

    // Remove from tools map
    this.tools.delete(toolId.id.value);

    // Remove from category
    const category = tool.metadata?.['category'] as string || 'default';
    const categoryTools = this.toolCategories.get(category);
    if (categoryTools) {
      const index = categoryTools.indexOf(toolId.id.value);
      if (index > -1) {
        categoryTools.splice(index, 1);
      }
      
      // Remove category if empty
      if (categoryTools.length === 0) {
        this.toolCategories.delete(category);
      }
    }
  }

  getTool(toolId: Tool): Tool | null {
    return this.tools.get(toolId.id.value) || null;
  }

  getToolByName(name: string): Tool | null {
    for (const tool of this.tools.values()) {
      if (tool.name === name) {
        return tool;
      }
    }
    return null;
  }

  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  getToolsByCategory(category: string): Tool[] {
    const toolIds = this.toolCategories.get(category) || [];
    return toolIds.map(id => this.tools.get(id)!).filter(Boolean);
  }

  getCategories(): string[] {
    return Array.from(this.toolCategories.keys());
  }

  searchTools(query: string): Tool[] {
    const lowerQuery = query.toLowerCase();
    const results: Tool[] = [];

    for (const tool of this.tools.values()) {
      if (
        tool.name.toLowerCase().includes(lowerQuery) ||
        tool.description.toLowerCase().includes(lowerQuery) ||
        (tool.metadata?.['tags'] && Array.isArray(tool.metadata['tags']) && (tool.metadata['tags'] as string[]).some((tag: string) => 
          tag.toLowerCase().includes(lowerQuery)
        ))
      ) {
        results.push(tool);
      }
    }

    return results;
  }

  getToolsByType(type: string): Tool[] {
    return Array.from(this.tools.values()).filter(tool => tool.config['type'] === type);
  }

  validateTool(toolId: Tool): { valid: boolean; errors: string[] } {
    const tool = this.tools.get(toolId.id.value);
    if (!tool) {
      return {
        valid: false,
        errors: [`Tool with ID '${toolId.id.value}' not found`]
      };
    }

    return this.toolAdapter.validateToolConfiguration(tool.config);
  }

  updateTool(toolId: Tool, updates: Partial<Tool>): void {
    const existingTool = this.tools.get(toolId.id.value);
    if (!existingTool) {
      throw new Error(`Tool with ID '${toolId.id.value}' not found`);
    }

    // Create updated tool
    const updatedConfig = { ...existingTool.config, ...updates.config };
    const updatedTool = new Tool(
      existingTool.id,
      updates.name || existingTool.name,
      updates.description || existingTool.description,
      updates.type || existingTool.type,
      updates.status || existingTool.status,
      updatedConfig,
      updates.parameters || existingTool.parameters,
      updates.returns || existingTool.returns,
      { ...existingTool.metadata, ...updates.metadata },
      existingTool.createdAt,
      Timestamp.now(),
      existingTool.createdBy,
      updates.version || existingTool.version,
      updates.tags || existingTool.tags,
      updates.category || existingTool.category,
      updates.isBuiltin !== undefined ? updates.isBuiltin : existingTool.isBuiltin,
      updates.isEnabled !== undefined ? updates.isEnabled : existingTool.isEnabled,
      updates.timeout !== undefined ? updates.timeout : existingTool.timeout,
      updates.maxRetries !== undefined ? updates.maxRetries : existingTool.maxRetries,
      updates.permissions || existingTool.permissions,
      updates.dependencies || existingTool.dependencies
    );

    // Validate updated configuration
    const validation = this.toolAdapter.validateToolConfiguration(updatedConfig);
    if (!validation.valid) {
      throw new Error(`Invalid tool configuration: ${validation.errors.join(', ')}`);
    }

    // Update the tool
    this.tools.set(toolId.id.value, updatedTool);

    // Update category if changed
    const oldCategory = existingTool.metadata?.['category'] as string || 'default';
    const newCategory = updatedTool.metadata?.['category'] as string || 'default';

    if (oldCategory !== newCategory) {
      // Remove from old category
      const oldCategoryTools = this.toolCategories.get(oldCategory);
      if (oldCategoryTools) {
        const index = oldCategoryTools.indexOf(toolId.id.value);
        if (index > -1) {
          oldCategoryTools.splice(index, 1);
        }
        
        if (oldCategoryTools.length === 0) {
          this.toolCategories.delete(oldCategory);
        }
      }

      // Add to new category
      if (!this.toolCategories.has(newCategory)) {
        this.toolCategories.set(newCategory, []);
      }
      
      const newCategoryTools = this.toolCategories.get(newCategory)!;
      if (!newCategoryTools.includes(toolId.id.value)) {
        newCategoryTools.push(toolId.id.value);
      }
    }
  }

  clear(): void {
    this.tools.clear();
    this.toolCategories.clear();
  }

  getStats(): {
    totalTools: number;
    categoriesCount: number;
    toolsByType: Record<string, number>;
    toolsByCategory: Record<string, number>;
  } {
    const toolsByType: Record<string, number> = {};
    const toolsByCategory: Record<string, number> = {};

    // Count tools by type
    for (const tool of this.tools.values()) {
      const type = tool.config['type'] as string;
      toolsByType[type] = (toolsByType[type] || 0) + 1;
    }

    // Count tools by category
    for (const [category, toolIds] of this.toolCategories.entries()) {
      toolsByCategory[category] = toolIds.length;
    }

    return {
      totalTools: this.tools.size,
      categoriesCount: this.toolCategories.size,
      toolsByType,
      toolsByCategory
    };
  }
}