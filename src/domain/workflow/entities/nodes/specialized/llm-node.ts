import { Node, NodeProps, NodePosition } from '@domain/workflow/entities/nodes/base/node';
import { ID } from '@domain/common/value-objects/id';
import { NodeType } from '@/domain/workflow/value-objects/node-type';
import { WorkflowState } from '@domain/workflow/state/workflow-state';
import { Timestamp } from '@domain/common/value-objects/timestamp';
import { Version } from '@domain/common/value-objects/version';
import { DomainError } from '@domain/common/errors/domain-error';

/**
 * 工具配置接口
 */
export interface ToolConfig {
  toolId: string;
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  enabled: boolean;
}

/**
 * 消息接口
 */
export interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: ToolCall[];
  metadata?: Record<string, unknown>;
}

/**
 * 工具调用接口
 */
export interface ToolCall {
  id: string;
  type: string;
  function: {
    name: string;
    arguments: string;
  };
}

/**
 * LLM响应接口
 */
export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  tokenUsage?: TokenUsage;
  model: string;
  finishReason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * 令牌使用情况接口
 */
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

/**
 * LLM节点属性接口
 */
export interface LLMNodeProps extends NodeProps {
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  tools?: ToolConfig[];
  promptTemplate?: string;
  promptVariables?: Record<string, unknown>;
  model?: string;
  responseFormat?: 'text' | 'json';
  stopSequences?: string[];
}

/**
 * LLM节点实体
 * 
 * 表示调用大语言模型的节点
 */
export class LLMNode extends Node {
  private readonly llmProps: LLMNodeProps;

  protected constructor(props: LLMNodeProps) {
    super(props);
    this.llmProps = Object.freeze(props);
  }

  /**
   * 创建LLM节点
   */
  public static override create(
    workflowId: ID,
    type: NodeType,
    name?: string,
    description?: string,
    position?: NodePosition,
    properties?: Record<string, unknown>,
    options?: {
      systemPrompt?: string;
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
      tools?: ToolConfig[];
      promptTemplate?: string;
      promptVariables?: Record<string, unknown>;
      model?: string;
      responseFormat?: 'text' | 'json';
      stopSequences?: string[];
    }
  ): LLMNode {
    const now = Timestamp.now();
    const nodeId = ID.generate();

    const nodeProps: NodeProps = {
      id: nodeId,
      workflowId,
      type,
      name,
      description,
      position,
      properties: properties || {},
      createdAt: now,
      updatedAt: now,
      version: Version.initial(),
      isDeleted: false
    };

    const props: LLMNodeProps = {
      ...nodeProps,
      systemPrompt: options?.systemPrompt,
      temperature: options?.temperature ?? 0.7,
      maxTokens: options?.maxTokens ?? 1000,
      topP: options?.topP ?? 0.9,
      frequencyPenalty: options?.frequencyPenalty ?? 0.0,
      presencePenalty: options?.presencePenalty ?? 0.0,
      tools: options?.tools || [],
      promptTemplate: options?.promptTemplate,
      promptVariables: options?.promptVariables || {},
      model: options?.model,
      responseFormat: options?.responseFormat ?? 'text',
      stopSequences: options?.stopSequences
    };

    return new LLMNode(props);
  }

  /**
   * 从已有属性重建LLM节点
   */
  public static override fromProps(props: LLMNodeProps): LLMNode {
    return new LLMNode(props);
  }

  /**
   * 获取系统提示词
   */
  public get systemPrompt(): string | undefined {
    return this.llmProps.systemPrompt;
  }

  /**
   * 获取温度参数
   */
  public get temperature(): number {
    return this.llmProps.temperature ?? 0.7;
  }

  /**
   * 获取最大令牌数
   */
  public get maxTokens(): number {
    return this.llmProps.maxTokens ?? 1000;
  }

  /**
   * 获取Top-P参数
   */
  public get topP(): number {
    return this.llmProps.topP ?? 0.9;
  }

  /**
   * 获取频率惩罚
   */
  public get frequencyPenalty(): number {
    return this.llmProps.frequencyPenalty ?? 0.0;
  }

  /**
   * 获取存在惩罚
   */
  public get presencePenalty(): number {
    return this.llmProps.presencePenalty ?? 0.0;
  }

  /**
   * 获取工具配置
   */
  public get tools(): ToolConfig[] {
    return [...(this.llmProps.tools || [])];
  }

  /**
   * 获取提示词模板
   */
  public get promptTemplate(): string | undefined {
    return this.llmProps.promptTemplate;
  }

  /**
   * 获取提示词变量
   */
  public get promptVariables(): Record<string, unknown> {
    return { ...(this.llmProps.promptVariables || {}) };
  }

  /**
   * 获取模型名称
   */
  public get model(): string | undefined {
    return this.llmProps.model;
  }

