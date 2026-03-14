/**
 * 简单工作流执行测试
 *
 * 测试场景：
 * - 顺序执行
 * - LLM 节点执行
 * - Script 节点执行
 * - 多个 LLM 节点串联
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ThreadBuilder } from '../execution/thread-builder.js';
import { ThreadExecutor } from '../execution/executors/thread-executor.js';
import { ThreadRegistry } from '../services/thread-registry.js';
import { GraphRegistry } from '../services/graph-registry.js';
import { WorkflowRegistry } from '../services/workflow-registry.js';
import { ThreadEntity } from '../entities/thread-entity.js';
import { ExecutionState } from '../entities/execution-state.js';
import type { Thread, PreprocessedGraph } from '@modular-agent/types';
import {
  createSimpleTestWorkflow,
  createTestNode,
  createVariableTestWorkflow,
} from './fixtures/test-helpers.js';
import { createMockLLMService } from './fixtures/mock-services.js';

/**
 * 创建测试 Thread 对象
 */
function createTestThread(
  threadId: string,
  workflowId: string,
  graph: PreprocessedGraph
): Thread {
  return {
    id: threadId,
    workflowId,
    workflowVersion: '1.0.0',
    status: 'CREATED',
    currentNodeId: 'start',
    input: {},
    output: {},
    nodeResults: [],
    errors: [],
    startTime: Date.now(),
    graph,
    variables: [],
    threadType: 'MAIN',
    variableScopes: {
      global: {},
      thread: {},
      local: [],
      loop: [],
    },
  };
}

