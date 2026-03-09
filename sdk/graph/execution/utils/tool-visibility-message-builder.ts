/**
 * ToolVisibilityMessageBuilder - 工具可见性消息构建器
 * 专门负责生成工具可见性声明消息
 *
 * 设计原则：
 * - 无状态设计：不持有任何状态
 * - 单一职责：只负责消息构建
 * - 可测试性：纯函数，易于单元测试
 * - 使用模板渲染器：使用 @modular-agent/prompt-templates 中的模板
 */

import type { ToolScope } from '../managers/tool-context-manager.js';
import type { VisibilityChangeType } from '../types/tool-visibility.types.js';
import type { ToolService } from '../../../core/services/tool-service.js';
import { now, renderTemplate } from '@modular-agent/common-utils';
import { generateToolTable } from '../../../core/utils/tools/tool-description-generator.js';
import {
  TOOL_VISIBILITY_DECLARATION_TEMPLATE,
  VISIBILITY_CHANGE_TYPE_TEXTS
} from '@modular-agent/prompt-templates';

/**
 * 工具可见性消息构建器
 */
export class ToolVisibilityMessageBuilder {
  constructor(private toolService: ToolService) { }

  /**
   * 构建可见性声明消息内容
   * @param scope 作用域
   * @param scopeId 作用域ID
   * @param toolIds 工具ID列表
   * @param changeType 变更类型
   * @returns 声明消息内容
   */
  buildVisibilityDeclarationMessage(
    scope: ToolScope,
    scopeId: string,
    toolIds: string[],
    changeType: VisibilityChangeType
  ): string {
    const timestamp = new Date().toISOString();
    const changeTypeText = VISIBILITY_CHANGE_TYPE_TEXTS[changeType] || changeType;

    // 获取工具对象列表
    const tools = toolIds
      .map(id => this.toolService.getTool(id))
      .filter(Boolean);

    // 使用工具描述生成器生成工具表格
    const toolDescriptions = tools.length > 0
      ? generateToolTable(tools)
      : '无可用工具';

    // 使用模板渲染器生成消息
    const variables = {
      timestamp,
      scope,
      scopeId,
      changeTypeText,
      toolDescriptions
    };

    return renderTemplate(TOOL_VISIBILITY_DECLARATION_TEMPLATE.content, variables);
  }

  /**
   * 构建可见性声明消息元数据
   * @param scope 作用域
   * @param scopeId 作用域ID
   * @param toolIds 工具ID列表
   * @param changeType 变更类型
   * @returns 消息元数据
   */
  buildVisibilityDeclarationMetadata(
    scope: ToolScope,
    scopeId: string,
    toolIds: string[],
    changeType: VisibilityChangeType
  ): Record<string, any> {
    return {
      type: 'tool_visibility_declaration',
      timestamp: now(),
      scope,
      scopeId,
      toolIds,
      changeType
    };
  }

}