  /**
   * 获取响应格式
   */
  public get responseFormat(): 'text' | 'json' {
    return this.llmProps.responseFormat ?? 'text';
  }

  /**
   * 获取停止序列
   */
  public get stopSequences(): string[] {
    return [...(this.llmProps.stopSequences || [])];
  }

  /**
   * 设置系统提示词
   */
  public setSystemPrompt(systemPrompt: string): LLMNode {
    return new LLMNode({
      ...this.llmProps,
      systemPrompt,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 设置温度参数
   */
  public setTemperature(temperature: number): LLMNode {
    if (temperature < 0 || temperature > 2) {
      throw new DomainError('温度参数必须在0到2之间');
    }
    return new LLMNode({
      ...this.llmProps,
      temperature,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 设置最大令牌数
   */
  public setMaxTokens(maxTokens: number): LLMNode {
    if (maxTokens <= 0) {
      throw new DomainError('最大令牌数必须大于0');
    }
    return new LLMNode({
      ...this.llmProps,
      maxTokens,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 添加工具
   */
  public addTool(tool: ToolConfig): LLMNode {
    if (this.hasTool(tool.toolId)) {
      throw new DomainError(`工具已存在: ${tool.toolId}`);
    }

    const newTools = [...(this.llmProps.tools || []), tool];
    return new LLMNode({
      ...this.llmProps,
      tools: newTools,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 移除工具
   */
  public removeTool(toolId: string): LLMNode {
    const newTools = (this.llmProps.tools || []).filter(t => t.toolId !== toolId);
    return new LLMNode({
      ...this.llmProps,
      tools: newTools,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 更新工具
   */
  public updateTool(toolId: string, updates: Partial<ToolConfig>): LLMNode {
    const tools = [...(this.llmProps.tools || [])];
    const index = tools.findIndex(t => t.toolId === toolId);

    if (index === -1) {
      throw new DomainError(`工具不存在: ${toolId}`);
    }

    // 确保 toolId 不被更新
    const { toolId: _, ...safeUpdates } = updates;
    // 确保 toolId 不为 undefined
    const originalTool = tools[index];
    if (!originalTool) {
      throw new DomainError(`工具不存在: ${toolId}`);
    }
    const updatedTool: ToolConfig = {
      ...originalTool,
      ...safeUpdates,
      toolId: originalTool.toolId // 确保 toolId 始终是字符串
    };
    tools[index] = updatedTool;
    return new LLMNode({
      ...this.llmProps,
      tools,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 检查是否有指定工具
   */
  public hasTool(toolId: string): boolean {
    return (this.llmProps.tools || []).some(t => t.toolId === toolId);
  }

  /**
   * 获取工具
   */
  public getTool(toolId: string): ToolConfig | undefined {
    return (this.llmProps.tools || []).find(t => t.toolId === toolId);
  }

  /**
   * 获取启用的工具
   */
  public getEnabledTools(): ToolConfig[] {
    return (this.llmProps.tools || []).filter(t => t.enabled);
  }

  /**
   * 启用工具
   */
  public enableTool(toolId: string): LLMNode {
    return this.updateTool(toolId, { enabled: true });
  }

  /**
   * 禁用工具
   */
  public disableTool(toolId: string): LLMNode {
    return this.updateTool(toolId, { enabled: false });
  }

  /**
   * 设置提示词模板
   */
  public setPromptTemplate(template: string): LLMNode {
    return new LLMNode({
      ...this.llmProps,
      promptTemplate: template,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 设置提示词变量
   */
  public setPromptVariables(variables: Record<string, unknown>): LLMNode {
    return new LLMNode({
      ...this.llmProps,
      promptVariables: { ...variables },
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 添加提示词变量
   */
  public addPromptVariable(key: string, value: unknown): LLMNode {
    const newVariables = { ...(this.llmProps.promptVariables || {}) };
    newVariables[key] = value;

    return new LLMNode({
      ...this.llmProps,
      promptVariables: newVariables,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 移除提示词变量
   */
  public removePromptVariable(key: string): LLMNode {
    const newVariables = { ...(this.llmProps.promptVariables || {}) };
    delete newVariables[key];

    return new LLMNode({
      ...this.llmProps,
      promptVariables: newVariables,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 设置模型
   */
  public setModel(model: string): LLMNode {
    return new LLMNode({
      ...this.llmProps,
      model,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 设置响应格式
   */
  public setResponseFormat(format: 'text' | 'json'): LLMNode {
    return new LLMNode({
      ...this.llmProps,
      responseFormat: format,
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 设置停止序列
   */
  public setStopSequences(sequences: string[]): LLMNode {
    return new LLMNode({
      ...this.llmProps,
      stopSequences: [...sequences],
      updatedAt: Timestamp.now()
    });
  }

  /**
   * 检查是否启用工具
   */
  public shouldEnableTools(): boolean {
    const enabledTools = this.getEnabledTools();
    return enabledTools.length > 0;
  }

  /**
   * 准备消息
   */
  public prepareMessages(state: WorkflowState): Message[] {
    const messages: Message[] = [];

    // 添加系统提示词
    const systemPrompt = this.resolveSystemPrompt(state);
    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt
      });
    }

    // 添加历史消息
    const historyMessages = this.getHistoryMessages(state);
    messages.push(...historyMessages);

    // 添加用户输入
    const userMessage = this.getUserMessage(state);
    if (userMessage) {
      messages.push(userMessage);
    }

    return messages;
  }

  /**
   * 解析系统提示词
   */
  private resolveSystemPrompt(state: WorkflowState): string {
    if (this.llmProps.systemPrompt) {
      return this.processTemplate(this.llmProps.systemPrompt, state);
    }

    if (this.llmProps.promptTemplate) {
      return this.processTemplate(this.llmProps.promptTemplate, state);
    }

    return this.getDefaultSystemPrompt();
  }

  /**
   * 处理模板
   */
  private processTemplate(template: string, state: WorkflowState): string {
    let processed = template;

    // 替换提示词变量
    for (const [key, value] of Object.entries(this.llmProps.promptVariables || {})) {
      processed = processed.replace(
        new RegExp(`\\$\\{${key}\\}`, 'g'),
        String(value)
      );
    }

    // 替换状态数据
    for (const [key, value] of Object.entries(state.data)) {
      processed = processed.replace(
        new RegExp(`\\$\\{${key}\\}`, 'g'),
        String(value)
      );
    }

    return processed;
  }

  /**
   * 获取历史消息
   */
  private getHistoryMessages(state: WorkflowState): Message[] {
    const messages = state.getData('messages') as Message[] || [];
    return messages.filter(msg => msg.role !== 'system');
  }

  /**
   * 获取用户消息
   */
  private getUserMessage(state: WorkflowState): Message | null {
    const userInput = state.getData('userInput') as string;
    if (!userInput) {
      return null;
    }

    return {
      role: 'user',
      content: userInput
    };
  }

  /**
   * 获取默认系统提示词
   */
  private getDefaultSystemPrompt(): string {
    return '你是一个智能助手，请根据上下文信息提供准确、有用的回答。';
  }

  /**
   * 处理LLM响应
   */
  public processResponse(response: LLMResponse, state: WorkflowState): WorkflowState {
    // 添加助手消息到状态
    const messages = this.getHistoryMessages(state);
    messages.push({
      role: 'assistant',
      content: response.content,
      toolCalls: response.toolCalls,
      metadata: {
        model: response.model,
        tokenUsage: response.tokenUsage,
        finishReason: response.finishReason
      }
    });

    return state.setData('messages', messages);
  }

  /**
   * 获取生成参数
   */
  public getGenerationParameters(): Record<string, unknown> {
    return {
      temperature: this.temperature,
      maxTokens: this.maxTokens,
      topP: this.topP,
      frequencyPenalty: this.frequencyPenalty,
      presencePenalty: this.presencePenalty,
      model: this.model,
      responseFormat: this.responseFormat,
      stopSequences: this.stopSequences,
      tools: this.shouldEnableTools() ? this.getEnabledTools() : undefined
    };
  }

  /**
   * 验证LLM节点
   */
  public validateLLMNode(): string[] {
    const errors: string[] = [];

    if (this.temperature < 0 || this.temperature > 2) {
      errors.push('温度参数必须在0到2之间');
    }

    if (this.maxTokens <= 0) {
      errors.push('最大令牌数必须大于0');
    }

    if (this.topP < 0 || this.topP > 1) {
      errors.push('Top-P参数必须在0到1之间');
    }

    if (this.frequencyPenalty < -2 || this.frequencyPenalty > 2) {
      errors.push('频率惩罚必须在-2到2之间');
    }

    if (this.presencePenalty < -2 || this.presencePenalty > 2) {
      errors.push('存在惩罚必须在-2到2之间');
    }

    // 验证工具配置
    for (const tool of this.tools || []) {
      if (!tool.toolId) {
        errors.push('工具ID不能为空');
      }
      if (!tool.name) {
        errors.push('工具名称不能为空');
      }
      if (!tool.description) {
        errors.push('工具描述不能为空');
      }
    }

    // 检查工具ID是否唯一
    const toolIds = (this.tools || []).map(t => t.toolId);
    const uniqueIds = new Set(toolIds);
    if (toolIds.length !== uniqueIds.size) {
      errors.push('工具ID必须唯一');
    }

    return errors;
  }

  /**
   * 验证实体的有效性
   */
  public override validate(): void {
    super.validate();

    const llmErrors = this.validateLLMNode();
    if (llmErrors.length > 0) {
      throw new DomainError(`LLM节点验证失败: ${llmErrors.join(', ')}`);
    }
  }
}