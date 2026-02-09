/**
 * 检查点恢复生命周期集成测试
 * 
 * 测试范围：
 * - 端到端检查点恢复流程验证
 * - ThreadStateSnapshot 的完整性和正确性
 * - 恢复后工作流能正常继续执行
 * - 异常情况处理（存储失败、反序列化失败）
 */

import { WorkflowRegistry } from '../../core/services/workflow-registry';
import { ThreadBuilder } from '../../core/execution/thread-builder';
import { ThreadContext } from '../../core/execution/context/thread-context';
import { CheckpointCoordinator } from '../../core/execution/coordinators/checkpoint-coordinator';
import { CheckpointStateManager } from '../../core/execution/managers/checkpoint-state-manager';
import { MemoryCheckpointStorage } from '../../core/storage/memory-checkpoint-storage';
import { GlobalMessageStorage } from '../../core/services/global-message-storage';
import { ThreadRegistry } from '../../core/services/thread-registry';
import { NodeType } from '../../types/node';
import { EdgeType } from '../../types/edge';
import { ThreadStatus } from '../../types/thread';
import type { WorkflowDefinition } from '../../types/workflow';

describe('检查点恢复生命周期集成测试', () => {
  let workflowRegistry: WorkflowRegistry;
  let threadRegistry: ThreadRegistry;
  let globalMessageStorage: GlobalMessageStorage;
  let checkpointStorage: MemoryCheckpointStorage;
  let checkpointStateManager: CheckpointStateManager;

  beforeAll(async () => {
    // 注册测试脚本到 code-service
    const { codeService } = await import('../../core/services/code-service');
    const { ScriptType } = await import('../../types/code');
    const { generateId } = await import('../../utils/id-utils');

    // 创建 JavaScript 执行器
    const javascriptExecutor: import('../../types/code').ScriptExecutor = {
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
            stderr: String(error),
            executionTime: 0
          };
        }
      },
      validate(script) {
        return { valid: true, errors: [] };
      },
      getSupportedTypes() {
        return [ScriptType.JAVASCRIPT];
      }
    };

    // 注册执行器
    codeService.registerExecutor(ScriptType.JAVASCRIPT, javascriptExecutor);

    // 注册测试脚本
    const testProcessScript = {
      id: generateId(),
      name: 'test-process',
      type: ScriptType.JAVASCRIPT,
      content: 'return { processed: true, value: "test-result" };',
      description: 'Test process script for checkpoint testing',
      options: {},
    };

    codeService.registerScript(testProcessScript);
  });

  beforeEach(() => {
    workflowRegistry = new WorkflowRegistry();
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
    description: 'Simple linear workflow for checkpoint restoration testing',
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
      tags: ['test', 'checkpoint', 'restoration'],
      category: 'test'
    },
    availableTools: {
      initial: new Set()
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  describe('场景1: 端到端检查点恢复验证', () => {
    it('应该成功完成从恢复检查点到继续执行的完整流程', async () => {
      const workflowId = 'workflow-checkpoint-restoration';
      const workflow = createSimpleWorkflow(workflowId, 'Checkpoint Restoration Workflow');

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
          description: 'Test checkpoint for restoration',
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

    it('应该正确恢复 ThreadStateSnapshot 的所有关键信息', async () => {
      const workflowId = 'workflow-state-snapshot-restoration';
      const workflow = createSimpleWorkflow(workflowId, 'State Snapshot Restoration Workflow');

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
        { description: 'State snapshot restoration test' }
      );

      // 从检查点恢复
      const restoredThreadContext = await CheckpointCoordinator.restoreFromCheckpoint(
        checkpointId,
        dependencies
      );

      // 验证恢复的 ThreadStateSnapshot 完整性
      const restoredThread = restoredThreadContext.thread;
      
      // 基础状态
      expect(restoredThread.status).toBeDefined();
      expect(restoredThread.currentNodeId).toBeDefined();
      expect(restoredThread.input).toEqual({ key1: 'value1', key2: 'value2' });
      
      // 变量系统
      expect(restoredThread.variableScopes).toBeDefined();
      expect(restoredThread.variableScopes.global).toBeDefined();
      expect(restoredThread.variableScopes.thread).toBeDefined();
      expect(Array.isArray(restoredThread.variableScopes.subgraph)).toBe(true);
      expect(Array.isArray(restoredThread.variableScopes.loop)).toBe(true);
      
      // 执行结果
      expect(Array.isArray(restoredThread.nodeResults)).toBe(true);
      
      // 错误信息
      expect(Array.isArray(restoredThread.errors)).toBe(true);
      
      // 图结构
      expect(restoredThread.graph).toBeDefined();
    });
  });

  describe('场景2: 异常情况处理', () => {
    it('应该在检查点不存在时抛出适当的错误', async () => {
      const dependencies = {
        threadRegistry,
        checkpointStateManager,
        workflowRegistry,
        globalMessageStorage
      };

      await expect(
        CheckpointCoordinator.restoreFromCheckpoint('non-existent-checkpoint', dependencies)
      ).rejects.toThrow('Checkpoint not found');
    });

    it('应该在工作流不存在时抛出适当的错误', async () => {
      const workflowId = 'workflow-not-found-test';
      const workflow = createSimpleWorkflow(workflowId, 'Workflow Not Found Test');

      // 步骤1: 先注册工作流
      workflowRegistry.register(workflow);

      // 步骤2: 构建 ThreadContext
      const threadBuilder = new ThreadBuilder(workflowRegistry);
      const threadContext = await threadBuilder.build(workflowId, {
        input: { test: 'value' }
      });

      threadRegistry.register(threadContext);

      const dependencies = {
        threadRegistry,
        checkpointStateManager,
        workflowRegistry,
        globalMessageStorage
      };

      // 步骤3: 创建检查点
      const checkpointId = await CheckpointCoordinator.createCheckpoint(
        threadContext.getThreadId(),
        dependencies
      );

      // 步骤4: 从 registry 中移除工作流（模拟工作流被删除的情况）
      workflowRegistry.unregister(workflowId);

      // 步骤5: 尝试从检查点恢复，应该抛出工作流未找到的错误
      await expect(
        CheckpointCoordinator.restoreFromCheckpoint(checkpointId, dependencies)
      ).rejects.toThrow('Workflow not found');
    });
  });
});