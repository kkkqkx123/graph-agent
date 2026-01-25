import { Entity } from '../../common/base/entity';
import { ID } from '../../common/value-objects/id';
import { Timestamp } from '../../common/value-objects/timestamp';
import { Version } from '../../common/value-objects/version';
import { InteractionMessage } from './interaction-message';
import { InteractionToolCall } from './interaction-tool-call';
import { InteractionLLMCall } from './interaction-llm-call';
import { InteractionTokenUsage } from '../value-objects/token-usage';

/**
 * 交互会话实体
 *
 * 表示一次完整的交互会话，包含消息、工具调用、LLM调用等
 */
export class InteractionSession extends Entity {
  private readonly _messages: InteractionMessage[];
  private readonly _toolCalls: InteractionToolCall[];
  private readonly _llmCalls: InteractionLLMCall[];
  private readonly _variables: Map<string, any>;
  private readonly _tokenUsage: InteractionTokenUsage;
  private readonly _metadata: Map<string, any>;

  constructor(
    id: ID,
    private readonly _threadId: string,
    private readonly _workflowId: string,
    private readonly _nodeId: string,
    createdAt: Timestamp,
    updatedAt: Timestamp,
    version: Version
  ) {
    super(id, createdAt, updatedAt, version);
    this._messages = [];
    this._toolCalls = [];
    this._llmCalls = [];
    this._variables = new Map();
    this._tokenUsage = new InteractionTokenUsage({
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
    });
    this._metadata = new Map();
  }

  get threadId(): string { return this._threadId; }
  get workflowId(): string { return this._workflowId; }
  get nodeId(): string { return this._nodeId; }
  get messages(): InteractionMessage[] { return [...this._messages]; }
  get toolCalls(): InteractionToolCall[] { return [...this._toolCalls]; }
  get llmCalls(): InteractionLLMCall[] { return [...this._llmCalls]; }
  get variables(): Map<string, any> { return new Map(this._variables); }
  get tokenUsage(): InteractionTokenUsage { return this._tokenUsage; }

  /**
   * 添加消息
   */
  addMessage(message: InteractionMessage): void {
    this._messages.push(message);
  }

  /**
   * 获取所有消息
   */
  getMessages(): InteractionMessage[] {
    return [...this._messages];
  }

  /**
   * 清空消息
   */
  clearMessages(): void {
    this._messages.length = 0;
  }

  /**
   * 添加工具调用
   */
  addToolCall(toolCall: InteractionToolCall): void {
    this._toolCalls.push(toolCall);
  }

  /**
   * 获取所有工具调用
   */
  getToolCalls(): InteractionToolCall[] {
    return [...this._toolCalls];
  }

  /**
   * 添加LLM调用
   */
  addLLMCall(llmCall: InteractionLLMCall): void {
    this._llmCalls.push(llmCall);
    // 更新token使用量
    if (llmCall.usage) {
      this._tokenUsage.add(llmCall.usage);
    }
  }

  /**
   * 获取所有LLM调用
   */
  getLLMCalls(): InteractionLLMCall[] {
    return [...this._llmCalls];
  }

  /**
   * 设置变量
   */
  setVariable(key: string, value: any): void {
    this._variables.set(key, value);
  }

  /**
   * 获取变量
   */
  getVariable(key: string): any {
    return this._variables.get(key);
  }

  /**
   * 获取所有变量
   */
  getAllVariables(): Record<string, any> {
    return Object.fromEntries(this._variables);
  }

  /**
   * 设置元数据
   */
  setMetadata(key: string, value: any): void {
    this._metadata.set(key, value);
  }

  /**
   * 获取元数据
   */
  getMetadata(key: string): any {
    return this._metadata.get(key);
  }

  /**
   * 克隆会话
   */
  clone(): InteractionSession {
    const cloned = new InteractionSession(
      this.id,
      this._threadId,
      this._workflowId,
      this._nodeId,
      this.createdAt,
      this.updatedAt,
      this.version
    );

    // 复制消息
    this._messages.forEach(msg => cloned.addMessage(msg));

    // 复制工具调用
    this._toolCalls.forEach(call => cloned.addToolCall(call));

    // 复制LLM调用
    this._llmCalls.forEach(call => cloned.addLLMCall(call));

    // 复制变量
    this._variables.forEach((value, key) => cloned.setVariable(key, value));

    // 复制元数据
    this._metadata.forEach((value, key) => cloned.setMetadata(key, value));

    return cloned;
  }
}