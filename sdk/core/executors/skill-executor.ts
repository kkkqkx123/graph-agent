/**
 * Skill 执行器
 *
 * 负责 Skill 的执行、权限验证和资源访问控制
 */

import type {
  Skill,
  SkillExecutionContext,
  SkillExecutionResult
} from '@modular-agent/types';
import type { SkillRegistry } from '../services/skill-registry.js';
import type { EventManager } from '../services/event-manager.js';

/**
 * Skill 执行器类
 */
export class SkillExecutor {
  constructor(
    private skillRegistry: SkillRegistry,
    private eventManager: EventManager
  ) {}

  /**
   * 执行 Skill
   * @param skillName Skill 名称
   * @param context 执行上下文
   * @returns 执行结果
   */
  async execute(
    skillName: string,
    context: Partial<SkillExecutionContext>
  ): Promise<SkillExecutionResult> {
    const startTime = Date.now();

    try {
      // 获取 Skill
      const skill = this.skillRegistry.getSkill(skillName);
      if (!skill) {
        return {
          success: false,
          error: new Error(`Skill '${skillName}' not found`),
          executionTime: Date.now() - startTime
        };
      }

      // 验证权限
      if (context.tools && skill.metadata.allowedTools) {
        const hasPermission = this.validatePermissions(skill, context.tools);
        if (!hasPermission) {
          return {
            success: false,
            error: new Error(
              `Skill '${skillName}' requires tools that are not allowed: ` +
              skill.metadata.allowedTools.filter(t => !context.tools!.includes(t)).join(', ')
            ),
            executionTime: Date.now() - startTime
          };
        }
      }

      // 构建完整的执行上下文
      const fullContext: SkillExecutionContext = {
        skill,
        agentContext: context.agentContext,
        variables: context.variables || {},
        tools: context.tools || []
      };

      // 发送 Skill 执行开始事件
      await this.eventManager.emit({
        type: 'skill:execution:started',
        data: {
          skillName,
          timestamp: startTime
        }
      });

      // 加载 Skill 内容
      const content = await this.skillRegistry.loadSkillContent(skillName);

      // 执行 Skill 逻辑
      // 注意：这里只是基础实现，实际应用中可能需要更复杂的执行逻辑
      // 例如：解析 Markdown 中的指令、执行脚本等
      const result = await this.executeSkillContent(content, fullContext);

      // 发送 Skill 执行完成事件
      await this.eventManager.emit({
        type: 'skill:execution:completed',
        data: {
          skillName,
          success: result.success,
          executionTime: Date.now() - startTime
        }
      });

      return {
        ...result,
        executionTime: Date.now() - startTime
      };
    } catch (error) {
      // 发送 Skill 执行失败事件
      await this.eventManager.emit({
        type: 'skill:execution:failed',
        data: {
          skillName,
          error: error instanceof Error ? error.message : String(error),
          executionTime: Date.now() - startTime
        }
      });

      return {
        success: false,
        error: error instanceof Error ? error : new Error(String(error)),
        executionTime: Date.now() - startTime
      };
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
   * 构建 Skill 执行上下文
   * @param skill Skill 定义
   * @param agentContext Agent 上下文
   * @returns 完整的执行上下文
   */
  buildContext(
    skill: Skill,
    agentContext?: any
  ): SkillExecutionContext {
    return {
      skill,
      agentContext,
      variables: {},
      tools: skill.metadata.allowedTools || []
    };
  }

  /**
   * 执行 Skill 内容
   * @param content Skill 内容（Markdown）
   * @param context 执行上下文
   * @returns 执行结果
   */
  private async executeSkillContent(
    content: string,
    context: SkillExecutionContext
  ): Promise<SkillExecutionResult> {
    // 基础实现：返回 Skill 内容
    // 实际应用中，这里可以：
    // 1. 解析 Markdown 中的代码块并执行
    // 2. 处理特殊的指令标记
    // 3. 调用外部脚本
    // 4. 与 Agent 上下文交互

    // 提取代码块（示例）
    const codeBlocks = this.extractCodeBlocks(content);

    // 如果有脚本块，可以执行
    if (codeBlocks.length > 0 && context.skill.metadata.allowedTools?.includes('script')) {
      // 这里可以集成 ScriptService 来执行脚本
      // 目前只是示例
      return {
        success: true,
        data: {
          content,
          codeBlocks: codeBlocks.length,
          message: 'Skill content loaded successfully'
        }
      };
    }

    // 默认返回内容
    return {
      success: true,
      data: {
        content,
        message: 'Skill content loaded successfully'
      }
    };
  }

  /**
   * 提取代码块
   * @param content Markdown 内容
   * @returns 代码块数组
   */
  private extractCodeBlocks(content: string): Array<{ language: string; code: string }> {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const blocks: Array<{ language: string; code: string }> = [];

    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      blocks.push({
        language: match[1] || 'text',
        code: match[2].trim()
      });
    }

    return blocks;
  }

  /**
   * 加载 Skill 资源并注入到上下文
   * @param skillName Skill 名称
   * @param resourceType 资源类型
   * @param context 执行上下文
   */
  async loadResources(
    skillName: string,
    resourceType: 'references' | 'examples' | 'scripts' | 'assets',
    context: SkillExecutionContext
  ): Promise<void> {
    const resources = await this.skillRegistry.listSkillResources(skillName, resourceType);

    for (const resourcePath of resources) {
      const content = await this.skillRegistry.loadSkillResource(
        skillName,
        resourceType,
        resourcePath
      );

      // 将资源添加到上下文
      if (!context.variables.resources) {
        context.variables.resources = {};
      }

      if (!context.variables.resources[resourceType]) {
        context.variables.resources[resourceType] = {};
      }

      context.variables.resources[resourceType][resourcePath] = content;
    }
  }
}
