/**
 * ToolVisibilityMessageBuilder - 工具可见性消息构建器
 * 专门负责生成工具可见性声明消息
 *
 * 设计原则：
 * - 无状态设计：不持有任何状态
 * - 单一职责：只负责消息构建
 * - 可测试性：纯函数，易于单元测试
 */

import type { ToolScope } from '../managers/tool-context-manager.js';
import type { VisibilityChangeType } from '../types/tool-visibility.types.js';
import type { ToolService } from '../../services/tool-service.js';
import { now } from '@modular-agent/common-utils';

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
    const changeTypeText = this.getChangeTypeText(changeType);

    // 构建工具描述表格
    const toolDescriptions = toolIds
      .map(id => {
        const tool = this.toolService.getTool(id);
        if (!tool) return null;
        return `| ${tool.name} | ${id} | ${tool.description} |`;
      })
      .filter(Boolean)
      .join('\n');

    const message = `## 工具可见性声明

**生效时间**：${timestamp}
**当前作用域**：${scope}(${scopeId})
**变更类型**：${changeTypeText}

### 当前可用工具清单

| 工具名称 | 工具ID | 说明 |
|----------|--------|------|
${toolDescriptions || '无可用工具'}

### 重要提示

1. **仅可使用上述清单中的工具**，其他工具调用将被拒绝
2. 工具参数必须符合schema定义
3. 如需更多工具，请在完成当前当前作用域可完成的操作后推进任务进度
`;

    return message;
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

  /**
   * 获取变更类型文本
   * @param changeType 变更类型
   * @returns 变更类型文本
   */
  private getChangeTypeText(changeType: VisibilityChangeType): string {
    const typeMap: Record<VisibilityChangeType, string> = {
      init: '初始化',
      enter_scope: '进入作用域',
      add_tools: '新增工具',
      exit_scope: '退出作用域',
      refresh: '刷新声明'
    };
    return typeMap[changeType] || changeType;
  }
}