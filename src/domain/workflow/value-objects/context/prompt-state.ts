import { ValueObject } from '../../../common/value-objects';
import { PromptHistoryEntry, PromptHistoryEntryRole, ToolCall } from './prompt-history-entry';
import { ValidationError } from '../../../../common/exceptions';

/**
 * 提示词状态属性接口
 */
export interface PromptStateProps {
  /** 历史记录数组 */
  history: PromptHistoryEntry[];
  /** 系统提示（可选） */
  systemPrompt?: string;
  /** 下一个索引 */
  nextIndex: number;
}

/**
 * 提示词状态值对象
 *
 * 用于管理提示词历史记录，每条记录都有唯一索引，支持按类型和角色区分
 */
export class PromptState extends ValueObject<PromptStateProps> {
  private constructor(props: PromptStateProps) {
    super(props);
    this.validate();
  }

  /**
   * 创建初始提示词状态
   * @param systemPrompt 系统提示（可选）
   * @returns 提示词状态实例
   */
  public static create(systemPrompt?: string): PromptState {
    return new PromptState({
      history: [],
      systemPrompt,
      nextIndex: 0,
    });
  }

  /**
   * 从已有属性重建提示词状态
   * @param props 提示词状态属性
   * @returns 提示词状态实例
   */
  public static fromProps(props: PromptStateProps): PromptState {
    return new PromptState({
      history: props.history.map(entry => PromptHistoryEntry.fromProps(entry)),
      systemPrompt: props.systemPrompt,
      nextIndex: props.nextIndex,
    });
  }

  /**
   * 获取历史记录
   * @returns 历史记录数组
   */
  public get history(): PromptHistoryEntry[] {
    return [...this.props.history];
  }

  /**
   * 获取系统提示
   * @returns 系统提示
   */
  public get systemPrompt(): string | undefined {
    return this.props.systemPrompt;
  }

  /**
   * 获取下一个索引
   * @returns 下一个索引
   */
  public get nextIndex(): number {
    return this.props.nextIndex;
  }

  /**
   * 添加历史条目
   * @param role 消息角色
   * @param content 内容
   * @param toolCalls 工具调用信息（可选）
   * @param toolCallId 工具调用ID（可选）
   * @param metadata 元数据
   * @returns 新的提示词状态实例
   */
  public addMessage(
    role: PromptHistoryEntryRole,
    content: string,
    toolCalls?: ToolCall[],
    toolCallId?: string,
    metadata?: Record<string, unknown>
  ): PromptState {
    const newEntry = PromptHistoryEntry.create(
      this.props.nextIndex,
      role,
      content,
      toolCalls,
      toolCallId,
      metadata
    );

    return new PromptState({
      ...this.props,
      history: [...this.props.history, newEntry],
      nextIndex: this.props.nextIndex + 1,
    });
  }

  /**
   * 添加用户输入
   * @param content 内容
   * @param metadata 元数据
   * @returns 新的提示词状态实例
   */
  public addUserInput(content: string, metadata?: Record<string, unknown>): PromptState {
    return this.addMessage('user', content, undefined, undefined, metadata);
  }

  /**
   * 添加助手输出
   * @param content 内容
   * @param toolCalls 工具调用信息（可选）
   * @param metadata 元数据
   * @returns 新的提示词状态实例
   */
  public addAssistantOutput(content: string, toolCalls?: ToolCall[], metadata?: Record<string, unknown>): PromptState {
    return this.addMessage('assistant', content, toolCalls, undefined, metadata);
  }

  /**
   * 添加系统消息
   * @param content 内容
   * @param metadata 元数据
   * @returns 新的提示词状态实例
   */
  public addSystemMessage(content: string, metadata?: Record<string, unknown>): PromptState {
    return this.addMessage('system', content, undefined, undefined, metadata);
  }

  /**
   * 添加工具调用
   * @param toolCalls 工具调用信息
   * @param metadata 元数据
   * @returns 新的提示词状态实例
   */
  public addToolCall(toolCalls: ToolCall[], metadata?: Record<string, unknown>): PromptState {
    return this.addMessage('assistant', '', toolCalls, undefined, metadata);
  }

