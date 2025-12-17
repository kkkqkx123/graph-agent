/**
 * 提示词加载器接口
 */

export interface IPromptLoader {
  /**
   * 加载指定类别和名称的提示词内容
   */
  loadPrompt(category: string, name: string): Promise<string>;

  /**
   * 加载指定类别的所有提示词
   */
  loadPrompts(category: string): Promise<Record<string, string>>;

  /**
   * 列出提示词
   * @param category 可选类别，如果提供则列出该类别下的提示词，否则列出所有提示词
   */
  listPrompts(category?: string): Promise<string[]>;

  /**
   * 检查提示词是否存在
   */
  exists(category: string, name: string): Promise<boolean>;
}