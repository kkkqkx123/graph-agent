/**
 * GetSkill Tool
 *
 * 用于 Agent 按需加载 Skill 完整内容的工具。
 * 实现 Progressive Disclosure Level 2：按需加载完整内容。
 */

import type { Tool, ToolExecutionResult } from '@modular-agent/types';
import type { SkillLoader } from '../services/skill-loader.js';

/**
 * GetSkill Tool 参数
 */
export interface GetSkillToolParameters {
  /** Skill 名称 */
  skill_name: string;
}

/**
 * 创建 GetSkill Tool
 *
 * @param skillLoader Skill 加载器实例
 * @returns Tool 定义
 */
export function createGetSkillTool(skillLoader: SkillLoader): Tool {
  return {
    id: 'get_skill',
    name: 'get_skill',
    type: 'STATELESS',
    description: `Load the complete content of a specified skill.

Use this tool when you need detailed information about a skill, including:
- Full skill documentation and instructions
- Reference materials
- Example code
- Available scripts

The skill content will be loaded and returned as formatted text that you can use to guide your work.`,
    parameters: {
      type: 'object',
      properties: {
        skill_name: {
          type: 'string',
          description: 'The name of the skill to load (e.g., "frontend-design", "pdf-processing")'
        }
      },
      required: ['skill_name']
    },
    metadata: {
      category: 'skill',
      tags: ['skill', 'load', 'documentation']
    }
  };
}

/**
 * GetSkill Tool 执行器
 *
 * @param skillLoader Skill 加载器实例
 * @returns 执行函数
 */
export function createGetSkillExecutor(skillLoader: SkillLoader) {
  return async (
    tool: Tool,
    parameters: GetSkillToolParameters,
    options?: any,
    threadId?: string
  ): Promise<ToolExecutionResult> => {
    const { skill_name } = parameters;
    const startTime = Date.now();

    try {
      // 使用 SkillLoader 加载 Skill 内容
      const result = await skillLoader.loadContent(skill_name);

      if (!result.success) {
        return {
          success: false,
          error: result.error?.message || `Failed to load skill: ${skill_name}`,
          executionTime: Date.now() - startTime,
          retryCount: 0
        };
      }

      // 转换为提示词格式
      const prompt = await skillLoader.toPrompt(skill_name);

      return {
        success: true,
        result: prompt,
        executionTime: Date.now() - startTime,
        retryCount: 0
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        executionTime: Date.now() - startTime,
        retryCount: 0
      };
    }
  };
}

/**
 * 注册 GetSkill Tool 到 ToolService
 *
 * @param toolService 工具服务实例
 * @param skillLoader Skill 加载器实例
 */
export function registerGetSkillTool(
  toolService: { registerTool: (tool: Tool) => void },
  skillLoader: SkillLoader
): void {
  const tool = createGetSkillTool(skillLoader);
  toolService.registerTool(tool);
}