  /**
   * 添加工具结果
   * @param toolCallId 工具调用ID
   * @param content 内容
   * @param metadata 元数据
   * @returns 新的提示词状态实例
   */
  public addToolResult(toolCallId: string, content: string, metadata?: Record<string, unknown>): PromptState {
    return this.addMessage('tool', content, undefined, toolCallId, metadata);
  }

  /**
   * 添加临时输出（用于请求前处理）
   * @param content 内容
   * @param metadata 元数据
   * @returns 新的提示词状态实例
   */
  public addTemporaryOutput(content: string, metadata?: Record<string, unknown>): PromptState {
    return this.addMessage('output', content, undefined, undefined, metadata);
  }

  /**
   * 将临时 output 转换为 assistant（请求后）
   * @returns 新的提示词状态实例
   */
  public convertOutputToInput(): PromptState {
    const messages = this.props.history.map(entry => {
      if (entry.role === 'output') {
        return PromptHistoryEntry.create(
          entry.index,
          'assistant',
          entry.content,
          entry.toolCalls,
          entry.toolCallId,
          entry.metadata
        );
      }
      return entry;
    });

    return new PromptState({
      ...this.props,
      history: messages,
    });
  }

  /**
   * 设置系统提示
   * @param systemPrompt 系统提示
   * @returns 新的提示词状态实例
   */
  public setSystemPrompt(systemPrompt: string): PromptState {
    return new PromptState({
      ...this.props,
      systemPrompt,
    });
  }

  /**
   * 清空历史记录
   * @returns 新的提示词状态实例
   */
  public clearHistory(): PromptState {
    return new PromptState({
      ...this.props,
      history: [],
      nextIndex: 0,
    });
  }

  /**
   * 获取历史记录
   * @returns 历史记录数组
   */
  public getHistory(): PromptHistoryEntry[] {
    return [...this.props.history];
  }

  /**
   * 按角色筛选历史记录
   * @param role 角色
   * @returns 历史记录数组
   */
  public getHistoryByRole(role: PromptHistoryEntryRole): PromptHistoryEntry[] {
    return this.props.history.filter(entry => entry.role === role);
  }

  /**
   * 获取指定索引范围的历史记录（用于裁剪）
   * @param startIndex 起始索引
   * @param endIndex 结束索引（不包含）
   * @returns 历史记录数组
   */
  public getHistorySlice(startIndex: number, endIndex?: number): PromptHistoryEntry[] {
    if (endIndex === undefined) {
      return this.props.history.filter(entry => entry.index >= startIndex);
    }
    return this.props.history.filter(entry => entry.index >= startIndex && entry.index < endIndex);
  }

  /**
   * 裁剪到指定索引（用于检查点恢复）
   * @param index 裁剪索引
   * @returns 新的提示词状态实例
   */
  public trimToIndex(index: number): PromptState {
    const messages = this.props.history.filter(entry => entry.index < index);
    return new PromptState({
      ...this.props,
      history: messages,
      nextIndex: index,
    });
  }

  /**
   * 获取最近的历史记录
   * @param count 数量
   * @returns 历史记录数组
   */
  public getRecentHistory(count: number = 10): PromptHistoryEntry[] {
    return this.props.history.slice(-count);
  }

  /**
   * 获取指定索引的历史记录
   * @param index 索引
   * @returns 历史记录条目
   */
  public getEntryByIndex(index: number): PromptHistoryEntry | undefined {
    return this.props.history.find(entry => entry.index === index);
  }

  /**
   * 获取历史记录数量
   * @returns 历史记录数量
   */
  public getHistoryCount(): number {
    return this.props.history.length;
  }

  /**
   * 比较两个提示词状态是否相等
   * @param state 另一个提示词状态
   * @returns 是否相等
   */
  public override equals(state?: PromptState): boolean {
    if (state === null || state === undefined) {
      return false;
    }
    return (
      this.props.systemPrompt === state.systemPrompt &&
      this.props.nextIndex === state.nextIndex &&
      this.props.history.length === state.history.length &&
      this.props.history.every((entry, index) => entry.equals(state.history[index]))
    );
  }

