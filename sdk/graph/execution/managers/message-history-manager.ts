/**
 * MessageHistoryManager - 消息历史管理器
 * 扩展 ConversationManager，增加 Graph 特有功能（工具可见性等）
 *
 * 核心职责：
 * 1. 管理线程的消息历史（继承自 ConversationManager）
 * 2. Token 统计和事件触发（继承自 ConversationManager）
 * 3. 工具描述消息管理（Graph 特有）
 * 4. 批次级别的消息版本控制（支持快照和恢复）
 */

import type { LLMMessage, Tool } from '@modular-agent/types';
import {
  ConversationManager,
  type ConversationManagerConfig
} from '../../../core/managers/conversation-manager.js';
import { generateToolListDescription } from '../../../core/utils/tools/tool-description-generator.js';
import type { ToolService } from '../../../core/services/tool-service.js';

/**
 * 工具可用性集合
 */
export interface AvailableTools {
  initial: Set<string>;
  dynamic: Set<string>;
}

/**
 * MessageHistoryManager 配置
 */
export interface MessageHistoryManagerConfig extends ConversationManagerConfig {
  /** 工具服务 */
  toolService?: ToolService;
  /** 可用工具集合 */
  availableTools?: AvailableTools;
}

/**
 * MessageHistoryManager 类
 */
export class MessageHistoryManager extends ConversationManager {
  private toolService?: ToolService;
  private availableTools?: AvailableTools;

  /**
   * 构造函数
   * @param config 配置选项
   */
  constructor(config: MessageHistoryManagerConfig) {
    super(config);
    this.toolService = config.toolService;
    this.availableTools = config.availableTools;
  }

  // ============================================================
  // 工具描述消息管理（Graph 特有）
  // ============================================================

  /**
   * 检查是否已经存在工具描述消息
   * @returns 是否存在工具描述消息
   */
  private hasToolDescriptionMessage(): boolean {
    const allMessages = this.getAllMessages();
    return allMessages.some(msg =>
      msg.role === 'system' &&
      typeof msg.content === 'string' &&
      msg.content.startsWith('可用工具:')
    );
  }

  /**
   * 获取初始可用工具的描述消息（不包含 dynamicTools）
   * @returns 工具描述消息，如果没有初始工具则返回 null
   */
  getInitialToolDescriptionMessage(): LLMMessage | null {
    if (!this.availableTools || !this.toolService) {
      return null;
    }

    // 只使用 initial 工具集合
    const initialToolIds = Array.from(this.availableTools.initial);
    if (initialToolIds.length === 0) {
      return null;
    }

    // 获取工具对象列表
    const tools = initialToolIds
      .map(id => {
        try {
          return this.toolService!.getTool(id);
        } catch (e) {
          return null;
        }
      })
      .filter((t): t is Tool => !!t);

    if (tools.length === 0) {
      return null;
    }

    // 使用工具描述生成器生成工具列表描述
    const toolDescriptions = generateToolListDescription(tools, 'list');

    if (toolDescriptions.length > 0) {
      return {
        role: 'system',
        content: `可用工具:\n${toolDescriptions}`
      };
    }

    return null;
  }

  /**
   * 在新批次开始时添加初始工具描述（如果不存在）
   * @param boundaryIndex 批次边界索引
   */
  startNewBatchWithInitialTools(boundaryIndex?: number): number {
    // 开始新批次
    const newBatch = this.startNewBatch(boundaryIndex);

    // 检查是否已存在工具描述消息
    if (!this.hasToolDescriptionMessage()) {
      // 添加初始工具描述消息
      const toolDescMessage = this.getInitialToolDescriptionMessage();
      if (toolDescMessage) {
        this.addMessage(toolDescMessage);
      }
    }

    return newBatch;
  }

  /**
   * 执行消息操作并触发完成事件
   * 增加图特有的工具可见性管理
   * @param operation 消息操作配置
   * @returns 操作结果
   */
  override async executeMessageOperation(
    operation: any,
    onAfterOperation?: (result: any) => Promise<void>
  ): Promise<any> {
    const result = await super.executeMessageOperation(operation, onAfterOperation);

    // 如果操作可能涉及可见范围变化（如截断或清空），尝试重新添加工具描述
    if (operation.operation === 'TRUNCATE' || operation.operation === 'CLEAR') {
      if (!this.hasToolDescriptionMessage()) {
        const toolDescMessage = this.getInitialToolDescriptionMessage();
        if (toolDescMessage) {
          this.addMessage(toolDescMessage);
        }
      }
    }

    return result;
  }

  // ============================================================
  // 兼容旧接口及额外功能
  // ============================================================

  /**
   * 保存消息历史
   * @param messages 消息数组
   */
  saveMessages(messages: LLMMessage[]): void {
    this.initializeHistory(messages);
  }

  /**
   * 获取消息历史
   * @returns 消息数组的副本
   */
  getHistoryMessages(): LLMMessage[] {
    return this.getAllMessages();
  }
}
