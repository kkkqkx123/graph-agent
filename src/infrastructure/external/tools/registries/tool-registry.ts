import { injectable, inject } from 'inversify';
import { Tool } from '../../../../domain/tools/entities/tool';
import { ToolId } from '../../../../domain/tools/value-objects/tool-id';
import { ToolAdapter } from '../adapters/tool-adapter';

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
      adaptedConfig,
      tool.metadata
    );

    // Validate tool configuration
    const validation = this.toolAdapter.validateToolConfiguration(adaptedConfig);
    if (!validation.valid) {
      throw new Error(`Invalid tool configuration: ${validation.errors.join(', ')}`);
    }

    // Register the tool
    this.tools.set(tool.id.value, adaptedTool);

    // Add to category if specified
    const category = adaptedTool.metadata?.category || 'default';
    if (!this.toolCategories.has(category)) {
      this.toolCategories.set(category, []);
    }
    
    const categoryTools = this.toolCategories.get(category)!;
    if (!categoryTools.includes(tool.id.value)) {
      categoryTools.push(tool.id.value);
    }
  }

  unregisterTool(toolId: ToolId): void {
    const tool = this.tools.get(toolId.value);
    if (!tool) {
      return;
    }

    // Remove from tools map
    this.tools.delete(toolId.value);

    // Remove from category
    const category = tool.metadata?.category || 'default';
    const categoryTools = this.toolCategories.get(category);
    if (categoryTools) {
      const index = categoryTools.indexOf(toolId.value);
      if (index > -1) {
        categoryTools.splice(index, 1);
      }
      
      // Remove category if empty
      if (categoryTools.length === 0) {
        this.toolCategories.delete(category);
      }
    }
  }

  getTool(toolId: ToolId): Tool | null {
    return this.tools.get(toolId.value) || null;
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
        (tool.metadata?.tags && tool.metadata.tags.some((tag: string) => 
          tag.toLowerCase().includes(lowerQuery)
        ))
      ) {
        results.push(tool);
      }
    }

    return results;
  }

  getToolsByType(type: string): Tool[] {
    return Array.from(this.tools.values()).filter(tool => tool.config.type === type);
  }

  validateTool(toolId: ToolId): { valid: boolean; errors: string[] } {
    const tool = this.tools.get(toolId.value);
    if (!tool) {
      return {
        valid: false,
        errors: [`Tool with ID '${toolId.value}' not found`]
      };
    }

    return this.toolAdapter.validateToolConfiguration(tool.config);
  }

  updateTool(toolId: ToolId, updates: Partial<Tool>): void {
    const existingTool = this.tools.get(toolId.value);
    if (!existingTool) {
      throw new Error(`Tool with ID '${toolId.value}' not found`);
    }

    // Create updated tool
    const updatedConfig = { ...existingTool.config, ...updates.config };
    const updatedTool = new Tool(
      existingTool.id,
      updates.name || existingTool.name,
      updates.description || existingTool.description,
      updatedConfig,
      { ...existingTool.metadata, ...updates.metadata }
    );

    // Validate updated configuration
    const validation = this.toolAdapter.validateToolConfiguration(updatedConfig);
    if (!validation.valid) {
      throw new Error(`Invalid tool configuration: ${validation.errors.join(', ')}`);
    }

    // Update the tool
    this.tools.set(toolId.value, updatedTool);

    // Update category if changed
    const oldCategory = existingTool.metadata?.category || 'default';
    const newCategory = updatedTool.metadata?.category || 'default';

    if (oldCategory !== newCategory) {
      // Remove from old category
      const oldCategoryTools = this.toolCategories.get(oldCategory);
      if (oldCategoryTools) {
        const index = oldCategoryTools.indexOf(toolId.value);
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
      if (!newCategoryTools.includes(toolId.value)) {
        newCategoryTools.push(toolId.value);
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
      const type = tool.config.type;
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