  /**
   * 获取提示词状态的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return `PromptState(history=${this.props.history.length}, nextIndex=${this.props.nextIndex})`;
  }

  /**
   * 验证值对象的有效性
   */
  public validate(): void {
    if (this.props.nextIndex < 0) {
      throw new ValidationError('下一个索引不能为负数');
    }
    if (this.props.history.length > this.props.nextIndex) {
      throw new ValidationError('历史记录数量不能超过下一个索引');
    }
    // 验证历史记录的索引是否连续
    for (let i = 0; i < this.props.history.length; i++) {
      const entry = this.props.history[i];
      if (entry && entry.index !== i) {
        throw new ValidationError(`历史记录索引不连续，期望 ${i}，实际 ${entry.index}`);
      }
    }
  }

  /**
   * 转换为 OpenAI 格式
   *
   * OpenAI 工具使用格式：
   * - 助手工具调用：{ role: 'assistant', content: '', tool_calls: [{ id, type: 'function', function: { name, arguments } }] }
   * - 工具结果：{ role: 'tool', content: '...', tool_call_id: '...' }
   *
   * @returns OpenAI 消息数组
   */
  public toOpenAIMessages(): Array<{
    role: string;
    content: string | null;
    tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
    tool_call_id?: string;
  }> {
    return this.props.history
      .filter(entry => entry.role !== 'output') // 排除临时 output
      .map(entry => {
        const baseMessage = {
          role: entry.role,
          content: entry.content || null,
        };

        // 处理工具调用（assistant 角色）
        if (entry.role === 'assistant' && entry.toolCalls && entry.toolCalls.length > 0) {
          return {
            ...baseMessage,
            tool_calls: entry.toolCalls.map(tc => ({
              id: tc.id,
              type: 'function' as const,
              function: {
                name: tc.name,
                arguments: JSON.stringify(tc.arguments),
              },
            })),
          };
        }

        // 处理工具结果（tool 角色）
        if (entry.role === 'tool' && entry.toolCallId) {
          return {
            ...baseMessage,
            tool_call_id: entry.toolCallId,
          };
        }

        return baseMessage;
      });
  }

  /**
   * 转换为 Anthropic 格式
   *
   * Anthropic 工具使用格式：
   * - 助手工具调用：{ role: 'assistant', content: [{ type: 'tool_use', id, name, input }] }
   * - 工具结果：{ role: 'user', content: [{ type: 'tool_result', tool_use_id, content }] }
   *
   * @returns Anthropic 消息数组
   */
  public toAnthropicMessages(): Array<{
    role: string;
    content: string | Array<{ type: string; id?: string; name?: string; input?: Record<string, unknown>; tool_use_id?: string; content?: string }>;
  }> {
    const messages: Array<{
      role: string;
      content: string | Array<{ type: string; id?: string; name?: string; input?: Record<string, unknown>; tool_use_id?: string; content?: string }>;
    }> = [];

    for (const entry of this.props.history) {
      if (entry.role === 'output') {
        continue; // 排除临时 output
      }

      // 系统消息单独处理（通过 system 参数传递）
      if (entry.role === 'system') {
        continue;
      }

      // 处理工具调用（assistant 角色）
      if (entry.role === 'assistant' && entry.toolCalls && entry.toolCalls.length > 0) {
        messages.push({
          role: 'assistant',
          content: entry.toolCalls.map(tc => ({
            type: 'tool_use' as const,
            id: tc.id,
            name: tc.name,
            input: tc.arguments,
          })),
        });
        continue;
      }

      // 处理工具结果（tool 角色）
      if (entry.role === 'tool' && entry.toolCallId) {
        messages.push({
          role: 'user',
          content: [
            {
              type: 'tool_result' as const,
              tool_use_id: entry.toolCallId,
              content: entry.content,
            },
          ],
        });
        continue;
      }

      // 普通消息
      messages.push({
        role: entry.role,
        content: entry.content,
      });
    }

    return messages;
  }

  /**
   * 获取 Anthropic 系统提示
   * @returns 系统提示或 undefined
   */
  public getAnthropicSystemPrompt(): string | undefined {
    const systemEntry = this.props.history.find(entry => entry.role === 'system');
    return systemEntry?.content;
  }

  /**
   * 获取系统提示
   * @returns 系统提示
   */
  public getSystemPrompt(): string | undefined {
    return this.props.systemPrompt;
  }
}