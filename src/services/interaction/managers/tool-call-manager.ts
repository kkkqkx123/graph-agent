/**
 * Tool Call Manager
 *
 * 负责管理工具调用历史
 */

import { injectable, inject } from 'inversify';
import { ToolCall } from '../../../domain/interaction/value-objects/tool-call';
import { ILogger } from '../../../domain/common/types/logger-types';

/**
 * Tool Call Manager 接口
 */
export interface IToolCallManager {
  /**
   * 添加工具调用
   */
  addToolCall(toolCall: ToolCall): void;

  /**
   * 获取所有工具调用
   */
  getToolCalls(): ToolCall[];

  /**
   * 获取指定 ID 的工具调用
   */
  getToolCall(id: string): ToolCall | undefined;

  /**
   * 清空工具调用历史
   */
  clearToolCalls(): void;

  /**
   * 获取工具调用数量
   */
  getToolCallCount(): number;
}

/**
 * Tool Call Manager 实现
 */
@injectable()
export class ToolCallManager implements IToolCallManager {
  private toolCalls: ToolCall[] = [];

  constructor(@inject('Logger') private readonly logger: ILogger) {}

  addToolCall(toolCall: ToolCall): void {
    this.toolCalls.push(toolCall);
    this.logger.debug('添加工具调用', { toolId: toolCall.name });
  }

  getToolCalls(): ToolCall[] {
    return [...this.toolCalls];
  }

  getToolCall(id: string): ToolCall | undefined {
    return this.toolCalls.find(tc => tc.id === id);
  }

  clearToolCalls(): void {
    this.toolCalls = [];
    this.logger.debug('清空工具调用历史');
  }

  getToolCallCount(): number {
    return this.toolCalls.length;
  }
}