/**
 * TaskRegistry 单元测试
 */

import { TaskRegistry, type TaskManager } from '../task-registry';
import { TaskStatus } from '../../execution/types/task.types';
import { ThreadContext } from '../../execution/context/thread-context';

describe('TaskRegistry', () => {
  let taskRegistry: TaskRegistry;
  let mockThreadContext: jest.Mocked<ThreadContext>;
  let mockManager: jest.Mocked<TaskManager>;

  beforeEach(() => {
    // 重置单例
    (TaskRegistry as any).instance = undefined;
    
    taskRegistry = TaskRegistry.getInstance();
    mockThreadContext = {
      getThreadId: jest.fn().mockReturnValue('thread-1'),
      getWorkflowId: jest.fn().mockReturnValue('workflow-1'),
      getOutput: jest.fn().mockReturnValue({}),
      getTriggeredSubworkflowId: jest.fn().mockReturnValue('subgraph-1')
    } as any;

    mockManager = {
      cancelTask: jest.fn().mockResolvedValue(true),
      getTaskStatus: jest.fn()
    };
  });

  describe('register', () => {
    it('应该成功注册任务并返回任务ID', () => {
      const taskId = taskRegistry.register(mockThreadContext, mockManager);
      
      expect(taskId).toBeDefined();
      expect(typeof taskId).toBe('string');
      expect(taskRegistry.has(taskId)).toBe(true);
    });

    it('应该设置任务状态为 QUEUED', () => {
      const taskId = taskRegistry.register(mockThreadContext, mockManager);
      const taskInfo = taskRegistry.get(taskId);
      
      expect(taskInfo?.status).toBe(TaskStatus.QUEUED);
    });

    it('应该记录提交时间', () => {
      const beforeTime = Date.now();
      const taskId = taskRegistry.register(mockThreadContext, mockManager);
      const taskInfo = taskRegistry.get(taskId);
      const afterTime = Date.now();
      
      expect(taskInfo?.submitTime).toBeGreaterThanOrEqual(beforeTime);
      expect(taskInfo?.submitTime).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('updateStatusToRunning', () => {
    it('应该更新任务状态为 RUNNING', () => {
      const taskId = taskRegistry.register(mockThreadContext, mockManager);
      taskRegistry.updateStatusToRunning(taskId);
      
      const taskInfo = taskRegistry.get(taskId);
      expect(taskInfo?.status).toBe(TaskStatus.RUNNING);
      expect(taskInfo?.startTime).toBeDefined();
    });
  });

  describe('updateStatusToCompleted', () => {
    it('应该更新任务状态为 COMPLETED', () => {
      const taskId = taskRegistry.register(mockThreadContext, mockManager);
      const mockResult = { threadId: 'thread-1', output: {}, executionTime: 100 } as any;
      
      taskRegistry.updateStatusToCompleted(taskId, mockResult);
      
      const taskInfo = taskRegistry.get(taskId);
      expect(taskInfo?.status).toBe(TaskStatus.COMPLETED);
      expect(taskInfo?.result).toBe(mockResult);
      expect(taskInfo?.completeTime).toBeDefined();
    });
  });

  describe('updateStatusToFailed', () => {
    it('应该更新任务状态为 FAILED', () => {
      const taskId = taskRegistry.register(mockThreadContext, mockManager);
      const mockError = new Error('Test error');
      
      taskRegistry.updateStatusToFailed(taskId, mockError);
      
      const taskInfo = taskRegistry.get(taskId);
      expect(taskInfo?.status).toBe(TaskStatus.FAILED);
      expect(taskInfo?.error).toBe(mockError);
      expect(taskInfo?.completeTime).toBeDefined();
    });
  });

  describe('updateStatusToCancelled', () => {
    it('应该更新任务状态为 CANCELLED', () => {
      const taskId = taskRegistry.register(mockThreadContext, mockManager);
      
      taskRegistry.updateStatusToCancelled(taskId);
      
      const taskInfo = taskRegistry.get(taskId);
      expect(taskInfo?.status).toBe(TaskStatus.CANCELLED);
      expect(taskInfo?.completeTime).toBeDefined();
    });
  });

  describe('updateStatusToTimeout', () => {
    it('应该更新任务状态为 TIMEOUT', () => {
      const taskId = taskRegistry.register(mockThreadContext, mockManager);
      
      taskRegistry.updateStatusToTimeout(taskId);
      
      const taskInfo = taskRegistry.get(taskId);
      expect(taskInfo?.status).toBe(TaskStatus.TIMEOUT);
      expect(taskInfo?.completeTime).toBeDefined();
    });
  });

  describe('get', () => {
    it('应该返回任务信息', () => {
      const taskId = taskRegistry.register(mockThreadContext, mockManager);
      const taskInfo = taskRegistry.get(taskId);
      
      expect(taskInfo).toBeDefined();
      expect(taskInfo?.id).toBe(taskId);
    });

    it('对于不存在的任务应该返回 null', () => {
      const taskInfo = taskRegistry.get('non-existent-task');
      expect(taskInfo).toBeNull();
    });
  });

  describe('has', () => {
    it('应该检查任务是否存在', () => {
      const taskId = taskRegistry.register(mockThreadContext, mockManager);
      
      expect(taskRegistry.has(taskId)).toBe(true);
      expect(taskRegistry.has('non-existent-task')).toBe(false);
    });
  });

  describe('getAll', () => {
    it('应该返回所有任务', () => {
      const taskId1 = taskRegistry.register(mockThreadContext, mockManager);
      const taskId2 = taskRegistry.register(mockThreadContext, mockManager);
      
      const allTasks = taskRegistry.getAll();
      
      expect(allTasks).toHaveLength(2);
      expect(allTasks.map(t => t.id)).toContain(taskId1);
      expect(allTasks.map(t => t.id)).toContain(taskId2);
    });
  });

  describe('getByStatus', () => {
    it('应该根据状态返回任务', () => {
      const taskId1 = taskRegistry.register(mockThreadContext, mockManager);
      const taskId2 = taskRegistry.register(mockThreadContext, mockManager);
      
      taskRegistry.updateStatusToRunning(taskId1);
      taskRegistry.updateStatusToCompleted(taskId2, {} as any);
      
      const runningTasks = taskRegistry.getByStatus(TaskStatus.RUNNING);
      const completedTasks = taskRegistry.getByStatus(TaskStatus.COMPLETED);
      
      expect(runningTasks).toHaveLength(1);
      expect(runningTasks[0]?.id).toBe(taskId1);
      expect(completedTasks).toHaveLength(1);
      expect(completedTasks[0]?.id).toBe(taskId2);
    });
  });

  describe('getByThreadId', () => {
    it('应该根据线程ID返回任务', () => {
      const taskId = taskRegistry.register(mockThreadContext, mockManager);
      
      const taskInfo = taskRegistry.getByThreadId('thread-1');
      
      expect(taskInfo).toBeDefined();
      expect(taskInfo?.id).toBe(taskId);
    });

    it('对于不存在的线程ID应该返回 null', () => {
      const taskInfo = taskRegistry.getByThreadId('non-existent-thread');
      expect(taskInfo).toBeNull();
    });
  });

  describe('delete', () => {
    it('应该删除任务', () => {
      const taskId = taskRegistry.register(mockThreadContext, mockManager);
      
      expect(taskRegistry.delete(taskId)).toBe(true);
      expect(taskRegistry.has(taskId)).toBe(false);
    });

    it('对于不存在的任务应该返回 false', () => {
      expect(taskRegistry.delete('non-existent-task')).toBe(false);
    });
  });

  describe('cancelTask', () => {
    it('应该通过管理器取消任务', async () => {
      const taskId = taskRegistry.register(mockThreadContext, mockManager);
      
      const success = await taskRegistry.cancelTask(taskId);
      
      expect(success).toBe(true);
      expect(mockManager.cancelTask).toHaveBeenCalledWith(taskId);
      expect(taskRegistry.has(taskId)).toBe(false);
    });

    it('取消失败时不应该删除任务', async () => {
      mockManager.cancelTask.mockResolvedValue(false);
      const taskId = taskRegistry.register(mockThreadContext, mockManager);
      
      const success = await taskRegistry.cancelTask(taskId);
      
      expect(success).toBe(false);
      expect(taskRegistry.has(taskId)).toBe(true);
    });

    it('对于不存在的任务应该返回 false', async () => {
      const success = await taskRegistry.cancelTask('non-existent-task');
      expect(success).toBe(false);
    });
  });

  describe('cleanup', () => {
    it('应该清理过期的已完成任务', () => {
      const taskId1 = taskRegistry.register(mockThreadContext, mockManager);
      const taskId2 = taskRegistry.register(mockThreadContext, mockManager);
      
      taskRegistry.updateStatusToCompleted(taskId1, {} as any);
      taskRegistry.updateStatusToCompleted(taskId2, {} as any);
      
      // 手动设置完成时间为很久以前
      const taskInfo1 = taskRegistry.get(taskId1)!;
      taskInfo1.completeTime = Date.now() - 2 * 60 * 60 * 1000; // 2小时前
      
      const cleanedCount = taskRegistry.cleanup(60 * 60 * 1000); // 1小时保留时间
      
      expect(cleanedCount).toBe(1);
      expect(taskRegistry.has(taskId1)).toBe(false);
      expect(taskRegistry.has(taskId2)).toBe(true);
    });

    it('不应该清理运行中的任务', () => {
      const taskId = taskRegistry.register(mockThreadContext, mockManager);
      taskRegistry.updateStatusToRunning(taskId);
      
      const cleanedCount = taskRegistry.cleanup();
      
      expect(cleanedCount).toBe(0);
      expect(taskRegistry.has(taskId)).toBe(true);
    });
  });

  describe('getStats', () => {
    it('应该返回正确的统计信息', () => {
      const taskId1 = taskRegistry.register(mockThreadContext, mockManager);
      const taskId2 = taskRegistry.register(mockThreadContext, mockManager);
      const taskId3 = taskRegistry.register(mockThreadContext, mockManager);
      
      taskRegistry.updateStatusToRunning(taskId1);
      taskRegistry.updateStatusToCompleted(taskId2, {} as any);
      taskRegistry.updateStatusToFailed(taskId3, new Error('Test error'));
      
      const stats = taskRegistry.getStats();
      
      expect(stats.total).toBe(3);
      expect(stats.queued).toBe(0);
      expect(stats.running).toBe(1);
      expect(stats.completed).toBe(1);
      expect(stats.failed).toBe(1);
    });
  });

  describe('clear', () => {
    it('应该清空所有任务', () => {
      taskRegistry.register(mockThreadContext, mockManager);
      taskRegistry.register(mockThreadContext, mockManager);
      
      taskRegistry.clear();
      
      expect(taskRegistry.size()).toBe(0);
      expect(taskRegistry.getStats().total).toBe(0);
    });
  });

  describe('size', () => {
    it('应该返回任务数量', () => {
      expect(taskRegistry.size()).toBe(0);
      
      taskRegistry.register(mockThreadContext, mockManager);
      expect(taskRegistry.size()).toBe(1);
      
      taskRegistry.register(mockThreadContext, mockManager);
      expect(taskRegistry.size()).toBe(2);
    });
  });

  describe('getInstance', () => {
    it('应该返回相同的单例实例', () => {
      const instance1 = TaskRegistry.getInstance();
      const instance2 = TaskRegistry.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });
});