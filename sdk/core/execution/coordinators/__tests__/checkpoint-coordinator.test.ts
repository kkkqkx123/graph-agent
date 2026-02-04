/**
 * CheckpointCoordinator 单元测试
 */

import { CheckpointCoordinator } from '../checkpoint-coordinator';
import { CheckpointStateManager } from '../../managers/checkpoint-state-manager';
import { ThreadContext } from '../../context/thread-context';
import { ConversationManager } from '../../managers/conversation-manager';
import { VariableStateManager } from '../../managers/variable-state-manager';
import { ExecutionContext } from '../../context/execution-context';
import { ThreadRegistry } from '../../../services/thread-registry';
import { WorkflowRegistry } from '../../../services/workflow-registry';
import { GlobalMessageStorage } from '../../../services/global-message-storage';
import { NotFoundError } from '../../../../types/errors';
import { ThreadStatus } from '../../../../types/thread';
import type { Thread, NodeExecutionResult } from '../../../../types/thread';
import type { Checkpoint } from '../../../../types/checkpoint';
import type { WorkflowDefinition } from '../../../../types/workflow';
import type { Graph } from '../../../../types/graph';
import type { LLMMessage } from '../../../../types/llm';

// Mock 依赖
jest.mock('../../managers/checkpoint-state-manager');
jest.mock('../../context/thread-context');
jest.mock('../../managers/conversation-manager');
jest.mock('../../managers/variable-state-manager');
jest.mock('../../context/execution-context');
jest.mock('../../../services/thread-registry');
jest.mock('../../../services/workflow-registry');
jest.mock('../../../services/global-message-storage');

// Mock VariableStateManager 的 createSnapshot 方法
const mockCreateSnapshot = jest.fn().mockReturnValue({
  variables: [],
  variableScopes: {
    global: {},
    thread: {},
    subgraph: [],
    loop: []
  }
});

(VariableStateManager as jest.MockedClass<typeof VariableStateManager>).mockImplementation(() => ({
  createSnapshot: mockCreateSnapshot,
  restoreFromSnapshot: jest.fn(),
  initializeFromWorkflow: jest.fn(),
  initializeFromThreadVariables: jest.fn(),
  getVariableScopes: jest.fn().mockReturnValue({
    global: {},
    thread: {},
    subgraph: [],
    loop: []
  }),
  getVariableDefinition: jest.fn(),
  setVariableValue: jest.fn(),
  getAllVariables: jest.fn().mockReturnValue({}),
  getVariablesByScope: jest.fn().mockReturnValue({}),
  enterSubgraphScope: jest.fn(),
  exitSubgraphScope: jest.fn(),
  enterLoopScope: jest.fn(),
  exitLoopScope: jest.fn(),
  clear: jest.fn(),
  copyFrom: jest.fn()
} as any));

// Mock ConversationManager 构造函数
(ConversationManager as jest.MockedClass<typeof ConversationManager>).mockImplementation(() => ({
  addMessage: jest.fn(),
  addMessages: jest.fn(),
  getMessages: jest.fn(),
  getAllMessages: jest.fn(),
  clearMessages: jest.fn(),
  getMarkMap: jest.fn().mockReturnValue({
    originalIndices: [],
    batchBoundaries: [0],
    boundaryToBatch: [0],
    currentBatch: 0
  }),
  getTokenUsage: jest.fn().mockReturnValue(null),
  getCurrentRequestUsage: jest.fn().mockReturnValue(null),
  getIndexManager: jest.fn().mockReturnValue({
    setMarkMap: jest.fn(),
    getMarkMap: jest.fn(),
    reset: jest.fn(),
    clone: jest.fn()
  }),
  getTokenUsageTracker: jest.fn().mockReturnValue({
    setState: jest.fn(),
    getState: jest.fn(),
    clone: jest.fn()
  }),
  cleanup: jest.fn()
} as any));

// 创建 mock ExecutionContext 实例（在 mock 设置之前）
const mockExecutionContext = {
  getEventManager: jest.fn().mockReturnValue({} as any),
  getToolService: jest.fn().mockReturnValue({} as any),
  getLlmExecutor: jest.fn().mockReturnValue({} as any)
} as any;

// Mock ExecutionContext.createDefault 方法
(ExecutionContext as any).createDefault = jest.fn().mockReturnValue(mockExecutionContext);

