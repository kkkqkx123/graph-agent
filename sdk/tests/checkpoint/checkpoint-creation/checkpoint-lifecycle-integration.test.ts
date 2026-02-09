/**
 * 检查点生命周期集成测试
 * 
 * 测试范围：
 * - 端到端检查点创建和恢复流程
 * - ThreadStateSnapshot 的完整性和正确性
 * - 检查点恢复后工作流能正常继续执行
 */

import { WorkflowRegistry } from '../../../core/services/workflow-registry';
import { ThreadBuilder } from '../../../core/execution/thread-builder';
import { ThreadContext } from '../../../core/execution/context/thread-context';
import { CheckpointCoordinator } from '../../../core/execution/coordinators/checkpoint-coordinator';
import { CheckpointStateManager } from '../../../core/execution/managers/checkpoint-state-manager';
import { MemoryCheckpointStorage } from '../../../core/storage/memory-checkpoint-storage';
import { GlobalMessageStorage } from '../../../core/services/global-message-storage';
import { ThreadRegistry } from '../../../core/services/thread-registry';
import { NodeType } from '../../../types/node';
import { EdgeType } from '../../../types/edge';
import { ThreadStatus } from '../../../types/thread';
import type { WorkflowDefinition } from '../../../types/workflow';

describe('检查点生命周期集成测试', () => {
  let workflowRegistry: WorkflowRegistry;
  let threadRegistry: ThreadRegistry;
  let globalMessageStorage: GlobalMessageStorage;
  let checkpointStorage: MemoryCheckpointStorage;
  let checkpointStateManager: CheckpointStateManager;

  beforeAll(async () => {
    // 注册测试脚本到 code-service
    const { codeService } = await import('../../../core/services/code-service');
    const { ScriptType } = await import('../../../types/code');
    const { generateId } = await import('../../../utils/id-utils');

    // 创建 JavaScript 执行器
    const javascriptExecutor: import('../../../types/code').ScriptExecutor = {
      async execute(script, options) {
        try {
          const result = eval(script.content || '');
          return {
            success: true,
            scriptName: script.name,
            scriptType: script.type,
            stdout: JSON.stringify(result),
            executionTime: 0
          };
        } catch (error) {
          return {
            success: false,
            scriptName: script.name,
            scriptType: script.type,
            stderr: error instanceof Error ? error.message : String(error),
            executionTime: 0,
            error: error instanceof Error ? error.message : String(error)
          };
        }
      },
      validate(script) {
        try {
          if (!script.content) {
            return { valid: false, errors: ['Script content is empty'] };
          }
          eval(script.content);
          return { valid: true, errors: [] };
        } catch (error) {
          return {
            valid: false,
            errors: [error instanceof Error ? error.message : 'Invalid script syntax']
          };
        }
      },
      getSupportedTypes() {
        return [ScriptType.JAVASCRIPT];
      }
    };

    // 注册 JavaScript 执行器
    codeService.registerExecutor(ScriptType.JAVASCRIPT, javascriptExecutor);

    // 注册测试脚本
    if (!codeService.hasScript('test-process')) {
      codeService.registerScript({
        id: generateId(),
        name: 'test-process',
        type: ScriptType.JAVASCRIPT,
        description: 'Test script for checkpoint integration',
        content: '({ result: "process completed", timestamp: Date.now() })',
        options: { timeout: 5000 }
      });
    }
  });

  beforeEach(() => {
    // 创建新的实例以避免测试间干扰
    workflowRegistry = new WorkflowRegistry({
      maxRecursionDepth: 3
    });

    threadRegistry = new ThreadRegistry();
    globalMessageStorage = new GlobalMessageStorage();
    checkpointStorage = new MemoryCheckpointStorage();
    checkpointStateManager = new CheckpointStateManager(checkpointStorage);
  });

  afterEach(() => {
    // 清理资源
    threadRegistry.clear();
    globalMessageStorage.clearAll();
    checkpointStorage.clear();
  });

  /**
   * 创建简单线性工作流定义
   */
  const createSimpleWorkflow = (id: string, name: string): WorkflowDefinition => ({
    id,
    name,
    version: '1.0.0',
    description: 'Simple linear workflow for checkpoint testing',
    nodes: [
      {
        id: `${id}-start`,
        type: NodeType.START,
        name: 'Start',
        config: {},
        outgoingEdgeIds: [`${id}-edge-1`],
        incomingEdgeIds: []
      },
      {
        id: `${id}-process`,
        type: NodeType.CODE,
        name: 'Process',
        config: {
          scriptName: 'test-process',
          scriptType: 'javascript',
          risk: 'low'
        },
        outgoingEdgeIds: [`${id}-edge-2`],
        incomingEdgeIds: [`${id}-edge-1`]
      },
      {
        id: `${id}-end`,
        type: NodeType.END,
        name: 'End',
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: [`${id}-edge-2`]
      }
    ],
    edges: [
      {
        id: `${id}-edge-1`,
        sourceNodeId: `${id}-start`,
        targetNodeId: `${id}-process`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-2`,
        sourceNodeId: `${id}-process`,
        targetNodeId: `${id}-end`,
        type: EdgeType.DEFAULT
      }
    ],
    variables: [],
    triggers: [],
    config: {
      timeout: 60000,
      maxSteps: 1000,
      toolApproval: {
        autoApprovedTools: []
      }
    },
    metadata: {
      author: 'test-author',
      tags: ['test', 'checkpoint'],
      category: 'test'
    },
    availableTools: {
      initial: new Set()
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  describe('场景1: 端到端检查点生命周期验证', () => {
    it('应该成功完成从创建检查点到恢复并继续执行的完整流程', async () => {
      const workflowId = 'workflow-checkpoint-lifecycle';
      const workflow = createSimpleWorkflow(workflowId, 'Checkpoint Lifecycle Workflow');

      // 步骤1: 注册工作流
      workflowRegistry.register(workflow);

      // 步骤2: 构建 ThreadContext
      const threadBuilder = new ThreadBuilder(workflowRegistry);
      const threadContext = await threadBuilder.build(workflowId, {
        input: { testInput: 'value' }
      });

      // 步骤3: 注册到 ThreadRegistry
      threadRegistry.register(threadContext);

      // 步骤4: 手动创建检查点（模拟在 CODE 节点执行后）
      const dependencies = {
        threadRegistry,
        checkpointStateManager,
        workflowRegistry,
        globalMessageStorage
      };

      const checkpointId = await CheckpointCoordinator.createCheckpoint(
        threadContext.getThreadId(),
        dependencies,
        {
          description: 'Test checkpoint after process node',
          creator: 'test-user'
        }
      );

      // 验证检查点创建成功
      expect(checkpointId).toBeDefined();
      expect(typeof checkpointId).toBe('string');

      // 验证检查点已保存到存储
      const checkpointExists = await checkpointStorage.exists(checkpointId);
      expect(checkpointExists).toBe(true);

      // 步骤5: 从检查点恢复 ThreadContext
      const restoredThreadContext = await CheckpointCoordinator.restoreFromCheckpoint(
        checkpointId,
        dependencies
      );

      // 验证恢复的 ThreadContext
      expect(restoredThreadContext).toBeInstanceOf(ThreadContext);
      expect(restoredThreadContext.getThreadId()).toBe(threadContext.getThreadId());
      expect(restoredThreadContext.getWorkflowId()).toBe(workflowId);

      // 验证恢复的 Thread 状态
      const restoredThread = restoredThreadContext.thread;
      expect(restoredThread.status).toBe(threadContext.thread.status);
      expect(restoredThread.currentNodeId).toBe(threadContext.thread.currentNodeId);
      expect(restoredThread.input).toEqual(threadContext.thread.input);

      // 验证变量作用域已恢复
      expect(restoredThread.variableScopes).toBeDefined();
      expect(restoredThread.variableScopes.global).toBeDefined();
      expect(restoredThread.variableScopes.thread).toBeDefined();

      // 验证节点结果已恢复（从 Record 转换回 Array）
      expect(restoredThread.nodeResults).toBeInstanceOf(Array);
      expect(restoredThread.nodeResults).toEqual(threadContext.thread.nodeResults);

      // 验证 ConversationManager 已恢复
      expect(restoredThreadContext.conversationManager).toBeDefined();

      // 步骤6: 验证恢复的 ThreadContext 已注册到 ThreadRegistry
      const registeredContext = threadRegistry.get(restoredThreadContext.getThreadId());
      expect(registeredContext).toBe(restoredThreadContext);
    });

    it('应该正确保存和恢复 ThreadStateSnapshot 的所有关键信息', async () => {
      const workflowId = 'workflow-state-snapshot';
      const workflow = createSimpleWorkflow(workflowId, 'State Snapshot Workflow');

      workflowRegistry.register(workflow);

      const threadBuilder = new ThreadBuilder(workflowRegistry);
      const threadContext = await threadBuilder.build(workflowId, {
        input: { key1: 'value1', key2: 'value2' }
      });

      threadRegistry.register(threadContext);

      // 创建检查点
      const dependencies = {
        threadRegistry,
        checkpointStateManager,
        workflowRegistry,
        globalMessageStorage
      };

      const checkpointId = await CheckpointCoordinator.createCheckpoint(
        threadContext.getThreadId(),
        dependencies,
        { description: 'State snapshot test' }
      );

      // 从存储加载检查点
      const checkpointData = await checkpointStorage.load(checkpointId);
      expect(checkpointData).not.toBeNull();

      // 反序列化检查点
      const { deserializeCheckpoint } = await import('../../../core/execution/utils/checkpoint-serializer');
      const checkpoint = deserializeCheckpoint(checkpointData!);

      // 验证 ThreadStateSnapshot 的完整性
      expect(checkpoint.threadState).toBeDefined();
      expect(checkpoint.threadState.status).toBeDefined();
      expect(checkpoint.threadState.currentNodeId).toBeDefined();
      expect(checkpoint.threadState.variables).toBeDefined();
      expect(checkpoint.threadState.variableScopes).toBeDefined();
      expect(checkpoint.threadState.input).toBeDefined();
      expect(checkpoint.threadState.output).toBeDefined();
      expect(checkpoint.threadState.nodeResults).toBeDefined();
      expect(checkpoint.threadState.errors).toBeDefined();

      // 验证输入数据正确保存
      expect(checkpoint.threadState.input).toEqual({ key1: 'value1', key2: 'value2' });

      // 验证对话状态已保存
      expect(checkpoint.threadState.conversationState).toBeDefined();
      expect(checkpoint.threadState.conversationState?.markMap).toBeDefined();
      expect(checkpoint.threadState.conversationState?.tokenUsage).toBeDefined();
      expect(checkpoint.threadState.conversationState?.currentRequestUsage).toBeDefined();

      // 恢复并验证状态一致性
      const restoredContext = await CheckpointCoordinator.restoreFromCheckpoint(
        checkpointId,
        dependencies
      );

      expect(restoredContext.thread.input).toEqual(threadContext.thread.input);
      expect(restoredContext.thread.status).toBe(threadContext.thread.status);
      expect(restoredContext.thread.currentNodeId).toBe(threadContext.thread.currentNodeId);
    });

    it('应该支持多次创建和恢复检查点', async () => {
      const workflowId = 'workflow-multiple-checkpoints';
      const workflow = createSimpleWorkflow(workflowId, 'Multiple Checkpoints Workflow');

      workflowRegistry.register(workflow);

      const threadBuilder = new ThreadBuilder(workflowRegistry);
      const threadContext = await threadBuilder.build(workflowId);

      threadRegistry.register(threadContext);

      const dependencies = {
        threadRegistry,
        checkpointStateManager,
        workflowRegistry,
        globalMessageStorage
      };

      // 创建第一个检查点
      const checkpointId1 = await CheckpointCoordinator.createCheckpoint(
        threadContext.getThreadId(),
        dependencies,
        { description: 'First checkpoint' }
      );

      // 添加延迟确保时间戳不同
      await new Promise(resolve => setTimeout(resolve, 10));

      // 创建第二个检查点
      const checkpointId2 = await CheckpointCoordinator.createCheckpoint(
        threadContext.getThreadId(),
        dependencies,
        { description: 'Second checkpoint' }
      );

      // 验证两个检查点都存在
      expect(await checkpointStorage.exists(checkpointId1)).toBe(true);
      expect(await checkpointStorage.exists(checkpointId2)).toBe(true);

      // 验证检查点ID不同
      expect(checkpointId1).not.toBe(checkpointId2);

      // 列出该线程的所有检查点
      const checkpointIds = await checkpointStateManager.list({ threadId: threadContext.getThreadId() });
      expect(checkpointIds).toHaveLength(2);
      expect(checkpointIds).toContain(checkpointId1);
      expect(checkpointIds).toContain(checkpointId2);

      // 验证按时间戳降序排列（最新的在前）
      expect(checkpointIds[0]).toBe(checkpointId2);
      expect(checkpointIds[1]).toBe(checkpointId1);

      // 恢复第一个检查点
      const restoredContext1 = await CheckpointCoordinator.restoreFromCheckpoint(
        checkpointId1,
        dependencies
      );
      expect(restoredContext1.getThreadId()).toBe(threadContext.getThreadId());

      // 恢复第二个检查点
      const restoredContext2 = await CheckpointCoordinator.restoreFromCheckpoint(
        checkpointId2,
        dependencies
      );
      expect(restoredContext2.getThreadId()).toBe(threadContext.getThreadId());
    });
  });

  describe('场景2: 异常处理和边界条件', () => {
    it('应该在尝试恢复不存在的检查点时抛出错误', async () => {
      const dependencies = {
        threadRegistry,
        checkpointStateManager,
        workflowRegistry,
        globalMessageStorage
      };

      await expect(
        CheckpointCoordinator.restoreFromCheckpoint('non-existent-checkpoint-id', dependencies)
      ).rejects.toThrow('Checkpoint not found');
    });

    it('应该在检查点对应的工作流不存在时抛出错误', async () => {
      const workflowId = 'workflow-missing-test';
      const workflow = createSimpleWorkflow(workflowId, 'Missing Workflow Test');

      workflowRegistry.register(workflow);

      const threadBuilder = new ThreadBuilder(workflowRegistry);
      const threadContext = await threadBuilder.build(workflowId);

      threadRegistry.register(threadContext);

      const dependencies = {
        threadRegistry,
        checkpointStateManager,
        workflowRegistry,
        globalMessageStorage
      };

      // 创建检查点
      const checkpointId = await CheckpointCoordinator.createCheckpoint(
        threadContext.getThreadId(),
        dependencies
      );

      // 删除工作流
      workflowRegistry.unregister(workflowId);

      // 尝试恢复检查点应该失败
      await expect(
        CheckpointCoordinator.restoreFromCheckpoint(checkpointId, dependencies)
      ).rejects.toThrow('Workflow not found');
    });

    it('应该在消息历史丢失时抛出错误', async () => {
      const workflowId = 'workflow-message-missing';
      const workflow = createSimpleWorkflow(workflowId, 'Message Missing Test');

      workflowRegistry.register(workflow);

      const threadBuilder = new ThreadBuilder(workflowRegistry);
      const threadContext = await threadBuilder.build(workflowId);

      threadRegistry.register(threadContext);

      const dependencies = {
        threadRegistry,
        checkpointStateManager,
        workflowRegistry,
        globalMessageStorage
      };

      // 创建检查点
      const checkpointId = await CheckpointCoordinator.createCheckpoint(
        threadContext.getThreadId(),
        dependencies
      );

      // 清理消息历史
      globalMessageStorage.cleanupThread(threadContext.getThreadId());

      // 尝试恢复检查点应该失败
      await expect(
        CheckpointCoordinator.restoreFromCheckpoint(checkpointId, dependencies)
      ).rejects.toThrow('Message history not found');
    });
  });
});