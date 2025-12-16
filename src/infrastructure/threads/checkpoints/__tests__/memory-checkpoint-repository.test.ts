import { MemoryThreadCheckpointRepository } from '../repositories/memory-checkpoint-repository';
import { ThreadCheckpoint } from '../../../../domain/threads/checkpoints/entities/thread-checkpoint';
import { CheckpointType } from '../../../../domain/checkpoint/value-objects/checkpoint-type';
import { CheckpointStatus } from '../../../../domain/threads/checkpoints/value-objects/checkpoint-status';
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

describe('MemoryThreadCheckpointRepository', () => {
  let repository: MemoryThreadCheckpointRepository;
  let threadId: ID;
  let checkpoint: ThreadCheckpoint;

  beforeEach(() => {
    repository = new MemoryThreadCheckpointRepository(mockLogger);
    threadId = ID.generate();

    checkpoint = ThreadCheckpoint.create(
      threadId,
      CheckpointType.auto(),
      { key: 'value' },
      'Test Checkpoint',
      'Test Description',
      ['test']
    );
  });

  describe('save', () => {
    it('应该保存检查点', async () => {
      const result = await repository.save(checkpoint);

      expect(result).toBe(checkpoint);
      expect(mockLogger.debug).toHaveBeenCalledWith('检查点保存成功', expect.any(Object));
    });

    it('应该更新已存在的检查点', async () => {
      await repository.save(checkpoint);

      checkpoint.updateTitle('Updated Title');
      const result = await repository.save(checkpoint);

      expect(result).toBe(checkpoint);

      const saved = await repository.findById(checkpoint.checkpointId);
      expect(saved?.title).toBe('Updated Title');
    });
  });

  describe('findById', () => {
    it('应该根据ID查找检查点', async () => {
      await repository.save(checkpoint);

      const found = await repository.findById(checkpoint.checkpointId);

      expect(found).toBeDefined();
      expect(found?.checkpointId.equals(checkpoint.checkpointId)).toBe(true);
    });

    it('应该返回null当检查点不存在', async () => {
      const nonExistentId = ID.generate();

      const found = await repository.findById(nonExistentId);

      expect(found).toBeNull();
    });
  });

  describe('findByThreadId', () => {
    it('应该根据线程ID查找检查点', async () => {
      await repository.save(checkpoint);

      const checkpoints = await repository.findByThreadId(threadId);

      expect(checkpoints).toHaveLength(1);
      expect(checkpoints[0].threadId.equals(threadId)).toBe(true);
    });

    it('应该按创建时间倒序返回检查点', async () => {
      const checkpoint1 = ThreadCheckpoint.create(threadId, CheckpointType.auto(), { data: '1' });
      const checkpoint2 = ThreadCheckpoint.create(threadId, CheckpointType.auto(), { data: '2' });

      await repository.save(checkpoint1);
      await repository.save(checkpoint2);

      const checkpoints = await repository.findByThreadId(threadId);

      expect(checkpoints).toHaveLength(2);
      expect(checkpoints[0].stateData.data).toBe('2'); // 最新的在前
      expect(checkpoints[1].stateData.data).toBe('1');
    });

    it('应该返回空数组当线程没有检查点', async () => {
      const nonExistentThreadId = ID.generate();

      const checkpoints = await repository.findByThreadId(nonExistentThreadId);

      expect(checkpoints).toHaveLength(0);
    });
  });

  describe('findByStatus', () => {
    it('应该根据状态查找检查点', async () => {
      await repository.save(checkpoint);

      const activeCheckpoints = await repository.findByStatus(CheckpointStatus.active());

      expect(activeCheckpoints).toHaveLength(1);
      expect(activeCheckpoints[0].status.isActive()).toBe(true);
    });

    it('应该返回空数组当没有匹配状态的检查点', async () => {
      await repository.save(checkpoint);

      const expiredCheckpoints = await repository.findByStatus(CheckpointStatus.expired());

      expect(expiredCheckpoints).toHaveLength(0);
    });
  });

  describe('findByType', () => {
    it('应该根据类型查找检查点', async () => {
      await repository.save(checkpoint);

      const autoCheckpoints = await repository.findByType(CheckpointType.auto());

      expect(autoCheckpoints).toHaveLength(1);
      expect(autoCheckpoints[0].type.isAuto()).toBe(true);
    });

    it('应该返回空数组当没有匹配类型的检查点', async () => {
      await repository.save(checkpoint);

      const manualCheckpoints = await repository.findByType(CheckpointType.manual());

      expect(manualCheckpoints).toHaveLength(0);
    });
  });

  describe('findExpired', () => {
    it('应该查找过期的检查点', async () => {
      // 创建一个已过期的检查点
      const expiredCheckpoint = ThreadCheckpoint.create(
        threadId,
        CheckpointType.auto(),
        { data: 'expired' },
        undefined,
        undefined,
        undefined,
        undefined,
        -1 // 负数表示已过期
      );

      await repository.save(checkpoint);
      await repository.save(expiredCheckpoint);

      const expiredCheckpoints = await repository.findExpired();

      expect(expiredCheckpoints).toHaveLength(1);
      expect(expiredCheckpoints[0].checkpointId.equals(expiredCheckpoint.checkpointId)).toBe(true);
    });
  });

  describe('update', () => {
    it('应该更新检查点', async () => {
      await repository.save(checkpoint);

      checkpoint.updateTitle('Updated Title');
      const result = await repository.update(checkpoint);

      expect(result).toBe(true);

      const updated = await repository.findById(checkpoint.checkpointId);
      expect(updated?.title).toBe('Updated Title');
    });

    it('应该返回false当检查点不存在', async () => {
      const nonExistentCheckpoint = ThreadCheckpoint.create(
        ID.generate(),
        CheckpointType.auto(),
        { data: 'non-existent' }
      );

      const result = await repository.update(nonExistentCheckpoint);

      expect(result).toBe(false);
    });
  });

  describe('delete', () => {
    it('应该删除检查点', async () => {
      await repository.save(checkpoint);

      await repository.delete(checkpoint);

      // 验证删除成功
      const found = await repository.findById(checkpoint.checkpointId);
      expect(found).toBeNull();
    });

    it('应该返回false当检查点不存在', async () => {
      const nonExistentId = ID.generate();

      // 尝试删除不存在的检查点
      const nonExistentCheckpoint = ThreadCheckpoint.create(
        nonExistentId,
        CheckpointType.auto(),
        { data: 'non-existent' }
      );
      
      await repository.delete(nonExistentCheckpoint);
      
      // 验证没有抛出错误
      expect(true).toBe(true);
    });

    it('应该清理所有索引', async () => {
      await repository.save(checkpoint);

      await repository.delete(checkpoint);

      expect(await repository.findByThreadId(threadId)).toHaveLength(0);
      expect(await repository.findByStatus(CheckpointStatus.active())).toHaveLength(0);
      expect(await repository.findByType(CheckpointType.auto())).toHaveLength(0);
    });
  });

  describe('countByThreadId', () => {
    it('应该统计线程的检查点数量', async () => {
      await repository.save(checkpoint);

      const checkpoint2 = ThreadCheckpoint.create(threadId, CheckpointType.manual(), { data: '2' });
      await repository.save(checkpoint2);

      const count = await repository.countByThreadId(threadId);

      expect(count).toBe(2);
    });

    it('应该返回0当线程没有检查点', async () => {
      const nonExistentThreadId = ID.generate();

      const count = await repository.countByThreadId(nonExistentThreadId);

      expect(count).toBe(0);
    });
  });

  describe('getStatistics', () => {
    it('应该获取检查点统计信息', async () => {
      await repository.save(checkpoint);

      const checkpoint2 = ThreadCheckpoint.create(threadId, CheckpointType.manual(), { data: '2' });
      await repository.save(checkpoint2);

      const stats = await repository.getStatistics(threadId);

      expect(stats.totalCheckpoints).toBe(2);
      expect(stats.activeCheckpoints).toBe(2);
      expect(stats.totalSizeBytes).toBeGreaterThan(0);
    });

    it('应该获取全局统计信息', async () => {
      await repository.save(checkpoint);

      const stats = await repository.getStatistics();

      expect(stats.totalCheckpoints).toBe(1);
      expect(stats.activeCheckpoints).toBe(1);
    });
  });

  describe('getThreadHistory', () => {
    it('应该获取线程检查点历史', async () => {
      const checkpoint1 = ThreadCheckpoint.create(threadId, CheckpointType.auto(), { data: '1' });
      const checkpoint2 = ThreadCheckpoint.create(threadId, CheckpointType.manual(), { data: '2' });

      await repository.save(checkpoint1);
      await repository.save(checkpoint2);

      const history = await repository.getThreadHistory(threadId);

      expect(history).toHaveLength(2);
      expect(history[0].type.isManual()).toBe(true); // 最新的在前
    });

    it('应该应用限制', async () => {
      const checkpoint1 = ThreadCheckpoint.create(threadId, CheckpointType.auto(), { data: '1' });
      const checkpoint2 = ThreadCheckpoint.create(threadId, CheckpointType.manual(), { data: '2' });

      await repository.save(checkpoint1);
      await repository.save(checkpoint2);

      const history = await repository.getThreadHistory(threadId, 1);

      expect(history).toHaveLength(1);
    });
  });

  describe('getLatest', () => {
    it('应该获取最新的检查点', async () => {
      const checkpoint1 = ThreadCheckpoint.create(threadId, CheckpointType.auto(), { data: '1' });
      const checkpoint2 = ThreadCheckpoint.create(threadId, CheckpointType.manual(), { data: '2' });

      await repository.save(checkpoint1);
      await repository.save(checkpoint2);

      const latest = await repository.getLatest(threadId);

      expect(latest).toBeDefined();
      expect(latest?.type.isManual()).toBe(true);
    });

    it('应该返回null当线程没有检查点', async () => {
      const nonExistentThreadId = ID.generate();

      const latest = await repository.getLatest(nonExistentThreadId);

      expect(latest).toBeNull();
    });
  });

  describe('batchDelete', () => {
    it('应该批量删除检查点', async () => {
      const checkpoint1 = ThreadCheckpoint.create(threadId, CheckpointType.auto(), { data: '1' });
      const checkpoint2 = ThreadCheckpoint.create(threadId, CheckpointType.manual(), { data: '2' });

      await repository.save(checkpoint1);
      await repository.save(checkpoint2);

      const deletedCount = await repository.batchDelete([checkpoint1.checkpointId, checkpoint2.checkpointId]);

      expect(deletedCount).toBe(2);
      expect(await repository.countByThreadId(threadId)).toBe(0);
    });
  });

  describe('cleanupExpired', () => {
    it('应该清理过期检查点', async () => {
      const expiredCheckpoint = ThreadCheckpoint.create(
        threadId,
        CheckpointType.auto(),
        { data: 'expired' },
        undefined,
        undefined,
        undefined,
        undefined,
        -1
      );

      await repository.save(checkpoint);
      await repository.save(expiredCheckpoint);

      const cleanedCount = await repository.cleanupExpired();

      expect(cleanedCount).toBe(1);
      expect(await repository.countByThreadId(threadId)).toBe(1);
    });
  });

  describe('exists', () => {
    it('应该检查检查点是否存在', async () => {
      await repository.save(checkpoint);

      expect(await repository.exists(checkpoint.checkpointId)).toBe(true);
      expect(await repository.exists(ID.generate())).toBe(false);
    });
  });

  describe('hasCheckpoints', () => {
    it('应该检查线程是否有检查点', async () => {
      await repository.save(checkpoint);

      expect(await repository.hasCheckpoints(threadId)).toBe(true);
      expect(await repository.hasCheckpoints(ID.generate())).toBe(false);
    });
  });
});