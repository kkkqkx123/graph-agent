import { CheckpointService } from '../services/checkpoint-service';
import { MemoryThreadCheckpointRepository } from '../../../../infrastructure/threads/checkpoints/repositories/memory-checkpoint-repository';
import { ThreadCheckpoint } from '../../../../domain/threads/checkpoints/entities/thread-checkpoint';
import { CheckpointType } from '../../../../domain/checkpoint/value-objects/checkpoint-type';
import { ID } from '../../../../domain/common/value-objects/id';
// 简化的Logger接口，避免依赖问题
interface ILogger {
  info(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, error?: Error | any): void;
}

// Mock logger
const mockLogger: ILogger = {
  info: jest.fn(),
  debug: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

describe('CheckpointService', () => {
  let service: CheckpointService;
  let repository: MemoryThreadCheckpointRepository;
  let threadId: string;

  beforeEach(() => {
    repository = new MemoryThreadCheckpointRepository(mockLogger);
    service = new CheckpointService(repository, mockLogger);
    threadId = ID.generate().toString();
  });

  describe('createCheckpoint', () => {
    it('应该创建自动检查点', async () => {
      const request = {
        threadId,
        type: 'auto' as const,
        stateData: { key: 'value' }
      };

      const checkpointId = await service.createCheckpoint(request);

      expect(checkpointId).toBeDefined();
      expect(mockLogger.info).toHaveBeenCalledWith('正在创建检查点', expect.any(Object));
      expect(mockLogger.info).toHaveBeenCalledWith('检查点创建成功', expect.any(Object));
    });

    it('应该创建手动检查点', async () => {
      const request = {
        threadId,
        type: 'manual' as const,
        stateData: { key: 'value' },
        title: 'Manual Checkpoint',
        description: 'Test Description',
        tags: ['test'],
        expirationHours: 24
      };

      const checkpointId = await service.createCheckpoint(request);

      expect(checkpointId).toBeDefined();

      const checkpointInfo = await service.getCheckpointInfo(checkpointId);
      expect(checkpointInfo?.title).toBe('Manual Checkpoint');
      expect(checkpointInfo?.description).toBe('Test Description');
      expect(checkpointInfo?.tags).toContain('test');
    });

    it('应该创建错误检查点', async () => {
      const request = {
        threadId,
        type: 'error' as const,
        stateData: { key: 'value' },
        description: 'Error occurred',
        metadata: { errorType: 'ValidationError' }
      };

      const checkpointId = await service.createCheckpoint(request);

      expect(checkpointId).toBeDefined();

      const checkpointInfo = await service.getCheckpointInfo(checkpointId);
      expect(checkpointInfo?.type).toBe('error');
      expect(checkpointInfo?.description).toBe('Error occurred');
    });

    it('应该创建里程碑检查点', async () => {
      const request = {
        threadId,
        type: 'milestone' as const,
        stateData: { key: 'value' },
        title: 'Important Milestone',
        description: 'Reached important point'
      };

      const checkpointId = await service.createCheckpoint(request);

      expect(checkpointId).toBeDefined();

      const checkpointInfo = await service.getCheckpointInfo(checkpointId);
      expect(checkpointInfo?.type).toBe('milestone');
      expect(checkpointInfo?.title).toBe('Important Milestone');
    });
  });

  describe('createManualCheckpoint', () => {
    it('应该创建手动检查点', async () => {
      const request = {
        threadId,
        stateData: { key: 'value' },
        title: 'Manual Checkpoint',
        description: 'Test Description'
      };

      const checkpointId = await service.createManualCheckpoint(request);

      expect(checkpointId).toBeDefined();

      const checkpointInfo = await service.getCheckpointInfo(checkpointId);
      expect(checkpointInfo?.type).toBe('manual');
      expect(checkpointInfo?.title).toBe('Manual Checkpoint');
    });
  });

  describe('createErrorCheckpoint', () => {
    it('应该创建错误检查点', async () => {
      const request = {
        threadId,
        stateData: { key: 'value' },
        errorMessage: 'Something went wrong',
        errorType: 'RuntimeError'
      };

      const checkpointId = await service.createErrorCheckpoint(request);

      expect(checkpointId).toBeDefined();

      const checkpointInfo = await service.getCheckpointInfo(checkpointId);
      expect(checkpointInfo?.type).toBe('error');
      expect(checkpointInfo?.description).toBe('Something went wrong');
    });
  });

  describe('createMilestoneCheckpoint', () => {
    it('应该创建里程碑检查点', async () => {
      const request = {
        threadId,
        stateData: { key: 'value' },
        milestoneName: 'Phase 1 Complete',
        description: 'First phase completed successfully'
      };

      const checkpointId = await service.createMilestoneCheckpoint(request);

      expect(checkpointId).toBeDefined();

      const checkpointInfo = await service.getCheckpointInfo(checkpointId);
      expect(checkpointInfo?.type).toBe('milestone');
      expect(checkpointInfo?.title).toBe('Phase 1 Complete');
    });
  });

  describe('restoreFromCheckpoint', () => {
    it('应该从检查点恢复状态', async () => {
      const originalStateData = { key: 'original_value', counter: 42 };
      
      const request = {
        threadId,
        type: 'auto' as const,
        stateData: originalStateData
      };

      const checkpointId = await service.createCheckpoint(request);
      const restoredState = await service.restoreFromCheckpoint(checkpointId);

      expect(restoredState).toEqual(originalStateData);
      expect(mockLogger.info).toHaveBeenCalledWith('检查点恢复成功', expect.any(Object));
    });

    it('应该返回null当检查点不存在', async () => {
      const nonExistentId = ID.generate().toString();
      
      const restoredState = await service.restoreFromCheckpoint(nonExistentId);

      expect(restoredState).toBeNull();
      expect(mockLogger.warn).toHaveBeenCalledWith('检查点恢复失败', expect.any(Object));
    });
  });

  describe('getCheckpointInfo', () => {
    it('应该获取检查点信息', async () => {
      const request = {
        threadId,
        type: 'manual' as const,
        stateData: { key: 'value' },
        title: 'Test Checkpoint',
        description: 'Test Description',
        tags: ['test', 'manual']
      };

      const checkpointId = await service.createCheckpoint(request);
      const checkpointInfo = await service.getCheckpointInfo(checkpointId);

      expect(checkpointInfo).toBeDefined();
      expect(checkpointInfo!.checkpointId).toBe(checkpointId);
      expect(checkpointInfo!.threadId).toBe(threadId);
      expect(checkpointInfo!.type).toBe('manual');
      expect(checkpointInfo!.title).toBe('Test Checkpoint');
      expect(checkpointInfo!.description).toBe('Test Description');
      expect(checkpointInfo!.tags).toEqual(['test', 'manual']);
      expect(checkpointInfo!.status).toBe('active');
      expect(checkpointInfo!.restoreCount).toBe(0);
    });

    it('应该返回null当检查点不存在', async () => {
      const nonExistentId = ID.generate().toString();
      
      const checkpointInfo = await service.getCheckpointInfo(nonExistentId);

      expect(checkpointInfo).toBeNull();
    });
  });

  describe('getThreadCheckpointHistory', () => {
    it('应该获取线程检查点历史', async () => {
      // 创建多个检查点
      await service.createCheckpoint({
        threadId,
        type: 'auto' as const,
        stateData: { step: 1 }
      });

      await service.createCheckpoint({
        threadId,
        type: 'manual' as const,
        stateData: { step: 2 },
        title: 'Step 2'
      });

      await service.createCheckpoint({
        threadId,
        type: 'milestone' as const,
        stateData: { step: 3 },
        title: 'Step 3'
      });

      const history = await service.getThreadCheckpointHistory(threadId);

      expect(history).toHaveLength(3);
      expect(history[0].type).toBe('milestone'); // 最新的在前
      expect(history[1].type).toBe('manual');
      expect(history[2].type).toBe('auto');
    });

    it('应该应用数量限制', async () => {
      // 创建多个检查点
      for (let i = 0; i < 5; i++) {
        await service.createCheckpoint({
          threadId,
          type: 'auto' as const,
          stateData: { step: i }
        });
      }

      const history = await service.getThreadCheckpointHistory(threadId, 3);

      expect(history).toHaveLength(3);
    });

    it('应该返回空数组当线程没有检查点', async () => {
      const nonExistentThreadId = ID.generate().toString();
      
      const history = await service.getThreadCheckpointHistory(nonExistentThreadId);

      expect(history).toHaveLength(0);
    });
  });

  describe('getCheckpointStatistics', () => {
    it('应该获取线程检查点统计信息', async () => {
      // 创建不同类型的检查点
      await service.createCheckpoint({
        threadId,
        type: 'auto' as const,
        stateData: { step: 1 }
      });

      await service.createCheckpoint({
        threadId,
        type: 'manual' as const,
        stateData: { step: 2 },
        title: 'Manual Checkpoint'
      });

      await service.createCheckpoint({
        threadId,
        type: 'error' as const,
        stateData: { step: 3 },
        description: 'Error occurred'
      });

      const stats = await service.getCheckpointStatistics(threadId);

      expect(stats.totalCheckpoints).toBe(3);
      expect(stats.activeCheckpoints).toBe(3);
      expect(stats.expiredCheckpoints).toBe(0);
      expect(stats.corruptedCheckpoints).toBe(0);
      expect(stats.archivedCheckpoints).toBe(0);
      expect(stats.totalSizeBytes).toBeGreaterThan(0);
      expect(stats.totalRestores).toBe(0);
      expect(stats.healthScore).toBeGreaterThan(0);
      expect(stats.healthStatus).toBe('healthy');
    });

    it('应该获取全局统计信息', async () => {
      await service.createCheckpoint({
        threadId,
        type: 'auto' as const,
        stateData: { step: 1 }
      });

      const stats = await service.getCheckpointStatistics();

      expect(stats.totalCheckpoints).toBe(1);
      expect(stats.activeCheckpoints).toBe(1);
    });
  });

  describe('cleanupExpiredCheckpoints', () => {
    it('应该清理过期检查点', async () => {
      // 创建一个正常检查点
      await service.createCheckpoint({
        threadId,
        type: 'auto' as const,
        stateData: { step: 1 }
      });

      // 手动创建一个过期检查点（通过直接操作仓储）
      const expiredCheckpoint = ThreadCheckpoint.create(
        ID.fromString(threadId),
        CheckpointType.auto(),
        { step: 0 },
        undefined,
        undefined,
        undefined,
        undefined,
        -1 // 负数表示已过期
      );
      await repository.save(expiredCheckpoint);

      const cleanedCount = await service.cleanupExpiredCheckpoints();

      expect(cleanedCount).toBe(1);
      expect(mockLogger.info).toHaveBeenCalledWith('过期检查点清理完成', expect.any(Object));
    });
  });

  describe('extendCheckpointExpiration', () => {
    it('应该延长检查点过期时间', async () => {
      const request = {
        threadId,
        type: 'auto' as const,
        stateData: { step: 1 },
        expirationHours: 1
      };

      const checkpointId = await service.createCheckpoint(request);
      const success = await service.extendCheckpointExpiration(checkpointId, 24);

      expect(success).toBe(true);
      expect(mockLogger.info).toHaveBeenCalledWith('检查点过期时间延长成功', expect.any(Object));
    });

    it('应该返回false当检查点不存在', async () => {
      const nonExistentId = ID.generate().toString();
      
      const success = await service.extendCheckpointExpiration(nonExistentId, 24);

      expect(success).toBe(false);
      expect(mockLogger.warn).toHaveBeenCalledWith('检查点过期时间延长失败', expect.any(Object));
    });
  });

  describe('createBackup', () => {
    it('应该创建检查点备份', async () => {
      const request = {
        threadId,
        type: 'manual' as const,
        stateData: { key: 'value' },
        title: 'Original Checkpoint'
      };

      const checkpointId = await service.createCheckpoint(request);
      const backupId = await service.createBackup(checkpointId);

      expect(backupId).toBeDefined();
      expect(backupId).not.toBe(checkpointId);

      const backupInfo = await service.getCheckpointInfo(backupId);
      expect(backupInfo?.title).toBe('Original Checkpoint - 备份');
      expect(backupInfo?.tags).toContain('backup');
    });

    it('应该抛出错误当原检查点不存在', async () => {
      const nonExistentId = ID.generate().toString();

      await expect(service.createBackup(nonExistentId)).rejects.toThrow();
    });
  });

  describe('restoreFromBackup', () => {
    it('应该从备份恢复', async () => {
      const originalState = { key: 'original_value' };
      
      const request = {
        threadId,
        type: 'manual' as const,
        stateData: originalState,
        title: 'Original Checkpoint'
      };

      const checkpointId = await service.createCheckpoint(request);
      const backupId = await service.createBackup(checkpointId);
      const restoredState = await service.restoreFromBackup(backupId);

      expect(restoredState).toEqual(originalState);
    });

    it('应该返回null当备份不存在', async () => {
      const nonExistentId = ID.generate().toString();
      
      const restoredState = await service.restoreFromBackup(nonExistentId);

      expect(restoredState).toBeNull();
    });
  });

  describe('getBackupChain', () => {
    it('应该获取备份链', async () => {
      const request = {
        threadId,
        type: 'manual' as const,
        stateData: { key: 'value' },
        title: 'Original Checkpoint'
      };

      const checkpointId = await service.createCheckpoint(request);
      const backupId = await service.createBackup(checkpointId);
      
      const backupChain = await service.getBackupChain(checkpointId);

      expect(backupChain).toHaveLength(1);
      expect(backupChain[0].checkpointId.toString()).toBe(backupId);
    });

    it('应该返回空数组当没有备份', async () => {
      const request = {
        threadId,
        type: 'manual' as const,
        stateData: { key: 'value' }
      };

      const checkpointId = await service.createCheckpoint(request);
      const backupChain = await service.getBackupChain(checkpointId);

      expect(backupChain).toHaveLength(0);
    });
  });

  describe('healthCheck', () => {
    it('应该执行健康检查', async () => {
      // 创建一些检查点
      await service.createCheckpoint({
        threadId,
        type: 'auto' as const,
        stateData: { step: 1 }
      });

      const health = await service.healthCheck(threadId);

      expect(health).toBeDefined();
      expect(health.status).toBe('healthy');
      expect(health.score).toBeGreaterThan(0);
      expect(health.metrics.totalCheckpoints).toBe(1);
      expect(health.timestamp).toBeDefined();
    });

    it('应该执行全局健康检查', async () => {
      await service.createCheckpoint({
        threadId,
        type: 'auto' as const,
        stateData: { step: 1 }
      });

      const health = await service.healthCheck();

      expect(health).toBeDefined();
      expect(health.status).toBe('healthy');
      expect(health.metrics.totalCheckpoints).toBe(1);
    });
  });

  describe('错误处理', () => {
    it('应该处理无效的线程ID', async () => {
      const request = {
        threadId: 'invalid-id',
        type: 'auto' as const,
        stateData: { key: 'value' }
      };

      await expect(service.createCheckpoint(request)).rejects.toThrow();
      expect(mockLogger.error).toHaveBeenCalledWith('创建检查点失败', expect.any(Object));
    });

    it('应该处理仓储错误', async () => {
      // 模拟仓储错误
      jest.spyOn(repository, 'save').mockRejectedValue(new Error('Repository error'));

      const request = {
        threadId,
        type: 'auto' as const,
        stateData: { key: 'value' }
      };

      await expect(service.createCheckpoint(request)).rejects.toThrow('Repository error');
      expect(mockLogger.error).toHaveBeenCalledWith('创建检查点失败', expect.any(Object));
    });
  });
});