import { ValueObject } from '../../../common/value-objects';
import { ValidationError } from '../../../../common/exceptions';

/**
 * 提示词历史条目角色枚举（合并了原来的 type 和 role）
 *
 * - system: 系统消息
 * - user: 用户输入
 * - assistant: 助手输出（包括普通输出和工具调用）
 * - tool: 工具结果
 * - output: 输出状态（临时，下一次请求时需要转换为 assistant）
 */
export type PromptHistoryEntryRole = 'system' | 'user' | 'assistant' | 'tool' | 'output';

/**
 * 工具调用信息
 */
export interface ToolCall {
  /** 工具调用 ID */
  id: string;
  /** 工具名称 */
  name: string;
  /** 工具参数 */
  arguments: Record<string, unknown>;
}

/**
 * 提示词历史条目属性接口
 */
export interface PromptHistoryEntryProps {
  /** 唯一索引（用于上下文裁剪和检查点恢复） */
  index: number;
  /** 消息角色（合并了原来的 type 和 role） */
  role: PromptHistoryEntryRole;
  /** 消息内容 */
  content: string;
  /** 工具调用信息（仅 assistant 角色时可选） */
  toolCalls?: ToolCall[];
  /** 工具调用 ID（仅 tool 角色时必需） */
  toolCallId?: string;
  /** 元数据（用于节点标记等扩展信息） */
  metadata?: Record<string, unknown>;
}

/**
 * 提示词历史条目值对象
 *
 * 用于表示提示词历史中的单条记录，包含索引、类型、角色、内容等信息
 */
export class PromptHistoryEntry extends ValueObject<PromptHistoryEntryProps> {
  private constructor(props: PromptHistoryEntryProps) {
    super(props);
    this.validate();
  }

  /**
   * 创建提示词历史条目
   * @param index 唯一索引
   * @param role 消息角色
   * @param content 内容
   * @param toolCalls 工具调用信息（可选）
   * @param toolCallId 工具调用ID（可选）
   * @param metadata 元数据
   * @returns 提示词历史条目实例
   */
  public static create(
    index: number,
    role: PromptHistoryEntryRole,
    content: string,
    toolCalls?: ToolCall[],
    toolCallId?: string,
    metadata?: Record<string, unknown>
  ): PromptHistoryEntry {
    return new PromptHistoryEntry({
      index,
      role,
      content,
      toolCalls,
      toolCallId,
      metadata: metadata ? { ...metadata } : undefined,
    });
  }

  /**
   * 从已有属性重建提示词历史条目
   * @param props 提示词历史条目属性
   * @returns 提示词历史条目实例
   */
  public static fromProps(props: PromptHistoryEntryProps): PromptHistoryEntry {
    return new PromptHistoryEntry({
      index: props.index,
      role: props.role,
      content: props.content,
      toolCalls: props.toolCalls,
      toolCallId: props.toolCallId,
      metadata: props.metadata ? { ...props.metadata } : undefined,
    });
  }

  /**
   * 获取索引
   * @returns 索引
   */
  public get index(): number {
    return this.props.index;
  }

  /**
   * 获取角色
   * @returns 角色
   */
  public get role(): PromptHistoryEntryRole {
    return this.props.role;
  }

  /**
   * 获取内容
   * @returns 内容
   */
  public get content(): string {
    return this.props.content;
  }

  /**
   * 获取工具调用信息
   * @returns 工具调用信息
   */
  public get toolCalls(): ToolCall[] | undefined {
    return this.props.toolCalls;
  }

  /**
   * 获取工具调用ID
   * @returns 工具调用ID
   */
  public get toolCallId(): string | undefined {
    return this.props.toolCallId;
  }

  /**
   * 获取元数据
   * @returns 元数据
   */
  public get metadata(): Record<string, unknown> | undefined {
    return this.props.metadata ? { ...this.props.metadata } : undefined;
  }

  /**
   * 检查是否为系统角色
   * @returns 是否为系统角色
   */
  public isSystem(): boolean {
    return this.props.role === 'system';
  }

  /**
   * 检查是否为用户角色
   * @returns 是否为用户角色
   */
  public isUser(): boolean {
    return this.props.role === 'user';
  }

  /**
   * 检查是否为助手角色
   * @returns 是否为助手角色
   */
  public isAssistant(): boolean {
    return this.props.role === 'assistant';
  }

  /**
   * 检查是否为工具角色
   * @returns 是否为工具角色
   */
  public isTool(): boolean {
    return this.props.role === 'tool';
  }

  /**
   * 检查是否为临时输出角色
   * @returns 是否为临时输出角色
   */
  public isOutput(): boolean {
    return this.props.role === 'output';
  }

  /**
   * 检查是否有工具调用
   * @returns 是否有工具调用
   */
  public hasToolCalls(): boolean {
    return this.props.toolCalls !== undefined && this.props.toolCalls.length > 0;
  }

  /**
   * 比较两个提示词历史条目是否相等
   * @param entry 另一个提示词历史条目
   * @returns 是否相等
   */
  public override equals(entry?: PromptHistoryEntry): boolean {
    if (entry === null || entry === undefined) {
      return false;
    }
    return (
      this.props.index === entry.index &&
      this.props.role === entry.role &&
      this.props.content === entry.content &&
      this.props.toolCallId === entry.toolCallId
    );
  }

  /**
   * 获取提示词历史条目的字符串表示
   * @returns 字符串表示
   */
  public override toString(): string {
    return `PromptHistoryEntry(index=${this.props.index}, role="${this.props.role}")`;
  }

  /**
   * 验证值对象的有效性
   */
  public validate(): void {
    if (this.props.index < 0) {
      throw new ValidationError('索引不能为负数');
    }
    if (!this.props.content || typeof this.props.content !== 'string') {
      throw new ValidationError('内容必须是非空字符串');
    }
    if (!['system', 'user', 'assistant', 'tool', 'output'].includes(this.props.role)) {
      throw new ValidationError(`无效的角色: ${this.props.role}`);
    }
    if (this.props.role === 'tool' && !this.props.toolCallId) {
      throw new ValidationError('工具角色必须包含工具调用ID');
    }
    if (this.props.toolCalls) {
      for (const toolCall of this.props.toolCalls) {
        if (!toolCall.id || !toolCall.name || !toolCall.arguments) {
          throw new ValidationError('工具调用必须包含id、name和arguments');
        }
      }
    }
  }
}