/**
 * Mock Services - 测试用 Mock 服务
 *
 * 提供隔离外部依赖的 Mock 实现
 */

import { vi } from 'vitest';

/**
 * LLM 响应类型
 */
interface MockLLMResponse {
  id: string;
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
}

/**
 * LLM 请求类型
 */
interface MockLLMRequest {
  messages: Array<{ role: string; content: string }>;
  model: string;
  temperature?: number;
}

/**
 * LLM 流式响应块类型
 */
interface MockLLMStreamChunk {
  id: string;
  delta: { content?: string };
  model: string;
  finishReason?: string;
  usage?: MockLLMResponse['usage'];
}

/**
 * Mock LLM 服务
 * 返回预定义的响应
 */
export class MockLLMService {
  private responses: Map<string, MockLLMResponse> = new Map();
  private defaultResponse: MockLLMResponse;
  private callHistory: MockLLMRequest[] = [];

  constructor() {
    this.defaultResponse = {
      id: 'mock-response-id',
      content: 'Mock LLM response',
      model: 'mock-model',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30,
      },
      finishReason: 'stop',
    };
  }

  /**
   * 设置特定请求的响应
   */
  setResponse(prompt: string, response: MockLLMResponse): void {
    this.responses.set(prompt, response);
  }

  /**
   * 设置默认响应
   */
  setDefaultResponse(response: MockLLMResponse): void {
    this.defaultResponse = response;
  }

  /**
   * 获取调用历史
   */
  getCallHistory(): MockLLMRequest[] {
    return [...this.callHistory];
  }

  /**
   * 清空调用历史
   */
  clearHistory(): void {
    this.callHistory = [];
  }

  async complete(request: MockLLMRequest): Promise<MockLLMResponse> {
    this.callHistory.push(request);

    const prompt = Array.isArray(request.messages)
      ? request.messages.map((m) => m.content).join('\n')
      : '';

    const response = this.responses.get(prompt) || this.defaultResponse;
    return { ...response };
  }

  async *stream(request: MockLLMRequest): AsyncGenerator<MockLLMStreamChunk> {
    this.callHistory.push(request);

    const response = this.defaultResponse;

    // 模拟流式响应
    const content = response.content || '';
    const words = content.split(' ');

    for (let i = 0; i < words.length; i++) {
      yield {
        id: response.id,
        delta: {
          content: i === 0 ? words[i] : ' ' + words[i],
        },
        model: response.model,
      };
    }

    yield {
      id: response.id,
      delta: {},
      finishReason: 'stop',
      model: response.model,
      usage: response.usage,
    };
  }

  getName(): string {
    return 'mock-llm-service';
  }
}

/**
 * 创建 Mock LLM 服务
 */
export function createMockLLMService(): MockLLMService {
  return new MockLLMService();
}

/**
 * Mock 工具服务
 */
export class MockToolService {
  private tools: Map<string, any> = new Map();
  private executionHistory: Array<{ toolId: string; params: any; result: any }> = [];

  /**
   * 注册工具
   */
  registerTool(toolId: string, handler: (params: any) => any): void {
    this.tools.set(toolId, handler);
  }

  /**
   * 执行工具
   */
  async execute(toolId: string, params: any): Promise<any> {
    const handler = this.tools.get(toolId);

    if (!handler) {
      throw new Error(`Tool not found: ${toolId}`);
    }

    const result = await handler(params);
    this.executionHistory.push({ toolId, params, result });
    return result;
  }

  /**
   * 获取执行历史
   */
  getExecutionHistory(): Array<{ toolId: string; params: any; result: any }> {
    return [...this.executionHistory];
  }

  /**
   * 清空历史
   */
  clearHistory(): void {
    this.executionHistory = [];
  }
}

/**
 * 创建 Mock 工具服务
 */
export function createMockToolService(): MockToolService {
  return new MockToolService();
}

/**
 * Mock 事件管理器
 */
export class MockEventManager {
  private events: Array<{ type: string; data: any; timestamp: number }> = [];
  private listeners: Map<string, Array<(data: any) => void>> = new Map();

  /**
   * 触发事件
   */
  emit(type: string, data: any): void {
    this.events.push({
      type,
      data,
      timestamp: Date.now(),
    });

    const listeners = this.listeners.get(type);
    if (listeners) {
      for (const listener of listeners) {
        listener(data);
      }
    }
  }

