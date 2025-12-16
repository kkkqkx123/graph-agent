/**
 * 会话应用服务测试
 */

import { SessionService } from '../sessions/services/session-service';
import { SessionRepository } from '../../../domain/session/repositories/session-repository';
import { ThreadRepository } from '../../../domain/thread/repositories/thread-repository';
import { SessionDomainService } from '../../../domain/session/services/session-domain-service';
import { ThreadDomainService } from '../../../domain/thread/services/thread-domain-service';
import { ID } from '../../../domain/common/value-objects/id';
import { Session } from '../../../domain/session/entities/session';
import { SessionStatus } from '../../../domain/session/value-objects/session-status';
import { SessionConfig } from '../../../domain/session/value-objects/session-config';
import { Timestamp } from '../../../domain/common/value-objects/timestamp';
import { Version } from '../../../domain/common/value-objects/version';

// Mock 依赖
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

const mockSessionDomainService: jest.Mocked<SessionDomainService> = {
  createSession: jest.fn(),
  activateSession: jest.fn(),
  suspendSession: jest.fn(),
  terminateSession: jest.fn(),
  updateSessionConfig: jest.fn(),
  addMessageToSession: jest.fn(),
  cleanupTimeoutSessions: jest.fn(),
  cleanupExpiredSessions: jest.fn(),
  getSessionStatistics: jest.fn(),
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

describe('SessionService', () => {
  let sessionService: SessionService;

  beforeEach(() => {
    sessionService = new SessionService(
      mockSessionRepository,
      mockThreadRepository,
      mockSessionDomainService,
      mockThreadDomainService,
      mockLogger as any
    );
    
    jest.clearAllMocks();
  });

  describe('createSession', () => {
    it('应该成功创建会话', async () => {
      // 准备
      const request = {
        userId: 'user-123',
        title: '测试会话',
        config: { timeoutMinutes: 30 }
      };

      const mockSession = Session.create(
        ID.fromString('user-123'),
        '测试会话',
        SessionConfig.create({ timeoutMinutes: 30 })
      );

      mockSessionDomainService.createSession.mockResolvedValue(mockSession);

      // 执行
      const result = await sessionService.createSession(request);

      // 断言
      expect(result).toBe(mockSession.sessionId.toString());
      expect(mockSessionDomainService.createSession).toHaveBeenCalledWith(
        ID.fromString('user-123'),
        '测试会话',
        expect.any(SessionConfig)
      );
    });

    it('应该处理创建会话失败的情况', async () => {
      // 准备
      const request = {
        userId: 'user-123',
        title: '测试会话'
      };

      const error = new Error('创建会话失败');
      mockSessionDomainService.createSession.mockRejectedValue(error);

      // 执行和断言
      await expect(sessionService.createSession(request)).rejects.toThrow('创建会话失败');
      expect(mockLogger.error).toHaveBeenCalledWith('创建会话失败', error);
    });
  });

  describe('getSessionInfo', () => {
    it('应该成功获取会话信息', async () => {
      // 准备
      const sessionId = 'session-123';
      const mockSession = Session.create(
        ID.fromString('user-123'),
        '测试会话'
      );

      mockSessionRepository.findById.mockResolvedValue(mockSession);

      // 执行
      const result = await sessionService.getSessionInfo(sessionId);

      // 断言
      expect(result).toEqual({
        sessionId: mockSession.sessionId.toString(),
        userId: 'user-123',
        title: '测试会话',
        status: mockSession.status.toString(),
        messageCount: mockSession.messageCount,
        createdAt: mockSession.createdAt.toISOString(),
        lastActivityAt: mockSession.lastActivityAt.toISOString()
      });
    });

    it('应该返回null当会话不存在时', async () => {
      // 准备
      const sessionId = 'session-123';
      mockSessionRepository.findById.mockResolvedValue(null);

      // 执行
      const result = await sessionService.getSessionInfo(sessionId);

      // 断言
      expect(result).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('应该成功删除会话', async () => {
      // 准备
      const sessionId = 'session-123';
      const mockSession = Session.create(
        ID.fromString('user-123'),
        '测试会话'
      );

      mockSessionRepository.findById.mockResolvedValue(mockSession);
      mockThreadRepository.hasActiveThreads.mockResolvedValue(false);
      mockSessionRepository.save.mockResolvedValue(mockSession);

      // 执行
      const result = await sessionService.deleteSession(sessionId);

      // 断言
      expect(result).toBe(true);
      expect(mockSession.markAsDeleted).toHaveBeenCalled();
      expect(mockSessionRepository.save).toHaveBeenCalledWith(mockSession);
    });

    it('应该拒绝删除有活跃线程的会话', async () => {
      // 准备
      const sessionId = 'session-123';
      const mockSession = Session.create(
        ID.fromString('user-123'),
        '测试会话'
      );

      mockSessionRepository.findById.mockResolvedValue(mockSession);
      mockThreadRepository.hasActiveThreads.mockResolvedValue(true);

      // 执行和断言
      await expect(sessionService.deleteSession(sessionId)).rejects.toThrow('无法删除有活跃线程的会话');
    });

    it('应该返回false当会话不存在时', async () => {
      // 准备
      const sessionId = 'session-123';
      mockSessionRepository.findById.mockResolvedValue(null);

      // 执行
      const result = await sessionService.deleteSession(sessionId);

      // 断言
      expect(result).toBe(false);
    });
  });

  describe('listSessions', () => {
    it('应该成功列出所有会话', async () => {
      // 准备
      const mockSessions = [
        Session.create(ID.fromString('user-1'), '会话1'),
        Session.create(ID.fromString('user-2'), '会话2')
      ];

      mockSessionRepository.findAll.mockResolvedValue(mockSessions);

      // 执行
      const result = await sessionService.listSessions();

      // 断言
      expect(result).toHaveLength(2);
      expect(result[0].sessionId).toBe(mockSessions[0].sessionId.toString());
      expect(result[1].sessionId).toBe(mockSessions[1].sessionId.toString());
    });

    it('应该处理列出会话失败的情况', async () => {
      // 准备
      const error = new Error('列出会话失败');
      mockSessionRepository.findAll.mockRejectedValue(error);

      // 执行和断言
      await expect(sessionService.listSessions()).rejects.toThrow('列出会话失败');
      expect(mockLogger.error).toHaveBeenCalledWith('列出会话失败', error);
    });
  });

  describe('sessionExists', () => {
    it('应该检查会话是否存在', async () => {
      // 准备
      const sessionId = 'session-123';
      mockSessionRepository.exists.mockResolvedValue(true);

      // 执行
      const result = await sessionService.sessionExists(sessionId);

      // 断言
      expect(result).toBe(true);
      expect(mockSessionRepository.exists).toHaveBeenCalledWith(ID.fromString(sessionId));
    });

    it('应该处理检查会话存在性失败的情况', async () => {
      // 准备
      const sessionId = 'session-123';
      const error = new Error('检查会话存在性失败');
      mockSessionRepository.exists.mockRejectedValue(error);

      // 执行和断言
      await expect(sessionService.sessionExists(sessionId)).rejects.toThrow('检查会话存在性失败');
      expect(mockLogger.error).toHaveBeenCalledWith('检查会话存在性失败', error);
    });
  });
});