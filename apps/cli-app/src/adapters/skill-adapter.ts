/**
 * Skill 适配器
 * 封装 Skill 相关的 SDK API 调用
 *
 * 实现渐进式披露（Progressive Disclosure）：
 * - Level 1: generateMetadataPrompt() - 元数据提示
 * - Level 2: loadContent() - 按需加载内容
 * - Level 3: loadResources() - 加载嵌套资源
 */

import { BaseAdapter } from './base-adapter.js';
import type {
  SkillMetadata,
  SkillMatchResult,
  SkillResourceType
} from '@modular-agent/types';

/**
 * Skill 适配器
 */
export class SkillAdapter extends BaseAdapter {
  /**
   * 初始化 Skill 注册表
   * 扫描配置的 Skill 目录
   *
   * @param skillsDir Skill 目录路径
   */
  async initialize(skillsDir: string): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      // 获取 SkillRegistry 并重新配置路径
      const skillRegistry = this.sdk.skills['dependencies'].getSkillRegistry();

      // 重新扫描指定目录
      await skillRegistry.scanSkills(skillsDir);

      const skills = await this.listSkills();
      this.logger.success(`已加载 ${skills.length} 个 Skill`);
    }, '初始化 Skill');
  }

  /**
   * 列出所有 Skill
   * @param filter 过滤条件
   * @returns Skill 元数据数组
   */
  async listSkills(filter?: {
    name?: string;
    tags?: string[];
    version?: string;
  }): Promise<SkillMetadata[]> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.skills;
      const result = await api.getAll(filter);
      return (result as any).data || result;
    }, '列出 Skill');
  }

  /**
   * 获取 Skill 详情
   * @param name Skill 名称
   * @returns Skill 元数据
   */
  async getSkill(name: string): Promise<SkillMetadata | null> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.skills;
      const result = await api.get(name);
      return (result as any).data || result;
    }, '获取 Skill');
  }

  /**
   * 加载 Skill 完整内容（Progressive Disclosure Level 2）
   * @param name Skill 名称
   * @returns Skill 内容
   */
  async loadContent(name: string): Promise<string> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.skills;
      const result = await api.loadContent(name);

      if ((result as any).error) {
        throw new Error((result as any).error.message);
      }

      this.logger.success(`已加载 Skill 内容: ${name}`);
      return (result as any).data || result;
    }, '加载 Skill 内容');
  }

  /**
   * 加载 Skill 资源（Progressive Disclosure Level 3）
   * @param name Skill 名称
   * @param resourceType 资源类型
   * @returns 资源映射
   */
  async loadResources(
    name: string,
    resourceType: SkillResourceType
  ): Promise<Map<string, string | Buffer>> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.skills;
      const result = await api.loadResources(name, resourceType);

      if ((result as any).error) {
        throw new Error((result as any).error.message);
      }

      this.logger.success(`已加载 Skill 资源: ${name}/${resourceType}`);
      return (result as any).data || result;
    }, '加载 Skill 资源');
  }

  /**
   * 将 Skill 转换为提示词格式
   * @param name Skill 名称
   * @returns 提示词字符串
   */
  async toPrompt(name: string): Promise<string> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.skills;
      const result = await api.toPrompt(name);

      if ((result as any).error) {
        throw new Error((result as any).error.message);
      }

      return (result as any).data || result;
    }, '转换 Skill 为提示词');
  }

  /**
   * 生成 Skill 元数据提示（Progressive Disclosure Level 1）
   * 用于注入到系统提示中
   *
   * @returns 元数据提示字符串
   */
  generateMetadataPrompt(): string {
    const api = this.sdk.skills;
    return api.generateMetadataPrompt();
  }

  /**
   * 根据描述匹配 Skill
   * @param query 查询字符串
   * @returns 匹配结果
   */
  async matchSkills(query: string): Promise<SkillMatchResult[]> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.skills;
      const result = await api.matchSkills(query);
      return (result as any).data || result;
    }, '匹配 Skill');
  }

  /**
   * 列出 Skill 的所有资源
   * @param name Skill 名称
   * @param resourceType 资源类型
   * @returns 资源路径数组
   */
  async listResources(
    name: string,
    resourceType: SkillResourceType
  ): Promise<string[]> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.skills;
      const result = await api.listResources(name, resourceType);
      return (result as any).data || result;
    }, '列出 Skill 资源');
  }

  /**
   * 重新加载所有 Skill
   */
  async reload(): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.skills;
      await api.reload();
      this.logger.success('已重新加载所有 Skill');
    }, '重新加载 Skill');
  }

  /**
   * 清除缓存
   * @param name 可选，指定要清除的 Skill 名称
   */
  clearCache(name?: string): void {
    const api = this.sdk.skills;
    api.clearCache(name);
    this.logger.success(name ? `已清除 Skill 缓存: ${name}` : '已清除所有 Skill 缓存');
  }

  /**
   * 获取完整的 Skill 对象
   * @param name Skill 名称
   * @returns Skill 对象
   */
  async getFullSkill(name: string): Promise<any> {
    return this.executeWithErrorHandling(async () => {
      const api = this.sdk.skills;
      return await api.getFullSkill(name);
    }, '获取完整 Skill');
  }

  /**
   * 注册 GetSkill 工具到 ToolService
   * 使 Agent 可以通过工具按需加载 Skill
   */
  async registerGetSkillTool(): Promise<void> {
    return this.executeWithErrorHandling(async () => {
      const dependencies = this.sdk.skills['dependencies'];
      const skillLoader = dependencies.getSkillLoader();
      const toolService = dependencies.getToolService();

      // 动态导入工具创建函数
      const { createGetSkillTool, createGetSkillExecutor } = await import(
        '@modular-agent/sdk'
      );

      // 创建工具和执行器
      const tool = createGetSkillTool(skillLoader);
      const executor = createGetSkillExecutor(skillLoader);

      // 注册工具
      toolService.registerTool(tool, executor);

      this.logger.success('已注册 get_skill 工具');
    }, '注册 GetSkill 工具');
  }

  /**
   * 将 Skill 元数据注入到系统提示
   * 替换 {SKILLS_METADATA} 占位符
   *
   * @param systemPrompt 原始系统提示
   * @returns 注入后的系统提示
   */
  injectSkillsMetadata(systemPrompt: string): string {
    const metadataPrompt = this.generateMetadataPrompt();

    if (metadataPrompt) {
      const result = systemPrompt.replace('{SKILLS_METADATA}', metadataPrompt);
      this.logger.success('已注入 Skill 元数据到系统提示');
      return result;
    }

    // 没有 Skill，移除占位符
    return systemPrompt.replace('{SKILLS_METADATA}', '');
  }
}
