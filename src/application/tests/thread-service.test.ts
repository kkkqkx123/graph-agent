/**
 * 线程应用服务测试
 */

import { ThreadService } from '../threads/services/thread-service';
import { ThreadRepository } from '../../../domain/thread/repositories/thread-repository';
import { SessionRepository } from '../../../domain/session/repositories/session-repository';
import { ThreadDomainService } from '../../../domain/thread/services/thread-domain-service';
import { ID } from '../../../domain/common/value-objects/id';
import { Thread } from '../../../domain/thread/entities/thread';
import { ThreadStatus } from '../../../domain/thread/value-objects/thread-status';
import { ThreadPriority } from '../../../domain/thread/value-objects/thread-priority';
import { Session } from '../../../domain/session/entities/session';
import { SessionStatus } from '../../../domain/session/value-objects/session-status';

// Mock 依赖
const mockThreadRepository: jest.Mocked<ThreadRepository> = {
  findById: jest.fn(),
  findByIdOrFail: jest.fn(),
  findAll: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  findWithPagination: jest.fn(),
  save: jest.fn(),
  saveBatch: jest.fn(),
  delete: jest.fn(),
  deleteById: jest.fn(),
  deleteBatch: jest.fn(),
  deleteWhere: jest.fn(),
  exists: jest.fn(),
  count: jest.fn(),
  findBySessionId: jest.fn(),
  findBySessionIdAndStatus: jest.fn(),
  countBySessionId: jest.fn(),
  hasActiveThreads: jest.fn(),
  getLastActiveThreadBySessionId: jest.fn(),
  findRunningThreads: jest.fn(),
  findActiveThreads: jest.fn(),
  getHighestPriorityPendingThread: jest.fn(),
  getThreadExecutionStats: jest.fn(),
  batchUpdateStatus: jest.fn(),
  batchDelete: jest.fn(),
  deleteAllBySessionId: jest.fn(),
  softDelete: jest.fn(),
  batchSoftDelete: jest.fn(),
  restoreSoftDeleted: jest.fn(),
};

const mockSessionRepository: jest.Mocked<SessionRepository> = {
  findById: jest.fn(),
  findByIdOrFail: jest.fn(),
  findAll: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
  findOneOrFail: jest.fn(),
  findWithPagination: jest.fn(),
  save: jest.fn(),
  saveBatch: jest.fn(),
  delete: jest.fn(),
  deleteById: jest.fn(),
  deleteBatch: jest.fn(),
  deleteWhere: jest.fn(),
  exists: jest.fn(),
  count: jest.fn(),
  hasActiveSession: jest.fn(),
  findTimeoutSessions: jest.fn(),
  findExpiredSessions: jest.fn(),
  countByUserId: jest.fn(),
  batchUpdateStatus: jest.fn(),
  batchDelete: jest.fn(),
  softDelete: jest.fn(),
  batchSoftDelete: jest.fn(),
  restoreSoftDeleted: jest.fn(),
};

const mockThreadDomainService: jest.Mocked<ThreadDomainService> = {
  createThread: jest.fn(),
  startThread: jest.fn(),
  pauseThread: jest.fn(),
  resumeThread: jest.fn(),
  completeThread: jest.fn(),
  failThread: jest.fn(),
  cancelThread: jest.fn(),
  updateThreadPriority: jest.fn(),
  getNextPendingThread: jest.fn(),
  getSessionThreadStats: jest.fn(),
  cleanupLongRunningThreads: jest.fn(),
  retryFailedThread: jest.fn(),
  cancelAllActiveThreads: jest.fn(),
};

const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
};

