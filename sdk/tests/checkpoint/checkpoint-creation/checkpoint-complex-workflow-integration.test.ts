/**
 * 复杂工作流结构检查点集成测试
 * 
 * 测试范围：
 * - FORK/JOIN 并行工作流的检查点处理
 * - Triggered 子工作流的检查点处理
 * - forkJoinContext 和 triggeredSubworkflowContext 的保存和恢复
 * - 父子线程关系的正确重建
 */

import { WorkflowRegistry } from '../../../core/services/workflow-registry';
import { ThreadBuilder } from '../../../core/execution/thread-builder';
import { CheckpointCoordinator } from '../../../core/execution/coordinators/checkpoint-coordinator';
import { CheckpointStateManager } from '../../../core/execution/managers/checkpoint-state-manager';
import { MemoryCheckpointStorage } from '../../../core/storage/memory-checkpoint-storage';
import { GlobalMessageStorage } from '../../../core/services/global-message-storage';
import { ThreadRegistry } from '../../../core/services/thread-registry';
import { NodeType, EdgeType } from '@modular-agent/types';
import type { WorkflowDefinition } from '@modular-agent/types';
import { getErrorMessage } from '@modular-agent/common-utils';

describe('复杂工作流结构检查点集成测试', () => {
  let workflowRegistry: WorkflowRegistry;
  let threadRegistry: ThreadRegistry;
  let globalMessageStorage: GlobalMessageStorage;
  let checkpointStorage: MemoryCheckpointStorage;
  let checkpointStateManager: CheckpointStateManager;

  beforeAll(async () => {
    // 注册测试脚本
    const { codeService } = await import('../../../core/services/code-service');
    const { ScriptType } = await import('@modular-agent/types');
    const { generateId } = await import('@modular-agent/common-utils');

    const javascriptExecutor: any = {
      async execute(script: any, options: any) {
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
            stderr: getErrorMessage(error),
            executionTime: 0,
            error: getErrorMessage(error)
          };
        }
      },
      validate(script: any) {
        try {
          if (!script.content) {
            return { valid: false, errors: ['Script content is empty'] };
          }
          eval(script.content);
          return { valid: true, errors: [] };
        } catch (error) {
          return {
            valid: false,
            errors: [getErrorMessage(error)]
          };
        }
      },
      getSupportedTypes() {
        return [ScriptType.JAVASCRIPT];
      }
    };

    codeService.registerExecutor(ScriptType.JAVASCRIPT, javascriptExecutor);

    // 注册多个测试脚本
    const scripts = ['process-branch1', 'process-branch2', 'process-main'];
    for (const scriptName of scripts) {
      if (!codeService.hasScript(scriptName)) {
        codeService.registerScript({
          id: generateId(),
          name: scriptName,
          type: ScriptType.JAVASCRIPT,
          description: `Test script for ${scriptName}`,
          content: `({ result: "${scriptName} completed", timestamp: Date.now() })`,
          options: { timeout: 5000 }
        });
      }
    }
  });

  beforeEach(() => {
    workflowRegistry = new WorkflowRegistry({
      maxRecursionDepth: 3
    });

    threadRegistry = new ThreadRegistry();
    globalMessageStorage = new GlobalMessageStorage();
    checkpointStorage = new MemoryCheckpointStorage();
    checkpointStateManager = new CheckpointStateManager(checkpointStorage);
  });

  afterEach(() => {
    threadRegistry.clear();
    globalMessageStorage.clearAll();
    checkpointStorage.clear();
  });

  /**
   * 创建 FORK/JOIN 工作流定义
   */
  const createForkJoinWorkflow = (id: string, name: string): WorkflowDefinition => {
    const { WorkflowType } = require('@modular-agent/types');
    return {
      id,
      name,
      type: WorkflowType.STANDALONE,
      version: '1.0.0',
      description: 'FORK/JOIN workflow for checkpoint testing',
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
        id: `${id}-fork`,
        type: NodeType.FORK,
        name: 'Fork',
        config: {
          forkStrategy: 'parallel',
          forkPaths: [
            { pathId: 'path1', childNodeId: `${id}-branch1` },
            { pathId: 'path2', childNodeId: `${id}-branch2` }
          ]
        },
        outgoingEdgeIds: [`${id}-edge-2`, `${id}-edge-3`],
        incomingEdgeIds: [`${id}-edge-1`]
      },
      {
        id: `${id}-branch1`,
        type: NodeType.CODE,
        name: 'Branch 1',
        config: {
          scriptName: 'process-branch1',
          scriptType: 'javascript',
          risk: 'low'
        },
        outgoingEdgeIds: [`${id}-edge-4`],
        incomingEdgeIds: [`${id}-edge-2`]
      },
      {
        id: `${id}-branch2`,
        type: NodeType.CODE,
        name: 'Branch 2',
        config: {
          scriptName: 'process-branch2',
          scriptType: 'javascript',
          risk: 'low'
        },
        outgoingEdgeIds: [`${id}-edge-5`],
        incomingEdgeIds: [`${id}-edge-3`]
      },
      {
        id: `${id}-join`,
        type: NodeType.JOIN,
        name: 'Join',
        config: {
          joinStrategy: 'ALL_COMPLETED',
          forkPathIds: ['path1', 'path2'],
          mainPathId: 'path1'
        },
        outgoingEdgeIds: [`${id}-edge-6`],
        incomingEdgeIds: [`${id}-edge-4`, `${id}-edge-5`]
      },
      {
        id: `${id}-end`,
        type: NodeType.END,
        name: 'End',
        config: {},
        outgoingEdgeIds: [],
        incomingEdgeIds: [`${id}-edge-6`]
      }
    ],
    edges: [
      {
        id: `${id}-edge-1`,
        sourceNodeId: `${id}-start`,
        targetNodeId: `${id}-fork`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-2`,
        sourceNodeId: `${id}-fork`,
        targetNodeId: `${id}-branch1`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-3`,
        sourceNodeId: `${id}-fork`,
        targetNodeId: `${id}-branch2`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-4`,
        sourceNodeId: `${id}-branch1`,
        targetNodeId: `${id}-join`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-5`,
        sourceNodeId: `${id}-branch2`,
        targetNodeId: `${id}-join`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-6`,
        sourceNodeId: `${id}-join`,
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
      tags: ['test', 'checkpoint', 'fork-join'],
      category: 'test'
    },
    availableTools: {
      initial: new Set()
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
    };
  };

  /**
   * 创建包含 Triggered 子工作流的工作流定义
   */
  const createTriggeredSubworkflowWorkflow = (id: string, name: string): WorkflowDefinition => {
    const { WorkflowType } = require('@modular-agent/types');
    return {
      id,
      name,
      type: WorkflowType.STANDALONE,
      version: '1.0.0',
      description: 'Workflow with triggered subworkflow for checkpoint testing',
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
        id: `${id}-main-process`,
        type: NodeType.CODE,
        name: 'Main Process',
        config: {
          scriptName: 'process-main',
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
        targetNodeId: `${id}-main-process`,
        type: EdgeType.DEFAULT
      },
      {
        id: `${id}-edge-2`,
        sourceNodeId: `${id}-main-process`,
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
      tags: ['test', 'checkpoint', 'triggered-subworkflow'],
      category: 'test'
    },
    availableTools: {
      initial: new Set()
    },
    createdAt: Date.now(),
    updatedAt: Date.now()
    };
  };

  describe('场景1: FORK/JOIN 工作流检查点处理', () => {
    it('应该正确保存和恢复 forkJoinContext', async () => {
      const workflowId = 'workflow-fork-join';
      const workflow = createForkJoinWorkflow(workflowId, 'Fork/Join Workflow');

      workflowRegistry.register(workflow);

      const threadBuilder = new ThreadBuilder(workflowRegistry);
      const threadContext = await threadBuilder.build(workflowId);

      threadRegistry.register(threadContext);

      // 模拟设置 forkJoinContext（在 FORK 节点执行后）
      threadContext.setForkId(`${workflowId}-fork-join`);
      threadContext.setForkPathId('path1');

      const dependencies = {
        threadRegistry,
        checkpointStateManager,
        workflowRegistry,
        globalMessageStorage
      };

      // 创建检查点
      const checkpointId = await CheckpointCoordinator.createCheckpoint(
        threadContext.getThreadId(),
        dependencies,
        {
          description: 'Checkpoint after FORK node',
          creator: 'test-user'
        }
      );

      // 验证检查点创建成功
      expect(checkpointId).toBeDefined();
      expect(await checkpointStorage.exists(checkpointId)).toBe(true);

      // 从检查点恢复
      const restoredThreadContext = await CheckpointCoordinator.restoreFromCheckpoint(
        checkpointId,
        dependencies
      );

      // 验证 forkJoinContext 正确恢复
      expect(restoredThreadContext.thread.forkJoinContext).toBeDefined();
      expect(restoredThreadContext.thread.forkJoinContext?.forkId).toBe(`${workflowId}-fork-join`);
      expect(restoredThreadContext.thread.forkJoinContext?.forkPathId).toBe('path1');

      // 验证 ThreadContext 的 forkId 和 forkPathId 也正确设置
      expect(restoredThreadContext.getForkId()).toBe(`${workflowId}-fork-join`);
      expect(restoredThreadContext.getForkPathId()).toBe('path1');
    });

    it('应该在恢复后能正确继续并行执行', async () => {
      const workflowId = 'workflow-fork-join-continue';
      const workflow = createForkJoinWorkflow(workflowId, 'Fork/Join Continue Workflow');

      workflowRegistry.register(workflow);

      const threadBuilder = new ThreadBuilder(workflowRegistry);
      const threadContext = await threadBuilder.build(workflowId);

      threadRegistry.register(threadContext);

      // 设置 forkJoinContext
      threadContext.setForkId(`${workflowId}-fork-join`);
      threadContext.setForkPathId('path1');

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

      // 恢复检查点
      const restoredThreadContext = await CheckpointCoordinator.restoreFromCheckpoint(
        checkpointId,
        dependencies
      );

      // 验证恢复的 ThreadContext 状态正确
      expect(restoredThreadContext.getThreadId()).toBe(threadContext.getThreadId());
      expect(restoredThreadContext.getWorkflowId()).toBe(workflowId);
      expect(restoredThreadContext.getForkId()).toBe(`${workflowId}-fork-join`);
      expect(restoredThreadContext.getForkPathId()).toBe('path1');

      // 验证 Thread 状态
      expect(restoredThreadContext.thread.status).toBe(threadContext.thread.status);
      expect(restoredThreadContext.thread.currentNodeId).toBe(threadContext.thread.currentNodeId);

      // 验证图引用正确
      expect(restoredThreadContext.thread.graph).toBeDefined();
      expect(restoredThreadContext.thread.graph).toBe(threadContext.thread.graph);
    });
  });

  describe('场景2: Triggered 子工作流检查点处理', () => {
    it('应该正确保存和恢复 triggeredSubworkflowContext', async () => {
      const workflowId = 'workflow-triggered-subworkflow';
      const workflow = createTriggeredSubworkflowWorkflow(workflowId, 'Triggered Subworkflow Workflow');

      workflowRegistry.register(workflow);

      const threadBuilder = new ThreadBuilder(workflowRegistry);
      const threadContext = await threadBuilder.build(workflowId);

      threadRegistry.register(threadContext);

      // 模拟设置 triggeredSubworkflowContext（在触发子工作流后）
      const parentThreadId = threadContext.getThreadId();
      const childThreadId = `child-thread-${Date.now()}`;

      threadContext.setParentThreadId(parentThreadId);
      threadContext.setTriggeredSubworkflowId('subworkflow-1');

      // 模拟子线程ID列表
      threadContext.thread.triggeredSubworkflowContext = {
        parentThreadId,
        childThreadIds: [childThreadId],
        triggeredSubworkflowId: 'subworkflow-1'
      };

      const dependencies = {
        threadRegistry,
        checkpointStateManager,
        workflowRegistry,
        globalMessageStorage
      };

      // 创建检查点
      const checkpointId = await CheckpointCoordinator.createCheckpoint(
        threadContext.getThreadId(),
        dependencies,
        {
          description: 'Checkpoint with triggered subworkflow',
          creator: 'test-user'
        }
      );

      // 验证检查点创建成功
      expect(checkpointId).toBeDefined();
      expect(await checkpointStorage.exists(checkpointId)).toBe(true);

      // 从检查点恢复
      const restoredThreadContext = await CheckpointCoordinator.restoreFromCheckpoint(
        checkpointId,
        dependencies
      );

      // 验证 triggeredSubworkflowContext 正确恢复
      expect(restoredThreadContext.thread.triggeredSubworkflowContext).toBeDefined();
      expect(restoredThreadContext.thread.triggeredSubworkflowContext?.parentThreadId).toBe(parentThreadId);
      expect(restoredThreadContext.thread.triggeredSubworkflowContext?.childThreadIds).toEqual([childThreadId]);
      expect(restoredThreadContext.thread.triggeredSubworkflowContext?.triggeredSubworkflowId).toBe('subworkflow-1');

      // 验证 ThreadContext 的父子关系也正确设置
      expect(restoredThreadContext.getParentThreadId()).toBe(parentThreadId);
      expect(restoredThreadContext.getTriggeredSubworkflowId()).toBe('subworkflow-1');
    });

    it('应该正确重建父子线程关系', async () => {
      const workflowId = 'workflow-parent-child';
      const workflow = createTriggeredSubworkflowWorkflow(workflowId, 'Parent-Child Workflow');

      workflowRegistry.register(workflow);

      const threadBuilder = new ThreadBuilder(workflowRegistry);
      const parentThreadContext = await threadBuilder.build(workflowId);

      threadRegistry.register(parentThreadContext);

      // 创建子工作流
      const childWorkflowId = 'child-workflow';
      const childWorkflow = createTriggeredSubworkflowWorkflow(childWorkflowId, 'Child Workflow');
      workflowRegistry.register(childWorkflow);

      const childThreadContext = await threadBuilder.build(childWorkflowId);

      // 设置父子关系
      childThreadContext.setParentThreadId(parentThreadContext.getThreadId());
      parentThreadContext.thread.triggeredSubworkflowContext = {
        parentThreadId: parentThreadContext.getThreadId(),
        childThreadIds: [childThreadContext.getThreadId()],
        triggeredSubworkflowId: childWorkflowId
      };

      threadRegistry.register(childThreadContext);

      const dependencies = {
        threadRegistry,
        checkpointStateManager,
        workflowRegistry,
        globalMessageStorage
      };

      // 创建父线程检查点
      const parentCheckpointId = await CheckpointCoordinator.createCheckpoint(
        parentThreadContext.getThreadId(),
        dependencies
      );

      // 创建子线程检查点
      const childCheckpointId = await CheckpointCoordinator.createCheckpoint(
        childThreadContext.getThreadId(),
        dependencies
      );

      // 验证两个检查点都创建成功
      expect(await checkpointStorage.exists(parentCheckpointId)).toBe(true);
      expect(await checkpointStorage.exists(childCheckpointId)).toBe(true);

      // 恢复父线程
      const restoredParentContext = await CheckpointCoordinator.restoreFromCheckpoint(
        parentCheckpointId,
        dependencies
      );

      // 验证父线程的子线程ID列表正确
      expect(restoredParentContext.thread.triggeredSubworkflowContext?.childThreadIds).toEqual([
        childThreadContext.getThreadId()
      ]);

      // 验证父线程已注册到 ThreadRegistry
      expect(threadRegistry.has(restoredParentContext.getThreadId())).toBe(true);
    });
  });

  describe('场景3: 复杂嵌套场景', () => {
    it('应该正确处理包含多个复杂上下文的检查点', async () => {
      const workflowId = 'workflow-complex-nested';
      const workflow = createForkJoinWorkflow(workflowId, 'Complex Nested Workflow');

      workflowRegistry.register(workflow);

      const threadBuilder = new ThreadBuilder(workflowRegistry);
      const threadContext = await threadBuilder.build(workflowId);

      threadRegistry.register(threadContext);

      // 同时设置 forkJoinContext 和 triggeredSubworkflowContext
      threadContext.setForkId(`${workflowId}-fork-join`);
      threadContext.setForkPathId('path1');

      const childThreadId = `child-thread-${Date.now()}`;
      threadContext.setParentThreadId(threadContext.getThreadId());
      threadContext.setTriggeredSubworkflowId('subworkflow-1');

      threadContext.thread.triggeredSubworkflowContext = {
        parentThreadId: threadContext.getThreadId(),
        childThreadIds: [childThreadId],
        triggeredSubworkflowId: 'subworkflow-1'
      };

      const dependencies = {
        threadRegistry,
        checkpointStateManager,
        workflowRegistry,
        globalMessageStorage
      };

      // 创建检查点
      const checkpointId = await CheckpointCoordinator.createCheckpoint(
        threadContext.getThreadId(),
        dependencies,
        {
          description: 'Complex nested checkpoint',
          creator: 'test-user'
        }
      );

      // 验证检查点创建成功
      expect(checkpointId).toBeDefined();
      expect(await checkpointStorage.exists(checkpointId)).toBe(true);

      // 从检查点恢复
      const restoredThreadContext = await CheckpointCoordinator.restoreFromCheckpoint(
        checkpointId,
        dependencies
      );

      // 验证所有上下文都正确恢复
      expect(restoredThreadContext.thread.forkJoinContext).toBeDefined();
      expect(restoredThreadContext.thread.forkJoinContext?.forkId).toBe(`${workflowId}-fork-join`);
      expect(restoredThreadContext.thread.forkJoinContext?.forkPathId).toBe('path1');

      expect(restoredThreadContext.thread.triggeredSubworkflowContext).toBeDefined();
      expect(restoredThreadContext.thread.triggeredSubworkflowContext?.parentThreadId).toBe(threadContext.getThreadId());
      expect(restoredThreadContext.thread.triggeredSubworkflowContext?.childThreadIds).toEqual([childThreadId]);
      expect(restoredThreadContext.thread.triggeredSubworkflowContext?.triggeredSubworkflowId).toBe('subworkflow-1');

      // 验证 ThreadContext 的所有方法都返回正确的值
      expect(restoredThreadContext.getForkId()).toBe(`${workflowId}-fork-join`);
      expect(restoredThreadContext.getForkPathId()).toBe('path1');
      expect(restoredThreadContext.getParentThreadId()).toBe(threadContext.getThreadId());
      expect(restoredThreadContext.getTriggeredSubworkflowId()).toBe('subworkflow-1');
    });
  });
});