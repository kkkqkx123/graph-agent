/**
 * Triggered Subworkflow Manager 集成测试
 *
 * 测试场景：
 * - 同步执行
 * - 异步执行
 * - 任务管理
 * - 父子线程关系
 * - 统计信息
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TriggeredSubworkflowManager } from '../../graph/services/triggered-subworkflow-manager.js';
import type {
  TriggeredSubgraphTask,
  ExecutedSubgraphResult,
  TaskSubmissionResult
} from '../../graph/execution/types/triggered-subworkflow.types.js';
import { ThreadPoolService } from '../../graph/services/thread-pool-service.js';
import { TaskQueueManager } from '../../graph/execution/managers/task-queue-manager.js';
import type { ThreadEntity } from '../../graph/entities/thread-entity.js';
import type { ThreadResult } from '@modular-agent/types';
import type { TaskStatus } from '../../graph/execution/types/task.types.js';

// Mock implementations
const mockThreadRegistry = {
  register: vi.fn(),
  get: vi.fn(),
  delete: vi.fn()
} as any;

const mockThreadBuilder = {
  build: vi.fn()
} as any;

const mockTaskQueueManager = {
  submitSync: vi.fn(),
  submitAsync: vi.fn(),
  cancelTask: vi.fn(),
  getQueueStats: vi.fn(),
  drain: vi.fn()
} as any;

const mockEventManager = {
  emit: vi.fn()
} as any;

const mockThreadPoolService = {
  getConfig: vi.fn(() => ({ defaultTimeout: 60000 })),
  getStats: vi.fn(),
  shutdown: vi.fn()
} as any;

describe('Triggered Subworkflow Manager - 触发子工作流管理器', () => {
  let manager: TriggeredSubworkflowManager;
  let mockMainThreadEntity: any;
  let mockSubgraphEntity: any;

  beforeEach(() => {
    vi.clearAllMocks();

    // 创建管理器
    manager = new TriggeredSubworkflowManager(
      mockThreadRegistry,
      mockThreadBuilder,
      mockTaskQueueManager,
      mockEventManager,
      mockThreadPoolService
    );

    // Mock 主线程实体
    mockMainThreadEntity = {
      id: 'main-thread-123',
      getThreadId: vi.fn(() => 'main-thread-123'),
      getWorkflowId: vi.fn(() => 'workflow-123'),
      getInput: vi.fn(() => ({ key: 'value' })),
      getOutput: vi.fn(() => ({ result: 'success' })),
      registerChildThread: vi.fn(),
      unregisterChildThread: vi.fn()
    };

    // Mock 子工作流实体
    mockSubgraphEntity = {
      id: 'subgraph-thread-456',
      getThreadId: vi.fn(() => 'subgraph-thread-456'),
      getWorkflowId: vi.fn(() => 'subgraph-workflow-789'),
      setThreadType: vi.fn(),
      setParentThreadId: vi.fn(),
      getParentThreadId: vi.fn(() => 'main-thread-123'),
      setTriggeredSubworkflowId: vi.fn(),
      getTriggeredSubworkflowId: vi.fn(() => 'subgraph-1')
    };

    // Mock threadBuilder.build
    mockThreadBuilder.build.mockResolvedValue(mockSubgraphEntity);
  });

  describe('同步执行', () => {
    it('测试同步执行子工作流：waitForCompletion为true时等待完成', async () => {
      const task: TriggeredSubgraphTask = {
        subgraphId: 'subgraph-1',
        triggerId: 'trigger-1',
        mainThreadEntity: mockMainThreadEntity,
        input: { customInput: 'test' },
        config: {
          waitForCompletion: true,
          timeout: 60000
        }
      };

      const mockThreadResult: ThreadResult = {
        threadId: 'subgraph-thread-456',
        output: { compressed: 'context' },
        executionTime: 100,
        nodeResults: [],
        metadata: {
          status: 'COMPLETED',
          startTime: Date.now(),
          endTime: Date.now() + 100,
          executionTime: 100,
          nodeCount: 0,
          errorCount: 0
        }
      };

      const expectedResult: ExecutedSubgraphResult = {
        subgraphEntity: mockSubgraphEntity,
        threadResult: mockThreadResult,
        executionTime: 100
      };

      mockTaskQueueManager.submitSync.mockResolvedValue(expectedResult);

      const result = await manager.executeTriggeredSubgraph(task);

      expect(mockThreadBuilder.build).toHaveBeenCalledWith('subgraph-1', {
        input: expect.objectContaining({
          triggerId: 'trigger-1',
          output: mockMainThreadEntity.getOutput(),
          input: mockMainThreadEntity.getInput(),
          customInput: 'test'
        })
      });

      expect(mockThreadRegistry.register).toHaveBeenCalledWith(mockSubgraphEntity);
      expect(mockMainThreadEntity.registerChildThread).toHaveBeenCalledWith('subgraph-thread-456');
      expect(mockSubgraphEntity.setParentThreadId).toHaveBeenCalledWith('main-thread-123');
      expect(mockSubgraphEntity.setTriggeredSubworkflowId).toHaveBeenCalledWith('subgraph-1');

      expect(result).toEqual(expectedResult);
    });

    it('测试执行结果返回：正确返回执行结果', async () => {
      const task: TriggeredSubgraphTask = {
        subgraphId: 'subgraph-1',
        triggerId: 'trigger-1',
        mainThreadEntity: mockMainThreadEntity,
        input: {},
        config: {
          waitForCompletion: true
        }
      };

      const mockThreadResult: ThreadResult = {
        threadId: 'subgraph-thread-456',
        output: { data: 'test' },
        executionTime: 200,
        nodeResults: [],
        metadata: {
          status: 'COMPLETED',
          startTime: Date.now(),
          endTime: Date.now() + 200,
          executionTime: 200,
          nodeCount: 0,
          errorCount: 0
        }
      };

      const expectedResult: ExecutedSubgraphResult = {
        subgraphEntity: mockSubgraphEntity,
        threadResult: mockThreadResult,
        executionTime: 200
      };

      mockTaskQueueManager.submitSync.mockResolvedValue(expectedResult);

      const result = await manager.executeTriggeredSubgraph(task);

      expect(result).toBe(expectedResult);
    });

    it('测试超时处理：超时时正确处理', async () => {
      const task: TriggeredSubgraphTask = {
        subgraphId: 'subgraph-1',
        triggerId: 'trigger-1',
        mainThreadEntity: mockMainThreadEntity,
        input: {},
        config: {
          waitForCompletion: true,
          timeout: 1000
        }
      };

      mockTaskQueueManager.submitSync.mockRejectedValue(new Error('Timeout'));

      await expect(manager.executeTriggeredSubgraph(task)).rejects.toThrow('Timeout');
    });
  });

  describe('异步执行', () => {
    it('测试异步提交子工作流：waitForCompletion为false时异步执行', async () => {
      const task: TriggeredSubgraphTask = {
        subgraphId: 'subgraph-1',
        triggerId: 'trigger-1',
        mainThreadEntity: mockMainThreadEntity,
        input: {},
        config: {
          waitForCompletion: false
        }
      };

      const submissionResult = {
        taskId: 'task-123',
        status: 'PENDING',
        submitTime: Date.now()
      };

      mockTaskQueueManager.submitAsync.mockReturnValue(submissionResult);

      const result = await manager.executeTriggeredSubgraph(task);

      expect(result).toEqual({
        taskId: 'task-123',
        status: 'PENDING',
        message: 'Triggered subgraph submitted',
        submitTime: submissionResult.submitTime
      });

      expect(mockTaskQueueManager.submitAsync).toHaveBeenCalled();
    });

    it('测试任务提交结果：返回任务ID和状态', async () => {
      const task: TriggeredSubgraphTask = {
        subgraphId: 'subgraph-1',
        triggerId: 'trigger-1',
        mainThreadEntity: mockMainThreadEntity,
        input: {},
        config: {
          waitForCompletion: false
        }
      };

      const submissionResult = {
        taskId: 'task-456',
        status: 'QUEUED',
        submitTime: Date.now()
      };

      mockTaskQueueManager.submitAsync.mockReturnValue(submissionResult);

      const result = await manager.executeTriggeredSubgraph(task);

      // 添加类型检查
      expect(result).toEqual({
        taskId: 'task-456',
        status: 'QUEUED',
        message: 'Triggered subgraph submitted',
        submitTime: expect.any(Number)
      });
    });

    it('测试默认同步执行：未指定waitForCompletion时默认同步', async () => {
      const task: TriggeredSubgraphTask = {
        subgraphId: 'subgraph-1',
        triggerId: 'trigger-1',
        mainThreadEntity: mockMainThreadEntity,
        input: {}
        // config 未设置
      };

      const mockThreadResult: ThreadResult = {
        threadId: 'subgraph-thread-456',
        output: {},
        executionTime: 50,
        nodeResults: [],
        metadata: {
          status: 'COMPLETED',
          startTime: Date.now(),
          endTime: Date.now() + 50,
          executionTime: 50,
          nodeCount: 0,
          errorCount: 0
        }
      };

      const expectedResult: ExecutedSubgraphResult = {
        subgraphEntity: mockSubgraphEntity,
        threadResult: mockThreadResult,
        executionTime: 50
      };

      mockTaskQueueManager.submitSync.mockResolvedValue(expectedResult);

      await manager.executeTriggeredSubgraph(task);

      expect(mockTaskQueueManager.submitSync).toHaveBeenCalled();
    });
  });

  describe('任务管理', () => {
    it('测试查询任务状态：getTaskStatus返回正确的任务状态', () => {
      const mockTaskInfo = {
        id: 'task-123',
        status: 'RUNNING' as TaskStatus,
        threadEntity: mockSubgraphEntity,
        taskManager: manager,
        submitTime: Date.now()
      };

      manager['taskRegistry']['register'] = vi.fn(() => 'task-123');
      manager['taskRegistry']['get'] = vi.fn(() => mockTaskInfo);

      const taskStatus = manager.getTaskStatus('task-123');

      expect(taskStatus).toBe(mockTaskInfo);
    });

    it('测试取消任务：cancelTask正确取消任务', async () => {
      mockTaskQueueManager.cancelTask.mockReturnValue(true);

      const success = await manager.cancelTask('task-123');

      expect(success).toBe(true);
      expect(mockTaskQueueManager.cancelTask).toHaveBeenCalledWith('task-123');
    });

    it('测试清理过期任务：cleanupExpiredTasks清理过期任务', () => {
      const retentionTime = 60000; // 1分钟

      manager['taskRegistry']['cleanup'] = vi.fn(() => 5);

      const cleanedCount = manager.cleanupExpiredTasks(retentionTime);

      expect(manager['taskRegistry']['cleanup']).toHaveBeenCalledWith(retentionTime);
      expect(cleanedCount).toBe(5);
    });
  });

  describe('父子线程关系', () => {
    it('测试建立父子关系：正确建立父子线程关系', async () => {
      const task: TriggeredSubgraphTask = {
        subgraphId: 'subgraph-1',
        triggerId: 'trigger-1',
        mainThreadEntity: mockMainThreadEntity,
        input: {},
        config: {
          waitForCompletion: true
        }
      };

      const mockThreadResult: ThreadResult = {
        threadId: 'subgraph-thread-456',
        output: {},
        executionTime: 50,
        nodeResults: [],
        metadata: {
          status: 'COMPLETED',
          startTime: Date.now(),
          endTime: Date.now() + 50,
          executionTime: 50,
          nodeCount: 0,
          errorCount: 0
        }
      };

      mockTaskQueueManager.submitSync.mockResolvedValue({
        subgraphEntity: mockSubgraphEntity,
        threadResult: mockThreadResult,
        executionTime: 50
      });

      await manager.executeTriggeredSubgraph(task);

      // 验证父子关系已建立
      expect(mockMainThreadEntity.registerChildThread).toHaveBeenCalledWith('subgraph-thread-456');
      expect(mockSubgraphEntity.setParentThreadId).toHaveBeenCalledWith('main-thread-123');
      expect(mockSubgraphEntity.setTriggeredSubworkflowId).toHaveBeenCalledWith('subgraph-1');
    });

    it('测试注销父子关系：完成后正确注销关系', async () => {
      const task: TriggeredSubgraphTask = {
        subgraphId: 'subgraph-1',
        triggerId: 'trigger-1',
        mainThreadEntity: mockMainThreadEntity,
        input: {},
        config: {
          waitForCompletion: true
        }
      };

      const mockThreadResult: ThreadResult = {
        threadId: 'subgraph-thread-456',
        output: {},
        executionTime: 50,
        nodeResults: [],
        metadata: {
          status: 'COMPLETED',
          startTime: Date.now(),
          endTime: Date.now() + 50,
          executionTime: 50,
          nodeCount: 0,
          errorCount: 0
        }
      };

      mockTaskQueueManager.submitSync.mockResolvedValue({
        subgraphEntity: mockSubgraphEntity,
        threadResult: mockThreadResult,
        executionTime: 50
      });

      // 设置 mockThreadRegistry.get 返回 mockMainThreadEntity
      mockThreadRegistry.get.mockReturnValue(mockMainThreadEntity);

      await manager.executeTriggeredSubgraph(task);

      // 验证父子关系已注销
      expect(mockMainThreadEntity.unregisterChildThread).toHaveBeenCalledWith('subgraph-thread-456');
    });
  });

  describe('统计信息', () => {
    it('测试队列统计：getQueueStats返回正确的队列统计', () => {
      const queueStats = {
        pending: 5,
        running: 2,
        completed: 10,
        failed: 1
      };

      mockTaskQueueManager.getQueueStats.mockReturnValue(queueStats);

      const stats = manager.getQueueStats();

      expect(stats).toBe(queueStats);
      expect(mockTaskQueueManager.getQueueStats).toHaveBeenCalled();
    });

    it('测试线程池统计：getPoolStats返回正确的线程池统计', () => {
      const poolStats = {
        activeThreads: 3,
        idleThreads: 2,
        totalThreads: 5,
        maxThreads: 10
      };

      mockThreadPoolService.getStats.mockReturnValue(poolStats);

      const stats = manager.getPoolStats();

      expect(stats).toBe(poolStats);
      expect(mockThreadPoolService.getStats).toHaveBeenCalled();
    });

    it('测试任务统计：getTaskStats返回正确的任务统计', () => {
      const taskStats = {
        total: 20,
        queued: 5,
        running: 3,
        completed: 10,
        failed: 2,
        cancelled: 0,
        timeout: 0
      };

      manager['taskRegistry']['getStats'] = vi.fn(() => taskStats);

      const stats = manager.getTaskStats();

      expect(stats).toBe(taskStats);
      expect(manager['taskRegistry']['getStats']).toHaveBeenCalled();
    });
  });

  describe('关闭管理器', () => {
    it('测试关闭管理器：shutdown方法正确关闭', async () => {
      mockTaskQueueManager.drain.mockResolvedValue(undefined);
      mockThreadPoolService.shutdown.mockResolvedValue(undefined);

      await manager.shutdown();

      expect(mockThreadPoolService.shutdown).toHaveBeenCalled();
      expect(mockTaskQueueManager.drain).toHaveBeenCalled();
    });
  });

  describe('边界情况', () => {
    it('测试缺少subgraphId：应抛出错误', async () => {
      const task: any = {
        triggerId: 'trigger-1',
        mainThreadEntity: mockMainThreadEntity
        // subgraphId 缺失
      };

      await expect(manager.executeTriggeredSubgraph(task)).rejects.toThrow();
    });

    it('测试缺少mainThreadEntity：应抛出错误', async () => {
      const task: any = {
        subgraphId: 'subgraph-1',
        triggerId: 'trigger-1'
        // mainThreadEntity 缺失
      };

      await expect(manager.executeTriggeredSubgraph(task)).rejects.toThrow();
    });

    it('测试执行失败时的错误处理：应正确处理错误', async () => {
      const task: TriggeredSubgraphTask = {
        subgraphId: 'subgraph-1',
        triggerId: 'trigger-1',
        mainThreadEntity: mockMainThreadEntity,
        input: {},
        config: {
          waitForCompletion: true
        }
      };

      mockTaskQueueManager.submitSync.mockRejectedValue(new Error('Execution failed'));

      await expect(manager.executeTriggeredSubgraph(task)).rejects.toThrow('Execution failed');
    });
  });
});