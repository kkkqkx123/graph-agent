/**
 * ThreadPoolManager 单元测试
 */

import { ThreadPoolManager } from '../thread-pool-manager.js';
import { WorkerStatus } from '../../types/task.types.js';
import { ExecutionContext } from '../../context/execution-context.js';

describe('ThreadPoolManager', () => {
  let threadPoolManager: ThreadPoolManager;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;

  beforeEach(() => {
    mockExecutionContext = {
      getEventManager: jest.fn(),
      getWorkflowRegistry: jest.fn(),
      getLlmExecutor: jest.fn(),
      getToolService: jest.fn(),
      getUserInteractionHandler: jest.fn(),
      getHumanRelayHandler: jest.fn(),
      getThreadRegistry: jest.fn(),
      getToolContextManager: jest.fn()
    } as any;

    threadPoolManager = new ThreadPoolManager(mockExecutionContext, {
      minExecutors: 2,
      maxExecutors: 5,
      idleTimeout: 1000
    });
  });

  afterEach(async () => {
    await threadPoolManager.shutdown();
  });

  describe('构造函数', () => {
    it('应该初始化最小数量的执行器', () => {
      const stats = threadPoolManager.getStats();
      
      expect(stats.totalExecutors).toBe(2);
      expect(stats.idleExecutors).toBe(2);
      expect(stats.busyExecutors).toBe(0);
    });

    it('应该使用默认配置', () => {
      const defaultManager = new ThreadPoolManager(mockExecutionContext);
      const config = defaultManager.getConfig();
      
      expect(config.minExecutors).toBe(1);
      expect(config.maxExecutors).toBe(10);
      expect(config.idleTimeout).toBe(30000);
      
      defaultManager.shutdown();
    });
  });

  describe('allocateExecutor', () => {
    it('应该从空闲队列分配执行器', async () => {
      const executor1 = await threadPoolManager.allocateExecutor();
      const executor2 = await threadPoolManager.allocateExecutor();
      
      const stats = threadPoolManager.getStats();
      
      expect(stats.idleExecutors).toBe(0);
      expect(stats.busyExecutors).toBe(2);
      expect(executor1).toBeDefined();
      expect(executor2).toBeDefined();
    });

    it('应该在空闲执行器不足时创建新执行器', async () => {
      // 分配所有空闲执行器
      await threadPoolManager.allocateExecutor();
      await threadPoolManager.allocateExecutor();
      
      // 分配第三个执行器，应该创建新的
      const executor3 = await threadPoolManager.allocateExecutor();
      
      const stats = threadPoolManager.getStats();
      
      expect(stats.totalExecutors).toBe(3);
      expect(stats.busyExecutors).toBe(3);
      expect(executor3).toBeDefined();
    });

    it('应该在达到最大执行器数时等待', async () => {
      // 分配所有可能的执行器
      const executors = [];
      for (let i = 0; i < 5; i++) {
        executors.push(await threadPoolManager.allocateExecutor());
      }
      
      const stats = threadPoolManager.getStats();
      expect(stats.totalExecutors).toBe(5);
      expect(stats.busyExecutors).toBe(5);
      
      // 尝试分配第六个执行器，应该等待
      let allocated = false;
      const allocatePromise = threadPoolManager.allocateExecutor().then(() => {
        allocated = true;
      });
      
      // 等待一小段时间，确认没有立即分配
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(allocated).toBe(false);
      
      // 释放一个执行器
      threadPoolManager.releaseExecutor(executors[0]);
      
      // 等待分配完成
      await allocatePromise;
      expect(allocated).toBe(true);
    });

    it('应该在关闭时抛出错误', async () => {
      await threadPoolManager.shutdown();
      
      await expect(threadPoolManager.allocateExecutor()).rejects.toThrow('ThreadPoolManager is shutdown');
    });
  });

  describe('releaseExecutor', () => {
    it('应该释放执行器到空闲队列', async () => {
      const executor = await threadPoolManager.allocateExecutor();
      
      let stats = threadPoolManager.getStats();
      expect(stats.busyExecutors).toBe(1);
      expect(stats.idleExecutors).toBe(1);
      
      threadPoolManager.releaseExecutor(executor);
      
      stats = threadPoolManager.getStats();
      expect(stats.busyExecutors).toBe(0);
      expect(stats.idleExecutors).toBe(2);
    });

    it('应该触发等待中的分配请求', async () => {
      // 分配所有执行器
      const executors = [];
      for (let i = 0; i < 2; i++) {
        executors.push(await threadPoolManager.allocateExecutor());
      }
      
      // 创建等待的分配请求
      const allocatePromise = threadPoolManager.allocateExecutor();
      
      // 释放一个执行器
      threadPoolManager.releaseExecutor(executors[0]);
      
      // 等待分配完成
      const executor = await allocatePromise;
      expect(executor).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('应该返回正确的统计信息', async () => {
      const executor = await threadPoolManager.allocateExecutor();
      
      const stats = threadPoolManager.getStats();
      
      expect(stats.totalExecutors).toBe(2);
      expect(stats.idleExecutors).toBe(1);
      expect(stats.busyExecutors).toBe(1);
      expect(stats.minExecutors).toBe(2);
      expect(stats.maxExecutors).toBe(5);
    });
  });

  describe('getConfig', () => {
    it('应该返回配置', () => {
      const config = threadPoolManager.getConfig();
      
      expect(config.minExecutors).toBe(2);
      expect(config.maxExecutors).toBe(5);
      expect(config.idleTimeout).toBe(1000);
    });
  });

  describe('shutdown', () => {
    it('应该等待所有忙碌执行器完成', async () => {
      const executor = await threadPoolManager.allocateExecutor();
      
      let shutdownComplete = false;
      const shutdownPromise = threadPoolManager.shutdown().then(() => {
        shutdownComplete = true;
      });
      
      // 等待一小段时间，确认没有立即关闭
      await new Promise(resolve => setTimeout(resolve, 100));
      expect(shutdownComplete).toBe(false);
      
      // 释放执行器
      threadPoolManager.releaseExecutor(executor);
      
      // 等待关闭完成
      await shutdownPromise;
      expect(shutdownComplete).toBe(true);
    });

    it('应该销毁所有执行器', async () => {
      await threadPoolManager.allocateExecutor();
      await threadPoolManager.allocateExecutor();
      
      await threadPoolManager.shutdown();
      
      const stats = threadPoolManager.getStats();
      expect(stats.totalExecutors).toBe(0);
      expect(stats.idleExecutors).toBe(0);
      expect(stats.busyExecutors).toBe(0);
    });

    it('应该拒绝所有等待的分配请求', async () => {
      // 分配所有执行器
      const executors = [];
      for (let i = 0; i < 2; i++) {
        executors.push(await threadPoolManager.allocateExecutor());
      }
      
      // 创建等待的分配请求
      const allocatePromise = threadPoolManager.allocateExecutor();
      
      // 关闭线程池
      await threadPoolManager.shutdown();
      
      // 等待的分配请求应该被拒绝
      await expect(allocatePromise).rejects.toThrow('ThreadPoolManager is shutdown');
    });
  });

  describe('isShutdownFlag', () => {
    it('应该返回关闭状态', async () => {
      expect(threadPoolManager.isShutdownFlag()).toBe(false);
      
      await threadPoolManager.shutdown();
      
      expect(threadPoolManager.isShutdownFlag()).toBe(true);
    });
  });
});