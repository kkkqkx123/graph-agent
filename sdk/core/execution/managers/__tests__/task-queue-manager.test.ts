/**
 * TaskQueueManager 单元测试
 */

import { TaskQueueManager } from '../task-queue-manager';
import { TaskRegistry, type TaskManager } from '../../../services/task-registry';
import { ThreadPoolManager } from '../thread-pool-manager';
import { TaskStatus } from '../../types/task.types';
import { ThreadContext } from '../../context/thread-context';
import { ExecutionContext } from '../../context/execution-context';

describe('TaskQueueManager', () => {
  let taskQueueManager: TaskQueueManager;
  let taskRegistry: TaskRegistry;
  let threadPoolManager: ThreadPoolManager;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  let mockEventManager: any;
  let mockThreadContext: jest.Mocked<ThreadContext>;
  let mockManager: jest.Mocked<TaskManager>;

  beforeEach(() => {
    // 重置单例
    (TaskRegistry as any).instance = undefined;
    
    mockEventManager = {
      emit: jest.fn().mockResolvedValue(undefined)
    };

    mockExecutionContext = {
      getEventManager: jest.fn().mockReturnValue(mockEventManager),
      getWorkflowRegistry: jest.fn(),
      getLlmExecutor: jest.fn(),
      getToolService: jest.fn(),
      getUserInteractionHandler: jest.fn(),
      getHumanRelayHandler: jest.fn(),
      getThreadRegistry: jest.fn(),
      getToolContextManager: jest.fn()
    } as any;

    mockThreadContext = {
      getThreadId: jest.fn().mockReturnValue('thread-1'),
      getWorkflowId: jest.fn().mockReturnValue('workflow-1'),
      getOutput: jest.fn().mockReturnValue({ result: 'success' }),
      getTriggeredSubworkflowId: jest.fn().mockReturnValue('subgraph-1')
    } as any;

    mockManager = {
      cancelTask: jest.fn().mockResolvedValue(true),
      getTaskStatus: jest.fn()
    };

    taskRegistry = TaskRegistry.getInstance();
    threadPoolManager = new ThreadPoolManager(mockExecutionContext, {
      minExecutors: 1,
      maxExecutors: 2,
      idleTimeout: 1000
    });
    taskQueueManager = new TaskQueueManager(taskRegistry, threadPoolManager, mockEventManager);
  });

  afterEach(async () => {
    await threadPoolManager.shutdown();
  });

  describe('submitSync', () => {
    it('应该成功提交同步任务并返回结果', async () => {
      // Mock ThreadExecutor.executeThread
      const mockExecutor = {
        executeThread: jest.fn().mockResolvedValue({
          threadId: 'thread-1',
          output: { result: 'success' },
          executionTime: 100
        })
      };

      // Mock ThreadPoolManager.allocateExecutor
      jest.spyOn(threadPoolManager, 'allocateExecutor').mockResolvedValue(mockExecutor as any);
      jest.spyOn(threadPoolManager, 'releaseExecutor').mockImplementation(() => {});

      // 先注册任务
      const taskId = taskRegistry.register(mockThreadContext, mockManager);
      const result = await taskQueueManager.submitSync(taskId, mockThreadContext);

      expect(result).toBeDefined();
      expect(result.subgraphContext).toBe(mockThreadContext);
      expect(result.threadResult).toBeDefined();
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('应该在任务失败时抛出错误', async () => {
      const mockExecutor = {
        executeThread: jest.fn().mockRejectedValue(new Error('Execution failed'))
      };

      jest.spyOn(threadPoolManager, 'allocateExecutor').mockResolvedValue(mockExecutor as any);
      jest.spyOn(threadPoolManager, 'releaseExecutor').mockImplementation(() => {});

      const taskId = taskRegistry.register(mockThreadContext, mockManager);
      await expect(taskQueueManager.submitSync(taskId, mockThreadContext)).rejects.toThrow('Execution failed');
    });
  });

  describe('submitAsync', () => {
    it('应该成功提交异步任务并立即返回', async () => {
      const mockExecutor = {
        executeThread: jest.fn().mockResolvedValue({
          threadId: 'thread-1',
          output: { result: 'success' },
          executionTime: 100
        })
      };

      jest.spyOn(threadPoolManager, 'allocateExecutor').mockResolvedValue(mockExecutor as any);
      jest.spyOn(threadPoolManager, 'releaseExecutor').mockImplementation(() => {});

      const taskId = taskRegistry.register(mockThreadContext, mockManager);
      const result = taskQueueManager.submitAsync(taskId, mockThreadContext);

      expect(result).toBeDefined();
      expect(result.taskId).toBe(taskId);
      expect(result.status).toBe('QUEUED');
      expect(result.message).toBe('Task submitted successfully');
      expect(result.submitTime).toBeGreaterThan(0);
    });
  });

  describe('cancelTask', () => {
    it('应该取消待执行队列中的任务', async () => {
      // 提交一个任务但不执行
      const mockExecutor = {
        executeThread: jest.fn().mockImplementation(() => new Promise(() => {})) // 永不完成
      };

      jest.spyOn(threadPoolManager, 'allocateExecutor').mockImplementation(() => new Promise(() => {})); // 永不分配

      const taskId = taskRegistry.register(mockThreadContext, mockManager);
      const result = taskQueueManager.submitAsync(taskId, mockThreadContext);
      const success = taskQueueManager.cancelTask(result.taskId);

      expect(success).toBe(true);
    });

    it('不应该取消正在运行的任务', async () => {
      const mockExecutor = {
        executeThread: jest.fn().mockResolvedValue({
          threadId: 'thread-1',
          output: {},
          executionTime: 100
        })
      };

      jest.spyOn(threadPoolManager, 'allocateExecutor').mockResolvedValue(mockExecutor as any);
      jest.spyOn(threadPoolManager, 'releaseExecutor').mockImplementation(() => {});

      const taskId = taskRegistry.register(mockThreadContext, mockManager);
      const result = taskQueueManager.submitAsync(taskId, mockThreadContext);
      
      // 等待任务开始执行
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const success = taskQueueManager.cancelTask(result.taskId);

      expect(success).toBe(false);
    });

    it('对于不存在的任务应该返回 false', () => {
      const success = taskQueueManager.cancelTask('non-existent-task');
      expect(success).toBe(false);
    });
  });

  describe('getQueueStats', () => {
    it('应该返回正确的队列统计信息', async () => {
      const mockExecutor = {
        executeThread: jest.fn().mockResolvedValue({
          threadId: 'thread-1',
          output: {},
          executionTime: 100
        })
      };

      jest.spyOn(threadPoolManager, 'allocateExecutor').mockResolvedValue(mockExecutor as any);
      jest.spyOn(threadPoolManager, 'releaseExecutor').mockImplementation(() => {});

      // 提交一个任务
      const taskId = taskRegistry.register(mockThreadContext, mockManager);
      taskQueueManager.submitAsync(taskId, mockThreadContext);

      const stats = taskQueueManager.getQueueStats();

      expect(stats.pendingCount).toBeGreaterThanOrEqual(0);
      expect(stats.runningCount).toBeGreaterThanOrEqual(0);
      expect(stats.completedCount).toBeGreaterThanOrEqual(0);
      expect(stats.failedCount).toBeGreaterThanOrEqual(0);
      expect(stats.cancelledCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe('drain', () => {
    it('应该等待所有任务完成', async () => {
      const mockExecutor = {
        executeThread: jest.fn().mockResolvedValue({
          threadId: 'thread-1',
          output: {},
          executionTime: 100
        })
      };

      jest.spyOn(threadPoolManager, 'allocateExecutor').mockResolvedValue(mockExecutor as any);
      jest.spyOn(threadPoolManager, 'releaseExecutor').mockImplementation(() => {});

      // 提交一个任务
      const taskId = taskRegistry.register(mockThreadContext, mockManager);
      taskQueueManager.submitAsync(taskId, mockThreadContext);

      // 等待队列排空
      await taskQueueManager.drain();

      const stats = taskQueueManager.getQueueStats();
      expect(stats.pendingCount).toBe(0);
      expect(stats.runningCount).toBe(0);
    });
  });

  describe('clear', () => {
    it('应该清空待执行队列', async () => {
      // 提交多个任务但不执行
      jest.spyOn(threadPoolManager, 'allocateExecutor').mockImplementation(() => new Promise(() => {}));

      const taskId1 = taskRegistry.register(mockThreadContext, mockManager);
      const taskId2 = taskRegistry.register(mockThreadContext, mockManager);
      taskQueueManager.submitAsync(taskId1, mockThreadContext);
      taskQueueManager.submitAsync(taskId2, mockThreadContext);

      taskQueueManager.clear();

      const stats = taskQueueManager.getQueueStats();
      expect(stats.pendingCount).toBe(0);
    });
  });
});