  /**
   * 订阅事件
   */
  on(type: string, listener: (data: any) => void): void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(listener);
  }

  /**
   * 取消订阅
   */
  off(type: string, listener: (data: any) => void): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index !== -1) {
        listeners.splice(index, 1);
      }
    }
  }

  /**
   * 获取所有事件
   */
  getEvents(): Array<{ type: string; data: any; timestamp: number }> {
    return [...this.events];
  }

  /**
   * 获取特定类型的事件
   */
  getEventsByType(type: string): Array<{ data: any; timestamp: number }> {
    return this.events.filter((e) => e.type === type).map((e) => ({ data: e.data, timestamp: e.timestamp }));
  }

  /**
   * 清空事件
   */
  clear(): void {
    this.events = [];
  }
}

/**
 * 创建 Mock 事件管理器
 */
export function createMockEventManager(): MockEventManager {
  return new MockEventManager();
}

/**
 * Mock 检查点存储
 */
export class MockCheckpointStorage {
  private checkpoints: Map<string, any> = new Map();

  /**
   * 保存检查点
   */
  async save(checkpointId: string, data: any): Promise<void> {
    this.checkpoints.set(checkpointId, {
      ...data,
      savedAt: Date.now(),
    });
  }

  /**
   * 加载检查点
   */
  async load(checkpointId: string): Promise<any | undefined> {
    return this.checkpoints.get(checkpointId);
  }

  /**
   * 删除检查点
   */
  async delete(checkpointId: string): Promise<boolean> {
    return this.checkpoints.delete(checkpointId);
  }

  /**
   * 列出所有检查点
   */
  list(): string[] {
    return Array.from(this.checkpoints.keys());
  }

  /**
   * 清空所有检查点
   */
  clear(): void {
    this.checkpoints.clear();
  }
}

/**
 * 创建 Mock 检查点存储
 */
export function createMockCheckpointStorage(): MockCheckpointStorage {
  return new MockCheckpointStorage();
}

/**
 * 创建 Mock DI 容器
 */
export function createMockContainer(): Map<string, any> {
  return new Map();
}

/**
 * Mock 工作流注册表
 * 简化版本，用于测试
 */
export class MockWorkflowRegistry {
  private workflows: Map<string, any> = new Map();

  register(workflow: any): void {
    this.workflows.set(workflow.id, workflow);
  }

  get(workflowId: string): any | undefined {
    return this.workflows.get(workflowId);
  }

  has(workflowId: string): boolean {
    return this.workflows.has(workflowId);
  }

  unregister(workflowId: string): boolean {
    return this.workflows.delete(workflowId);
  }

  clear(): void {
    this.workflows.clear();
  }

  list(): string[] {
    return Array.from(this.workflows.keys());
  }
}

/**
 * 创建 Mock 工作流注册表
 */
export function createMockWorkflowRegistry(): MockWorkflowRegistry {
  return new MockWorkflowRegistry();
}

/**
 * Mock 图注册表
 */
export class MockGraphRegistry {
  private graphs: Map<string, any> = new Map();

  register(graph: any): void {
    this.graphs.set(graph.workflowId, graph);
  }

  get(workflowId: string): any | undefined {
    return this.graphs.get(workflowId);
  }

  has(workflowId: string): boolean {
    return this.graphs.has(workflowId);
  }

  unregister(workflowId: string): boolean {
    return this.graphs.delete(workflowId);
  }

  clear(): void {
    this.graphs.clear();
  }
}

/**
 * 创建 Mock 图注册表
 */
export function createMockGraphRegistry(): MockGraphRegistry {
  return new MockGraphRegistry();
}

/**
 * Mock 线程注册表
 */
export class MockThreadRegistry {
  private threads: Map<string, any> = new Map();

  register(thread: any): void {
    this.threads.set(thread.id, thread);
  }

  get(threadId: string): any | undefined {
    return this.threads.get(threadId);
  }

  has(threadId: string): boolean {
    return this.threads.has(threadId);
  }

  unregister(threadId: string): boolean {
    return this.threads.delete(threadId);
  }

  clear(): void {
    this.threads.clear();
  }

  list(): string[] {
    return Array.from(this.threads.keys());
  }
}

/**
 * 创建 Mock 线程注册表
 */
export function createMockThreadRegistry(): MockThreadRegistry {
  return new MockThreadRegistry();
}
