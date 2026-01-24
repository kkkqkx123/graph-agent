/**
 * Interaction 模块集成测试
 * 
 * 测试 Node、Execution、Interaction 三个模块的集成
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Container } from 'inversify';
import { NodeId } from '../../../../domain/workflow/value-objects/node/node-id';
import { NodeType } from '../../../../domain/workflow/value-objects/node/node-type';
import { LLMNode } from '../../../../domain/workflow/entities/node/llm-node';
import { ToolNode } from '../../../../domain/workflow/entities/node/tool-node';
import { UserInteractionNode } from '../../../../domain/workflow/entities/node/user-interaction-node';
import { WorkflowExecutionContext } from '../context/execution-context';
import { NodeExecutionHandler } from '../handlers/node-execution-handler';
import { InteractionEngine } from '../../../interaction/interaction-engine-impl';
import { LLMExecutor } from '../../../interaction/executors/llm-executor';
import { ToolExecutor } from '../../../interaction/executors/tool-executor';
import { UserInteractionHandler } from '../../../interaction/executors/user-interaction-handler';
import { NodeExecutionStrategyRegistry } from '../strategies/strategy-registry';
import { LLMNodeStrategy } from '../strategies/llm-node-strategy';
import { ToolNodeStrategy } from '../strategies/tool-node-strategy';
import { UserInteractionStrategy } from '../strategies/user-interaction-strategy';
import { ILogger } from '../../../../domain/common/types/logger-types';

// Mock Logger
class MockLogger implements ILogger {
  debug(message: string, meta?: any): void {}
  info(message: string, meta?: any): void {}
  warn(message: string, meta?: any): void {}
  error(message: string, error?: Error, meta?: any): void {}
}

describe('Interaction 模块集成测试', () => {
  let container: Container;
  let nodeExecutionHandler: NodeExecutionHandler;
  let executionContext: WorkflowExecutionContext;

  beforeEach(() => {
    // 创建容器
    container = new Container();

    // 绑定 Logger
    container.bind<ILogger>('Logger').toConstantValue(new MockLogger());

    // 绑定 Interaction 模块
    container.bind<InteractionEngine>('InteractionEngine').to(InteractionEngine).inSingletonScope();
    container.bind<LLMExecutor>('LLMExecutor').to(LLMExecutor).inSingletonScope();
    container.bind<ToolExecutor>('ToolExecutor').to(ToolExecutor).inSingletonScope();
    container.bind<UserInteractionHandler>('UserInteractionHandler').to(UserInteractionHandler).inSingletonScope();

    // 绑定策略注册表
    container.bind<NodeExecutionStrategyRegistry>('NodeExecutionStrategyRegistry').to(NodeExecutionStrategyRegistry).inSingletonScope();

    // 绑定策略
    container.bind<LLMNodeStrategy>('LLMNodeStrategy').to(LLMNodeStrategy).inSingletonScope();
    container.bind<ToolNodeStrategy>('ToolNodeStrategy').to(ToolNodeStrategy).inSingletonScope();
    container.bind<UserInteractionStrategy>('UserInteractionStrategy').to(UserInteractionStrategy).inSingletonScope();

    // 初始化策略注册表
    const strategyRegistry = container.get<NodeExecutionStrategyRegistry>('NodeExecutionStrategyRegistry');
    const llmStrategy = container.get<LLMNodeStrategy>('LLMNodeStrategy');
    const toolStrategy = container.get<ToolNodeStrategy>('ToolNodeStrategy');
    const userInteractionStrategy = container.get<UserInteractionStrategy>('UserInteractionStrategy');

    strategyRegistry.register(NodeType.llm(), llmStrategy);
    strategyRegistry.register(NodeType.tool(), toolStrategy);
    strategyRegistry.register(NodeType.userInteraction(), userInteractionStrategy);

    // 绑定 NodeExecutionHandler
    container.bind<NodeExecutionHandler>('NodeExecutionHandler').to(NodeExecutionHandler).inSingletonScope();

    // 获取 NodeExecutionHandler
    nodeExecutionHandler = container.get<NodeExecutionHandler>('NodeExecutionHandler');

    // 创建执行上下文
    executionContext = new WorkflowExecutionContext(
      'test-workflow-id',
      'test-execution-id',
      'test-thread-id',
      new Map()
    );
  });

  afterEach(() => {
    container.unbindAll();
  });

  describe('LLM Node 执行', () => {
    it('应该成功执行 LLM 节点（框架测试）', async () => {
      // 创建 LLM 节点
      const nodeId = NodeId.create();
      const llmNode = LLMNode.create(
        nodeId,
        'gpt-4',
        'Hello, world!',
        'Test LLM Node',
        'Test description',
        0.7,
        1000
      );

      // 执行节点
      const result = await nodeExecutionHandler.execute(llmNode, executionContext);

      // 验证结果（当前为框架实现，预期失败）
      expect(result).toBeDefined();
      expect(result.success).toBe(false); // 框架实现尚未完成
      expect(result.error).toContain('尚未完成');
      expect(result.metadata?.nodeId).toBe(nodeId.toString());
      expect(result.metadata?.model).toBe('gpt-4');
    });

    it('应该正确处理 LLM 节点类型', async () => {
      const nodeId = NodeId.create();
      const llmNode = LLMNode.create(
        nodeId,
        'gpt-4',
        'Test prompt',
        'Test LLM Node'
      );

      const canExecute = await nodeExecutionHandler.canExecute(llmNode, executionContext);

      expect(canExecute).toBe(true);
    });
  });

  describe('Tool Node 执行', () => {
    it('应该成功执行工具节点（框架测试）', async () => {
      // 创建工具节点
      const nodeId = NodeId.create();
      const toolNode = ToolNode.create(
        nodeId,
        'test-tool',
        { param1: 'value1', param2: 'value2' },
        'Test Tool Node',
        'Test description',
        30000
      );

      // 执行节点
      const result = await nodeExecutionHandler.execute(toolNode, executionContext);

      // 验证结果（当前为框架实现，预期失败）
      expect(result).toBeDefined();
      expect(result.success).toBe(false); // 框架实现尚未完成
      expect(result.error).toContain('尚未完成');
      expect(result.metadata?.nodeId).toBe(nodeId.toString());
      expect(result.metadata?.toolId).toBe('test-tool');
    });

    it('应该正确处理工具节点类型', async () => {
      const nodeId = NodeId.create();
      const toolNode = ToolNode.create(
        nodeId,
        'test-tool',
        { param1: 'value1' },
        'Test Tool Node'
      );

      const canExecute = await nodeExecutionHandler.canExecute(toolNode, executionContext);

      expect(canExecute).toBe(true);
    });
  });

  describe('User Interaction Node 执行', () => {
    it('应该成功执行用户交互节点（框架测试）', async () => {
      // 创建用户交互节点
      const nodeId = NodeId.create();
      const userInteractionNode = UserInteractionNode.create(
        nodeId,
        'input',
        'Please enter your name:',
        undefined,
        300000,
        'Test User Interaction Node',
        'Test description'
      );

      // 执行节点
      const result = await nodeExecutionHandler.execute(userInteractionNode, executionContext);

      // 验证结果（当前为框架实现，预期失败）
      expect(result).toBeDefined();
      expect(result.success).toBe(false); // 框架实现尚未完成
      expect(result.error).toContain('尚未完成');
      expect(result.metadata?.nodeId).toBe(nodeId.toString());
      expect(result.metadata?.interactionType).toBe('input');
    });

    it('应该正确处理用户交互节点类型', async () => {
      const nodeId = NodeId.create();
      const userInteractionNode = UserInteractionNode.create(
        nodeId,
        'confirmation',
        'Do you want to continue?',
        ['yes', 'no'],
        300000,
        'Test User Interaction Node'
      );

      const canExecute = await nodeExecutionHandler.canExecute(userInteractionNode, executionContext);

      expect(canExecute).toBe(true);
    });
  });

  describe('策略注册表', () => {
    it('应该正确注册所有策略', () => {
      const strategyRegistry = container.get<NodeExecutionStrategyRegistry>('NodeExecutionStrategyRegistry');

      expect(strategyRegistry.has(NodeType.llm())).toBe(true);
      expect(strategyRegistry.has(NodeType.tool())).toBe(true);
      expect(strategyRegistry.has(NodeType.userInteraction())).toBe(true);
    });

    it('应该能够获取已注册的策略', () => {
      const strategyRegistry = container.get<NodeExecutionStrategyRegistry>('NodeExecutionStrategyRegistry');

      const llmStrategy = strategyRegistry.get(NodeType.llm());
      const toolStrategy = strategyRegistry.get(NodeType.tool());
      const userInteractionStrategy = strategyRegistry.get(NodeType.userInteraction());

      expect(llmStrategy).toBeDefined();
      expect(toolStrategy).toBeDefined();
      expect(userInteractionStrategy).toBeDefined();
    });
  });

  describe('错误处理', () => {
    it('应该正确处理未知节点类型', async () => {
      // 创建一个未知类型的节点（使用 StartNode 作为示例）
      const nodeId = NodeId.create();
      const unknownNode = {
        nodeId,
        type: NodeType.start(),
        name: 'Unknown Node',
        properties: {},
        status: { toString: () => 'pending' },
        retryStrategy: { toString: () => 'disabled' },
      } as any;

      const result = await nodeExecutionHandler.execute(unknownNode, executionContext);

      expect(result.success).toBe(false);
      expect(result.error).toContain('没有对应的执行策略');
    });
  });
});