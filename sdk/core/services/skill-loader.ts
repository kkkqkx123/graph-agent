/**
 * Skill 加载器
 *
 * 负责 Skill 的加载、权限验证和资源访问控制。
 * Skill 是静态资源集合（提示词 + 参考脚本 + 资源文件），
 * 应该被"加载"而不是"执行"。
 */

import type {
  Skill,
  SkillLoadContext,
  SkillLoadResult,
  SkillResourceType,
  SkillLoadType
} from '@modular-agent/types';
import type { SkillRegistry } from './skill-registry.js';
import type { EventManager } from './event-manager.js';
import { buildSkillLoadStartedEvent, buildSkillLoadCompletedEvent, buildSkillLoadFailedEvent } from '../utils/event/builders/index.js';

/**
 * Skill 加载器类
 *
 * 实现三层渐进式披露（Progressive Disclosure）：
 * - Level 1: 只展示元数据（generateMetadataPrompt）
 * - Level 2: 按需加载完整内容（loadContent）
 * - Level 3: 加载嵌套资源（loadResources）
 */
export class SkillLoader {
  /** 内容缓存 */
  private contentCache: Map<string, { content: string; timestamp: number }> = new Map();

  /** 缓存过期时间（毫秒） */
  private readonly cacheTTL: number;

  constructor(
    private skillRegistry: SkillRegistry,
    private eventManager: EventManager,
    cacheTTL: number = 300000 // 默认 5 分钟
  ) {
    this.cacheTTL = cacheTTL;
  }

  /**
   * 生成 Skill 元数据提示
   *
   * Progressive Disclosure Level 1:
   * 只展示 Skill 的元数据，不加载完整内容。
   * 用于注入到系统提示中，让 Agent 知道有哪些 Skill 可用。
   *
   * @returns 元数据提示字符串
   */
  generateMetadataPrompt(): string {
    const skills = this.skillRegistry.getAllSkills();

    if (skills.length === 0) {
      return '';
    }

    const skillList = skills.map(skill => {
      const meta = skill.metadata;
      if (!meta) return '';
      let desc = `- \`${meta['name']}\`: ${meta['description']}`;
      if (meta['version']) {
        desc += ` (v${meta['version']})`;
      }
      return desc;
    }).filter(Boolean).join('\n');

    return `## Available Skills

The following skills are available for use. Use the \`get_skill\` tool to load the complete content of a skill when needed.

${skillList}

To use a skill, call the \`get_skill\` tool with the skill name.`;
  }