describe('ThreadService', () => {
  let threadService: ThreadService;

  beforeEach(() => {
    threadService = new ThreadService(
      mockThreadRepository,
      mockSessionRepository,
      mockThreadDomainService,
      mockLogger as any
    );
    
    jest.clearAllMocks();
  });

  describe('createThread', () => {
    it('应该成功创建线程', async () => {
      // 准备
      const request = {
        sessionId: 'session-123',
        title: '测试线程',
        priority: 'normal'
      };

      const mockSession = Session.create(
        ID.fromString('user-123'),
        '测试会话'
      );

      const mockThread = Thread.create(
        ID.fromString('session-123'),
        '测试线程',
        ThreadPriority.NORMAL
      );

      mockSessionRepository.findById.mockResolvedValue(mockSession);
      mockThreadDomainService.createThread.mockResolvedValue(mockThread);

      // 执行
      const result = await threadService.createThread(request);

      // 断言
      expect(result).toBe(mockThread.threadId.toString());
      expect(mockThreadDomainService.createThread).toHaveBeenCalledWith(
        ID.fromString('session-123'),
        '测试线程',
        ThreadPriority.NORMAL
      );
    });

    it('应该拒绝在不存在的会话中创建线程', async () => {
      // 准备
      const request = {
        sessionId: 'session-123',
        title: '测试线程'
      };

      mockSessionRepository.findById.mockResolvedValue(null);

      // 执行和断言
      await expect(threadService.createThread(request)).rejects.toThrow('会话不存在');
    });

    it('应该处理创建线程失败的情况', async () => {
      // 准备
      const request = {
        sessionId: 'session-123',
        title: '测试线程'
      };

      const mockSession = Session.create(
        ID.fromString('user-123'),
        '测试会话'
      );

      const error = new Error('创建线程失败');
      mockSessionRepository.findById.mockResolvedValue(mockSession);
      mockThreadDomainService.createThread.mockRejectedValue(error);

      // 执行和断言
      await expect(threadService.createThread(request)).rejects.toThrow('创建线程失败');
      expect(mockLogger.error).toHaveBeenCalledWith('创建线程失败', error);
    });
  });

  describe('getThreadInfo', () => {
    it('应该成功获取线程信息', async () => {
      // 准备
      const threadId = 'thread-123';
      const mockThread = Thread.create(
        ID.fromString('session-123'),
        '测试线程'
      );

      mockThreadRepository.findById.mockResolvedValue(mockThread);

      // 执行
      const result = await threadService.getThreadInfo(threadId);

      // 断言
      expect(result).toEqual({
        threadId: mockThread.threadId.toString(),
        sessionId: 'session-123',
        title: '测试线程',
        status: mockThread.status.toString(),
        priority: mockThread.priority.toString(),
        createdAt: mockThread.createdAt.toISOString(),
        startedAt: mockThread.startedAt?.toISOString(),
        completedAt: mockThread.completedAt?.toISOString(),
        errorMessage: mockThread.errorMessage
      });
    });

    it('应该返回null当线程不存在时', async () => {
      // 准备
      const threadId = 'thread-123';
      mockThreadRepository.findById.mockResolvedValue(null);

      // 执行
      const result = await threadService.getThreadInfo(threadId);

      // 断言
      expect(result).toBeNull();
    });
  });

  describe('deleteThread', () => {
    it('应该成功删除线程', async () => {
      // 准备
      const threadId = 'thread-123';
      const mockThread = Thread.create(
        ID.fromString('session-123'),
        '测试线程'
      );

      mockThreadRepository.findById.mockResolvedValue(mockThread);
      mockThreadRepository.save.mockResolvedValue(mockThread);

      // 执行
      const result = await threadService.deleteThread(threadId);

      // 断言
      expect(result).toBe(true);
      expect(mockThread.markAsDeleted).toHaveBeenCalled();
      expect(mockThreadRepository.save).toHaveBeenCalledWith(mockThread);
    });

    it('应该拒绝删除运行中的线程', async () => {
      // 准备
      const threadId = 'thread-123';
      const mockThread = Thread.create(
        ID.fromString('session-123'),
        '测试线程'
      );
      mockThread.status = ThreadStatus.RUNNING;

      mockThreadRepository.findById.mockResolvedValue(mockThread);

      // 执行和断言
      await expect(threadService.deleteThread(threadId)).rejects.toThrow('无法删除运行中的线程');
    });

    it('应该返回false当线程不存在时', async () => {
      // 准备
      const threadId = 'thread-123';
      mockThreadRepository.findById.mockResolvedValue(null);

      // 执行
      const result = await threadService.deleteThread(threadId);

      // 断言
      expect(result).toBe(false);
    });
  });

  describe('updateThreadStatus', () => {
    it('应该成功更新线程状态', async () => {
      // 准备
      const threadId = 'thread-123';
      const status = 'running';
      const mockThread = Thread.create(
        ID.fromString('session-123'),
        '测试线程'
      );

      mockThreadRepository.findById.mockResolvedValue(mockThread);
      mockThreadRepository.save.mockResolvedValue(mockThread);

      // 执行
      const result = await threadService.updateThreadStatus(threadId, status);

      // 断言
      expect(result).toBe(true);
      expect(mockThread.updateStatus).toHaveBeenCalledWith(ThreadStatus.RUNNING);
      expect(mockThreadRepository.save).toHaveBeenCalledWith(mockThread);
    });

    it('应该处理无效的状态更新', async () => {
      // 准备
      const threadId = 'thread-123';
      const status = 'invalid-status';
      const mockThread = Thread.create(
        ID.fromString('session-123'),
        '测试线程'
      );

      mockThreadRepository.findById.mockResolvedValue(mockThread);

      // 执行和断言
      await expect(threadService.updateThreadStatus(threadId, status)).rejects.toThrow('无效的线程状态');
    });

    it('应该返回false当线程不存在时', async () => {
      // 准备
      const threadId = 'thread-123';
      const status = 'running';
      mockThreadRepository.findById.mockResolvedValue(null);

      // 执行
      const result = await threadService.updateThreadStatus(threadId, status);

      // 断言
      expect(result).toBe(false);
    });
  });

  describe('listThreads', () => {
    it('应该成功列出所有线程', async () => {
      // 准备
      const mockThreads = [
        Thread.create(ID.fromString('session-1'), '线程1'),
        Thread.create(ID.fromString('session-2'), '线程2')
      ];

      mockThreadRepository.findAll.mockResolvedValue(mockThreads);

      // 执行
      const result = await threadService.listThreads();

      // 断言
      expect(result).toHaveLength(2);
      expect(result[0].threadId).toBe(mockThreads[0].threadId.toString());
      expect(result[1].threadId).toBe(mockThreads[1].threadId.toString());
    });

    it('应该处理列出线程失败的情况', async () => {
      // 准备
      const error = new Error('列出线程失败');
      mockThreadRepository.findAll.mockRejectedValue(error);

      // 执行和断言
      await expect(threadService.listThreads()).rejects.toThrow('列出线程失败');
      expect(mockLogger.error).toHaveBeenCalledWith('列出线程失败', error);
    });
  });

  describe('threadExists', () => {
    it('应该检查线程是否存在', async () => {
      // 准备
      const threadId = 'thread-123';
      mockThreadRepository.exists.mockResolvedValue(true);

      // 执行
      const result = await threadService.threadExists(threadId);

      // 断言
      expect(result).toBe(true);
      expect(mockThreadRepository.exists).toHaveBeenCalledWith(ID.fromString(threadId));
    });

    it('应该处理检查线程存在性失败的情况', async () => {
      // 准备
      const threadId = 'thread-123';
      const error = new Error('检查线程存在性失败');
      mockThreadRepository.exists.mockRejectedValue(error);

      // 执行和断言
      await expect(threadService.threadExists(threadId)).rejects.toThrow('检查线程存在性失败');
      expect(mockLogger.error).toHaveBeenCalledWith('检查线程存在性失败', error);
    });
  });

  describe('listThreadsBySession', () => {
    it('应该成功按会话列出线程', async () => {
      // 准备
      const sessionId = 'session-123';
      const mockThreads = [
        Thread.create(ID.fromString('session-123'), '线程1'),
        Thread.create(ID.fromString('session-123'), '线程2')
      ];

      mockThreadRepository.findBySessionId.mockResolvedValue(mockThreads);

      // 执行
      const result = await threadService.listThreadsBySession(sessionId);

      // 断言
      expect(result).toHaveLength(2);
      expect(result[0].sessionId).toBe('session-123');
      expect(result[1].sessionId).toBe('session-123');
      expect(mockThreadRepository.findBySessionId).toHaveBeenCalledWith(ID.fromString(sessionId));
    });

    it('应该处理按会话列出线程失败的情况', async () => {
      // 准备
      const sessionId = 'session-123';
      const error = new Error('按会话列出线程失败');
      mockThreadRepository.findBySessionId.mockRejectedValue(error);

      // 执行和断言
      await expect(threadService.listThreadsBySession(sessionId)).rejects.toThrow('按会话列出线程失败');
      expect(mockLogger.error).toHaveBeenCalledWith('按会话列出线程失败', error);
    });
  });
});