describe('CheckpointCoordinator', () => {
  let coordinator: CheckpointCoordinator;
  let mockCheckpointStateManager: jest.Mocked<CheckpointStateManager>;
  let mockThreadRegistry: jest.Mocked<ThreadRegistry>;
  let mockWorkflowRegistry: jest.Mocked<WorkflowRegistry>;
  let mockGlobalMessageStorage: jest.Mocked<GlobalMessageStorage>;
  let mockThreadContext: jest.Mocked<ThreadContext>;
  let mockConversationManager: jest.Mocked<ConversationManager>;
  let mockThread: Thread;
  let mockWorkflowDefinition: WorkflowDefinition;

  beforeEach(() => {
    // 重置所有 mock
    jest.clearAllMocks();

    // 创建 mock 实例
    mockCheckpointStateManager = {
      create: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
      list: jest.fn(),
      clearAll: jest.fn()
    } as any;

    mockThreadRegistry = {
      register: jest.fn(),
      get: jest.fn(),
      delete: jest.fn(),
      getAll: jest.fn(),
      clear: jest.fn(),
      has: jest.fn()
    } as any;

    mockWorkflowRegistry = {
      register: jest.fn(),
      get: jest.fn(),
      unregister: jest.fn(),
      clear: jest.fn(),
      has: jest.fn(),
      size: jest.fn()
    } as any;

    mockGlobalMessageStorage = {
      storeMessages: jest.fn(),
      getMessages: jest.fn(),
      addReference: jest.fn(),
      removeReference: jest.fn(),
      cleanupThread: jest.fn(),
      clearAll: jest.fn(),
      getStats: jest.fn()
    } as any;

    mockConversationManager = {
      addMessage: jest.fn(),
      addMessages: jest.fn(),
      getMessages: jest.fn(),
      getAllMessages: jest.fn(),
      clearMessages: jest.fn(),
      getMarkMap: jest.fn(),
      getTokenUsage: jest.fn(),
      getCurrentRequestUsage: jest.fn(),
      getIndexManager: jest.fn().mockReturnValue({
        setMarkMap: jest.fn(),
        getMarkMap: jest.fn(),
        reset: jest.fn(),
        clone: jest.fn()
      }),
      getTokenUsageTracker: jest.fn().mockReturnValue({
        setState: jest.fn(),
        getState: jest.fn(),
        clone: jest.fn()
      }),
      cleanup: jest.fn()
    } as any;

    // 创建 mock Thread
    mockThread = {
      id: 'thread-1',
      workflowId: 'workflow-1',
      workflowVersion: '1.0.0',
      status: ThreadStatus.RUNNING,
      currentNodeId: 'node-1',
      graph: {} as Graph,
      variables: [],
      variableScopes: {
        global: {},
        thread: {},
        subgraph: [],
        loop: []
      },
      input: { test: 'input' },
      output: { test: 'output' },
      nodeResults: [
        {
          nodeId: 'node-1',
          nodeType: 'CODE',
          status: 'COMPLETED',
          step: 1,
          data: { result: 'success' }
        } as NodeExecutionResult
      ],
      startTime: Date.now(),
      errors: [],
      metadata: {}
    } as Thread;

    // 创建 mock ThreadContext
    mockThreadContext = {
      thread: mockThread,
      getThreadId: jest.fn().mockReturnValue('thread-1'),
      getWorkflowId: jest.fn().mockReturnValue('workflow-1'),
      getConversationManager: jest.fn().mockReturnValue(mockConversationManager),
      getTriggerStateSnapshot: jest.fn().mockReturnValue(new Map()),
      restoreTriggerState: jest.fn()
    } as any;

    // 创建 mock WorkflowDefinition
    mockWorkflowDefinition = {
      id: 'workflow-1',
      name: 'Test Workflow',
      version: '1.0.0',
      nodes: [],
      edges: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    } as WorkflowDefinition;

    // 创建协调器实例
    coordinator = new CheckpointCoordinator(
      mockCheckpointStateManager,
      mockThreadRegistry,
      mockWorkflowRegistry,
      mockGlobalMessageStorage
    );
  });

  describe('构造函数', () => {
    it('应该正确初始化协调器', () => {
      expect(coordinator).toBeInstanceOf(CheckpointCoordinator);
    });
  });

  describe('createCheckpoint', () => {
    it('应该成功创建检查点', async () => {
      // 设置 mock 返回值
      mockThreadRegistry.get.mockReturnValue(mockThreadContext);
      mockConversationManager.getAllMessages.mockReturnValue([
        { role: 'user', content: 'test message' } as LLMMessage
      ]);
      mockConversationManager.getMarkMap.mockReturnValue({
        originalIndices: [],
        batchBoundaries: [0],
        boundaryToBatch: [0],
        currentBatch: 0
      });
      mockConversationManager.getTokenUsage.mockReturnValue({
        totalTokens: 100,
        promptTokens: 50,
        completionTokens: 50
      });
      mockConversationManager.getCurrentRequestUsage.mockReturnValue({
        totalTokens: 10,
        promptTokens: 5,
        completionTokens: 5
      });
      mockCheckpointStateManager.create.mockResolvedValue('checkpoint-1');

      // 执行测试
      const checkpointId = await coordinator.createCheckpoint('thread-1', {
        description: 'Test checkpoint',
        creator: 'test-user'
      });

      // 验证结果
      expect(checkpointId).toBe('checkpoint-1');

      // 验证调用
      expect(mockThreadRegistry.get).toHaveBeenCalledWith('thread-1');
      expect(mockGlobalMessageStorage.storeMessages).toHaveBeenCalledWith(
        'thread-1',
        expect.any(Array)
      );
      expect(mockGlobalMessageStorage.addReference).toHaveBeenCalledWith('thread-1');
      expect(mockCheckpointStateManager.create).toHaveBeenCalledWith(
        expect.objectContaining({
          id: expect.any(String),
          threadId: 'thread-1',
          workflowId: 'workflow-1',
          timestamp: expect.any(Number),
          threadState: expect.any(Object),
          metadata: expect.objectContaining({
            description: 'Test checkpoint',
            creator: 'test-user'
          })
        })
      );
    });

    it('应该在没有元数据时创建检查点', async () => {
      // 设置 mock 返回值
      mockThreadRegistry.get.mockReturnValue(mockThreadContext);
      mockConversationManager.getAllMessages.mockReturnValue([]);
      mockConversationManager.getMarkMap.mockReturnValue({
        originalIndices: [],
        batchBoundaries: [0],
        boundaryToBatch: [0],
        currentBatch: 0
      });
      mockConversationManager.getTokenUsage.mockReturnValue(null);
      mockConversationManager.getCurrentRequestUsage.mockReturnValue(null);
      mockCheckpointStateManager.create.mockResolvedValue('checkpoint-1');

      // 执行测试
      const checkpointId = await coordinator.createCheckpoint('thread-1');

      // 验证结果
      expect(checkpointId).toBe('checkpoint-1');
      expect(mockCheckpointStateManager.create).toHaveBeenCalled();
    });

    it('应该正确处理节点结果数组到 Record 的转换', async () => {
      // 设置 mock 返回值
      mockThreadRegistry.get.mockReturnValue(mockThreadContext);
      mockConversationManager.getAllMessages.mockReturnValue([]);
      mockConversationManager.getMarkMap.mockReturnValue({
        originalIndices: [],
        batchBoundaries: [0],
        boundaryToBatch: [0],
        currentBatch: 0
      });
      mockConversationManager.getTokenUsage.mockReturnValue(null);
      mockConversationManager.getCurrentRequestUsage.mockReturnValue(null);
      mockCheckpointStateManager.create.mockResolvedValue('checkpoint-1');

      // 执行测试
      await coordinator.createCheckpoint('thread-1');

      // 验证调用
      expect(mockCheckpointStateManager.create).toHaveBeenCalledWith(
        expect.objectContaining({
          threadState: expect.objectContaining({
            nodeResults: expect.objectContaining({
              'node-1': expect.objectContaining({
                nodeId: 'node-1',
                nodeType: 'CODE',
                status: 'COMPLETED'
              })
            })
          })
        })
      );
    });

    it('应该正确保存触发器状态', async () => {
      // 创建触发器状态快照
      const triggerStates = new Map([
        ['trigger-1', { state: 'active' } as any]
      ]);

      // 设置 mock 返回值
      mockThreadRegistry.get.mockReturnValue(mockThreadContext);
      mockThreadContext.getTriggerStateSnapshot.mockReturnValue(triggerStates);
      mockConversationManager.getAllMessages.mockReturnValue([]);
      mockConversationManager.getMarkMap.mockReturnValue({
        originalIndices: [],
        batchBoundaries: [0],
        boundaryToBatch: [0],
        currentBatch: 0
      });
      mockConversationManager.getTokenUsage.mockReturnValue(null);
      mockConversationManager.getCurrentRequestUsage.mockReturnValue(null);
      mockCheckpointStateManager.create.mockResolvedValue('checkpoint-1');

      // 执行测试
      await coordinator.createCheckpoint('thread-1');

      // 验证触发器状态被保存
      expect(mockCheckpointStateManager.create).toHaveBeenCalledWith(
        expect.objectContaining({
          threadState: expect.objectContaining({
            triggerStates: triggerStates
          })
        })
      );
    });

    it('应该在 ThreadContext 不存在时抛出 NotFoundError', async () => {
      // 设置 mock 返回值
      mockThreadRegistry.get.mockReturnValue(null);

      // 执行测试并验证错误
      await expect(
        coordinator.createCheckpoint('non-existent-thread')
      ).rejects.toThrow(NotFoundError);

      await expect(
        coordinator.createCheckpoint('non-existent-thread')
      ).rejects.toThrow('ThreadContext not found');
    });
  });

  describe('restoreFromCheckpoint', () => {
    let mockCheckpoint: Checkpoint;

    beforeEach(() => {
      // 创建 mock 检查点
      mockCheckpoint = {
        id: 'checkpoint-1',
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now(),
        threadState: {
          status: ThreadStatus.RUNNING,
          currentNodeId: 'node-1',
          variables: [],
          variableScopes: {
            global: {},
            thread: {},
            subgraph: [],
            loop: []
          },
          input: { test: 'input' },
          output: { test: 'output' },
          nodeResults: {
            'node-1': {
              nodeId: 'node-1',
              nodeType: 'CODE',
              status: 'COMPLETED',
              step: 1
            } as NodeExecutionResult
          },
          errors: [],
          conversationState: {
            markMap: {
              originalIndices: [],
              batchBoundaries: [0],
              boundaryToBatch: [0],
              currentBatch: 0
            },
            tokenUsage: {
              totalTokens: 100,
              promptTokens: 50,
              completionTokens: 50
            },
            currentRequestUsage: {
              totalTokens: 10,
              promptTokens: 5,
              completionTokens: 5
            }
          }
        },
        metadata: {
          description: 'Test checkpoint'
        }
      } as Checkpoint;
    });

    it('应该成功从检查点恢复', async () => {
      // 设置 mock 返回值
      mockCheckpointStateManager.get.mockResolvedValue(mockCheckpoint);
      mockWorkflowRegistry.get.mockReturnValue(mockWorkflowDefinition);
      mockGlobalMessageStorage.getMessages.mockReturnValue([
        { role: 'user', content: 'test message' } as LLMMessage
      ]);

      // Mock ExecutionContext
      mockExecutionContext.getEventManager.mockReturnValue({} as any);
      mockExecutionContext.getToolService.mockReturnValue({} as any);
      mockExecutionContext.getLlmExecutor.mockReturnValue({} as any);

      // Mock ThreadContext 构造函数
      (ThreadContext as jest.MockedClass<typeof ThreadContext>).mockImplementation(
        () => mockThreadContext
      );

      // 执行测试
      const restoredContext = await coordinator.restoreFromCheckpoint('checkpoint-1');

      // 验证结果
      expect(restoredContext).toBe(mockThreadContext);

      // 验证调用
      expect(mockCheckpointStateManager.get).toHaveBeenCalledWith('checkpoint-1');
      expect(mockWorkflowRegistry.get).toHaveBeenCalledWith('workflow-1');
      expect(mockGlobalMessageStorage.getMessages).toHaveBeenCalledWith('thread-1');
      expect(mockThreadRegistry.register).toHaveBeenCalledWith(mockThreadContext);
    });

    it('应该在检查点不存在时抛出 NotFoundError', async () => {
      // 设置 mock 返回值
      mockCheckpointStateManager.get.mockResolvedValue(null);

      // 执行测试并验证错误
      await expect(
        coordinator.restoreFromCheckpoint('non-existent-checkpoint')
      ).rejects.toThrow(NotFoundError);

      await expect(
        coordinator.restoreFromCheckpoint('non-existent-checkpoint')
      ).rejects.toThrow('Checkpoint not found');
    });

    it('应该在工作流不存在时抛出 NotFoundError', async () => {
      // 设置 mock 返回值
      mockCheckpointStateManager.get.mockResolvedValue(mockCheckpoint);
      mockWorkflowRegistry.get.mockReturnValue(undefined);

      // 执行测试并验证错误
      await expect(
        coordinator.restoreFromCheckpoint('checkpoint-1')
      ).rejects.toThrow(NotFoundError);

      await expect(
        coordinator.restoreFromCheckpoint('checkpoint-1')
      ).rejects.toThrow('Workflow not found');
    });

    it('应该在消息历史不存在时抛出 NotFoundError', async () => {
      // 设置 mock 返回值
      mockCheckpointStateManager.get.mockResolvedValue(mockCheckpoint);
      mockWorkflowRegistry.get.mockReturnValue(mockWorkflowDefinition);
      mockGlobalMessageStorage.getMessages.mockReturnValue(undefined);

      // 执行测试并验证错误
      await expect(
        coordinator.restoreFromCheckpoint('checkpoint-1')
      ).rejects.toThrow(NotFoundError);

      await expect(
        coordinator.restoreFromCheckpoint('checkpoint-1')
      ).rejects.toThrow('Message history not found');
    });

    it('应该正确恢复对话状态', async () => {
      // 设置 mock 返回值
      mockCheckpointStateManager.get.mockResolvedValue(mockCheckpoint);
      mockWorkflowRegistry.get.mockReturnValue(mockWorkflowDefinition);
      mockGlobalMessageStorage.getMessages.mockReturnValue([
        { role: 'user', content: 'test message' } as LLMMessage
      ]);

      // Mock ExecutionContext
      mockExecutionContext.getEventManager.mockReturnValue({} as any);
      mockExecutionContext.getToolService.mockReturnValue({} as any);
      mockExecutionContext.getLlmExecutor.mockReturnValue({} as any);

      // Mock ThreadContext 构造函数
      (ThreadContext as jest.MockedClass<typeof ThreadContext>).mockImplementation(
        () => mockThreadContext
      );

      // 执行测试
      await coordinator.restoreFromCheckpoint('checkpoint-1');

      // 验证 ConversationManager 构造函数被调用
      expect(ConversationManager).toHaveBeenCalled();

      // 验证新创建的 ConversationManager 的方法被调用
      const conversationManagerCalls = (ConversationManager as jest.MockedClass<typeof ConversationManager>).mock.calls;
      expect(conversationManagerCalls.length).toBeGreaterThan(0);
    });

    it('应该正确恢复触发器状态', async () => {
      // 添加触发器状态到检查点
      const triggerStates = new Map([
        ['trigger-1', { state: 'active' } as any]
      ]);
      mockCheckpoint.threadState.triggerStates = triggerStates;

      // 设置 mock 返回值
      mockCheckpointStateManager.get.mockResolvedValue(mockCheckpoint);
      mockWorkflowRegistry.get.mockReturnValue(mockWorkflowDefinition);
      mockGlobalMessageStorage.getMessages.mockReturnValue([]);

      // Mock ExecutionContext
      mockExecutionContext.getEventManager.mockReturnValue({} as any);
      mockExecutionContext.getToolService.mockReturnValue({} as any);
      mockExecutionContext.getLlmExecutor.mockReturnValue({} as any);

      // Mock ThreadContext 构造函数
      (ThreadContext as jest.MockedClass<typeof ThreadContext>).mockImplementation(
        () => mockThreadContext
      );

      // 执行测试
      await coordinator.restoreFromCheckpoint('checkpoint-1');

      // 验证触发器状态恢复
      expect(mockThreadContext.restoreTriggerState).toHaveBeenCalledWith(triggerStates);
    });

    it('应该正确转换 nodeResults Record 到数组', async () => {
      // 设置 mock 返回值
      mockCheckpointStateManager.get.mockResolvedValue(mockCheckpoint);
      mockWorkflowRegistry.get.mockReturnValue(mockWorkflowDefinition);
      mockGlobalMessageStorage.getMessages.mockReturnValue([]);

      // Mock ExecutionContext
      mockExecutionContext.getEventManager.mockReturnValue({} as any);
      mockExecutionContext.getToolService.mockReturnValue({} as any);
      mockExecutionContext.getLlmExecutor.mockReturnValue({} as any);

      // Mock ThreadContext 构造函数
      (ThreadContext as jest.MockedClass<typeof ThreadContext>).mockImplementation(
        () => mockThreadContext
      );

      // 执行测试
      await coordinator.restoreFromCheckpoint('checkpoint-1');

      // 验证 ThreadContext 构造函数被调用
      expect(ThreadContext).toHaveBeenCalled();

      // 验证传入的参数包含 nodeResults 数组
      const threadContextCalls = (ThreadContext as jest.MockedClass<typeof ThreadContext>).mock.calls;
      expect(threadContextCalls.length).toBeGreaterThan(0);
      const threadArg = threadContextCalls[0]?.[0] as Partial<Thread>;
      expect(threadArg.nodeResults).toBeInstanceOf(Array);
      expect(threadArg.nodeResults).toHaveLength(1);
      expect(threadArg.nodeResults?.[0]?.nodeId).toBe('node-1');
    });

    it('应该验证检查点完整性', async () => {
      // 创建无效的检查点（缺少必需字段）
      const invalidCheckpoint = {
        id: 'checkpoint-1',
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now(),
        threadState: {
          status: ThreadStatus.RUNNING,
          currentNodeId: 'node-1',
          variables: [],
          variableScopes: {
            global: {},
            thread: {},
            subgraph: [],
            loop: []
          },
          input: {},
          output: {},
          nodeResults: {},
          errors: []
        }
      } as Checkpoint;

      // 设置 mock 返回值
      mockCheckpointStateManager.get.mockResolvedValue(invalidCheckpoint);
      mockWorkflowRegistry.get.mockReturnValue(mockWorkflowDefinition);
      mockGlobalMessageStorage.getMessages.mockReturnValue([]);

      // Mock ExecutionContext
      mockExecutionContext.getEventManager.mockReturnValue({} as any);
      mockExecutionContext.getToolService.mockReturnValue({} as any);
      mockExecutionContext.getLlmExecutor.mockReturnValue({} as any);

      // Mock ThreadContext 构造函数
      (ThreadContext as jest.MockedClass<typeof ThreadContext>).mockImplementation(
        () => mockThreadContext
      );

      // 执行测试 - 应该成功（检查点有效）
      await expect(
        coordinator.restoreFromCheckpoint('checkpoint-1')
      ).resolves.toBeDefined();
    });

    it('应该在检查点缺少必需字段时抛出错误', async () => {
      // 创建无效的检查点（缺少 id）
      const invalidCheckpoint = {
        id: '',
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now(),
        threadState: {
          status: ThreadStatus.RUNNING,
          currentNodeId: 'node-1',
          variables: [],
          variableScopes: {
            global: {},
            thread: {},
            subgraph: [],
            loop: []
          },
          input: {},
          output: {},
          nodeResults: {},
          errors: []
        }
      } as Checkpoint;

      // 设置 mock 返回值
      mockCheckpointStateManager.get.mockResolvedValue(invalidCheckpoint);

      // 执行测试并验证错误
      await expect(
        coordinator.restoreFromCheckpoint('checkpoint-1')
      ).rejects.toThrow('Invalid checkpoint: missing required fields');
    });

    it('应该在 threadState 缺少时抛出错误', async () => {
      // 创建无效的检查点（缺少 threadState）
      const invalidCheckpoint = {
        id: 'checkpoint-1',
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now(),
        threadState: undefined as any
      } as Checkpoint;

      // 设置 mock 返回值
      mockCheckpointStateManager.get.mockResolvedValue(invalidCheckpoint);

      // 执行测试并验证错误
      await expect(
        coordinator.restoreFromCheckpoint('checkpoint-1')
      ).rejects.toThrow('Invalid checkpoint: missing thread state');
    });

    it('应该在 threadState 不完整时抛出错误', async () => {
      // 创建无效的检查点（threadState 不完整）
      const invalidCheckpoint = {
        id: 'checkpoint-1',
        threadId: 'thread-1',
        workflowId: 'workflow-1',
        timestamp: Date.now(),
        threadState: {
          status: undefined as any,
          currentNodeId: undefined as any,
          variables: [],
          variableScopes: {
            global: {},
            thread: {},
            subgraph: [],
            loop: []
          },
          input: {},
          output: {},
          nodeResults: {},
          errors: []
        }
      } as Checkpoint;

      // 设置 mock 返回值
      mockCheckpointStateManager.get.mockResolvedValue(invalidCheckpoint);

      // 执行测试并验证错误
      await expect(
        coordinator.restoreFromCheckpoint('checkpoint-1')
      ).rejects.toThrow('Invalid checkpoint: incomplete thread state');
    });
  });

  describe('createNodeCheckpoint', () => {
    it('应该成功创建节点级别检查点', async () => {
      // 设置 mock 返回值
      mockThreadRegistry.get.mockReturnValue(mockThreadContext);
      mockConversationManager.getAllMessages.mockReturnValue([]);
      mockConversationManager.getMarkMap.mockReturnValue({
        originalIndices: [],
        batchBoundaries: [0],
        boundaryToBatch: [0],
        currentBatch: 0
      });
      mockConversationManager.getTokenUsage.mockReturnValue(null);
      mockConversationManager.getCurrentRequestUsage.mockReturnValue(null);
      mockCheckpointStateManager.create.mockResolvedValue('checkpoint-1');

      // 执行测试
      const checkpointId = await coordinator.createNodeCheckpoint('thread-1', 'node-1', {
        description: 'Node checkpoint'
      });

      // 验证结果
      expect(checkpointId).toBe('checkpoint-1');

      // 验证调用
      expect(mockCheckpointStateManager.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            description: 'Node checkpoint for node node-1',
            customFields: expect.objectContaining({
              nodeId: 'node-1'
            })
          })
        })
      );
    });

    it('应该合并自定义字段', async () => {
      // 设置 mock 返回值
      mockThreadRegistry.get.mockReturnValue(mockThreadContext);
      mockConversationManager.getAllMessages.mockReturnValue([]);
      mockConversationManager.getMarkMap.mockReturnValue({
        originalIndices: [],
        batchBoundaries: [0],
        boundaryToBatch: [0],
        currentBatch: 0
      });
      mockConversationManager.getTokenUsage.mockReturnValue(null);
      mockConversationManager.getCurrentRequestUsage.mockReturnValue(null);
      mockCheckpointStateManager.create.mockResolvedValue('checkpoint-1');

      // 执行测试
      const checkpointId = await coordinator.createNodeCheckpoint('thread-1', 'node-1', {
        description: 'Custom description',
        customFields: {
          customKey: 'customValue'
        }
      });

      // 验证结果
      expect(checkpointId).toBe('checkpoint-1');

      // 验证调用
      expect(mockCheckpointStateManager.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            description: 'Node checkpoint for node node-1',
            customFields: expect.objectContaining({
              customKey: 'customValue',
              nodeId: 'node-1'
            })
          })
        })
      );
    });

    it('应该在没有元数据时创建节点检查点', async () => {
      // 设置 mock 返回值
      mockThreadRegistry.get.mockReturnValue(mockThreadContext);
      mockConversationManager.getAllMessages.mockReturnValue([]);
      mockConversationManager.getMarkMap.mockReturnValue({
        originalIndices: [],
        batchBoundaries: [0],
        boundaryToBatch: [0],
        currentBatch: 0
      });
      mockConversationManager.getTokenUsage.mockReturnValue(null);
      mockConversationManager.getCurrentRequestUsage.mockReturnValue(null);
      mockCheckpointStateManager.create.mockResolvedValue('checkpoint-1');

      // 执行测试
      const checkpointId = await coordinator.createNodeCheckpoint('thread-1', 'node-1');

      // 验证结果
      expect(checkpointId).toBe('checkpoint-1');

      // 验证调用
      expect(mockCheckpointStateManager.create).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: expect.objectContaining({
            description: 'Node checkpoint for node node-1',
            customFields: expect.objectContaining({
              nodeId: 'node-1'
            })
          })
        })
      );
    });
  });
});