  /**
   * 加载 Skill 内容
   *
   * Progressive Disclosure Level 2:
   * 按需加载 Skill 的完整内容（SKILL.md）。
   *
   * @param skillName Skill 名称
   * @param context 加载上下文
   * @returns 加载结果
   */
  async loadContent(
    skillName: string,
    context?: Partial<SkillLoadContext>
  ): Promise<SkillLoadResult> {
    const startTime = Date.now();
    const loadType: SkillLoadType = 'content';

    try {
      // 检查缓存
      const cached = this.getFromCache(skillName);
      if (cached) {
        // 发送 Skill 加载完成事件（来自缓存）
        await this.emitLoadCompleted(skillName, loadType, true, startTime);

        return {
          success: true,
          content: cached.content,
          cached: true,
          loadTime: Date.now() - startTime
        };
      }

      // 获取 Skill
      const skill = this.skillRegistry.getSkill(skillName);
      if (!skill) {
        return {
          success: false,
          error: new Error(`Skill '${skillName}' not found`),
          loadTime: Date.now() - startTime
        };
      }

      // 验证权限
      if (context?.tools && skill.metadata.allowedTools) {
        const hasPermission = this.validatePermissions(skill, context.tools);
        if (!hasPermission) {
          return {
            success: false,
            error: new Error(
              `Skill '${skillName}' requires tools that are not allowed: ` +
              skill.metadata.allowedTools.filter(t => !context.tools!.includes(t)).join(', ')
            ),
            loadTime: Date.now() - startTime
          };
        }
      }

      // 发送 Skill 加载开始事件
      await this.emitLoadStarted(skillName, loadType, context);

      // 加载 Skill 内容
      const content = await this.skillRegistry.loadSkillContent(skillName);

      // 存入缓存
      this.setCache(skillName, content);

      // 发送 Skill 加载完成事件
      await this.emitLoadCompleted(skillName, loadType, false, startTime);

      return {
        success: true,
        content,
        cached: false,
        loadTime: Date.now() - startTime
      };
    } catch (error) {
      // 发送 Skill 加载失败事件
      await this.emitLoadFailed(skillName, loadType, error, startTime);

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        loadTime: Date.now() - startTime
      };
    }
  }

  /**
   * 加载 Skill 资源
   *
   * Progressive Disclosure Level 3:
   * 加载 Skill 的嵌套资源（references, examples, scripts, assets）。
   *
   * @param skillName Skill 名称
   * @param resourceType 资源类型
   * @param context 加载上下文
   * @returns 资源内容映射
   */
  async loadResources(
    skillName: string,
    resourceType: SkillResourceType,
    context?: Partial<SkillLoadContext>
  ): Promise<Map<string, string | Buffer>> {
    const startTime = Date.now();
    const loadType: SkillLoadType = 'resources';

    try {
      // 发送 Skill 加载开始事件
      await this.emitLoadStarted(skillName, loadType, context);

      const resources = new Map<string, string | Buffer>();
      const resourcePaths = await this.skillRegistry.listSkillResources(skillName, resourceType);

      for (const resourcePath of resourcePaths) {
        const content = await this.skillRegistry.loadSkillResource(
          skillName,
          resourceType,
          resourcePath
        );
        resources.set(resourcePath, content);
      }

      // 发送 Skill 加载完成事件
      await this.emitLoadCompleted(skillName, loadType, false, startTime);

      return resources;
    } catch (error) {
      // 发送 Skill 加载失败事件
      await this.emitLoadFailed(skillName, loadType, error, startTime);
      throw error;
    }
  }

  /**
   * 验证 Skill 权限
   * @param skill Skill 定义
   * @param availableTools 可用的工具列表
   * @returns 是否有权限
   */
  validatePermissions(skill: Skill, availableTools: string[]): boolean {
    if (!skill.metadata.allowedTools || skill.metadata.allowedTools.length === 0) {
      return true;
    }

    // 检查所有需要的工具是否都在可用工具列表中
    return skill.metadata.allowedTools.every(tool => availableTools.includes(tool));
  }

  /**
   * 构建 Skill 加载上下文
   * @param skill Skill 定义
   * @param agentContext Agent 上下文
   * @returns 完整的加载上下文
   */
  buildContext(
    skill: Skill,
    agentContext?: any
  ): SkillLoadContext {
    return {
      skill,
      agentContext,
      variables: {},
      tools: skill.metadata.allowedTools || []
    };
  }

  /**
   * 将 Skill 转换为提示词格式
   *
   * @param skillName Skill 名称
   * @returns 提示词字符串
   */
  async toPrompt(skillName: string): Promise<string> {
    const result = await this.loadContent(skillName);
    if (!result.success || !result.content) {
      throw result.error || new Error(`Failed to load skill: ${skillName}`);
    }

    const skill = this.skillRegistry.getSkill(skillName);
    if (!skill) {
      throw new Error(`Skill not found: ${skillName}`);
    }

    // 构建提示词
    let prompt = `# Skill: ${skill.metadata.name}\n\n`;
    prompt += `**Description:** ${skill.metadata.description}\n\n`;

    if (skill.metadata.version) {
      prompt += `**Version:** ${skill.metadata.version}\n\n`;
    }

    prompt += `---\n\n`;
    prompt += result.content;

    return prompt;
  }

  /**
   * 清除缓存
   * @param skillName 可选，指定要清除的 Skill 名称，不指定则清除所有
   */
  clearCache(skillName?: string): void {
    if (skillName) {
      this.contentCache.delete(skillName);
    } else {
      this.contentCache.clear();
    }
  }

  // ============================================================
  // 私有方法
  // ============================================================

  /**
   * 从缓存获取内容
   */
  private getFromCache(skillName: string): { content: string; timestamp: number } | null {
    const cached = this.contentCache.get(skillName);
    if (!cached) {
      return null;
    }

    // 检查是否过期
    if (Date.now() - cached.timestamp > this.cacheTTL) {
      this.contentCache.delete(skillName);
      return null;
    }

    return cached;
  }

  /**
   * 设置缓存
   */
  private setCache(skillName: string, content: string): void {
    this.contentCache.set(skillName, {
      content,
      timestamp: Date.now()
    });
  }

  /**
   * 发送 Skill 加载开始事件
   */
  private async emitLoadStarted(
    skillName: string,
    loadType: SkillLoadType,
    context?: Partial<SkillLoadContext>
  ): Promise<void> {
    await this.eventManager.emit(buildSkillLoadStartedEvent({
      skillName,
      loadType,
      threadId: context?.agentContext?.threadId || 'skill-loader'
    }));
  }

  /**
   * 发送 Skill 加载完成事件
   */
  private async emitLoadCompleted(
    skillName: string,
    loadType: SkillLoadType,
    cached: boolean,
    startTime: number
  ): Promise<void> {
    await this.eventManager.emit(buildSkillLoadCompletedEvent({
      skillName,
      loadType,
      success: true,
      cached,
      loadTime: Date.now() - startTime,
      threadId: 'skill-loader'
    }));
  }

  /**
   * 发送 Skill 加载失败事件
   */
  private async emitLoadFailed(
    skillName: string,
    loadType: SkillLoadType,
    error: unknown,
    startTime: number
  ): Promise<void> {
    await this.eventManager.emit(buildSkillLoadFailedEvent({
      skillName,
      loadType,
      error: error instanceof Error ? error : new Error(String(error)),
      loadTime: Date.now() - startTime,
      threadId: 'skill-loader'
    }));
  }
}
