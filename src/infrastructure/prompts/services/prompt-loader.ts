/**
 * 提示词加载器
 */

import { IConfigManager, ILogger } from '../../../domain/common/types';

export class PromptLoader {
  constructor(
    private readonly configManager: IConfigManager,
    private readonly logger: ILogger
  ) {}

  async loadPrompt(category: string, name: string): Promise<string> {
    const content = this.configManager.get(`prompts.${category}.${name}`);
    if (typeof content !== 'string') {
      throw new Error(`提示词 ${category}.${name} 不存在或内容不是字符串`);
    }
    this.logger.debug('加载提示词', { category, name });
    return content;
  }

  async loadPrompts(category: string): Promise<Record<string, string>> {
    const prompts = this.configManager.get(`prompts.${category}`);
    if (!prompts || typeof prompts !== 'object') {
      return {};
    }
    const result: Record<string, string> = {};
    for (const [name, content] of Object.entries(prompts)) {
      if (typeof content === 'string') {
        result[name] = content;
      }
    }
    this.logger.debug('加载类别提示词', { category, count: Object.keys(result).length });
    return result;
  }

  async listPrompts(category?: string): Promise<string[]> {
    if (category) {
      const prompts = this.configManager.get(`prompts.${category}`);
      if (!prompts || typeof prompts !== 'object') {
        return [];
      }
      return Object.keys(prompts ?? {});
    } else {
      const prompts = this.configManager.get('prompts');
      if (!prompts || typeof prompts !== 'object') {
        return [];
      }
      const allNames: string[] = [];
      for (const [cat, catPrompts] of Object.entries(prompts ?? {})) {
        if (typeof catPrompts === 'object') {
          for (const name of Object.keys(catPrompts ?? {})) {
            allNames.push(`${cat}.${name}`);
          }
        }
      }
      return allNames;
    }
  }

  async exists(category: string, name: string): Promise<boolean> {
    const content = this.configManager.get(`prompts.${category}.${name}`);
    return typeof content === 'string';
  }
}