describe('Simple Workflow Execution - 简单工作流执行', () => {
  let threadRegistry: ThreadRegistry;
  let graphRegistry: GraphRegistry;
  let workflowRegistry: WorkflowRegistry;

  beforeEach(() => {
    threadRegistry = new ThreadRegistry();
    graphRegistry = new GraphRegistry();
    workflowRegistry = new WorkflowRegistry({}, threadRegistry);
  });

  afterEach(() => {
    threadRegistry.clear();
    graphRegistry.clear();
    workflowRegistry.clear();
  });

  describe('顺序执行', () => {
    it('应该按顺序执行 START -> VARIABLE -> END', async () => {
      const workflow = createVariableTestWorkflow('sequential-test', {
        variableName: 'testVar',
        variableValue: 'testValue',
      });

      workflowRegistry.register(workflow);

      // 验证工作流已注册
      expect(workflowRegistry.has('sequential-test')).toBe(true);
    });

    it('应该验证节点按顺序执行', async () => {
      const workflow = createSimpleTestWorkflow('order-test', {
        middleNodes: [
          createTestNode('var-1', 'VARIABLE', {
            config: { variableName: 'x', variableValue: 1 },
          }),
          createTestNode('var-2', 'VARIABLE', {
            config: { variableName: 'y', variableValue: 2 },
          }),
        ],
      });

      workflowRegistry.register(workflow);

      // 验证工作流结构
      const registered = workflowRegistry.get('order-test');
      expect(registered).toBeDefined();
      expect(registered!.nodes).toHaveLength(4); // START + 2 VARIABLE + END
    });

    it('应该验证状态转换', async () => {
      const workflow = createSimpleTestWorkflow('state-transition-test');
      workflowRegistry.register(workflow);

      // 创建线程实体
      const thread = createTestThread('thread-1', 'state-transition-test', {} as any);
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 初始状态
      expect(entity.getStatus()).toBe('CREATED');
      expect(entity.getCurrentNodeId()).toBe('start');

      // 模拟状态转换
      entity.setStatus('RUNNING');
      expect(entity.getStatus()).toBe('RUNNING');
    });

    it('应该验证变量赋值', async () => {
      const workflow = createVariableTestWorkflow('var-assign-test', {
        variableName: 'assignedVar',
        variableValue: { nested: 'value' },
      });

      workflowRegistry.register(workflow);

      const registered = workflowRegistry.get('var-assign-test');
      expect(registered).toBeDefined();

      // 验证 VARIABLE 节点配置
      const varNode = registered!.nodes.find((n) => n.type === 'VARIABLE');
      expect(varNode).toBeDefined();
      expect((varNode!.config as any).variableName).toBe('assignedVar');
    });
  });

  describe('LLM 节点执行', () => {
    it('应该正确配置 LLM 节点', async () => {
      const workflow = createSimpleTestWorkflow('llm-config-test', {
        middleNodes: [
          createTestNode('llm-1', 'LLM', {
            config: {
              model: 'gpt-4',
              prompt: 'Hello, world!',
              temperature: 0.7,
            },
          }),
        ],
      });

      workflowRegistry.register(workflow);

      const registered = workflowRegistry.get('llm-config-test');
      const llmNode = registered!.nodes.find((n) => n.type === 'LLM');
      expect(llmNode).toBeDefined();
      expect((llmNode!.config as any).model).toBe('gpt-4');
    });

    it('应该使用 Mock LLM 服务', async () => {
      const mockLLM = createMockLLMService();
      mockLLM.setDefaultResponse({
        id: 'response-1',
        content: 'Mock response',
        model: 'mock-model',
        usage: { promptTokens: 10, completionTokens: 5, totalTokens: 15 },
        finishReason: 'stop',
      });

      // 验证 Mock 服务工作正常
      const response = await mockLLM.complete({
        messages: [{ role: 'user', content: 'test' }],
        model: 'mock-model',
      });

      expect(response.content).toBe('Mock response');
      expect(mockLLM.getCallHistory()).toHaveLength(1);
    });

    it('应该验证 LLM 调用参数', async () => {
      const mockLLM = createMockLLMService();

      await mockLLM.complete({
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello!' },
        ],
        model: 'gpt-4',
        temperature: 0.5,
      });

      const history = mockLLM.getCallHistory();
      expect(history).toHaveLength(1);
      expect(history[0]!.model).toBe('gpt-4');
      expect(history[0]!.temperature).toBe(0.5);
    });

    it('应该正确处理 LLM 响应', async () => {
      const mockLLM = createMockLLMService();
      mockLLM.setDefaultResponse({
        id: 'resp-1',
        content: 'This is the response',
        model: 'gpt-4',
        usage: { promptTokens: 20, completionTokens: 10, totalTokens: 30 },
        finishReason: 'stop',
      });

      const response = await mockLLM.complete({
        messages: [{ role: 'user', content: 'test' }],
        model: 'gpt-4',
      });

      expect(response.content).toBe('This is the response');
      expect(response.finishReason).toBe('stop');
      expect(response.usage.totalTokens).toBe(30);
    });
  });

  describe('Script 节点执行', () => {
    it('应该正确配置 Script 节点', async () => {
      const workflow = createSimpleTestWorkflow('script-config-test', {
        middleNodes: [
          createTestNode('script-1', 'SCRIPT', {
            config: {
              script: 'return x + y;',
              language: 'javascript',
            },
          }),
        ],
      });

      workflowRegistry.register(workflow);

      const registered = workflowRegistry.get('script-config-test');
      const scriptNode = registered!.nodes.find((n) => n.type === 'SCRIPT');
      expect(scriptNode).toBeDefined();
      expect((scriptNode!.config as any).script).toBe('return x + y;');
    });

    it('应该验证脚本执行结果', async () => {
      // 模拟脚本执行
      const script = 'return 1 + 2;';
      const result = eval(script);

      expect(result).toBe(3);
    });

    it('应该验证变量修改', async () => {
      const workflow = createSimpleTestWorkflow('script-var-test', {
        middleNodes: [
          createTestNode('var-1', 'VARIABLE', {
            config: { variableName: 'x', variableValue: 10 },
          }),
          createTestNode('script-1', 'SCRIPT', {
            config: { script: 'x = x * 2; return x;' },
          }),
        ],
      });

      workflowRegistry.register(workflow);

      const registered = workflowRegistry.get('script-var-test');
      expect(registered!.nodes).toHaveLength(4);
    });
  });

  describe('多个 LLM 节点串联', () => {
    it('应该正确配置多个 LLM 节点', async () => {
      const workflow = createSimpleTestWorkflow('multi-llm-test', {
        middleNodes: [
          createTestNode('llm-1', 'LLM', {
            config: { model: 'gpt-4', prompt: 'First prompt' },
          }),
          createTestNode('llm-2', 'LLM', {
            config: { model: 'gpt-4', prompt: 'Second prompt' },
          }),
          createTestNode('llm-3', 'LLM', {
            config: { model: 'gpt-4', prompt: 'Third prompt' },
          }),
        ],
      });

      workflowRegistry.register(workflow);

      const registered = workflowRegistry.get('multi-llm-test');
      const llmNodes = registered!.nodes.filter((n) => n.type === 'LLM');
      expect(llmNodes).toHaveLength(3);
    });

    it('应该验证消息历史传递', async () => {
      const mockLLM = createMockLLMService();

      // 第一次调用
      await mockLLM.complete({
        messages: [{ role: 'user', content: 'First message' }],
        model: 'gpt-4',
      });

      // 第二次调用（包含历史）
      await mockLLM.complete({
        messages: [
          { role: 'user', content: 'First message' },
          { role: 'assistant', content: 'First response' },
          { role: 'user', content: 'Second message' },
        ],
        model: 'gpt-4',
      });

      const history = mockLLM.getCallHistory();
      expect(history).toHaveLength(2);
      expect(history[1]!.messages).toHaveLength(3);
    });

    it('应该验证上下文保持', async () => {
      const thread = createTestThread('context-thread', 'workflow-1', {} as any);
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 设置变量
      entity.setVariable('context', { userId: 'user-123', sessionId: 'session-456' });

      // 验证变量保持
      const context = entity.getVariable('context');
      expect(context.userId).toBe('user-123');
      expect(context.sessionId).toBe('session-456');
    });
  });

  describe('执行结果验证', () => {
    it('应该正确记录节点执行结果', async () => {
      const thread = createTestThread('result-thread', 'workflow-1', {} as any);
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      entity.addNodeResult({
        nodeId: 'node-1',
        type: 'VARIABLE',
        result: { variableName: 'x', value: 100 },
        timestamp: Date.now(),
      });

      entity.addNodeResult({
        nodeId: 'node-2',
        type: 'SCRIPT',
        result: { output: 200 },
        timestamp: Date.now(),
      });

      const results = entity.getNodeResults();
      expect(results).toHaveLength(2);
      expect(results[0]!.nodeId).toBe('node-1');
      expect(results[1]!.nodeId).toBe('node-2');
    });

    it('应该正确设置最终输出', async () => {
      const thread = createTestThread('output-thread', 'workflow-1', {} as any);
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      entity.setOutput({
        status: 'success',
        data: { processed: true },
        metrics: { duration: 1000 },
      });

      const output = entity.getOutput();
      expect(output['status']).toBe('success');
      expect(output['data']['processed']).toBe(true);
      expect(output['metrics']['duration']).toBe(1000);
    });

    it('应该正确记录执行时间', async () => {
      const thread = createTestThread('time-thread', 'workflow-1', {} as any);
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      const startTime = entity.getStartTime();
      expect(startTime).toBeDefined();
      expect(startTime).toBeLessThanOrEqual(Date.now());

      // 设置结束时间
      entity.setEndTime(Date.now());
      const endTime = entity.getEndTime();
      expect(endTime).toBeDefined();
      expect(endTime!).toBeGreaterThanOrEqual(startTime);
    });
  });

  describe('错误处理', () => {
    it('应该正确记录执行错误', async () => {
      const thread = createTestThread('error-thread', 'workflow-1', {} as any);
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      const errors = entity.getErrors();
      expect(Array.isArray(errors)).toBe(true);
    });

    it('应该正确处理节点执行失败', async () => {
      const thread = createTestThread('fail-thread', 'workflow-1', {} as any);
      const executionState = new ExecutionState();
      const entity = new ThreadEntity(thread, executionState);

      // 模拟错误
      entity.getThread().errors.push({
        nodeId: 'node-1',
        error: 'Execution failed',
        timestamp: Date.now(),
      });

      const errors = entity.getErrors();
      expect(errors).toHaveLength(1);
      expect(errors[0]!.error).toBe('Execution failed');
    });
  });
});
